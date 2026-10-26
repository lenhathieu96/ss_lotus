begin;

-- A nullable `member_id` is required by the historical snapshot reference:
-- deleting a member retains the immutable captured name/date instead of
-- rejecting the delete because the old composite primary key was NOT NULL.
alter table public.registration_people_snapshots
  drop constraint if exists registration_people_snapshots_pkey;
alter table public.registration_people_snapshots
  add column if not exists id uuid default gen_random_uuid();
update public.registration_people_snapshots
  set id = gen_random_uuid()
  where id is null;
alter table public.registration_people_snapshots
  alter column id set not null,
  alter column member_id drop not null;
alter table public.registration_people_snapshots
  add constraint registration_people_snapshots_pkey primary key (id);
create unique index if not exists registration_people_snapshots_member_revision_key
  on public.registration_people_snapshots (registration_id, booking_revision, member_id)
  where member_id is not null;

create or replace function public.save_household_workspace(
  p_pagoda_id uuid,
  p_household_id uuid,
  p_expected_revision bigint,
  p_idempotency_key uuid,
  p_payload jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  operation jsonb;
  source_family_id uuid;
  target_family_id uuid;
  source_family public.families;
  target_family public.families;
  request_hash text := md5(coalesce(p_payload::text, ''));
  existing_receipt public.household_mutation_receipts;
begin
  -- This guard is outermost so a retried request never replays its structure
  -- operations after the canonical save already persisted the receipt.
  if not public.has_pagoda_access(p_pagoda_id) then
    perform public.raise_household_error('AUTH_REQUIRED');
  end if;
  if p_idempotency_key is null then perform public.raise_household_error('INVALID_DRAFT'); end if;
  -- The legacy save routine takes this same transaction lock. Taking it before
  -- inspecting the receipt closes the race where two simultaneous retries both
  -- miss the receipt and the later call replays structure operations.
  perform pg_advisory_xact_lock(hashtext('household_save:' || auth.uid()::text || ':' || p_idempotency_key::text));
  select * into existing_receipt
  from public.household_mutation_receipts
  where pagoda_id = p_pagoda_id
    and actor_id = auth.uid()
    and operation = 'household_save'
    and request_key = p_idempotency_key;
  if found then
    if existing_receipt.request_hash <> request_hash then
      perform public.raise_household_error('REQUEST_REPLAY_MISMATCH');
    end if;
    return public.household_workspace_json(p_pagoda_id, existing_receipt.household_id);
  end if;

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
      where m.id = (operation ->> 'memberId')::uuid
        and m.family_id = f.id
        and f.pagoda_id = p_pagoda_id
        and f.household_id = p_household_id
        and f.merged_into_family_id is null;
      if not found then perform public.raise_household_error('DEPENDENT_REFERENCE'); end if;
    elsif operation ->> 'kind' = 'merge-family' then
      begin
        source_family_id := (operation ->> 'sourceFamilyId')::uuid;
        target_family_id := (operation ->> 'targetFamilyId')::uuid;
        if source_family_id is null or target_family_id is null or source_family_id = target_family_id then
          perform public.raise_household_error('INVALID_DRAFT');
        end if;
      exception when invalid_text_representation then
        perform public.raise_household_error('INVALID_DRAFT');
      end;

      select * into source_family from public.families
      where id = source_family_id
        and pagoda_id = p_pagoda_id
        and household_id = p_household_id
        and merged_into_family_id is null
      for update;
      select * into target_family from public.families
      where id = target_family_id
        and pagoda_id = p_pagoda_id
        and household_id = p_household_id
        and merged_into_family_id is null
      for update;
      if source_family.id is null or target_family.id is null then
        perform public.raise_household_error('DEPENDENT_REFERENCE');
      end if;

      update public.deceased_people
      set family_id = target_family.id
      where pagoda_id = p_pagoda_id and family_id = source_family.id;
      update public.families
      set merged_into_family_id = target_family.id, position = null
      where id = source_family.id;
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
