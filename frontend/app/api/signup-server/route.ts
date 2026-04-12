import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js'
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
      walletAddress,
    } = body

    const email = rawEmail?.toLowerCase().trim()
    console.log('[signup-server] Saving server with email:', email)

    // Resolve fee-payer keypair (used as the on-chain identity when no wallet provided)
    let resolvedWalletAddress = walletAddress
    if (!resolvedWalletAddress && process.env.FEE_PAYER_PRIVATE_KEY) {
      try {
        const privateKeyArray = JSON.parse(process.env.FEE_PAYER_PRIVATE_KEY)
        const feePayerKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray))
        // Verify connection is reachable (non-blocking — don't fail signup if devnet is slow)
        new Connection(clusterApiUrl('devnet'), 'confirmed')
        resolvedWalletAddress = feePayerKeypair.publicKey.toString()
      } catch (e) {
        console.warn('[signup-server] fee payer keypair error:', e)
      }
    }

    // Insert server row
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .insert({
        name,
        email,
        role,
        wallet_address: resolvedWalletAddress ?? null,
        is_founding_member: true,
      })
      .select('id, name')
      .single()

    if (serverError) throw serverError

    const today = new Date().toISOString().slice(0, 10)

    // Build restaurant rows
    const restaurantRows: object[] = [
      {
        server_id: server.id,
        restaurant_name: restaurant,
        restaurant_address: restaurantAddress ?? null,
        city: city ?? 'New York',
        is_primary: true,
        currently_working: true,
        start_date: today,
      },
    ]

    if (restaurant2) {
      restaurantRows.push({
        server_id: server.id,
        restaurant_name: restaurant2,
        restaurant_address: restaurantAddress2 ?? null,
        city: city2 ?? 'New York',
        is_primary: false,
        currently_working: true,
        start_date: today,
      })
    }

    const { error: restError } = await supabase
      .from('server_restaurants')
      .insert(restaurantRows)

    if (restError) throw restError

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      serverId: server.id,   // UUID e.g. "550e8400-e29b-41d4-a716-446655440000"
      serverName: server.name,
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
