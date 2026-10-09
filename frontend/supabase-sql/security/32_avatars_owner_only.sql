-- Contain the open Avatars bucket.  NOT YET RUN IN PRODUCTION — needs approval.
-- Today "Allow all operations on Avatars bucket" (FOR ALL, TO public) lets anyone with the
-- public key list, upload, overwrite and delete any profile photo, with no size/type limit.
-- After this: photos stay publicly viewable through their public URLs (public bucket),
-- but only a signed-in user can upload/replace/delete files named "<their user id>-…",
-- which is exactly how the signup page and dashboard name uploads.
begin;
drop policy if exists "Allow all operations on Avatars bucket" on storage.objects;
drop policy if exists "Allow public uploads to avatars" on storage.objects;   -- lowercase bucket does not exist
drop policy if exists "Allow users to update avatars" on storage.objects;     -- lowercase bucket does not exist

create policy avatars_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'Avatars' and name like auth.uid()::text || '-%');
create policy avatars_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'Avatars' and name like auth.uid()::text || '-%');
create policy avatars_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'Avatars' and name like auth.uid()::text || '-%')
  with check (bucket_id = 'Avatars' and name like auth.uid()::text || '-%');
create policy avatars_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'Avatars' and name like auth.uid()::text || '-%');

-- Match the app's own client-side limits (JPG/PNG/GIF, 5 MB).
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/gif']
where id = 'Avatars';
commit;
