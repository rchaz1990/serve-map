-- Rollback for 20_tighten.sql: restores the access rules and grants exactly as they
-- were on 2026-10-07 (including the open ones). Use only if the new rules break the app.
begin;

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

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'serve_ledger' loop
    execute format('grant all on public.%I to anon, authenticated', t);
  end loop;
end $$;

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

-- Undo the three function revokes at the end of 20_tighten.sql (back to the
-- post-part-1 state, where Supabase had granted them to anon automatically).
grant execute on function public.link_my_server() to anon;
grant execute on function public.link_my_manager() to anon;
grant execute on function public.my_vibe_reports() to anon;

commit;
