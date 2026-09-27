create or replace function public.publish_library_document(p_document_id uuid)
returns table(id uuid, category_id uuid, title text, author text, published_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare previous public.library_documents;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select d.* into previous
  from public.library_documents as d
  where d.id = p_document_id
  for update;
  if not found then raise exception 'Upload not found'; end if;
  if previous.status = 'published' then
    return query select previous.id, previous.category_id, previous.title, previous.author, previous.published_at;
    return;
  end if;
  if previous.status <> 'pending' or previous.upload_expires_at <= now() then raise exception 'Upload is not publishable'; end if;
  if not exists (select 1 from storage.objects as o where o.bucket_id = 'library' and o.name = previous.storage_path) then raise exception 'Uploaded PDF object is missing'; end if;
  update public.library_documents as d
  set status = 'published', published_at = now(), upload_expires_at = null
  where d.id = p_document_id
  returning d.* into previous;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (auth.uid(), 'library_document_published', 'library_document', previous.id,
    jsonb_build_object('category_id', previous.category_id, 'title', previous.title));
  return query select previous.id, previous.category_id, previous.title, previous.author, previous.published_at;
end;
$$;
