-- Atomic administrator-only creation for the browser household editor.
-- Apply only after taking a schema backup.

create or replace function public.create_household(
  p_legacy_number integer,
  p_families jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if p_families is null or jsonb_typeof(p_families) <> 'array' or jsonb_array_length(p_families) = 0 then
    raise exception 'At least one family is required';
  end if;
  if p_legacy_number is not null and (p_legacy_number < 1 or p_legacy_number > 9999) then
    raise exception 'Legacy household number must be between 1 and 9999';
  end if;

  select last_number into next_number from public.number_counter where singleton = true for update;
  family_count := jsonb_array_length(p_families);
  if next_number + family_count > 9999 then
    raise exception 'Household number capacity exhausted';
  end if;
  household_number := next_number + 1;

  insert into public.households (business_number, legacy_number)
  values (household_number, p_legacy_number)
  returning id into household_id;

  for family_input in select value from jsonb_array_elements(p_families)
  loop
    if jsonb_typeof(family_input->'members') <> 'array' or jsonb_array_length(family_input->'members') = 0 then
      raise exception 'Each family must contain at least one member';
    end if;
    if nullif(btrim(family_input->>'address'), '') is null then
      raise exception 'Family address is required';
    end if;

    family_position := family_position + 1;
    insert into public.families (household_id, business_number, address, position)
    values (household_id, household_number + family_position - 1, upper(btrim(family_input->>'address')), family_position)
    returning id into family_id;

    member_position := 0;
    for member_input in select value from jsonb_array_elements(family_input->'members')
    loop
      if nullif(btrim(member_input->>'fullName'), '') is null then
        raise exception 'Member name is required';
      end if;
      member_position := member_position + 1;
      insert into public.members (family_id, full_name, dharma_name, year_of_birth, position)
      values (
        family_id,
        upper(btrim(member_input->>'fullName')),
        nullif(upper(btrim(member_input->>'dharmaName')), ''),
        case when nullif(member_input->>'yearOfBirth', '') is null then null else (member_input->>'yearOfBirth')::smallint end,
        member_position
      );
    end loop;
  end loop;

  update public.number_counter set last_number = household_number + family_count - 1 where singleton = true;

  select jsonb_build_object(
    'id', h.id,
    'businessNumber', h.business_number,
    'legacyNumber', h.legacy_number,
    'families', coalesce(jsonb_agg(jsonb_build_object(
      'id', f.id,
      'businessNumber', f.business_number,
      'address', f.address,
      'members', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', m.id,
          'fullName', m.full_name,
          'dharmaName', m.dharma_name,
          'yearOfBirth', m.year_of_birth
        ) order by m.position), '[]'::jsonb)
        from public.members m where m.family_id = f.id
      )
    ) order by f.position), '[]'::jsonb)
  ) into result
  from public.households h
  left join public.families f on f.household_id = h.id
  where h.id = household_id
  group by h.id, h.business_number, h.legacy_number;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, after_state)
  values (auth.uid(), 'household_created', 'household', household_id, result);

  return result;
end;
$$;

revoke all on function public.create_household(integer, jsonb) from public, anon, authenticated;
grant execute on function public.create_household(integer, jsonb) to authenticated;
