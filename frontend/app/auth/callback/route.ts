import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

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
  // Optional hint from restaurant login Google button — verified against DB below.
  const nextHint = requestUrl.searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
  }

  const cookiesToApply: CookieOp[] = []

  try {
    const cookieStore = await cookies()

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

    // Determine redirect target by user type:
    // restaurant_managers first → /restaurant/dashboard
    // servers → /dashboard
    // else → /get-started (or nextHint when safe)
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

      if (managerData) {
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
        } else if (
          nextHint &&
          nextHint.startsWith('/') &&
          !nextHint.startsWith('//') &&
          // Only honor next for non-manager/non-server when it is not a manager path
          // (manager path without a manager row → restaurant login with error)
          nextHint !== '/restaurant/dashboard'
        ) {
          targetPath = nextHint
        } else if (nextHint === '/restaurant/dashboard') {
          // Came from restaurant Google login but no manager profile
          targetPath = '/restaurant/login?error=no_manager'
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
