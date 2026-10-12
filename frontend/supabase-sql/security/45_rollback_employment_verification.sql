-- Rollback for 45_employment_verification.sql.
-- Refuses while any verification file is still stored (delete files through the Storage API
-- first; deleting storage rows with SQL would orphan the files). Drops the audit records.

begin;

do $$
begin
  if to_regclass('public.employment_verifications') is null then
    raise exception '45 is not applied; nothing to roll back';
  end if;
  if exists (select 1 from storage.objects where bucket_id = 'employment-verification') then
    raise exception 'verification files still stored; delete them through the Storage API first';
  end if;
end $$;

drop function if exists public.verification_unreferenced_objects(interval, integer);
drop function if exists public.verification_object_exists(text);
drop table if exists public.employment_verifications;
drop function if exists public.employment_verifications_guard();
-- Hosted Supabase refuses direct deletes on storage tables (protect_delete triggers) unless
-- this transaction opts in. Safe here: the check above proved the bucket holds no files.
set local storage.allow_delete_query = 'true';
delete from storage.buckets where id = 'employment-verification';

commit;

notify pgrst, 'reload schema';
