-- Web Study V1 V4 engineered schema draft.
-- When implementation begins, create real migration files with the current Supabase CLI.
-- Re-check current Supabase changelog/docs before applying.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'UTC',
  avatar_object_key text,
  storage_quota_bytes bigint not null default 2147483648 check (storage_quota_bytes > 0),
  storage_used_bytes bigint not null default 0 check (storage_used_bytes >= 0),
  storage_reserved_bytes bigint not null default 0 check (storage_reserved_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_used_bytes + storage_reserved_bytes <= storage_quota_bytes)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  color text not null,
  icon text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index if not exists subjects_user_id_idx on public.subjects(user_id);
create unique index if not exists subjects_user_name_ci_uidx on public.subjects(user_id, lower(name));

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  name text not null check (char_length(name) between 1 and 160),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint chapters_subject_owner_fk foreign key (subject_id, user_id)
    references public.subjects(id, user_id) on delete restrict
);
create index if not exists chapters_user_id_idx on public.chapters(user_id);
create index if not exists chapters_subject_id_idx on public.chapters(subject_id);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  chapter_id uuid,
  parent_id uuid,
  name text not null check (char_length(name) between 1 and 160),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (id is distinct from parent_id),
  constraint folders_subject_owner_fk foreign key (subject_id, user_id)
    references public.subjects(id, user_id) on delete restrict,
  constraint folders_chapter_owner_fk foreign key (chapter_id, user_id)
    references public.chapters(id, user_id) on delete cascade,
  constraint folders_parent_owner_fk foreign key (parent_id, user_id)
    references public.folders(id, user_id) on delete cascade
);
create index if not exists folders_user_id_idx on public.folders(user_id);
create index if not exists folders_subject_id_idx on public.folders(subject_id);
create index if not exists folders_chapter_id_idx on public.folders(chapter_id);
create index if not exists folders_parent_id_idx on public.folders(parent_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  title text not null check (char_length(title) between 1 and 240),
  description text check (description is null or char_length(description) <= 10000),
  priority text not null default 'normal' check (priority in ('normal','high')),
  status text not null default 'pending' check (status in ('pending','completed','someday')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint tasks_subject_owner_fk foreign key (subject_id, user_id)
    references public.subjects(id, user_id) on delete restrict,
  check ((status = 'completed' and completed_at is not null) or (status <> 'completed' and completed_at is null))
);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_subject_id_idx on public.tasks(subject_id);
create index if not exists tasks_user_status_due_idx on public.tasks(user_id, status, due_at);

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  title text not null check (char_length(title) between 1 and 300),
  position integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint task_subtasks_task_owner_fk foreign key (task_id, user_id)
    references public.tasks(id, user_id) on delete cascade
);
create index if not exists task_subtasks_user_id_idx on public.task_subtasks(user_id);
create index if not exists task_subtasks_task_position_idx on public.task_subtasks(task_id, position, id);

create table if not exists public.calendar_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  kind text not null check (kind in ('exam','university','revision')),
  title text not null check (char_length(title) between 1 and 240),
  starts_at timestamptz not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 1440),
  timezone text not null,
  recurrence_rule text,
  location text,
  professor text,
  focus_text text,
  notes_items jsonb not null default '[]'::jsonb check (jsonb_typeof(notes_items) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint calendar_series_subject_owner_fk foreign key (subject_id, user_id)
    references public.subjects(id, user_id) on delete restrict,
  check (kind = 'exam' or duration_minutes is not null)
);
create index if not exists calendar_series_user_id_idx on public.calendar_series(user_id);
create index if not exists calendar_series_subject_id_idx on public.calendar_series(subject_id);
create index if not exists calendar_series_user_start_idx on public.calendar_series(user_id, starts_at);

create table if not exists public.calendar_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid not null,
  original_start timestamptz not null,
  action text not null check (action in ('modified','cancelled')),
  override_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(override_payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(series_id, original_start),
  constraint calendar_exceptions_series_owner_fk foreign key (series_id, user_id)
    references public.calendar_series(id, user_id) on delete cascade
);
create index if not exists calendar_exceptions_user_id_idx on public.calendar_exceptions(user_id);
create index if not exists calendar_exceptions_series_idx on public.calendar_exceptions(series_id, original_start);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null,
  chapter_id uuid,
  folder_id uuid,
  original_filename text not null,
  display_name text not null,
  object_key text not null unique,
  mime_type text not null,
  extension text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  upload_state text not null default 'pending' check (upload_state in ('pending','ready','failed','deleting','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  constraint files_subject_owner_fk foreign key (subject_id, user_id)
    references public.subjects(id, user_id) on delete restrict,
  constraint files_chapter_owner_fk foreign key (chapter_id, user_id)
    references public.chapters(id, user_id) on delete restrict,
  constraint files_folder_owner_fk foreign key (folder_id, user_id)
    references public.folders(id, user_id) on delete restrict
);
create index if not exists files_user_id_idx on public.files(user_id);
create index if not exists files_subject_id_idx on public.files(subject_id);
create index if not exists files_chapter_id_idx on public.files(chapter_id);
create index if not exists files_folder_id_idx on public.files(folder_id);
create index if not exists files_user_subject_created_idx on public.files(user_id, subject_id, created_at desc);

create table if not exists public.upload_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid not null,
  declared_bytes bigint not null check (declared_bytes between 1 and 52428800),
  expected_mime_type text not null,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (file_id),
  constraint upload_intents_file_owner_fk foreign key (file_id, user_id)
    references public.files(id, user_id) on delete cascade
);
create index if not exists upload_intents_user_id_idx on public.upload_intents(user_id);
create index if not exists upload_intents_expiry_idx on public.upload_intents(expires_at) where completed_at is null;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  upcoming_exams boolean not null default true,
  overdue_tasks boolean not null default true,
  session_reminders boolean not null default true,
  exam_lead_hours integer not null default 48 check (exam_lead_hours between 1 and 720),
  session_lead_minutes integer not null default 30 check (session_lead_minutes between 1 and 1440),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('upcoming_exam','overdue_task','session_start')),
  source_type text not null check (source_type in ('task','calendar_series')),
  source_id uuid not null,
  occurrence_start timestamptz,
  dedupe_key text not null,
  title text not null,
  body text,
  scheduled_for timestamptz not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, dedupe_key)
);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_user_read_created_idx on public.notifications(user_id, read_at, created_at desc);

