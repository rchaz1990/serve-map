'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/app/components/Navbar'

type Mode = 'signup' | 'signin'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'signup') {
      // Email confirmation disabled in Supabase Auth settings:
      // Authentication > Providers > Email > "Confirm email" = OFF
      // This avoids rate limit errors on the free tier.
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
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    setSuccess(true)
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
        <Navbar />
        <div className="border-t border-white/10" />
        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-20">
          <div className="w-full max-w-sm text-center">
            <p
              className="mb-5 text-[10px] font-semibold uppercase tracking-[0.4em]"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              You&apos;re in
            </p>
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-white">
              Welcome to Slate.
            </h1>
            <p className="mb-10 text-sm" style={{ color: '#606060' }}>
              What would you like to do first?
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
              Welcome to Slate
            </p>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">
              {mode === 'signup' ? 'Join Slate' : 'Sign in'}
            </h1>
            <p className="text-sm" style={{ color: '#606060' }}>
              {mode === 'signup' ? 'Create your free account' : 'Welcome back'}
            </p>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mb-6 w-full cursor-pointer text-center disabled:opacity-40"
            style={{
              background: 'white',
              color: '#333333',
              border: '1px solid #dadce0',
              borderRadius: '4px',
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
                  className="w-full border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
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
                className="w-full border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
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
                placeholder="Min. 6 characters"
                minLength={6}
                required
                className="w-full border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {loading
                ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
                : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="mt-6 text-center text-xs" style={{ color: '#606060' }}>
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null) }}
                  className="text-white underline-offset-2 hover:underline"
                >
                  Sign in →
                </button>
              </>
            ) : (
              <>
                New to Slate?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null) }}
                  className="text-white underline-offset-2 hover:underline"
                >
                  Create account →
                </button>
              </>
            )}
          </p>

          {/* Bottom note */}
          <p className="mt-10 text-center text-xs leading-6" style={{ color: '#404040' }}>
            Guests join free. Your wallet is created automatically — no crypto knowledge needed.
          </p>

        </div>
      </main>
    </div>
  )
}
