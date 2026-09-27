begin;

alter table public.library_documents
  drop constraint if exists library_documents_check1,
  add constraint library_documents_published_at_status_check
    check ((status in ('published', 'deleting')) = (published_at is not null));

create or replace function public.library_can_upload_object(p_name text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    and p_name ~ '^documents/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
    and exists (
      select 1 from public.library_documents d
      where d.storage_path = p_name
        and d.created_by_user_id = auth.uid()
        and d.status = 'pending'
        and d.upload_expires_at > now()
    );
$$;

create or replace function public.library_can_delete_object(p_name text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    and exists (
      select 1 from public.library_documents d
      where d.storage_path = p_name
        and (
          (d.status = 'pending' and d.created_by_user_id = auth.uid())
          or (d.status = 'cleaning' and d.cleanup_claim_until > now())
          or d.status = 'deleting'
        )
    );
$$;

revoke all on function public.library_can_upload_object(text), public.library_can_delete_object(text)
  from public, anon, authenticated;
grant execute on function public.library_can_upload_object(text), public.library_can_delete_object(text)
  to authenticated;

drop policy if exists library_objects_admin_insert on storage.objects;
create policy library_objects_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'library' and public.library_can_upload_object(name));

drop policy if exists library_objects_admin_delete on storage.objects;
create policy library_objects_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'library' and public.library_can_delete_object(name));

commit;
