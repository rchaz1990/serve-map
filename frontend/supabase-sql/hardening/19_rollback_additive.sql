-- Rollback for 10_additive.sql. Run 29_rollback_tighten.sql first if part 2 was applied.
-- Removes the new functions and triggers and restores the original follow data
-- and follower counts from the backup taken by 10_additive.sql.
begin;

drop trigger if exists follows_set_status on public.follows;
drop trigger if exists follows_sync_count on public.follows;
drop function if exists public.follows_set_status();
drop function if exists public.follows_sync_count();
drop index if exists public.follows_follower_server_key;

-- Restore follows and follower counts as they were before part 1.
-- (Follows created after part 1 ran are kept; rows part 1 removed or changed come back.)
delete from public.follows f using backup.follows_20261007 b where f.id = b.id;
insert into public.follows select * from backup.follows_20261007;
update public.servers s set follower_count = b.follower_count
from backup.server_follower_counts_20261007 b where b.id = s.id;

-- Original approve function (increments follower_count itself); still service-key only.
create or replace function public.approve_follow_request(p_follow_id uuid, p_server_id uuid)
returns void language plpgsql security definer as $function$
begin
  update follows set status = 'approved' where id = p_follow_id and server_id = p_server_id;
  update servers set follower_count = coalesce(follower_count, 0) + 1 where id = p_server_id;
end;
$function$;
revoke all on function public.approve_follow_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_follow_request(uuid, uuid) to service_role;

drop function if exists public.block_follower(uuid, uuid);
drop function if exists public.like_venue_comment(uuid);
drop function if exists public.my_vibe_reports();
drop function if exists public.link_my_server();
drop function if exists public.link_my_manager();
drop function if exists public.is_my_server(uuid);
drop function if exists public.manager_can_staff(uuid, text);

commit;
-- The backup schema is left in place; drop it manually once no longer needed.
