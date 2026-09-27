create extension if not exists pg_trgm with schema extensions;

create type public.library_document_status as enum ('pending', 'cleaning', 'published', 'deleting');

create table public.library_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index library_categories_name_unique_idx on public.library_categories (lower(btrim(name)));
create index library_categories_position_idx on public.library_categories (position, id);

create table public.library_documents (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.library_categories(id) on delete restrict,
  title text not null check (btrim(title) <> ''),
  author text check (author is null or btrim(author) <> ''),
  original_filename text not null check (btrim(original_filename) <> ''),
  storage_path text not null unique,
  search_text text not null default '',
  status public.library_document_status not null default 'pending',
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  upload_expires_at timestamptz,
  cleanup_claim_until timestamptz,
  cleanup_claim_token uuid,
  check (storage_path = 'documents/' || id::text || '.pdf'),
  check ((status = 'published') = (published_at is not null)),
  check (status not in ('pending', 'cleaning') or upload_expires_at is not null)
);

create index library_documents_public_category_idx
  on public.library_documents (category_id, published_at desc, id desc)
  where status = 'published';
create index library_documents_public_order_idx
  on public.library_documents (published_at desc, id desc)
  where status = 'published';
create index library_documents_pending_expiry_idx
  on public.library_documents (upload_expires_at)
  where status = 'pending';
create index library_documents_cleaning_expiry_idx
  on public.library_documents (cleanup_claim_until)
  where status = 'cleaning';
create index library_documents_search_idx
  on public.library_documents using gin (search_text extensions.gin_trgm_ops)
  where status = 'published';

create or replace function public.prepare_library_search_text(p_title text, p_author text)
returns text language sql stable parallel safe set search_path = '' as $$
  select lower(public.unaccent(coalesce(p_title, '') || ' ' || coalesce(p_author, '')));
$$;

create or replace function public.set_library_document_fields()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.title := btrim(new.title);
  new.author := nullif(btrim(coalesce(new.author, '')), '');
  new.search_text := public.prepare_library_search_text(new.title, new.author);
  new.updated_at := now();
  return new;
end;
$$;

create trigger library_documents_set_fields
before insert or update of title, author on public.library_documents
for each row execute function public.set_library_document_fields();
create trigger library_categories_set_updated_at
before update on public.library_categories
for each row execute function public.set_updated_at();

insert into public.library_categories (name, position) values
  ('Đông y – Tây y', 0),
  ('Hán Nôm', 1),
  ('Ngoại ngữ', 2),
  ('Phong thủy', 3),
  ('Triết học', 4),
  ('Sử học', 5),
  ('Văn hóa học', 6),
  ('Tủ sách văn học', 7),
  ('Y học', 8),
  ('Luận văn', 9),
  ('Tiểu luận', 10)
on conflict (lower(btrim(name))) do nothing;

alter table public.library_categories enable row level security;
alter table public.library_documents enable row level security;
revoke all on public.library_categories, public.library_documents from public, anon, authenticated;

create or replace function public.library_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin();
$$;

create or replace function public.list_library_categories()
returns table(id uuid, name text, "position" integer)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.position
  from public.library_categories c
  order by c.position, c.name, c.id;
$$;

