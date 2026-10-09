import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestUser, supabaseAdmin } from '@/lib/server-auth'

// Creates the signed-in user's server profile. Safe to call more than once:
// if the account already has a profile it is returned unchanged (created: false),
// so an interrupted signup can be finished without making a duplicate.
//
// Who the profile belongs to and its email always come from the verified
// session token, never from the request body.

const MAX_NAME = 80
const MAX_TEXT = 200
const MAX_SPECIALTIES = 12

function text(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return v ? v.slice(0, max) : null
}

// Only accept a photo this user uploaded to our own Avatars bucket
// (the signup page names files `${userId}-${timestamp}.${ext}`).
function ownPhotoUrl(value: unknown, userId: string): string | null {
  if (typeof value !== 'string') return null
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/Avatars/${userId}-`
  return value.startsWith(prefix) && !value.includes('..') ? value : null
}

type ProfileRow = { id: string; name: string | null }

// The account's existing profile, if any — by auth ID first, then the same
// verified-email link the dashboard uses (link_my_server), run as the user.
async function findExistingProfile(userId: string, token: string): Promise<ProfileRow | null> {
  const admin = supabaseAdmin()
  const { data: byId, error } = await admin
    .from('servers')
    .select('id, name')
    .eq('wallet_address', userId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
  if (error) throw error
  if (byId && byId[0]) return byId[0]

  const asUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
  const { data: linked, error: linkError } = await asUser.rpc('link_my_server')
  if (linkError) throw linkError
  const row = Array.isArray(linked) ? linked[0] : null
  return row ? { id: row.id as string, name: (row.name as string) ?? null } : null
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to finish your profile.' }, { status: 401 })
  }
  const token = request.headers.get('authorization')!.replace(/^Bearer\s+/i, '').trim()
  const email = user.email?.toLowerCase().trim() ?? null

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const name = text(body.name, MAX_NAME)
  const restaurant = text(body.restaurant)
  if (!name || !restaurant) {
    return NextResponse.json({ error: 'Name and restaurant are required.' }, { status: 400 })
  }

  try {
    const admin = supabaseAdmin()

    // A restaurant manager account is not also a server account.
    const { data: manager, error: managerError } = await admin
      .from('restaurant_managers')
      .select('id')
      .eq('auth_id', user.id)
      .limit(1)
    if (managerError) throw managerError
    if (manager && manager.length > 0) {
      return NextResponse.json(
        { error: 'This email is registered as a restaurant manager account. Use a different email for your server profile.' },
        { status: 409 },
      )
    }

    // Already has a profile — return it, create nothing.
    const existing = await findExistingProfile(user.id, token)
    if (existing) {
      console.log('[signup-server] existing profile returned', { serverId: existing.id })
      return NextResponse.json({
        success: true,
        created: false,
        serverId: existing.id,
        serverName: existing.name ?? name,
      })
    }

    const specialties = Array.isArray(body.specialties)
      ? body.specialties.map(s => text(s, 40)).filter((s): s is string => !!s).slice(0, MAX_SPECIALTIES)
      : []

    const { data: inserted, error: serverError } = await admin
      .from('servers')
      .insert({
        name,
        email,
        role: text(body.role, 40),
        wallet_address: user.id, // Supabase auth UID — the profile's owner
        is_founding_member: true,
        // servers.slate_points was dropped; $SERVE lives in serve_ledger. The
        // founding bonus is intentionally not written here (pending founder decision).
        is_test: body.isTest === true,
        photo_url: ownPhotoUrl(body.photoUrl, user.id),
        specialties,
        // Hidden from recruiters until the worker turns it on (consent; see migration 37).
        open_to_opportunities: false,
      })
      .select('id, name')
      .single()
    if (serverError) {
      // With the one-profile-per-account unique index in place, a concurrent
      // request that already created the profile surfaces here as 23505.
      if (serverError.code === '23505') {
        const winner = await findExistingProfile(user.id, token)
        if (winner) return NextResponse.json({ success: true, created: false, serverId: winner.id, serverName: winner.name ?? name })
      }
      throw serverError
    }

    // Two requests at once (double tap, retry after a slow network) could both
    // get past the check above. Keep the oldest profile for this account and
    // remove the one we just made if it lost the race.
    const { data: mine, error: mineError } = await admin
      .from('servers')
      .select('id, name')
      .eq('wallet_address', user.id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
    if (mineError) throw mineError
    const keeper = mine && mine[0] ? mine[0] : inserted
    if (keeper.id !== inserted.id) {
      await admin.from('servers').delete().eq('id', inserted.id).eq('wallet_address', user.id)
      console.log('[signup-server] concurrent duplicate removed', { kept: keeper.id, removed: inserted.id })
      return NextResponse.json({ success: true, created: false, serverId: keeper.id, serverName: keeper.name ?? name })
    }

    const today = new Date().toISOString().slice(0, 10)
    const restaurantRows = [{
      server_id: inserted.id,
      restaurant_name: restaurant,
      restaurant_address: text(body.restaurantAddress),
      city: text(body.city) ?? 'New York',
      is_primary: true,
      currently_working: true,
      start_date: today,
    }]
    const restaurant2 = text(body.restaurant2)
    if (restaurant2) {
      restaurantRows.push({
        server_id: inserted.id,
        restaurant_name: restaurant2,
        restaurant_address: text(body.restaurantAddress2),
        city: text(body.city2) ?? 'New York',
        is_primary: false,
        currently_working: true,
        start_date: today,
      })
    }
    const { error: restError } = await admin.from('server_restaurants').insert(restaurantRows)
    if (restError) console.error('[signup-server] restaurant save failed', { serverId: inserted.id, code: restError.code })

    console.log('[signup-server] profile created', { serverId: inserted.id, restaurantSaved: !restError })
    return NextResponse.json({
      success: true,
      created: true,
      serverId: inserted.id,
      serverName: inserted.name,
      restaurantSaved: !restError,
    })
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    console.error('[signup-server] failed', { code: e?.code, message: e?.message })
    return NextResponse.json({ error: 'We could not save your profile. Please try again.' }, { status: 500 })
  }
}
