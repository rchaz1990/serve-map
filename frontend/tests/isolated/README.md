# Isolated signup test (no production)

Runs the real app (production build) in Chromium against `mock-supabase.js`, an
in-memory stand-in for Supabase auth + REST. Nothing leaves localhost: the browser
aborts every non-localhost request and the app gets dummy keys.

```bash
DELAY=250 node tests/isolated/mock-supabase.js 54400 &
# Build with only these env vars (env -i), then `next start -p 3102`:
#   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54400 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon
#   SUPABASE_SERVICE_ROLE_KEY=service RESEND_API_KEY=re_dummy BEEHIIV_API_KEY=dummy BEEHIIV_PUBLICATION_ID=dummy
# Offline builds also need next/font/google stubbed in app/layout.tsx (test copy only).
node tests/isolated/flow.js http://localhost:3102 pr normal               # plain signup
node tests/isolated/flow.js http://localhost:3102 pr reload-after-signup  # Hazel's failure, then recovery
node tests/isolated/flow.js http://localhost:3102 pr resume-existing      # orphaned login signs in, finishes
node tests/isolated/flow.js http://localhost:3102 pr double-click
```

The mock is not real PostgREST/RLS/GoTrue; database rules are covered by
`supabase-sql/hardening/local-tests` and must still be confirmed on a real database.