-- API keys and infrastructure tables are server-managed and intentionally not directly exposed to authenticated browser users.
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  key_prefix text not null unique,
  secret_hash text not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists api_keys_user_id_idx on public.api_keys(user_id);
create index if not exists api_keys_active_idx on public.api_keys(user_id, revoked_at, expires_at);

create table if not exists public.api_rate_windows (
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key(api_key_id, window_start)
);

create table if not exists public.file_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid references public.files(id) on delete set null,
  object_key text not null,
  reason text not null,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now()
);
create index if not exists file_cleanup_jobs_due_idx on public.file_cleanup_jobs(next_attempt_at) where completed_at is null;

-- RLS on all user/sensitive tables.
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.folders enable row level security;
alter table public.tasks enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.calendar_series enable row level security;
alter table public.calendar_exceptions enable row level security;
alter table public.files enable row level security;
alter table public.upload_intents enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.api_keys enable row level security;
alter table public.api_rate_windows enable row level security;
alter table public.file_cleanup_jobs enable row level security;

-- Explicit Data API grants for user-facing tables. Supabase changed default public-table exposure in 2026.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.chapters to authenticated;
grant select, insert, update, delete on public.folders to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.task_subtasks to authenticated;
grant select, insert, update, delete on public.calendar_series to authenticated;
grant select, insert, update, delete on public.calendar_exceptions to authenticated;
grant select, insert, update, delete on public.files to authenticated;
grant select, insert, update on public.upload_intents to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, update on public.notifications to authenticated;

-- No grants to anon for private study data. Internal api_keys/rate/cleanup tables are server-managed.

-- Representative owner policies. Production migration should generate the full explicit set for all operations.
create policy profiles_select_own on public.profiles
for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy subjects_select_own on public.subjects for select to authenticated using ((select auth.uid()) = user_id);
create policy subjects_insert_own on public.subjects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy subjects_update_own on public.subjects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy subjects_delete_own on public.subjects for delete to authenticated using ((select auth.uid()) = user_id);

create policy tasks_select_own on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy tasks_insert_own on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tasks_update_own on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tasks_delete_own on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);

create policy task_subtasks_select_own on public.task_subtasks for select to authenticated using ((select auth.uid()) = user_id);
create policy task_subtasks_insert_own on public.task_subtasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy task_subtasks_update_own on public.task_subtasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy task_subtasks_delete_own on public.task_subtasks for delete to authenticated using ((select auth.uid()) = user_id);

create policy calendar_series_select_own on public.calendar_series for select to authenticated using ((select auth.uid()) = user_id);
create policy calendar_series_insert_own on public.calendar_series for insert to authenticated with check ((select auth.uid()) = user_id);
create policy calendar_series_update_own on public.calendar_series for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy calendar_series_delete_own on public.calendar_series for delete to authenticated using ((select auth.uid()) = user_id);

create policy calendar_exceptions_select_own on public.calendar_exceptions for select to authenticated using ((select auth.uid()) = user_id);
create policy calendar_exceptions_insert_own on public.calendar_exceptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy calendar_exceptions_update_own on public.calendar_exceptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy calendar_exceptions_delete_own on public.calendar_exceptions for delete to authenticated using ((select auth.uid()) = user_id);

create policy chapters_select_own on public.chapters for select to authenticated using ((select auth.uid()) = user_id);
create policy chapters_insert_own on public.chapters for insert to authenticated with check ((select auth.uid()) = user_id);
create policy chapters_update_own on public.chapters for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy chapters_delete_own on public.chapters for delete to authenticated using ((select auth.uid()) = user_id);

create policy folders_select_own on public.folders for select to authenticated using ((select auth.uid()) = user_id);
create policy folders_insert_own on public.folders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy folders_update_own on public.folders for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy folders_delete_own on public.folders for delete to authenticated using ((select auth.uid()) = user_id);

create policy files_select_own on public.files for select to authenticated using ((select auth.uid()) = user_id);
create policy files_insert_own on public.files for insert to authenticated with check ((select auth.uid()) = user_id);
create policy files_update_own on public.files for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy files_delete_own on public.files for delete to authenticated using ((select auth.uid()) = user_id);

create policy upload_intents_select_own on public.upload_intents for select to authenticated using ((select auth.uid()) = user_id);
create policy upload_intents_insert_own on public.upload_intents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy upload_intents_update_own on public.upload_intents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy notification_preferences_select_own on public.notification_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy notification_preferences_insert_own on public.notification_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy notification_preferences_update_own on public.notification_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy notifications_select_own on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy notifications_update_own on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Still required during real implementation: updated_at triggers, atomic quota reservation/finalization functions,
-- safe server-only API-key management, notification-generation privileges, auth profile bootstrap, and database advisors.
-- Re-run negative RLS tests after every migration.
