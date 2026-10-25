begin;

select plan(16);

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

select * from finish();
rollback;
