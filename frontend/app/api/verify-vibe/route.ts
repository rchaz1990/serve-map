import { NextResponse } from 'next/server'
import { getRequestUser, supabaseAdmin } from '@/lib/server-auth'

// Records a guest's vibe report for a venue and, when it qualifies, a small
// guest $SERVE reward (display balance only; nothing is paid out). At most 3
// rewarded reports (15 $SERVE) per account per UTC day; later reports earn 0.
//
// Identity always comes from the signed-in session, never from the request body.
// The cooldown, daily limit, report and reward are applied in one locked database
// call (submit_vibe_report), so parallel requests cannot double-report or double-credit.
//
// Location: "location-consistent" means the phone's reported position was within
// 500 m of the venue position the page looked up. Both positions come from the
// browser, so this is a consistency signal, NOT proof the person was there —
// a determined user can fake device location.
//
// The phone's coordinates are used only for that distance check, in this request. They
// are not stored or logged: the report keeps the distance and whether the check passed.

const VIBES = ['CHILL', 'LIVE', 'PACKED'] as const
const SEATS = ['Plenty', 'A few', 'None'] as const
const WAITS = ['No wait', '~15 min', '30+ min'] as const
const MAX_DISTANCE_METERS = 500
const NEW_ACCOUNT_HOURS = 24

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function coord(value: unknown, max: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max ? value : null
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

export async function POST(request: Request) {
  const user = await getRequestUser(request)
  if (!user || !user.email) {
    return NextResponse.json(
      { success: false, error: 'Please sign in to report vibes.' },
      { status: 401 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 })
  }

  const restaurantName = typeof body.restaurantName === 'string' ? body.restaurantName.trim().slice(0, 120) : ''
  const vibe = oneOf(body.vibe, VIBES)
  if (!restaurantName || !vibe) {
    return NextResponse.json({ success: false, error: 'Pick a venue and a vibe.' }, { status: 400 })
  }
  const barSeats = oneOf(body.barSeats, SEATS)
  const waitTime = oneOf(body.waitTime, WAITS)

  // Distance is computed here from the two positions; any client "verified" flag is ignored.
  const userLat = coord(body.userLat, 90)
  const userLng = coord(body.userLng, 180)
  const venueLat = coord(body.restaurantLat, 90)
  const venueLng = coord(body.restaurantLng, 180)
  let distance: number | null = null
  if (userLat !== null && userLng !== null && venueLat !== null && venueLng !== null) {
    distance = Math.round(distanceMeters(userLat, userLng, venueLat, venueLng))
  }
  const locationConsistent = distance !== null && distance <= MAX_DISTANCE_METERS

  const ageHours = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60)

  const { data, error } = await supabaseAdmin().rpc('submit_vibe_report', {
    p_email: user.email,
    p_restaurant_name: restaurantName,
    p_vibe: vibe,
    p_bar_seats: barSeats,
    p_wait_time: waitTime,
    // Raw coordinates are not retained (limited-test data policy).
    p_user_lat: null,
    p_user_lng: null,
    p_distance_meters: distance,
    p_location_consistent: locationConsistent,
    p_new_account: !(ageHours >= NEW_ACCOUNT_HOURS),
  })

  if (error) {
    console.error('[verify-vibe] failed', { code: error.code })
    return NextResponse.json({ success: false, error: 'Could not save your report. Please try again.' }, { status: 500 })
  }

  const result = data as { status: string; serve_reward?: number; integrity_score?: number; daily_reward_cap_reached?: boolean }
  if (result.status === 'cooldown') {
    return NextResponse.json(
      { success: false, error: 'You already reported a vibe here recently. Come back in 2 hours.' },
      { status: 429 },
    )
  }
  if (result.status === 'daily_limit') {
    return NextResponse.json(
      { success: false, error: 'Daily limit reached. You can submit 20 vibe reports per day.' },
      { status: 429 },
    )
  }

  const serveReward = result.serve_reward ?? 0
  const message = serveReward > 0
    ? `You earned ${serveReward} Slate Points!`
    : result.daily_reward_cap_reached
      ? 'Report submitted. You have earned today\'s maximum Slate Points for vibe reports.'
      : locationConsistent
        ? 'Report submitted.'
        : 'Report submitted. Turn on location at the venue to earn more Slate Points.'

  return NextResponse.json({
    success: true,
    serveReward,
    integrityScore: result.integrity_score ?? 0,
    gpsVerified: locationConsistent,
    distance,
    message,
  })
}
