-- Household-wide Cầu an and individual Hương linh Cầu siêu registrations.
-- Pre-apply: create and verify a schema + public data backup.

alter table public.prayer_profiles
  alter column family_id drop not null,
  add column household_id uuid references public.households(id) on delete set null,
  add column deceased_person_id uuid references public.deceased_people(id) on delete restrict;

update public.prayer_profiles p
set household_id = f.household_id
from public.families f
where p.family_id = f.id and p.household_id is null;

alter table public.prayer_profiles drop constraint if exists prayer_profiles_family_id_type_key;
alter table public.prayer_profiles drop constraint if exists prayer_profiles_check;
alter table public.prayer_profiles
  add constraint prayer_profiles_owner_type_check check (
    (type = 'wellbeing' and household_id is not null and deceased_person_id is null and representative_member_id is null)
    or (type = 'memorial' and deceased_person_id is not null and representative_member_id is null)
    or (type = 'memorial' and deceased_person_id is null and family_id is not null and representative_member_id is not null)
  );

alter table public.ceremony_slots drop constraint if exists ceremony_slots_check;

create index prayer_profiles_household_idx on public.prayer_profiles (household_id) where household_id is not null;
create index prayer_profiles_deceased_person_idx on public.prayer_profiles (deceased_person_id) where deceased_person_id is not null;

create or replace function public.assert_profile_integrity()
returns trigger language plpgsql set search_path = public as $$
declare
  profile_type public.prayer_type;
  profile_family uuid;
  profile_household uuid;
  profile_deceased uuid;
  member_household uuid;
  deceased_family uuid;
begin
  select type, family_id, household_id, deceased_person_id
    into profile_type, profile_family, profile_household, profile_deceased
  from public.prayer_profiles where id = new.profile_id;
  if (profile_type = 'wellbeing') <> (not new.is_deceased) then raise exception 'Prayer-person life status conflicts with profile type'; end if;
  if new.member_id is not null then
    select f.household_id into member_household
    from public.members m join public.families f on f.id = m.family_id
    where m.id = new.member_id;
    if member_household is distinct from profile_household then raise exception 'Living prayer person must belong to the profile household'; end if;
  end if;
  if new.deceased_person_id is not null then
    if not new.is_deceased then raise exception 'Only deceased prayer people may reference the deceased-person catalog'; end if;
    if profile_deceased is not null and new.deceased_person_id <> profile_deceased then raise exception 'Deceased prayer person conflicts with the profile'; end if;
    select family_id into deceased_family from public.deceased_people where id = new.deceased_person_id;
    if profile_deceased is null and deceased_family is not null and deceased_family is distinct from profile_family then raise exception 'Deceased prayer person must belong to the profile family'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.assert_memorial_representative()
returns trigger language plpgsql set search_path = public as $$
declare member_family uuid;
begin
  if new.type = 'memorial' and new.representative_member_id is not null then
    select family_id into member_family from public.members where id = new.representative_member_id;
    if member_family is distinct from new.family_id then raise exception 'Memorial representative must belong to the family'; end if;
  end if;
  return new;
end;
$$;

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
  if p_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ceremony date must be today or in the future'; end if;
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

