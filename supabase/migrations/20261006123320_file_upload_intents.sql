-- Story 05-03: atomic quota reservation and private upload intents.

create table public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null,
  chapter_id uuid,
  folder_id uuid,
  original_filename text not null check (
    original_filename = btrim(original_filename)
    and char_length(original_filename) between 1 and 512
    and original_filename !~ E'[\\\\/\\x00-\\x1F\\x7F]'
  ),
  display_name text not null check (
    display_name = btrim(display_name)
    and char_length(display_name) between 1 and 512
  ),
  object_key text not null unique,
  mime_type text not null,
  extension text not null check (extension in ('pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg', 'jpeg')),
  size_bytes bigint not null check (size_bytes between 1 and 52428800),
  upload_state text not null default 'pending'
    check (upload_state in ('pending', 'ready', 'failed', 'deleting', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  constraint files_mime_extension_match check (
    (extension = 'pdf' and mime_type = 'application/pdf')
    or (extension = 'docx' and mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    or (extension = 'xlsx' and mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    or (extension = 'pptx' and mime_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    or (extension = 'png' and mime_type = 'image/png')
    or (extension in ('jpg', 'jpeg') and mime_type = 'image/jpeg')
  ),
  constraint files_filename_extension_match check (
    lower(substring(original_filename from '\.([^.]+)$')) = extension
  ),
  constraint files_object_key_owned check (
    object_key = 'users/' || user_id::text || '/files/' || id::text
  ),
  constraint files_subject_owner_fk
    foreign key (subject_id, user_id)
    references public.subjects (id, user_id) on delete restrict,
  constraint files_chapter_subject_owner_fk
    foreign key (chapter_id, user_id, subject_id)
    references public.chapters (id, user_id, subject_id) on delete restrict,
  constraint files_folder_subject_owner_fk
    foreign key (folder_id, user_id, subject_id)
    references public.folders (id, user_id, subject_id) on delete restrict
);

create index files_user_id_idx on public.files (user_id);
create index files_subject_created_idx on public.files (user_id, subject_id, created_at desc, id);
create index files_chapter_id_idx on public.files (chapter_id);
create index files_folder_id_idx on public.files (folder_id);

create table public.upload_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_id uuid not null,
  declared_size_bytes bigint not null check (declared_size_bytes between 1 and 52428800),
  expected_mime_type text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired', 'failed')),
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (file_id),
  constraint upload_intents_file_owner_fk
    foreign key (file_id, user_id)
    references public.files (id, user_id) on delete cascade,
  constraint upload_intents_completion_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index upload_intents_user_id_idx on public.upload_intents (user_id);
create index upload_intents_expiry_idx on public.upload_intents (expires_at) where status = 'pending';

alter table public.files enable row level security;
alter table public.upload_intents enable row level security;

revoke all on table public.files from anon;
revoke all on table public.files from authenticated;
revoke all on table public.upload_intents from anon;
revoke all on table public.upload_intents from authenticated;
grant select on table public.files to authenticated;
revoke update (storage_quota_bytes, storage_used_bytes, storage_reserved_bytes)
on table public.profiles from authenticated;

create policy files_select_own
on public.files for select to authenticated
using ((select auth.uid()) = user_id);

create trigger files_set_updated_at
before update on public.files
for each row execute function public.set_updated_at();

create function public.validate_file_location()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  folder_chapter_id uuid;
begin
  if new.folder_id is null then
    return new;
  end if;

  select folder.chapter_id
  into folder_chapter_id
  from public.folders as folder
  where folder.id = new.folder_id
    and folder.user_id = new.user_id
    and folder.subject_id = new.subject_id;

  if not found then
    raise foreign_key_violation using message = 'file folder not found';
  end if;
  if folder_chapter_id is distinct from new.chapter_id then
    raise foreign_key_violation using message = 'file folder must share chapter';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_file_location() from public, anon, authenticated;

create trigger files_validate_location
before insert or update of user_id, subject_id, chapter_id, folder_id
on public.files
for each row execute function public.validate_file_location();

create function public.reserve_file_upload(
  p_user_id uuid,
  p_subject_id uuid,
  p_chapter_id uuid,
  p_folder_id uuid,
  p_filename text,
  p_mime_type text,
  p_extension text,
  p_size_bytes bigint
)
returns table (
  intent_id uuid,
  file_id uuid,
  subject_id uuid,
  chapter_id uuid,
  folder_id uuid,
  original_filename text,
  display_name text,
  object_key text,
  mime_type text,
  extension text,
  size_bytes bigint,
  upload_state text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  available_quota bigint;
  created_file public.files;
  created_intent public.upload_intents;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise insufficient_privilege using message = 'upload owner mismatch';
  end if;

  select profile.storage_quota_bytes - profile.storage_used_bytes - profile.storage_reserved_bytes
  into available_quota
  from public.profiles as profile
  where profile.id = p_user_id
  for update;

  if not found then
    raise insufficient_privilege using message = 'upload profile not found';
  end if;
  if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 52428800 then
    raise check_violation using message = 'invalid upload size';
  end if;
  if available_quota < p_size_bytes then
    raise exception using errcode = 'WSQ01', message = 'storage quota exceeded';
  end if;

  created_file.id := gen_random_uuid();
  insert into public.files (
    id, user_id, subject_id, chapter_id, folder_id, original_filename,
    display_name, object_key, mime_type, extension, size_bytes, upload_state
  ) values (
    created_file.id, p_user_id, p_subject_id, p_chapter_id, p_folder_id, p_filename,
    p_filename, 'users/' || p_user_id::text || '/files/' || created_file.id::text,
    p_mime_type, p_extension, p_size_bytes, 'pending'
  ) returning * into created_file;

  insert into public.upload_intents (
    user_id, file_id, declared_size_bytes, expected_mime_type, expires_at
  ) values (
    p_user_id, created_file.id, p_size_bytes, p_mime_type, now() + interval '10 minutes'
  ) returning * into created_intent;

  update public.profiles
  set storage_reserved_bytes = storage_reserved_bytes + p_size_bytes
  where id = p_user_id;

  return query select
    created_intent.id, created_file.id, created_file.subject_id, created_file.chapter_id,
    created_file.folder_id, created_file.original_filename, created_file.display_name,
    created_file.object_key, created_file.mime_type, created_file.extension,
    created_file.size_bytes, created_file.upload_state, created_file.created_at,
    created_intent.expires_at;
end;
$$;

revoke all on function public.reserve_file_upload(uuid, uuid, uuid, uuid, text, text, text, bigint)
from public, anon, authenticated;
grant execute on function public.reserve_file_upload(uuid, uuid, uuid, uuid, text, text, text, bigint)
to authenticated;
