-- Rollback for 37_recruiting_consent.sql. Discards the recruiting contact history and
-- restores the previous default (new workers visible to recruiters).
begin;
drop function if exists public.claim_recruiting_contact(uuid, uuid, integer);
drop table if exists public.recruiting_contacts;
alter table public.servers alter column open_to_opportunities set default true;
commit;
