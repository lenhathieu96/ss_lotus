-- Upgrades the deployed pagoda-scoped prototype without replacing table identities.
-- It intentionally refuses to infer globally shared business numbers for legacy data.

create extension if not exists pgcrypto;
create extension if not exists unaccent;

do $$
begin
  if exists (select 1 from public.households) or exists (select 1 from public.families) or exists (select 1 from public.people) then
    raise exception 'Legacy household, family, or people rows require an explicit data migration before this schema upgrade';
  end if;

  if to_regclass('public.people') is not null and to_regclass('public.members') is not null then
    raise exception 'Both public.people and public.members exist; resolve the member-table mapping before this schema upgrade';
  end if;

  if to_regclass('public.people') is not null then
    alter table public.people rename to members;
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'prayer_type') then
    create type public.prayer_type as enum ('wellbeing', 'memorial');
  end if;
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'ceremony_period') then
    create type public.ceremony_period as enum ('morning', 'afternoon', 'evening');
  end if;
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'registration_status') then
    create type public.registration_status as enum ('active', 'cancelled', 'locked');
  end if;
end;
$$;

alter table public.households
  add column if not exists business_number integer,
  add column if not exists legacy_number integer,
  add column if not exists source_firestore_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.households
  alter column pagoda_id drop default,
  alter column business_number set not null;

alter table public.households
  add constraint households_business_number_range check (business_number between 1 and 9999),
  add constraint households_business_number_unique unique (business_number),
  add constraint households_legacy_number_range check (legacy_number is null or legacy_number between 1 and 9999),
  add constraint households_legacy_number_unique unique (legacy_number),
  add constraint households_source_firestore_id_unique unique (source_firestore_id);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'families' and column_name = 'family_position') then
    alter table public.families rename column family_position to position;
  end if;
end;
$$;

alter table public.families
  add column if not exists business_number integer,
  add column if not exists source_firestore_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.families
  alter column household_id drop default,
  alter column household_id set not null,
  alter column position set not null;

alter table public.families drop constraint if exists families_household_id_fkey;
alter table public.families
  add constraint families_household_id_fkey foreign key (household_id) references public.households(id) on delete cascade,
  add constraint families_business_number_range check (business_number between 1 and 9999),
  add constraint families_business_number_unique unique (business_number),
  add constraint families_source_firestore_id_unique unique (source_firestore_id),
  add constraint families_household_position_unique unique (household_id, position);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'members' and column_name = 'christian_name') then
    alter table public.members rename column christian_name to dharma_name;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'members' and column_name = 'yob') then
    alter table public.members rename column yob to year_of_birth;
  end if;
end;
$$;

alter table public.members
  alter column position set not null;

alter table public.members drop constraint if exists people_family_id_fkey;
alter table public.members
  add constraint members_family_id_fkey foreign key (family_id) references public.families(id) on delete cascade;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.number_counter (
  singleton boolean primary key default true check (singleton),
  last_number integer not null default 0 check (last_number between 0 and 9999)
);
insert into public.number_counter (singleton) values (true) on conflict do nothing;

create table public.prayer_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  type public.prayer_type not null,
  representative_member_id uuid references public.members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, type),
  check ((type = 'wellbeing' and representative_member_id is null) or (type = 'memorial' and representative_member_id is not null))
);

create table public.prayer_people (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.prayer_profiles(id) on delete cascade,
  member_id uuid references public.members(id) on delete restrict,
  full_name text not null check (btrim(full_name) <> ''),
  is_deceased boolean not null,
  position smallint not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (profile_id, position),
  check ((is_deceased and member_id is null) or (not is_deceased and member_id is not null))
);

create table public.ceremony_slots (
  ceremony_date date not null,
  period public.ceremony_period not null,
  prayer_type public.prayer_type not null,
  capacity smallint not null default 150 check (capacity between 1 and 999),
  primary key (ceremony_date, period, prayer_type),
  check (prayer_type = 'wellbeing' or period = 'evening')
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.prayer_profiles(id) on delete restrict,
  ceremony_date date not null,
  period public.ceremony_period not null,
  prayer_type public.prayer_type not null,
  ceremony_year smallint not null,
  status public.registration_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, ceremony_year),
  foreign key (ceremony_date, period, prayer_type) references public.ceremony_slots
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index families_household_position_idx on public.families (household_id, position);
create index members_family_position_idx on public.members (family_id, position);
create index registrations_slot_idx on public.registrations (ceremony_date, period) where status = 'active';
create index households_search_idx on public.households (business_number, legacy_number);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger households_updated_at before update on public.households for each row execute function public.set_updated_at();
create trigger families_updated_at before update on public.families for each row execute function public.set_updated_at();
create trigger members_updated_at before update on public.members for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.prayer_profiles for each row execute function public.set_updated_at();
create trigger registrations_updated_at before update on public.registrations for each row execute function public.set_updated_at();

create or replace function public.assert_profile_integrity()
returns trigger language plpgsql set search_path = public as $$
declare
  profile_type public.prayer_type;
  profile_family uuid;
  member_family uuid;
