import { admin, hashSecret, json, unavailable, validSecretShape, verificationAllowed } from '@/lib/verification-server'

// The separate 18+ attestation (Vera, 2026-10-11): only after a 'verified' decision, before the
// early-test participant agreement. Records a timestamp only — no date of birth, no ID.
export async function POST(request: Request) {
  if (!verificationAllowed()) return unavailable()
  const body = await request.json().catch(() => null) as { secret?: unknown; attest?: unknown } | null
  if (!validSecretShape(body?.secret)) return json({ error: 'invalid' }, 400)
  if (body.attest !== true) return json({ error: 'attestation_required' }, 400)

  const db = admin()
  const now = new Date().toISOString()
  const { data: ok } = await db.from('employment_verifications')
    .update({ age_attested_at: now, secret_hash: null, secret_expires_at: null })
    .eq('secret_hash', hashSecret(body.secret)).eq('status', 'verified').is('age_attested_at', null).gt('secret_expires_at', now)
    .select('id')
  if (!ok?.length) return json({ error: 'invalid' }, 400)
  return json({ state: 'done' })
}
