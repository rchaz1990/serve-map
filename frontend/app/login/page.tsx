'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/app/components/Navbar'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // signup-only: show success screen after creating guest account
  const [signupSuccess, setSignupSuccess] = useState(false)

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/live' },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  // After a successful auth, decide where to send the user:
  // servers → /dashboard, guests → /live
  async function redirectAfterAuth(userId: string, userEmail: string | null) {
    // Method 1 — wallet_address (Supabase auth UID)
    const { data: byId } = await supabase
      .from('servers')
      .select('id')
      .eq('wallet_address', userId)
      .maybeSingle()
    if (byId) {
      localStorage.setItem('slateUserType', 'server')
      localStorage.setItem('slateServerId', byId.id)
      router.push('/dashboard')
      return
    }

    // Method 2 — case-insensitive email
    if (userEmail) {
      const { data: byEmail } = await supabase
        .from('servers')
        .select('id')
        .ilike('email', userEmail)
        .maybeSingle()
      if (byEmail) {
        localStorage.setItem('slateUserType', 'server')
        localStorage.setItem('slateServerId', byEmail.id)
        router.push('/dashboard')
        return
      }
    }

    // Method 3 — localStorage (set at signup)
    const storedId = localStorage.getItem('slateServerId')
    if (storedId) {
      const { data: byStored } = await supabase
        .from('servers')
        .select('id')
        .eq('id', storedId)
        .maybeSingle()
      if (byStored) {
        localStorage.setItem('slateUserType', 'server')
        router.push('/dashboard')
        return
      }
    }

    // Guest
    localStorage.setItem('slateUserType', 'guest')
    localStorage.removeItem('slateServerId')
    router.push('/live')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      // Redirect based on server vs guest
      await redirectAfterAuth(data.user.id, data.user.email ?? null)
      // redirectAfterAuth calls router.push — no need to setLoading(false)
      return
    }

    // signup mode — creates a guest account
    // Email confirmation disabled in Supabase Auth settings:
    // Authentication > Providers > Email > "Confirm email" = OFF
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: undefined,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setLoading(false)
    setSignupSuccess(true)
  }

  // ── Signup success screen ──────────────────────────────────────────────────

  if (signupSuccess) {
    return (
      <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
        <Navbar />
        <div className="border-t border-white/10" />
        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-20">
          <div className="w-full max-w-sm text-center">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.4em]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              You&apos;re in
            </p>
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-white">
              Welcome to Slate.
            </h1>
            <p className="mb-10 text-sm" style={{ color: '#606060' }}>
              Your account is ready. What would you like to do first?
            </p>
            <a
              href="/live"
              className="block w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              See what&apos;s live tonight →
            </a>
          </div>
        </main>
      </div>
    )
  }

  // ── Auth form ──────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-sm">

          {/* Header */}
          <div className="mb-10 text-center">
            <p
              className="mb-4 text-[10px] font-semibold uppercase tracking-[0.4em]"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {mode === 'signin' ? 'Welcome back' : 'Join Slate'}
            </p>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </h1>
            <p className="text-sm" style={{ color: '#606060' }}>
              {mode === 'signin' ? 'Enter your email and password to continue' : 'Join free — no crypto knowledge needed'}
            </p>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mb-6 w-full cursor-pointer rounded text-center disabled:opacity-40"
            style={{
              background: 'white',
              color: '#333333',
              border: '1px solid #dadce0',
              padding: '12px 24px',
              fontSize: '14px',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#f8f8f8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white' }}
          >
            Continue with Google
          </button>

          {/* OR divider */}
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <span className="text-xs font-medium" style={{ color: '#404040' }}>or</span>
            <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                autoComplete="email"
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
                placeholder={mode === 'signin' ? 'Your password' : 'Min. 6 characters'}
                minLength={6}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {loading
                ? mode === 'signin' ? 'Signing in…' : 'Creating account…'
                : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="mt-6 text-center text-xs" style={{ color: '#606060' }}>
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null) }}
                  className="text-white underline-offset-2 hover:underline"
                >
                  Sign up →
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null) }}
                  className="text-white underline-offset-2 hover:underline"
                >
                  Sign in →
                </button>
              </>
            )}
          </p>

          {mode === 'signin' && (
            <p className="mt-4 text-center text-xs" style={{ color: '#404040' }}>
              Are you a server?{' '}
              <a href="/servers/signup" className="text-white underline-offset-2 hover:underline">
                Create a server profile →
              </a>
            </p>
          )}

        </div>
      </main>
    </div>
  )
}
