begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(27);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'audit-owner-a@example.test', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'audit-owner-b@example.test', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.subjects (id, user_id, name, color, position) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Owner A subject', '#2563eb', 0
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Owner B subject', '#ec4899', 0
  );

select is(
  (
    select count(*)
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and not relation.relrowsecurity
  ),
  0::bigint,
  'every exposed public table has RLS enabled'
);

select is(
  (
    select count(*)
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and (
        has_table_privilege('anon', relation.oid, 'select')
        or has_table_privilege('anon', relation.oid, 'insert')
        or has_table_privilege('anon', relation.oid, 'update')
        or has_table_privilege('anon', relation.oid, 'delete')
      )
  ),
  0::bigint,
  'anonymous users have no DML privileges on public tables'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and roles <> array['authenticated']::name[]
  ),
  0::bigint,
  'all public table policies target authenticated users explicitly'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and cmd = 'UPDATE'
      and (qual is null or with_check is null)
  ),
  0::bigint,
  'every UPDATE policy has both USING and WITH CHECK'
);

select is(
  (
    select count(*)
    from pg_proc as function
    join pg_namespace as namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.prosecdef
      and not ('search_path=""' = any(coalesce(function.proconfig, array[]::text[])))
  ),
  0::bigint,
  'every public security-definer function has an empty fixed search_path'
);

select is(
  (
    select count(*)
    from pg_proc as function
    join pg_namespace as namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.prosecdef
      and (
        has_function_privilege('anon', function.oid, 'execute')
        or has_function_privilege('public', function.oid, 'execute')
      )
  ),
  0::bigint,
  'security-definer functions are never executable by anon or PUBLIC'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.subjects'::regclass),
  'subjects has RLS enabled'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'delete'),
  'authenticated users do not have profile deletion privileges'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'id', 'update'),
  'authenticated users cannot reassign profile identity'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'storage_quota_bytes', 'update'),
  'authenticated users cannot alter their storage quota'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'storage_used_bytes', 'update'),
  'authenticated users cannot alter used storage counters'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'storage_reserved_bytes', 'update'),
  'authenticated users cannot alter reserved storage counters'
);
select ok(
  not has_table_privilege('authenticated', 'public.subjects', 'insert'),
  'subject inserts use an explicit column allow-list'
);
select ok(
  not has_table_privilege('authenticated', 'public.subjects', 'update'),
  'subject updates use an explicit column allow-list'
);
select ok(
  not has_column_privilege('authenticated', 'public.subjects', 'id', 'insert'),
  'authenticated users cannot choose subject identity'
);
select ok(
  not has_column_privilege('authenticated', 'public.subjects', 'id', 'update'),
  'authenticated users cannot change subject identity'
);
select ok(
  not has_column_privilege('authenticated', 'public.subjects', 'user_id', 'update'),
  'authenticated users cannot reassign subject ownership'
);
select ok(
  not has_column_privilege('authenticated', 'public.subjects', 'created_at', 'insert'),
  'authenticated users cannot forge subject creation timestamps'
);
select ok(
  not has_column_privilege('authenticated', 'public.subjects', 'updated_at', 'update'),
  'authenticated users cannot forge subject update timestamps'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'owner A sees only their profile'
);
select is(
  (select count(*) from public.subjects),
  1::bigint,
  'owner A sees only their subject'
);
select is_empty(
  $$
    update public.profiles
    set display_name = 'Cross-owner update'
    where id = '22222222-2222-4222-8222-222222222222'
    returning id
  $$,
  'owner A cannot update owner B profile'
);
select is_empty(
  $$
    update public.subjects
    set name = 'Cross-owner update'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    returning id
  $$,
  'owner A cannot update owner B subject'
);
select is_empty(
  $$
    delete from public.subjects
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    returning id
  $$,
  'owner A cannot delete owner B subject'
);
select throws_ok(
  $$
    insert into public.subjects (user_id, name, color, position)
    values (
      '22222222-2222-4222-8222-222222222222',
      'Owner impersonation', '#0f766e', 1
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "subjects"',
  'owner A cannot insert a subject as owner B'
);
select lives_ok(
  $$
    insert into public.subjects (user_id, name, color, position)
    values (
      '11111111-1111-4111-8111-111111111111',
      'Owner A second subject', '#0f766e', 1
    )
  $$,
  'owner A can insert their own subject through the allowed columns'
);

select * from finish();
rollback;
