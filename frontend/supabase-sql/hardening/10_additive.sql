-- =============================================================================
-- Slate hardening, part 1 of 2: ADDITIVE. Safe to run before the new app code ships.
-- Adds helper functions, fixes the follow loop in the database, cleans follow data.
-- Does NOT remove any existing access. Run part 2 (20_tighten.sql) only after the
-- new app code is live.
-- NOT APPLIED to production. Requires founder approval.
-- =============================================================================
begin;

-- ---------------------------------------------------------------------------
-- 0. Backup of the rows this file changes, in a schema the public API does not expose.
-- ---------------------------------------------------------------------------
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.follows_20261007 as select * from public.follows;
create table if not exists backup.server_follower_counts_20261007 as
  select id, follower_count from public.servers;

-- ---------------------------------------------------------------------------
-- 1. Ownership helpers used by access rules and RPCs.
--    SECURITY DEFINER so they can read rows the caller cannot see directly.
-- ---------------------------------------------------------------------------
create or replace function public.is_my_server(p_server_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.servers s
    where s.id = p_server_id and s.wallet_address = auth.uid()::text
  )
$$;

create or replace function public.manager_can_staff(p_server_id uuid, p_restaurant text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.restaurant_managers m
    where m.auth_id = auth.uid()::text
      and lower(m.restaurant_name) = lower(p_restaurant)
  ) and exists (
    select 1 from public.server_restaurants sr
    where sr.server_id = p_server_id
      and lower(sr.restaurant_name) = lower(p_restaurant)
  )
$$;

