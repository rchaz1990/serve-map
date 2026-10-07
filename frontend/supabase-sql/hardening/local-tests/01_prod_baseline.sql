-- Structure of the live Slate database (public schema) as read from the catalog on 2026-10-07,
-- after Step 1 (the three functions locked). No production rows are included.

create table public.guest_rewards (id uuid default gen_random_uuid() not null, email text not null, slate_points integer default 0, created_at timestamp with time zone default timezone('utc'::text, now()), updated_at timestamp with time zone default timezone('utc'::text, now()));
create table public.page_views (id uuid default gen_random_uuid() not null, path text not null, created_at timestamp with time zone default now() not null);
create table public.qr_scans (id uuid default gen_random_uuid() not null, server_id uuid not null, session_id text not null, scanned_at timestamp with time zone default now() not null, is_test boolean default false not null);
create table public.follows (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default timezone('utc'::text, now()), follower_id text not null, follower_email text, server_id uuid, follower_type text default 'guest'::text, status text default 'pending'::text);
create table public.ratings (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default timezone('utc'::text, now()), server_id uuid, restaurant_name text, score integer not null, comment text, guest_email text, verification_method text, gps_verified boolean default false, guest_id text, tags text[] default '{}'::text[], serve_reward integer default 0, rating_stars integer default 0, is_test boolean default false not null);
create table public.restaurant_managers (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default timezone('utc'::text, now()), email text not null, name text, restaurant_name text not null, auth_id text, role text default 'manager'::text);
create table public.restaurants (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default timezone('utc'::text, now()), name text not null, address text, neighborhood text, city text default 'New York'::text, google_place_id text, tier text default 'ghost'::text, claimed boolean default false, owner_email text);
create table public.serve_ledger (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default now() not null, source text not null, source_id text not null, account_type text not null, account_id uuid, email text, amount integer not null, balance_after integer);
create table public.server_restaurants (id uuid default gen_random_uuid() not null, server_id uuid, restaurant_name text not null, restaurant_address text, city text, is_primary boolean default false, currently_working boolean default true, start_date date, end_date date);
create table public.servers (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default timezone('utc'::text, now()), name text not null, email text, role text, bio text, photo_url text, wallet_address text, follower_count integer default 0, average_rating numeric default 0, total_ratings integer default 0, serve_balance numeric default 0, is_founding_member boolean default true, notify_mainnet boolean default true, phone text, instagram text, years_experience integer, specialties text[], open_to_opportunities boolean default true, serve_balance_lifetime integer default 0, follow_approval text default 'automatic'::text, profile_visibility text default 'public'::text, is_test boolean default false not null);
create table public.shifts (id uuid default gen_random_uuid() not null, server_id uuid, restaurant_name text, started_at timestamp with time zone default timezone('utc'::text, now()), ended_at timestamp with time zone, is_active boolean default true, vibe text, bar_seats text, wait_time text, gps_verified boolean default false, distance_meters integer, user_lat numeric, user_lng numeric, activated_by text default 'server'::text);
create table public.suggestions (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default timezone('utc'::text, now()), server_id uuid, server_name text, title text not null, description text, upvotes integer default 0, status text default 'pending'::text);
create table public.venue_comments (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default timezone('utc'::text, now()), restaurant_name text not null, comment text not null, commenter_email text, commenter_name text, likes integer default 0);
create table public.vibe_reports (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default timezone('utc'::text, now()), restaurant_id uuid, restaurant_name text, vibe text not null, bar_seats text, wait_time text, reported_by text, gps_verified boolean default false, distance_meters integer, is_flagged boolean default false, user_lat numeric, user_lng numeric, integrity_score integer default 0, qr_verified boolean default false, serve_reward integer default 0);
create table public.notifications (id uuid default gen_random_uuid() not null, created_at timestamp with time zone default timezone('utc'::text, now()), recipient_email text not null, type text not null, title text not null, message text not null, server_id uuid, server_name text, restaurant_name text, is_read boolean default false, link text);

