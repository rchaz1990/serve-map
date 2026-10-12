import {
  admin, deleteAndConfirm, hashSecret, hoursFromNow, imageKind, json, logCode, MAX_BYTES, unavailable,
  UNREVIEWED_DELETE_HOURS, validSecretShape, verificationAllowed, VERIFICATION_BUCKET,
} from '@/lib/verification-server'

// The candidate's browser reports that the upload finished. The server checks the stored file
// itself: it must exist, fit the size limit and really be a JPEG/PNG matching its name. A file
// that fails is rejected automatically ('unsupported') and deleted at once.
export async function POST(request: Request) {
  if (!verificationAllowed()) return unavailable()
  const body = await request.json().catch(() => null) as { secret?: unknown } | null
  if (!validSecretShape(body?.secret)) return json({ error: 'invalid' }, 400)

  const db = admin()
  const now = new Date().toISOString()
  const { data: v } = await db.from('employment_verifications')
    .select('id, status, secret_expires_at, object_path')
    .eq('secret_hash', hashSecret(body.secret)).maybeSingle()
  if (!v || v.status !== 'uploading' || !v.object_path || !v.secret_expires_at || v.secret_expires_at <= now) {
    return json({ error: 'invalid' }, 400)
  }

  const { data: blob, error } = await db.storage.from(VERIFICATION_BUCKET).download(v.object_path)
  if (error || !blob) return json({ error: 'not_uploaded' }, 409)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const expected = v.object_path.endsWith('.png') ? 'image/png' : 'image/jpeg'
  if (bytes.length === 0 || bytes.length > MAX_BYTES || imageKind(bytes) !== expected) {
    const { error: rejErr } = await db.from('employment_verifications')
      .update({ status: 'not_verified', rejection_reason: 'unsupported', decided_at: now, secret_hash: null, secret_expires_at: null })
      .eq('id', v.id).eq('status', 'uploading')
    if (rejErr) logCode('reject_failed', v.id)
    const deletion = await deleteAndConfirm(db, v.id, v.object_path)
    return json({ state: 'rejected_file', deletion })
  }

  // The receipt stays valid until the review deadline, so the candidate can still withdraw.
  const { data: ok } = await db.from('employment_verifications')
    .update({ status: 'submitted', submitted_at: now, secret_expires_at: hoursFromNow(UNREVIEWED_DELETE_HOURS) })
    .eq('id', v.id).eq('status', 'uploading').select('id')
  if (!ok?.length) return json({ error: 'invalid' }, 400)
  return json({ state: 'submitted' })
}