begin
  select type, family_id into profile_type, profile_family from public.prayer_profiles where id = new.profile_id;
  if (profile_type = 'wellbeing') <> (not new.is_deceased) then raise exception 'Prayer-person life status conflicts with profile type'; end if;
  if new.member_id is not null then
    select family_id into member_family from public.members where id = new.member_id;
    if member_family <> profile_family then raise exception 'Living prayer person must be a member of the profile family'; end if;
  end if;
  return new;
end;
$$;
create trigger prayer_people_integrity before insert or update on public.prayer_people for each row execute function public.assert_profile_integrity();

create or replace function public.assert_memorial_representative()
returns trigger language plpgsql set search_path = public as $$
declare member_family uuid;
begin
  if new.type = 'memorial' then
    select family_id into member_family from public.members where id = new.representative_member_id;
    if member_family <> new.family_id then raise exception 'Memorial representative must belong to the family'; end if;
  end if;
  return new;
end;
$$;
create trigger memorial_representative_integrity before insert or update on public.prayer_profiles for each row execute function public.assert_memorial_representative();

create or replace function public.assert_registration_profile_type()
returns trigger language plpgsql set search_path = public as $$
declare profile_type public.prayer_type;
begin
  select type into profile_type from public.prayer_profiles where id = new.profile_id;
  if profile_type <> new.prayer_type then raise exception 'Registration prayer type conflicts with its profile'; end if;
  return new;
end;
$$;
create trigger registration_profile_type_integrity before insert or update on public.registrations for each row execute function public.assert_registration_profile_type();

create or replace function public.reserve_registration(p_profile_id uuid, p_date date, p_period public.ceremony_period, p_year smallint)
returns public.registrations language plpgsql security definer set search_path = public as $$
declare
  profile_type public.prayer_type;
  slot public.ceremony_slots;
  active_count integer;
  result public.registrations;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select type into profile_type from public.prayer_profiles where id = p_profile_id;
  if profile_type is null then raise exception 'Prayer profile not found'; end if;
  if p_date < current_date then raise exception 'Ceremony date must be today or in the future'; end if;
  if profile_type = 'memorial' and p_period <> 'evening' then raise exception 'Memorial prayer is only available in the evening'; end if;
  perform pg_advisory_xact_lock(hashtext(p_date::text || ':' || p_period::text));
  select * into slot from public.ceremony_slots where ceremony_date = p_date and period = p_period and prayer_type = profile_type for update;
  if not found then
    insert into public.ceremony_slots (ceremony_date, period, prayer_type) values (p_date, p_period, profile_type) returning * into slot;
  end if;
  select count(*) into active_count from public.registrations where ceremony_date = p_date and period = p_period and status = 'active';
  if active_count >= slot.capacity then raise exception 'Ceremony slot is full'; end if;
  insert into public.registrations (profile_id, ceremony_date, period, prayer_type, ceremony_year)
  values (p_profile_id, p_date, p_period, profile_type, p_year) returning * into result;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (auth.uid(), 'registration_created', 'registration', result.id, to_jsonb(result));
  return result;
end;
$$;

create or replace function public.search_households(p_query text)
returns table(id uuid, business_number integer, legacy_number integer, address text)
language sql stable security definer set search_path = public as $$
  select distinct h.id, h.business_number, h.legacy_number, f.address
  from public.households h
  join public.families f on f.household_id = h.id
  where public.is_admin()
    and (h.business_number::text = btrim(p_query)
      or h.legacy_number::text = btrim(p_query)
      or unaccent(lower(f.address)) like unaccent(lower(btrim(p_query))) || '%'
      or exists (select 1 from public.members m where m.family_id = f.id and unaccent(lower(m.full_name)) like unaccent(lower(btrim(p_query))) || '%'))
  order by business_number
  limit 50;
$$;

revoke all on all tables in schema public from anon, authenticated;
grant execute on function public.search_households(text), public.reserve_registration(uuid, date, public.ceremony_period, smallint) to authenticated;

alter table public.pagodas enable row level security;
alter table public.admin_users enable row level security;
alter table public.number_counter enable row level security;
alter table public.households enable row level security;
alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.prayer_profiles enable row level security;
alter table public.prayer_people enable row level security;
alter table public.ceremony_slots enable row level security;
alter table public.registrations enable row level security;
alter table public.audit_events enable row level security;

create policy admin_read_pagodas on public.pagodas for select to authenticated using (public.is_admin());
create policy admin_read_households on public.households for select to authenticated using (public.is_admin());
create policy admin_read_families on public.families for select to authenticated using (public.is_admin());
create policy admin_read_members on public.members for select to authenticated using (public.is_admin());
create policy admin_read_profiles on public.prayer_profiles for select to authenticated using (public.is_admin());
create policy admin_read_people on public.prayer_people for select to authenticated using (public.is_admin());
create policy admin_read_slots on public.ceremony_slots for select to authenticated using (public.is_admin());
create policy admin_read_registrations on public.registrations for select to authenticated using (public.is_admin());
create policy admin_read_audit on public.audit_events for select to authenticated using (public.is_admin());
