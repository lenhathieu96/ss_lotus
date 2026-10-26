begin;

select plan(22);

select has_table('public', 'wellbeing_seasons', 'Cầu An seasons are persisted as tenant metadata');
select has_table('public', 'household_mutation_receipts', 'Idempotency receipts are private rows');
select has_table('public', 'registration_people_snapshots', 'Booking participant snapshots are immutable rows');
select has_column('public', 'households', 'workspace_revision', 'Households have an optimistic-concurrency revision');
select has_column('public', 'families', 'merged_into_family_id', 'Merged family identities can be retained');
select has_column('public', 'registrations', 'booking_revision', 'Registration booking history is versioned');
select has_function('public', 'search_households_v2', array['uuid', 'text', 'integer'], 'Search v2 is tenant-aware');
select has_function('public', 'get_household_workspace_v2', array['uuid', 'uuid'], 'Workspace v2 is tenant-aware');
select has_function('public', 'create_household_v2', array['uuid', 'uuid', 'jsonb'], 'Create v2 supports idempotency');
select has_function('public', 'save_household_workspace', array['uuid', 'uuid', 'bigint', 'uuid', 'jsonb'], 'Save v2 supports revision and idempotency');
select has_function('public', 'get_wellbeing_season_availability', array['uuid'], 'Availability resolves on the server');
select has_function('public', 'book_household_wellbeing_slot', array['uuid', 'uuid', 'bigint', 'text', 'uuid'], 'Booking v2 is atomic');
select col_not_null('public', 'households', 'workspace_revision', 'Every workspace has a revision');
select col_not_null('public', 'registrations', 'booking_revision', 'Every booking has a revision');
select ok(not has_table_privilege('authenticated', 'public.household_mutation_receipts', 'select'), 'Browser users cannot read idempotency receipts');
select ok(not has_table_privilege('authenticated', 'public.registration_people_snapshots', 'insert'), 'Browser users cannot write booking snapshots');
select ok(
  (select not attnotnull from pg_attribute
   where attrelid = 'public.registration_people_snapshots'::regclass and attname = 'member_id'),
  'Snapshot member references can be cleared when a member is deleted'
);
select ok(
  exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.registration_people_snapshots'::regclass
      and c.contype = 'p'
      and c.conkey @> array[(select attnum from pg_attribute where attrelid = c.conrelid and attname = 'id')]
  ),
  'Snapshots use an independent primary key'
);
select ok(
  not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.registration_people_snapshots'::regclass
      and c.contype = 'p'
      and c.conkey @> array[(select attnum from pg_attribute where attrelid = c.conrelid and attname = 'member_id')]
  ),
  'Snapshot member reference is not part of its primary key'
);
select ok(
  position('target_family_id' in pg_get_functiondef('public.save_household_workspace(uuid,uuid,bigint,uuid,jsonb)'::regprocedure)) > 0,
  'Workspace save validates merge targets before applying structure operations'
);
select ok(
  position('has_pagoda_access(p_pagoda_id)' in pg_get_functiondef('public.save_household_workspace(uuid,uuid,bigint,uuid,jsonb)'::regprocedure)) > 0
    and position('has_pagoda_access(p_pagoda_id)' in pg_get_functiondef('public.save_household_workspace(uuid,uuid,bigint,uuid,jsonb)'::regprocedure))
      < position('from public.household_mutation_receipts' in pg_get_functiondef('public.save_household_workspace(uuid,uuid,bigint,uuid,jsonb)'::regprocedure)),
  'Workspace save authorizes pagoda access before replaying a receipt'
);
select ok(
  position('pg_advisory_xact_lock(hashtext(''household_save:''' in pg_get_functiondef('public.save_household_workspace(uuid,uuid,bigint,uuid,jsonb)'::regprocedure)) > 0
    and position('pg_advisory_xact_lock(hashtext(''household_save:''' in pg_get_functiondef('public.save_household_workspace(uuid,uuid,bigint,uuid,jsonb)'::regprocedure))
      < position('from public.household_mutation_receipts' in pg_get_functiondef('public.save_household_workspace(uuid,uuid,bigint,uuid,jsonb)'::regprocedure)),
  'Workspace save serializes retries before inspecting the receipt'
);

select * from finish();
rollback;
