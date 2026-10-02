/**
 * OAuth redirect helpers.
 *
 * Supabase only honors redirectTo when it matches Auth → Redirect URLs.
 * Putting query params on redirectTo (e.g. ?next=/restaurant/dashboard)
 * often fails exact-match allowlists; Supabase then falls back to Site URL
 * (the public homepage) and appends ?code= — never hitting /auth/callback,
 * so exchangeCodeForSession never runs.
 *
 * Always use a bare /auth/callback path. Pass post-login intent via cookie.
 */

export const CANONICAL_ORIGIN = 'https://www.slatenow.xyz'
export const OAUTH_NEXT_COOKIE = 'slate_oauth_next'

/** Browser (or SSR fallback) origin, apex → www for production. */
export function getAppOrigin(): string {
  if (typeof window === 'undefined') return CANONICAL_ORIGIN
  const { protocol, hostname, origin } = window.location
  if (hostname === 'slatenow.xyz') return `${protocol}//www.slatenow.xyz`
  return origin
}

/** redirectTo for signInWithOAuth — path only, no query string. */
export function getAuthCallbackUrl(): string {
  return `${getAppOrigin()}/auth/callback`
}

/** Store where /auth/callback should send the user after exchange. */
export function setOAuthNextHint(path: string): void {
  if (typeof document === 'undefined') return
  if (!path.startsWith('/') || path.startsWith('//')) return
  const secure = window.location.protocol === 'https:'
  document.cookie = `${OAUTH_NEXT_COOKIE}=${encodeURIComponent(path)}; Path=/; Max-Age=600; SameSite=Lax${secure ? '; Secure' : ''}`
}