alter table public.restaurant_managers add constraint restaurant_managers_auth_id_key UNIQUE (auth_id);
alter table public.server_restaurants add constraint server_restaurants_pkey PRIMARY KEY (id);
alter table public.restaurants add constraint restaurants_pkey PRIMARY KEY (id);
alter table public.ratings add constraint ratings_pkey PRIMARY KEY (id);
alter table public.servers add constraint servers_pkey PRIMARY KEY (id);
alter table public.suggestions add constraint suggestions_pkey PRIMARY KEY (id);
alter table public.follows add constraint follows_pkey PRIMARY KEY (id);
alter table public.follows add constraint follows_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'blocked'::text])));
alter table public.venue_comments add constraint venue_comments_pkey PRIMARY KEY (id);
alter table public.restaurant_managers add constraint restaurant_managers_email_key UNIQUE (email);
alter table public.restaurant_managers add constraint restaurant_managers_pkey PRIMARY KEY (id);
alter table public.notifications add constraint notifications_pkey PRIMARY KEY (id);
alter table public.shifts add constraint shifts_pkey PRIMARY KEY (id);
alter table public.vibe_reports add constraint vibe_reports_pkey PRIMARY KEY (id);
alter table public.guest_rewards add constraint guest_rewards_email_key UNIQUE (email);
alter table public.guest_rewards add constraint guest_rewards_pkey PRIMARY KEY (id);
alter table public.serve_ledger add constraint serve_ledger_account_type_check CHECK ((account_type = ANY (ARRAY['server'::text, 'guest'::text])));
alter table public.serve_ledger add constraint serve_ledger_pkey PRIMARY KEY (id);
alter table public.serve_ledger add constraint serve_ledger_source_check CHECK ((source = ANY (ARRAY['rating'::text, 'vibe'::text, 'backfill'::text, 'adjustment'::text])));
alter table public.serve_ledger add constraint serve_ledger_source_id_unique UNIQUE (source, source_id);
alter table public.page_views add constraint page_views_pkey PRIMARY KEY (id);
alter table public.qr_scans add constraint qr_scans_pkey PRIMARY KEY (id);
alter table public.suggestions add constraint suggestions_server_id_fkey FOREIGN KEY (server_id) REFERENCES servers(id);
alter table public.follows add constraint follows_server_id_fkey FOREIGN KEY (server_id) REFERENCES servers(id);
alter table public.qr_scans add constraint qr_scans_server_id_fkey FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE;
alter table public.server_restaurants add constraint server_restaurants_server_id_fkey FOREIGN KEY (server_id) REFERENCES servers(id);
alter table public.notifications add constraint notifications_server_id_fkey FOREIGN KEY (server_id) REFERENCES servers(id);
alter table public.shifts add constraint shifts_server_id_fkey FOREIGN KEY (server_id) REFERENCES servers(id);
alter table public.vibe_reports add constraint vibe_reports_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);
alter table public.ratings add constraint ratings_server_id_fkey FOREIGN KEY (server_id) REFERENCES servers(id);

CREATE INDEX page_views_created_at_idx ON public.page_views USING btree (created_at DESC);
CREATE INDEX qr_scans_server_scanned_idx ON public.qr_scans USING btree (server_id, scanned_at);
CREATE INDEX ratings_guest_id_idx ON public.ratings USING btree (guest_id);
CREATE INDEX idx_follows_server_status ON public.follows USING btree (server_id, status);
CREATE INDEX serve_ledger_account_idx ON public.serve_ledger USING btree (account_type, account_id);

