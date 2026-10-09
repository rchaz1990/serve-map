-- READ-ONLY. Run in the Supabase SQL Editor before deploying PR #44 / migration 36.
-- Expected values: docs/DEPLOY_RUNBOOK_VERIFIED_MANAGERS.md (Preflight). Record the output.
select
  (select md5(prosrc) from pg_proc where oid = 'public.manager_can_staff(uuid,text)'::regprocedure)
      = '8ea02c808366da74d12025a910477a8d'                                        as manager_can_staff_is_current_prod,
  (select md5(prosrc) from pg_proc where proname = 'link_my_manager' and pronamespace = 'public'::regnamespace)
      = '424899060b6f06fd134ba747e847385a'                                        as link_my_manager_is_current_prod,
  not exists (select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'restaurant_managers' and column_name like 'verifi%')     as no_verification_columns_yet,
  to_regclass('public.recruiting_contacts') is null                               as no_recruiting_table_yet,
  (select column_default from information_schema.columns where table_schema = 'public'
      and table_name = 'servers' and column_name = 'open_to_opportunities')       as visibility_default,
  (select count(*) from public.restaurant_managers)                               as manager_accounts,
  (select count(*) filter (where open_to_opportunities) || '/' || count(*) from public.servers) as visible_workers,
  (select md5(string_agg(id::text || ':' || coalesce(open_to_opportunities::text, 'null'), ',' order by id))
     from public.servers)                                                         as worker_settings_fingerprint,
  (select count(*) from public.shifts where is_active)                            as active_shifts,
  (select md5(string_agg(policyname || '|' || cmd || '|' || coalesce(qual, '') || '|' || coalesce(with_check, ''), ';' order by policyname))
     from pg_policies where schemaname = 'public' and tablename = 'shifts')       as shift_policies_fingerprint;
