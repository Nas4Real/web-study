-- Story 05-05: owner-scoped file moves and reliable logical deletion.

create function public.move_owned_file(
  p_user_id uuid,
  p_file_id uuid,
  p_chapter_id uuid,
  p_folder_id uuid
)
returns setof public.files
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise insufficient_privilege using message = 'file owner mismatch';
  end if;

  return query
  update public.files as file
  set chapter_id = p_chapter_id,
      folder_id = p_folder_id
  where file.id = p_file_id
    and file.user_id = p_user_id
    and file.upload_state = 'ready'
  returning file.*;
end;
$$;

revoke all on function public.move_owned_file(uuid, uuid, uuid, uuid)
from public, anon;
grant execute on function public.move_owned_file(uuid, uuid, uuid, uuid)
to authenticated;

create function public.delete_owned_file(p_user_id uuid, p_file_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.files;
begin
  if (select auth.uid()) is distinct from p_user_id then
    raise insufficient_privilege using message = 'file owner mismatch';
  end if;

  select file.* into target
  from public.files as file
  where file.id = p_file_id and file.user_id = p_user_id
  for update;

  if not found then
    return false;
  end if;
  if target.upload_state in ('deleting', 'deleted') then
    return true;
  end if;
  if target.upload_state <> 'ready' then
    return false;
  end if;

  perform 1 from public.profiles as profile
  where profile.id = p_user_id
  for update;

  update public.profiles
  set storage_used_bytes = greatest(0, storage_used_bytes - target.size_bytes)
  where id = p_user_id;

  update public.files
  set upload_state = 'deleting', deleted_at = now()
  where id = p_file_id and user_id = p_user_id;

  insert into public.file_cleanup_jobs (user_id, file_id, object_key, reason)
  values (p_user_id, p_file_id, target.object_key, 'deleted')
  on conflict (file_id) where completed_at is null do nothing;

  return true;
end;
$$;

revoke all on function public.delete_owned_file(uuid, uuid)
from public, anon;
grant execute on function public.delete_owned_file(uuid, uuid)
to authenticated;