create or replace function public.search_library_documents(
  p_query text default '',
  p_category_id uuid default null,
  p_cursor_published_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 24
)
returns table(id uuid, category_id uuid, category_name text, title text, author text, published_at timestamptz)
language plpgsql stable security definer set search_path = '' set statement_timeout = '2s' as $$
declare normalized_query text;
begin
  if length(coalesce(p_query, '')) > 120 then raise exception 'Search query is too long'; end if;
  if coalesce(p_limit, 0) < 1 or p_limit > 50 then raise exception 'Invalid page size'; end if;
  if (p_cursor_published_at is null) <> (p_cursor_id is null) then raise exception 'Invalid page cursor'; end if;
  normalized_query := public.prepare_library_search_text(btrim(coalesce(p_query, '')), '');
  normalized_query := replace(replace(replace(normalized_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');
  return query
  select d.id, d.category_id, c.name, d.title, d.author, d.published_at
  from public.library_documents d
  join public.library_categories c on c.id = d.category_id
  where d.status = 'published'
    and (p_category_id is null or d.category_id = p_category_id)
    and (normalized_query = '' or d.search_text like '%' || normalized_query || '%' escape E'\\')
    and (p_cursor_id is null or (d.published_at, d.id) < (p_cursor_published_at, p_cursor_id))
  order by d.published_at desc, d.id desc
  limit p_limit;
end;
$$;

create or replace function public.get_library_document(p_document_id uuid)
returns table(id uuid, category_id uuid, category_name text, title text, author text, published_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id, d.category_id, c.name, d.title, d.author, d.published_at
  from public.library_documents d
  join public.library_categories c on c.id = d.category_id
  where d.id = p_document_id and d.status = 'published';
$$;

create or replace function public.list_library_documents_admin()
returns table(id uuid, category_id uuid, category_name text, title text, author text,
  original_filename text, storage_path text, status public.library_document_status,
  created_by_user_id uuid, created_at timestamptz, published_at timestamptz,
  upload_expires_at timestamptz, cleanup_claim_until timestamptz, cleanup_claim_token uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  return query
  select d.id, d.category_id, c.name, d.title, d.author, d.original_filename,
    d.storage_path, d.status, d.created_by_user_id, d.created_at, d.published_at,
    d.upload_expires_at, d.cleanup_claim_until, d.cleanup_claim_token
  from public.library_documents d
  join public.library_categories c on c.id = d.category_id
  order by d.created_at desc, d.id;
end;
$$;

create or replace function public.create_library_category(p_name text)
returns public.library_categories language plpgsql security definer set search_path = '' as $$
declare result public.library_categories;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if btrim(coalesce(p_name, '')) = '' then raise exception 'Category name is required'; end if;
  insert into public.library_categories (name, position)
  values (btrim(p_name), coalesce((select max(position) + 1 from public.library_categories), 0))
  returning * into result;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (auth.uid(), 'library_category_created', 'library_category', result.id,
    jsonb_build_object('name', result.name, 'position', result.position));
  return result;
end;
$$;

create or replace function public.update_library_category(p_category_id uuid, p_name text, p_position integer)
returns public.library_categories language plpgsql security definer set search_path = '' as $$
declare previous public.library_categories; result public.library_categories;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if btrim(coalesce(p_name, '')) = '' or p_position < 0 then raise exception 'Invalid category'; end if;
  select * into previous from public.library_categories where id = p_category_id for update;
  if not found then raise exception 'Category not found'; end if;
  update public.library_categories set name = btrim(p_name), position = p_position
  where id = p_category_id returning * into result;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_state, after_state)
  values (auth.uid(), 'library_category_updated', 'library_category', result.id,
    jsonb_build_object('name', previous.name, 'position', previous.position),
    jsonb_build_object('name', result.name, 'position', result.position));
  return result;
end;
$$;

create or replace function public.reorder_library_categories(p_category_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare current_count integer; requested_count integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select count(*) into current_count from public.library_categories;
  select count(distinct id) into requested_count from unnest(p_category_ids) id;
  if coalesce(cardinality(p_category_ids), 0) <> current_count or requested_count <> current_count
    or exists (select 1 from unnest(p_category_ids) id where not exists (select 1 from public.library_categories c where c.id = id))
  then raise exception 'Category order must include every category exactly once'; end if;
  update public.library_categories c set position = ordered.position
  from unnest(p_category_ids) with ordinality as ordered(id, position)
  where c.id = ordered.id;
  insert into public.audit_events (actor_id, action, entity_type, after_state)
  values (auth.uid(), 'library_categories_reordered', 'library_category', to_jsonb(p_category_ids));
end;
$$;

create or replace function public.delete_library_category(p_category_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare previous public.library_categories;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into previous from public.library_categories where id = p_category_id for update;
  if not found then raise exception 'Category not found'; end if;
  delete from public.library_categories where id = p_category_id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_state)
  values (auth.uid(), 'library_category_deleted', 'library_category', previous.id,
    jsonb_build_object('name', previous.name, 'position', previous.position));
end;
$$;

create or replace function public.prepare_library_upload(p_category_id uuid, p_title text, p_author text, p_original_filename text)
returns table(document_id uuid, storage_path text, upload_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare new_id uuid := gen_random_uuid(); expires timestamptz := now() + interval '24 hours';
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if btrim(coalesce(p_title, '')) = '' or btrim(coalesce(p_original_filename, '')) = ''
    or lower(p_original_filename) !~ '\.pdf$' then raise exception 'Invalid PDF metadata'; end if;
  if not exists (select 1 from public.library_categories where id = p_category_id) then raise exception 'Category not found'; end if;
  insert into public.library_documents (id, category_id, title, author, original_filename,
    storage_path, status, created_by_user_id, upload_expires_at)
  values (new_id, p_category_id, btrim(p_title), nullif(btrim(coalesce(p_author, '')), ''),
    btrim(p_original_filename), 'documents/' || new_id::text || '.pdf', 'pending', auth.uid(), expires);
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (auth.uid(), 'library_upload_prepared', 'library_document', new_id,
    jsonb_build_object('category_id', p_category_id, 'title', btrim(p_title), 'status', 'pending'));
  return query select new_id, 'documents/' || new_id::text || '.pdf', expires;
end;
$$;

create or replace function public.publish_library_document(p_document_id uuid)
returns table(id uuid, category_id uuid, title text, author text, published_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare previous public.library_documents;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into previous from public.library_documents where id = p_document_id for update;
  if not found then raise exception 'Upload not found'; end if;
  if previous.status = 'published' then
    return query select previous.id, previous.category_id, previous.title, previous.author, previous.published_at;
    return;
  end if;
  if previous.status <> 'pending' or previous.upload_expires_at <= now() then raise exception 'Upload is not publishable'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'library' and o.name = previous.storage_path) then raise exception 'Uploaded PDF object is missing'; end if;
  update public.library_documents set status = 'published', published_at = now(), upload_expires_at = null
  where id = p_document_id returning * into previous;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (auth.uid(), 'library_document_published', 'library_document', previous.id,
    jsonb_build_object('category_id', previous.category_id, 'title', previous.title));
  return query select previous.id, previous.category_id, previous.title, previous.author, previous.published_at;
end;
$$;

create or replace function public.cancel_library_upload(p_document_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare previous public.library_documents;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into previous from public.library_documents where id = p_document_id for update;
  if not found then return; end if;
  if previous.status not in ('pending', 'cleaning') then raise exception 'Upload is not cancellable'; end if;
  if previous.status = 'cleaning' and previous.cleanup_claim_until > now() then raise exception 'Cleanup is already claimed'; end if;
  if exists (select 1 from storage.objects o where o.bucket_id = 'library' and o.name = previous.storage_path) then raise exception 'Storage object must be removed first'; end if;
  delete from public.library_documents where id = p_document_id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_state)
  values (auth.uid(), 'library_upload_cancelled', 'library_document', previous.id,
    jsonb_build_object('status', previous.status, 'storage_path', previous.storage_path));
end;
$$;

create or replace function public.claim_expired_library_uploads(p_limit integer default 20)
returns table(document_id uuid, storage_path text, claim_until timestamptz, cleanup_claim_token uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if coalesce(p_limit, 0) < 1 or p_limit > 100 then raise exception 'Invalid cleanup batch size'; end if;
  return query
  with candidates as (
    select d.id from public.library_documents d
    where (d.status = 'pending' and d.upload_expires_at <= now())
      or (d.status = 'cleaning' and d.cleanup_claim_until <= now())
    order by d.upload_expires_at
    for update skip locked limit p_limit
  ), claimed as (
    update public.library_documents d set status = 'cleaning', cleanup_claim_until = now() + interval '15 minutes', cleanup_claim_token = gen_random_uuid()
    from candidates c where d.id = c.id
    returning d.id, d.storage_path, d.cleanup_claim_until, d.cleanup_claim_token
  ), audited as (
    insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
    select auth.uid(), 'library_upload_cleanup_claimed', 'library_document', claimed.id,
      jsonb_build_object('status', 'cleaning', 'claim_until', claimed.cleanup_claim_until)
    from claimed returning entity_id
  ) select claimed.id, claimed.storage_path, claimed.cleanup_claim_until, claimed.cleanup_claim_token
    from claimed join audited on audited.entity_id = claimed.id;
end;
$$;

create or replace function public.finish_library_upload_cleanup(p_document_id uuid, p_claim_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare previous public.library_documents;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into previous from public.library_documents where id = p_document_id for update;
  if not found then return; end if;
  if previous.status <> 'cleaning' or previous.cleanup_claim_token is distinct from p_claim_token then raise exception 'Cleanup claim is no longer valid'; end if;
  if exists (select 1 from storage.objects o where o.bucket_id = 'library' and o.name = previous.storage_path) then raise exception 'Storage object still exists'; end if;
  delete from public.library_documents where id = p_document_id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_state)
  values (auth.uid(), 'library_upload_cleanup_finished', 'library_document', previous.id,
    jsonb_build_object('status', previous.status, 'storage_path', previous.storage_path));
end;
$$;

create or replace function public.update_library_document(p_document_id uuid, p_category_id uuid, p_title text, p_author text)
returns void language plpgsql security definer set search_path = '' as $$
declare previous public.library_documents; updated public.library_documents;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if btrim(coalesce(p_title, '')) = '' then raise exception 'Title is required'; end if;
  select * into previous from public.library_documents where id = p_document_id for update;
  if not found or previous.status <> 'published' then raise exception 'Published document not found'; end if;
  update public.library_documents set category_id = p_category_id, title = btrim(p_title),
    author = nullif(btrim(coalesce(p_author, '')), '')
  where id = p_document_id returning * into updated;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_state, after_state)
  values (auth.uid(), 'library_document_updated', 'library_document', updated.id,
    jsonb_build_object('category_id', previous.category_id, 'title', previous.title, 'author', previous.author),
    jsonb_build_object('category_id', updated.category_id, 'title', updated.title, 'author', updated.author));
end;
$$;

create or replace function public.begin_delete_library_document(p_document_id uuid)
returns table(document_id uuid, storage_path text)
language plpgsql security definer set search_path = '' as $$
declare previous public.library_documents;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into previous from public.library_documents where id = p_document_id for update;
  if not found then raise exception 'Document not found'; end if;
  if previous.status = 'deleting' then return query select previous.id, previous.storage_path; return; end if;
  if previous.status <> 'published' then raise exception 'Document is not deletable'; end if;
  update public.library_documents set status = 'deleting' where id = p_document_id returning * into previous;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_state, after_state)
  values (auth.uid(), 'library_document_delete_started', 'library_document', previous.id,
    jsonb_build_object('status', 'published'), jsonb_build_object('status', 'deleting'));
  return query select previous.id, previous.storage_path;
end;
$$;

create or replace function public.complete_delete_library_document(p_document_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare previous public.library_documents;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into previous from public.library_documents where id = p_document_id for update;
  if not found then return; end if;
  if previous.status <> 'deleting' then raise exception 'Document deletion is not active'; end if;
  if exists (select 1 from storage.objects o where o.bucket_id = 'library' and o.name = previous.storage_path) then raise exception 'Storage object still exists'; end if;
  delete from public.library_documents where id = p_document_id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_state)
  values (auth.uid(), 'library_document_deleted', 'library_document', previous.id,
    jsonb_build_object('title', previous.title, 'storage_path', previous.storage_path));
end;
$$;

create or replace function public.restore_delete_library_document(p_document_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare previous public.library_documents;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into previous from public.library_documents where id = p_document_id for update;
  if not found then raise exception 'Document not found'; end if;
  if previous.status = 'published' then return; end if;
  if previous.status <> 'deleting' then raise exception 'Document deletion is not active'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'library' and o.name = previous.storage_path) then raise exception 'Storage object is missing; deletion cannot be restored'; end if;
  update public.library_documents set status = 'published' where id = p_document_id returning * into previous;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (auth.uid(), 'library_document_delete_restored', 'library_document', previous.id,
    jsonb_build_object('status', 'published'));
end;
$$;

revoke all on function public.prepare_library_search_text(text, text), public.set_library_document_fields() from public, anon, authenticated;
revoke all on function public.library_is_admin(), public.list_library_categories(),
  public.search_library_documents(text, uuid, timestamptz, uuid, integer), public.get_library_document(uuid),
  public.list_library_documents_admin(), public.create_library_category(text),
  public.update_library_category(uuid, text, integer), public.reorder_library_categories(uuid[]),
  public.delete_library_category(uuid), public.prepare_library_upload(uuid, text, text, text),
  public.publish_library_document(uuid), public.cancel_library_upload(uuid),
  public.claim_expired_library_uploads(integer), public.finish_library_upload_cleanup(uuid, uuid),
  public.update_library_document(uuid, uuid, text, text), public.begin_delete_library_document(uuid),
  public.complete_delete_library_document(uuid), public.restore_delete_library_document(uuid)
  from public, anon, authenticated;
grant execute on function public.library_is_admin(), public.list_library_categories(),
  public.search_library_documents(text, uuid, timestamptz, uuid, integer), public.get_library_document(uuid)
  to anon, authenticated;
grant execute on function public.list_library_documents_admin(), public.create_library_category(text),
  public.update_library_category(uuid, text, integer), public.reorder_library_categories(uuid[]),
  public.delete_library_category(uuid), public.prepare_library_upload(uuid, text, text, text),
  public.publish_library_document(uuid), public.cancel_library_upload(uuid),
  public.claim_expired_library_uploads(integer), public.finish_library_upload_cleanup(uuid, uuid),
  public.update_library_document(uuid, uuid, text, text), public.begin_delete_library_document(uuid),
  public.complete_delete_library_document(uuid), public.restore_delete_library_document(uuid)
  to authenticated;

drop policy if exists library_objects_admin_insert on storage.objects;
drop policy if exists library_objects_admin_select on storage.objects;
drop policy if exists library_objects_admin_delete on storage.objects;
create policy library_objects_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'library' and public.is_admin()
  and name ~ '^documents/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$');
create policy library_objects_admin_select on storage.objects for select to authenticated
using (bucket_id = 'library' and public.is_admin());
create policy library_objects_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'library' and public.is_admin());
