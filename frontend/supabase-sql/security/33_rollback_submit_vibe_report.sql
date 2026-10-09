-- Rollback for 33. Roll the app back first (the new route depends on this function).
drop function if exists public.submit_vibe_report(text, text, text, text, text, numeric, numeric, integer, boolean, boolean);
