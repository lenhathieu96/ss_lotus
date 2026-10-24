-- Correct the first pagoda migration without rewriting its applied history.
-- Take and restore-verify a schema and data backup before applying outside a
-- disposable database.
begin;

-- `20261024090000` was manually marked applied for one production project
-- after only its pagodas table existed. Bootstrap every missing prerequisite
-- here so this unapplied corrective migration converges both that partial
-- state and a database where the preceding migration completed normally.
create table if not exists public.pagodas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pagoda_memberships (
  pagoda_id uuid not null references public.pagodas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (pagoda_id, user_id)
);
create index if not exists pagoda_memberships_user_idx on public.pagoda_memberships (user_id, pagoda_id);

create table if not exists public.pagoda_number_counters (
  pagoda_id uuid primary key references public.pagodas(id) on delete cascade,
  last_number integer not null default 0 check (last_number between 0 and 9999)
);

insert into public.pagodas (id, slug, name)
values ('00000000-0000-4000-8000-000000000001', 'legacy-ss-lotus', 'Chùa SS Lotus')
on conflict (id) do nothing;
insert into public.pagoda_number_counters (pagoda_id, last_number)
select '00000000-0000-4000-8000-000000000001', last_number
from public.number_counter
where singleton
on conflict (pagoda_id) do nothing;

alter table public.households add column if not exists pagoda_id uuid references public.pagodas(id);
alter table public.families add column if not exists pagoda_id uuid references public.pagodas(id);
alter table public.members add column if not exists pagoda_id uuid references public.pagodas(id);
alter table public.deceased_people add column if not exists pagoda_id uuid references public.pagodas(id);
alter table public.prayer_profiles add column if not exists pagoda_id uuid references public.pagodas(id);
alter table public.prayer_people add column if not exists pagoda_id uuid references public.pagodas(id);
alter table public.ceremony_slots add column if not exists pagoda_id uuid references public.pagodas(id);
alter table public.registrations add column if not exists pagoda_id uuid references public.pagodas(id);
alter table public.audit_events add column if not exists pagoda_id uuid references public.pagodas(id);

update public.households set pagoda_id = '00000000-0000-4000-8000-000000000001' where pagoda_id is null;
update public.families family set pagoda_id = household.pagoda_id
from public.households household where household.id = family.household_id and family.pagoda_id is null;
update public.members member set pagoda_id = family.pagoda_id
from public.families family where family.id = member.family_id and member.pagoda_id is null;
update public.deceased_people deceased set pagoda_id = coalesce(family.pagoda_id, '00000000-0000-4000-8000-000000000001'::uuid)
from public.families family where family.id = deceased.family_id and deceased.pagoda_id is null;
update public.deceased_people set pagoda_id = '00000000-0000-4000-8000-000000000001' where pagoda_id is null;
update public.prayer_profiles profile set pagoda_id = coalesce(
  (select household.pagoda_id from public.households household where household.id = profile.household_id),
  (select family.pagoda_id from public.families family where family.id = profile.family_id),
  (select deceased.pagoda_id from public.deceased_people deceased where deceased.id = profile.deceased_person_id),
  '00000000-0000-4000-8000-000000000001'::uuid
) where profile.pagoda_id is null;
update public.prayer_people person set pagoda_id = profile.pagoda_id
from public.prayer_profiles profile where profile.id = person.profile_id and person.pagoda_id is null;
update public.registrations registration set pagoda_id = profile.pagoda_id
from public.prayer_profiles profile where profile.id = registration.profile_id and registration.pagoda_id is null;
update public.ceremony_slots set pagoda_id = '00000000-0000-4000-8000-000000000001' where pagoda_id is null;
update public.audit_events set pagoda_id = '00000000-0000-4000-8000-000000000001' where pagoda_id is null;

alter table public.households alter column pagoda_id set not null;
alter table public.families alter column pagoda_id set not null;
alter table public.members alter column pagoda_id set not null;
alter table public.deceased_people alter column pagoda_id set not null;
alter table public.prayer_profiles alter column pagoda_id set not null;
alter table public.prayer_people alter column pagoda_id set not null;
alter table public.ceremony_slots alter column pagoda_id set not null;
alter table public.registrations alter column pagoda_id set not null;

alter table public.households drop constraint if exists households_business_number_key;
alter table public.households drop constraint if exists households_legacy_number_key;
alter table public.families drop constraint if exists families_business_number_key;
alter table public.deceased_people drop constraint if exists deceased_people_code_key;
do $$
declare current_slot_key text[];
begin
  select array_agg(attribute.attname order by key_column.ordinality)
    into current_slot_key
  from pg_constraint pc
  join unnest(pc.conkey) with ordinality as key_column(attribute_number, ordinality) on true
  join pg_attribute attribute on attribute.attrelid = pc.conrelid and attribute.attnum = key_column.attribute_number
  where pc.conrelid = 'public.ceremony_slots'::regclass and pc.contype = 'p';
  if current_slot_key is distinct from array['pagoda_id', 'ceremony_date', 'period', 'prayer_type'] then
    alter table public.ceremony_slots drop constraint if exists ceremony_slots_pkey cascade;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ceremony_slots'::regclass and contype = 'p'
  ) then
    alter table public.ceremony_slots add primary key (pagoda_id, ceremony_date, period, prayer_type);
  end if;
