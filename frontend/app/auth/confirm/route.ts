import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { EmailOtpType } from '@supabase/supabase-js'
import { postAuthPath } from '@/lib/auth-flows'
import { recoveryMarkerCookie } from '@/lib/recovery-marker'

// Email links that carry a token_hash (Supabase email templates pointing here):
//   /auth/confirm?token_hash=…&type=signup|email|recovery|email_change|invite|magiclink
// Unlike the default PKCE links, these work on any device or browser, because the
// token is verified on the server instead of being paired with this browser.

const TYPES: EmailOtpType[] = ['signup', 'email', 'recovery', 'email_change', 'invite', 'magiclink']

type CookieOp = { name: string; value: string; options: Parameters<NextResponse['cookies']['set']>[2] }

function redirect(origin: string, path: string, cookieOps: CookieOp[]) {
  const response = NextResponse.redirect(new URL(path, origin))
  for (const { name, value, options } of cookieOps) response.cookies.set(name, value, options)
  return response
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null

  if (!tokenHash || !type || !TYPES.includes(type)) {
    return NextResponse.redirect(new URL('/login?error=link_invalid', url.origin))
  }

  const cookieOps: CookieOp[] = []
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(toSet) { toSet.forEach(({ name, value, options }) => cookieOps.push({ name, value, options })) },
        },
      },
    )

    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (error || !data.user) {
      return redirect(url.origin, '/login?error=link_invalid', cookieOps)
    }

    // Password reset: mark this browser as holding a verified recovery link, then
    // send them to choose a new password.
    if (type === 'recovery') {
      cookieOps.push(recoveryMarkerCookie(data.user.id, url))
      return redirect(url.origin, '/reset-password', cookieOps)
    }

    return redirect(url.origin, await postAuthPath(supabase, data.user, null), cookieOps)
  } catch (err) {
    console.error('[auth/confirm] unexpected error:', err instanceof Error ? err.message : err)
    return redirect(url.origin, '/login?error=link_invalid', cookieOps)
  }
}
