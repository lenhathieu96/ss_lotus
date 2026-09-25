-- Temporary access override: every signed-in Supabase user may use the admin
-- workflows. Anonymous requests remain denied because auth.uid() is null.
-- Revert by restoring the admin_users lookup in public.is_admin().
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;
