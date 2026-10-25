begin;

alter function public.save_household_workspace(uuid, uuid, bigint, uuid, jsonb)
  rename to save_household_workspace_without_family_merge;
revoke all on function public.save_household_workspace_without_family_merge(uuid, uuid, bigint, uuid, jsonb)
  from public, anon, authenticated;

create function public.save_household_workspace(
  p_pagoda_id uuid,
  p_household_id uuid,
  p_expected_revision bigint,
  p_idempotency_key uuid,
  p_payload jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  operation jsonb;
  source_family_id uuid;
  target_family_id uuid;
  source_family public.families;
  target_family public.families;
begin
  -- The existing implementation owns revision, idempotency, and all member moves.
  -- A merge is finalized only after that implementation has accepted the complete draft.
  perform public.save_household_workspace_without_family_merge(
    p_pagoda_id, p_household_id, p_expected_revision, p_idempotency_key, p_payload
  );

  if coalesce(jsonb_typeof(p_payload -> 'mergeOperations'), 'null') not in ('null', 'array') then
    perform public.raise_household_error('INVALID_DRAFT');
  end if;

  for operation in select value from jsonb_array_elements(coalesce(p_payload -> 'mergeOperations', '[]'::jsonb)) loop
    begin
      source_family_id := (operation ->> 'sourceFamilyId')::uuid;
      target_family_id := (operation ->> 'targetFamilyId')::uuid;
    exception when others then
      perform public.raise_household_error('INVALID_DRAFT');
    end;
    if source_family_id = target_family_id then perform public.raise_household_error('INVALID_DRAFT'); end if;

    select * into source_family from public.families
    where id = source_family_id and pagoda_id = p_pagoda_id and household_id = p_household_id
    for update;
    select * into target_family from public.families
    where id = target_family_id and pagoda_id = p_pagoda_id and household_id = p_household_id
      and merged_into_family_id is null
    for update;
    if source_family.id is null or target_family.id is null then
      perform public.raise_household_error('DEPENDENT_REFERENCE');
    end if;
    if source_family.merged_into_family_id is null then
      if exists (select 1 from public.members where family_id = source_family.id) then
        perform public.raise_household_error('DEPENDENT_REFERENCE');
      end if;
      update public.families set merged_into_family_id = target_family.id, position = null where id = source_family.id;
    elsif source_family.merged_into_family_id <> target_family.id then
      perform public.raise_household_error('DEPENDENT_REFERENCE');
    end if;
  end loop;

  return public.household_workspace_json(p_pagoda_id, p_household_id);
end;
$$;

revoke all on function public.save_household_workspace(uuid, uuid, bigint, uuid, jsonb) from public, anon;
grant execute on function public.save_household_workspace(uuid, uuid, bigint, uuid, jsonb) to authenticated;

commit;
