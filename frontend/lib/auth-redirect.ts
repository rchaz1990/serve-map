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

/**
 * One decode. Internal only: a single leading slash, not //, no scheme, no backslash.
 * Returns null when the value should be ignored.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return null
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null
  if (decoded.includes('://') || decoded.includes('\\')) return null
  return decoded
}

/** Store where /auth/callback should send the user after exchange. */
/** Forget a pending return path (e.g. sign-up finished without needing an email link). */
export function clearOAuthNextHint(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${OAUTH_NEXT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

export function setOAuthNextHint(path: string, maxAgeSeconds = 600): void {
  if (typeof document === 'undefined') return
  const safe = safeInternalPath(path)
  if (!safe) return
  const secure = window.location.protocol === 'https:'
  document.cookie = `${OAUTH_NEXT_COOKIE}=${encodeURIComponent(safe)}; Path=/; Max-Age=${Math.floor(maxAgeSeconds)}; SameSite=Lax${secure ? '; Secure' : ''}`
}
