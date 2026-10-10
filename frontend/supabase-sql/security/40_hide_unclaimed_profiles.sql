-- 40: Hide worker profiles that have no sign-in account until they are claimed.
--     NOT YET RUN IN PRODUCTION — needs founder approval. Deletes nothing.
--
-- Founder decision (2026-10-09): the two profiles without sign-in accounts are excluded
-- from the Stranger Test — hidden from public discovery, no new ratings — until claimed.
--
-- What it does:
--   1. servers.hidden_until_claimed (default false; app users cannot read or write it).
--   2. Marks exactly the profiles whose wallet_address is not an account id AND whose email
--      matches no sign-in account (2 on 2026-10-09; stops if the count differs).
--   3. Restrictive SELECT policies for anon/authenticated:
--        servers            — a hidden profile is invisible until wallet_address is an
--                             account id (i.e. it has been claimed through link_my_server)
--        server_restaurants — that profile's workplaces are invisible with it, so it does
--                             not appear in staff lists, venue pages or Explore.
--      Server code (service role) and SECURITY DEFINER functions still see the rows, so
--      claiming (link_my_server) keeps working; after a claim the profile reappears by itself.
-- New ratings for these profiles are already refused by /api/submit-rating (no accepted
-- worker agreement is possible without an account). Existing ratings: none (checked 2026-10-09).
--
-- Order: independent of the app code; run after 39.
-- Rollback: 40_rollback_hide_unclaimed_profiles.sql

begin;

do $$
declare n int;
begin
  if exists (select 1 from pg_policy where polrelid = 'public.servers'::regclass and polname = 'servers_hide_unclaimed') then
    raise exception '40 already applied; stopping';
  end if;
  select count(*) into n
  from public.servers s
  where s.wallet_address !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and not exists (select 1 from auth.users u where lower(u.email) = lower(s.email));
  if n <> 2 then
    raise exception 'expected 2 profiles without a sign-in account, found %; stopping', n;
  end if;
end $$;

alter table public.servers add column hidden_until_claimed boolean not null default false;

update public.servers s set hidden_until_claimed = true
where s.wallet_address !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and not exists (select 1 from auth.users u where lower(u.email) = lower(s.email));

create or replace function public.server_listed(p_server_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select not s.hidden_until_claimed
           or s.wallet_address ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    from public.servers s where s.id = p_server_id
  ), true)
$$;
revoke all on function public.server_listed(uuid) from public;
grant execute on function public.server_listed(uuid) to anon, authenticated, service_role;

create policy servers_hide_unclaimed on public.servers
  as restrictive for select to anon, authenticated
  using (not hidden_until_claimed
         or wallet_address ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

create policy server_restaurants_hide_unclaimed on public.server_restaurants
  as restrictive for select to anon, authenticated
  using (public.server_listed(server_id));

commit;

-- Verify after running (read-only):
--   select count(*) from public.servers where hidden_until_claimed;                       -- 2
--   set role anon; select count(*) from public.servers; reset role;                        -- total - 2
--   select has_column_privilege('anon','public.servers','hidden_until_claimed','SELECT');  -- false
