import { admin, hashSecret, json, unavailable, validSecretShape, verificationAllowed } from '@/lib/verification-server'

// Which step a verification link is at. The secret travels in the request body (the page
// reads it from the URL fragment, which browsers never send to servers or logs).
export async function POST(request: Request) {
  if (!verificationAllowed()) return unavailable()
  const body = await request.json().catch(() => null) as { secret?: unknown } | null
  if (!validSecretShape(body?.secret)) return json({ state: 'invalid' })

  const { data: v } = await admin().from('employment_verifications')
    .select('status, secret_expires_at, object_path, age_attested_at')
    .eq('secret_hash', hashSecret(body.secret)).maybeSingle()
  if (!v) return json({ state: 'invalid' })
  if (!v.secret_expires_at || new Date(v.secret_expires_at) <= new Date()) {
    return json({ state: v.status === 'invited' ? 'expired' : 'invalid' })
  }
  if (v.status === 'invited') return json({ state: 'consent' })
  if (v.status === 'uploading') return json({ state: 'upload' })
  if (v.status === 'submitted') return json({ state: 'submitted' })
  if (v.status === 'verified' && !v.age_attested_at) return json({ state: 'age' })
  return json({ state: 'invalid' })
}
