'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'
import { getAuthCallbackUrl, setOAuthNextHint, getAppOrigin } from '@/lib/auth-redirect'

const LOGIN_TIMEOUT_MS = 15_000

function RestaurantManagerLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState(() => {
    if (searchParams.get('error') === 'no_manager') {
      return 'No manager account found for this Google account. Please sign up first.'
    }
    if (searchParams.get('error') === 'auth_failed') {
      return 'Sign in failed. Please try again.'
    }
    return ''
  })
  const [forgotSent, setForgotSent] = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    setLoading(true)
    setError('')

    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      setError('Sign in timed out. Please check your connection and try again.')
      setLoading(false)
    }, LOGIN_TIMEOUT_MS)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (timedOut) return

      if (authError) {
        setError(authError.message)
        return
      }

      if (!data.session?.user?.id) {
        setError('Sign in did not return a session. Please try again.')
        return
      }

      // Check if manager account exists — surface lookup errors so we never hang
      const { data: managerData, error: lookupError } = await supabase
        .from('restaurant_managers')
        .select('id, restaurant_name')
        .eq('auth_id', data.session.user.id)
        .maybeSingle()

      if (timedOut) return

      if (lookupError) {
        setError(lookupError.message)
        await supabase.auth.signOut()
        return
      }

      let manager = managerData

      // Email fallback (e.g. waitlist row created before auth_id was set)
      if (!manager && data.session.user.email) {
        const { data: byEmail, error: emailErr } = await supabase
          .from('restaurant_managers')
          .select('id, restaurant_name, auth_id')
          .ilike('email', data.session.user.email)
          .maybeSingle()

        if (timedOut) return

        if (emailErr) {
          setError(emailErr.message)
          await supabase.auth.signOut()
          return
        }

        if (byEmail) {
          manager = byEmail
          if (!byEmail.auth_id) {
            await supabase
              .from('restaurant_managers')
              .update({ auth_id: data.session.user.id })
              .eq('id', byEmail.id)
          }
        }
      }

      if (manager) {
        localStorage.setItem('slateUserType', 'manager')
        localStorage.setItem('slateManagerId', manager.id)
        localStorage.setItem('slateRestaurantName', manager.restaurant_name)
        router.push('/restaurant/dashboard')
        return
      }

      setError('No manager account found for this email. Please sign up first.')
      await supabase.auth.signOut()
    } catch (err: unknown) {
      if (timedOut) return
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(msg)
    } finally {
      window.clearTimeout(timeoutId)
      if (!timedOut) setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setOauthLoading(true)
    setError('')
    try {
      // Intent via cookie — never put ?next= on redirectTo (Site URL fallback → /?code=)
      setOAuthNextHint('/restaurant/dashboard')
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthCallbackUrl(),
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (oauthError) {
        setError('Google sign in failed. Please try email and password instead.')
        console.error('Google OAuth error:', oauthError)
        setOauthLoading(false)
      }
      // On success the browser navigates away — leave oauthLoading true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed.'
      setError(msg)
      setOauthLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppOrigin()}/restaurant/login`,
    })

    if (resetError) {
      setError(resetError.message)
      return
    }
    setForgotSent(true)
  }

  const busy = loading || oauthLoading

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-4 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white">For Restaurants</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
            <p className="mt-3 text-sm" style={{ color: '#A0A0A0' }}>
              Sign in to manage your floor.
            </p>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4">
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {oauthLoading ? 'Redirecting to Google…' : 'Continue with Google'}
            </button>

            <div className="text-center text-xs" style={{ color: '#444' }}>or</div>

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="manager@restaurant.com"
                disabled={busy}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !busy) handleLogin() }}
                placeholder="Your password"
                disabled={busy}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={busy}
              className="mt-2 w-full rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            {forgotSent ? (
              <p style={{ color: '#555', fontSize: '12px', textAlign: 'center', marginTop: '12px' }}>
                Password reset email sent. Check your inbox.
              </p>
            ) : (
              <button
                onClick={handleForgotPassword}
                disabled={busy}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#444',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  cursor: busy ? 'default' : 'pointer',
                  textDecoration: 'underline',
                  display: 'block',
                  margin: '12px auto 0',
                }}
              >
                Forgot password?
              </button>
            )}

            <p className="mt-2 text-center text-xs" style={{ color: '#606060' }}>
              Don&apos;t have a manager account?{' '}
              <a href="/restaurant/signup" className="text-white underline-offset-2 hover:underline">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function RestaurantManagerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-white" style={{ backgroundColor: '#000000' }}>
          <Navbar />
        </div>
      }
    >
      <RestaurantManagerLoginForm />
    </Suspense>
  )
}
