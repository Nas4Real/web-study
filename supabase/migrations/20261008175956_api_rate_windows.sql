-- Story 07-02: atomic, server-only personal API-key rate windows.

create table public.api_rate_windows (
  api_key_id uuid not null references public.api_keys (id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (api_key_id, window_start)
);

create index api_rate_windows_start_idx
on public.api_rate_windows (window_start);

alter table public.api_rate_windows enable row level security;

revoke all on table public.api_rate_windows from public, anon, authenticated;
grant select, insert, update on table public.api_rate_windows to service_role;

create function public.consume_api_rate_limit(
  p_api_key_id uuid,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  request_count integer,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_request_count integer;
begin
  if p_limit < 1 or p_limit > 100000 then
    raise exception using errcode = '22023', message = 'invalid rate limit';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception using errcode = '22023', message = 'invalid rate window';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_windows as api_rate_windows (
    api_key_id,
    window_start,
    request_count
  )
  values (p_api_key_id, v_window_start, 1)
  on conflict (api_key_id, window_start)
  do update set request_count = api_rate_windows.request_count + 1
  returning api_rate_windows.request_count into v_request_count;

  return query select
    v_request_count <= p_limit,
    v_request_count,
    greatest(
      1,
      ceil(extract(epoch from (
        v_window_start + make_interval(secs => p_window_seconds) - v_now
      )))::integer
    );
end;
$$;

revoke all on function public.consume_api_rate_limit(uuid, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(uuid, integer, integer)
to service_role;
