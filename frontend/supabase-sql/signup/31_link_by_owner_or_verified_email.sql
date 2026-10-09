-- Close the legacy-email account takeover.  NOT YET RUN IN PRODUCTION — needs approval.
--
-- Email confirmation is off, so the email in a sign-in token is not proof that the
-- person owns that inbox. Anyone could sign up as someone@example.com and
-- these functions would hand them any unclaimed profile with that email.
--
-- link_my_server: owner (auth ID) only. Every live worker profile is already
--   linked by auth ID (checked 2026-10-08: 10 of 10). The email fallback only
--   served pre-auth legacy rows, so removing it breaks no current account.
-- link_my_manager: the restaurant waitlist really does create unclaimed rows
--   (auth_id null) that the owner claims later, so the email fallback stays —
--   but only for sign-ins whose email a provider has verified (Google today),
--   never for a plain email/password account while confirmation is off.
--   All 3 current manager rows are already linked by auth ID.
--
-- Signatures, SECURITY DEFINER and grants are unchanged (create or replace keeps grants).

create or replace function public.link_my_server()
returns table (id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid text := auth.uid()::text;
begin
  if v_uid is null then return; end if;
  return query
    select s.id, s.name from public.servers s
    where s.wallet_address = v_uid
    order by s.created_at, s.id
    limit 1;
end;
$$;

create or replace function public.link_my_manager()
returns table (id uuid, restaurant_name text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid text := auth.uid()::text;
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  -- true only when the account signed in through a provider that verifies email
  v_verified boolean := exists (
    select 1 from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'providers', '[]'::jsonb)) p
    where p <> 'email'
  );
  v_id uuid;
begin
  if v_uid is null then return; end if;

  select m.id into v_id from public.restaurant_managers m where m.auth_id = v_uid limit 1;

  if v_id is null and v_email is not null and v_verified then
    select m.id into v_id
    from public.restaurant_managers m
    where lower(m.email) = v_email and m.auth_id is null
    order by m.created_at
    limit 1;
    if v_id is not null then
      update public.restaurant_managers set auth_id = v_uid where restaurant_managers.id = v_id;
    end if;
  end if;

  return query select m.id, m.restaurant_name from public.restaurant_managers m where m.id = v_id;
end;
$$;