create or replace function public.create_household_wellbeing_registration(
  p_household_id uuid,
  p_member_ids uuid[],
  p_ceremony_date date,
  p_period public.ceremony_period
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  profile_id uuid;
  selected_count integer;
  distinct_count integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_member_ids is null or cardinality(p_member_ids) = 0 then raise exception 'Select at least one living member'; end if;
  select count(distinct selected.member_id) into distinct_count from unnest(p_member_ids) as selected(member_id);
  if cardinality(p_member_ids) <> distinct_count then raise exception 'Duplicate members are not allowed'; end if;
  select count(*) into selected_count
  from public.members m join public.families f on f.id = m.family_id
  where m.id = any(p_member_ids) and f.household_id = p_household_id;
  if selected_count <> cardinality(p_member_ids) then raise exception 'Every selected member must belong to this household'; end if;

  insert into public.prayer_profiles (household_id, type)
  values (p_household_id, 'wellbeing') returning id into profile_id;
  insert into public.prayer_people (profile_id, member_id, full_name, is_deceased, position)
  select profile_id, m.id, m.full_name, false, (row_number() over (order by array_position(p_member_ids, m.id)) - 1)::smallint
  from public.members m where m.id = any(p_member_ids);
  perform public.reserve_registration(profile_id, p_ceremony_date, p_period, extract(year from p_ceremony_date)::smallint);
  return profile_id;
end;
$$;

create or replace function public.create_memorial_registration(
  p_deceased_person_id uuid,
  p_ceremony_date date,
  p_period public.ceremony_period
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  profile_id uuid;
  deceased public.deceased_people;
  deceased_household_id uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select * into deceased from public.deceased_people where id = p_deceased_person_id;
  if not found then raise exception 'Hương linh not found'; end if;
  if deceased.family_id is not null then
    select household_id into deceased_household_id from public.families where id = deceased.family_id;
  end if;
  insert into public.prayer_profiles (family_id, household_id, deceased_person_id, type)
  values (deceased.family_id, deceased_household_id, deceased.id, 'memorial')
  returning id into profile_id;
  insert into public.prayer_people (profile_id, deceased_person_id, full_name, is_deceased, position)
  values (profile_id, deceased.id, deceased.full_name, true, 0);
  perform public.reserve_registration(profile_id, p_ceremony_date, p_period, extract(year from p_ceremony_date)::smallint);
  return profile_id;
end;
$$;

create or replace function public.update_deceased_person_association(
  p_deceased_person_id uuid,
  p_household_business_number integer,
  p_family_business_number integer
)
returns void language plpgsql security definer set search_path = public as $$
declare
  before_row public.deceased_people;
  target_family uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if (p_household_business_number is null) <> (p_family_business_number is null) then raise exception 'Household and family references must be provided together'; end if;
  select * into before_row from public.deceased_people where id = p_deceased_person_id for update;
  if not found then raise exception 'Hương linh not found'; end if;
  if p_household_business_number is not null then
    select f.id into target_family from public.families f join public.households h on h.id = f.household_id
    where h.business_number = p_household_business_number and f.business_number = p_family_business_number;
    if target_family is null then raise exception 'Household and family business numbers do not identify a family'; end if;
  end if;
  update public.deceased_people
  set family_id = target_family, household_reference = p_household_business_number, family_reference = p_family_business_number
  where id = p_deceased_person_id;
  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_state, after_state)
  select auth.uid(), 'deceased_person_association_updated', 'deceased_person', p_deceased_person_id, to_jsonb(before_row), to_jsonb(after_row)
  from public.deceased_people after_row where after_row.id = p_deceased_person_id;
end;
$$;

drop function if exists public.list_deceased_people();
create function public.list_deceased_people()
returns table(id uuid, code text, full_name text, dharma_name text, date_of_death date, recorded_by text, household_reference text, family_reference text, prayer_history jsonb)
language sql stable security definer set search_path = public as $$
  select dp.id, dp.code, dp.full_name, dp.dharma_name, dp.date_of_death, dp.recorded_by,
    coalesce(dp.household_reference::text, h.business_number::text),
    coalesce(dp.family_reference::text, f.business_number::text),
    coalesce((select jsonb_agg(jsonb_build_object('date', r.ceremony_date, 'period', r.period) order by r.ceremony_date desc)
      from public.prayer_profiles pp join public.registrations r on r.profile_id = pp.id
      where pp.deceased_person_id = dp.id and r.status = 'active'), '[]'::jsonb)
  from public.deceased_people dp left join public.families f on f.id = dp.family_id left join public.households h on h.id = f.household_id
  where public.is_admin() order by dp.code;
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
          'id', dp.id, 'code', dp.code, 'fullName', dp.full_name, 'dharmaName', dp.dharma_name, 'dateOfDeath', dp.date_of_death,
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

revoke all on function public.list_deceased_people() from public, anon, authenticated;
revoke all on function public.create_household_wellbeing_registration(uuid, uuid[], date, public.ceremony_period) from public, anon, authenticated;
revoke all on function public.create_memorial_registration(uuid, date, public.ceremony_period) from public, anon, authenticated;
revoke all on function public.update_deceased_person_association(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.get_household_workspace(uuid) from public, anon, authenticated;
grant execute on function public.list_deceased_people() to authenticated;
grant execute on function public.create_household_wellbeing_registration(uuid, uuid[], date, public.ceremony_period) to authenticated;
grant execute on function public.create_memorial_registration(uuid, date, public.ceremony_period) to authenticated;
grant execute on function public.update_deceased_person_association(uuid, integer, integer) to authenticated;
grant execute on function public.get_household_workspace(uuid) to authenticated;
