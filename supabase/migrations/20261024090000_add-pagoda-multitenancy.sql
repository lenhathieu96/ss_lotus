-- Multi-pagoda isolation. Take and restore-verify a schema/data backup before
-- applying this migration to a non-disposable database.
begin;

create type public.pagoda_role as enum ('owner', 'admin', 'staff');

create table public.pagodas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pagoda_memberships (
  pagoda_id uuid not null references public.pagodas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.pagoda_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (pagoda_id, user_id)
);
create index pagoda_memberships_user_idx on public.pagoda_memberships (user_id, pagoda_id);

create table public.pagoda_number_counters (
  pagoda_id uuid primary key references public.pagodas(id) on delete cascade,
  last_number integer not null default 0 check (last_number between 0 and 9999)
);

insert into public.pagodas (id, slug, name)
values ('00000000-0000-4000-8000-000000000001', 'legacy-ss-lotus', 'Chùa SS Lotus')
on conflict (id) do nothing;
insert into public.pagoda_number_counters (pagoda_id, last_number)
select '00000000-0000-4000-8000-000000000001', last_number from public.number_counter where singleton
on conflict (pagoda_id) do nothing;
insert into public.pagoda_memberships (pagoda_id, user_id, role)
select '00000000-0000-4000-8000-000000000001', user_id, 'owner'::public.pagoda_role from public.admin_users
on conflict do nothing;

alter table public.households add column pagoda_id uuid references public.pagodas(id);
alter table public.families add column pagoda_id uuid references public.pagodas(id);
alter table public.members add column pagoda_id uuid references public.pagodas(id);
alter table public.deceased_people add column pagoda_id uuid references public.pagodas(id);
alter table public.prayer_profiles add column pagoda_id uuid references public.pagodas(id);
alter table public.prayer_people add column pagoda_id uuid references public.pagodas(id);
alter table public.ceremony_slots add column pagoda_id uuid references public.pagodas(id);
alter table public.registrations add column pagoda_id uuid references public.pagodas(id);
alter table public.audit_events add column pagoda_id uuid references public.pagodas(id);

update public.households set pagoda_id = '00000000-0000-4000-8000-000000000001' where pagoda_id is null;
update public.families f set pagoda_id = h.pagoda_id from public.households h where h.id = f.household_id and f.pagoda_id is null;
update public.members m set pagoda_id = f.pagoda_id from public.families f where f.id = m.family_id and m.pagoda_id is null;
update public.deceased_people dp set pagoda_id = coalesce(f.pagoda_id, '00000000-0000-4000-8000-000000000001'::uuid) from public.families f where f.id = dp.family_id and dp.pagoda_id is null;
update public.deceased_people set pagoda_id = '00000000-0000-4000-8000-000000000001' where pagoda_id is null;
update public.prayer_profiles p set pagoda_id = coalesce(
  (select h.pagoda_id from public.households h where h.id = p.household_id),
  (select f.pagoda_id from public.families f where f.id = p.family_id),
  (select dp.pagoda_id from public.deceased_people dp where dp.id = p.deceased_person_id),
  '00000000-0000-4000-8000-000000000001'::uuid
) where p.pagoda_id is null;
update public.prayer_profiles set pagoda_id = '00000000-0000-4000-8000-000000000001' where pagoda_id is null;
update public.prayer_people pp set pagoda_id = p.pagoda_id from public.prayer_profiles p where p.id = pp.profile_id and pp.pagoda_id is null;
update public.registrations r set pagoda_id = p.pagoda_id from public.prayer_profiles p where p.id = r.profile_id and r.pagoda_id is null;
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
alter table public.audit_events alter column pagoda_id set not null;

alter table public.households drop constraint if exists households_business_number_key;
alter table public.households drop constraint if exists households_legacy_number_key;
alter table public.families drop constraint if exists families_business_number_key;
alter table public.deceased_people drop constraint if exists deceased_people_code_key;
alter table public.ceremony_slots drop constraint if exists ceremony_slots_pkey cascade;
alter table public.ceremony_slots add primary key (pagoda_id, ceremony_date, period, prayer_type);
alter table public.registrations add constraint registrations_pagoda_slot_fkey foreign key (pagoda_id, ceremony_date, period, prayer_type)
  references public.ceremony_slots (pagoda_id, ceremony_date, period, prayer_type);
