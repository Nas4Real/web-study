-- Story 05-04: verified upload completion, stale reservation expiry, and reliable cleanup.

create table public.file_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_id uuid not null,
  object_key text not null,
  reason text not null check (reason in ('expired', 'verification_failed', 'quota_exceeded', 'deleted')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  next_attempt_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  constraint file_cleanup_jobs_file_owner_fk
    foreign key (file_id, user_id) references public.files (id, user_id) on delete cascade,
  constraint file_cleanup_jobs_object_key_owned check (
    object_key = 'users/' || user_id::text || '/files/' || file_id::text
  )
);

create unique index file_cleanup_jobs_active_file_uidx
on public.file_cleanup_jobs (file_id) where completed_at is null;
create index file_cleanup_jobs_due_idx
on public.file_cleanup_jobs (next_attempt_at, id)
where completed_at is null and attempts < 20;

alter table public.file_cleanup_jobs enable row level security;
revoke all on table public.file_cleanup_jobs from public, anon, authenticated;

create function public.get_file_upload_completion_target(p_user_id uuid, p_file_id uuid)
returns table (
  file_id uuid, subject_id uuid, chapter_id uuid, folder_id uuid,
  original_filename text, display_name text, object_key text, mime_type text,
  extension text, size_bytes bigint, upload_state text, created_at timestamptz,
  expected_mime_type text, intent_status text, expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select file.id, file.subject_id, file.chapter_id, file.folder_id,
    file.original_filename, file.display_name, file.object_key, file.mime_type,
    file.extension, file.size_bytes, file.upload_state, file.created_at,
    intent.expected_mime_type, intent.status, intent.expires_at
  from public.files as file
  join public.upload_intents as intent
    on intent.file_id = file.id and intent.user_id = file.user_id
  where file.id = p_file_id
    and file.user_id = p_user_id
    and (select auth.uid()) = p_user_id;
$$;

revoke all on function public.get_file_upload_completion_target(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.get_file_upload_completion_target(uuid, uuid)
to authenticated;

create function public.finalize_file_upload(
  p_user_id uuid,
  p_file_id uuid,
  p_actual_size_bytes bigint,
  p_actual_mime_type text
)
returns table (
  result_code text,
  file_id uuid, subject_id uuid, chapter_id uuid, folder_id uuid,
  original_filename text, display_name text, mime_type text, extension text,
  size_bytes bigint, upload_state text, created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_file public.files;
  locked_intent public.upload_intents;
  profile_row public.profiles;
  failure_reason text;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise insufficient_privilege using message = 'upload owner mismatch';
  end if;

  select file.* into locked_file
  from public.files as file
  where file.id = p_file_id and file.user_id = p_user_id
  for update;

  if not found then
    return query select 'NOT_FOUND', null::uuid, null::uuid, null::uuid, null::uuid,
      null::text, null::text, null::text, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;

  select intent.* into locked_intent
  from public.upload_intents as intent
  where intent.file_id = locked_file.id and intent.user_id = locked_file.user_id
  for update;

  if not found then
    return query select 'NOT_FOUND', null::uuid, null::uuid, null::uuid, null::uuid,
      null::text, null::text, null::text, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;

  if locked_intent.status = 'completed' and locked_file.upload_state = 'ready' then
    return query select 'READY', locked_file.id, locked_file.subject_id, locked_file.chapter_id,
      locked_file.folder_id, locked_file.original_filename, locked_file.display_name,
      locked_file.mime_type, locked_file.extension, locked_file.size_bytes,
      locked_file.upload_state, locked_file.created_at;
    return;
  end if;
  if locked_intent.status <> 'pending' then
    return query select
      case when locked_intent.status = 'expired' then 'EXPIRED' else 'VERIFICATION_FAILED' end,
      null::uuid, null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::text, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;

  select profile.* into profile_row
  from public.profiles as profile
  where profile.id = p_user_id
  for update;

  if locked_intent.expires_at <= now() then
    failure_reason := 'expired';
  elsif p_actual_size_bytes is null or p_actual_size_bytes < 1 or p_actual_size_bytes > 52428800 then
    failure_reason := 'verification_failed';
  elsif p_actual_mime_type is not null and lower(p_actual_mime_type) <> locked_intent.expected_mime_type then
    failure_reason := 'verification_failed';
  elsif profile_row.storage_used_bytes + profile_row.storage_reserved_bytes
    - locked_intent.declared_size_bytes + p_actual_size_bytes > profile_row.storage_quota_bytes then
    failure_reason := 'quota_exceeded';
  end if;

  if failure_reason is not null then
    update public.profiles
    set storage_reserved_bytes = storage_reserved_bytes - locked_intent.declared_size_bytes
    where id = p_user_id;
    update public.upload_intents
    set status = case when failure_reason = 'expired' then 'expired' else 'failed' end
    where id = locked_intent.id;
    update public.files set upload_state = 'deleting' where id = locked_file.id;
    insert into public.file_cleanup_jobs (user_id, file_id, object_key, reason)
    select p_user_id, locked_file.id, locked_file.object_key, failure_reason
    where not exists (
      select 1 from public.file_cleanup_jobs as existing
      where existing.file_id = locked_file.id and existing.completed_at is null
    );
    return query select
      case failure_reason when 'expired' then 'EXPIRED'
        when 'quota_exceeded' then 'QUOTA_EXCEEDED' else 'VERIFICATION_FAILED' end,
      null::uuid, null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::text, null::text, null::bigint, null::text, null::timestamptz;
    return;
  end if;

  update public.profiles
  set storage_reserved_bytes = storage_reserved_bytes - locked_intent.declared_size_bytes,
      storage_used_bytes = storage_used_bytes + p_actual_size_bytes
  where id = p_user_id;
  update public.upload_intents
  set status = 'completed', completed_at = now()
  where id = locked_intent.id;
  update public.files
  set size_bytes = p_actual_size_bytes, upload_state = 'ready'
  where id = locked_file.id
  returning * into locked_file;

  return query select 'READY', locked_file.id, locked_file.subject_id, locked_file.chapter_id,
    locked_file.folder_id, locked_file.original_filename, locked_file.display_name,
    locked_file.mime_type, locked_file.extension, locked_file.size_bytes,
    locked_file.upload_state, locked_file.created_at;
end;
$$;

revoke all on function public.finalize_file_upload(uuid, uuid, bigint, text)
from public, anon, authenticated;
grant execute on function public.finalize_file_upload(uuid, uuid, bigint, text)
to authenticated;

create function public.expire_file_uploads(p_limit integer default 50)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  expiring_file public.files;
  expiring_intent public.upload_intents;
  expired_count integer := 0;
begin
  for candidate in
    select intent.file_id
    from public.upload_intents as intent
    where intent.status = 'pending' and intent.expires_at <= now()
    order by intent.expires_at, intent.id
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
  loop
    select file.* into expiring_file
    from public.files as file
    where file.id = candidate.file_id
    for update skip locked;
    if not found then continue; end if;

    select intent.* into expiring_intent
    from public.upload_intents as intent
    where intent.file_id = expiring_file.id
      and intent.user_id = expiring_file.user_id
      and intent.status = 'pending'
      and intent.expires_at <= now()
    for update skip locked;
    if not found then continue; end if;

    perform 1 from public.profiles where id = expiring_intent.user_id for update;
    update public.profiles
    set storage_reserved_bytes = storage_reserved_bytes - expiring_intent.declared_size_bytes
    where id = expiring_intent.user_id;
    update public.upload_intents set status = 'expired' where id = expiring_intent.id;
    update public.files set upload_state = 'deleting' where id = expiring_file.id;
    insert into public.file_cleanup_jobs (user_id, file_id, object_key, reason)
    select expiring_file.user_id, expiring_file.id, expiring_file.object_key, 'expired'
    where not exists (
      select 1 from public.file_cleanup_jobs as existing
      where existing.file_id = expiring_file.id and existing.completed_at is null
    );
    expired_count := expired_count + 1;
  end loop;
  return expired_count;
end;
$$;

revoke all on function public.expire_file_uploads(integer) from public, anon, authenticated;
grant execute on function public.expire_file_uploads(integer) to service_role;

create function public.claim_file_cleanup_jobs(p_limit integer default 50)
returns table (id uuid, object_key text)
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    select job.id
    from public.file_cleanup_jobs as job
    where job.completed_at is null and job.attempts < 20 and job.next_attempt_at <= now()
    order by job.next_attempt_at, job.id
    for update skip locked
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
  )
  update public.file_cleanup_jobs as job
  set attempts = job.attempts + 1,
      next_attempt_at = now() + interval '5 minutes'
  from claimed
  where job.id = claimed.id
  returning job.id, job.object_key;
$$;

revoke all on function public.claim_file_cleanup_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_file_cleanup_jobs(integer) to service_role;

create function public.complete_file_cleanup_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.file_cleanup_jobs
  set completed_at = now(), last_error_code = null
  where id = p_job_id and completed_at is null;
  get diagnostics affected = row_count;
  if affected = 1 then
    update public.files as file
    set upload_state = 'deleted', deleted_at = now()
    from public.file_cleanup_jobs as job
    where job.id = p_job_id and file.id = job.file_id and file.upload_state = 'deleting';
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.complete_file_cleanup_job(uuid) from public, anon, authenticated;
grant execute on function public.complete_file_cleanup_job(uuid) to service_role;

create function public.retry_file_cleanup_job(p_job_id uuid, p_error_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if p_error_code <> 'PROVIDER_UNAVAILABLE' then
    raise check_violation using message = 'invalid cleanup error code';
  end if;
  update public.file_cleanup_jobs
  set last_error_code = p_error_code,
      next_attempt_at = now() + make_interval(secs => least(3600, 30 * (2 ^ least(attempts, 7))))
  where id = p_job_id and completed_at is null and attempts < 20;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.retry_file_cleanup_job(uuid, text) from public, anon, authenticated;
grant execute on function public.retry_file_cleanup_job(uuid, text) to service_role;
