-- Hương linh death dates keep lunar day/month/leap state only; ceremony dates stay unchanged.
-- Pre-apply: create and verify a backup. This destructive cutover intentionally refuses
-- any database that already has Hương linh rows; use an approved backfill instead.

begin;

lock table public.deceased_people in access exclusive mode;

do $$
begin
  if exists (select 1 from public.deceased_people) then
    raise exception 'Cannot remove date_of_death while deceased_people contains legacy rows';
  end if;
end;
$$;

alter table public.deceased_people
  add column death_lunar_day smallint not null,
  add column death_lunar_month smallint not null,
  add column death_lunar_is_leap boolean not null default false,
  add constraint deceased_people_death_lunar_day_check check (death_lunar_day between 1 and 30),
  add constraint deceased_people_death_lunar_month_check check (death_lunar_month between 1 and 12);

drop function if exists public.import_deceased_people(jsonb);
drop function if exists public.create_deceased_person(text, text, text, date, text, integer, integer);
drop function if exists public.list_deceased_people();

create function public.create_deceased_person(
  p_code text,
  p_full_name text,
  p_dharma_name text,
  p_death_lunar_day smallint,
  p_death_lunar_month smallint,
  p_death_lunar_is_leap boolean,
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
  if p_death_lunar_day is null or p_death_lunar_month is null
    or p_death_lunar_day not between 1 and 30
    or p_death_lunar_month not between 1 and 12
    or p_death_lunar_is_leap is null then
    raise exception 'Lunar death date is required';
  end if;
  if nullif(btrim(p_recorded_by), '') is null then raise exception 'Recorded-by name is required'; end if;
  if (p_household_business_number is null) <> (p_family_business_number is null) then raise exception 'Household and family references must be provided together'; end if;

  if p_household_business_number is not null then
    select f.id into target_family_id
    from public.families f join public.households h on h.id = f.household_id
    where h.business_number = p_household_business_number and f.business_number = p_family_business_number;
    if target_family_id is null then raise exception 'Household and family business numbers do not identify a family'; end if;
  end if;

  insert into public.deceased_people (
    code, full_name, dharma_name, death_lunar_day, death_lunar_month,
    death_lunar_is_leap, recorded_by, family_id, household_reference,
    family_reference, created_by_user_id
  ) values (
    normalized_code, upper(btrim(p_full_name)), nullif(upper(btrim(coalesce(p_dharma_name, ''))), ''),
    p_death_lunar_day, p_death_lunar_month, p_death_lunar_is_leap,
    upper(btrim(p_recorded_by)), target_family_id, p_household_business_number,
    p_family_business_number, auth.uid()
  ) returning id into created_id;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  select auth.uid(), 'deceased_person_created', 'deceased_person', created_id, to_jsonb(dp)
  from public.deceased_people dp where dp.id = created_id;
  return created_id;
end;
$$;

create function public.import_deceased_people(p_people jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  person jsonb;
  death_date jsonb;
  imported_count integer := 0;
  household_ref text;
  family_ref text;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if jsonb_typeof(p_people) <> 'array' or jsonb_array_length(p_people) = 0 then raise exception 'At least one deceased person is required'; end if;

  for person in select value from jsonb_array_elements(p_people) loop
    death_date := person->'dateOfDeath';
    if jsonb_typeof(death_date) <> 'object'
      or death_date ? 'year'
      or not coalesce((death_date->>'day') ~ '^\d{1,2}$', false)
      or not coalesce((death_date->>'month') ~ '^\d{1,2}$', false)
      or jsonb_typeof(death_date->'isLeap') <> 'boolean' then
      raise exception 'Lunar death date must include day, month, and isLeap';
    end if;

    household_ref := nullif(btrim(person->>'householdReference'), '');
    family_ref := nullif(btrim(person->>'familyReference'), '');
    if (household_ref is null) <> (family_ref is null) then raise exception 'Household and family references must be provided together'; end if;
    if (household_ref is not null and household_ref !~ '^\d{1,4}$') or (family_ref is not null and family_ref !~ '^\d{1,4}$') then raise exception 'Household and family references must be 1–4 digit business numbers'; end if;

    perform public.create_deceased_person(
      person->>'code', person->>'fullName', person->>'dharmaName',
      (death_date->>'day')::smallint, (death_date->>'month')::smallint,
      (death_date->>'isLeap')::boolean, person->>'createdBy',
      case when household_ref is null then null else household_ref::integer end,
      case when family_ref is null then null else family_ref::integer end
    );
    imported_count := imported_count + 1;
  end loop;
  return imported_count;
end;
$$;

create function public.list_deceased_people()
returns table(
  id uuid,
  code text,
  full_name text,
  dharma_name text,
  death_lunar_day smallint,
  death_lunar_month smallint,
  death_lunar_is_leap boolean,
  recorded_by text,
  household_reference text,
  family_reference text,
  prayer_history jsonb
)
language sql stable security definer set search_path = public as $$
  select dp.id, dp.code, dp.full_name, dp.dharma_name,
    dp.death_lunar_day, dp.death_lunar_month, dp.death_lunar_is_leap,
    dp.recorded_by,
    coalesce(dp.household_reference::text, h.business_number::text),
    coalesce(dp.family_reference::text, f.business_number::text),
    coalesce((select jsonb_agg(jsonb_build_object('date', r.ceremony_date, 'period', r.period) order by r.ceremony_date desc)
      from public.prayer_profiles pp join public.registrations r on r.profile_id = pp.id
      where pp.deceased_person_id = dp.id and r.status = 'active'), '[]'::jsonb)
  from public.deceased_people dp
  left join public.families f on f.id = dp.family_id
  left join public.households h on h.id = f.household_id
  where public.is_admin()
  order by dp.code;
$$;

create or replace function public.get_household_workspace(p_household_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select jsonb_build_object(
    'id', h.id,
    'businessNumber', h.business_number,
    'legacyNumber', h.legacy_number,
    'families', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'businessNumber', f.business_number,
        'address', f.address,
        'members', coalesce((select jsonb_agg(jsonb_build_object(
          'id', m.id, 'fullName', m.full_name, 'dharmaName', m.dharma_name, 'yearOfBirth', m.year_of_birth,
          'prayerHistory', coalesce((select jsonb_agg(jsonb_build_object('date', r.ceremony_date, 'period', r.period) order by r.ceremony_date desc)
            from public.prayer_people pp join public.prayer_profiles p on p.id = pp.profile_id join public.registrations r on r.profile_id = p.id
            where pp.member_id = m.id and r.status = 'active'), '[]'::jsonb)
        ) order by m.position) from public.members m where m.family_id = f.id), '[]'::jsonb),
        'deceasedPeople', coalesce((select jsonb_agg(jsonb_build_object(
          'id', dp.id, 'code', dp.code, 'fullName', dp.full_name, 'dharmaName', dp.dharma_name,
          'dateOfDeath', jsonb_build_object('day', dp.death_lunar_day, 'month', dp.death_lunar_month, 'isLeap', dp.death_lunar_is_leap),
          'prayerHistory', coalesce((select jsonb_agg(jsonb_build_object('date', r.ceremony_date, 'period', r.period) order by r.ceremony_date desc)
            from public.prayer_profiles p join public.registrations r on r.profile_id = p.id
            where p.deceased_person_id = dp.id and r.status = 'active'), '[]'::jsonb)
        ) order by dp.code) from public.deceased_people dp where dp.family_id = f.id), '[]'::jsonb)
      ) order by f.position) from public.families f where f.household_id = h.id
    ), '[]'::jsonb)
  ) into result from public.households h where h.id = p_household_id;
  if result is null then raise exception 'Household not found'; end if;
  return result;
end;
$$;

alter table public.deceased_people drop column date_of_death;

revoke all on function public.create_deceased_person(text, text, text, smallint, smallint, boolean, text, integer, integer) from public, anon, authenticated;
revoke all on function public.import_deceased_people(jsonb) from public, anon, authenticated;
revoke all on function public.list_deceased_people() from public, anon, authenticated;
revoke all on function public.get_household_workspace(uuid) from public, anon, authenticated;
grant execute on function public.create_deceased_person(text, text, text, smallint, smallint, boolean, text, integer, integer) to authenticated;
grant execute on function public.import_deceased_people(jsonb) to authenticated;
grant execute on function public.list_deceased_people() to authenticated;
grant execute on function public.get_household_workspace(uuid) to authenticated;

commit;
