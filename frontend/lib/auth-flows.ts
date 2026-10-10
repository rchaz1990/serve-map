import type { SupabaseClient, User } from '@supabase/supabase-js'

// Shared sign-in / sign-up helpers. They work whether Supabase "Confirm email" is
// on (sign-up returns no session until the link is clicked) or off (session at once).
// Every call runs as the signed-in user, so the database's own rules apply.

export const MANAGER_ROLES = ['General Manager', 'Assistant Manager', 'Host', 'Owner'] as const

/** Sign-up metadata for a restaurant manager whose restaurant row is created after confirmation. */
export function pendingManagerMetadata(fullName: string, restaurantName: string, role: string) {
  return {
    full_name: fullName,
    signup_role: 'manager',
    pending_restaurant_name: restaurantName.trim().slice(0, 120),
    pending_manager_role: (MANAGER_ROLES as readonly string[]).includes(role) ? role : null,
  }
}

export type ManagerRow = { id: string; restaurant_name: string }

/**
 * The signed-in user's restaurant manager row, creating it if they signed up as a
 * manager and it doesn't exist yet. Order: own row → claim a waitlist row by verified
 * email (link_my_manager) → create from sign-up details. Returns null for non-managers.
 */
export async function finishPendingManager(client: SupabaseClient, user: User): Promise<ManagerRow | null> {
  const own = await client.from('restaurant_managers').select('id, restaurant_name').eq('auth_id', user.id).maybeSingle()
  if (own.data) return own.data as ManagerRow

  const { data: linked } = await client.rpc('link_my_manager')
  const claimed = Array.isArray(linked) ? linked[0] : null
  if (claimed) return { id: claimed.id as string, restaurant_name: claimed.restaurant_name as string }

  const meta = user.user_metadata ?? {}
  const restaurantName = typeof meta.pending_restaurant_name === 'string' ? meta.pending_restaurant_name.trim() : ''
  if (meta.signup_role !== 'manager' || !restaurantName || !user.email) return null

  const { data: inserted, error } = await client
    .from('restaurant_managers')
    .insert({
      email: user.email.toLowerCase(),
      name: typeof meta.full_name === 'string' ? meta.full_name.slice(0, 120) : null,
      restaurant_name: restaurantName.slice(0, 120),
      auth_id: user.id,
      role: typeof meta.pending_manager_role === 'string' ? meta.pending_manager_role : null,
    })
    .select('id, restaurant_name')
    .single()
  if (inserted) return inserted as ManagerRow

  // Created in parallel (e.g. two tabs) — return the row that won.
  if (error?.code === '23505') {
    const again = await client.from('restaurant_managers').select('id, restaurant_name').eq('auth_id', user.id).maybeSingle()
    if (again.data) return again.data as ManagerRow
    // Same email is already on the restaurant waitlist and can't be claimed yet.
    throw new Error('This email is already on Slate\'s restaurant waitlist. To claim it, sign in with Google using this email, or contact Slate.')
  }
  if (error) throw new Error(error.message)
  return null
}

/** Where to send a user after any successful sign-in from a link (OAuth, confirmation). */
export async function postAuthPath(client: SupabaseClient, user: User, nextHint: string | null): Promise<string> {
  let manager: ManagerRow | null = null
  try {
    manager = await finishPendingManager(client, user)
  } catch (e) {
    console.error('[auth] finishing manager signup:', e instanceof Error ? e.message : e)
  }

  // Manager login intent: never fall through to the worker dashboard.
  if (nextHint === '/restaurant/dashboard') return manager ? '/restaurant/dashboard' : '/restaurant/login?error=no_manager'
  if (nextHint) return nextHint
  if (manager) return '/restaurant/dashboard'

  const { data: server } = await client.from('servers').select('id').eq('wallet_address', user.id).maybeSingle()
  if (server) return '/dashboard'
  if (user.user_metadata?.signup_role === 'server') return '/servers/signup'
  if (user.user_metadata?.signup_role === 'manager') return '/restaurant/login?error=no_manager'
  return '/get-started'
}

/** True when Supabase refused a password sign-in because the email isn't confirmed yet. */
export function isEmailNotConfirmed(error: { message?: string; code?: string } | null | undefined): boolean {
  return !!error && (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message ?? ''))
}
