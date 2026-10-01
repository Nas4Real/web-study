-- Minimal profile bootstrap required by Story 02-02 authentication callbacks.
-- Profile editing, subjects and avatar storage remain owned by Story 02-04.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  timezone text not null default 'UTC',
  avatar_object_key text,
  storage_quota_bytes bigint not null default 2147483648 check (storage_quota_bytes > 0),
  storage_used_bytes bigint not null default 0 check (storage_used_bytes >= 0),
  storage_reserved_bytes bigint not null default 0 check (storage_reserved_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_used_bytes + storage_reserved_bytes <= storage_quota_bytes)
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.bootstrap_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_name text;
begin
  candidate_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  );

  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(regexp_replace(trim(candidate_name), '\s+', ' ', 'g'), 120)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.bootstrap_auth_profile() from public, anon, authenticated;

create trigger auth_user_profile_bootstrap
after insert on auth.users
for each row execute function public.bootstrap_auth_profile();
