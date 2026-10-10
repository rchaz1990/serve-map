-- 38: Follow emails go only to the follower's own account address, and only after the
--     follower knowingly opted in.  NOT YET RUN IN PRODUCTION — needs approval.
--
-- Problem (verified 2026-10-09): the app stored whatever follower_email the browser sent,
-- and notify-followers emailed that address on every shift start. Any signed-in person
-- could enrol any third party in "X is working at Y now" emails.
--
-- Fix:
--   1. A trigger sets follows.follower_email from the follower's own account (auth.users)
--      on insert and on any change to follower_id / follower_email. Whatever the client
--      sends is ignored.
--   2. A follow requires that the account has acknowledged the Terms/Privacy (recorded
--      server-side in app_metadata by the app). Otherwise the insert is refused.
--   3. Email opt-in is explicit: the client sends notify_email = true only from the
--      follow confirmation ("Follow and email me"); the trigger stamps email_opt_in_at.
--      Clients cannot write email_opt_in_at.
--   4. notification_recipients(server) returns the current account email of approved,
--      opted-in followers only. Server-only. notify-followers uses it.
--   5. Workers no longer receive followers' email addresses: app users lose SELECT on
--      follows.follower_email (all other columns stay readable under the existing RLS),
--      and follower_list(server, status) (server-only) returns a display label —
--      first name + last initial from the account, or "Guest ····<4 chars>" — instead.
--
-- Existing follows are NOT changed. They have no email_opt_in_at, so after the matching
-- code deploys they stop receiving shift emails until the follower confirms again.
-- (Optional backfill is a separate founder decision: 38_optional_backfill_existing_follows.sql.)
--
-- Rollback: 38_rollback_follow_email_consent.sql (and revert the matching code).

begin;

-- Pre-check: the follow-status trigger is the version this was built against.
do $$
begin
  if (select md5(prosrc) from pg_proc where oid = 'public.follows_set_status()'::regprocedure)
     <> '97d59eb4920ded8da8a5b66a11af7102' then
    raise exception 'follows_set_status is not the expected version; stopping';
  end if;
end $$;

alter table public.follows
  add column notify_email boolean not null default false,
  add column email_opt_in_at timestamptz;

-- Clients may request email opt-in on insert; they cannot set the timestamp.
grant insert (notify_email) on public.follows to authenticated;

create or replace function public.follows_from_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_meta jsonb;
begin
  select u.email, u.raw_app_meta_data into v_email, v_meta
  from auth.users u
  where u.id::text = new.follower_id;
  if v_email is null then
    raise exception 'follower account not found';
  end if;

  -- Always the follower's own address, never a client-supplied one.
  new.follower_email := lower(v_email);

  if tg_op = 'INSERT' then
    if coalesce(v_meta ->> 'legal_guest_version', v_meta ->> 'legal_worker_version') is null then
      raise exception 'terms_not_accepted: agree to the Terms of Service and Privacy Policy before following';
    end if;
    new.email_opt_in_at := case when new.notify_email then now() else null end;
  else
    -- Opt-in can't be granted by an update (there is no client update path, but be explicit).
    new.notify_email := old.notify_email;
    new.email_opt_in_at := old.email_opt_in_at;
  end if;
  return new;
end;
$$;
revoke all on function public.follows_from_account() from public, anon, authenticated;

create trigger follows_account_email
  before insert or update of follower_id, follower_email, notify_email, email_opt_in_at
  on public.follows
  for each row execute function public.follows_from_account();

-- Recipients for a shift / job notification: approved, opted-in followers, at their
-- current account address. Server-only.
create or replace function public.notification_recipients(p_server_id uuid)
returns table (email text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct lower(u.email)
  from public.follows f
  join auth.users u on u.id::text = f.follower_id
  where f.server_id = p_server_id
    and f.status = 'approved'
    and f.email_opt_in_at is not null
    and u.email is not null
$$;
revoke all on function public.notification_recipients(uuid) from public, anon, authenticated;
grant execute on function public.notification_recipients(uuid) to service_role;

-- 5. Follower emails are not readable by app users (workers read their followers via
--    follower_list through the server). Table-level SELECT must become column-level.
revoke select on public.follows from anon, authenticated;
grant select (id, created_at, follower_id, follower_type, server_id, status, notify_email, email_opt_in_at)
  on public.follows to authenticated;

create or replace function public.follower_list(p_server_id uuid, p_status text)
returns table (id uuid, follower_label text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select f.id,
         coalesce(
           nullif(btrim(
             split_part(btrim(u.raw_user_meta_data ->> 'full_name'), ' ', 1) ||
             case when btrim(u.raw_user_meta_data ->> 'full_name') like '% %'
                  then ' ' || left(regexp_replace(btrim(u.raw_user_meta_data ->> 'full_name'), '^.* ', ''), 1) || '.'
                  else '' end
           ), ''),
           'Guest ····' || right(f.follower_id, 4)
         ) as follower_label,
         f.created_at
  from public.follows f
  left join auth.users u on u.id::text = f.follower_id
  where f.server_id = p_server_id and f.status = p_status
  order by f.created_at desc
$$;
revoke all on function public.follower_list(uuid, text) from public, anon, authenticated;
grant execute on function public.follower_list(uuid, text) to service_role;

commit;

-- Verify after running (read-only):
--   select md5(prosrc) from pg_proc where proname in ('follows_from_account','notification_recipients');
--   select has_function_privilege('authenticated','public.notification_recipients(uuid)','execute');   -- false
--   select has_column_privilege('authenticated','public.follows','email_opt_in_at','INSERT');         -- false
--   select has_column_privilege('authenticated','public.follows','notify_email','INSERT');            -- true
--   select count(*) from public.follows where email_opt_in_at is not null;                            -- 0
--   select has_column_privilege('authenticated','public.follows','follower_email','SELECT');          -- false
--   select has_function_privilege('authenticated','public.follower_list(uuid,text)','execute');      -- false
