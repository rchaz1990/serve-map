import { createHash } from 'crypto'
import {
  admin, deleteAndConfirm, hashSecret, hoursFromNow, imageKind, json, logCode, MAX_BYTES, unavailable,
  UNREVIEWED_DELETE_HOURS, validSecretShape, verificationAllowed, VERIFICATION_BUCKET,
} from '@/lib/verification-server'
import { sanitizeImage } from '@/lib/verification-image'

const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')

// The candidate's browser reports that the upload finished. The server does not trust the
// upload (the signed URL can be used without the browser's re-encoding):
//  1. downloads the stored file; it must exist, fit the size limit and be a JPEG/PNG by content;
//  2. decodes and re-encodes it server-side (orientation applied; no EXIF/XMP/ICC/comments/text
//     chunks/trailing data; pixel and dimension limits);
//  3. overwrites the stored file with the cleaned bytes and checks the overwrite took.
// A file that fails any step is rejected automatically and deleted at once (confirmed).
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
  const path: string = v.object_path

  const { data: blob, error } = await db.storage.from(VERIFICATION_BUCKET).download(path)
  if (error || !blob) return json({ error: 'not_uploaded' }, 409)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const expected = path.endsWith('.png') ? 'image/png' : 'image/jpeg'

  const reject = async (reason: 'unsupported' | 'unreadable') => {
    const { error: rejErr } = await db.from('employment_verifications')
      .update({ status: 'not_verified', rejection_reason: reason, decided_at: now, secret_hash: null, secret_expires_at: null })
      .eq('id', v.id).eq('status', 'uploading')
    if (rejErr) logCode('reject_failed', v.id)
    const deletion = await deleteAndConfirm(db, v.id, path)
    return json({ state: 'rejected_file', deletion })
  }

  if (bytes.length === 0 || bytes.length > MAX_BYTES || imageKind(bytes) !== expected) return reject('unsupported')
  const clean = await sanitizeImage(bytes, expected)
  if (!clean.ok) return reject(clean.reason)

  // Overwrite the stored file with the cleaned bytes, then confirm the stored bytes are exactly
  // the cleaned ones (fail closed otherwise).
  const { error: upErr } = await db.storage.from(VERIFICATION_BUCKET)
    .upload(path, clean.bytes, { upsert: true, contentType: expected, cacheControl: '0' })
  if (upErr) { logCode('sanitize_write_failed', v.id); return reject('unreadable') }
  const { data: again } = await db.storage.from(VERIFICATION_BUCKET).download(path)
  if (!again || sha(new Uint8Array(await again.arrayBuffer())) !== sha(clean.bytes)) {
    logCode('sanitize_verify_failed', v.id)
    return reject('unreadable')
  }

  // The receipt stays valid until the review deadline, so the candidate can still withdraw.
  const { data: ok } = await db.from('employment_verifications')
    .update({ status: 'submitted', submitted_at: now, secret_expires_at: hoursFromNow(UNREVIEWED_DELETE_HOURS) })
    .eq('id', v.id).eq('status', 'uploading').select('id')
  if (!ok?.length) return json({ error: 'invalid' }, 400)
  return json({ state: 'submitted' })
}
