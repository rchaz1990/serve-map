-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query).
-- Adds specialties + open_to_opportunities columns to the servers table.

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS open_to_opportunities boolean DEFAULT false;
