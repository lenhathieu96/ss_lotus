-- Cầu An household workspace. Apply only after the preflight backup/restore
-- gate described in plans/261025-0222-cau-an-household-api-integration.
begin;

alter table public.pagoda_number_counters
  drop constraint if exists pagoda_number_counters_last_number_check;
alter table public.pagoda_number_counters
  add constraint pagoda_number_counters_last_number_check
  check (last_number between 0 and 2147483647) not valid;
alter table public.pagoda_number_counters validate constraint pagoda_number_counters_last_number_check;
alter table public.households drop constraint if exists households_business_number_check;
alter table public.households drop constraint if exists households_legacy_number_check;
alter table public.households add constraint households_business_number_check check (business_number between 1 and 2147483647);
alter table public.households add constraint households_legacy_number_check check (legacy_number is null or legacy_number between 1 and 2147483647);
alter table public.families drop constraint if exists families_business_number_check;
alter table public.families add constraint families_business_number_check check (business_number between 1 and 2147483647);
alter table public.deceased_people drop constraint if exists deceased_people_household_reference_range;
alter table public.deceased_people drop constraint if exists deceased_people_family_reference_range;
alter table public.deceased_people add constraint deceased_people_household_reference_range check (household_reference is null or household_reference between 1 and 2147483647);
alter table public.deceased_people add constraint deceased_people_family_reference_range check (family_reference is null or family_reference between 1 and 2147483647);
update public.pagoda_number_counters counter
set last_number = greatest(counter.last_number, coalesce((
  select greatest(coalesce(max(h.business_number), 0), coalesce(max(f.business_number), 0))
  from public.households h left join public.families f on f.pagoda_id = h.pagoda_id
  where h.pagoda_id = counter.pagoda_id
), 0));

alter table public.households add column if not exists workspace_revision bigint not null default 0;
alter table public.members add column if not exists archived_at timestamptz;
alter table public.families add column if not exists merged_into_family_id uuid;
alter table public.families alter column position drop not null;
alter table public.families drop constraint if exists families_active_position_check;
alter table public.families add constraint families_active_position_check
  check ((merged_into_family_id is null and position is not null) or (merged_into_family_id is not null and position is null));
alter table public.families drop constraint if exists families_household_id_position_key;
alter table public.families add constraint families_household_id_position_key unique (household_id, position) deferrable initially immediate;
alter table public.members drop constraint if exists members_family_id_position_key;
alter table public.members add constraint members_family_id_position_key unique (family_id, position) deferrable initially immediate;

