-- Story 07-03: allow the server-only personal-API adapter to reuse the
-- canonical invoker functions while preserving explicit owner scoping.

create or replace function public.create_task_with_subtasks(
  p_user_id uuid,
  p_subject_id uuid,
  p_title text,
  p_description text,
  p_priority text,
  p_due_at timestamptz,
  p_subtasks text[]
)
returns setof public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_task public.tasks;
begin
  if (select auth.uid() is distinct from p_user_id)
    and current_user <> 'service_role' then
    raise insufficient_privilege using message = 'task owner mismatch';
  end if;
  if cardinality(p_subtasks) > 100 then
    raise check_violation using message = 'too many subtasks';
  end if;

  insert into public.tasks (user_id, subject_id, title, description, priority, due_at)
  values (p_user_id, p_subject_id, p_title, p_description, p_priority, p_due_at)
  returning * into created_task;

  insert into public.task_subtasks (user_id, task_id, title, position)
  select p_user_id, created_task.id, subtask.title, subtask.ordinality - 1
  from unnest(coalesce(p_subtasks, '{}'::text[]))
    with ordinality as subtask(title, ordinality);

  return next created_task;
end;
$$;

create or replace function public.create_chapter_with_starter_folders(
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
  if (select auth.uid() is distinct from p_user_id)
    and current_user <> 'service_role' then
    raise insufficient_privilege using message = 'chapter owner mismatch';
  end if;
  if p_starter_names is distinct from array['Cours', 'TD', 'Resume']::text[] then
    raise check_violation using message = 'invalid starter folders';
  end if;

  insert into public.chapters (user_id, subject_id, name, position)
  values (p_user_id, p_subject_id, p_name, p_position)
  returning * into created_chapter;

  insert into public.folders (user_id, subject_id, chapter_id, parent_id, name, position)
  select p_user_id, p_subject_id, created_chapter.id, null, starter.name, starter.ordinality - 1
  from unnest(p_starter_names) with ordinality as starter(name, ordinality);

  return next created_chapter;
end;
$$;

create or replace function public.is_folder_descendant(
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
    select folder.id from public.folders folder
    where folder.parent_id = p_ancestor_id and folder.user_id = p_user_id
    union
    select folder.id from public.folders folder
    join descendants on folder.parent_id = descendants.id
    where folder.user_id = p_user_id
  )
  select ((select auth.uid()) = p_user_id or current_user = 'service_role')
    and exists (select 1 from descendants where id = p_candidate_id);
$$;

revoke all on function public.create_task_with_subtasks(uuid, uuid, text, text, text, timestamptz, text[])
from public, anon;
grant execute on function public.create_task_with_subtasks(uuid, uuid, text, text, text, timestamptz, text[])
to authenticated, service_role;

revoke all on function public.create_chapter_with_starter_folders(uuid, uuid, text, integer, text[])
from public, anon;
grant execute on function public.create_chapter_with_starter_folders(uuid, uuid, text, integer, text[])
to authenticated, service_role;

revoke all on function public.is_folder_descendant(uuid, uuid, uuid)
from public, anon;
grant execute on function public.is_folder_descendant(uuid, uuid, uuid)
to authenticated, service_role;
