-- Serialize occurrence writes with schedule updates using the owned master row.
-- No data rewrite, new columns, table grants or SECURITY DEFINER privileges.
begin;
create function public.guard_calendar_schedule()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if (new.starts_at, new.timezone, new.recurrence_rule)
     is distinct from (old.starts_at, old.timezone, old.recurrence_rule)
     and exists (select 1 from public.calendar_exceptions e
                 where e.series_id = old.id and e.user_id = old.user_id) then
    raise exception using errcode = '23514', message = 'Calendar schedule has exceptions';
  end if;
  return new;
end;
$$;

create function public.lock_calendar_exception_series()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  -- Direct inserts also participate in schedule serialization. RPC writes take
  -- this lock before touching the child row, consistently with series deletion.
  perform 1 from public.calendar_series s
  where s.id = new.series_id and s.user_id = new.user_id for update;
  -- If invisible/missing, let the existing RLS/FK reject the write with its
  -- established error semantics rather than revealing a foreign master.
  return new;
end;
$$;

create trigger calendar_series_guard_schedule
before update on public.calendar_series
for each row execute function public.guard_calendar_schedule();
create trigger calendar_exceptions_lock_series
before insert or update on public.calendar_exceptions
for each row execute function public.lock_calendar_exception_series();

create function public.save_calendar_exception(
  p_user_id uuid, p_series_id uuid, p_original_start timestamptz,
  p_action text, p_override_payload jsonb,
  p_expected_starts_at timestamptz, p_expected_timezone text,
  p_expected_recurrence_rule text
)
returns setof public.calendar_exceptions
language plpgsql security invoker set search_path = ''
as $$
declare
  master public.calendar_series;
begin
  if p_user_id is distinct from auth.uid() then return; end if;
  select * into master from public.calendar_series s
  where s.id = p_series_id and s.user_id = p_user_id for update;
  if not found then return; end if;
  -- Compare the exact schedule used by application membership validation. Unlike
  -- timestamps, this does not depend on precision or transaction start times.
  if master.recurrence_rule is null
     or (master.starts_at, master.timezone, master.recurrence_rule)
        is distinct from (p_expected_starts_at, p_expected_timezone, p_expected_recurrence_rule) then
    raise exception using errcode = '23514', message = 'Calendar schedule changed';
  end if;
  return query insert into public.calendar_exceptions
    (user_id, series_id, original_start, action, override_payload)
    values (p_user_id, p_series_id, p_original_start, p_action, p_override_payload)
    on conflict (series_id, original_start) do nothing returning *;
  if found then return; end if;
  -- UPDATE only granted mutable columns, never immutable identity columns.
  return query update public.calendar_exceptions e
    set action = p_action, override_payload = p_override_payload
    where e.user_id = p_user_id and e.series_id = p_series_id
      and e.original_start = p_original_start
      and (p_action = 'cancelled' or e.action <> 'cancelled')
    returning e.*;
end;
$$;

revoke all on function public.guard_calendar_schedule() from public, anon, authenticated;
revoke all on function public.lock_calendar_exception_series() from public, anon, authenticated;
revoke all on function public.save_calendar_exception(uuid,uuid,timestamptz,text,jsonb,timestamptz,text,text) from public, anon;
grant execute on function public.save_calendar_exception(uuid,uuid,timestamptz,text,jsonb,timestamptz,text,text) to authenticated;

-- Rollback (after reverting the adapter): drop the two new triggers, then the
-- three new functions. No stored series/exception data needs removal.
commit;