alter table public.households add constraint households_pagoda_business_number_key unique (pagoda_id, business_number);
alter table public.households add constraint households_pagoda_legacy_number_key unique (pagoda_id, legacy_number);
alter table public.families add constraint families_pagoda_business_number_key unique (pagoda_id, business_number);
alter table public.deceased_people add constraint deceased_people_pagoda_code_key unique (pagoda_id, code);
create index registrations_pagoda_slot_idx on public.registrations (pagoda_id, ceremony_date, period) where status = 'active';
create index deceased_people_pagoda_idx on public.deceased_people (pagoda_id, code);

create or replace function public.is_pagoda_member(p_pagoda_id uuid, p_roles public.pagoda_role[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pagoda_memberships pm
    where pm.pagoda_id = p_pagoda_id and pm.user_id = auth.uid()
      and (p_roles is null or pm.role = any(p_roles))
  );
$$;

create or replace function public.require_pagoda_admin(p_pagoda_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_pagoda_member(p_pagoda_id, array['owner','admin']::public.pagoda_role[]) then
    raise exception 'Pagoda administrator access required';
  end if;
end;
$$;

create or replace function public.list_my_pagodas()
returns table(id uuid, slug text, name text, role public.pagoda_role)
language sql stable security definer set search_path = public as $$
  select p.id, p.slug, p.name, pm.role from public.pagodas p
  join public.pagoda_memberships pm on pm.pagoda_id = p.id
  where pm.user_id = auth.uid() order by p.name;
$$;

drop policy if exists admin_read_households on public.households;
drop policy if exists admin_read_families on public.families;
drop policy if exists admin_read_members on public.members;
drop policy if exists admin_read_profiles on public.prayer_profiles;
drop policy if exists admin_read_people on public.prayer_people;
drop policy if exists admin_read_slots on public.ceremony_slots;
drop policy if exists admin_read_registrations on public.registrations;
drop policy if exists admin_read_audit on public.audit_events;
create policy pagoda_read_households on public.households for select to authenticated using (public.is_pagoda_member(pagoda_id));
create policy pagoda_read_families on public.families for select to authenticated using (public.is_pagoda_member(pagoda_id));
create policy pagoda_read_members on public.members for select to authenticated using (public.is_pagoda_member(pagoda_id));
create policy pagoda_read_profiles on public.prayer_profiles for select to authenticated using (public.is_pagoda_member(pagoda_id));
create policy pagoda_read_people on public.prayer_people for select to authenticated using (public.is_pagoda_member(pagoda_id));
create policy pagoda_read_slots on public.ceremony_slots for select to authenticated using (public.is_pagoda_member(pagoda_id));
create policy pagoda_read_registrations on public.registrations for select to authenticated using (public.is_pagoda_member(pagoda_id));
create policy pagoda_read_audit on public.audit_events for select to authenticated using (public.is_pagoda_member(pagoda_id));
alter table public.pagodas enable row level security;
alter table public.pagoda_memberships enable row level security;
alter table public.pagoda_number_counters enable row level security;
create policy pagoda_members_can_read_pagodas on public.pagodas for select to authenticated using (public.is_pagoda_member(id));
create policy users_can_read_own_pagoda_memberships on public.pagoda_memberships for select to authenticated using (user_id = auth.uid());

drop function if exists public.search_households(text);
create function public.search_households(p_pagoda_id uuid, p_query text)
returns table(id uuid, business_number integer, legacy_number integer, address text)
language sql stable security definer set search_path = public as $$
  select distinct h.id, h.business_number, h.legacy_number, f.address
  from public.households h join public.families f on f.household_id = h.id
  where public.is_pagoda_member(p_pagoda_id) and h.pagoda_id = p_pagoda_id and f.pagoda_id = p_pagoda_id
    and (h.business_number::text = btrim(p_query) or h.legacy_number::text = btrim(p_query)
      or unaccent(lower(f.address)) like unaccent(lower(btrim(p_query))) || '%'
      or exists (select 1 from public.members m where m.family_id = f.id and m.pagoda_id = p_pagoda_id and unaccent(lower(m.full_name)) like unaccent(lower(btrim(p_query))) || '%'))
  order by business_number limit 50;
$$;

drop function if exists public.create_household(integer, jsonb);
create function public.create_household(p_pagoda_id uuid, p_legacy_number integer, p_families jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare family_input jsonb; member_input jsonb; household_id uuid; family_id uuid; household_number integer; next_number integer; family_position smallint := 0; member_position smallint; family_count integer; result jsonb;
begin
  perform public.require_pagoda_admin(p_pagoda_id);
  if p_families is null or jsonb_typeof(p_families) <> 'array' or jsonb_array_length(p_families) = 0 then raise exception 'At least one family is required'; end if;
  if p_legacy_number is not null and p_legacy_number not between 1 and 9999 then raise exception 'Legacy household number must be between 1 and 9999'; end if;
  select last_number into next_number from public.pagoda_number_counters where pagoda_id = p_pagoda_id for update;
  if next_number is null then raise exception 'Pagoda counter not found'; end if;
  family_count := jsonb_array_length(p_families); if next_number + family_count > 9999 then raise exception 'Household number capacity exhausted'; end if;
  household_number := next_number + 1;
  insert into public.households (pagoda_id, business_number, legacy_number) values (p_pagoda_id, household_number, p_legacy_number) returning id into household_id;
  for family_input in select value from jsonb_array_elements(p_families) loop
    if jsonb_typeof(family_input->'members') <> 'array' or jsonb_array_length(family_input->'members') = 0 or nullif(btrim(family_input->>'address'), '') is null then raise exception 'Each family requires an address and at least one member'; end if;
    family_position := family_position + 1;
    insert into public.families (pagoda_id, household_id, business_number, address, position) values (p_pagoda_id, household_id, household_number + family_position - 1, upper(btrim(family_input->>'address')), family_position) returning id into family_id;
    member_position := 0;
    for member_input in select value from jsonb_array_elements(family_input->'members') loop
      if nullif(btrim(member_input->>'fullName'), '') is null then raise exception 'Member name is required'; end if;
      member_position := member_position + 1;
      insert into public.members (pagoda_id, family_id, full_name, dharma_name, year_of_birth, position) values (p_pagoda_id, family_id, upper(btrim(member_input->>'fullName')), nullif(upper(btrim(member_input->>'dharmaName')), ''), case when nullif(member_input->>'yearOfBirth','') is null then null else (member_input->>'yearOfBirth')::smallint end, member_position);
    end loop;
  end loop;
  update public.pagoda_number_counters set last_number = household_number + family_count - 1 where pagoda_id = p_pagoda_id;
  select jsonb_build_object('id', h.id, 'businessNumber', h.business_number, 'legacyNumber', h.legacy_number, 'families', coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'businessNumber', f.business_number, 'address', f.address, 'members', (select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'fullName',m.full_name,'dharmaName',m.dharma_name,'yearOfBirth',m.year_of_birth) order by m.position),'[]'::jsonb) from public.members m where m.family_id=f.id and m.pagoda_id=p_pagoda_id)) order by f.position),'[]'::jsonb)) into result from public.households h left join public.families f on f.household_id=h.id and f.pagoda_id=p_pagoda_id where h.id=household_id and h.pagoda_id=p_pagoda_id group by h.id,h.business_number,h.legacy_number;
  insert into public.audit_events (pagoda_id, actor_id, action, entity_type, entity_id, after_state) values (p_pagoda_id, auth.uid(), 'household_created', 'household', household_id, result);
  return result;
