begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(23);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'calendar-owner-a@example.test', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'calendar-owner-b@example.test', '', now(),
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

insert into public.calendar_series (
  id, user_id, subject_id, kind, title, starts_at, duration_minutes, timezone,
  location, professor, notes_items
) values
  (
    'aaaaaaaa-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'university', 'Owner A lecture', '2026-10-05T08:00:00Z', 90,
    'Africa/Tunis', 'Room A', 'Professor A', '["Bring notes"]'::jsonb
  ),
  (
    'bbbbbbbb-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'exam', 'Owner B exam', '2026-10-06T08:00:00Z', null,
    'Africa/Tunis', 'Hall B', null, '[]'::jsonb
  );

insert into public.calendar_exceptions (
  id, user_id, series_id, original_start, action, override_payload
) values (
  'bbbbbbbb-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  'bbbbbbbb-2222-4222-8222-222222222222',
  '2026-10-06T08:00:00Z',
  'cancelled',
  '{}'::jsonb
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.calendar_series'::regclass),
  'calendar series has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.calendar_exceptions'::regclass),
  'calendar exceptions has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.calendar_series', 'select'),
  'anon cannot select calendar series'
);
select ok(
  not has_table_privilege('anon', 'public.calendar_exceptions', 'select'),
  'anon cannot select calendar exceptions'
);
select ok(
  not has_column_privilege('authenticated', 'public.calendar_series', 'user_id', 'update'),
  'authenticated users cannot reassign series ownership'
);
select ok(
  not has_column_privilege('authenticated', 'public.calendar_exceptions', 'series_id', 'update'),
  'authenticated users cannot retarget exception identity'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

select is((select count(*) from public.calendar_series), 1::bigint, 'owner A sees only their series');
select is((select count(*) from public.calendar_exceptions), 0::bigint, 'owner A cannot see owner B exceptions');
select is_empty(
  $$ update public.calendar_series set title = 'Cross-owner update'
     where id = 'bbbbbbbb-2222-4222-8222-222222222222' returning id $$,
  'owner A cannot update owner B series'
);
select is_empty(
  $$ delete from public.calendar_series
     where id = 'bbbbbbbb-2222-4222-8222-222222222222' returning id $$,
  'owner A cannot delete owner B series'
);
select is_empty(
  $$ update public.calendar_exceptions set action = 'cancelled'
     where id = 'bbbbbbbb-3333-4333-8333-333333333333' returning id $$,
  'owner A cannot update owner B exception'
);
select is_empty(
  $$ delete from public.calendar_exceptions
     where id = 'bbbbbbbb-3333-4333-8333-333333333333' returning id $$,
  'owner A cannot delete owner B exception'
);
select throws_ok(
  $$ insert into public.calendar_series (
       user_id, subject_id, kind, title, starts_at, duration_minutes, timezone
     ) values (
       '22222222-2222-4222-8222-222222222222',
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       'university', 'Owner impersonation', '2026-10-07T08:00:00Z', 45, 'UTC'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "calendar_series"',
  'owner A cannot insert a series as owner B'
);
select throws_ok(
  $$ insert into public.calendar_exceptions (
       user_id, series_id, original_start, action
     ) values (
       '22222222-2222-4222-8222-222222222222',
       'bbbbbbbb-2222-4222-8222-222222222222',
       '2026-10-13T08:00:00Z', 'cancelled'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "calendar_exceptions"',
  'owner A cannot insert an exception as owner B'
);
select throws_ok(
  $$ insert into public.calendar_series (
       user_id, subject_id, kind, title, starts_at, duration_minutes, timezone
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       'revision', 'Cross-owner subject', '2026-10-07T08:00:00Z', 45, 'UTC'
     ) $$,
  '23503',
  'insert or update on table "calendar_series" violates foreign key constraint "calendar_series_subject_owner_fk"',
  'owner-aware subject FK rejects cross-owner series references'
);
select throws_ok(
  $$ insert into public.calendar_exceptions (
       user_id, series_id, original_start, action
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'bbbbbbbb-2222-4222-8222-222222222222',
       '2026-10-13T08:00:00Z', 'cancelled'
     ) $$,
  '23503',
  'insert or update on table "calendar_exceptions" violates foreign key constraint "calendar_exceptions_series_owner_fk"',
  'owner-aware series FK rejects cross-owner exception references'
);
select lives_ok(
  $$ insert into public.calendar_series (
       user_id, subject_id, kind, title, starts_at, duration_minutes, timezone,
       focus_text, notes_items
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'revision', 'Revision block', '2026-10-08T08:00:00Z', 90, 'Africa/Tunis',
       'Chapter 4', '["Solve exercises", "Review proof"]'::jsonb
     ) $$,
  'owner can insert a valid typed session'
);
select throws_ok(
  $$ insert into public.calendar_series (
       user_id, subject_id, kind, title, starts_at, duration_minutes, timezone
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'university', 'Missing duration', '2026-10-09T08:00:00Z', null, 'UTC'
     ) $$,
  '23514',
  'new row for relation "calendar_series" violates check constraint "calendar_series_duration_by_kind"',
  'non-exam sessions require a duration'
);
select throws_ok(
  $$ insert into public.calendar_series (
       user_id, subject_id, kind, title, starts_at, duration_minutes, timezone, notes_items
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'exam', 'Malformed notes', '2026-10-10T08:00:00Z', null, 'UTC',
       '["valid", 42]'::jsonb
     ) $$,
  '23514',
  'new row for relation "calendar_series" violates check constraint "calendar_series_notes_items_check"',
  'database rejects malformed notes content'
);
select throws_ok(
  $$ insert into public.calendar_exceptions (
       user_id, series_id, original_start, action, override_payload
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-1111-4111-8111-111111111111',
       '2026-10-12T08:00:00Z', 'modified', '{"arbitrary":"value"}'::jsonb
     ) $$,
  '23514',
  'new row for relation "calendar_exceptions" violates check constraint "calendar_exceptions_payload_valid"',
  'database rejects non-allowlisted override fields'
);
select throws_ok(
  $$ insert into public.calendar_exceptions (
       user_id, series_id, original_start, action, override_payload
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-1111-4111-8111-111111111111',
       '2026-10-12T08:00:00Z', 'cancelled', '{"title":"Changed"}'::jsonb
     ) $$,
  '23514',
  'new row for relation "calendar_exceptions" violates check constraint "calendar_exceptions_payload_valid"',
  'cancelled exceptions cannot carry overrides'
);
select lives_ok(
  $$ insert into public.calendar_exceptions (
       user_id, series_id, original_start, action, override_payload
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-1111-4111-8111-111111111111',
       '2026-10-12T08:00:00Z', 'modified',
       '{"location":null,"notes_items":["Replacement note"]}'::jsonb
     ) $$,
  'owner can insert an allowlisted occurrence override'
);
select throws_ok(
  $$ insert into public.calendar_exceptions (
       user_id, series_id, original_start, action, override_payload
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'aaaaaaaa-1111-4111-8111-111111111111',
       '2026-10-12T08:00:00Z', 'cancelled', '{}'::jsonb
     ) $$,
  '23505',
  'duplicate key value violates unique constraint "calendar_exceptions_series_id_original_start_key"',
  'one stable occurrence identity has at most one exception'
);

select * from finish();
rollback;
