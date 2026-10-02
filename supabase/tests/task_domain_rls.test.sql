begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(19);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'task-owner-a@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'task-owner-b@example.test',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.subjects (id, user_id, name, color, position) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Owner A subject',
    '#2563eb',
    0
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Owner B subject',
    '#ec4899',
    0
  );

insert into public.tasks (id, user_id, subject_id, title) values
  (
    'aaaaaaaa-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Owner A task'
  ),
  (
    'bbbbbbbb-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Owner B task'
  );

insert into public.task_subtasks (
  id,
  user_id,
  task_id,
  title,
  position
) values (
  'bbbbbbbb-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  'bbbbbbbb-2222-4222-8222-222222222222',
  'Owner B subtask',
  0
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.tasks'::regclass),
  'tasks has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.task_subtasks'::regclass),
  'task_subtasks has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.tasks', 'select'),
  'anon cannot select tasks'
);
select ok(
  not has_table_privilege('anon', 'public.task_subtasks', 'select'),
  'anon cannot select task subtasks'
);
select ok(
  not has_column_privilege(
    'authenticated',
    'public.tasks',
    'user_id',
    'update'
  ),
  'authenticated users cannot reassign task ownership'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.tasks),
  1::bigint,
  'owner A sees only their task'
);
select is(
  (select count(*) from public.task_subtasks),
  0::bigint,
  'owner A cannot see owner B subtasks'
);
select is_empty(
  $$
    update public.tasks
    set title = 'Cross-owner update'
    where id = 'bbbbbbbb-2222-4222-8222-222222222222'
    returning id
  $$,
  'owner A cannot update owner B task'
);
select is_empty(
  $$
    delete from public.tasks
    where id = 'bbbbbbbb-2222-4222-8222-222222222222'
    returning id
  $$,
  'owner A cannot delete owner B task'
);
select is_empty(
  $$
    update public.task_subtasks
    set completed_at = now()
    where id = 'bbbbbbbb-3333-4333-8333-333333333333'
    returning id
  $$,
  'owner A cannot update owner B subtask'
);
select is_empty(
  $$
    delete from public.task_subtasks
    where id = 'bbbbbbbb-3333-4333-8333-333333333333'
    returning id
  $$,
  'owner A cannot delete owner B subtask'
);
select throws_ok(
  $$
    insert into public.tasks (
      user_id,
      subject_id,
      title,
      description,
      priority,
      due_at
    ) values (
      '22222222-2222-4222-8222-222222222222',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'Owner impersonation',
      null,
      'normal',
      null
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "tasks"',
  'owner A cannot insert a task as owner B'
);
select throws_ok(
  $$
    insert into public.task_subtasks (user_id, task_id, title, position)
    values (
      '22222222-2222-4222-8222-222222222222',
      'bbbbbbbb-2222-4222-8222-222222222222',
      'Owner impersonation',
      1
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "task_subtasks"',
  'owner A cannot insert a subtask as owner B'
);
select throws_ok(
  $$
    insert into public.tasks (
      user_id,
      subject_id,
      title,
      description,
      priority,
      due_at
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'Cross-owner subject',
      null,
      'normal',
      null
    )
  $$,
  '23503',
  'insert or update on table "tasks" violates foreign key constraint "tasks_subject_owner_fk"',
  'owner-aware subject FK rejects cross-owner task references'
);
select throws_ok(
  $$
    insert into public.task_subtasks (user_id, task_id, title, position)
    values (
      '11111111-1111-4111-8111-111111111111',
      'bbbbbbbb-2222-4222-8222-222222222222',
      'Cross-owner subtask',
      1
    )
  $$,
  '23503',
  'insert or update on table "task_subtasks" violates foreign key constraint "task_subtasks_task_owner_fk"',
  'owner-aware task FK rejects cross-owner subtask references'
);
select lives_ok(
  $$
    select public.create_task_with_subtasks(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'Atomic task',
      'Created with ordered subtasks',
      'high',
      null,
      array['First step', 'Second step']
    )
  $$,
  'owner can atomically create a task and subtasks'
);
select is(
  (
    select array_agg(subtask.title order by subtask.position)
    from public.task_subtasks as subtask
    join public.tasks as task on task.id = subtask.task_id
    where task.title = 'Atomic task'
  ),
  array['First step', 'Second step'],
  'atomic creation preserves subtask order'
);
select lives_ok(
  $$
    update public.tasks
    set status = 'completed', completed_at = now()
    where title = 'Atomic task'
  $$,
  'owner can complete a parent task independently'
);
select is(
  (
    select count(*)
    from public.task_subtasks as subtask
    join public.tasks as task on task.id = subtask.task_id
    where task.title = 'Atomic task'
      and subtask.completed_at is not null
  ),
  0::bigint,
  'completing a parent does not complete its subtasks'
);

select * from finish();
rollback;
