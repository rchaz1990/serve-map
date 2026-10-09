-- READ-ONLY permission probe. Acts as the first linked manager whose restaurant name has
-- workers, for this one statement only (set_config(..., true) ends with the statement),
-- and asks the database whether that manager may control those workers' shifts.
-- Expected: before migration 36 -> manager_can_staff = true (today's weakness);
--           after  migration 36 -> manager_can_staff = false (manager not verified).
-- jobs = 0 means no such manager exists, so the probe is inconclusive.
select count(*) as jobs,
       bool_and(public.manager_can_staff(j.server_id, j.restaurant_name)) as manager_can_staff
from (
  select set_config('request.jwt.claims', json_build_object('sub', (
    select m.auth_id from public.restaurant_managers m
    where m.auth_id is not null
      and exists (select 1 from public.server_restaurants sr where lower(sr.restaurant_name) = lower(m.restaurant_name))
    order by m.created_at limit 1))::text, true) as claims
) cfg
cross join lateral (
  select sr.server_id, sr.restaurant_name
  from public.restaurant_managers m
  join public.server_restaurants sr on lower(sr.restaurant_name) = lower(m.restaurant_name)
  where m.auth_id = (cfg.claims::jsonb ->> 'sub')
) j;
