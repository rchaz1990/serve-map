-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query).
-- Creates the restaurant_managers table backing the manager signup + dashboard.

CREATE TABLE IF NOT EXISTS restaurant_managers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  email text unique not null,
  name text,
  restaurant_name text not null,
  auth_id text unique,
  role text default 'manager'
);

ALTER TABLE restaurant_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on restaurant_managers" ON restaurant_managers
USING (true) WITH CHECK (true);
