-- Additive timetable import receipts and one atomic server-side transaction.
create table public.calendar_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  session_count integer not null check (session_count between 1 and 200),
  subjects_created integer not null default 0 check (subjects_created between 0 and 100),
  first_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);
alter table public.calendar_imports enable row level security;
revoke all on table public.calendar_imports from public, anon, authenticated;
grant select on table public.calendar_imports to authenticated;
grant select, insert, update on table public.calendar_imports to service_role;
create policy calendar_imports_select_own on public.calendar_imports
for select to authenticated using ((select auth.uid()) = user_id);

create function public.import_calendar_timetable(p_user_id uuid, p_fingerprint text, p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_import public.calendar_imports;
  v_import_id uuid;
  v_subject jsonb;
  v_session jsonb;
  v_subject_id uuid;
  v_created integer := 0;
  v_first_date date;
begin
  -- The public API verifies cookie/JWT/API-key identity before passing the owner.
  -- No browser role can call this function or fabricate receipt writes.
  if current_user <> 'service_role' or p_user_id is null then
    raise insufficient_privilege using message = 'import requires a verified server actor';
  end if;
  if p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_payload -> 'sessions') is distinct from 'array'
    or jsonb_typeof(p_payload -> 'subjects') is distinct from 'array' then
    raise check_violation using message = 'invalid import payload';
  end if;
  if jsonb_array_length(p_payload -> 'sessions') not between 1 and 200
    or jsonb_array_length(p_payload -> 'subjects') > 100
    or octet_length(p_payload::text) > 2097152 then
    raise check_violation using message = 'import exceeds limits';
  end if;
  select (min((s ->> 'startsAt')::timestamptz) at time zone (p_payload ->> 'timezone'))::date
  into v_first_date from jsonb_array_elements(p_payload -> 'sessions') s;

  -- Unique index serializes retries, including concurrent requests. All later
  -- writes are in this transaction; any raised error also rolls back the receipt.
  insert into public.calendar_imports (user_id, fingerprint, session_count, first_date)
  values (p_user_id, p_fingerprint, jsonb_array_length(p_payload -> 'sessions'), v_first_date)
  on conflict (user_id, fingerprint) do nothing
  returning id into v_import_id;
  if v_import_id is null then
    select * into strict v_import from public.calendar_imports
    where user_id = p_user_id and fingerprint = p_fingerprint;
    return jsonb_build_object('import_id', v_import.id, 'session_count', v_import.session_count,
      'subjects_created', 0, 'already_imported', true, 'first_date', v_import.first_date);
  end if;

  -- Stable name order keeps concurrent imports from taking subject locks in
  -- opposing orders. Existing subjects retain their name/color/position.
  for v_subject in select s from jsonb_array_elements(p_payload -> 'subjects') s order by lower(s ->> 'name') loop
    insert into public.subjects (user_id, name, color, position)
    values (p_user_id, v_subject ->> 'name', v_subject ->> 'color',
      (select coalesce(max(position), -1) + 1 from public.subjects where user_id = p_user_id))
    on conflict (user_id, (lower(name))) do nothing
    returning id into v_subject_id;
    if v_subject_id is not null then v_created := v_created + 1; end if;
  end loop;

  for v_session in select s from jsonb_array_elements(p_payload -> 'sessions') s loop
    v_subject_id := null;
    if v_session ? 'subjectId' then
      v_subject_id := (v_session ->> 'subjectId')::uuid;
      if not exists (select 1 from public.subjects where id = v_subject_id and user_id = p_user_id) then
        raise foreign_key_violation using message = 'subject unavailable for this owner';
      end if;
    else
      select id into v_subject_id from public.subjects
      where user_id = p_user_id and lower(name) = lower(v_session ->> 'subjectName');
      if v_subject_id is null then
        raise foreign_key_violation using message = 'subject unavailable for this owner';
      end if;
    end if;
    insert into public.calendar_series (
      user_id, subject_id, kind, title, starts_at, duration_minutes, timezone,
      recurrence_rule, location, professor, focus_text, notes_items
    ) values (
      p_user_id, v_subject_id, v_session ->> 'kind', v_session ->> 'title',
      (v_session ->> 'startsAt')::timestamptz, (v_session ->> 'durationMinutes')::integer,
      v_session ->> 'timezone', v_session ->> 'recurrenceRule', v_session ->> 'location',
      v_session ->> 'professor', v_session ->> 'focusText', v_session -> 'notesItems'
    );
  end loop;
  update public.calendar_imports set subjects_created = v_created
  where id = v_import_id and user_id = p_user_id returning * into strict v_import;
  return jsonb_build_object('import_id', v_import.id, 'session_count', v_import.session_count,
    'subjects_created', v_created, 'already_imported', false, 'first_date', v_import.first_date);
end;
$$;
revoke all on function public.import_calendar_timetable(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.import_calendar_timetable(uuid, text, jsonb) to service_role;