create table if not exists public.wellbeing_seasons (
  pagoda_id uuid not null references public.pagodas(id) on delete cascade,
  lunar_year smallint not null check (lunar_year between 1800 and 2199),
  lunar_jan_1 date not null,
  lunar_jan_15 date not null,
  created_at timestamptz not null default now(),
  primary key (pagoda_id, lunar_year),
  check (lunar_jan_15 = lunar_jan_1 + 14)
);
create table if not exists public.household_mutation_receipts (
  pagoda_id uuid not null references public.pagodas(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (operation in ('household_create', 'household_save', 'wellbeing_booking')),
  request_key uuid not null,
  request_hash text not null,
  household_id uuid references public.households(id) on delete set null,
  registration_id uuid references public.registrations(id) on delete set null,
  applied_revision bigint,
  created_at timestamptz not null default now(),
  primary key (pagoda_id, actor_id, operation, request_key)
);
create table if not exists public.registration_people_snapshots (
  registration_id uuid not null references public.registrations(id) on delete cascade,
  booking_revision integer not null check (booking_revision >= 1),
  member_id uuid references public.members(id) on delete set null,
  full_name text not null,
  solar_date date not null,
  period public.ceremony_period not null,
  provenance text not null check (provenance in ('legacy_profile_inferred', 'captured_at_booking')),
  completeness text not null check (completeness in ('unknown', 'complete')),
  captured_at timestamptz not null default now(),
  primary key (registration_id, booking_revision, member_id)
);
alter table public.registrations add column if not exists booking_revision integer not null default 1;
create unique index if not exists wellbeing_profile_per_household_idx
  on public.prayer_profiles (pagoda_id, household_id)
  where type = 'wellbeing' and household_id is not null;

alter table public.wellbeing_seasons enable row level security;
alter table public.household_mutation_receipts enable row level security;
alter table public.registration_people_snapshots enable row level security;
revoke all on table public.wellbeing_seasons, public.household_mutation_receipts, public.registration_people_snapshots from public, anon, authenticated;

-- Deployment is in the 2026 lunar-year horizon. Future seasons are explicit
-- metadata, never guessed from a Gregorian date in PostgreSQL.
insert into public.wellbeing_seasons (pagoda_id, lunar_year, lunar_jan_1, lunar_jan_15)
select p.id, season.lunar_year, season.lunar_jan_1, season.lunar_jan_15
from public.pagodas p cross join (values
  (2025::smallint, date '2025-01-29', date '2025-02-12'),
  (2026::smallint, date '2026-02-17', date '2026-03-03'),
  (2027::smallint, date '2027-02-06', date '2027-02-20')
) as season(lunar_year, lunar_jan_1, lunar_jan_15)
on conflict (pagoda_id, lunar_year) do nothing;

create or replace function public.raise_household_error(p_category text)
returns void language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = p_category,
    detail = json_build_object('category', p_category)::text;
end;
$$;

create or replace function public.household_workspace_json(p_pagoda_id uuid, p_household_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'id', h.id, 'businessNumber', h.business_number, 'legacyNumber', h.legacy_number,
    'revision', h.workspace_revision,
    'headMember', (
      select jsonb_build_object('id', m.id, 'fullName', m.full_name, 'dharmaName', m.dharma_name)
      from public.families f join public.members m on m.pagoda_id = f.pagoda_id and m.family_id = f.id
      where f.pagoda_id = p_pagoda_id and f.household_id = h.id and f.merged_into_family_id is null and m.archived_at is null
      order by f.position, f.id, m.position, m.id limit 1
    ),
    'wellbeingBooking', (
      select jsonb_build_object('slotId', r.ceremony_year::text || ':' || r.ceremony_date::text || ':' || r.period::text,
        'solarDate', r.ceremony_date, 'period', r.period, 'lunarYear', r.ceremony_year)
      from public.prayer_profiles pp join public.registrations r on r.pagoda_id = pp.pagoda_id and r.profile_id = pp.id
      where pp.pagoda_id = p_pagoda_id and pp.household_id = h.id and pp.type = 'wellbeing' and r.status = 'active'
      order by r.ceremony_year desc limit 1
    ),
    'families', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'businessNumber', f.business_number, 'address', f.address,
        'members', coalesce((select jsonb_agg(jsonb_build_object(
          'id', m.id, 'fullName', m.full_name, 'dharmaName', m.dharma_name, 'yearOfBirth', m.year_of_birth,
          'prayerHistory', coalesce((select jsonb_agg(jsonb_build_object('date', r.ceremony_date, 'period', r.period) order by r.ceremony_date desc)
            from public.registration_people_snapshots s join public.registrations r on r.id = s.registration_id
            where s.member_id = m.id and r.status = 'active'), '[]'::jsonb)
        ) order by m.position, m.id) from public.members m where m.pagoda_id = p_pagoda_id and m.family_id = f.id and m.archived_at is null), '[]'::jsonb),
        'deceasedPeople', coalesce((select jsonb_agg(jsonb_build_object(
          'id', d.id, 'code', d.code, 'fullName', d.full_name, 'dharmaName', d.dharma_name,
          'dateOfDeath', jsonb_build_object('day', d.death_lunar_day, 'month', d.death_lunar_month, 'isLeap', d.death_lunar_is_leap),
          'prayerHistory', coalesce((select jsonb_agg(jsonb_build_object('date', r.ceremony_date, 'period', r.period) order by r.ceremony_date desc)
            from public.prayer_profiles pp join public.registrations r on r.profile_id = pp.id
            where pp.deceased_person_id = d.id and r.status = 'active'), '[]'::jsonb)
        ) order by d.code) from public.deceased_people d where d.pagoda_id = p_pagoda_id and d.family_id = f.id), '[]'::jsonb)
      ) order by f.position, f.id)
      from public.families f where f.pagoda_id = p_pagoda_id and f.household_id = h.id and f.merged_into_family_id is null
    ), '[]'::jsonb)
  ) into result
  from public.households h where h.pagoda_id = p_pagoda_id and h.id = p_household_id;
  if result is null then perform public.raise_household_error('CROSS_PAGODA_OR_NOT_FOUND'); end if;
  return result;
