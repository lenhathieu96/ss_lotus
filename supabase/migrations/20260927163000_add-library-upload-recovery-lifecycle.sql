begin;

create or replace function public.claim_s3_library_upload_recovery(p_actor_id uuid, p_document_id uuid)
returns table(expected_size bigint, recovery_claim_token uuid)
language plpgsql security definer set search_path = '' as $$
declare document public.library_documents; token uuid;
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  perform public.assert_library_storage_writable();
  select * into document from public.library_documents d where d.id = p_document_id for update;
  if not found or document.created_by_user_id <> p_actor_id then raise exception 'Upload ticket not found'; end if;
  if document.status <> 'cleaning' then raise exception 'Upload is not awaiting recovery'; end if;
  if document.cleanup_claim_until > now() then raise exception 'Upload recovery is already in progress'; end if;
  token := gen_random_uuid();
  update public.library_documents set cleanup_claim_until = now() + interval '15 minutes', cleanup_claim_token = token
  where id = document.id;
  return query select document.expected_size, token;
end;
$$;

create or replace function public.publish_recovered_s3_library_upload(
  p_actor_id uuid, p_document_id uuid, p_recovery_claim_token uuid, p_observed_size bigint,
  p_observed_content_type text, p_observed_etag text
)
returns void language plpgsql security definer set search_path = '' as $$
declare document public.library_documents;
begin
  perform public.require_s3_lifecycle_actor(p_actor_id);
  perform public.assert_library_storage_writable();
  select * into document from public.library_documents d where d.id = p_document_id for update;
  if not found or document.created_by_user_id <> p_actor_id then raise exception 'Upload ticket not found'; end if;
  if document.status <> 'cleaning' or document.cleanup_claim_token is distinct from p_recovery_claim_token
    or document.cleanup_claim_until <= now() then raise exception 'Upload recovery lease is no longer valid'; end if;
  if p_observed_size <> document.expected_size or lower(coalesce(p_observed_content_type, '')) <> 'application/pdf' then
    raise exception 'S3 verification does not match the upload ticket';
  end if;
  update public.library_documents set status = 'published', published_at = now(), upload_expires_at = null,
    observed_size = p_observed_size, observed_content_type = p_observed_content_type,
    observed_etag = p_observed_etag, verified_at = now(), cleanup_claim_until = null, cleanup_claim_token = null,
    completion_claim_until = null, completion_claim_token = null
  where id = document.id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (p_actor_id, 'library_s3_upload_recovered', 'library_document', document.id,
    jsonb_build_object('size', p_observed_size, 'etag', p_observed_etag));
end;
$$;

revoke all on function public.claim_s3_library_upload_recovery(uuid, uuid),
  public.publish_recovered_s3_library_upload(uuid, uuid, uuid, bigint, text, text) from public, anon, authenticated;
grant execute on function public.claim_s3_library_upload_recovery(uuid, uuid),
  public.publish_recovered_s3_library_upload(uuid, uuid, uuid, bigint, text, text) to service_role;

commit;
