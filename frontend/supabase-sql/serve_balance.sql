-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query).
-- Adds the merit-based $SERVE reward columns. Skip if already run.

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS serve_balance integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS serve_balance_lifetime integer DEFAULT 0;

-- Per-rating reward amount, used to compute "earned this period" totals.
ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS serve_reward integer DEFAULT 0;

-- serve_balance        = available to cash out (decrements when paid out)
-- serve_balance_lifetime = total ever earned. Only goes up. Never resets.
-- ratings.serve_reward = $SERVE awarded for that specific rating.
