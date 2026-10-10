import type { SupabaseClient, User } from '@supabase/supabase-js'
import { LEGAL_VERSION, type LegalContext } from '@/lib/legal'

// Server-side record of a person's acknowledgment of the Terms and Privacy Policy.
// Stored in the account's app_metadata (writable only with the service role, so a user
// can't fake it), per context, with the version and time:
//   legal_worker_version / legal_worker_at  — worker sign-up acknowledgment
//   legal_guest_version  / legal_guest_at   — guest rating acknowledgment
// A link alone is never treated as consent: the request must carry the version the
// person explicitly ticked, unless this account already acknowledged that version.

export type LegalResult = 'already' | 'recorded' | 'missing' | 'error'

export function hasAcceptedLegal(user: User, context: LegalContext): boolean {
  return user.app_metadata?.[`legal_${context}_version`] === LEGAL_VERSION
}

export async function recordLegalAcceptance(
  admin: SupabaseClient,
  user: User,
  claimedVersion: unknown,
  context: LegalContext,
): Promise<LegalResult> {
  if (hasAcceptedLegal(user, context)) return 'already'
  if (claimedVersion !== LEGAL_VERSION) return 'missing'
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      [`legal_${context}_version`]: LEGAL_VERSION,
      [`legal_${context}_at`]: new Date().toISOString(),
    },
  })
  if (error) {
    console.error(`[legal] could not record ${context} acknowledgment:`, error.message)
    return 'error'
  }
  return 'recorded'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Whether the worker who owns a profile (servers.wallet_address = their account id) has
 * acknowledged the current version as a worker. A profile not tied to a sign-in account
 * (unclaimed) never passes. Used to gate shift emails; the database gates shift starts
 * the same way (migration 39, worker_terms_ok).
 */
export async function workerTermsOnFile(admin: SupabaseClient, walletAddress: string | null | undefined): Promise<boolean> {
  if (!walletAddress || !UUID_RE.test(walletAddress)) return false
  const { data, error } = await admin.auth.admin.getUserById(walletAddress)
  if (error || !data?.user) return false
  return hasAcceptedLegal(data.user, 'worker')
}
