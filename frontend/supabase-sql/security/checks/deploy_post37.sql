-- READ-ONLY. Run right after migration 37. Every *_ok column must be true; visible_workers
-- and worker_settings_fingerprint must equal the preflight values (no worker changed).
select
  (select column_default from information_schema.columns where table_schema = 'public'
      and table_name = 'servers' and column_name = 'open_to_opportunities') = 'false'     as default_hidden_ok,
  to_regclass('public.recruiting_contacts') is not null
    and (select count(*) from public.recruiting_contacts) = 0                              as contacts_table_empty_ok,
  (select count(*) from information_schema.columns where table_schema = 'public'
      and table_name = 'recruiting_contacts' and column_name in ('sent_at', 'provider_message_id')) = 2 as delivery_columns_ok,
  (select relrowsecurity from pg_class where oid = 'public.recruiting_contacts'::regclass)
    and not has_table_privilege('anon', 'public.recruiting_contacts', 'select,insert,update,delete')
    and not has_table_privilege('authenticated', 'public.recruiting_contacts', 'select,insert,update,delete')
    and has_table_privilege('service_role', 'public.recruiting_contacts', 'update')
    and has_table_privilege('service_role', 'public.recruiting_contacts', 'delete')         as contacts_access_ok,
  (select md5(prosrc) from pg_proc where oid = 'public.claim_recruiting_contact(uuid,uuid,integer)'::regprocedure)
      = 'bb3265ab3f1f3e7d239e5834b8fbe37c'                                                 as claim_function_ok,
  not has_function_privilege('anon', 'public.claim_recruiting_contact(uuid,uuid,integer)', 'execute')
    and not has_function_privilege('authenticated', 'public.claim_recruiting_contact(uuid,uuid,integer)', 'execute')
    and has_function_privilege('service_role', 'public.claim_recruiting_contact(uuid,uuid,integer)', 'execute') as claim_server_only_ok,
  (select count(*) filter (where open_to_opportunities) || '/' || count(*) from public.servers) as visible_workers,
  (select md5(string_agg(id::text || ':' || coalesce(open_to_opportunities::text, 'null'), ',' order by id))
     from public.servers)                                                                 as worker_settings_fingerprint;
