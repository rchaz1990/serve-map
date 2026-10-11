import type { SupabaseClient, User } from '@supabase/supabase-js'
import { workerParticipating } from '@/lib/participant-server'

// Test worker profiles (migration 42). Server code uses the service role, which bypasses
// the database's visibility rules, so every service-role path that acts on a worker by id
// must apply the same rule here: a test profile exists only for authorized test accounts.
//
// Before migration 42 is installed (no test_profile column / test_accounts table) every
// profile is a real profile, so these helpers return "not a test profile" / "not a tester".
// Any other database error is reported as 'error' so callers fail closed.

const MISSING = new Set(['42703', '42P01', 'PGRST204', 'PGRST205'])

export async function isTestProfile(admin: SupabaseClient, serverId: string): Promise<boolean | 'missing' | 'error'> {
  const { data, error } = await admin.from('servers').select('test_profile').eq('id', serverId).maybeSingle()
  if (error) return MISSING.has(error.code ?? '') ? false : 'error'
  if (!data) return 'missing'
  return data.test_profile === true
}

export async function isTesterEmail(admin: SupabaseClient, email: string | null | undefined): Promise<boolean | 'error'> {
  if (!email) return false
  const { data, error } = await admin.from('test_accounts').select('email').eq('email', email.trim().toLowerCase()).maybeSingle()
  if (error) return MISSING.has(error.code ?? '') ? false : 'error'
  return !!data
}

/** Whether this viewer may act on this worker profile: 'ok', 'hidden' (treat as not found) or 'error'. */
export async function viewerMayUseProfile(admin: SupabaseClient, serverId: string, viewer: User | null): Promise<'ok' | 'hidden' | 'error'> {
  const test = await isTestProfile(admin, serverId)
  if (test === 'error') return 'error'
  if (test === 'missing') return 'hidden'
  if (test) {
    const tester = await isTesterEmail(admin, viewer?.email)
    if (tester === 'error') return 'error'
    if (!tester) return 'hidden'
  }
  // Early test (migration 44): a worker who has not accepted the current worker participant
  // agreement is hidden from everyone but the owner — the same rule as the database policies.
  const visible = await workerVisibleInTest(admin, serverId, viewer)
  if (visible === 'error') return 'error'
  return visible ? 'ok' : 'hidden'
}

async function workerVisibleInTest(admin: SupabaseClient, serverId: string, viewer: User | null): Promise<boolean | 'error'> {
  const participating = await workerParticipating(admin, serverId)
  if (participating !== false) return participating
  if (!viewer) return false
  const { data, error } = await admin.from('servers').select('wallet_address').eq('id', serverId).maybeSingle()
  if (error) return 'error'
  return data?.wallet_address === viewer.id
}