end;
$$;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.households'::regclass and conname = 'households_pagoda_business_number_key') then
    alter table public.households add constraint households_pagoda_business_number_key unique (pagoda_id, business_number);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.households'::regclass and conname = 'households_pagoda_legacy_number_key') then
    alter table public.households add constraint households_pagoda_legacy_number_key unique (pagoda_id, legacy_number);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.families'::regclass and conname = 'families_pagoda_business_number_key') then
    alter table public.families add constraint families_pagoda_business_number_key unique (pagoda_id, business_number);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.deceased_people'::regclass and conname = 'deceased_people_pagoda_code_key') then
    alter table public.deceased_people add constraint deceased_people_pagoda_code_key unique (pagoda_id, code);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.registrations'::regclass and conname = 'registrations_pagoda_slot_fkey') then
    alter table public.registrations add constraint registrations_pagoda_slot_fkey
      foreign key (pagoda_id, ceremony_date, period, prayer_type)
      references public.ceremony_slots (pagoda_id, ceremony_date, period, prayer_type);
  end if;
end;
$$;
create index if not exists registrations_pagoda_slot_idx on public.registrations (pagoda_id, ceremony_date, period) where status = 'active';
create index if not exists deceased_people_pagoda_idx on public.deceased_people (pagoda_id, code);

alter table public.pagodas enable row level security;
alter table public.pagoda_memberships enable row level security;
alter table public.pagoda_number_counters enable row level security;

-- Every assigned person has identical pagoda business access. Platform admins
-- are global and never depend on membership rows.
-- These policies depend on the role-bearing helper in the preceding migration,
-- so they must be removed before that helper and its enum can be dropped.
drop policy if exists pagoda_read_households on public.households;
drop policy if exists pagoda_read_families on public.families;
drop policy if exists pagoda_read_members on public.members;
drop policy if exists pagoda_read_profiles on public.prayer_profiles;
drop policy if exists pagoda_read_people on public.prayer_people;
drop policy if exists pagoda_read_slots on public.ceremony_slots;
drop policy if exists pagoda_read_registrations on public.registrations;
drop policy if exists pagoda_read_audit on public.audit_events;
drop policy if exists admin_read_deceased_people on public.deceased_people;
drop policy if exists pagoda_members_can_read_pagodas on public.pagodas;
drop policy if exists users_can_read_own_pagoda_memberships on public.pagoda_memberships;
do $$
begin
  -- Referencing the enum directly when it was never created fails before
  -- `DROP FUNCTION IF EXISTS` can take effect. The partial migration path has
  -- no enum; the fully applied predecessor does.
  if to_regtype('public.pagoda_role') is not null then
    execute 'drop function if exists public.is_pagoda_member(uuid, public.pagoda_role[])';
  end if;
end;
$$;
drop function if exists public.require_pagoda_admin(uuid);
drop function if exists public.list_my_pagodas();
alter table public.pagoda_memberships drop column if exists role;
drop type if exists public.pagoda_role;

-- The preceding draft copied global admins into the legacy pagoda. Those rows
-- would survive an admin revocation and accidentally become tenant access.
delete from public.pagoda_memberships membership
using public.admin_users admin
where membership.pagoda_id = '00000000-0000-4000-8000-000000000001'::uuid
  and membership.user_id = admin.user_id;

create function public.is_pagoda_member(p_pagoda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.pagoda_memberships membership
      where membership.pagoda_id = p_pagoda_id
        and membership.user_id = auth.uid()
    );
$$;