end;
$$;

drop function if exists public.get_household_workspace(uuid);
create function public.get_household_workspace(p_pagoda_id uuid, p_household_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', h.id, 'businessNumber', h.business_number, 'legacyNumber', h.legacy_number, 'families', coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'businessNumber',f.business_number,'address',f.address,'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'fullName',m.full_name,'dharmaName',m.dharma_name,'yearOfBirth',m.year_of_birth,'prayerHistory',coalesce((select jsonb_agg(jsonb_build_object('date',r.ceremony_date,'period',r.period) order by r.ceremony_date desc) from public.prayer_people pp join public.prayer_profiles p on p.id=pp.profile_id join public.registrations r on r.profile_id=p.id where pp.member_id=m.id and p.pagoda_id=p_pagoda_id and r.status='active'),'[]'::jsonb)) order by m.position) from public.members m where m.family_id=f.id and m.pagoda_id=p_pagoda_id),'[]'::jsonb),'deceasedPeople',coalesce((select jsonb_agg(jsonb_build_object('id',dp.id,'code',dp.code,'fullName',dp.full_name,'dharmaName',dp.dharma_name,'dateOfDeath',jsonb_build_object('day',dp.death_lunar_day,'month',dp.death_lunar_month,'isLeap',dp.death_lunar_is_leap),'prayerHistory','[]'::jsonb) order by dp.code) from public.deceased_people dp where dp.family_id=f.id and dp.pagoda_id=p_pagoda_id),'[]'::jsonb)) order by f.position) from public.families f where f.household_id=h.id and f.pagoda_id=p_pagoda_id),'[]'::jsonb))
  from public.households h where public.is_pagoda_member(p_pagoda_id) and h.id=p_household_id and h.pagoda_id=p_pagoda_id;
