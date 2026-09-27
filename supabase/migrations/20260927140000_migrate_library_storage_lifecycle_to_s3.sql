begin;

-- PDF bytes move out of Supabase Storage. Existing catalog keys remain immutable final
-- S3 keys; nullable fields retain compatibility for any historical published metadata.
do $$
begin
  if exists (select 1 from public.library_documents where status in ('pending', 'cleaning', 'published', 'deleting')) then
    raise exception 'Library S3 cutover preflight failed: settle all catalog lifecycle rows before applying this migration';
  end if;
end;
$$;

alter table public.library_documents
  add column if not exists staging_path text,
  add column if not exists expected_size bigint,
  add column if not exists observed_size bigint,
  add column if not exists observed_content_type text,
  add column if not exists observed_etag text,
  add column if not exists verified_at timestamptz,
  add column if not exists completion_claim_until timestamptz,
  add column if not exists completion_claim_token uuid;

alter table public.library_documents
  drop constraint if exists library_documents_s3_ticket_check,
  add constraint library_documents_s3_ticket_check check (
    (status in ('pending', 'cleaning') and staging_path = 'pending/' || id::text || '.pdf'
      and expected_size between 1 and 104857600)
    or status in ('published', 'deleting')
  );

create table if not exists public.library_storage_control (
  id boolean primary key default true check (id),
  maintenance_lock boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.library_storage_control (id, maintenance_lock)
values (true, true) on conflict (id) do nothing;
alter table public.library_storage_control enable row level security;
revoke all on public.library_storage_control from public, anon, authenticated;

-- The old browser-controlled Storage lifecycle is deliberately unavailable after this
-- migration. A prior browser bundle must not operate against the S3 data contract.
drop policy if exists library_objects_admin_insert on storage.objects;
drop policy if exists library_objects_admin_select on storage.objects;
drop policy if exists library_objects_admin_delete on storage.objects;
drop function if exists public.library_can_upload_object(text);
drop function if exists public.library_can_delete_object(text);
drop function if exists public.prepare_library_upload(uuid, text, text, text);
drop function if exists public.publish_library_document(uuid);
drop function if exists public.cancel_library_upload(uuid);
drop function if exists public.claim_expired_library_uploads(integer);
drop function if exists public.finish_library_upload_cleanup(uuid, uuid);
drop function if exists public.begin_delete_library_document(uuid);
drop function if exists public.complete_delete_library_document(uuid);
drop function if exists public.restore_delete_library_document(uuid);

create or replace function public.require_s3_lifecycle_actor(p_actor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'S3 lifecycle operations require service role';
  end if;
  if p_actor_id is null or not exists (select 1 from public.admin_users a where a.user_id = p_actor_id) then
    raise exception 'Administrator access required';
  end if;
end;
$$;

create or replace function public.assert_library_storage_writable()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.library_storage_control where id and maintenance_lock) then
    raise exception 'Library storage maintenance lock is enabled';
  end if;
end;
$$;

create or replace function public.set_library_storage_maintenance_lock(p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'S3 lifecycle operations require service role';
  end if;
  update public.library_storage_control set maintenance_lock = p_enabled, updated_at = now() where id;
end;
$$;

create or replace function public.prepare_s3_library_upload(
  p_actor_id uuid, p_category_id uuid, p_title text, p_author text,
  p_original_filename text, p_expected_size bigint
)
returns table(document_id uuid, storage_path text, staging_path text, upload_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare new_id uuid := gen_random_uuid(); expires timestamptz := now() + interval '15 minutes';
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  perform public.assert_library_storage_writable();
  if btrim(coalesce(p_title, '')) = '' or btrim(coalesce(p_original_filename, '')) = ''
    or lower(p_original_filename) !~ '\.pdf$' or p_expected_size not between 1 and 104857600 then
    raise exception 'Invalid PDF upload ticket';
  end if;
  if not exists (select 1 from public.library_categories where id = p_category_id) then raise exception 'Category not found'; end if;
  insert into public.library_documents (
    id, category_id, title, author, original_filename, storage_path, staging_path,
    expected_size, status, created_by_user_id, upload_expires_at
  ) values (
    new_id, p_category_id, btrim(p_title), nullif(btrim(coalesce(p_author, '')), ''), btrim(p_original_filename),
    'documents/' || new_id::text || '.pdf', 'pending/' || new_id::text || '.pdf', p_expected_size,
    'pending', p_actor_id, expires
  );
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (p_actor_id, 'library_s3_upload_prepared', 'library_document', new_id,
    jsonb_build_object('status', 'pending', 'expected_size', p_expected_size));
  return query select new_id, 'documents/' || new_id::text || '.pdf', 'pending/' || new_id::text || '.pdf', expires;
end;
$$;

create or replace function public.get_s3_library_upload_ticket(p_actor_id uuid, p_document_id uuid)
returns table(document_id uuid, status public.library_document_status, expected_size bigint, upload_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  return query select d.id, d.status, d.expected_size, d.upload_expires_at
  from public.library_documents d
  where d.id = p_document_id and d.created_by_user_id = p_actor_id;
end;
$$;

-- A short completion lease serializes S3 I/O with cancellation. If a worker dies
-- after copying, cleanup deletes both keys after the ticket's grace period.
create or replace function public.claim_s3_library_upload_completion(p_actor_id uuid, p_document_id uuid)
returns table(status public.library_document_status, expected_size bigint, completion_claim_token uuid)
language plpgsql security definer set search_path = '' as $$
declare document public.library_documents; token uuid;
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  perform public.assert_library_storage_writable();
  select * into document from public.library_documents d where d.id = p_document_id for update;
  if not found or document.created_by_user_id <> p_actor_id then raise exception 'Upload ticket not found'; end if;
  if document.status = 'published' then return query select document.status, document.expected_size, null::uuid; return; end if;
  if document.status <> 'pending' or document.upload_expires_at <= now() then raise exception 'Upload is not publishable'; end if;
  if document.completion_claim_until > now() then raise exception 'Upload completion is already in progress'; end if;
  token := gen_random_uuid();
  update public.library_documents set completion_claim_until = now() + interval '5 minutes', completion_claim_token = token
  where id = document.id;
  return query select document.status, document.expected_size, token;
end;
$$;

create or replace function public.complete_s3_library_upload(
  p_actor_id uuid, p_document_id uuid, p_completion_claim_token uuid, p_observed_size bigint,
  p_observed_content_type text, p_observed_etag text
)
returns void language plpgsql security definer set search_path = '' as $$
declare document public.library_documents;
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  perform public.assert_library_storage_writable();
  select * into document from public.library_documents d where d.id = p_document_id for update;
  if not found or document.created_by_user_id <> p_actor_id then raise exception 'Upload ticket not found'; end if;
  if document.status = 'published' then return; end if;
  if document.status <> 'pending' or document.upload_expires_at <= now()
    or document.completion_claim_token is distinct from p_completion_claim_token
    or document.completion_claim_until <= now() then raise exception 'Upload completion lease is no longer valid'; end if;
  if p_observed_size <> document.expected_size or lower(coalesce(p_observed_content_type, '')) <> 'application/pdf' then
    raise exception 'S3 verification does not match the upload ticket';
  end if;
  update public.library_documents set status = 'published', published_at = now(), upload_expires_at = null,
    observed_size = p_observed_size, observed_content_type = p_observed_content_type,
    observed_etag = p_observed_etag, verified_at = now(), completion_claim_until = null, completion_claim_token = null
  where id = document.id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (p_actor_id, 'library_s3_upload_published', 'library_document', document.id,
    jsonb_build_object('size', p_observed_size, 'etag', p_observed_etag));
end;
$$;

create or replace function public.mark_s3_library_upload_cleaning(p_actor_id uuid, p_document_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare document public.library_documents;
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  perform public.assert_library_storage_writable();
  select * into document from public.library_documents d where d.id = p_document_id for update;
  if not found or document.created_by_user_id <> p_actor_id then raise exception 'Upload ticket not found'; end if;
  if document.status = 'cleaning' then return; end if;
  if document.status <> 'pending' then raise exception 'Upload is not cancellable'; end if;
  if document.completion_claim_until > now() then raise exception 'Upload completion is already in progress'; end if;
  update public.library_documents set status = 'cleaning', cleanup_claim_until = null, cleanup_claim_token = null,
    completion_claim_until = null, completion_claim_token = null where id = document.id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (p_actor_id, 'library_s3_upload_cleaning', 'library_document', document.id, jsonb_build_object('status', 'cleaning'));
end;
$$;

create or replace function public.claim_expired_s3_library_uploads(p_actor_id uuid, p_limit integer default 20)
returns table(document_id uuid, cleanup_claim_token uuid)
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  perform public.assert_library_storage_writable();
  if coalesce(p_limit, 0) not between 1 and 100 then raise exception 'Invalid cleanup batch size'; end if;
  return query
  with candidates as (
    select d.id from public.library_documents d
    where d.status in ('pending', 'cleaning') and d.upload_expires_at + interval '15 minutes' <= now()
      and (d.cleanup_claim_until is null or d.cleanup_claim_until <= now())
    order by d.upload_expires_at for update skip locked limit p_limit
  ), claimed as (
    update public.library_documents d set status = 'cleaning', cleanup_claim_until = now() + interval '15 minutes', cleanup_claim_token = gen_random_uuid(),
      completion_claim_until = null, completion_claim_token = null
    from candidates c where d.id = c.id returning d.id, d.cleanup_claim_token
  ) select c.id, c.cleanup_claim_token from claimed c;
end;
$$;

create or replace function public.finish_s3_library_upload_cleanup(p_actor_id uuid, p_document_id uuid, p_claim_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare document public.library_documents;
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  perform public.assert_library_storage_writable();
  select * into document from public.library_documents d where d.id = p_document_id for update;
  if not found then return; end if;
  if document.status <> 'cleaning' or document.cleanup_claim_token is distinct from p_claim_token then raise exception 'Cleanup claim is no longer valid'; end if;
  delete from public.library_documents where id = document.id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_state)
  values (p_actor_id, 'library_s3_upload_cleaned', 'library_document', document.id, jsonb_build_object('staging_path', document.staging_path));
end;
$$;

create or replace function public.begin_s3_library_document_delete(p_actor_id uuid, p_document_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare document public.library_documents;
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  perform public.assert_library_storage_writable();
  select * into document from public.library_documents d where d.id = p_document_id for update;
  if not found then raise exception 'Document not found'; end if;
  if document.status = 'deleting' then return; end if;
  if document.status <> 'published' then raise exception 'Document is not deletable'; end if;
  update public.library_documents set status = 'deleting' where id = document.id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (p_actor_id, 'library_s3_delete_started', 'library_document', document.id, jsonb_build_object('status', 'deleting'));
end;
$$;

create or replace function public.complete_s3_library_document_delete(p_actor_id uuid, p_document_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare document public.library_documents;
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  perform public.assert_library_storage_writable();
  select * into document from public.library_documents d where d.id = p_document_id for update;
  if not found then return; end if;
  if document.status <> 'deleting' then raise exception 'Document deletion is not active'; end if;
  delete from public.library_documents where id = document.id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_state)
  values (p_actor_id, 'library_s3_deleted', 'library_document', document.id, jsonb_build_object('storage_path', document.storage_path));
end;
$$;

create or replace function public.restore_s3_library_document_delete(p_actor_id uuid, p_document_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare document public.library_documents;
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  perform public.assert_library_storage_writable();
  select * into document from public.library_documents d where d.id = p_document_id for update;
  if not found then raise exception 'Document not found'; end if;
  if document.status = 'published' then return; end if;
  if document.status <> 'deleting' then raise exception 'Document deletion is not active'; end if;
  update public.library_documents set status = 'published' where id = document.id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (p_actor_id, 'library_s3_delete_restored', 'library_document', document.id, jsonb_build_object('status', 'published'));
end;
$$;

create or replace function public.get_published_s3_library_document(p_document_id uuid)
returns table(id uuid, title text)
language sql stable security definer set search_path = '' as $$
  select d.id, d.title from public.library_documents d where d.id = p_document_id and d.status = 'published';
$$;

revoke all on function public.require_s3_lifecycle_actor(uuid), public.assert_library_storage_writable(),
  public.set_library_storage_maintenance_lock(boolean), public.prepare_s3_library_upload(uuid, uuid, text, text, text, bigint),
  public.get_s3_library_upload_ticket(uuid, uuid), public.claim_s3_library_upload_completion(uuid, uuid),
  public.complete_s3_library_upload(uuid, uuid, uuid, bigint, text, text),
  public.mark_s3_library_upload_cleaning(uuid, uuid), public.claim_expired_s3_library_uploads(uuid, integer),
  public.finish_s3_library_upload_cleanup(uuid, uuid, uuid), public.begin_s3_library_document_delete(uuid, uuid),
  public.complete_s3_library_document_delete(uuid, uuid), public.restore_s3_library_document_delete(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.set_library_storage_maintenance_lock(boolean), public.prepare_s3_library_upload(uuid, uuid, text, text, text, bigint),
  public.get_s3_library_upload_ticket(uuid, uuid), public.claim_s3_library_upload_completion(uuid, uuid),
  public.complete_s3_library_upload(uuid, uuid, uuid, bigint, text, text), public.mark_s3_library_upload_cleaning(uuid, uuid),
  public.claim_expired_s3_library_uploads(uuid, integer), public.finish_s3_library_upload_cleanup(uuid, uuid, uuid),
  public.begin_s3_library_document_delete(uuid, uuid), public.complete_s3_library_document_delete(uuid, uuid),
  public.restore_s3_library_document_delete(uuid, uuid) to service_role;
grant execute on function public.get_published_s3_library_document(uuid) to anon, authenticated;
grant execute on function public.get_published_s3_library_document(uuid) to service_role;
revoke all on function public.get_published_s3_library_document(uuid) from public;

commit;
