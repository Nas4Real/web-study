-- Story 05-01: private chapters, hierarchical folders, and atomic starter rows.

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  name text not null check (
    name = btrim(name)
    and char_length(name) between 1 and 160
  ),
  position integer not null default 0 check (position between 0 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, subject_id),
  constraint chapters_subject_owner_fk
    foreign key (subject_id, user_id)
    references public.subjects (id, user_id)
    on delete restrict
);

create index chapters_user_id_idx on public.chapters (user_id);
create index chapters_subject_position_idx
on public.chapters (user_id, subject_id, position, id);
create unique index chapters_subject_name_ci_uidx
on public.chapters (user_id, subject_id, lower(name));

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  chapter_id uuid,
  parent_id uuid,
  name text not null check (
    name = btrim(name)
    and char_length(name) between 1 and 160
  ),
  position integer not null default 0 check (position between 0 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, user_id, subject_id),
  constraint folders_not_own_parent check (id is distinct from parent_id),
  constraint folders_subject_owner_fk
    foreign key (subject_id, user_id)
    references public.subjects (id, user_id)
    on delete restrict,
  constraint folders_chapter_subject_owner_fk
    foreign key (chapter_id, user_id, subject_id)
    references public.chapters (id, user_id, subject_id)
    on delete restrict,
  constraint folders_parent_subject_owner_fk
    foreign key (parent_id, user_id, subject_id)
    references public.folders (id, user_id, subject_id)
    on delete restrict
);

create index folders_user_id_idx on public.folders (user_id);
create index folders_subject_id_idx on public.folders (subject_id);
create index folders_chapter_parent_position_idx
on public.folders (user_id, subject_id, chapter_id, parent_id, position, id);
create index folders_parent_id_idx on public.folders (parent_id);
create unique index folders_sibling_name_ci_uidx
on public.folders (user_id, subject_id, chapter_id, parent_id, lower(name))
nulls not distinct;

alter table public.chapters enable row level security;
alter table public.folders enable row level security;

revoke all on table public.chapters from anon;
revoke all on table public.folders from anon;
revoke all on table public.chapters from authenticated;
revoke all on table public.folders from authenticated;

grant select, delete on table public.chapters to authenticated;
grant insert (user_id, subject_id, name, position) on public.chapters to authenticated;
grant update (name, position) on public.chapters to authenticated;

grant select, delete on table public.folders to authenticated;
grant insert (user_id, subject_id, chapter_id, parent_id, name, position) on public.folders to authenticated;
grant update (chapter_id, parent_id, name, position) on public.folders to authenticated;

create policy chapters_select_own
on public.chapters for select to authenticated
using ((select auth.uid()) = user_id);

create policy chapters_insert_own
on public.chapters for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy chapters_update_own
on public.chapters for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy chapters_delete_own
on public.chapters for delete to authenticated
using ((select auth.uid()) = user_id);

create policy folders_select_own
on public.folders for select to authenticated
using ((select auth.uid()) = user_id);

create policy folders_insert_own
on public.folders for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy folders_update_own
on public.folders for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy folders_delete_own
on public.folders for delete to authenticated
using ((select auth.uid()) = user_id);

create trigger chapters_set_updated_at
before update on public.chapters
for each row execute function public.set_updated_at();

create trigger folders_set_updated_at
before update on public.folders
for each row execute function public.set_updated_at();

create function public.validate_folder_hierarchy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  creates_cycle boolean;
  parent_chapter_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 0)
  );

  if new.parent_id is null then
    if tg_op = 'UPDATE' and new.chapter_id is distinct from old.chapter_id and exists (
      select 1 from public.folders child
      where child.parent_id = new.id and child.user_id = new.user_id
    ) then
      raise exception using errcode = 'WSC02', message = 'folder with children cannot change chapter';
    end if;
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception using errcode = 'WSC01', message = 'folder cycle';
  end if;

  select parent.chapter_id
  into parent_chapter_id
  from public.folders parent
  where parent.id = new.parent_id
    and parent.user_id = new.user_id
    and parent.subject_id = new.subject_id;

  if not found then
    raise foreign_key_violation using message = 'folder parent not found';
  end if;

  if parent_chapter_id is distinct from new.chapter_id then
    raise check_violation using message = 'folder parent must share chapter';
  end if;

  with recursive ancestors(id, parent_id) as (
    select folder.id, folder.parent_id
    from public.folders folder
    where folder.id = new.parent_id and folder.user_id = new.user_id
    union
    select folder.id, folder.parent_id
    from public.folders folder
    join ancestors on folder.id = ancestors.parent_id
    where folder.user_id = new.user_id
  )
  select exists (select 1 from ancestors where id = new.id)
  into creates_cycle;

  if creates_cycle then
    raise exception using errcode = 'WSC01', message = 'folder cycle';
  end if;

  if tg_op = 'UPDATE' and new.chapter_id is distinct from old.chapter_id and exists (
    select 1 from public.folders child
    where child.parent_id = new.id and child.user_id = new.user_id
  ) then
    raise exception using errcode = 'WSC02', message = 'folder with children cannot change chapter';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_folder_hierarchy() from public, anon, authenticated;

create trigger folders_validate_hierarchy
before insert or update of user_id, subject_id, chapter_id, parent_id
on public.folders
for each row execute function public.validate_folder_hierarchy();

create function public.create_chapter_with_starter_folders(
  p_user_id uuid,
  p_subject_id uuid,
  p_name text,
  p_position integer,
  p_starter_names text[]
)
returns setof public.chapters
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_chapter public.chapters;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise insufficient_privilege using message = 'chapter owner mismatch';
  end if;

  if p_starter_names is distinct from array['Cours', 'TD', 'Resume']::text[] then
    raise check_violation using message = 'invalid starter folders';
  end if;

  insert into public.chapters (user_id, subject_id, name, position)
  values (p_user_id, p_subject_id, p_name, p_position)
  returning * into created_chapter;

  insert into public.folders (
    user_id, subject_id, chapter_id, parent_id, name, position
  )
  select
    p_user_id,
    p_subject_id,
    created_chapter.id,
    null,
    starter.name,
    starter.ordinality - 1
  from unnest(p_starter_names) with ordinality as starter(name, ordinality);

  return next created_chapter;
end;
$$;

revoke all on function public.create_chapter_with_starter_folders(uuid, uuid, text, integer, text[])
from public, anon;
grant execute on function public.create_chapter_with_starter_folders(uuid, uuid, text, integer, text[])
to authenticated;

create function public.is_folder_descendant(
  p_user_id uuid,
  p_ancestor_id uuid,
  p_candidate_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive descendants(id) as (
    select folder.id
    from public.folders folder
    where folder.parent_id = p_ancestor_id
      and folder.user_id = p_user_id
    union
    select folder.id
    from public.folders folder
    join descendants on folder.parent_id = descendants.id
    where folder.user_id = p_user_id
  )
  select
    (select auth.uid()) = p_user_id
    and exists (select 1 from descendants where id = p_candidate_id);
$$;

revoke all on function public.is_folder_descendant(uuid, uuid, uuid)
from public, anon;
grant execute on function public.is_folder_descendant(uuid, uuid, uuid)
to authenticated;
