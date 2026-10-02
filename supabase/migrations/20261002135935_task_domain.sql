-- Story 03-01: private tasks, ordered subtasks, and atomic task creation.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  title text not null check (
    title = btrim(title)
    and char_length(title) between 1 and 240
  ),
  description text check (
    description is null
    or (
      description = btrim(description)
      and char_length(description) between 1 and 10000
    )
  ),
  priority text not null default 'normal'
    check (priority in ('normal', 'high')),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'someday')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint tasks_subject_owner_fk
    foreign key (subject_id, user_id)
    references public.subjects (id, user_id)
    on delete restrict,
  constraint tasks_completed_at_matches_status check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index tasks_user_id_idx on public.tasks (user_id);
create index tasks_subject_id_idx on public.tasks (subject_id);
create index tasks_user_status_due_idx
on public.tasks (user_id, status, due_at);

create table public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null,
  title text not null check (
    title = btrim(title)
    and char_length(title) between 1 and 300
  ),
  position integer not null check (position between 0 and 99),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (task_id, position),
  constraint task_subtasks_task_owner_fk
    foreign key (task_id, user_id)
    references public.tasks (id, user_id)
    on delete cascade
);

create index task_subtasks_user_id_idx on public.task_subtasks (user_id);
create index task_subtasks_task_position_idx
on public.task_subtasks (task_id, position, id);

alter table public.tasks enable row level security;
alter table public.task_subtasks enable row level security;

revoke all on table public.tasks from anon;
revoke all on table public.task_subtasks from anon;
revoke all on table public.tasks from authenticated;
revoke all on table public.task_subtasks from authenticated;

grant select, delete on table public.tasks to authenticated;
grant insert (user_id, subject_id, title, description, priority, due_at) on public.tasks to authenticated;
grant update (subject_id, title, description, priority, status, due_at, completed_at) on public.tasks to authenticated;

grant select, delete on table public.task_subtasks to authenticated;
grant insert (user_id, task_id, title, position) on public.task_subtasks to authenticated;
grant update (title, position, completed_at) on public.task_subtasks to authenticated;

create policy tasks_select_own
on public.tasks for select to authenticated
using ((select auth.uid()) = user_id);

create policy tasks_insert_own
on public.tasks for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy tasks_update_own
on public.tasks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy tasks_delete_own
on public.tasks for delete to authenticated
using ((select auth.uid()) = user_id);

create policy task_subtasks_select_own
on public.task_subtasks for select to authenticated
using ((select auth.uid()) = user_id);

create policy task_subtasks_insert_own
on public.task_subtasks for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy task_subtasks_update_own
on public.task_subtasks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy task_subtasks_delete_own
on public.task_subtasks for delete to authenticated
using ((select auth.uid()) = user_id);

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger task_subtasks_set_updated_at
before update on public.task_subtasks
for each row execute function public.set_updated_at();

create function public.create_task_with_subtasks(
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
  if (select auth.uid() is distinct from p_user_id) then
    raise insufficient_privilege using message = 'task owner mismatch';
  end if;

  if cardinality(p_subtasks) > 100 then
    raise check_violation using message = 'too many subtasks';
  end if;

  insert into public.tasks (
    user_id,
    subject_id,
    title,
    description,
    priority,
    due_at
  ) values (
    p_user_id,
    p_subject_id,
    p_title,
    p_description,
    p_priority,
    p_due_at
  )
  returning * into created_task;

  insert into public.task_subtasks (user_id, task_id, title, position)
  select
    p_user_id,
    created_task.id,
    subtask.title,
    subtask.ordinality - 1
  from unnest(coalesce(p_subtasks, '{}'::text[]))
    with ordinality as subtask(title, ordinality);

  return next created_task;
end;
$$;

revoke all on function public.create_task_with_subtasks(uuid, uuid, text, text, text, timestamptz, text[]) from public, anon;
grant execute on function public.create_task_with_subtasks(uuid, uuid, text, text, text, timestamptz, text[]) to authenticated;
