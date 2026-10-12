import {
  admin, hashSecret, hoursFromNow, json, logCode, MAX_BYTES, newObjectPath, newSecret, unavailable,
  validSecretShape, verificationAllowed, VERIFICATION_BUCKET,
} from '@/lib/verification-server'
import { VERIFICATION_CONSENT_VERSION } from '@/lib/verification-copy'

const TYPES = ['image/jpeg', 'image/png'] as const
type ImageType = typeof TYPES[number]
// The upload receipt (for "submitted" and withdrawal) outlives the 2-hour upload link.
const RECEIPT_HOURS = 26

// Issues a one-time upload link for one file. Requires the separate verification consent and
// the redaction acknowledgement. The invite secret is consumed here (single use); a receipt
// secret replaces it. A retry with the receipt re-issues a link for the same file name only
// while nothing has been uploaded yet.
export async function POST(request: Request) {
  if (!verificationAllowed()) return unavailable()
  const body = await request.json().catch(() => null) as {
    secret?: unknown; consent?: unknown; consentVersion?: unknown; redactionAck?: unknown; contentType?: unknown; size?: unknown
  } | null
  if (!body || !validSecretShape(body.secret)) return json({ error: 'invalid' }, 400)
  if (body.consent !== true || body.consentVersion !== VERIFICATION_CONSENT_VERSION) return json({ error: 'consent_required' }, 400)
  if (body.redactionAck !== true) return json({ error: 'redaction_ack_required' }, 400)
  if (!TYPES.includes(body.contentType as ImageType)) return json({ error: 'unsupported_type' }, 400)
  if (typeof body.size !== 'number' || body.size <= 0 || body.size > MAX_BYTES) return json({ error: 'too_large' }, 400)

  const db = admin()
  const now = new Date().toISOString()
  const { data: v } = await db.from('employment_verifications')
    .select('id, status, secret_expires_at, object_path')
    .eq('secret_hash', hashSecret(body.secret)).maybeSingle()
  if (!v || !v.secret_expires_at || v.secret_expires_at <= now) return json({ error: 'invalid' }, 400)

  let path: string
  let receipt: string | null = null
  if (v.status === 'invited') {
    path = newObjectPath(body.contentType as ImageType)
    const r = newSecret()
    // Single use: only succeeds while this exact invite secret is still current.
    const { data: claimed } = await db.from('employment_verifications')
      .update({
        status: 'uploading', consent_at: now, consent_version: VERIFICATION_CONSENT_VERSION,
        object_path: path, upload_issued_at: now, secret_hash: r.hash, secret_expires_at: hoursFromNow(RECEIPT_HOURS),
      })
      .eq('id', v.id).eq('status', 'invited').eq('secret_hash', hashSecret(body.secret)).select('id')
    if (!claimed?.length) return json({ error: 'invalid' }, 400)
    receipt = r.secret
  } else if (v.status === 'uploading' && v.object_path) {
    // Retry after a failed upload: same file name, and only if nothing arrived yet.
    const { data: there } = await db.storage.from(VERIFICATION_BUCKET).exists(v.object_path)
    if (there !== false) return json({ error: 'already_uploaded' }, 409)
    if (!v.object_path.endsWith(body.contentType === 'image/png' ? '.png' : '.jpg')) return json({ error: 'unsupported_type' }, 400)
    path = v.object_path
  } else {
    return json({ error: 'invalid' }, 400)
  }

  const { data: signed, error } = await db.storage.from(VERIFICATION_BUCKET).createSignedUploadUrl(path)
  if (error || !signed) { logCode('sign_failed', v.id); return json({ error: 'try_again' }, 503) }
  return json({ uploadUrl: signed.signedUrl, receipt })
}
