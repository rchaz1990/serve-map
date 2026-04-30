-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query).
-- Adds privacy settings columns to the servers table.

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS follow_approval text DEFAULT 'approval',
  ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public';

-- follow_approval values:   'approval' (manual)  |  'automatic'
-- profile_visibility values: 'public'  |  'shift_only'  |  'private'
