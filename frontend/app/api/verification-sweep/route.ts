import {
  admin, cronAuthorized, deleteAndConfirm, json, logCode, unavailable, verificationAllowed, VERIFICATION_BUCKET,
} from '@/lib/verification-server'

// Scheduled cleanup (same cron secret as /api/cleanup-shifts, exact `Bearer ` header):
//  1. invite links past their expiry → expired
//  2. uploads not completed, or not reviewed, before their deadline → expired; file deleted
//  3. decided/withdrawn/expired records whose file deletion is still pending → retry
//  4. continuation links past their expiry → cleared
//  5. files no record points at (e.g. uploaded after a withdrawal) → deleted
// Returns counts only.
export async function POST(request: Request) {
  if (!verificationAllowed()) return unavailable()
  if (!cronAuthorized(request)) return json({ error: 'Unauthorized' }, 401)
  const db = admin()
  const now = new Date().toISOString()
  const out = { expired: 0, deleted: 0, pending: 0, orphans: 0 }

  // 1–2. Expire overdue records (the status change happens first, so a late reviewer can no
  //      longer act on them), then delete their files.
  const { data: overdue } = await db.from('employment_verifications')
    .select('id, status, object_path').in('status', ['invited', 'uploading', 'submitted']).lte('secret_expires_at', now)
  for (const v of overdue ?? []) {
    const { data: ok } = await db.from('employment_verifications')
      .update({ status: 'expired', secret_hash: null, secret_expires_at: null })
      .eq('id', v.id).eq('status', v.status).select('id')
    if (ok?.length) out.expired++
  }

  // 3. Every record that is no longer open but still points at a file.
  const { data: leftovers } = await db.from('employment_verifications')
    .select('id, object_path').not('object_path', 'is', null).in('status', ['verified', 'not_verified', 'withdrawn', 'expired'])
  for (const v of leftovers ?? []) {
    const r = await deleteAndConfirm(db, v.id, v.object_path as string)
    if (r === 'deleted') out.deleted++; else out.pending++
  }

  // 4. Continuation links (18+ attestation) that were never used.
  await db.from('employment_verifications').update({ secret_hash: null, secret_expires_at: null })
    .eq('status', 'verified').lte('secret_expires_at', now)

  // 5. Unreferenced files older than the 2-hour upload-link lifetime (plus margin).
  const { data: orphans, error: oErr } = await db.rpc('verification_unreferenced_objects', { p_older_than: '3 hours' })
  if (oErr) logCode('orphan_scan_failed')
  const names = ((orphans ?? []) as unknown[]).map(o => typeof o === 'string' ? o : (o as Record<string, string>).verification_unreferenced_objects)
  for (const name of names.filter(Boolean)) {
    const { error } = await db.storage.from(VERIFICATION_BUCKET).remove([name])
    if (error) { logCode('orphan_delete_failed'); out.pending++ } else out.orphans++
  }
  return json(out)
}
