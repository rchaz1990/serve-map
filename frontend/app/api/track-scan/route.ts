import { NextResponse } from 'next/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Records one QR scan. Called by /scan/[code] on page load.
 * Uses the service-role client so qr_scans needs no public RLS policies.
 * Guests do not need to be logged in.
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

  const { createClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // server_id has a foreign key to servers(id), so unknown worker IDs are rejected by the DB
  const { error } = await supabaseAdmin.from('qr_scans').insert({
    server_id: serverId,
    session_id: sessionId,
    is_test: isTest === true,
  })

  if (error) {
    console.error('[track-scan] insert error:', error)
    return NextResponse.json({ error: 'Failed to record scan' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
