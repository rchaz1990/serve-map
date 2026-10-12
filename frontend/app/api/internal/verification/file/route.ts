import {
  admin, imageKind, json, logCode, NO_STORE, requireVerifier, unavailable, verificationAllowed, VERIFICATION_BUCKET,
} from '@/lib/verification-server'

// Streams one submitted image to a named verifier, through this route only: no public or
// signed download link ever exists. Not cached, shown inline, no file name.
export async function POST(request: Request) {
  if (!verificationAllowed()) return unavailable()
  if (!(await requireVerifier(request))) return json({ error: 'Forbidden' }, 403)
  const body = await request.json().catch(() => null) as { id?: unknown } | null
  if (typeof body?.id !== 'string' || !/^[0-9a-f-]{36}$/.test(body.id)) return json({ error: 'invalid' }, 400)

  const db = admin()
  const { data: v } = await db.from('employment_verifications')
    .select('id, status, object_path').eq('id', body.id).maybeSingle()
  if (!v || v.status !== 'submitted' || !v.object_path) return json({ error: 'not_available' }, 404)
  const { data: blob, error } = await db.storage.from(VERIFICATION_BUCKET).download(v.object_path)
  if (error || !blob) { logCode('file_unavailable', v.id); return json({ error: 'not_available' }, 404) }
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const kind = imageKind(bytes)
  if (!kind) return json({ error: 'unsupported' }, 415)
  return new Response(bytes, {
    status: 200,
    headers: { ...NO_STORE, 'Content-Type': kind, 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff' },
  })
}
