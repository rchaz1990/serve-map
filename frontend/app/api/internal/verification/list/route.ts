import { admin, json, requireVerifier, unavailable, verificationAllowed } from '@/lib/verification-server'

// The verifier's queue: records awaiting review, plus any decided record whose file deletion
// is still pending. Never includes file names, paths or secrets.
export async function POST(request: Request) {
  if (!verificationAllowed()) return unavailable()
  if (!(await requireVerifier(request))) return json({ error: 'Forbidden' }, 403)
  const { data, error } = await admin().from('employment_verifications')
    .select('id, status, created_at, upload_issued_at, submitted_at, decided_at, deleted_at, object_path')
    .or('status.in.(invited,uploading,submitted),object_path.not.is.null')
    .order('created_at', { ascending: true }).limit(200)
  if (error) return json({ error: 'try_again' }, 503)
  const rows = (data ?? []).map(({ object_path, ...r }) => ({
    ...r,
    deletion_pending: !!object_path && !['invited', 'uploading', 'submitted'].includes(r.status),
  }))
  return json({ rows })
}
