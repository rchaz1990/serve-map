-- Synthetic test data only. Mirrors the production problems seen on 2026-10-07:
-- duplicate follows, follows stuck "pending" on automatic servers, drifted follower_count.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'server.a@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'server.b@test.dev'),
  ('00000000-0000-0000-0000-00000000006a', 'guest.g@test.dev'),
  ('00000000-0000-0000-0000-00000000000e', 'manager.m@test.dev'),
  ('00000000-0000-0000-0000-0000000000ff', 'attacker@test.dev'),
  ('00000000-0000-0000-0000-00000000000c', 'server.c@test.dev');

insert into public.servers (id, name, email, phone, wallet_address, follow_approval, follower_count, serve_balance_lifetime) values
  ('11111111-1111-1111-1111-11111111111a', 'Ana Server', 'server.a@test.dev', '555-0100', '00000000-0000-0000-0000-00000000000a', 'automatic', 7, 100),
  ('11111111-1111-1111-1111-11111111111b', 'Ben Server', 'server.b@test.dev', '555-0101', '00000000-0000-0000-0000-00000000000b', 'approval', 0, 50),
  -- legacy row whose owner id is not a real auth user (4 such rows exist in production)
  ('11111111-1111-1111-1111-11111111111c', 'Cam Legacy', 'server.c@test.dev', null, 'legacy-not-a-user', 'automatic', 0, 0);

insert into public.server_restaurants (server_id, restaurant_name, is_primary, currently_working) values
  ('11111111-1111-1111-1111-11111111111a', 'Bar X', true, true),
  ('11111111-1111-1111-1111-11111111111b', 'Bar Y', true, true);

insert into public.restaurant_managers (id, email, name, restaurant_name, auth_id) values
  ('22222222-2222-2222-2222-22222222222e', 'manager.m@test.dev', 'Mia Manager', 'Bar X', '00000000-0000-0000-0000-00000000000e');

-- Follows: a duplicate pair and a pending-on-automatic row (the production bugs)
insert into public.follows (follower_id, follower_email, server_id, status, created_at) values
  ('00000000-0000-0000-0000-00000000006a', 'guest.g@test.dev', '11111111-1111-1111-1111-11111111111a', 'pending', now() - interval '3 days'),
  ('00000000-0000-0000-0000-00000000006a', 'guest.g@test.dev', '11111111-1111-1111-1111-11111111111a', 'approved', now() - interval '2 days'),
  ('legacy-guest', 'legacy@test.dev', '11111111-1111-1111-1111-11111111111a', 'pending', now() - interval '1 day');

insert into public.ratings (server_id, score, guest_email, guest_id) values
  ('11111111-1111-1111-1111-11111111111a', 5, 'guest.g@test.dev', '00000000-0000-0000-0000-00000000006a');

insert into public.shifts (server_id, restaurant_name, is_active, user_lat, user_lng) values
  ('11111111-1111-1111-1111-11111111111a', 'Bar X', true, 40.7, -73.9);

insert into public.notifications (recipient_email, type, title, message) values
  ('guest.g@test.dev', 'shift_started', 'Ana is live', 'msg'),
  ('someone.else@test.dev', 'shift_started', 'Other', 'msg');

insert into public.vibe_reports (restaurant_name, vibe, reported_by, user_lat, user_lng) values
  ('Bar X', 'Live', 'guest.g@test.dev', 40.7, -73.9),
  ('Bar X', 'Dead', 'someone.else@test.dev', 40.7, -73.9);

insert into public.guest_rewards (email, slate_points) values
  ('guest.g@test.dev', 5), ('someone.else@test.dev', 9);

insert into public.venue_comments (id, restaurant_name, comment, commenter_email, commenter_name) values
  ('33333333-3333-3333-3333-333333333333', 'Bar X', 'great', 'guest.g@test.dev', 'G');