create function public.has_pagoda_access(p_pagoda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (select 1 from public.pagodas pagoda where pagoda.id = p_pagoda_id)
    and (public.is_admin() or public.is_pagoda_member(p_pagoda_id));
$$;

create function public.require_pagoda_access(p_pagoda_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_pagoda_access(p_pagoda_id) then
    raise exception 'Pagoda access required';
  end if;
end;
$$;

create or replace function public.list_my_pagodas()
returns table(id uuid, slug text, name text)
language sql
stable
security definer
set search_path = public
as $$
  select pagoda.id, pagoda.slug, pagoda.name
  from public.pagodas pagoda
  where public.is_admin()
     or exists (
       select 1
       from public.pagoda_memberships membership
       where membership.pagoda_id = pagoda.id
         and membership.user_id = auth.uid()
     )
  order by pagoda.name, pagoda.id;
$$;

-- Tenant identity must agree at every parent/child edge, including when an
-- administrator supplies forged IDs.
alter table public.households add constraint households_pagoda_id_id_key unique (pagoda_id, id);
alter table public.families add constraint families_pagoda_id_id_key unique (pagoda_id, id);
alter table public.members add constraint members_pagoda_id_id_key unique (pagoda_id, id);
alter table public.deceased_people add constraint deceased_people_pagoda_id_id_key unique (pagoda_id, id);
alter table public.prayer_profiles add constraint prayer_profiles_pagoda_id_id_key unique (pagoda_id, id);

alter table public.families
  add constraint families_pagoda_household_fkey
  foreign key (pagoda_id, household_id)
  references public.households (pagoda_id, id);
alter table public.members
  add constraint members_pagoda_family_fkey
  foreign key (pagoda_id, family_id)
  references public.families (pagoda_id, id);
alter table public.deceased_people
  add constraint deceased_people_pagoda_family_fkey
  foreign key (pagoda_id, family_id)
  references public.families (pagoda_id, id);
alter table public.prayer_profiles
  add constraint prayer_profiles_pagoda_family_fkey
  foreign key (pagoda_id, family_id)
  references public.families (pagoda_id, id),
  add constraint prayer_profiles_pagoda_household_fkey
  foreign key (pagoda_id, household_id)
  references public.households (pagoda_id, id),
  add constraint prayer_profiles_pagoda_deceased_fkey
  foreign key (pagoda_id, deceased_person_id)
  references public.deceased_people (pagoda_id, id);
alter table public.prayer_people
  add constraint prayer_people_pagoda_profile_fkey
  foreign key (pagoda_id, profile_id)
  references public.prayer_profiles (pagoda_id, id),
  add constraint prayer_people_pagoda_member_fkey
  foreign key (pagoda_id, member_id)
  references public.members (pagoda_id, id),
  add constraint prayer_people_pagoda_deceased_fkey
  foreign key (pagoda_id, deceased_person_id)
  references public.deceased_people (pagoda_id, id);
alter table public.registrations
  add constraint registrations_pagoda_profile_fkey
  foreign key (pagoda_id, profile_id)
  references public.prayer_profiles (pagoda_id, id);

-- Audit events are either tenant records or global records. Library lifecycle
-- functions intentionally remain global and predate the pagoda column.
alter table public.audit_events add column if not exists scope text;
update public.audit_events
set scope = case when action like 'library%' then 'global' else 'pagoda' end
where scope is null;
update public.audit_events
set pagoda_id = null
where scope = 'global';
alter table public.audit_events alter column pagoda_id drop not null;
alter table public.audit_events alter column scope set not null;
alter table public.audit_events alter column scope set default 'global';
alter table public.audit_events
  add constraint audit_events_scope_check
  check ((scope = 'pagoda' and pagoda_id is not null) or (scope = 'global' and pagoda_id is null));

-- Remove every old read policy and make the global-admin bypass explicit.
drop policy if exists pagoda_read_households on public.households;
drop policy if exists pagoda_read_families on public.families;
drop policy if exists pagoda_read_members on public.members;
drop policy if exists pagoda_read_profiles on public.prayer_profiles;
drop policy if exists pagoda_read_people on public.prayer_people;
drop policy if exists pagoda_read_slots on public.ceremony_slots;
drop policy if exists pagoda_read_registrations on public.registrations;
drop policy if exists pagoda_read_audit on public.audit_events;
drop policy if exists admin_read_households on public.households;
drop policy if exists admin_read_families on public.families;
drop policy if exists admin_read_members on public.members;
drop policy if exists admin_read_profiles on public.prayer_profiles;
drop policy if exists admin_read_people on public.prayer_people;
drop policy if exists admin_read_slots on public.ceremony_slots;
drop policy if exists admin_read_registrations on public.registrations;
drop policy if exists admin_read_audit on public.audit_events;
drop policy if exists admin_read_deceased_people on public.deceased_people;
drop policy if exists pagoda_members_can_read_pagodas on public.pagodas;
drop policy if exists users_can_read_own_pagoda_memberships on public.pagoda_memberships;

create policy pagoda_read_households on public.households for select to authenticated using (public.has_pagoda_access(pagoda_id));
create policy pagoda_read_families on public.families for select to authenticated using (public.has_pagoda_access(pagoda_id));
create policy pagoda_read_members on public.members for select to authenticated using (public.has_pagoda_access(pagoda_id));
create policy pagoda_read_deceased_people on public.deceased_people for select to authenticated using (public.has_pagoda_access(pagoda_id));
create policy pagoda_read_profiles on public.prayer_profiles for select to authenticated using (public.has_pagoda_access(pagoda_id));
create policy pagoda_read_people on public.prayer_people for select to authenticated using (public.has_pagoda_access(pagoda_id));
create policy pagoda_read_slots on public.ceremony_slots for select to authenticated using (public.has_pagoda_access(pagoda_id));
create policy pagoda_read_registrations on public.registrations for select to authenticated using (public.has_pagoda_access(pagoda_id));
create policy pagoda_read_audit on public.audit_events for select to authenticated using (scope = 'pagoda' and public.has_pagoda_access(pagoda_id));
create policy pagoda_accessible_pagodas on public.pagodas for select to authenticated using (public.has_pagoda_access(id));

-- No browser policy grants access to platform-admin or membership writes.

-- Recreate tenant RPCs with the role-free guard and original workflow semantics.
create or replace function public.search_households(p_pagoda_id uuid, p_query text)
returns table(id uuid, business_number integer, legacy_number integer, address text)
language sql stable security definer set search_path = public as $$
  select distinct household.id, household.business_number, household.legacy_number, family.address
  from public.households household
  join public.families family on family.id is not null
    and family.pagoda_id = household.pagoda_id
    and family.household_id = household.id
  where public.has_pagoda_access(p_pagoda_id)
    and household.pagoda_id = p_pagoda_id
    and (household.business_number::text = btrim(p_query)
      or household.legacy_number::text = btrim(p_query)
      or unaccent(lower(family.address)) like unaccent(lower(btrim(p_query))) || '%'
      or exists (
        select 1 from public.members member
        where member.pagoda_id = p_pagoda_id and member.family_id = family.id
          and unaccent(lower(member.full_name)) like unaccent(lower(btrim(p_query))) || '%'
      ))
  order by business_number
  limit 50;
$$;

create or replace function public.create_household(p_pagoda_id uuid, p_legacy_number integer, p_families jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  family_input jsonb;
  member_input jsonb;
  household_id uuid;
  family_id uuid;
  household_number integer;
  next_number integer;
  family_position smallint := 0;
  member_position smallint;
  family_count integer;
  result jsonb;
begin
  perform public.require_pagoda_access(p_pagoda_id);
  if p_families is null or jsonb_typeof(p_families) <> 'array' or jsonb_array_length(p_families) = 0 then
    raise exception 'At least one family is required';
  end if;
  if p_legacy_number is not null and p_legacy_number not between 1 and 9999 then
    raise exception 'Legacy household number must be between 1 and 9999';
  end if;
  select last_number into next_number
  from public.pagoda_number_counters where pagoda_id = p_pagoda_id for update;
  if next_number is null then raise exception 'Pagoda counter not found'; end if;
  family_count := jsonb_array_length(p_families);
  if next_number + family_count > 9999 then raise exception 'Household number capacity exhausted'; end if;
  household_number := next_number + 1;
  insert into public.households (pagoda_id, business_number, legacy_number)
  values (p_pagoda_id, household_number, p_legacy_number) returning id into household_id;
  for family_input in select value from jsonb_array_elements(p_families) loop
    if jsonb_typeof(family_input->'members') <> 'array'
      or jsonb_array_length(family_input->'members') = 0
      or nullif(btrim(family_input->>'address'), '') is null then
      raise exception 'Each family requires an address and at least one member';
    end if;
    family_position := family_position + 1;
    insert into public.families (pagoda_id, household_id, business_number, address, position)
    values (p_pagoda_id, household_id, household_number + family_position - 1,
      upper(btrim(family_input->>'address')), family_position)
    returning id into family_id;
    member_position := 0;
    for member_input in select value from jsonb_array_elements(family_input->'members') loop
      if nullif(btrim(member_input->>'fullName'), '') is null then raise exception 'Member name is required'; end if;
      member_position := member_position + 1;
      insert into public.members (pagoda_id, family_id, full_name, dharma_name, year_of_birth, position)
      values (p_pagoda_id, family_id, upper(btrim(member_input->>'fullName')),
        nullif(upper(btrim(member_input->>'dharmaName')), ''),
        case when nullif(member_input->>'yearOfBirth', '') is null then null else (member_input->>'yearOfBirth')::smallint end,
        member_position);
    end loop;
  end loop;
  update public.pagoda_number_counters
  set last_number = household_number + family_count - 1
  where pagoda_id = p_pagoda_id;
  select jsonb_build_object(
    'id', household.id, 'businessNumber', household.business_number, 'legacyNumber', household.legacy_number,
    'families', coalesce(jsonb_agg(jsonb_build_object(
      'id', family.id, 'businessNumber', family.business_number, 'address', family.address,
      'members', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', member.id, 'fullName', member.full_name, 'dharmaName', member.dharma_name,
        'yearOfBirth', member.year_of_birth) order by member.position), '[]'::jsonb)
        from public.members member where member.pagoda_id = p_pagoda_id and member.family_id = family.id)
    ) order by family.position), '[]'::jsonb)
  ) into result
  from public.households household left join public.families family
    on family.pagoda_id = p_pagoda_id and family.household_id = household.id
  where household.id = household_id and household.pagoda_id = p_pagoda_id
  group by household.id, household.business_number, household.legacy_number;
  insert into public.audit_events (pagoda_id, scope, actor_id, action, entity_type, entity_id, after_state)
  values (p_pagoda_id, 'pagoda', auth.uid(), 'household_created', 'household', household_id, result);
  return result;
