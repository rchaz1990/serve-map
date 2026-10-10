import { NextResponse } from 'next/server'
import { getRequestUser, supabaseAdmin } from '@/lib/server-auth'
import { viewerMayUseProfile } from '@/lib/test-profiles'

// For the signed-in guest on a worker's QR page: has this guest already rated this worker,
// and is the guest still inside the 24-hour rating cooldown? Yes/no answers only, about the
// caller's own ratings. Uses the same key and window as the database cooldown
// (submit_rating_reward: guest_email = the account's email, 24 hours).
// A test profile is "not found" for anyone who isn't a test account (migration 42).
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('server') ?? ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid server' }, { status: 400 })
  }
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const admin = supabaseAdmin()
  const access = await viewerMayUseProfile(admin, id, user)
  if (access === 'error') return NextResponse.json({ error: 'Try again' }, { status: 503 })
  if (access === 'hidden') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const guestKey = (user.email ?? user.id).trim().toLowerCase()
  const { data, error } = await admin
    .from('ratings')
    .select('created_at')
    .eq('server_id', id)
    .ilike('guest_email', guestKey.replace(/[\\%_]/g, c => '\\' + c))
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) return NextResponse.json({ error: 'Try again' }, { status: 503 })

  const last = data?.[0]?.created_at ? new Date(data[0].created_at as string).getTime() : null
  return NextResponse.json(
    { rated: last !== null, inCooldown: last !== null && Date.now() - last < 24 * 60 * 60 * 1000 },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