end;
$$;

create or replace function public.get_household_workspace_v2(p_pagoda_id uuid, p_household_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_pagoda_access(p_pagoda_id) then perform public.raise_household_error('AUTH_REQUIRED'); end if;
  return public.household_workspace_json(p_pagoda_id, p_household_id);
end;
$$;

create or replace function public.search_households_v2(p_pagoda_id uuid, p_query text, p_limit integer default 50)
returns table(id uuid, business_number integer, legacy_number integer, addresses text[], family_count integer, member_count integer, head_member jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_pagoda_access(p_pagoda_id) then perform public.raise_household_error('AUTH_REQUIRED'); end if;
  if nullif(btrim(p_query), '') is null then return; end if;
  return query
  select h.id, h.business_number, h.legacy_number,
    array_agg(distinct f.address order by f.address), count(distinct f.id)::integer, count(m.id)::integer,
    (select jsonb_build_object('id', hm.id, 'fullName', hm.full_name, 'dharmaName', hm.dharma_name)
      from public.families hf join public.members hm on hm.pagoda_id = hf.pagoda_id and hm.family_id = hf.id
      where hf.pagoda_id = p_pagoda_id and hf.household_id = h.id and hf.merged_into_family_id is null and hm.archived_at is null
      order by hf.position, hf.id, hm.position, hm.id limit 1)
  from public.households h join public.families f on f.pagoda_id = h.pagoda_id and f.household_id = h.id and f.merged_into_family_id is null
    left join public.members m on m.pagoda_id = f.pagoda_id and m.family_id = f.id and m.archived_at is null
  where h.pagoda_id = p_pagoda_id and (
    h.business_number::text = btrim(p_query) or h.legacy_number::text = btrim(p_query) or f.business_number::text = btrim(p_query)
    or public.unaccent(lower(f.address)) like '%' || public.unaccent(lower(btrim(p_query))) || '%'
    or exists (select 1 from public.members sm where sm.pagoda_id = p_pagoda_id and sm.family_id = f.id and sm.archived_at is null and (public.unaccent(lower(sm.full_name)) like '%' || public.unaccent(lower(btrim(p_query))) || '%' or public.unaccent(lower(coalesce(sm.dharma_name, ''))) like '%' || public.unaccent(lower(btrim(p_query))) || '%'))
  ) group by h.id, h.business_number, h.legacy_number order by h.business_number limit least(greatest(coalesce(p_limit, 50), 1), 50);
end;
$$;

create or replace function public.create_household_v2(p_pagoda_id uuid, p_idempotency_key uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare f jsonb; m jsonb; v_household uuid; v_family uuid; v_last integer; v_household_number integer; v_family_position smallint := 0; v_member_position smallint; v_hash text := md5(coalesce(p_payload::text, '')); v_existing public.household_mutation_receipts;
begin
  if not public.has_pagoda_access(p_pagoda_id) then perform public.raise_household_error('AUTH_REQUIRED'); end if;
  if p_idempotency_key is null or jsonb_typeof(p_payload->'families') <> 'array' or jsonb_array_length(p_payload->'families') = 0 then perform public.raise_household_error('INVALID_DRAFT'); end if;
  perform pg_advisory_xact_lock(hashtext('household_create:' || auth.uid()::text || ':' || p_idempotency_key::text));
  select * into v_existing from public.household_mutation_receipts where pagoda_id = p_pagoda_id and actor_id = auth.uid() and operation = 'household_create' and request_key = p_idempotency_key;
  if found then if v_existing.request_hash <> v_hash then perform public.raise_household_error('REQUEST_REPLAY_MISMATCH'); end if; return public.household_workspace_json(p_pagoda_id, v_existing.household_id); end if;
  select last_number into v_last from public.pagoda_number_counters where pagoda_id = p_pagoda_id for update;
  if v_last is null or v_last + jsonb_array_length(p_payload->'families') > 2147483647 then perform public.raise_household_error('INVALID_DRAFT'); end if;
  v_household_number := v_last + 1;
  insert into public.households(pagoda_id, business_number, legacy_number) values(p_pagoda_id, v_household_number, nullif(p_payload->>'legacyNumber', '')::integer) returning id into v_household;
  for f in select value from jsonb_array_elements(p_payload->'families') loop
    if nullif(btrim(f->>'address'), '') is null or jsonb_typeof(f->'members') <> 'array' or jsonb_array_length(f->'members') = 0 then perform public.raise_household_error('INVALID_DRAFT'); end if;
    v_family_position := v_family_position + 1;
    insert into public.families(pagoda_id, household_id, business_number, address, position) values(p_pagoda_id, v_household, v_household_number + v_family_position - 1, upper(btrim(f->>'address')), v_family_position) returning id into v_family;
    v_member_position := 0;
    for m in select value from jsonb_array_elements(f->'members') loop
      if nullif(btrim(m->>'fullName'), '') is null then perform public.raise_household_error('INVALID_DRAFT'); end if;
      v_member_position := v_member_position + 1;
      insert into public.members(pagoda_id, family_id, full_name, dharma_name, year_of_birth, position) values(p_pagoda_id, v_family, upper(btrim(m->>'fullName')), nullif(upper(btrim(coalesce(m->>'dharmaName', ''))), ''), nullif(m->>'yearOfBirth', '')::smallint, v_member_position);
    end loop;
  end loop;
  update public.pagoda_number_counters set last_number = v_household_number + v_family_position - 1 where pagoda_id = p_pagoda_id;
  insert into public.household_mutation_receipts(pagoda_id, actor_id, operation, request_key, request_hash, household_id, applied_revision) values(p_pagoda_id, auth.uid(), 'household_create', p_idempotency_key, v_hash, v_household, 0);
  insert into public.audit_events(pagoda_id, scope, actor_id, action, entity_type, entity_id, after_state) values(p_pagoda_id, 'pagoda', auth.uid(), 'household_created_v2', 'household', v_household, public.household_workspace_json(p_pagoda_id, v_household));
  return public.household_workspace_json(p_pagoda_id, v_household);
end;
$$;

create or replace function public.save_household_workspace(p_pagoda_id uuid, p_household_id uuid, p_expected_revision bigint, p_idempotency_key uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare f jsonb; m jsonb; v_family uuid; v_member uuid; v_number integer; v_revision bigint; v_hash text := md5(coalesce(p_payload::text, '')); v_existing public.household_mutation_receipts;
begin
  if not public.has_pagoda_access(p_pagoda_id) then perform public.raise_household_error('AUTH_REQUIRED'); end if;
  if p_idempotency_key is null or jsonb_typeof(p_payload->'families') <> 'array' or jsonb_array_length(p_payload->'families') = 0 then perform public.raise_household_error('INVALID_DRAFT'); end if;
  perform pg_advisory_xact_lock(hashtext('household_save:' || auth.uid()::text || ':' || p_idempotency_key::text));
  select * into v_existing from public.household_mutation_receipts where pagoda_id = p_pagoda_id and actor_id = auth.uid() and operation = 'household_save' and request_key = p_idempotency_key;
  if found then if v_existing.request_hash <> v_hash then perform public.raise_household_error('REQUEST_REPLAY_MISMATCH'); end if; return public.household_workspace_json(p_pagoda_id, v_existing.household_id); end if;
  select workspace_revision into v_revision from public.households where pagoda_id = p_pagoda_id and id = p_household_id for update;
  if v_revision is null then perform public.raise_household_error('CROSS_PAGODA_OR_NOT_FOUND'); end if;
  if v_revision <> p_expected_revision then perform public.raise_household_error('REVISION_CONFLICT'); end if;
  set constraints families_household_id_position_key, members_family_id_position_key deferred;
  for f in select value from jsonb_array_elements(p_payload->'families') loop
    if nullif(btrim(f->>'address'), '') is null or jsonb_typeof(f->'members') <> 'array' or jsonb_array_length(f->'members') = 0 then perform public.raise_household_error('INVALID_DRAFT'); end if;
    if nullif(f->>'id', '') is not null then
      select id into v_family from public.families where pagoda_id = p_pagoda_id and household_id = p_household_id and id = (f->>'id')::uuid and merged_into_family_id is null for update;
      if v_family is null then perform public.raise_household_error('DEPENDENT_REFERENCE'); end if;
      update public.families set address = upper(btrim(f->>'address')), position = (f->>'position')::smallint where id = v_family;
    else
      select last_number + 1 into v_number from public.pagoda_number_counters where pagoda_id = p_pagoda_id for update;
      update public.pagoda_number_counters set last_number = v_number where pagoda_id = p_pagoda_id;
      insert into public.families(pagoda_id, household_id, business_number, address, position) values(p_pagoda_id, p_household_id, v_number, upper(btrim(f->>'address')), (f->>'position')::smallint) returning id into v_family;
    end if;
    for m in select value from jsonb_array_elements(f->'members') loop
      if nullif(btrim(m->>'fullName'), '') is null then perform public.raise_household_error('INVALID_DRAFT'); end if;
      if nullif(m->>'id', '') is not null then
        select member.id into v_member from public.members member join public.families family on family.id = member.family_id and family.pagoda_id = member.pagoda_id where member.pagoda_id = p_pagoda_id and member.id = (m->>'id')::uuid and family.household_id = p_household_id and family.merged_into_family_id is null for update;
        if v_member is null then perform public.raise_household_error('DEPENDENT_REFERENCE'); end if;
        update public.members set family_id = v_family, full_name = upper(btrim(m->>'fullName')), dharma_name = nullif(upper(btrim(coalesce(m->>'dharmaName', ''))), ''), year_of_birth = nullif(m->>'yearOfBirth', '')::smallint, position = (m->>'position')::smallint where id = v_member;
      else
        insert into public.members(pagoda_id, family_id, full_name, dharma_name, year_of_birth, position) values(p_pagoda_id, v_family, upper(btrim(m->>'fullName')), nullif(upper(btrim(coalesce(m->>'dharmaName', ''))), ''), nullif(m->>'yearOfBirth', '')::smallint, (m->>'position')::smallint);
      end if;
    end loop;
  end loop;
  update public.households set workspace_revision = workspace_revision + 1 where pagoda_id = p_pagoda_id and id = p_household_id returning workspace_revision into v_revision;
  insert into public.household_mutation_receipts(pagoda_id, actor_id, operation, request_key, request_hash, household_id, applied_revision) values(p_pagoda_id, auth.uid(), 'household_save', p_idempotency_key, v_hash, p_household_id, v_revision);
  insert into public.audit_events(pagoda_id, scope, actor_id, action, entity_type, entity_id, after_state) values(p_pagoda_id, 'pagoda', auth.uid(), 'household_saved_v2', 'household', p_household_id, public.household_workspace_json(p_pagoda_id, p_household_id));
  return public.household_workspace_json(p_pagoda_id, p_household_id);
end;
$$;

create or replace function public.get_wellbeing_season_availability(p_pagoda_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare season public.wellbeing_seasons; today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if not public.has_pagoda_access(p_pagoda_id) then perform public.raise_household_error('AUTH_REQUIRED'); end if;
  select * into season from public.wellbeing_seasons s where s.pagoda_id = p_pagoda_id and s.lunar_jan_15 >= today order by s.lunar_jan_1 limit 1;
  if season.pagoda_id is null then perform public.raise_household_error('SEASON_UNAVAILABLE'); end if;
  return jsonb_build_object('lunarYear', season.lunar_year, 'slots', coalesce((
    select jsonb_agg(jsonb_build_object('id', season.lunar_year::text || ':' || day.solar_date::text || ':' || p.period::text, 'solarDate', day.solar_date, 'lunarDay', day.lunar_day, 'period', p.period, 'capacity', 200, 'used', coalesce(used.count, 0), 'remaining', 200 - coalesce(used.count, 0), 'isPast', day.solar_date < today) order by day.solar_date, p.ordinal)
    from generate_series(0, 14) offset_days
    cross join lateral (select season.lunar_jan_1 + offset_days as solar_date, offset_days + 1 as lunar_day) day
    cross join (values ('morning'::public.ceremony_period, 1), ('afternoon'::public.ceremony_period, 2), ('evening'::public.ceremony_period, 3)) p(period, ordinal)
    left join lateral (select count(*)::integer from public.registrations r where r.pagoda_id = p_pagoda_id and r.prayer_type = 'wellbeing' and r.status = 'active' and r.ceremony_date = day.solar_date and r.period = p.period) used(count) on true
  ), '[]'::jsonb));
end;
$$;

create or replace function public.book_household_wellbeing_slot(p_pagoda_id uuid, p_household_id uuid, p_expected_revision bigint, p_slot_id text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare season public.wellbeing_seasons; v_parts text[]; v_date date; v_period public.ceremony_period; v_revision bigint; v_profile uuid; v_registration public.registrations; v_count integer; v_hash text := md5(p_slot_id); v_existing public.household_mutation_receipts;
begin
  if not public.has_pagoda_access(p_pagoda_id) then perform public.raise_household_error('AUTH_REQUIRED'); end if;
  if p_idempotency_key is null then perform public.raise_household_error('INVALID_DRAFT'); end if;
  perform pg_advisory_xact_lock(hashtext('wellbeing_booking:' || auth.uid()::text || ':' || p_idempotency_key::text));
  select * into v_existing from public.household_mutation_receipts where pagoda_id = p_pagoda_id and actor_id = auth.uid() and operation = 'wellbeing_booking' and request_key = p_idempotency_key;
  if found then if v_existing.request_hash <> v_hash then perform public.raise_household_error('REQUEST_REPLAY_MISMATCH'); end if; return public.household_workspace_json(p_pagoda_id, p_household_id); end if;
  select workspace_revision into v_revision from public.households where pagoda_id = p_pagoda_id and id = p_household_id for update;
  if v_revision is null then perform public.raise_household_error('CROSS_PAGODA_OR_NOT_FOUND'); end if;
  if v_revision <> p_expected_revision then perform public.raise_household_error('REVISION_CONFLICT'); end if;
  v_parts := string_to_array(p_slot_id, ':');
  if array_length(v_parts, 1) <> 3 then perform public.raise_household_error('INVALID_SLOT'); end if;
  begin v_date := v_parts[2]::date; v_period := v_parts[3]::public.ceremony_period; exception when others then perform public.raise_household_error('INVALID_SLOT'); end;
  select * into season from public.wellbeing_seasons where pagoda_id = p_pagoda_id and lunar_year = v_parts[1]::smallint and v_date between lunar_jan_1 and lunar_jan_15;
  if season.pagoda_id is null or v_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date then perform public.raise_household_error('INVALID_SLOT'); end if;
  insert into public.prayer_profiles(pagoda_id, household_id, type)
  values(p_pagoda_id, p_household_id, 'wellbeing')
  on conflict (pagoda_id, household_id) where type = 'wellbeing' and household_id is not null do nothing;
  select id into v_profile from public.prayer_profiles where pagoda_id = p_pagoda_id and household_id = p_household_id and type = 'wellbeing' order by created_at limit 1 for update;
  select * into v_registration from public.registrations where pagoda_id = p_pagoda_id and profile_id = v_profile and ceremony_year = season.lunar_year for update;
  perform pg_advisory_xact_lock(hashtext(p_pagoda_id::text || ':' || coalesce(v_registration.ceremony_date::text, v_date::text) || ':' || coalesce(v_registration.period::text, v_period::text) || ':wellbeing'));
  perform pg_advisory_xact_lock(hashtext(p_pagoda_id::text || ':' || v_date::text || ':' || v_period::text || ':wellbeing'));
  if v_registration.id is not null and v_registration.ceremony_date = v_date and v_registration.period = v_period and v_registration.status = 'active' then
    insert into public.household_mutation_receipts(pagoda_id, actor_id, operation, request_key, request_hash, household_id, registration_id, applied_revision) values(p_pagoda_id, auth.uid(), 'wellbeing_booking', p_idempotency_key, v_hash, p_household_id, v_registration.id, v_revision);
    return public.household_workspace_json(p_pagoda_id, p_household_id);
  end if;
  select count(*) into v_count from public.registrations r where r.pagoda_id = p_pagoda_id and r.ceremony_date = v_date and r.period = v_period and r.prayer_type = 'wellbeing' and r.status = 'active' and (v_registration.id is null or r.id <> v_registration.id);
  if v_count >= 200 then perform public.raise_household_error('SLOT_FULL'); end if;
  insert into public.ceremony_slots(pagoda_id, ceremony_date, period, prayer_type, capacity) values(p_pagoda_id, v_date, v_period, 'wellbeing', 200) on conflict (pagoda_id, ceremony_date, period, prayer_type) do update set capacity = 200;
  if v_registration.id is null then
    insert into public.registrations(pagoda_id, profile_id, ceremony_date, period, prayer_type, ceremony_year, status, booking_revision) values(p_pagoda_id, v_profile, v_date, v_period, 'wellbeing', season.lunar_year, 'active', 1) returning * into v_registration;
  else
    update public.registrations set ceremony_date = v_date, period = v_period, prayer_type = 'wellbeing', status = 'active', booking_revision = booking_revision + 1 where id = v_registration.id returning * into v_registration;
  end if;
  insert into public.registration_people_snapshots(registration_id, booking_revision, member_id, full_name, solar_date, period, provenance, completeness)
  select v_registration.id, v_registration.booking_revision, m.id, m.full_name, v_date, v_period, 'captured_at_booking', 'complete'
  from public.members m join public.families f on f.pagoda_id = m.pagoda_id and f.id = m.family_id where m.pagoda_id = p_pagoda_id and m.archived_at is null and f.household_id = p_household_id and f.merged_into_family_id is null;
  update public.households set workspace_revision = workspace_revision + 1 where pagoda_id = p_pagoda_id and id = p_household_id returning workspace_revision into v_revision;
  insert into public.household_mutation_receipts(pagoda_id, actor_id, operation, request_key, request_hash, household_id, registration_id, applied_revision) values(p_pagoda_id, auth.uid(), 'wellbeing_booking', p_idempotency_key, v_hash, p_household_id, v_registration.id, v_revision);
  insert into public.audit_events(pagoda_id, scope, actor_id, action, entity_type, entity_id, after_state) values(p_pagoda_id, 'pagoda', auth.uid(), 'wellbeing_booked_v2', 'registration', v_registration.id, to_jsonb(v_registration));
  return public.household_workspace_json(p_pagoda_id, p_household_id);
end;
$$;

revoke all on function public.raise_household_error(text), public.household_workspace_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_household_workspace_v2(uuid, uuid), public.search_households_v2(uuid, text, integer), public.create_household_v2(uuid, uuid, jsonb), public.save_household_workspace(uuid, uuid, bigint, uuid, jsonb), public.get_wellbeing_season_availability(uuid), public.book_household_wellbeing_slot(uuid, uuid, bigint, text, uuid) from public, anon;
grant execute on function public.get_household_workspace_v2(uuid, uuid), public.search_households_v2(uuid, text, integer), public.create_household_v2(uuid, uuid, jsonb), public.save_household_workspace(uuid, uuid, bigint, uuid, jsonb), public.get_wellbeing_season_availability(uuid), public.book_household_wellbeing_slot(uuid, uuid, bigint, text, uuid) to authenticated;
commit;
