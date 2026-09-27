begin;
select plan(20);

select ok(not has_table_privilege('anon', 'public.library_documents', 'select'), 'anonymous users cannot read catalog rows directly');
select ok(not has_table_privilege('authenticated', 'public.library_documents', 'select'), 'authenticated users cannot read catalog rows directly');
select ok(not has_table_privilege('anon', 'public.library_storage_control', 'select'), 'maintenance control is not browser-readable');
select is((select maintenance_lock from public.library_storage_control where id), true, 'S3 migration begins with storage maintenance locked');

select ok(not has_function_privilege('anon', 'public.prepare_s3_library_upload(uuid,uuid,text,text,text,bigint)', 'execute'), 'anonymous users cannot prepare S3 tickets');
select ok(not has_function_privilege('authenticated', 'public.prepare_s3_library_upload(uuid,uuid,text,text,text,bigint)', 'execute'), 'authenticated users cannot prepare S3 tickets directly');
select ok(has_function_privilege('service_role', 'public.prepare_s3_library_upload(uuid,uuid,text,text,text,bigint)', 'execute'), 'only service role receives ticket lifecycle access');
select ok(has_function_privilege('service_role', 'public.complete_s3_library_upload(uuid,uuid,uuid,bigint,text,text)', 'execute'), 'service role receives completion access');
select ok(has_function_privilege('service_role', 'public.claim_s3_library_upload_completion(uuid,uuid)', 'execute'), 'service role receives completion lease access');
select ok(not has_function_privilege('authenticated', 'public.complete_s3_library_upload(uuid,uuid,uuid,bigint,text,text)', 'execute'), 'browser users cannot complete lifecycle rows');
select ok(has_function_privilege('service_role', 'public.mark_s3_library_upload_cleaning(uuid,uuid)', 'execute'), 'service role receives cancellation access');
select ok(not has_function_privilege('authenticated', 'public.mark_s3_library_upload_cleaning(uuid,uuid)', 'execute'), 'browser users cannot cancel lifecycle rows directly');
select ok(has_function_privilege('service_role', 'public.complete_s3_library_document_delete(uuid,uuid)', 'execute'), 'service role receives delete finalizer access');
select ok(not has_function_privilege('authenticated', 'public.complete_s3_library_document_delete(uuid,uuid)', 'execute'), 'browser users cannot delete lifecycle rows directly');
select ok(has_function_privilege('service_role', 'public.claim_s3_library_upload_recovery(uuid,uuid)', 'execute'), 'service role receives recovery claim access');
select ok(not has_function_privilege('authenticated', 'public.publish_recovered_s3_library_upload(uuid,uuid,uuid,bigint,text,text)', 'execute'), 'browser users cannot publish recovered uploads directly');
select ok(has_function_privilege('anon', 'public.get_published_s3_library_document(uuid)', 'execute'), 'anonymous download lookup may resolve only published rows');
select ok(has_function_privilege('service_role', 'public.get_published_s3_library_document(uuid)', 'execute'), 'server download lookup has service-role access');
select ok(not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'library_objects_%'), 'Supabase Storage lifecycle policies are removed');
select ok(not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname in ('library_can_upload_object', 'library_can_delete_object', 'prepare_library_upload', 'publish_library_document')), 'legacy browser storage helpers are removed');

select * from finish();
rollback;
