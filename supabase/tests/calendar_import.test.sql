-- All fixtures, accounts and imported sessions are rolled back. No user data is edited.
begin;
select set_config('test.import_actor', gen_random_uuid()::text, true);
select set_config('test.import_other', gen_random_uuid()::text, true);
select set_config('test.import_foreign_subject', gen_random_uuid()::text, true);
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select current_setting(key)::uuid, '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', current_setting(key) || '@import-test.example', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now()
from unnest(array['test.import_actor', 'test.import_other']) key;
insert into public.subjects (user_id, name, color, position)
values (current_setting('test.import_actor')::uuid, 'Existing maths', '#ec4899', 0);
insert into public.subjects (id, user_id, name, color, position)
values (current_setting('test.import_foreign_subject')::uuid,
  current_setting('test.import_other')::uuid, 'Foreign subject', '#10b981', 0);

set local role service_role;
do $$
declare
  actor uuid := current_setting('test.import_actor')::uuid;
  payload jsonb := jsonb_build_object('timezone', 'Africa/Tunis', 'subjects',
    '[{"name":"New maths","color":"#06b6d4"},{"name":"EXISTING MATHS","color":"#06b6d4"}]'::jsonb,
    'sessions', '[{"subjectName":"New maths","kind":"university","title":"Import SQL test class","startsAt":"2026-10-19T08:00:00Z","timezone":"Africa/Tunis","durationMinutes":60,"recurrenceRule":"FREQ=WEEKLY;COUNT=3","notesItems":["Bring notes"]},{"subjectName":"existing maths","kind":"revision","title":"Import SQL test revision","startsAt":"2026-10-19T09:00:00Z","timezone":"Africa/Tunis","durationMinutes":45,"notesItems":[]}]'::jsonb);
  first_result jsonb;
  replay jsonb;
  invalid_payload jsonb;
begin
  first_result := public.import_calendar_timetable(actor, repeat('a', 64), payload);
  if first_result ->> 'session_count' <> '2' or first_result ->> 'subjects_created' <> '1'
    or first_result ->> 'already_imported' <> 'false' then raise exception 'import result mismatch'; end if;
  if (select count(*) from public.calendar_series where user_id = actor) <> 2 then raise exception 'sessions not saved'; end if;
  if (select color from public.subjects where user_id = actor and name = 'Existing maths') <> '#ec4899' then raise exception 'existing subject was changed'; end if;
  replay := public.import_calendar_timetable(actor, repeat('a', 64), payload);
  if replay ->> 'already_imported' <> 'true' or replay ->> 'import_id' <> first_result ->> 'import_id'
    or (select count(*) from public.calendar_series where user_id = actor) <> 2 then raise exception 'replay duplicated sessions'; end if;

  invalid_payload := jsonb_set(payload, '{subjects}', '[{"name":"Must roll back","color":"#06b6d4"}]'::jsonb);
  invalid_payload := jsonb_set(invalid_payload, '{sessions,1}', jsonb_build_object(
    'subjectId', current_setting('test.import_foreign_subject'), 'kind', 'revision',
    'title', 'Foreign attempt', 'startsAt', '2026-10-19T10:00:00Z', 'timezone', 'Africa/Tunis',
    'durationMinutes', 45, 'notesItems', '[]'::jsonb));
  begin
    perform public.import_calendar_timetable(actor, repeat('b', 64), invalid_payload);
    raise exception 'foreign reference was accepted';
  exception when foreign_key_violation then null;
  end;
  if exists (select 1 from public.subjects where user_id = actor and name = 'Must roll back')
    or exists (select 1 from public.calendar_imports where user_id = actor and fingerprint = repeat('b', 64))
    or (select count(*) from public.calendar_series where user_id = actor) <> 2 then raise exception 'foreign failure left partial writes'; end if;

  invalid_payload := jsonb_set(payload, '{subjects}', '[{"name":"Must also roll back","color":"#06b6d4"}]'::jsonb);
  invalid_payload := jsonb_set(invalid_payload, '{sessions,1,durationMinutes}', 'null'::jsonb);
  begin
    perform public.import_calendar_timetable(actor, repeat('c', 64), invalid_payload);
    raise exception 'invalid second row was accepted';
  exception when check_violation then null;
  end;
  if exists (select 1 from public.subjects where user_id = actor and name = 'Must also roll back')
    or exists (select 1 from public.calendar_imports where user_id = actor and fingerprint = repeat('c', 64))
    or (select count(*) from public.calendar_series where user_id = actor) <> 2 then raise exception 'invalid second row left partial writes'; end if;
end;
$$;
reset role;

do $$ begin
  if has_function_privilege('anon', 'public.import_calendar_timetable(uuid,text,jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.import_calendar_timetable(uuid,text,jsonb)', 'execute')
    or has_table_privilege('anon', 'public.calendar_imports', 'select')
    or has_table_privilege('authenticated', 'public.calendar_imports', 'insert')
    or has_table_privilege('authenticated', 'public.calendar_imports', 'update') then raise exception 'import privileges too broad'; end if;
end; $$;
set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('test.import_other'), 'role', 'authenticated')::text, true);
do $$ begin
  if exists (select 1 from public.calendar_imports where user_id = current_setting('test.import_actor')::uuid)
    then raise exception 'other actor can see receipts'; end if;
end; $$;
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('test.import_actor'), 'role', 'authenticated')::text, true);
do $$ begin
  if (select count(*) from public.calendar_imports where user_id = current_setting('test.import_actor')::uuid) <> 1
    then raise exception 'owner cannot see receipt'; end if;
end; $$;
reset role;
select 'PASS: atomic import, repeat safety, subject reuse, partial-write rollback, foreign ownership, receipt RLS, and restricted grants' as result;
rollback;
