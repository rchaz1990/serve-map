-- 45: Employment verification for PROVISIONAL early-test candidates (proposed).
--     NOT RUN IN PRODUCTION — local development only. Production use needs separate founder
--     approval and the blockers in docs/EMPLOYMENT_VERIFICATION.md (Vercel re-check, key
--     rotation decision, Vera copy, Supabase deletion confirmation, synthetic dry run).
--
-- What it creates:
--   1. Private Storage bucket 'employment-verification': not public, 4 MB, JPEG/PNG only.
--      No storage policies are added, so app users (anon, authenticated) can neither upload,
--      read, list nor delete; only Slate's server code (service role) can.
--   2. public.employment_verifications: the minimal audit record. No name, email, contact,
--      document, document hash, extracted text or reviewer notes. No app-user access.
--   3. A trigger that only allows forward status changes and freezes decision fields once set.
--   4. verification_object_exists(name): true/false, so the server can confirm a deleted file's
--      storage record is really gone. Service role only.
--
-- Rollback: 45_rollback_employment_verification.sql (refuses while any file is still stored).

begin;

do $$
begin
  if to_regclass('public.employment_verifications') is not null then
    raise exception '45 already applied; stopping';
  end if;
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise exception 'storage schema not found; stopping';
  end if;
end $$;

-- 1. Private bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employment-verification', 'employment-verification', false, 4194304, array['image/jpeg', 'image/png']);

-- 2. Audit record
create table public.employment_verifications (
  id                uuid primary key default gen_random_uuid(),  -- random verification ID
  status            text not null default 'invited' check (status in
                      ('invited', 'uploading', 'submitted', 'verified', 'not_verified', 'withdrawn', 'expired')),
  -- One current secret (invite link, then upload receipt, then the post-verification
  -- continuation link): SHA-256 only, cleared when used or expired.
  secret_hash       text unique,
  secret_expires_at timestamptz,
  consent_at        timestamptz,          -- separate, voluntary verification consent
  consent_version   text,
  object_path       text,                 -- random file name while a file exists; null after deletion
  upload_issued_at  timestamptz,
  submitted_at      timestamptz,
  role_category     text check (role_category in ('server', 'bartender', 'other_approved')),
  venue             text check (char_length(venue) <= 120),
  borough           text check (borough in ('manhattan', 'brooklyn', 'queens', 'bronx', 'staten_island')),
  evidence_type     text check (evidence_type in ('schedule', 'employee_portal', 'pay_document_redacted', 'other_approved')),
  decided_at        timestamptz,          -- verification timestamp (UTC)
  reviewer_id       uuid,                 -- the verifier's account (null for automatic outcomes)
  deleted_at        timestamptz,          -- file deletion confirmed
  rejection_reason  text check (rejection_reason in
                      ('unredacted_sensitive', 'wrong_or_unclear_person', 'role_unclear', 'not_qualifying_role',
                       'stale_record', 'unreadable', 'unsupported', 'tied_to_slate', 'other')),
  age_attested_at   timestamptz,          -- separate 18+ attestation, after verification (no DOB, no ID)
  created_at        timestamptz not null default now(),
  -- A verified record names what was checked; a rejection names only a reason code.
  constraint verified_has_fields check (status <> 'verified'
    or (role_category is not null and venue is not null and borough is not null and evidence_type is not null
        and decided_at is not null and reviewer_id is not null)),
  constraint not_verified_has_reason check (status <> 'not_verified' or (rejection_reason is not null and decided_at is not null)),
  constraint age_only_after_verification check (age_attested_at is null or status = 'verified')
);

alter table public.employment_verifications enable row level security;
alter table public.employment_verifications force row level security;
revoke all on public.employment_verifications from public, anon, authenticated;
grant select, insert, update on public.employment_verifications to service_role;
create policy employment_verifications_service on public.employment_verifications
  for all to service_role using (true) with check (true);

-- 3. Forward-only status changes; decision fields frozen once decided.
create or replace function public.employment_verifications_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'verification: id and created_at are fixed';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'invited'   and new.status in ('uploading', 'withdrawn', 'expired'))
    or (old.status = 'uploading' and new.status in ('submitted', 'not_verified', 'withdrawn', 'expired'))
    or (old.status = 'submitted' and new.status in ('verified', 'not_verified', 'withdrawn', 'expired'))
  ) then
    raise exception 'verification: status % -> % not allowed', old.status, new.status;
  end if;
  if old.decided_at is not null and (
       new.decided_at is distinct from old.decided_at or new.reviewer_id is distinct from old.reviewer_id
    or new.role_category is distinct from old.role_category or new.venue is distinct from old.venue
    or new.borough is distinct from old.borough or new.evidence_type is distinct from old.evidence_type
    or new.rejection_reason is distinct from old.rejection_reason
  ) then
    raise exception 'verification: decision is final';
  end if;
  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
    raise exception 'verification: deletion time is final';
  end if;
  if old.age_attested_at is not null and new.age_attested_at is distinct from old.age_attested_at then
    raise exception 'verification: age attestation is final';
  end if;
  return new;
end;
$$;
create trigger employment_verifications_guard before update on public.employment_verifications
  for each row execute function public.employment_verifications_guard();
revoke all on function public.employment_verifications_guard() from public, anon, authenticated;

-- 4. Deletion confirmation helper
create or replace function public.verification_object_exists(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from storage.objects where bucket_id = 'employment-verification' and name = p_name)
$$;
revoke all on function public.verification_object_exists(text) from public, anon, authenticated;
grant execute on function public.verification_object_exists(text) to service_role;

-- Files in the bucket that no record points at (e.g. an upload that finished after the
-- candidate withdrew, using a still-valid upload link). The sweep deletes them through the
-- Storage API. Only files older than the given age, so in-progress uploads are left alone.
-- An earlier draft of this file created a one-argument version. Drop it so a database that
-- ran that draft cannot keep both overloads (PostgREST would answer HTTP 300, ambiguous).
drop function if exists public.verification_unreferenced_objects(interval);
create or replace function public.verification_unreferenced_objects(p_older_than interval, p_limit integer default 100)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select o.name from storage.objects o
  where o.bucket_id = 'employment-verification'
    and o.created_at < now() - p_older_than
    and not exists (select 1 from public.employment_verifications v where v.object_path = o.name)
  order by o.created_at
  limit greatest(0, least(coalesce(p_limit, 100), 100))
$$;
revoke all on function public.verification_unreferenced_objects(interval, integer) from public, anon, authenticated;
grant execute on function public.verification_unreferenced_objects(interval, integer) to service_role;

commit;

notify pgrst, 'reload schema';

-- Verify after running (read-only):
--   select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'employment-verification';  -- f | 4194304 | {image/jpeg,image/png}
--   select count(*) from pg_policy where polrelid = 'storage.objects'::regclass and pg_get_expr(polqual, polrelid) like '%employment-verification%';  -- 0
--   select has_table_privilege('authenticated','public.employment_verifications','SELECT');                      -- false
--   select has_function_privilege('anon','public.verification_object_exists(text)','EXECUTE');                   -- false
