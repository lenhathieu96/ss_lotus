begin;

alter table public.members add column if not exists archived_at timestamptz;

create or replace function public.save_household_workspace(
  p_pagoda_id uuid,
  p_household_id uuid,
  p_expected_revision bigint,
  p_idempotency_key uuid,
  p_payload jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare operation jsonb; source_id uuid; target_id uuid;
begin
  -- Existing implementation owns revision, idempotency and canonical upserts.
  perform public.save_household_workspace_without_family_merge(
    p_pagoda_id, p_household_id, p_expected_revision, p_idempotency_key, p_payload
  );
  if coalesce(jsonb_typeof(p_payload -> 'operations'), 'array') <> 'array' then
    perform public.raise_household_error('INVALID_DRAFT');
  end if;
  for operation in select value from jsonb_array_elements(coalesce(p_payload -> 'operations', '[]'::jsonb)) loop
    if operation ->> 'kind' = 'archive-member' then
      update public.members m set archived_at = now()
      from public.families f
      where m.id = (operation ->> 'memberId')::uuid and m.family_id = f.id
        and f.pagoda_id = p_pagoda_id and f.household_id = p_household_id;
      if not found then perform public.raise_household_error('DEPENDENT_REFERENCE'); end if;
    elsif operation ->> 'kind' = 'merge-family' then
      source_id := (operation ->> 'sourceFamilyId')::uuid;
      target_id := (operation ->> 'targetFamilyId')::uuid;
      update public.deceased_people set family_id = target_id
      where pagoda_id = p_pagoda_id and family_id = source_id;
      delete from public.families f
      where f.id = source_id and f.pagoda_id = p_pagoda_id and f.household_id = p_household_id
        and not exists (select 1 from public.members m where m.family_id = f.id and m.archived_at is null);
      if not found then perform public.raise_household_error('DEPENDENT_REFERENCE'); end if;
    elsif operation ->> 'kind' <> 'split-family' then
      perform public.raise_household_error('INVALID_DRAFT');
    end if;
  end loop;
  return public.household_workspace_json(p_pagoda_id, p_household_id);
end;
$$;

revoke all on function public.save_household_workspace(uuid, uuid, bigint, uuid, jsonb) from public, anon;
grant execute on function public.save_household_workspace(uuid, uuid, bigint, uuid, jsonb) to authenticated;
commit;
