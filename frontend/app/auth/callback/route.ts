import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { OAUTH_NEXT_COOKIE, safeInternalPath } from '@/lib/auth-redirect'
import { postAuthPath } from '@/lib/auth-flows'
import { recoveryMarkerCookie } from '@/lib/recovery-marker'

type CookieOp = { name: string; value: string; options: Parameters<NextResponse['cookies']['set']>[2] }

function redirectWithCookies(
  origin: string,
  path: string,
  cookiesToApply: CookieOp[],
) {
  const response = NextResponse.redirect(new URL(path, origin))
  for (const { name, value, options } of cookiesToApply) {
    response.cookies.set(name, value, options)
  }
  return response
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    // Expired or already-used email links come back with error params instead of a code.
    const linkError = requestUrl.searchParams.get('error_code') || requestUrl.searchParams.get('error')
    return NextResponse.redirect(new URL(linkError ? '/login?error=link_invalid' : '/login?error=auth_failed', requestUrl.origin))
  }

  const cookiesToApply: CookieOp[] = []

  try {
    const cookieStore = await cookies()

    // Prefer cookie hint (set before OAuth) over ?next= on redirectTo.
    // Query next is still accepted for older clients / defensive middleware forwards.
    const nextFromCookie = cookieStore.get(OAUTH_NEXT_COOKIE)?.value
    const nextFromQuery = requestUrl.searchParams.get('next')
    // Cookie is the source of truth. safeInternalPath decodes once and drops open redirects.
    const nextHint = safeInternalPath(nextFromCookie) ?? safeInternalPath(nextFromQuery)
    // Always clear the hint cookie on the redirect response
    cookiesToApply.push({
      name: OAUTH_NEXT_COOKIE,
      value: '',
      options: { path: '/', maxAge: 0 },
    })

    // Buffer cookie writes so we can apply them to whichever response
    // we ultimately redirect to (different user types → different URLs).
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookiesToApply.push({ name, value, options })
            })
          },
        },
      },
    )

    const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // Most often a confirmation link opened on a different device or browser than the
      // one that signed up: Supabase has already confirmed the email, but this browser
      // can't finish the sign-in. Tell them to sign in instead of showing a failure.
      return redirectWithCookies(
        requestUrl.origin,
        '/login?notice=confirmed_elsewhere',
        cookiesToApply,
      )
    }

    // Default password-reset link opened in the browser that requested it: auth-js only
    // reports PASSWORD_RECOVERY when this browser's stored code verifier was created by
    // resetPasswordForEmail, so ?next=/reset-password alone never grants this.
    // (auth-js returns redirectType at runtime; its published type omits it.)
    const redirectType = (exchanged as { redirectType?: string | null } | null)?.redirectType
    if (redirectType === 'PASSWORD_RECOVERY' && exchanged?.user) {
      cookiesToApply.push(recoveryMarkerCookie(exchanged.user.id, requestUrl))
      return redirectWithCookies(requestUrl.origin, '/reset-password', cookiesToApply)
    }

    // A safe next hint (except the manager-login sentinel) wins.
    // Otherwise: restaurant_managers → /restaurant/dashboard, servers → /dashboard, else /get-started.
    const { data: { user } } = await supabase.auth.getUser()
    // Managers (including a pending manager sign-up), then workers, then a worker
    // sign-up still to finish; see lib/auth-flows.ts.
    const targetPath = user ? await postAuthPath(supabase, user, nextHint) : '/get-started'

    return redirectWithCookies(requestUrl.origin, targetPath, cookiesToApply)
  } catch (err) {
    // Never return a blank 500 — always redirect with a clear error
    console.error('[auth/callback] unexpected error:', err)
    return redirectWithCookies(
      requestUrl.origin,
      '/login?error=auth_failed',
      cookiesToApply,
    )
  }
}
