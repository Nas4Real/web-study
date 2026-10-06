begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(16);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'library-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'library-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
insert into public.subjects (id, user_id, name, color, position) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Owner A', '#2563eb', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Owner B', '#ec4899', 0);
insert into public.chapters (id, user_id, subject_id, name, position) values
  ('aaaaaaaa-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A chapter', 0),
  ('bbbbbbbb-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B chapter', 0);
insert into public.folders (id, user_id, subject_id, chapter_id, parent_id, name, position) values
  ('aaaaaaaa-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-4111-8111-111111111111', null, 'A folder', 0),
  ('bbbbbbbb-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-1111-4111-8111-111111111111', null, 'B folder', 0);

select ok(has_function_privilege('authenticated', 'public.move_owned_file(uuid,uuid,uuid,uuid)', 'execute'), 'authenticated can move owned files through RPC');
select ok(has_function_privilege('authenticated', 'public.delete_owned_file(uuid,uuid)', 'execute'), 'authenticated can logically delete owned files through RPC');
select ok(not has_function_privilege('anon', 'public.move_owned_file(uuid,uuid,uuid,uuid)', 'execute'), 'anon cannot move files');
select ok(not has_function_privilege('anon', 'public.delete_owned_file(uuid,uuid)', 'execute'), 'anon cannot delete files');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
create temporary table owned_file as select file_id from public.reserve_file_upload(
  '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  null, null, 'owned.pdf', 'application/pdf', 'pdf', 500
);
select is((select result_code from public.finalize_file_upload(
  '11111111-1111-4111-8111-111111111111', (select file_id from owned_file), 400, 'application/pdf')),
  'READY', 'fixture upload becomes ready');
select is((select count(*) from public.move_owned_file(
  '11111111-1111-4111-8111-111111111111', (select file_id from owned_file),
  'aaaaaaaa-1111-4111-8111-111111111111', 'aaaaaaaa-2222-4222-8222-222222222222')),
  1::bigint, 'owner can move a ready file');
select is((select folder_id from public.files where id = (select file_id from owned_file)),
  'aaaaaaaa-2222-4222-8222-222222222222'::uuid, 'move persists the selected folder');
select is((select count(*) from public.move_owned_file(
  '11111111-1111-4111-8111-111111111111', '99999999-9999-4999-8999-999999999999', null, null)),
  0::bigint, 'missing files are not enumerated');
select throws_ok(
  $$ select public.move_owned_file(
    '11111111-1111-4111-8111-111111111111', (select file_id from owned_file),
    'bbbbbbbb-1111-4111-8111-111111111111', 'bbbbbbbb-2222-4222-8222-222222222222') $$,
  '23503', 'file folder not found', 'foreign destinations are rejected');
select is(public.delete_owned_file(
  '11111111-1111-4111-8111-111111111111', (select file_id from owned_file)), true,
  'owner can logically delete the file');
select is((select storage_used_bytes from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  0::bigint, 'logical deletion releases used quota once');
select is((select upload_state from public.files where id = (select file_id from owned_file)),
  'deleting', 'logical deletion hides the file while cleanup is pending');
reset role;
select is((select count(*) from public.file_cleanup_jobs where file_id = (select file_id from owned_file)),
  1::bigint, 'logical deletion enqueues exactly one physical cleanup job');
set local role authenticated;
select is(public.delete_owned_file(
  '11111111-1111-4111-8111-111111111111', (select file_id from owned_file)), true,
  'logical deletion retry is idempotent');
select is((select storage_used_bytes from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  0::bigint, 'deletion retry does not release quota twice');
select is(public.delete_owned_file(
  '11111111-1111-4111-8111-111111111111', '99999999-9999-4999-8999-999999999999'), false,
  'missing file deletion fails closed');

select * from finish();
rollback;
