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
