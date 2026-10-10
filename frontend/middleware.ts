import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * If Supabase falls back to Site URL (homepage) with ?code=, the auth code
 * never reaches /auth/callback and is never exchanged. Forward any orphaned
 * OAuth code to the route handler while preserving query params.
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const code = searchParams.get('code')

  // Includes /reset-password?code=… (older reset links): the callback exchanges it and
  // only sends the browser back to /reset-password if it really was a recovery link.
  if (code && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
