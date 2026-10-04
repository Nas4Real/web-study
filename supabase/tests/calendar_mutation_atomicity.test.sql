begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(21);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('55555555-5555-4555-8555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'calendar-atomic@example.test', '', now(), '{}', '{}', now(), now());
insert into public.subjects (id, user_id, name, color, position)
values ('55555555-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '55555555-5555-4555-8555-555555555555', 'Atomic subject', '#2563eb', 0);
insert into public.calendar_series (id, user_id, subject_id, kind, title, starts_at, duration_minutes, timezone, recurrence_rule)
values ('55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '55555555-5555-4555-8555-555555555555', '55555555-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'university', 'Atomic lecture', '2026-10-05T08:00:00Z', 45, 'Africa/Tunis', 'FREQ=WEEKLY;COUNT=3');
insert into auth.users (id, email) values ('66666666-6666-4666-8666-666666666666', 'calendar-foreign@example.test');
insert into public.subjects (id, user_id, name, color, position)
values ('66666666-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '66666666-6666-4666-8666-666666666666', 'Foreign subject', '#2563eb', 0);
insert into public.calendar_series (id, user_id, subject_id, kind, title, starts_at, duration_minutes, timezone, recurrence_rule)
values ('66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '66666666-6666-4666-8666-666666666666', '66666666-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'university', 'Foreign lecture', '2026-10-05T08:00:00Z', 45, 'Africa/Tunis', 'FREQ=WEEKLY;COUNT=3');
set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);

select lives_ok($$ update public.calendar_series set starts_at = '2026-10-06T08:00:00Z' where id = '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb' $$, 'schedule can change before exceptions exist');
select throws_ok($$ select * from public.save_calendar_exception('55555555-5555-4555-8555-555555555555', '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-12T08:00:00Z', 'cancelled', '{}', '2026-10-05T08:00:00Z', 'Africa/Tunis', 'FREQ=WEEKLY;COUNT=3') $$, '23514', 'Calendar schedule changed', 'old schedule snapshot cannot insert an exception');
select is((select count(*) from public.calendar_exceptions), 0::bigint, 'stale write left no exception');
select lives_ok($$ select * from public.save_calendar_exception('55555555-5555-4555-8555-555555555555', '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-13T08:00:00Z', 'modified', '{"location":"Room B"}', '2026-10-06T08:00:00Z', 'Africa/Tunis', 'FREQ=WEEKLY;COUNT=3') $$, 'current schedule writes an occurrence using existing column grants');
select throws_ok($$ update public.calendar_series set starts_at = '2026-10-07T08:00:00Z' where id = '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb' $$, '23514', 'Calendar schedule has exceptions', 'persisted exception blocks a schedule rewrite');
select lives_ok($$ update public.calendar_series set title = 'Renamed lecture' where id = '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb' $$, 'metadata edits remain allowed');
select lives_ok($$ select * from public.save_calendar_exception('55555555-5555-4555-8555-555555555555', '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-13T08:00:00Z', 'cancelled', '{}', '2026-10-06T08:00:00Z', 'Africa/Tunis', 'FREQ=WEEKLY;COUNT=3') $$, 'mutable-only conflict path cancels without identity update privileges');
select is_empty($$ select * from public.save_calendar_exception('55555555-5555-4555-8555-555555555555', '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-13T08:00:00Z', 'modified', '{"title":"Stale"}', '2026-10-06T08:00:00Z', 'Africa/Tunis', 'FREQ=WEEKLY;COUNT=3') $$, 'cancelled occurrence cannot be restored by stale edit');
select is_empty($$ select * from public.save_calendar_exception('99999999-9999-4999-8999-999999999999', '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-13T08:00:00Z', 'cancelled', '{}', '2026-10-06T08:00:00Z', 'Africa/Tunis', 'FREQ=WEEKLY;COUNT=3') $$, 'actor argument cannot bypass JWT ownership');
select ok(not has_function_privilege('anon', 'public.save_calendar_exception(uuid,uuid,timestamptz,text,jsonb,timestamptz,text,text)', 'execute'), 'anonymous RPC execution is denied');
select is_empty($$ select * from public.save_calendar_exception('55555555-5555-4555-8555-555555555555', '66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-12T08:00:00Z', 'cancelled', '{}', '2026-10-05T08:00:00Z', 'Africa/Tunis', 'FREQ=WEEKLY;COUNT=3') $$, 'JWT owner cannot write a foreign series through RPC');
select ok(not (select prosecdef from pg_proc where oid = 'public.save_calendar_exception(uuid,uuid,timestamptz,text,jsonb,timestamptz,text,text)'::regprocedure), 'RPC does not bypass RLS');
select throws_ok($$ update public.calendar_series set timezone = 'Europe/Paris' where id = '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb' $$, '23514', 'Calendar schedule has exceptions', 'timezone identity rewrites are guarded');
select throws_ok($$ update public.calendar_series set recurrence_rule = null where id = '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb' $$, '23514', 'Calendar schedule has exceptions', 'recurrence removal is guarded');
set local role anon;
select throws_ok($$ select * from public.save_calendar_exception('55555555-5555-4555-8555-555555555555', '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-13T08:00:00Z', 'cancelled', '{}', '2026-10-06T08:00:00Z', 'Africa/Tunis', 'FREQ=WEEKLY;COUNT=3') $$, '42501', 'permission denied for function save_calendar_exception', 'anonymous invocation actually fails');
set local role authenticated;
select is_empty($$ delete from public.calendar_series where id = '66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id $$, 'foreign whole-series deletion returns no row');
select results_eq($$ delete from public.calendar_series where id = '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and user_id = '55555555-5555-4555-8555-555555555555' returning id $$, $$ values ('55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid) $$, 'owner can delete the exact series with existing grants');
select is((select count(*) from public.calendar_series where id = '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 0::bigint, 'whole-series deletion removes its master');
select is((select count(*) from public.calendar_exceptions where series_id = '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 0::bigint, 'whole-series deletion cascades its occurrence exceptions');
select is_empty($$ delete from public.calendar_series where id = '55555555-bbbb-4bbb-8bbb-bbbbbbbbbbbb' returning id $$, 'retried series deletion safely reports no row');
reset role;
select is((select count(*) from public.calendar_series where id = '66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 1::bigint, 'foreign series was preserved');
select * from finish();
rollback;
