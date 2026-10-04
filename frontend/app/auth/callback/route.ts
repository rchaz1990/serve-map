import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { OAUTH_NEXT_COOKIE, safeInternalPath } from '@/lib/auth-redirect'

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
    return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return redirectWithCookies(
        requestUrl.origin,
        '/login?error=auth_failed',
        cookiesToApply,
      )
    }

    // A safe next hint (except the manager-login sentinel) wins.
    // Otherwise: restaurant_managers → /restaurant/dashboard, servers → /dashboard, else /get-started.
    const { data: { user } } = await supabase.auth.getUser()

    let targetPath = '/get-started'

    if (user) {
      // Check manager first — by auth_id, then email (waitlist rows may lack auth_id)
      const { data: byAuthId, error: managerAuthErr } = await supabase
        .from('restaurant_managers')
        .select('id, restaurant_name, auth_id')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (managerAuthErr) {
        console.error('[auth/callback] restaurant_managers auth_id lookup:', managerAuthErr.message)
      }

      let managerData = byAuthId

      if (!managerData && user.email) {
        const { data: byEmail, error: managerEmailErr } = await supabase
          .from('restaurant_managers')
          .select('id, restaurant_name, auth_id')
          .ilike('email', user.email)
          .maybeSingle()

        if (managerEmailErr) {
          console.error('[auth/callback] restaurant_managers email lookup:', managerEmailErr.message)
        }

        if (byEmail) {
          managerData = byEmail
          // Link Google/OAuth user to an existing manager row that had null auth_id
          if (!byEmail.auth_id) {
            const { error: linkErr } = await supabase
              .from('restaurant_managers')
              .update({ auth_id: user.id })
              .eq('id', byEmail.id)
            if (linkErr) {
              console.error('[auth/callback] link auth_id:', linkErr.message)
            }
          }
        }
      }

      // Manager Google login intent (/restaurant/login sets nextHint=/restaurant/dashboard):
      // never fall through to the server dashboard when no managers row exists,
      // even if the same Google account also has a servers row (dual-role).
      if (nextHint === '/restaurant/dashboard') {
        if (managerData) {
          targetPath = '/restaurant/dashboard'
        } else {
          targetPath = '/restaurant/login?error=no_manager'
        }
      } else if (nextHint) {
        // Explicit return path (rate form, scan page). Beats the role dashboard.
        targetPath = nextHint
      } else if (managerData) {
        // No manager intent cookie — still prefer managers over servers
        targetPath = '/restaurant/dashboard'
      } else {
        const { data: serverData, error: serverErr } = await supabase
          .from('servers')
          .select('id')
          .eq('wallet_address', user.id)
          .maybeSingle()

        if (serverErr) {
          console.error('[auth/callback] servers lookup:', serverErr.message)
        }

        if (serverData) {
          targetPath = '/dashboard'
        }
      }
    }

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
