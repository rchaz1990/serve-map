-- =============================================================================
-- Slate hardening, part 2 of 2: TIGHTEN. Run only after 10_additive.sql has run
-- AND the matching app code is live (old code breaks under these rules).
-- Replaces every open browser rule with owner-only writes and hides personal
-- columns (emails, phones, GPS) from public reads.
-- Server routes use the service key and are unaffected.
-- NOT APPLIED to production. Requires founder approval.
-- =============================================================================
begin;

-- 1. Drop every existing browser access rule on the affected tables.
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('servers','ratings','shifts','server_restaurants','guest_rewards',
                        'notifications','venue_comments','vibe_reports','follows',
                        'suggestions','restaurant_managers','restaurants')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- 2. Start from no browser privileges on any public table, then grant precisely.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- servers: public profile columns only (no email, no phone). Owners edit their
-- own profile settings; reputation numbers are written only by server code.
grant select (id, created_at, name, role, bio, photo_url, wallet_address, follower_count,
  average_rating, total_ratings, serve_balance, is_founding_member, notify_mainnet, instagram,
  years_experience, specialties, open_to_opportunities, serve_balance_lifetime,
  follow_approval, profile_visibility, is_test)
  on public.servers to anon, authenticated;
grant update (specialties, open_to_opportunities, follow_approval, profile_visibility,
  photo_url, bio, instagram, years_experience)
  on public.servers to authenticated;
create policy servers_read on public.servers for select to anon, authenticated using (true);
create policy servers_owner_update on public.servers for update to authenticated
  using (wallet_address = auth.uid()::text) with check (wallet_address = auth.uid()::text);

-- ratings: readable without the guest's email; written only by /api/submit-rating.
grant select (id, created_at, server_id, restaurant_name, score, comment, verification_method,
  gps_verified, guest_id, tags, serve_reward, rating_stars, is_test)
  on public.ratings to anon, authenticated;
create policy ratings_read on public.ratings for select to anon, authenticated using (true);

-- follows: a guest sees and removes their own follows; a server sees its followers.
-- Status is set by trigger; approve/block go through the API.
grant select on public.follows to authenticated;
grant insert (follower_id, follower_email, server_id, follower_type) on public.follows to authenticated;
grant delete on public.follows to authenticated;
create policy follows_read_own on public.follows for select to authenticated
  using (follower_id = auth.uid()::text or public.is_my_server(server_id));
create policy follows_insert_self on public.follows for insert to authenticated
  with check (follower_id = auth.uid()::text);
create policy follows_delete_own on public.follows for delete to authenticated
  using (follower_id = auth.uid()::text and status <> 'blocked');

-- shifts: public "who's working tonight" without GPS; a server or that venue's
-- manager starts and ends shifts.
grant select (id, server_id, restaurant_name, started_at, ended_at, is_active, vibe, bar_seats,
  wait_time, gps_verified, distance_meters, activated_by)
  on public.shifts to anon, authenticated;
grant insert (server_id, restaurant_name, started_at, is_active, activated_by, gps_verified,
  distance_meters, user_lat, user_lng, vibe, bar_seats, wait_time)
  on public.shifts to authenticated;
grant update (is_active, ended_at, vibe, bar_seats, wait_time) on public.shifts to authenticated;
create policy shifts_read on public.shifts for select to anon, authenticated using (true);
create policy shifts_insert_owner on public.shifts for insert to authenticated
  with check (public.is_my_server(server_id) or public.manager_can_staff(server_id, restaurant_name));
create policy shifts_update_owner on public.shifts for update to authenticated
  using (public.is_my_server(server_id) or public.manager_can_staff(server_id, restaurant_name))
  with check (public.is_my_server(server_id) or public.manager_can_staff(server_id, restaurant_name));

-- server_restaurants: public; each server manages their own jobs.
grant select on public.server_restaurants to anon, authenticated;
grant insert, update, delete on public.server_restaurants to authenticated;
create policy server_restaurants_read on public.server_restaurants for select to anon, authenticated using (true);
create policy server_restaurants_insert_own on public.server_restaurants for insert to authenticated
  with check (public.is_my_server(server_id));
create policy server_restaurants_update_own on public.server_restaurants for update to authenticated
  using (public.is_my_server(server_id)) with check (public.is_my_server(server_id));
create policy server_restaurants_delete_own on public.server_restaurants for delete to authenticated
  using (public.is_my_server(server_id));

-- restaurant_managers: venue names are public, emails are not. Signup and the
-- restaurant waitlist can add a row; linking an account goes through link_my_manager().
grant select (id, created_at, name, restaurant_name, auth_id, role) on public.restaurant_managers to anon, authenticated;
grant insert (email, name, restaurant_name, auth_id, role) on public.restaurant_managers to anon, authenticated;
create policy managers_read on public.restaurant_managers for select to anon, authenticated using (true);
create policy managers_insert_self on public.restaurant_managers for insert to anon, authenticated
  with check (auth_id is null or auth_id = auth.uid()::text);

-- notifications: each person reads and marks read only their own.
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;
create policy notifications_read_own on public.notifications for select to authenticated
  using (lower(recipient_email) = lower(auth.jwt() ->> 'email'));
create policy notifications_mark_read_own on public.notifications for update to authenticated
  using (lower(recipient_email) = lower(auth.jwt() ->> 'email'))
  with check (lower(recipient_email) = lower(auth.jwt() ->> 'email'));

-- venue_comments: public without commenter emails; likes via like_venue_comment().
grant select (id, created_at, restaurant_name, comment, commenter_name, likes) on public.venue_comments to anon, authenticated;
grant insert (restaurant_name, comment, commenter_email, commenter_name) on public.venue_comments to anon, authenticated;
create policy venue_comments_read on public.venue_comments for select to anon, authenticated using (true);
create policy venue_comments_insert on public.venue_comments for insert to anon, authenticated with check (true);

-- vibe_reports: public without reporter email or GPS; written only by /api/verify-vibe.
grant select (id, created_at, restaurant_id, restaurant_name, vibe, bar_seats, wait_time,
  gps_verified, distance_meters, is_flagged, integrity_score, qr_verified, serve_reward)
  on public.vibe_reports to anon, authenticated;
create policy vibe_reports_read on public.vibe_reports for select to anon, authenticated using (true);

-- guest_rewards: each guest reads only their own balance.
grant select on public.guest_rewards to authenticated;
create policy guest_rewards_read_own on public.guest_rewards for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- suggestions: a server submits suggestions as themselves.
grant insert (server_id, server_name, title, description, status) on public.suggestions to authenticated;
create policy suggestions_insert_own on public.suggestions for insert to authenticated
  with check (public.is_my_server(server_id) and coalesce(status, 'pending') = 'pending');

-- restaurants: public read, unchanged.
grant select on public.restaurants to anon, authenticated;
create policy restaurants_read on public.restaurants for select to anon, authenticated using (true);

-- page_views, qr_scans, serve_ledger: no browser access (server routes only).

commit;
