import {
  admin, hoursFromNow, INVITE_TTL_HOURS, json, logCode, newSecret, requireVerifier, unavailable, verificationAllowed,
} from '@/lib/verification-server'

// A named verifier creates a single-use invite. The secret is returned once (for the link
// /verify#<secret>) and only its hash is stored.
export async function POST(request: Request) {
  if (!verificationAllowed()) return unavailable()
  if (!(await requireVerifier(request))) return json({ error: 'Forbidden' }, 403)
  const { secret, hash } = newSecret()
  const expiresAt = hoursFromNow(INVITE_TTL_HOURS)
  const { data, error } = await admin().from('employment_verifications')
    .insert({ status: 'invited', secret_hash: hash, secret_expires_at: expiresAt }).select('id').single()
  if (error || !data) { logCode('invite_failed'); return json({ error: 'try_again' }, 503) }
  return json({ id: data.id, secret, expiresAt })
}
