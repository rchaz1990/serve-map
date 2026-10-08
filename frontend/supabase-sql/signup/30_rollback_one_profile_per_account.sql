-- Rollback for 30_one_profile_per_account.sql
drop index concurrently if exists public.servers_one_profile_per_account;
