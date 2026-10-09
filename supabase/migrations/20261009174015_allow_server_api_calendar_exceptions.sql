-- Story 07-04: let the server-only personal-API adapter reuse the canonical
-- occurrence exception transaction while retaining explicit owner scoping.

create or replace function public.save_calendar_exception(
  p_user_id uuid, p_series_id uuid, p_original_start timestamptz,
  p_action text, p_override_payload jsonb,
  p_expected_starts_at timestamptz, p_expected_timezone text,
  p_expected_recurrence_rule text
)
returns setof public.calendar_exceptions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  master public.calendar_series;
begin
  if (select auth.uid() is distinct from p_user_id)
    and current_user <> 'service_role' then
    return;
  end if;
  select * into master from public.calendar_series s
  where s.id = p_series_id and s.user_id = p_user_id for update;
  if not found then return; end if;
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
  return query update public.calendar_exceptions e
    set action = p_action, override_payload = p_override_payload
    where e.user_id = p_user_id and e.series_id = p_series_id
      and e.original_start = p_original_start
      and (p_action = 'cancelled' or e.action <> 'cancelled')
    returning e.*;
end;
$$;

revoke all on function public.save_calendar_exception(uuid,uuid,timestamptz,text,jsonb,timestamptz,text,text)
from public, anon;
grant execute on function public.save_calendar_exception(uuid,uuid,timestamptz,text,jsonb,timestamptz,text,text)
to authenticated, service_role;
