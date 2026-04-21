import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function POST(request: Request) {
  const body = await request.json()
  console.log('verify-vibe API called with:', body)

  const {
    userId,
    reporterEmail,
    restaurantName,
    vibe, barSeats, waitTime,
    userLat, userLng,
    restaurantLat, restaurantLng,
    qrCode,
    distanceMeters,
  } = body

  // ── CHECK 1 — Account age (server-authoritative via admin API) ──────────────
  let isNewAccount = true
  if (userId) {
    const { data: authData } = await supabase.auth.admin.getUserById(userId)
    if (authData?.user?.created_at) {
      const ageHours = (Date.now() - new Date(authData.user.created_at).getTime()) / (1000 * 60 * 60)
      isNewAccount = ageHours < 24
    }
  }

  // ── CHECK 2 — Per-restaurant 2hr cooldown ─────────────────────────────────
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: recentSameRestaurant } = await supabase
    .from('vibe_reports')
    .select('id')
    .eq('reported_by', reporterEmail)
    .eq('restaurant_name', restaurantName)
    .gte('created_at', twoHoursAgo)
    .maybeSingle()

  if (recentSameRestaurant) {
    return NextResponse.json(
      { success: false, error: 'You already reported a vibe here recently. Come back in 2 hours.' },
      { status: 429 }
    )
  }

  // ── CHECK 3 — Daily limit across all restaurants ───────────────────────────
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: dailyCount } = await supabase
    .from('vibe_reports')
    .select('id', { count: 'exact' })
    .eq('reported_by', reporterEmail)
    .gte('created_at', todayStart.toISOString())

  if ((dailyCount ?? 0) >= 20) {
    return NextResponse.json(
      { success: false, error: 'Daily limit reached. You can submit 20 vibe reports per day.' },
      { status: 429 }
    )
  }

  // ── CHECK 4 — Anomaly detection (volume in last hour) ─────────────────────
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: hourlyCount } = await supabase
    .from('vibe_reports')
    .select('id', { count: 'exact' })
    .eq('reported_by', reporterEmail)
    .gte('created_at', oneHourAgo)
  const isSuspicious = (hourlyCount ?? 0) >= 3

  // ── CHECK 5 — GPS verification (server-side wins when coords available) ────
  let gpsVerified: boolean = body.gpsVerified ?? false
  let distance: number | null = distanceMeters ?? null

  if (userLat != null && userLng != null && restaurantLat != null && restaurantLng != null) {
    const dist = getDistanceMeters(userLat, userLng, restaurantLat, restaurantLng)
    distance = Math.round(dist)
    gpsVerified = dist <= 500
  }

  const qrVerified = !!qrCode

  // ── CHECK 5 — Integrity score ──────────────────────────────────────────────
  const integrityScore =
    (gpsVerified ? 40 : 0) +
    (qrVerified ? 40 : 0) +
    (!isNewAccount ? 10 : 0) +
    (!isSuspicious ? 10 : 0)

  // ── CHECK 6 — $SERVE reward ────────────────────────────────────────────────
  const serveReward = gpsVerified ? 5 : 2

  // ── CHECK 7 — Persist ─────────────────────────────────────────────────────
  console.log('Attempting to insert vibe report...')
  const { data: insertData, error } = await supabase
    .from('vibe_reports')
    .insert({
      restaurant_name: restaurantName,
      vibe,
      bar_seats: barSeats,
      wait_time: waitTime,
      reported_by: reporterEmail,
      gps_verified: gpsVerified,
      qr_verified: qrVerified,
      integrity_score: integrityScore,
      serve_reward: serveReward,
      is_flagged: isSuspicious,
      distance_meters: distance,
      user_lat: userLat ?? null,
      user_lng: userLng ?? null,
    })
    .select()
  console.log('Insert result:', insertData, error)

  if (error) {
    console.error('[verify-vibe] insert error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // ── Reward — update $SERVE balance ───────────────────────────────────────
  if (serveReward > 0 && reporterEmail) {
    // Check if the reporter is a server
    const { data: serverData } = await supabase
      .from('servers')
      .select('id, serve_balance')
      .eq('email', reporterEmail)
      .maybeSingle()

    if (serverData) {
      // Server — update servers table directly
      const { error: updateError } = await supabase
        .from('servers')
        .update({ serve_balance: (serverData.serve_balance ?? 0) + serveReward })
        .eq('email', reporterEmail)
      if (updateError) console.error('[verify-vibe] server balance update error:', updateError)
    } else {
      // Guest — use RPC to upsert guest_rewards
      const { error: rpcError } = await supabase.rpc('increment_serve_balance', {
        user_email: reporterEmail,
        amount: serveReward,
        user_type: 'guest',
      })
      if (rpcError) console.error('[verify-vibe] increment_serve_balance error:', rpcError)
    }
  }

  const message = serveReward > 0
    ? `You earned ${serveReward} $SERVE!`
    : 'Report submitted. Enable location to earn $SERVE rewards.'

  return NextResponse.json({ success: true, serveReward, integrityScore, gpsVerified, distance, message })
}
