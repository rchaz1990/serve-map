import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service-role client server-side so RLS doesn't block inserts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[signup-server] Request body:', JSON.stringify(body))

    const {
      name,
      email: rawEmail,
      role,
      restaurant,
      restaurantAddress,
      city,
      restaurant2,
      restaurantAddress2,
      city2,
      userId,  // Supabase auth UID — stored in wallet_address for fast lookup
      photoUrl,
    } = body

    const email = rawEmail?.toLowerCase().trim()
    console.log('[signup-server] Saving server — email:', email, 'userId:', userId, 'restaurant:', restaurant)

    // Insert server row — wallet_address holds the Supabase auth user ID
    // so every query can do .eq('wallet_address', session.user.id)
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .insert({
        name,
        email,
        role,
        wallet_address: userId ?? null,
        is_founding_member: true,
        slate_points: 50,  // Founding member bonus
        photo_url: photoUrl ?? null,
      })
      .select('id, name')
      .single()

    console.log('[signup-server] Server created:', server, 'Error:', serverError)
    if (serverError) throw serverError

    const today = new Date().toISOString().slice(0, 10)

    // Primary restaurant
    const { data: rest1, error: rest1Error } = await supabase
      .from('server_restaurants')
      .insert({
        server_id: server.id,
        restaurant_name: restaurant ?? '',
        restaurant_address: restaurantAddress ?? null,
        city: city ?? 'New York',
        is_primary: true,
        currently_working: true,
        start_date: today,
      })
      .select()

    console.log('[signup-server] Restaurant saved:', rest1)
    console.log('[signup-server] Restaurant error:', rest1Error)
    if (rest1Error) {
      console.error('[signup-server] Failed to save restaurant:', rest1Error.message, rest1Error.details, rest1Error.hint)
    }

    // Second restaurant (optional)
    if (restaurant2) {
      const { data: rest2, error: rest2Error } = await supabase
        .from('server_restaurants')
        .insert({
          server_id: server.id,
          restaurant_name: restaurant2,
          restaurant_address: restaurantAddress2 ?? null,
          city: city2 ?? 'New York',
          is_primary: false,
          currently_working: true,
          start_date: today,
        })
        .select()

      console.log('[signup-server] Restaurant 2 saved:', rest2)
      if (rest2Error) {
        console.error('[signup-server] Failed to save restaurant 2:', rest2Error.message, rest2Error.details, rest2Error.hint)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      serverId: server.id,
      serverName: server.name,
      restaurantSaved: !rest1Error,
    })
  } catch (error: unknown) {
    console.error('[signup-server] error details:', error)
    let msg = 'Failed to create profile'
    if (error instanceof Error) {
      msg = error.message
    } else if (error && typeof error === 'object') {
      const e = error as Record<string, unknown>
      msg = (e.message as string) || (e.details as string) || (e.hint as string) || JSON.stringify(error)
    } else if (typeof error === 'string') {
      msg = error
    }
    return NextResponse.json({ error: msg, details: JSON.stringify(error) }, { status: 500 })
  }
}