revoke all on function public.is_my_server(uuid) from public;
revoke all on function public.manager_can_staff(uuid, text) from public;
grant execute on function public.is_my_server(uuid) to anon, authenticated, service_role;
grant execute on function public.manager_can_staff(uuid, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Account linking by verified sign-in email, done server-side.
--    Replaces the browser's "look myself up by email, then write my auth id" steps,
--    which need the email column to be publicly readable and writable.
--    Same trust rule as today: only links a row that has no working owner yet.
-- ---------------------------------------------------------------------------
create or replace function public.link_my_server()
returns table (id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid text := auth.uid()::text;
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_id uuid;
begin
  if v_uid is null then return; end if;

  select s.id into v_id from public.servers s where s.wallet_address = v_uid limit 1;

  if v_id is null and v_email is not null then
    select s.id into v_id
    from public.servers s
    where lower(s.email) = v_email
      and (s.wallet_address is null
           or not exists (select 1 from auth.users u where u.id::text = s.wallet_address))
    order by s.created_at
    limit 1;
    if v_id is not null then
      update public.servers set wallet_address = v_uid where servers.id = v_id;
    end if;
  end if;

  return query select s.id, s.name from public.servers s where s.id = v_id;
end;
$$;

create or replace function public.link_my_manager()
returns table (id uuid, restaurant_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid text := auth.uid()::text;
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_id uuid;
begin
  if v_uid is null then return; end if;

  select m.id into v_id from public.restaurant_managers m where m.auth_id = v_uid limit 1;

  if v_id is null and v_email is not null then
    select m.id into v_id
    from public.restaurant_managers m
    where lower(m.email) = v_email and m.auth_id is null
    limit 1;
    if v_id is not null then
      update public.restaurant_managers set auth_id = v_uid where restaurant_managers.id = v_id;
    end if;
  end if;

  return query select m.id, m.restaurant_name from public.restaurant_managers m where m.id = v_id;
end;
$$;

revoke all on function public.link_my_server() from public;
revoke all on function public.link_my_manager() from public;
grant execute on function public.link_my_server() to authenticated, service_role;
grant execute on function public.link_my_manager() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Reads that need a hidden column: a guest's own vibe reports.
-- ---------------------------------------------------------------------------
create or replace function public.my_vibe_reports()
returns table (id uuid, restaurant_name text, vibe text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select v.id, v.restaurant_name, v.vibe, v.created_at
  from public.vibe_reports v
  where nullif(auth.jwt() ->> 'email', '') is not null
    and lower(v.reported_by) = lower(auth.jwt() ->> 'email')
  order by v.created_at desc
$$;
revoke all on function public.my_vibe_reports() from public;
grant execute on function public.my_vibe_reports() to authenticated, service_role;

-- Comment likes: one atomic +1 instead of an open "anyone can update comments" rule.
create or replace function public.like_venue_comment(p_comment_id uuid)
returns integer language sql security definer set search_path = public as $$
  update public.venue_comments set likes = coalesce(likes, 0) + 1
  where id = p_comment_id
  returning likes
$$;
revoke all on function public.like_venue_comment(uuid) from public;
grant execute on function public.like_venue_comment(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Follow loop.
--    a) New follows get the right status from the server's setting
--       (automatic -> approved, approval -> pending). Blocked guests cannot re-follow.
--       Servers cannot follow themselves.
--    b) follower_count is recomputed from approved follows on every change,
--       so it can no longer drift or be set by a browser.
--    c) approve/block run through the API with the service key only.
-- ---------------------------------------------------------------------------
-- Runs as the caller (not SECURITY DEFINER) so current_user is the real role.
-- Everything it reads is readable by a signed-in guest under the new rules.
create or replace function public.follows_set_status()
returns trigger language plpgsql set search_path = public as $$
declare
  v_mode text;
  v_wallet text;
begin
  if new.server_id is null then
    raise exception 'server_id is required';
  end if;

  select s.follow_approval, s.wallet_address into v_mode, v_wallet
  from public.servers s where s.id = new.server_id;
  if not found then
    raise exception 'server not found';
  end if;

  if v_wallet is not null and v_wallet = new.follower_id then
    raise exception 'cannot follow yourself';
  end if;

  if exists (
    select 1 from public.follows f
    where f.follower_id = new.follower_id and f.server_id = new.server_id and f.status = 'blocked'
  ) then
    raise exception 'blocked';
  end if;

  -- The server's setting decides; callers never choose the status of a new follow.
  -- (Blocking happens later, by update, through block_follower().)
  new.status := case when v_mode = 'approval' then 'pending' else 'approved' end;
  return new;
end;
$$;

create or replace function public.follows_sync_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
  v_id uuid;
begin
  if tg_op = 'INSERT' then
    v_ids := array[new.server_id];
  elsif tg_op = 'DELETE' then
    v_ids := array[old.server_id];
  else
    v_ids := array[old.server_id, new.server_id];
  end if;

  foreach v_id in array v_ids loop
    if v_id is not null then
      update public.servers
      set follower_count = (
        select count(*) from public.follows f where f.server_id = v_id and f.status = 'approved'
      )
      where id = v_id;
    end if;
  end loop;
  return null;
end;
$$;

drop trigger if exists follows_set_status on public.follows;
create trigger follows_set_status before insert on public.follows
  for each row execute function public.follows_set_status();

drop trigger if exists follows_sync_count on public.follows;
create trigger follows_sync_count after insert or update of status, server_id or delete on public.follows
  for each row execute function public.follows_sync_count();

-- Approval no longer adds to follower_count itself; the trigger recounts.
create or replace function public.approve_follow_request(p_follow_id uuid, p_server_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.follows set status = 'approved'
  where id = p_follow_id and server_id = p_server_id and status = 'pending';
end;
$$;

-- The block route calls this; it did not exist in the database.
create or replace function public.block_follower(p_follow_id uuid, p_server_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.follows set status = 'blocked'
  where id = p_follow_id and server_id = p_server_id;
end;
$$;

revoke all on function public.approve_follow_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.block_follower(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_follow_request(uuid, uuid) to service_role;
grant execute on function public.block_follower(uuid, uuid) to service_role;
-- Trigger functions run as part of the insert; callers never invoke them directly.
revoke all on function public.follows_sync_count() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Follow data cleanup (production data changes — listed in the report):
--    a) remove duplicate follow rows, keeping blocked > approved > pending, then oldest
--    b) one follow per guest per server from now on
--    c) follows stuck as pending on automatic-approval servers become approved
--    d) recount every server's follower_count from approved follows
-- ---------------------------------------------------------------------------
delete from public.follows f
using (
  select id, row_number() over (
    partition by follower_id, server_id
    order by case status when 'blocked' then 0 when 'approved' then 1 else 2 end, created_at, id
  ) as rn
  from public.follows
) d
where f.id = d.id and d.rn > 1;

create unique index if not exists follows_follower_server_key
  on public.follows (follower_id, server_id);

update public.follows f set status = 'approved'
from public.servers s
where s.id = f.server_id
  and f.status = 'pending'
  and coalesce(s.follow_approval, 'automatic') <> 'approval';

update public.servers s set follower_count = (
  select count(*) from public.follows f where f.server_id = s.id and f.status = 'approved'
);

commit;
