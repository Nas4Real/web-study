-- Story 02-04: private subjects and owner-bound avatar metadata.

alter table public.profiles
add constraint profiles_avatar_object_key_owned
check (
  avatar_object_key is null
  or avatar_object_key ~ (
    '^users/' || id::text || '/avatars/'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  )
);

revoke insert, update on table public.profiles from authenticated;
grant insert (id, display_name, timezone, avatar_object_key) on public.profiles to authenticated;
grant update (display_name, timezone, avatar_object_key) on public.profiles to authenticated;

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (
    name = btrim(name)
    and char_length(name) between 1 and 120
  ),
  color text not null check (color ~ '^#[0-9a-f]{6}$'),
  icon text check (
    icon is null
    or (
      char_length(icon) between 1 and 64
      and icon ~ '^[A-Za-z0-9-]+$'
    )
  ),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index subjects_user_id_idx on public.subjects (user_id);
create unique index subjects_user_name_ci_uidx
on public.subjects (user_id, lower(name));

alter table public.subjects enable row level security;

revoke all on table public.subjects from anon;
grant select, delete on table public.subjects to authenticated;
grant insert (user_id, name, color, icon, position) on public.subjects to authenticated;
grant update (name, color, icon, position) on public.subjects to authenticated;

create policy subjects_select_own
on public.subjects
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy subjects_insert_own
on public.subjects
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy subjects_update_own
on public.subjects
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy subjects_delete_own
on public.subjects
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();
