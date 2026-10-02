-- Story 04-01: private typed session series and stable occurrence exceptions.

create function public.valid_calendar_notes_items(value jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when jsonb_typeof(value) <> 'array' then false
    when jsonb_array_length(value) > 50 then false
    else not exists (
      select 1
      from jsonb_array_elements(value) as item
      where jsonb_typeof(item) <> 'string'
        or item #>> '{}' <> btrim(item #>> '{}')
        or char_length(item #>> '{}') not between 1 and 500
    )
  end;
$$;

create function public.valid_calendar_override_payload(
  p_action text,
  override_payload jsonb
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  text_value text;
begin
  if jsonb_typeof(override_payload) <> 'object' then
    return false;
  end if;
  if override_payload - array[
    'title',
    'starts_at',
    'duration_minutes',
    'location',
    'professor',
    'focus_text',
    'notes_items'
  ] <> '{}'::jsonb then
    return false;
  end if;
  if p_action = 'cancelled' then
    return override_payload = '{}'::jsonb;
  end if;
  if p_action <> 'modified' or override_payload = '{}'::jsonb then
    return false;
  end if;

  if override_payload ? 'title' then
    if jsonb_typeof(override_payload -> 'title') <> 'string' then return false; end if;
    text_value := override_payload ->> 'title';
    if text_value <> btrim(text_value) or char_length(text_value) not between 1 and 240 then return false; end if;
  end if;
  if override_payload ? 'starts_at' then
    if jsonb_typeof(override_payload -> 'starts_at') <> 'string' then return false; end if;
    perform (override_payload ->> 'starts_at')::timestamptz;
  end if;
  if override_payload ? 'duration_minutes' then
    if jsonb_typeof(override_payload -> 'duration_minutes') = 'null' then
      null;
    elsif jsonb_typeof(override_payload -> 'duration_minutes') <> 'number'
      or override_payload ->> 'duration_minutes' !~ '^[0-9]+$'
      or (override_payload ->> 'duration_minutes')::integer not between 1 and 1440 then
      return false;
    end if;
  end if;
  foreach text_value in array array['location', 'professor', 'focus_text'] loop
    if override_payload ? text_value then
      if jsonb_typeof(override_payload -> text_value) = 'null' then
        null;
      elsif jsonb_typeof(override_payload -> text_value) <> 'string'
        or override_payload ->> text_value <> btrim(override_payload ->> text_value)
        or char_length(override_payload ->> text_value) < 1
        or char_length(override_payload ->> text_value) >
          (case when text_value = 'focus_text' then 1000 else 500 end) then
        return false;
      end if;
    end if;
  end loop;
  if override_payload ? 'notes_items'
    and not public.valid_calendar_notes_items(override_payload -> 'notes_items') then
    return false;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function public.valid_calendar_notes_items(jsonb) from public, anon;
revoke all on function public.valid_calendar_override_payload(text, jsonb) from public, anon;
grant execute on function public.valid_calendar_notes_items(jsonb) to authenticated;
grant execute on function public.valid_calendar_override_payload(text, jsonb) to authenticated;

create table public.calendar_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  kind text not null check (kind in ('exam', 'university', 'revision')),
  title text not null check (
    title = btrim(title)
    and char_length(title) between 1 and 240
  ),
  starts_at timestamptz not null,
  duration_minutes integer check (
    duration_minutes is null
    or duration_minutes between 1 and 1440
  ),
  timezone text not null check (
    timezone = btrim(timezone)
    and char_length(timezone) between 1 and 64
  ),
  recurrence_rule text check (
    recurrence_rule is null
    or (
      recurrence_rule = btrim(recurrence_rule)
      and char_length(recurrence_rule) between 1 and 2048
    )
  ),
  location text check (
    location is null
    or (location = btrim(location) and char_length(location) between 1 and 500)
  ),
  professor text check (
    professor is null
    or (professor = btrim(professor) and char_length(professor) between 1 and 500)
  ),
  focus_text text check (
    focus_text is null
    or (focus_text = btrim(focus_text) and char_length(focus_text) between 1 and 1000)
  ),
  notes_items jsonb not null default '[]'::jsonb
    check (public.valid_calendar_notes_items(notes_items)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint calendar_series_subject_owner_fk
    foreign key (subject_id, user_id)
    references public.subjects (id, user_id)
    on delete restrict,
  constraint calendar_series_duration_by_kind check (
    kind = 'exam' or duration_minutes is not null
  )
);

create index calendar_series_user_id_idx on public.calendar_series (user_id);
create index calendar_series_subject_id_idx on public.calendar_series (subject_id);
create index calendar_series_user_start_idx
on public.calendar_series (user_id, starts_at);

create table public.calendar_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  series_id uuid not null,
  original_start timestamptz not null,
  action text not null check (action in ('modified', 'cancelled')),
  override_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (series_id, original_start),
  constraint calendar_exceptions_series_owner_fk
    foreign key (series_id, user_id)
    references public.calendar_series (id, user_id)
    on delete cascade,
  constraint calendar_exceptions_payload_valid check (
    public.valid_calendar_override_payload(action, override_payload)
  )
);

create index calendar_exceptions_user_id_idx
on public.calendar_exceptions (user_id);
create index calendar_exceptions_series_start_idx
on public.calendar_exceptions (series_id, original_start);

alter table public.calendar_series enable row level security;
alter table public.calendar_exceptions enable row level security;

revoke all on table public.calendar_series from anon;
revoke all on table public.calendar_exceptions from anon;
revoke all on table public.calendar_series from authenticated;
revoke all on table public.calendar_exceptions from authenticated;

grant select, delete on table public.calendar_series to authenticated;
grant insert (user_id, subject_id, kind, title, starts_at, duration_minutes, timezone, recurrence_rule, location, professor, focus_text, notes_items) on public.calendar_series to authenticated;
grant update (subject_id, title, starts_at, duration_minutes, timezone, recurrence_rule, location, professor, focus_text, notes_items) on public.calendar_series to authenticated;

grant select, delete on table public.calendar_exceptions to authenticated;
grant insert (user_id, series_id, original_start, action, override_payload) on public.calendar_exceptions to authenticated;
grant update (action, override_payload) on public.calendar_exceptions to authenticated;

create policy calendar_series_select_own
on public.calendar_series for select to authenticated
using ((select auth.uid()) = user_id);

create policy calendar_series_insert_own
on public.calendar_series for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy calendar_series_update_own
on public.calendar_series for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy calendar_series_delete_own
on public.calendar_series for delete to authenticated
using ((select auth.uid()) = user_id);

create policy calendar_exceptions_select_own
on public.calendar_exceptions for select to authenticated
using ((select auth.uid()) = user_id);

create policy calendar_exceptions_insert_own
on public.calendar_exceptions for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy calendar_exceptions_update_own
on public.calendar_exceptions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy calendar_exceptions_delete_own
on public.calendar_exceptions for delete to authenticated
using ((select auth.uid()) = user_id);

create trigger calendar_series_set_updated_at
before update on public.calendar_series
for each row execute function public.set_updated_at();

create trigger calendar_exceptions_set_updated_at
before update on public.calendar_exceptions
for each row execute function public.set_updated_at();
