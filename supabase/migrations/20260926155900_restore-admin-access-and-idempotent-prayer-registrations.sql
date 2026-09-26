-- Restore explicit administrator authorization and make owner/year prayer
-- registration creation safe to retry. Apply only after a schema and data backup.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

do $$
begin
  if exists (
    select 1
    from public.prayer_profiles
    where type = 'wellbeing'
    group by household_id
    having count(*) > 1
  ) or exists (
    select 1
    from public.prayer_profiles
    where type = 'memorial' and deceased_person_id is not null
    group by deceased_person_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate prayer profiles require manual consolidation before idempotency constraints can be added';
  end if;
end;
$$;

create unique index if not exists prayer_profiles_wellbeing_household_unique
  on public.prayer_profiles (household_id)
  where type = 'wellbeing';

create unique index if not exists prayer_profiles_memorial_deceased_unique
  on public.prayer_profiles (deceased_person_id)
  where type = 'memorial' and deceased_person_id is not null;

create or replace function public.reserve_registration(
  p_profile_id uuid,
  p_date date,
  p_period public.ceremony_period,
  p_year smallint
)
returns public.registrations
language plpgsql
security definer
set search_path = public
as $$
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
  if p_year <> extract(year from p_date)::smallint then raise exception 'Ceremony year must match the ceremony date'; end if;
  if profile_type = 'memorial' and p_period <> 'evening' then raise exception 'Memorial prayer is only available in the evening'; end if;

  perform pg_advisory_xact_lock(hashtext('registration:' || p_profile_id::text || ':' || p_year::text));
  select * into result
  from public.registrations
  where profile_id = p_profile_id and ceremony_year = p_year
  for update;

  if found then
    if result.ceremony_date = p_date and result.period = p_period and result.prayer_type = profile_type then
      return result;
    end if;
    raise exception 'Prayer profile is already registered for this ceremony year';
  end if;

  perform pg_advisory_xact_lock(hashtext('slot:' || p_date::text || ':' || p_period::text || ':' || profile_type::text));
  select * into slot
  from public.ceremony_slots
  where ceremony_date = p_date and period = p_period and prayer_type = profile_type
  for update;

  if not found then
    insert into public.ceremony_slots (ceremony_date, period, prayer_type)
    values (p_date, p_period, profile_type)
    returning * into slot;
  end if;

  select count(*) into active_count
  from public.registrations
  where ceremony_date = p_date and period = p_period and prayer_type = profile_type and status = 'active';

  if active_count >= slot.capacity then raise exception 'Ceremony slot is full'; end if;

  insert into public.registrations (profile_id, ceremony_date, period, prayer_type, ceremony_year)
  values (p_profile_id, p_date, p_period, profile_type, p_year)
  returning * into result;

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
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
  profile_created boolean := false;
  selected_count integer;
  distinct_count integer;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_member_ids is null or cardinality(p_member_ids) = 0 then raise exception 'Select at least one living member'; end if;

  select count(distinct selected.member_id) into distinct_count
  from unnest(p_member_ids) as selected(member_id);
  if cardinality(p_member_ids) <> distinct_count then raise exception 'Duplicate members are not allowed'; end if;

  select count(*) into selected_count
  from public.members m
  join public.families f on f.id = m.family_id
  where m.id = any(p_member_ids) and f.household_id = p_household_id;
  if selected_count <> cardinality(p_member_ids) then raise exception 'Every selected member must belong to this household'; end if;

  insert into public.prayer_profiles (household_id, type)
  values (p_household_id, 'wellbeing')
  on conflict do nothing
  returning id into profile_id;

  profile_created := profile_id is not null;
  if not profile_created then
    select id into profile_id
    from public.prayer_profiles
    where household_id = p_household_id and type = 'wellbeing';
  end if;

  if profile_created then
    insert into public.prayer_people (profile_id, member_id, full_name, is_deceased, position)
    select profile_id, m.id, m.full_name, false, (row_number() over (order by array_position(p_member_ids, m.id)) - 1)::smallint
    from public.members m
    where m.id = any(p_member_ids);
  end if;

  perform public.reserve_registration(profile_id, p_ceremony_date, p_period, extract(year from p_ceremony_date)::smallint);
  return profile_id;
end;
$$;

create or replace function public.create_memorial_registration(
  p_deceased_person_id uuid,
  p_ceremony_date date,
  p_period public.ceremony_period
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
  profile_created boolean := false;
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
  on conflict do nothing
  returning id into profile_id;

  profile_created := profile_id is not null;
  if not profile_created then
    select id into profile_id
    from public.prayer_profiles
    where deceased_person_id = deceased.id and type = 'memorial';
  end if;

  if profile_created then
    insert into public.prayer_people (profile_id, deceased_person_id, full_name, is_deceased, position)
    values (profile_id, deceased.id, deceased.full_name, true, 0);
  end if;

  perform public.reserve_registration(profile_id, p_ceremony_date, p_period, extract(year from p_ceremony_date)::smallint);
  return profile_id;
end;
$$;

revoke all on function public.create_household_wellbeing_registration(uuid, uuid[], date, public.ceremony_period) from public, anon, authenticated;
revoke all on function public.create_memorial_registration(uuid, date, public.ceremony_period) from public, anon, authenticated;
revoke all on function public.reserve_registration(uuid, date, public.ceremony_period, smallint) from public, anon, authenticated;
grant execute on function public.create_household_wellbeing_registration(uuid, uuid[], date, public.ceremony_period) to authenticated;
grant execute on function public.create_memorial_registration(uuid, date, public.ceremony_period) to authenticated;
