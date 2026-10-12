import {
  admin, BOROUGHS, CONTINUE_TTL_DAYS, deleteAndConfirm, EVIDENCE_TYPES, hoursFromNow, json, logCode, newSecret,
  REJECTION_REASONS, requireVerifier, ROLE_CATEGORIES, unavailable, verificationAllowed,
} from '@/lib/verification-server'

type Body = {
  id?: unknown; decision?: unknown
  role_category?: unknown; venue?: unknown; borough?: unknown; evidence_type?: unknown; rejection_reason?: unknown
}
const oneOf = <T extends readonly string[]>(v: unknown, list: T): v is T[number] => typeof v === 'string' && list.includes(v)

// Records the verifier's decision, then deletes the file and confirms the deletion in the same
// request. Only the allowed fields are kept; there is no free-text notes field.
// verified     → role category, venue, borough, evidence type (+ a continuation link for the
//                separate 18+ attestation and then the early-test agreement)
// not_verified → a reason code only
// withdrawn    → the candidate asked to stop
export async function POST(request: Request) {
  if (!verificationAllowed()) return unavailable()
  const reviewer = await requireVerifier(request)
  if (!reviewer) return json({ error: 'Forbidden' }, 403)
  const b = await request.json().catch(() => null) as Body | null
  if (!b || typeof b.id !== 'string' || !/^[0-9a-f-]{36}$/.test(b.id)) return json({ error: 'invalid' }, 400)

  const db = admin()
  const now = new Date().toISOString()
  const { data: v } = await db.from('employment_verifications').select('id, status, object_path').eq('id', b.id).maybeSingle()
  if (!v) return json({ error: 'not_found' }, 404)

  let update: Record<string, unknown>
  let continueSecret: string | null = null
  if (b.decision === 'verified') {
    const venue = typeof b.venue === 'string' ? b.venue.trim() : ''
    if (!oneOf(b.role_category, ROLE_CATEGORIES) || !oneOf(b.borough, BOROUGHS) || !oneOf(b.evidence_type, EVIDENCE_TYPES)
      || venue.length < 2 || venue.length > 120) return json({ error: 'missing_fields' }, 400)
    if (v.status !== 'submitted') return json({ error: 'not_reviewable' }, 409)
    const c = newSecret()
    continueSecret = c.secret
    update = { status: 'verified', role_category: b.role_category, venue, borough: b.borough, evidence_type: b.evidence_type,
      decided_at: now, reviewer_id: reviewer.id, secret_hash: c.hash, secret_expires_at: hoursFromNow(CONTINUE_TTL_DAYS * 24) }
  } else if (b.decision === 'not_verified') {
    if (!oneOf(b.rejection_reason, REJECTION_REASONS)) return json({ error: 'missing_reason' }, 400)
    if (v.status !== 'submitted') return json({ error: 'not_reviewable' }, 409)
    update = { status: 'not_verified', rejection_reason: b.rejection_reason, decided_at: now, reviewer_id: reviewer.id,
      secret_hash: null, secret_expires_at: null }
  } else if (b.decision === 'withdrawn') {
    if (!['invited', 'uploading', 'submitted'].includes(v.status)) return json({ error: 'not_reviewable' }, 409)
    update = { status: 'withdrawn', secret_hash: null, secret_expires_at: null }
  } else {
    return json({ error: 'invalid' }, 400)
  }

  const { data: ok, error } = await db.from('employment_verifications').update(update).eq('id', v.id).eq('status', v.status).select('id')
  if (error || !ok?.length) { if (error) logCode('decision_failed', v.id); return json({ error: 'not_reviewable' }, 409) }
  const deletion = v.object_path ? await deleteAndConfirm(db, v.id, v.object_path) : 'deleted'
  return json({ status: update.status, deletion, continueSecret })
}
