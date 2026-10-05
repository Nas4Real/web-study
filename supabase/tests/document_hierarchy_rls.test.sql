begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(33);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'document-owner-a@example.test', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'document-owner-b@example.test', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.subjects (id, user_id, name, color, position) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Owner A subject', '#2563eb', 0
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '11111111-1111-4111-8111-111111111111',
    'Owner A second subject', '#16a34a', 1
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Owner B subject', '#ec4899', 0
  );

insert into public.chapters (id, user_id, subject_id, name, position) values (
  'bbbbbbbb-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Owner B chapter',
  0
);

insert into public.folders (
  id, user_id, subject_id, chapter_id, parent_id, name, position
) values (
  'bbbbbbbb-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'bbbbbbbb-1111-4111-8111-111111111111',
  null,
  'Owner B folder',
  0
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.chapters'::regclass),
  'chapters has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.folders'::regclass),
  'folders has RLS enabled'
);
select ok(not has_table_privilege('anon', 'public.chapters', 'select'), 'anon cannot select chapters');
select ok(not has_table_privilege('anon', 'public.folders', 'select'), 'anon cannot select folders');
select ok(
  not has_column_privilege('authenticated', 'public.chapters', 'user_id', 'update'),
  'authenticated users cannot reassign chapter ownership'
);
select ok(
  not has_column_privilege('authenticated', 'public.folders', 'user_id', 'update'),
  'authenticated users cannot reassign folder ownership'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

select is((select count(*) from public.chapters), 0::bigint, 'owner A cannot see owner B chapters');
select is((select count(*) from public.folders), 0::bigint, 'owner A cannot see owner B folders');
select is_empty(
  $$ update public.chapters set name = 'Cross-owner update'
     where id = 'bbbbbbbb-1111-4111-8111-111111111111' returning id $$,
  'owner A cannot update owner B chapter'
);
select is_empty(
  $$ delete from public.folders
     where id = 'bbbbbbbb-2222-4222-8222-222222222222' returning id $$,
  'owner A cannot delete owner B folder'
);
select throws_ok(
  $$ insert into public.chapters (user_id, subject_id, name, position) values (
       '22222222-2222-4222-8222-222222222222',
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Owner impersonation', 1
     ) $$,
  '42501',
  'new row violates row-level security policy for table "chapters"',
  'owner A cannot insert a chapter as owner B'
);
select throws_ok(
  $$ insert into public.folders (user_id, subject_id, chapter_id, parent_id, name, position) values (
       '22222222-2222-4222-8222-222222222222',
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       'bbbbbbbb-1111-4111-8111-111111111111', null, 'Owner impersonation', 1
     ) $$,
  '42501',
  'new row violates row-level security policy for table "folders"',
  'owner A cannot insert a folder as owner B'
);

select lives_ok(
  $$ select public.create_chapter_with_starter_folders(
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'Chapter One', 0, array['Cours', 'TD', 'Resume']
     ) $$,
  'owner can atomically create a chapter and its starter folders'
);
select is(
  (
    select array_agg(folder.name order by folder.position)
    from public.folders as folder
    join public.chapters as chapter on chapter.id = folder.chapter_id
    where chapter.name = 'Chapter One'
  ),
  array['Cours', 'TD', 'Resume'],
  'atomic chapter creation inserts exactly the ordered starter rows'
);
select lives_ok(
  $$ update public.folders set name = 'Lectures'
     where chapter_id = (select id from public.chapters where name = 'Chapter One')
       and name = 'Cours' $$,
  'a starter folder is an ordinary renameable row'
);
select lives_ok(
  $$ delete from public.folders
     where chapter_id = (select id from public.chapters where name = 'Chapter One')
       and name = 'Resume' $$,
  'a starter folder is an ordinary deletable row'
);
select lives_ok(
  $$ insert into public.folders (
       user_id, subject_id, chapter_id, parent_id, name, position
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       (select id from public.chapters where name = 'Chapter One'),
       null, 'Owner-created folder', 3
     ) $$,
  'owner can create a normal folder without choosing protected columns'
);

reset role;
insert into public.chapters (id, user_id, subject_id, name, position) values
  (
    'aaaaaaaa-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Chapter Two', 1
  ),
  (
    'cccccccc-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'Other Subject Chapter', 0
  );
set local role authenticated;

select throws_ok(
  $$ insert into public.folders (user_id, subject_id, chapter_id, parent_id, name, position) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'cccccccc-1111-4111-8111-111111111111', null, 'Cross-subject chapter', 0
     ) $$,
  '23503',
  'insert or update on table "folders" violates foreign key constraint "folders_chapter_subject_owner_fk"',
  'owner-aware chapter FK rejects cross-subject folder references'
);

