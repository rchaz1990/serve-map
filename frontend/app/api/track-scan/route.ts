import { NextResponse } from 'next/server'
import { getRequestUser, supabaseAdmin } from '@/lib/server-auth'
import { isTestProfile, viewerMayUseProfile } from '@/lib/test-profiles'
import { PAUSED } from '@/lib/early-test'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Records one QR scan. Called by /scan/[code] on page load.
 * Uses the service-role client so qr_scans needs no public RLS policies.
 * Guests do not need to be logged in.
 *
 * Test profiles (migration 42): scans are recorded only for authorized test accounts;
 * anyone else gets the same 404 as for an unknown id. The browser's isTest flag is an
 * analytics label only, never an access control.
 */
export async function POST(request: Request) {
  let body: { serverId?: unknown; sessionId?: unknown; isTest?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { serverId, sessionId, isTest } = body
  if (typeof serverId !== 'string' || !UUID_RE.test(serverId)) {
    return NextResponse.json({ error: 'Invalid serverId' }, { status: 400 })
  }
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 64) {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const access = await viewerMayUseProfile(admin, serverId, await getRequestUser(request))
  if (access === 'error') return NextResponse.json({ error: 'Failed to record scan' }, { status: 503 })
  if (access === 'hidden') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Early test: QR scans are not recorded (no tracking before or without agreement).
  if (PAUSED.qrScanTracking) return NextResponse.json({ success: true, recorded: false })
  const testProfile = (await isTestProfile(admin, serverId)) === true

  const { error } = await admin.from('qr_scans').insert({
    server_id: serverId,
    session_id: sessionId,
    // Scans of a test profile are always test data, whatever the browser says.
    is_test: testProfile || isTest === true,
  })

  if (error) {
    console.error('[track-scan] insert error:', error)
    return NextResponse.json({ error: 'Failed to record scan' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
