-- Local stack only: the minimal Supabase Storage tables (storage.buckets, storage.objects)
-- that the gateway's storage stand-in and migrations reference. Supabase creates and owns
-- these in production; never run this file there. Idempotent.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  metadata jsonb,
  created_at timestamptz default now(),
  unique (bucket_id, name)
);

-- As in Supabase: app users get nothing unless policies allow it.
alter table storage.objects enable row level security;
revoke all on storage.buckets, storage.objects from public;

-- Like hosted Supabase: direct DELETEs on the storage tables are refused unless the
-- transaction sets storage.allow_delete_query = 'true' (the storage server does; so must any
-- migration/rollback that removes a bucket).
create or replace function storage.protect_delete()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('storage.allow_delete_query', true), 'false') <> 'true' then
    raise exception 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
      using errcode = '42501';
  end if;
  return null;
end;
$$;
drop trigger if exists protect_buckets_delete on storage.buckets;
create trigger protect_buckets_delete before delete on storage.buckets
  for each statement execute function storage.protect_delete();
drop trigger if exists protect_objects_delete on storage.objects;
create trigger protect_objects_delete before delete on storage.objects
  for each statement execute function storage.protect_delete();
