create table public.deceased_people (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (btrim(code) <> ''),
  full_name text not null check (btrim(full_name) <> ''),
  dharma_name text,
  date_of_death date not null,
  recorded_by text not null check (btrim(recorded_by) <> ''),
  family_id uuid not null references public.families(id) on delete restrict,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prayer_people
  add column deceased_person_id uuid references public.deceased_people(id) on delete restrict;

create index deceased_people_family_idx on public.deceased_people (family_id);
create index deceased_people_search_idx on public.deceased_people (code, full_name);

create trigger deceased_people_updated_at
before update on public.deceased_people
for each row execute function public.set_updated_at();

create or replace function public.assert_profile_integrity()
returns trigger language plpgsql set search_path = public as $$
declare
  profile_type public.prayer_type;
  profile_family uuid;
  member_family uuid;
  deceased_family uuid;
begin
  select type, family_id into profile_type, profile_family from public.prayer_profiles where id = new.profile_id;
  if (profile_type = 'wellbeing') <> (not new.is_deceased) then raise exception 'Prayer-person life status conflicts with profile type'; end if;
  if new.member_id is not null then
    select family_id into member_family from public.members where id = new.member_id;
    if member_family <> profile_family then raise exception 'Living prayer person must be a member of the profile family'; end if;
  end if;
  if new.deceased_person_id is not null then
    if not new.is_deceased then raise exception 'Only deceased prayer people may reference the deceased-person catalog'; end if;
    select family_id into deceased_family from public.deceased_people where id = new.deceased_person_id;
    if deceased_family <> profile_family then raise exception 'Deceased prayer person must belong to the profile family'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.create_deceased_person(
  p_code text,
  p_full_name text,
  p_dharma_name text,
  p_date_of_death date,
  p_recorded_by text,
  p_household_business_number integer,
  p_family_business_number integer
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  target_family_id uuid;
  created_id uuid;
  normalized_code text := upper(btrim(p_code));
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if normalized_code = '' then raise exception 'Deceased-person code is required'; end if;
  if nullif(btrim(p_full_name), '') is null then raise exception 'Deceased-person full name is required'; end if;
  if p_date_of_death is null then raise exception 'Date of death is required'; end if;
  if nullif(btrim(p_recorded_by), '') is null then raise exception 'Recorded-by name is required'; end if;

  select f.id into target_family_id
  from public.families f
  join public.households h on h.id = f.household_id
  where h.business_number = p_household_business_number
    and f.business_number = p_family_business_number;
  if target_family_id is null then raise exception 'Household and family business numbers do not identify a family'; end if;

  insert into public.deceased_people (
    code, full_name, dharma_name, date_of_death, recorded_by, family_id, created_by_user_id
  ) values (
    normalized_code,
    upper(btrim(p_full_name)),
    nullif(upper(btrim(coalesce(p_dharma_name, ''))), ''),
    p_date_of_death,
    upper(btrim(p_recorded_by)),
    target_family_id,
    auth.uid()
  ) returning id into created_id;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  select auth.uid(), 'deceased_person_created', 'deceased_person', created_id, to_jsonb(dp)
  from public.deceased_people dp where dp.id = created_id;
  return created_id;
end;
$$;

create or replace function public.import_deceased_people(p_people jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  person jsonb;
  imported_count integer := 0;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if jsonb_typeof(p_people) <> 'array' or jsonb_array_length(p_people) = 0 then
    raise exception 'At least one deceased person is required';
  end if;

  for person in select value from jsonb_array_elements(p_people) loop
    if coalesce(person->>'householdReference', '') !~ '^\d{1,4}$' or coalesce(person->>'familyReference', '') !~ '^\d{1,4}$' then
      raise exception 'Household and family references must be 1–4 digit business numbers';
    end if;
    perform public.create_deceased_person(
      person->>'code',
      person->>'fullName',
      person->>'dharmaName',
      (person->>'dateOfDeath')::date,
      person->>'createdBy',
      (person->>'householdReference')::integer,
      (person->>'familyReference')::integer
    );
    imported_count := imported_count + 1;
  end loop;
  return imported_count;
end;
$$;

create or replace function public.list_deceased_people()
returns table(
  id uuid,
  code text,
  full_name text,
  dharma_name text,
  date_of_death date,
  recorded_by text,
  household_reference text,
  family_reference text
)
language sql stable security definer set search_path = public as $$
  select
    dp.id,
    dp.code,
    dp.full_name,
    dp.dharma_name,
    dp.date_of_death,
    dp.recorded_by,
    h.business_number::text,
    f.business_number::text
  from public.deceased_people dp
  join public.families f on f.id = dp.family_id
  join public.households h on h.id = f.household_id
  where public.is_admin()
  order by dp.code;
$$;

alter table public.deceased_people enable row level security;
create policy admin_read_deceased_people on public.deceased_people
for select to authenticated using (public.is_admin());

grant execute on function public.create_deceased_person(text, text, text, date, text, integer, integer) to authenticated;
grant execute on function public.import_deceased_people(jsonb) to authenticated;
grant execute on function public.list_deceased_people() to authenticated;
