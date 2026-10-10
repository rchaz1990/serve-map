-- Participant deletion — STEP 1: preview (read-only). See docs/PARTICIPANT_DATA_DELETION.md.
-- Replace the two placeholders, run, and copy the counts into step 2.
with p as (
  select lower(btrim('PARTICIPANT_EMAIL')) as email, 'PARTICIPANT_AUTH_ID'::text as uid
), w as (
  select s.id from public.servers s, p where s.wallet_address = p.uid
)
select
  (select count(*) from auth.users u, p where u.id::text = p.uid and lower(u.email) = p.email)        as account_matches,      -- must be 1
  (select count(*) from public.restaurant_managers m, p where m.auth_id = p.uid)                      as manager_rows,         -- must be 0 (managers: handle separately)
  (select count(*) from w)                                                                            as worker_profiles,      -- 0 = guest, 1 = worker
  -- what the person wrote / did
  (select count(*) from public.ratings r, p where lower(r.guest_email) = p.email or r.guest_id = p.uid) as ratings_written,
  (select count(*) from public.follows f, p where f.follower_id = p.uid or lower(f.follower_email) = p.email) as follows_made,
  (select count(*) from public.notifications n, p where lower(n.recipient_email) = p.email)          as notifications_received,
  (select count(*) from public.vibe_reports v, p where lower(v.reported_by) = p.email)              as vibe_reports,
  (select count(*) from public.venue_comments c, p where lower(c.commenter_email) = p.email)        as venue_comments,
  (select count(*) from public.guest_rewards g, p where lower(g.email) = p.email)                   as guest_points_rows,
  -- worker profile and what hangs off it
  (select count(*) from public.ratings r where r.server_id in (select id from w))                   as ratings_on_profile,
  (select count(*) from public.follows f where f.server_id in (select id from w))                   as followers,
  (select count(*) from public.notifications n where n.server_id in (select id from w))             as notifications_about_profile,
  (select count(*) from public.server_restaurants x where x.server_id in (select id from w))        as workplaces,
  (select count(*) from public.shifts x where x.server_id in (select id from w))                    as shifts,
  (select count(*) from public.suggestions x where x.server_id in (select id from w))               as suggestions,
  (select count(*) from public.qr_scans x where x.server_id in (select id from w))                  as qr_scans_cascade,
  (select count(*) from public.recruiting_contacts x where x.server_id in (select id from w))       as recruiting_contacts_cascade,
  (select count(*) from public.serve_ledger l, p where l.account_id in (select id from w) or lower(l.email) = p.email) as ledger_rows_kept,
  (select string_agg(s.photo_url, ' ') from public.servers s where s.id in (select id from w))      as photo_to_remove_in_storage;
