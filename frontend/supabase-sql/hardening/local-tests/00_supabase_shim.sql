-- Minimal stand-in for the Supabase roles and auth helpers, for local testing only.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
-- gen_random_uuid() is built into Postgres 13+; production keeps extensions outside public.

create schema auth;
create table auth.users (id uuid primary key, email text, raw_app_meta_data jsonb not null default '{}'::jsonb, raw_user_meta_data jsonb not null default '{}'::jsonb);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', current_user)
$$;
create function auth.email() returns text language sql stable as $$
  select auth.jwt() ->> 'email'
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant select on auth.users to service_role;

-- Supabase's automatic grants: anything the owner creates in the public schema is
-- granted to anon, authenticated and service_role. (Production showed this on
-- 2026-10-07: new functions from part 1 were executable by anon.)
alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated, service_role;