reset role;
insert into public.folders (
  id, user_id, subject_id, chapter_id, parent_id, name, position
) values
  (
    'aaaaaaaa-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-1111-4111-8111-111111111111',
    null, 'Root', 0
  ),
  (
    'cccccccc-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'cccccccc-1111-4111-8111-111111111111',
    null, 'Other Subject Root', 0
  );
set local role authenticated;

select throws_ok(
  $$ insert into public.folders (user_id, subject_id, chapter_id, parent_id, name, position) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'aaaaaaaa-1111-4111-8111-111111111111',
       'cccccccc-2222-4222-8222-222222222222', 'Cross-subject parent', 0
     ) $$,
  '23503', 'folder parent not found',
  'hierarchy validation rejects a parent from another subject'
);
select throws_ok(
  $$ insert into public.folders (user_id, subject_id, chapter_id, parent_id, name, position) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       (select id from public.chapters where name = 'Chapter One'),
       'aaaaaaaa-2222-4222-8222-222222222222', 'Cross-chapter parent', 0
     ) $$,
  '23514', 'folder parent must share chapter',
  'hierarchy validation rejects a parent from another chapter'
);

reset role;
insert into public.folders (
  id, user_id, subject_id, chapter_id, parent_id, name, position
) values (
  'aaaaaaaa-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-1111-4111-8111-111111111111',
  'aaaaaaaa-2222-4222-8222-222222222222',
  'Child', 0
);
set local role authenticated;

select throws_ok(
  $$ update public.folders set parent_id = id
     where id = 'aaaaaaaa-3333-4333-8333-333333333333' $$,
  'WSC01', 'folder cycle',
  'hierarchy validation rejects a self-cycle'
);
select throws_ok(
  $$ update public.folders set parent_id = 'aaaaaaaa-3333-4333-8333-333333333333'
     where id = 'aaaaaaaa-2222-4222-8222-222222222222' $$,
  'WSC01', 'folder cycle',
  'hierarchy validation rejects an ancestor cycle'
);
select ok(
  public.is_folder_descendant(
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-2222-4222-8222-222222222222',
    'aaaaaaaa-3333-4333-8333-333333333333'
  ),
  'descendant lookup identifies an owned descendant'
);
select is(
  public.is_folder_descendant(
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-2222-4222-8222-222222222222',
    'aaaaaaaa-3333-4333-8333-333333333333'
  ),
  false,
  'descendant lookup fails closed for another owner'
);
select throws_ok(
  $$ delete from public.folders where id = 'aaaaaaaa-2222-4222-8222-222222222222' $$,
  '23503',
  'update or delete on table "folders" violates foreign key constraint "folders_parent_subject_owner_fk" on table "folders"',
  'a folder with children cannot be deleted'
);
select throws_ok(
  $$ delete from public.chapters where id = 'aaaaaaaa-1111-4111-8111-111111111111' $$,
  '23503',
  'update or delete on table "chapters" violates foreign key constraint "folders_chapter_subject_owner_fk" on table "folders"',
  'a chapter with folders cannot be deleted'
);
select throws_ok(
  $$ update public.folders
     set chapter_id = (select id from public.chapters where name = 'Chapter One')
     where id = 'aaaaaaaa-2222-4222-8222-222222222222' $$,
  'WSC02', 'folder with children cannot change chapter',
  'a folder with children cannot move to another chapter'
);
select throws_ok(
  $$ insert into public.chapters (user_id, subject_id, name, position) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'chapter two', 2
     ) $$,
  '23505',
  'duplicate key value violates unique constraint "chapters_subject_name_ci_uidx"',
  'chapter names are case-insensitively unique within a subject'
);
select throws_ok(
  $$ insert into public.folders (user_id, subject_id, chapter_id, parent_id, name, position) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'aaaaaaaa-1111-4111-8111-111111111111',
       'aaaaaaaa-2222-4222-8222-222222222222', 'child', 1
     ) $$,
  '23505',
  'duplicate key value violates unique constraint "folders_sibling_name_ci_uidx"',
  'folder names are case-insensitively unique among siblings'
);
select lives_ok(
  $$ update public.folders set name = 'Renamed child'
     where id = 'aaaaaaaa-3333-4333-8333-333333333333' $$,
  'owner can rename a folder'
);
select lives_ok(
  $$ delete from public.folders where id = 'aaaaaaaa-3333-4333-8333-333333333333' $$,
  'owner can delete a leaf folder'
);
select lives_ok(
  $$ delete from public.folders where id = 'aaaaaaaa-2222-4222-8222-222222222222' $$,
  'owner can delete a folder after its children are removed'
);
select lives_ok(
  $$ delete from public.chapters where id = 'aaaaaaaa-1111-4111-8111-111111111111' $$,
  'owner can delete a chapter after its folders are removed'
);

select * from finish();
rollback;