$$;

drop function if exists public.create_deceased_person(text,text,text,smallint,smallint,boolean,text,integer,integer);
create function public.create_deceased_person(p_pagoda_id uuid, p_code text, p_full_name text, p_dharma_name text, p_death_lunar_day smallint, p_death_lunar_month smallint, p_death_lunar_is_leap boolean, p_recorded_by text, p_household_business_number integer, p_family_business_number integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_family_id uuid; created_id uuid; normalized_code text := upper(btrim(p_code));
begin
  perform public.require_pagoda_admin(p_pagoda_id);
  if normalized_code='' or nullif(btrim(p_full_name),'') is null or p_death_lunar_day not between 1 and 30 or p_death_lunar_month not between 1 and 12 or p_death_lunar_is_leap is null or nullif(btrim(p_recorded_by),'') is null then raise exception 'Invalid deceased-person data'; end if;
  if (p_household_business_number is null) <> (p_family_business_number is null) then raise exception 'Household and family references must be provided together'; end if;
  if p_household_business_number is not null then select f.id into target_family_id from public.families f join public.households h on h.id=f.household_id where h.pagoda_id=p_pagoda_id and f.pagoda_id=p_pagoda_id and h.business_number=p_household_business_number and f.business_number=p_family_business_number; if target_family_id is null then raise exception 'Household and family business numbers do not identify a family'; end if; end if;
  insert into public.deceased_people (pagoda_id,code,full_name,dharma_name,death_lunar_day,death_lunar_month,death_lunar_is_leap,recorded_by,family_id,household_reference,family_reference,created_by_user_id) values (p_pagoda_id,normalized_code,upper(btrim(p_full_name)),nullif(upper(btrim(coalesce(p_dharma_name,''))),''),p_death_lunar_day,p_death_lunar_month,p_death_lunar_is_leap,upper(btrim(p_recorded_by)),target_family_id,p_household_business_number,p_family_business_number,auth.uid()) returning id into created_id;
  insert into public.audit_events (pagoda_id,actor_id,action,entity_type,entity_id,after_state) select p_pagoda_id,auth.uid(),'deceased_person_created','deceased_person',created_id,to_jsonb(dp) from public.deceased_people dp where dp.id=created_id;
  return created_id;
end;
$$;

drop function if exists public.list_deceased_people();
create function public.list_deceased_people(p_pagoda_id uuid)
returns table(id uuid,code text,full_name text,dharma_name text,death_lunar_day smallint,death_lunar_month smallint,death_lunar_is_leap boolean,recorded_by text,household_reference text,family_reference text,prayer_history jsonb)
language sql stable security definer set search_path = public as $$
  select dp.id,dp.code,dp.full_name,dp.dharma_name,dp.death_lunar_day,dp.death_lunar_month,dp.death_lunar_is_leap,dp.recorded_by,coalesce(dp.household_reference::text,h.business_number::text),coalesce(dp.family_reference::text,f.business_number::text),'[]'::jsonb from public.deceased_people dp left join public.families f on f.id=dp.family_id left join public.households h on h.id=f.household_id where public.is_pagoda_member(p_pagoda_id) and dp.pagoda_id=p_pagoda_id order by dp.code;
$$;

drop function if exists public.import_deceased_people(jsonb);
create function public.import_deceased_people(p_pagoda_id uuid, p_people jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare person jsonb; death_date jsonb; imported_count integer:=0;
begin
  perform public.require_pagoda_admin(p_pagoda_id); if jsonb_typeof(p_people)<>'array' or jsonb_array_length(p_people)=0 then raise exception 'At least one deceased person is required'; end if;
  for person in select value from jsonb_array_elements(p_people) loop death_date:=person->'dateOfDeath'; perform public.create_deceased_person(p_pagoda_id,person->>'code',person->>'fullName',person->>'dharmaName',(death_date->>'day')::smallint,(death_date->>'month')::smallint,(death_date->>'isLeap')::boolean,person->>'createdBy',nullif(person->>'householdReference','')::integer,nullif(person->>'familyReference','')::integer); imported_count:=imported_count+1; end loop;
  return imported_count;
end;
$$;

drop function if exists public.update_deceased_person_association(uuid,integer,integer);
create function public.update_deceased_person_association(p_pagoda_id uuid,p_deceased_person_id uuid,p_household_business_number integer,p_family_business_number integer)
returns void language plpgsql security definer set search_path = public as $$
declare target_family uuid;
begin
  perform public.require_pagoda_admin(p_pagoda_id); if (p_household_business_number is null)<>(p_family_business_number is null) then raise exception 'Household and family references must be provided together'; end if;
  if p_household_business_number is not null then select f.id into target_family from public.families f join public.households h on h.id=f.household_id where h.pagoda_id=p_pagoda_id and f.pagoda_id=p_pagoda_id and h.business_number=p_household_business_number and f.business_number=p_family_business_number; if target_family is null then raise exception 'Household and family business numbers do not identify a family'; end if; end if;
  update public.deceased_people set family_id=target_family,household_reference=p_household_business_number,family_reference=p_family_business_number where id=p_deceased_person_id and pagoda_id=p_pagoda_id; if not found then raise exception 'Hương linh not found'; end if;
end;
$$;

drop function if exists public.reserve_registration(uuid,date,public.ceremony_period,smallint) cascade;
create function public.reserve_registration(p_pagoda_id uuid, p_profile_id uuid, p_date date, p_period public.ceremony_period, p_year smallint)
returns public.registrations language plpgsql security definer set search_path = public as $$
declare profile_type public.prayer_type; slot public.ceremony_slots; active_count integer; result public.registrations;
begin
  perform public.require_pagoda_admin(p_pagoda_id);
  select type into profile_type from public.prayer_profiles where id=p_profile_id and pagoda_id=p_pagoda_id;
  if profile_type is null then raise exception 'Prayer profile not found'; end if;
  if p_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ceremony date must be today or in the future'; end if;
  if profile_type='memorial' and p_period<>'evening' then raise exception 'Memorial prayer is only available in the evening'; end if;
  perform pg_advisory_xact_lock(hashtext(p_pagoda_id::text || ':' || p_date::text || ':' || p_period::text));
  select * into slot from public.ceremony_slots where pagoda_id=p_pagoda_id and ceremony_date=p_date and period=p_period and prayer_type=profile_type for update;
  if not found then insert into public.ceremony_slots (pagoda_id,ceremony_date,period,prayer_type) values (p_pagoda_id,p_date,p_period,profile_type) returning * into slot; end if;
  select count(*) into active_count from public.registrations where pagoda_id=p_pagoda_id and ceremony_date=p_date and period=p_period and status='active';
  if active_count >= slot.capacity then raise exception 'Ceremony slot is full'; end if;
  insert into public.registrations (pagoda_id,profile_id,ceremony_date,period,prayer_type,ceremony_year) values (p_pagoda_id,p_profile_id,p_date,p_period,profile_type,p_year) returning * into result;
  insert into public.audit_events (pagoda_id,actor_id,action,entity_type,entity_id,after_state) values (p_pagoda_id,auth.uid(),'registration_created','registration',result.id,to_jsonb(result));
  return result;
end;
$$;

drop function if exists public.create_household_wellbeing_registration(uuid,uuid[],date,public.ceremony_period);
create function public.create_household_wellbeing_registration(p_pagoda_id uuid,p_household_id uuid,p_member_ids uuid[],p_ceremony_date date,p_period public.ceremony_period)
returns uuid language plpgsql security definer set search_path = public as $$
declare profile_id uuid; selected_count integer; distinct_count integer;
begin
  perform public.require_pagoda_admin(p_pagoda_id);
  if p_member_ids is null or cardinality(p_member_ids)=0 then raise exception 'Select at least one living member'; end if;
  select count(distinct member_id) into distinct_count from unnest(p_member_ids) as selected(member_id);
  if cardinality(p_member_ids)<>distinct_count then raise exception 'Duplicate members are not allowed'; end if;
  select count(*) into selected_count from public.members m join public.families f on f.id=m.family_id where m.id=any(p_member_ids) and m.pagoda_id=p_pagoda_id and f.pagoda_id=p_pagoda_id and f.household_id=p_household_id;
  if selected_count<>cardinality(p_member_ids) or not exists (select 1 from public.households h where h.id=p_household_id and h.pagoda_id=p_pagoda_id) then raise exception 'Every selected member must belong to this household'; end if;
  insert into public.prayer_profiles (pagoda_id,household_id,type) values (p_pagoda_id,p_household_id,'wellbeing') returning id into profile_id;
  insert into public.prayer_people (pagoda_id,profile_id,member_id,full_name,is_deceased,position) select p_pagoda_id,profile_id,m.id,m.full_name,false,(row_number() over(order by array_position(p_member_ids,m.id))-1)::smallint from public.members m where m.id=any(p_member_ids) and m.pagoda_id=p_pagoda_id;
  perform public.reserve_registration(p_pagoda_id,profile_id,p_ceremony_date,p_period,extract(year from p_ceremony_date)::smallint);
  return profile_id;
end;
$$;

drop function if exists public.create_memorial_registration(uuid,date,public.ceremony_period);
create function public.create_memorial_registration(p_pagoda_id uuid,p_deceased_person_id uuid,p_ceremony_date date,p_period public.ceremony_period)
returns uuid language plpgsql security definer set search_path = public as $$
declare profile_id uuid; deceased public.deceased_people; deceased_household_id uuid;
begin
  perform public.require_pagoda_admin(p_pagoda_id);
  select * into deceased from public.deceased_people where id=p_deceased_person_id and pagoda_id=p_pagoda_id;
  if not found then raise exception 'Hương linh not found'; end if;
  select household_id into deceased_household_id from public.families where id=deceased.family_id and pagoda_id=p_pagoda_id;
  insert into public.prayer_profiles (pagoda_id,family_id,household_id,deceased_person_id,type) values (p_pagoda_id,deceased.family_id,deceased_household_id,deceased.id,'memorial') returning id into profile_id;
  insert into public.prayer_people (pagoda_id,profile_id,deceased_person_id,full_name,is_deceased,position) values (p_pagoda_id,profile_id,deceased.id,deceased.full_name,true,0);
  perform public.reserve_registration(p_pagoda_id,profile_id,p_ceremony_date,p_period,extract(year from p_ceremony_date)::smallint);
  return profile_id;
end;
$$;

revoke all on function public.is_pagoda_member(uuid,public.pagoda_role[]), public.require_pagoda_admin(uuid) from public;
revoke all on function public.list_my_pagodas(), public.search_households(uuid,text), public.create_household(uuid,integer,jsonb), public.get_household_workspace(uuid,uuid), public.create_deceased_person(uuid,text,text,text,smallint,smallint,boolean,text,integer,integer), public.list_deceased_people(uuid), public.import_deceased_people(uuid,jsonb), public.update_deceased_person_association(uuid,uuid,integer,integer), public.reserve_registration(uuid,uuid,date,public.ceremony_period,smallint), public.create_household_wellbeing_registration(uuid,uuid,uuid[],date,public.ceremony_period), public.create_memorial_registration(uuid,uuid,date,public.ceremony_period) from public, anon, authenticated;
grant execute on function public.list_my_pagodas(), public.search_households(uuid,text), public.create_household(uuid,integer,jsonb), public.get_household_workspace(uuid,uuid), public.create_deceased_person(uuid,text,text,text,smallint,smallint,boolean,text,integer,integer), public.list_deceased_people(uuid), public.import_deceased_people(uuid,jsonb), public.update_deceased_person_association(uuid,uuid,integer,integer), public.create_household_wellbeing_registration(uuid,uuid,uuid[],date,public.ceremony_period), public.create_memorial_registration(uuid,uuid,date,public.ceremony_period) to authenticated;

commit;
