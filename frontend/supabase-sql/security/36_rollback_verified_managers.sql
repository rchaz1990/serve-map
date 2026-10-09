-- Rollback for 36_verified_managers.sql.
-- Restores manager_can_staff to the pre-36 production version (body md5
-- 8ea02c808366da74d12025a910477a8d) and removes the verification columns.
-- WARNING: dropping the columns discards any verifications recorded since 36 ran.
-- Note: this restores the original weakness (self-typed restaurant name is trusted).

begin;

create or replace function public.manager_can_staff(p_server_id uuid, p_restaurant text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.restaurant_managers m
    where m.auth_id = auth.uid()::text
      and lower(m.restaurant_name) = lower(p_restaurant)
  ) and exists (
    select 1 from public.server_restaurants sr
    where sr.server_id = p_server_id
      and lower(sr.restaurant_name) = lower(p_restaurant)
  )
$function$;

drop function if exists public.manager_controls(text, uuid, text);

alter table public.restaurant_managers
  drop constraint if exists restaurant_managers_verified_binding,
  drop column if exists verified_at,
  drop column if exists verified_restaurant_name,
  drop column if exists verified_restaurant_address,
  drop column if exists verification_note;

commit;
