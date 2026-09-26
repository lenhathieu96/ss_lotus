-- Keep administrator access tied to the explicit admin_users allow-list.
-- Browser login authenticates a username/password account but does not grant
-- that account data access until an authorized operator has provisioned it.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
