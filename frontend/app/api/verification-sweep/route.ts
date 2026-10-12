import {
  admin, cronAuthorized, deleteAndConfirm, json, logCode, removeAndConfirm, unavailable, verificationAllowed,
} from '@/lib/verification-server'

const ORPHAN_BATCH = 100

// Scheduled cleanup. POST only; `Authorization: Bearer <CRON_SECRET_KEY>` only (no ?key=).
//  1. invite links past their expiry → expired
//  2. uploads not completed, or not reviewed, before their deadline → expired (files deleted in 3)
//  3. decided/withdrawn/expired records whose file deletion is still pending → retry (confirmed)
//  4. continuation links past their expiry → cleared
//  5. files no record points at (e.g. uploaded after a withdrawal) → deleted and confirmed,
//     at most 100 per run; only confirmed deletions are counted
// Body {"dryRun": true} reports what would happen and changes nothing. Returns counts only.
export async function POST(request: Request) {
  if (!verificationAllowed()) return unavailable()
  if (!cronAuthorized(request)) return json({ error: 'Unauthorized' }, 401)
  const body = await request.json().catch(() => null) as { dryRun?: unknown } | null
  const dryRun = body?.dryRun === true
  const db = admin()
  const now = new Date().toISOString()

  const { data: overdue } = await db.from('employment_verifications')
    .select('id, status').in('status', ['invited', 'uploading', 'submitted']).lte('secret_expires_at', now)
  const { data: orphanRows, error: oErr } = await db.rpc('verification_unreferenced_objects', { p_older_than: '3 hours', p_limit: ORPHAN_BATCH })
  if (oErr) logCode('orphan_scan_failed')
  const orphans = ((orphanRows ?? []) as unknown[])
    .map(o => typeof o === 'string' ? o : (o as Record<string, string>).verification_unreferenced_objects)
    .filter(Boolean).slice(0, ORPHAN_BATCH)

  if (dryRun) {
    const { count: leftovers } = await db.from('employment_verifications').select('id', { count: 'exact', head: true })
      .not('object_path', 'is', null).in('status', ['verified', 'not_verified', 'withdrawn', 'expired'])
    const { count: links } = await db.from('employment_verifications').select('id', { count: 'exact', head: true })
      .eq('status', 'verified').lte('secret_expires_at', now)
    return json({ dryRun: true, wouldExpire: overdue?.length ?? 0, wouldRetryDeletion: (leftovers ?? 0) + (overdue?.length ?? 0),
      wouldClearLinks: links ?? 0, wouldRemoveOrphans: orphans.length })
  }

  const out = { expired: 0, deleted: 0, pending: 0, orphans: 0, orphansPending: 0 }

  // 1–2. Expire overdue records first, so a late reviewer can no longer act on them.
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

  // 5. Unreferenced files (older than the 2-hour upload-link lifetime plus margin), confirmed.
  for (const name of orphans) {
    if (await removeAndConfirm(db, name)) out.orphans++
    else { out.orphansPending++; logCode('orphan_delete_unconfirmed') }
  }
  return json(out)
}
