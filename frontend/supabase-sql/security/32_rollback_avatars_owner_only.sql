-- Rollback for 32: restores the exact policies and bucket settings found on 2026-10-09.
begin;
drop policy if exists avatars_owner_select on storage.objects;
drop policy if exists avatars_owner_insert on storage.objects;
drop policy if exists avatars_owner_update on storage.objects;
drop policy if exists avatars_owner_delete on storage.objects;
create policy "Allow all operations on Avatars bucket" on storage.objects for all to public
  using (bucket_id = 'Avatars'::text) with check (bucket_id = 'Avatars'::text);
create policy "Allow public uploads to avatars" on storage.objects for insert to public
  with check (bucket_id = 'avatars'::text);
create policy "Allow users to update avatars" on storage.objects for update to public
  using (bucket_id = 'avatars'::text);
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'Avatars';
commit;