CREATE OR REPLACE FUNCTION public.serve_ledger_append_only() RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  RAISE EXCEPTION 'serve_ledger is append-only';
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_follower_count(server_uuid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  UPDATE servers SET follower_count = COALESCE(follower_count, 0) + 1
  WHERE id = server_uuid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_serve_balance(user_email text, amount integer, user_type text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  IF user_type = 'server' THEN
    UPDATE servers
    SET serve_balance = COALESCE(serve_balance, 0) + amount
    WHERE email ILIKE user_email;
  ELSE
    INSERT INTO guest_rewards (email, serve_balance)
    VALUES (user_email, amount)
    ON CONFLICT (email)
    DO UPDATE SET serve_balance = guest_rewards.serve_balance + amount,
    updated_at = now();
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_follow_request(p_follow_id uuid, p_server_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  UPDATE follows
  SET status = 'approved'
  WHERE id = p_follow_id
  AND server_id = p_server_id;

  UPDATE servers
  SET follower_count = COALESCE(follower_count, 0) + 1
  WHERE id = p_server_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_rating_reward(p_server_id uuid, p_score integer, p_comment text, p_tags text[], p_guest_email text, p_followed boolean, p_amount integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_star integer; v_comment integer; v_follow integer; v_amount integer; v_rating_id text;
  v_balance integer; v_lifetime integer; v_avg numeric; v_count integer; v_new_count integer; v_new_avg numeric; v_email text;
BEGIN
  IF p_score IS NULL OR p_score < 1 OR p_score > 5 THEN RAISE EXCEPTION 'invalid score'; END IF;
  v_star := CASE p_score WHEN 5 THEN 35 WHEN 4 THEN 20 WHEN 3 THEN 10 WHEN 2 THEN 5 ELSE 2 END;
  v_comment := CASE WHEN p_comment IS NOT NULL AND length(btrim(p_comment)) > 0 THEN 10 ELSE 0 END;
  v_follow := CASE WHEN COALESCE(p_followed, false) THEN 5 ELSE 0 END;
  v_amount := v_star + v_comment + v_follow;
  IF p_amount IS DISTINCT FROM v_amount THEN RAISE EXCEPTION 'reward mismatch'; END IF;
  SELECT email INTO v_email FROM public.servers WHERE id = p_server_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'server not found'; END IF;
  INSERT INTO public.ratings (server_id, score, comment, tags, guest_email, gps_verified, verification_method, serve_reward)
  VALUES (p_server_id, p_score, NULLIF(btrim(COALESCE(p_comment, '')), ''),
    CASE WHEN p_tags IS NULL OR cardinality(p_tags) = 0 THEN NULL ELSE p_tags END,
    COALESCE(NULLIF(btrim(COALESCE(p_guest_email, '')), ''), 'anonymous'), false, 'qr_scan', v_amount)
  RETURNING id::text INTO v_rating_id;
  SELECT serve_balance, serve_balance_lifetime, average_rating, total_ratings INTO v_balance, v_lifetime, v_avg, v_count FROM public.servers WHERE id = p_server_id;
  v_balance := COALESCE(v_balance, 0) + v_amount;
  v_lifetime := COALESCE(v_lifetime, 0) + v_amount;
  v_new_count := COALESCE(v_count, 0) + 1;
  v_new_avg := round(((COALESCE(v_avg, 0) * COALESCE(v_count, 0) + p_score)::numeric) / v_new_count, 1);
  UPDATE public.servers SET serve_balance = v_balance, serve_balance_lifetime = v_lifetime, total_ratings = v_new_count, average_rating = v_new_avg WHERE id = p_server_id;
  INSERT INTO public.serve_ledger (source, source_id, account_type, account_id, email, amount, balance_after)
  VALUES ('rating', v_rating_id, 'server', p_server_id, v_email, v_amount, v_balance);
  RETURN jsonb_build_object('rating_id', v_rating_id, 'amount', v_amount, 'star_reward', v_star, 'comment_bonus', v_comment,
    'follow_bonus', v_follow, 'serve_balance', v_balance, 'serve_balance_lifetime', v_lifetime);
END;
$function$;

CREATE TRIGGER serve_ledger_no_update BEFORE DELETE OR UPDATE ON public.serve_ledger FOR EACH ROW EXECUTE FUNCTION serve_ledger_append_only();

alter table public.restaurant_managers enable row level security;
alter table public.shifts enable row level security;
alter table public.vibe_reports enable row level security;
alter table public.guest_rewards enable row level security;
alter table public.serve_ledger enable row level security;
alter table public.page_views enable row level security;
alter table public.qr_scans enable row level security;
alter table public.server_restaurants enable row level security;
alter table public.restaurants enable row level security;
alter table public.ratings enable row level security;
alter table public.servers enable row level security;
alter table public.suggestions enable row level security;
alter table public.follows enable row level security;
alter table public.venue_comments enable row level security;
alter table public.notifications enable row level security;

create policy "Anyone can insert vibe_reports" on public.vibe_reports as PERMISSIVE for INSERT to public with check (true);
create policy "Public can read servers" on public.servers as PERMISSIVE for SELECT to public using (true);
create policy "Public can read server_restaurants" on public.server_restaurants as PERMISSIVE for SELECT to public using (true);
create policy "Public can read vibe_reports" on public.vibe_reports as PERMISSIVE for SELECT to public using (true);
create policy "Public can read ratings" on public.ratings as PERMISSIVE for SELECT to public using (true);
create policy "Public can read restaurants" on public.restaurants as PERMISSIVE for SELECT to public using (true);
create policy "Auth users can insert follows" on public.follows as PERMISSIVE for INSERT to public with check ((auth.role() = 'authenticated'::text));
create policy "Auth users can insert suggestions" on public.suggestions as PERMISSIVE for INSERT to public with check ((auth.role() = 'authenticated'::text));
create policy "Allow insert servers" on public.servers as PERMISSIVE for INSERT to public with check (true);
create policy "Allow insert server_restaurants" on public.server_restaurants as PERMISSIVE for INSERT to public with check (true);
create policy "Allow insert shifts" on public.shifts as PERMISSIVE for INSERT to public with check (true);
create policy "Allow insert guest_rewards" on public.guest_rewards as PERMISSIVE for INSERT to public with check (true);
create policy "Allow update servers" on public.servers as PERMISSIVE for UPDATE to public using (true);
create policy "Allow update guest_rewards" on public.guest_rewards as PERMISSIVE for UPDATE to public using (true);
create policy "Service role full access servers" on public.servers as PERMISSIVE for ALL to public using (true) with check (true);
create policy "Service role full access server_restaurants" on public.server_restaurants as PERMISSIVE for ALL to public using (true) with check (true);
create policy "Service role full access shifts" on public.shifts as PERMISSIVE for ALL to public using (true) with check (true);
create policy "Service role full access guest_rewards" on public.guest_rewards as PERMISSIVE for ALL to public using (true) with check (true);
create policy "Users can read own notifications" on public.notifications as PERMISSIVE for SELECT to public using (true);
create policy "Allow insert notifications" on public.notifications as PERMISSIVE for INSERT to public with check (true);
create policy "Allow update notifications" on public.notifications as PERMISSIVE for UPDATE to public using (true);
create policy "Anyone can insert ratings" on public.ratings as PERMISSIVE for INSERT to public with check (true);
create policy "Anyone can update ratings" on public.ratings as PERMISSIVE for UPDATE to public using (true);
create policy "Service role full access ratings" on public.ratings as PERMISSIVE for ALL to public using (true) with check (true);
create policy "Anyone can read venue comments" on public.venue_comments as PERMISSIVE for SELECT to public using (true);
create policy "Anyone can update venue comments" on public.venue_comments as PERMISSIVE for UPDATE to public using (true);
create policy "Anyone can insert venue comments" on public.venue_comments as PERMISSIVE for INSERT to public with check (true);
create policy "Allow all on restaurant_managers" on public.restaurant_managers as PERMISSIVE for ALL to public using (true) with check (true);

-- Table grants: every public table except serve_ledger is fully granted to anon and authenticated.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('grant all on public.%I to service_role', t);
    if t <> 'serve_ledger' then
      execute format('grant all on public.%I to anon, authenticated', t);
    end if;
  end loop;
end $$;
revoke update, delete on public.serve_ledger from service_role;

-- Function grants as they stand after Step 1.
revoke all on function public.approve_follow_request(uuid, uuid) from public;
grant execute on function public.approve_follow_request(uuid, uuid) to service_role;
revoke all on function public.increment_serve_balance(text, integer, text) from public;
grant execute on function public.increment_serve_balance(text, integer, text) to service_role;
revoke all on function public.increment_follower_count(uuid) from public;
grant execute on function public.increment_follower_count(uuid) to service_role;
revoke all on function public.submit_rating_reward(uuid, integer, text, text[], text, boolean, integer) from public;
grant execute on function public.submit_rating_reward(uuid, integer, text, text[], text, boolean, integer) to service_role;
