-- READ-ONLY. Run right after migration 36. Every *_ok column must be true; compare the
-- fingerprints and counts with the preflight output (must be identical).
select
  (select md5(prosrc) from pg_proc where oid = 'public.manager_can_staff(uuid,text)'::regprocedure)
      = '9e86d5f328646b5442316ff26625b438'                                          as manager_can_staff_ok,
  (select md5(prosrc) from pg_proc where oid = 'public.manager_controls(text,uuid,text)'::regprocedure)
      = 'e2760eb3d6d4eb7974c52ae022432360'                                          as manager_controls_ok,
  not has_function_privilege('anon', 'public.manager_controls(text,uuid,text)', 'execute')
    and not has_function_privilege('authenticated', 'public.manager_controls(text,uuid,text)', 'execute')
    and has_function_privilege('service_role', 'public.manager_controls(text,uuid,text)', 'execute') as manager_controls_server_only_ok,
  (select count(*) from public.restaurant_managers where verified_at is not null) = 0 as none_verified_ok,
  exists (select 1 from pg_constraint where conname = 'restaurant_managers_verified_binding') as binding_constraint_ok,
  has_column_privilege('authenticated', 'public.restaurant_managers', 'verified_at', 'SELECT')
    and not has_column_privilege('authenticated', 'public.restaurant_managers', 'verification_note', 'SELECT')
    and not has_column_privilege('authenticated', 'public.restaurant_managers', 'verified_at', 'INSERT')
    and not has_column_privilege('authenticated', 'public.restaurant_managers', 'verified_at', 'UPDATE')
    and not has_column_privilege('anon', 'public.restaurant_managers', 'verified_at', 'INSERT')   as verification_columns_ok,
  (select count(*) from public.restaurant_managers)                                 as manager_accounts,
  (select md5(string_agg(id::text || ':' || coalesce(open_to_opportunities::text, 'null'), ',' order by id))
     from public.servers)                                                           as worker_settings_fingerprint,
  (select md5(string_agg(policyname || '|' || cmd || '|' || coalesce(qual, '') || '|' || coalesce(with_check, ''), ';' order by policyname))
     from pg_policies where schemaname = 'public' and tablename = 'shifts')         as shift_policies_fingerprint;
