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
  const {
    userLat, userLng,
    restaurantLat, restaurantLng,
    restaurantName,
    vibe, barSeats, waitTime,
    reporterEmail,
  } = await request.json()

  // Server-side distance calculation
  const distance = getDistanceMeters(userLat, userLng, restaurantLat, restaurantLng)
  const withinRange = distance <= 500

  // Anomaly detection — coordinates are suspiciously identical to venue
  const isSuspicious =
    Math.abs(userLat - restaurantLat) < 0.00001 &&
    Math.abs(userLng - restaurantLng) < 0.00001

  const gpsVerified = withinRange && !isSuspicious

  // Rate limiting — one report per venue per hour per reporter
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recentReport } = await supabase
    .from('vibe_reports')
    .select('id')
    .eq('reported_by', reporterEmail)
    .eq('restaurant_name', restaurantName)
    .gte('created_at', oneHourAgo)
    .maybeSingle()

  if (recentReport) {
    return NextResponse.json(
      { success: false, error: 'You already reported a vibe for this venue in the last hour.' },
      { status: 429 }
    )
  }

  const { error } = await supabase
    .from('vibe_reports')
    .insert({
      restaurant_name: restaurantName,
      vibe,
      bar_seats: barSeats,
      wait_time: waitTime,
      reported_by: reporterEmail,
      gps_verified: gpsVerified,
      distance_meters: Math.round(distance),
      is_flagged: isSuspicious,
      user_lat: userLat,
      user_lng: userLng,
    })

  if (error) {
    console.error('[verify-vibe] insert error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, gpsVerified, distance: Math.round(distance) })
}
