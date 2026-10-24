begin;

select plan(21);

select has_table('public', 'pagodas', 'Pagodas are the tenant records');
select has_table('public', 'pagoda_memberships', 'Memberships assign users to pagodas');
select has_table('public', 'pagoda_number_counters', 'Each pagoda has its own household-number counter');
select hasnt_column('public', 'pagoda_memberships', 'role', 'Memberships have no business-access role');
select has_function('public', 'is_pagoda_member', array['uuid'], 'Literal membership predicate exists');
select has_function('public', 'has_pagoda_access', array['uuid'], 'Canonical access predicate exists');
select has_function('public', 'list_my_pagodas', array[]::text[], 'Authorized pagoda listing exists');
select col_is_null('public', 'audit_events', 'pagoda_id', 'Global audit records may omit pagoda_id');
select col_not_null('public', 'audit_events', 'scope', 'Every audit record has an explicit scope');
select has_check('public', 'audit_events', 'Audit scope constrains pagoda and global records');
select has_function('public', 'require_legacy_pagoda_admin', array[]::text[], 'Legacy compatibility guard exists');
select has_function('public', 'search_households', array['text'], 'Legacy household search remains available during frontend promotion');
select has_function('public', 'create_household', array['integer', 'jsonb'], 'Legacy household creation remains available during frontend promotion');
select has_function('public', 'get_household_workspace', array['uuid'], 'Legacy household workspace remains available during frontend promotion');
select has_function('public', 'create_deceased_person', array['text', 'text', 'text', 'smallint', 'smallint', 'boolean', 'text', 'integer', 'integer'], 'Legacy deceased-person creation remains available during frontend promotion');
select has_function('public', 'list_deceased_people', array[]::text[], 'Legacy deceased-person listing remains available during frontend promotion');
select has_function('public', 'import_deceased_people', array['jsonb'], 'Legacy deceased-person import remains available during frontend promotion');
select has_function('public', 'update_deceased_person_association', array['uuid', 'integer', 'integer'], 'Legacy deceased-person association update remains available during frontend promotion');
select has_function('public', 'reserve_registration', array['uuid', 'date', 'ceremony_period', 'smallint'], 'Legacy registration reservation remains available during frontend promotion');
select has_function('public', 'create_household_wellbeing_registration', array['uuid', 'uuid[]', 'date', 'ceremony_period'], 'Legacy wellbeing registration remains available during frontend promotion');
select has_function('public', 'create_memorial_registration', array['uuid', 'date', 'ceremony_period'], 'Legacy memorial registration remains available during frontend promotion');

select * from finish();
rollback;
