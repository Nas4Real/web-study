begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(28);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'complete-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'complete-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
update public.profiles set storage_quota_bytes = 1000
where id = '11111111-1111-4111-8111-111111111111';
insert into public.subjects (id, user_id, name, color, position) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Owner A', '#2563eb', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Owner B', '#ec4899', 0);

select ok((select relrowsecurity from pg_class where oid = 'public.file_cleanup_jobs'::regclass), 'cleanup jobs has RLS enabled');
select ok(not has_table_privilege('authenticated', 'public.file_cleanup_jobs', 'select'), 'cleanup queue is not browser-readable');
select ok(has_function_privilege('authenticated', 'public.finalize_file_upload(uuid,uuid,bigint,text)', 'execute'), 'authenticated can finalize through RPC');
select ok(not has_function_privilege('authenticated', 'public.expire_file_uploads(integer)', 'execute'), 'authenticated cannot run global expiry');
select ok(has_function_privilege('service_role', 'public.expire_file_uploads(integer)', 'execute'), 'service role can run bounded expiry');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

create temporary table completion_fixture as
select file_id from public.reserve_file_upload(
  '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  null, null, 'complete.pdf', 'application/pdf', 'pdf', 600
);

select is(
  (select result_code from public.finalize_file_upload(
    '11111111-1111-4111-8111-111111111111', (select file_id from completion_fixture), 500, 'application/pdf')),
  'READY', 'verified upload becomes ready'
);
select is((select storage_used_bytes from public.profiles), 500::bigint, 'completion moves actual bytes into used quota');
select is((select storage_reserved_bytes from public.profiles), 0::bigint, 'completion releases declared reservation');
select is((select upload_state from public.files where id = (select file_id from completion_fixture)), 'ready', 'file metadata is ready');
select is((select intent_status from public.get_file_upload_completion_target(
  '11111111-1111-4111-8111-111111111111', (select file_id from completion_fixture))), 'completed', 'intent is completed');
select is(
  (select result_code from public.finalize_file_upload(
    '11111111-1111-4111-8111-111111111111', (select file_id from completion_fixture), 500, 'application/pdf')),
  'READY', 'completion retry is idempotent'
);
select is((select storage_used_bytes from public.profiles), 500::bigint, 'completion retry does not double-count quota');
select is(
  (select count(*) from public.get_file_upload_completion_target(
    '22222222-2222-4222-8222-222222222222', (select file_id from completion_fixture))),
  0::bigint, 'completion target does not enumerate another owner file'
);

create temporary table invalid_fixture as
select file_id from public.reserve_file_upload(
  '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  null, null, 'invalid.pdf', 'application/pdf', 'pdf', 200
);
select is(
  (select result_code from public.finalize_file_upload(
    '11111111-1111-4111-8111-111111111111', (select file_id from invalid_fixture), 0, null)),
  'VERIFICATION_FAILED', 'missing or empty object fails verification'
);
select is((select storage_reserved_bytes from public.profiles), 0::bigint, 'verification failure releases reservation');
select is((select upload_state from public.files where id = (select file_id from invalid_fixture)), 'deleting', 'failed object becomes unavailable');
reset role;
select is((select count(*) from public.file_cleanup_jobs where file_id = (select file_id from invalid_fixture)), 1::bigint, 'verification failure enqueues cleanup once');
set local role authenticated;

create temporary table mime_fixture as
select file_id from public.reserve_file_upload(
  '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  null, null, 'mime.pdf', 'application/pdf', 'pdf', 50
);
select is(
  (select result_code from public.finalize_file_upload(
    '11111111-1111-4111-8111-111111111111', (select file_id from mime_fixture), 50, 'image/png')),
  'VERIFICATION_FAILED', 'mismatched object MIME metadata fails verification'
);

create temporary table quota_fixture as
select file_id from public.reserve_file_upload(
  '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  null, null, 'quota.pdf', 'application/pdf', 'pdf', 300
);
select is(
  (select result_code from public.finalize_file_upload(
    '11111111-1111-4111-8111-111111111111', (select file_id from quota_fixture), 600, 'application/pdf')),
  'QUOTA_EXCEEDED', 'actual bytes cannot exceed remaining quota'
);
select is((select storage_used_bytes from public.profiles), 500::bigint, 'quota failure does not increase used bytes');
select is((select storage_reserved_bytes from public.profiles), 0::bigint, 'quota failure releases reservation');

create temporary table expiry_fixture as
select file_id from public.reserve_file_upload(
  '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  null, null, 'expired.pdf', 'application/pdf', 'pdf', 100
);
reset role;
update public.upload_intents set expires_at = now() - interval '1 minute'
where file_id = (select file_id from expiry_fixture);
grant select on invalid_fixture to service_role;
set local role service_role;
select is(public.expire_file_uploads(500), 1, 'expiry batch is capped and expires the stale intent');
create temporary table claimed_jobs as select * from public.claim_file_cleanup_jobs(100);
reset role;
select is((select storage_reserved_bytes from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 0::bigint, 'expiry releases reservation');
select is((select status from public.upload_intents where file_id = (select file_id from expiry_fixture)), 'expired', 'expiry marks intent');
select is((select upload_state from public.files where id = (select file_id from expiry_fixture)), 'deleting', 'expiry hides file metadata');
select is((select count(*) from claimed_jobs), 4::bigint, 'cleanup worker atomically claims due jobs');
set local role service_role;
select is(public.complete_file_cleanup_job((select id from claimed_jobs where object_key like '%' || (select file_id from invalid_fixture)::text)), true, 'cleanup completion is recorded');
reset role;
select is((select upload_state from public.files where id = (select file_id from invalid_fixture)), 'deleted', 'physical cleanup marks file deleted');

select * from finish();
rollback;
