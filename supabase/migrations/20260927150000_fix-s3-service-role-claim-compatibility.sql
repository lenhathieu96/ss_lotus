begin;

create or replace function public.require_s3_lifecycle_actor(p_actor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'S3 lifecycle operations require service role';
  end if;
  if p_actor_id is null or not exists (select 1 from public.admin_users a where a.user_id = p_actor_id) then
    raise exception 'Administrator access required';
  end if;
end;
$$;

create or replace function public.set_library_storage_maintenance_lock(p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'S3 lifecycle operations require service role';
  end if;
  update public.library_storage_control set maintenance_lock = p_enabled, updated_at = now() where id;
end;
$$;

commit;
