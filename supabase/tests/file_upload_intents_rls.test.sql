begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(21);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'upload-owner-a@example.test', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'upload-owner-b@example.test', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  );

update public.profiles set storage_quota_bytes = 1000
where id = '11111111-1111-4111-8111-111111111111';

insert into public.subjects (id, user_id, name, color, position) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Owner A', '#2563eb', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Owner B', '#ec4899', 0);

insert into public.chapters (id, user_id, subject_id, name, position) values
  ('aaaaaaaa-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Chapter A', 0);
insert into public.folders (id, user_id, subject_id, chapter_id, name, position) values
  ('aaaaaaaa-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-1111-4111-8111-111111111111', 'Folder A', 0);

select ok((select relrowsecurity from pg_class where oid = 'public.files'::regclass), 'files has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.upload_intents'::regclass), 'upload intents has RLS enabled');
select ok(not has_table_privilege('anon', 'public.files', 'select'), 'anonymous users cannot read files');
select ok(not has_function_privilege('anon', 'public.reserve_file_upload(uuid,uuid,uuid,uuid,text,text,text,bigint)', 'execute'), 'anonymous users cannot reserve uploads');
select ok(has_function_privilege('authenticated', 'public.reserve_file_upload(uuid,uuid,uuid,uuid,text,text,text,bigint)', 'execute'), 'authenticated users can call the reservation RPC');
select ok(not has_table_privilege('authenticated', 'public.files', 'insert'), 'authenticated users cannot bypass the reservation RPC');
select ok(not has_table_privilege('authenticated', 'public.upload_intents', 'select'), 'raw upload intents remain internal');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'storage_reserved_bytes', 'update'), 'authenticated users cannot alter quota counters');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ select * from public.reserve_file_upload(
       '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'aaaaaaaa-1111-4111-8111-111111111111', 'aaaaaaaa-2222-4222-8222-222222222222',
       'lecture.pdf', 'application/pdf', 'pdf', 600
     ) $$,
  'owner can reserve quota and create pending metadata atomically'
);
select is((select count(*) from public.files), 1::bigint, 'owner can read the pending file metadata');
select is((select storage_reserved_bytes from public.profiles), 600::bigint, 'reservation increments only reserved quota');
select throws_ok(
  $$ select count(*) from public.upload_intents $$,
  '42501', 'permission denied for table upload_intents',
  'owner cannot read internal upload intent rows directly'
);
select throws_ok(
  $$ select * from public.reserve_file_upload(
       '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       null, null, 'second.pdf', 'application/pdf', 'pdf', 500
     ) $$,
  'WSQ01', 'storage quota exceeded',
  'reservation rejects quota exhaustion under the profile lock'
);
select is((select count(*) from public.files), 1::bigint, 'failed quota reservation creates no extra file');
select is((select storage_reserved_bytes from public.profiles), 600::bigint, 'failed quota reservation leaves counters unchanged');
select throws_ok(
  $$ select * from public.reserve_file_upload(
       '11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       null, null, 'foreign.pdf', 'application/pdf', 'pdf', 1
     ) $$,
  '23503',
  'insert or update on table "files" violates foreign key constraint "files_subject_owner_fk"',
  'owner-aware foreign keys reject another user subject'
);
select throws_ok(
  $$ select * from public.reserve_file_upload(
       '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       null, 'aaaaaaaa-2222-4222-8222-222222222222', 'wrong-place.pdf', 'application/pdf', 'pdf', 1
     ) $$,
  '23503', 'file folder must share chapter',
  'folder and chapter placement must agree'
);
select throws_ok(
  $$ select * from public.reserve_file_upload(
       '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       null, null, 'fake.pdf', 'image/png', 'pdf', 1
     ) $$,
  '23514',
  'new row for relation "files" violates check constraint "files_mime_extension_match"',
  'direct RPC callers cannot bypass MIME and extension checks'
);
select throws_ok(
  $$ select * from public.reserve_file_upload(
       '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       null, null, 'disguised.exe', 'application/pdf', 'pdf', 1
     ) $$,
  '23514',
  'new row for relation "files" violates check constraint "files_filename_extension_match"',
  'direct RPC callers cannot disguise an unsupported filename extension'
);
select throws_ok(
  $$ select * from public.reserve_file_upload(
       '22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       null, null, 'impersonated.pdf', 'application/pdf', 'pdf', 1
     ) $$,
  '42501', 'upload owner mismatch',
  'reservation rejects actor impersonation'
);
select throws_ok(
  $$ insert into public.files (
       user_id, subject_id, original_filename, display_name, object_key,
       mime_type, extension, size_bytes
     ) values (
       '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'direct.pdf', 'direct.pdf', 'users/11111111-1111-4111-8111-111111111111/files/66666666-6666-4666-8666-666666666666',
       'application/pdf', 'pdf', 1
     ) $$,
  '42501', 'permission denied for table files',
  'authenticated users cannot directly insert pending files'
);

select * from finish();
rollback;
