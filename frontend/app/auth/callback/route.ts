import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

type CookieOp = { name: string; value: string; options: Parameters<NextResponse['cookies']['set']>[2] }

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
  }

  const cookieStore = await cookies()

  // Buffer cookie writes so we can apply them to whichever response
  // we ultimately redirect to (different user types → different URLs).
  const cookiesToApply: CookieOp[] = []

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
    return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
  }

  // Determine redirect target by user type
  const { data: { user } } = await supabase.auth.getUser()

  let targetPath = '/get-started'

  if (user) {
    // Check manager first
    const { data: managerData } = await supabase
      .from('restaurant_managers')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()

    if (managerData) {
      targetPath = '/restaurant/dashboard'
    } else {
      const { data: serverData } = await supabase
        .from('servers')
        .select('id')
        .eq('wallet_address', user.id)
        .maybeSingle()

      if (serverData) {
        targetPath = '/dashboard'
      }
    }
  }

  // Build the redirect with the buffered cookies attached
  const response = NextResponse.redirect(new URL(targetPath, requestUrl.origin))
  for (const { name, value, options } of cookiesToApply) {
    response.cookies.set(name, value, options)
  }
  return response
}