end;
$$;

create or replace function public.get_household_workspace(p_pagoda_id uuid, p_household_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  perform public.require_pagoda_access(p_pagoda_id);
  select jsonb_build_object(
    'id', household.id, 'businessNumber', household.business_number, 'legacyNumber', household.legacy_number,
    'families', coalesce((select jsonb_agg(jsonb_build_object(
      'id', family.id, 'businessNumber', family.business_number, 'address', family.address,
      'members', coalesce((select jsonb_agg(jsonb_build_object(
        'id', member.id, 'fullName', member.full_name, 'dharmaName', member.dharma_name, 'yearOfBirth', member.year_of_birth,
        'prayerHistory', coalesce((select jsonb_agg(jsonb_build_object('date', registration.ceremony_date, 'period', registration.period) order by registration.ceremony_date desc)
          from public.prayer_people person join public.prayer_profiles profile on profile.id = person.profile_id
          join public.registrations registration on registration.profile_id = profile.id
          where person.pagoda_id = p_pagoda_id and person.member_id = member.id and registration.status = 'active'), '[]'::jsonb)
      ) order by member.position) from public.members member where member.pagoda_id = p_pagoda_id and member.family_id = family.id), '[]'::jsonb),
      'deceasedPeople', coalesce((select jsonb_agg(jsonb_build_object(
        'id', deceased.id, 'code', deceased.code, 'fullName', deceased.full_name, 'dharmaName', deceased.dharma_name,
        'dateOfDeath', jsonb_build_object('day', deceased.death_lunar_day, 'month', deceased.death_lunar_month, 'isLeap', deceased.death_lunar_is_leap),
        'prayerHistory', coalesce((select jsonb_agg(jsonb_build_object('date', registration.ceremony_date, 'period', registration.period) order by registration.ceremony_date desc)
          from public.prayer_profiles profile join public.registrations registration on registration.profile_id = profile.id
          where profile.pagoda_id = p_pagoda_id and profile.deceased_person_id = deceased.id and registration.status = 'active'), '[]'::jsonb)
      ) order by deceased.code) from public.deceased_people deceased where deceased.pagoda_id = p_pagoda_id and deceased.family_id = family.id), '[]'::jsonb)
    ) order by family.position) from public.families family where family.pagoda_id = p_pagoda_id and family.household_id = household.id), '[]'::jsonb)
  ) into result
  from public.households household where household.id = p_household_id and household.pagoda_id = p_pagoda_id;
  if result is null then raise exception 'Household not found'; end if;
  return result;
end;
$$;

create or replace function public.create_deceased_person(
  p_pagoda_id uuid, p_code text, p_full_name text, p_dharma_name text,
  p_death_lunar_day smallint, p_death_lunar_month smallint, p_death_lunar_is_leap boolean,
  p_recorded_by text, p_household_business_number integer, p_family_business_number integer
)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_family_id uuid; created_id uuid; normalized_code text := upper(btrim(p_code));
begin
  perform public.require_pagoda_access(p_pagoda_id);
  if normalized_code = '' or nullif(btrim(p_full_name), '') is null
    or p_death_lunar_day not between 1 and 30 or p_death_lunar_month not between 1 and 12
    or p_death_lunar_is_leap is null or nullif(btrim(p_recorded_by), '') is null then
    raise exception 'Invalid deceased-person data';
  end if;
  if (p_household_business_number is null) <> (p_family_business_number is null) then
    raise exception 'Household and family references must be provided together';
  end if;
  if p_household_business_number is not null then
    select family.id into target_family_id
    from public.families family join public.households household
      on household.pagoda_id = family.pagoda_id and household.id = family.household_id
    where household.pagoda_id = p_pagoda_id and household.business_number = p_household_business_number
      and family.business_number = p_family_business_number;
    if target_family_id is null then raise exception 'Household and family business numbers do not identify a family'; end if;
  end if;
  insert into public.deceased_people (
    pagoda_id, code, full_name, dharma_name, death_lunar_day, death_lunar_month, death_lunar_is_leap,
    recorded_by, family_id, household_reference, family_reference, created_by_user_id
  ) values (
    p_pagoda_id, normalized_code, upper(btrim(p_full_name)), nullif(upper(btrim(coalesce(p_dharma_name, ''))), ''),
    p_death_lunar_day, p_death_lunar_month, p_death_lunar_is_leap, upper(btrim(p_recorded_by)),
    target_family_id, p_household_business_number, p_family_business_number, auth.uid()
  ) returning id into created_id;
  insert into public.audit_events (pagoda_id, scope, actor_id, action, entity_type, entity_id, after_state)
  select p_pagoda_id, 'pagoda', auth.uid(), 'deceased_person_created', 'deceased_person', created_id, to_jsonb(deceased)
  from public.deceased_people deceased where deceased.id = created_id;
  return created_id;
end;
$$;

create or replace function public.list_deceased_people(p_pagoda_id uuid)
returns table(id uuid, code text, full_name text, dharma_name text, death_lunar_day smallint,
  death_lunar_month smallint, death_lunar_is_leap boolean, recorded_by text,
  household_reference text, family_reference text, prayer_history jsonb)
language sql stable security definer set search_path = public as $$
  select deceased.id, deceased.code, deceased.full_name, deceased.dharma_name,
    deceased.death_lunar_day, deceased.death_lunar_month, deceased.death_lunar_is_leap, deceased.recorded_by,
    coalesce(deceased.household_reference::text, household.business_number::text),
    coalesce(deceased.family_reference::text, family.business_number::text),
    coalesce((select jsonb_agg(jsonb_build_object('date', registration.ceremony_date, 'period', registration.period) order by registration.ceremony_date desc)
      from public.prayer_profiles profile join public.registrations registration on registration.profile_id = profile.id
      where profile.pagoda_id = p_pagoda_id and profile.deceased_person_id = deceased.id and registration.status = 'active'), '[]'::jsonb)
  from public.deceased_people deceased
  left join public.families family on family.pagoda_id = deceased.pagoda_id and family.id = deceased.family_id
  left join public.households household on household.pagoda_id = family.pagoda_id and household.id = family.household_id
  where public.has_pagoda_access(p_pagoda_id) and deceased.pagoda_id = p_pagoda_id
  order by deceased.code;
$$;

create or replace function public.import_deceased_people(p_pagoda_id uuid, p_people jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare person jsonb; death_date jsonb; imported_count integer := 0; household_ref text; family_ref text;
begin
  perform public.require_pagoda_access(p_pagoda_id);
  if jsonb_typeof(p_people) <> 'array' or jsonb_array_length(p_people) = 0 then raise exception 'At least one deceased person is required'; end if;
  for person in select value from jsonb_array_elements(p_people) loop
    death_date := person->'dateOfDeath';
    if jsonb_typeof(death_date) <> 'object' or death_date ? 'year'
      or not coalesce((death_date->>'day') ~ '^\\d{1,2}$', false)
      or not coalesce((death_date->>'month') ~ '^\\d{1,2}$', false)
      or jsonb_typeof(death_date->'isLeap') <> 'boolean' then
      raise exception 'Lunar death date must include day, month, and isLeap';
    end if;
    household_ref := nullif(btrim(person->>'householdReference'), '');
    family_ref := nullif(btrim(person->>'familyReference'), '');
    if (household_ref is null) <> (family_ref is null) then raise exception 'Household and family references must be provided together'; end if;
    if (household_ref is not null and household_ref !~ '^\\d{1,4}$') or (family_ref is not null and family_ref !~ '^\\d{1,4}$') then
      raise exception 'Household and family references must be 1–4 digit business numbers';
    end if;
    perform public.create_deceased_person(p_pagoda_id, person->>'code', person->>'fullName', person->>'dharmaName',
      (death_date->>'day')::smallint, (death_date->>'month')::smallint, (death_date->>'isLeap')::boolean,
      person->>'createdBy', case when household_ref is null then null else household_ref::integer end,
      case when family_ref is null then null else family_ref::integer end);
    imported_count := imported_count + 1;
  end loop;
  return imported_count;
end;
$$;

create or replace function public.update_deceased_person_association(
  p_pagoda_id uuid, p_deceased_person_id uuid, p_household_business_number integer, p_family_business_number integer
)
returns void language plpgsql security definer set search_path = public as $$
declare target_family_id uuid; before_state jsonb;
begin
  perform public.require_pagoda_access(p_pagoda_id);
  if (p_household_business_number is null) <> (p_family_business_number is null) then
    raise exception 'Household and family references must be provided together';
  end if;
  select to_jsonb(deceased) into before_state from public.deceased_people deceased
  where deceased.id = p_deceased_person_id and deceased.pagoda_id = p_pagoda_id for update;
  if before_state is null then raise exception 'Hương linh not found'; end if;
  if p_household_business_number is not null then
    select family.id into target_family_id
    from public.families family join public.households household
      on household.pagoda_id = family.pagoda_id and household.id = family.household_id
    where household.pagoda_id = p_pagoda_id and household.business_number = p_household_business_number
      and family.business_number = p_family_business_number;
    if target_family_id is null then raise exception 'Household and family business numbers do not identify a family'; end if;
  end if;
  update public.deceased_people
  set family_id = target_family_id, household_reference = p_household_business_number, family_reference = p_family_business_number
  where id = p_deceased_person_id and pagoda_id = p_pagoda_id;
  insert into public.audit_events (pagoda_id, scope, actor_id, action, entity_type, entity_id, before_state, after_state)
  select p_pagoda_id, 'pagoda', auth.uid(), 'deceased_person_association_updated', 'deceased_person', deceased.id,
    before_state, to_jsonb(deceased)
  from public.deceased_people deceased where deceased.id = p_deceased_person_id;
end;
$$;

create or replace function public.reserve_registration(
  p_pagoda_id uuid, p_profile_id uuid, p_date date, p_period public.ceremony_period, p_year smallint
)
returns public.registrations language plpgsql security definer set search_path = public as $$
declare profile_type public.prayer_type; slot public.ceremony_slots; active_count integer; result public.registrations;
begin
  perform public.require_pagoda_access(p_pagoda_id);
  select profile.type into profile_type from public.prayer_profiles profile
  where profile.id = p_profile_id and profile.pagoda_id = p_pagoda_id;
  if profile_type is null then raise exception 'Prayer profile not found'; end if;
  if p_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ceremony date must be today or in the future'; end if;
  if profile_type = 'memorial' and p_period <> 'evening' then raise exception 'Memorial prayer is only available in the evening'; end if;
  if p_year <> extract(year from p_date)::smallint then raise exception 'Ceremony year does not match ceremony date'; end if;
  perform pg_advisory_xact_lock(hashtext(p_pagoda_id::text || ':' || p_date::text || ':' || p_period::text || ':' || profile_type::text));
  perform pg_advisory_xact_lock(hashtext(p_profile_id::text || ':' || p_year::text));
  select * into result from public.registrations registration
  where registration.pagoda_id = p_pagoda_id and registration.profile_id = p_profile_id
    and registration.ceremony_year = p_year for update;
  if found then
    if result.ceremony_date = p_date and result.period = p_period and result.prayer_type = profile_type then
      return result;
    end if;
    raise exception 'Prayer profile already has a different registration for this ceremony year';
  end if;
  select * into slot from public.ceremony_slots
  where pagoda_id = p_pagoda_id and ceremony_date = p_date and period = p_period and prayer_type = profile_type for update;
  if not found then
    insert into public.ceremony_slots (pagoda_id, ceremony_date, period, prayer_type)
    values (p_pagoda_id, p_date, p_period, profile_type) returning * into slot;
  end if;
  select count(*) into active_count from public.registrations registration
  where registration.pagoda_id = p_pagoda_id and registration.ceremony_date = p_date
    and registration.period = p_period and registration.prayer_type = profile_type and registration.status = 'active';
  if active_count >= slot.capacity then raise exception 'Ceremony slot is full'; end if;
  insert into public.registrations (pagoda_id, profile_id, ceremony_date, period, prayer_type, ceremony_year)
  values (p_pagoda_id, p_profile_id, p_date, p_period, profile_type, p_year)
  returning * into result;
  insert into public.audit_events (pagoda_id, scope, actor_id, action, entity_type, entity_id, after_state)
  values (p_pagoda_id, 'pagoda', auth.uid(), 'registration_created', 'registration', result.id, to_jsonb(result));
  return result;
end;
$$;

create or replace function public.create_household_wellbeing_registration(
  p_pagoda_id uuid, p_household_id uuid, p_member_ids uuid[], p_ceremony_date date, p_period public.ceremony_period
)
returns uuid language plpgsql security definer set search_path = public as $$
declare profile_id uuid; profile_created boolean := false; selected_count integer; distinct_count integer;
begin
  perform public.require_pagoda_access(p_pagoda_id);
  if p_member_ids is null or cardinality(p_member_ids) = 0 then raise exception 'Select at least one living member'; end if;
  select count(distinct selected.member_id) into distinct_count from unnest(p_member_ids) as selected(member_id);
  if cardinality(p_member_ids) <> distinct_count then raise exception 'Duplicate members are not allowed'; end if;
  select count(*) into selected_count from public.members member join public.families family
    on family.pagoda_id = member.pagoda_id and family.id = member.family_id
  where member.id = any(p_member_ids) and member.pagoda_id = p_pagoda_id and family.household_id = p_household_id;
  if selected_count <> cardinality(p_member_ids)
    or not exists (select 1 from public.households household where household.id = p_household_id and household.pagoda_id = p_pagoda_id) then
    raise exception 'Every selected member must belong to this household';
  end if;
  insert into public.prayer_profiles (pagoda_id, household_id, type)
  values (p_pagoda_id, p_household_id, 'wellbeing') on conflict do nothing returning id into profile_id;
  profile_created := profile_id is not null;
  if not profile_created then
    select profile.id into profile_id from public.prayer_profiles profile
    where profile.pagoda_id = p_pagoda_id and profile.household_id = p_household_id and profile.type = 'wellbeing';
  end if;
  if profile_created then
    insert into public.prayer_people (pagoda_id, profile_id, member_id, full_name, is_deceased, position)
    select p_pagoda_id, profile_id, member.id, member.full_name, false,
      (row_number() over (order by array_position(p_member_ids, member.id)) - 1)::smallint
    from public.members member where member.pagoda_id = p_pagoda_id and member.id = any(p_member_ids);
  end if;
  perform public.reserve_registration(p_pagoda_id, profile_id, p_ceremony_date, p_period, extract(year from p_ceremony_date)::smallint);
  return profile_id;
end;
$$;

create or replace function public.create_memorial_registration(
  p_pagoda_id uuid, p_deceased_person_id uuid, p_ceremony_date date, p_period public.ceremony_period
)
returns uuid language plpgsql security definer set search_path = public as $$
declare profile_id uuid; profile_created boolean := false; deceased public.deceased_people; deceased_household_id uuid;
begin
  perform public.require_pagoda_access(p_pagoda_id);
  select * into deceased from public.deceased_people
  where id = p_deceased_person_id and pagoda_id = p_pagoda_id;
  if not found then raise exception 'Hương linh not found'; end if;
  if deceased.family_id is not null then
    select family.household_id into deceased_household_id from public.families family
    where family.pagoda_id = p_pagoda_id and family.id = deceased.family_id;
  end if;
  insert into public.prayer_profiles (pagoda_id, family_id, household_id, deceased_person_id, type)
  values (p_pagoda_id, deceased.family_id, deceased_household_id, deceased.id, 'memorial')
  on conflict do nothing returning id into profile_id;
  profile_created := profile_id is not null;
  if not profile_created then
    select profile.id into profile_id from public.prayer_profiles profile
    where profile.pagoda_id = p_pagoda_id and profile.deceased_person_id = deceased.id and profile.type = 'memorial';
  end if;
  if profile_created then
    insert into public.prayer_people (pagoda_id, profile_id, deceased_person_id, full_name, is_deceased, position)
    values (p_pagoda_id, profile_id, deceased.id, deceased.full_name, true, 0);
  end if;
  perform public.reserve_registration(p_pagoda_id, profile_id, p_ceremony_date, p_period, extract(year from p_ceremony_date)::smallint);
  return profile_id;
end;
$$;

-- Keep the deployed administrator-only frontend operational while the
-- tenant-aware frontend is promoted. These overloads deliberately bind all
-- legacy calls to the pre-multitenancy pagoda and can be removed only after
-- the former frontend version has been retired.
create or replace function public.require_legacy_pagoda_admin()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
end;
$$;

create or replace function public.search_households(p_query text)
returns table(id uuid, business_number integer, legacy_number integer, address text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_legacy_pagoda_admin();
  return query select * from public.search_households('00000000-0000-4000-8000-000000000001'::uuid, p_query);
end;
$$;

create or replace function public.create_household(p_legacy_number integer, p_families jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.require_legacy_pagoda_admin();
  return public.create_household('00000000-0000-4000-8000-000000000001'::uuid, p_legacy_number, p_families);
end;
$$;

create or replace function public.get_household_workspace(p_household_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_legacy_pagoda_admin();
  return public.get_household_workspace('00000000-0000-4000-8000-000000000001'::uuid, p_household_id);
end;
$$;

create or replace function public.create_deceased_person(
  p_code text, p_full_name text, p_dharma_name text, p_death_lunar_day smallint,
  p_death_lunar_month smallint, p_death_lunar_is_leap boolean, p_recorded_by text,
  p_household_business_number integer, p_family_business_number integer
)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public.require_legacy_pagoda_admin();
  return public.create_deceased_person('00000000-0000-4000-8000-000000000001'::uuid,
    p_code, p_full_name, p_dharma_name, p_death_lunar_day, p_death_lunar_month,
    p_death_lunar_is_leap, p_recorded_by, p_household_business_number, p_family_business_number);
end;
$$;

create or replace function public.list_deceased_people()
returns table(id uuid, code text, full_name text, dharma_name text, death_lunar_day smallint,
  death_lunar_month smallint, death_lunar_is_leap boolean, recorded_by text,
  household_reference text, family_reference text, prayer_history jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_legacy_pagoda_admin();
  return query select * from public.list_deceased_people('00000000-0000-4000-8000-000000000001'::uuid);
end;
$$;

create or replace function public.import_deceased_people(p_people jsonb)
returns integer language plpgsql security definer set search_path = public as $$
begin
  perform public.require_legacy_pagoda_admin();
  return public.import_deceased_people('00000000-0000-4000-8000-000000000001'::uuid, p_people);
end;
$$;

create or replace function public.update_deceased_person_association(
  p_deceased_person_id uuid, p_household_business_number integer, p_family_business_number integer
)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_legacy_pagoda_admin();
  perform public.update_deceased_person_association('00000000-0000-4000-8000-000000000001'::uuid,
    p_deceased_person_id, p_household_business_number, p_family_business_number);
end;
$$;

create or replace function public.reserve_registration(
  p_profile_id uuid, p_date date, p_period public.ceremony_period, p_year smallint
)
returns public.registrations language plpgsql security definer set search_path = public as $$
begin
  perform public.require_legacy_pagoda_admin();
  return public.reserve_registration('00000000-0000-4000-8000-000000000001'::uuid,
    p_profile_id, p_date, p_period, p_year);
end;
$$;

create or replace function public.create_household_wellbeing_registration(
  p_household_id uuid, p_member_ids uuid[], p_ceremony_date date, p_period public.ceremony_period
)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public.require_legacy_pagoda_admin();
  return public.create_household_wellbeing_registration('00000000-0000-4000-8000-000000000001'::uuid,
    p_household_id, p_member_ids, p_ceremony_date, p_period);
end;
$$;

create or replace function public.create_memorial_registration(
  p_deceased_person_id uuid, p_ceremony_date date, p_period public.ceremony_period
)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public.require_legacy_pagoda_admin();
  return public.create_memorial_registration('00000000-0000-4000-8000-000000000001'::uuid,
    p_deceased_person_id, p_ceremony_date, p_period);
end;
$$;

revoke all on function public.is_pagoda_member(uuid), public.has_pagoda_access(uuid), public.require_pagoda_access(uuid) from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.list_my_pagodas(), public.search_households(uuid, text), public.create_household(uuid, integer, jsonb),
  public.get_household_workspace(uuid, uuid), public.create_deceased_person(uuid, text, text, text, smallint, smallint, boolean, text, integer, integer),
  public.list_deceased_people(uuid), public.import_deceased_people(uuid, jsonb), public.update_deceased_person_association(uuid, uuid, integer, integer),
  public.reserve_registration(uuid, uuid, date, public.ceremony_period, smallint),
  public.create_household_wellbeing_registration(uuid, uuid, uuid[], date, public.ceremony_period),
  public.create_memorial_registration(uuid, uuid, date, public.ceremony_period) from public, anon;
grant execute on function public.is_pagoda_member(uuid), public.has_pagoda_access(uuid), public.require_pagoda_access(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.list_my_pagodas(), public.search_households(uuid, text), public.create_household(uuid, integer, jsonb),
  public.get_household_workspace(uuid, uuid), public.create_deceased_person(uuid, text, text, text, smallint, smallint, boolean, text, integer, integer),
  public.list_deceased_people(uuid), public.import_deceased_people(uuid, jsonb), public.update_deceased_person_association(uuid, uuid, integer, integer),
  public.create_household_wellbeing_registration(uuid, uuid, uuid[], date, public.ceremony_period),
  public.create_memorial_registration(uuid, uuid, date, public.ceremony_period) to authenticated;
revoke all on function public.require_legacy_pagoda_admin(), public.search_households(text), public.create_household(integer, jsonb),
  public.get_household_workspace(uuid), public.create_deceased_person(text, text, text, smallint, smallint, boolean, text, integer, integer),
  public.list_deceased_people(), public.import_deceased_people(jsonb), public.update_deceased_person_association(uuid, integer, integer),
  public.reserve_registration(uuid, date, public.ceremony_period, smallint),
  public.create_household_wellbeing_registration(uuid, uuid[], date, public.ceremony_period),
  public.create_memorial_registration(uuid, date, public.ceremony_period) from public, anon, authenticated;
grant execute on function public.search_households(text), public.create_household(integer, jsonb), public.get_household_workspace(uuid),
  public.create_deceased_person(text, text, text, smallint, smallint, boolean, text, integer, integer), public.list_deceased_people(),
  public.import_deceased_people(jsonb), public.update_deceased_person_association(uuid, integer, integer),
  public.create_household_wellbeing_registration(uuid, uuid[], date, public.ceremony_period),
  public.create_memorial_registration(uuid, date, public.ceremony_period) to authenticated;

commit;
