-- Reduced Story 08-01: restore least-privilege grants for the two tables that
-- predate the explicit authenticated-role revocation pattern used elsewhere.

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, display_name, timezone, avatar_object_key)
on public.profiles to authenticated;
grant update (display_name, timezone, avatar_object_key)
on public.profiles to authenticated;

revoke all on table public.subjects from public, anon, authenticated;
grant select, delete on table public.subjects to authenticated;
grant insert (user_id, name, color, icon, position)
on public.subjects to authenticated;
grant update (name, color, icon, position)
on public.subjects to authenticated;
