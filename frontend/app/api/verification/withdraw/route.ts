import {
  admin, deleteAndConfirm, hashSecret, json, unavailable, validSecretShape, verificationAllowed,
} from '@/lib/verification-server'

// The candidate withdraws (before or after uploading, until a decision). Any file is deleted
// at once; the record keeps only the 'withdrawn' status.
export async function POST(request: Request) {
  if (!verificationAllowed()) return unavailable()
  const body = await request.json().catch(() => null) as { secret?: unknown } | null
  if (!validSecretShape(body?.secret)) return json({ error: 'invalid' }, 400)

  const db = admin()
  const { data: v } = await db.from('employment_verifications')
    .select('id, status, object_path')
    .eq('secret_hash', hashSecret(body.secret)).maybeSingle()
  if (!v || !['invited', 'uploading', 'submitted'].includes(v.status)) return json({ error: 'invalid' }, 400)

  const { data: ok } = await db.from('employment_verifications')
    .update({ status: 'withdrawn', secret_hash: null, secret_expires_at: null })
    .eq('id', v.id).eq('status', v.status).select('id')
  if (!ok?.length) return json({ error: 'invalid' }, 400)
  const deletion = v.object_path ? await deleteAndConfirm(db, v.id, v.object_path) : 'deleted'
  return json({ state: 'withdrawn', deletion })
}
