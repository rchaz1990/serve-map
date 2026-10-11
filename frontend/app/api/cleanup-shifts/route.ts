import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

// Shortest secret the route will accept. Anything shorter (or missing/empty)
// means the route is misconfigured, so every request is rejected.
const MIN_SECRET_LENGTH = 32

// Returns the caller's credential. The Authorization header is preferred;
// the legacy ?key= query parameter is kept temporarily for compatibility.
function providedCredential(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (auth !== null) {
    const match = /^Bearer (.+)$/.exec(auth)
    return match ? match[1] : null
  }
  return new URL(request.url).searchParams.get('key')
}

// Fails closed: false unless a configured secret of valid length exactly
// matches the provided credential (constant-time comparison).
function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET_KEY
  if (typeof expected !== 'string' || expected.length < MIN_SECRET_LENGTH) return false

  const provided = providedCredential(request)
  if (!provided) return false

  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const twelveHoursAgo = new Date(
    Date.now() - 12 * 60 * 60 * 1000
  ).toISOString()

  // Stale shifts are closed without an end time: the real end is unknown,
  // so ended_at stays as it was (null) instead of recording an artificial
  // multi-hour or multi-month shift. Manual shift endings still set ended_at.
  const { error, count } = await supabase
    .from('shifts')
    .update({ is_active: false }, { count: 'exact' })
    .eq('is_active', true)
    .lt('started_at', twelveHoursAgo)

  if (error) {
    console.error('[cleanup-shifts] update error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    )
  }

  const closed = count ?? 0
  console.log(`[cleanup-shifts] closed ${closed} stale shift(s)`)

  return NextResponse.json({
    success: true,
    message: 'Stale shifts cleaned up',
    closed,
  })
}
