'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

export default function RestaurantManagerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data.session) {
        // Check if manager account exists
        const { data: managerData } = await supabase
          .from('restaurant_managers')
          .select('id, restaurant_name')
          .eq('auth_id', data.session.user.id)
          .maybeSingle()

        if (managerData) {
          localStorage.setItem('slateUserType', 'manager')
          localStorage.setItem('slateManagerId', managerData.id)
          localStorage.setItem('slateRestaurantName', managerData.restaurant_name)
          router.push('/restaurant/dashboard')
        } else {
          setError('No manager account found for this email. Please sign up first.')
          await supabase.auth.signOut()
          setLoading(false)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(msg)
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://slatenow.xyz/restaurant/login',
    })

    if (!error) {
      setForgotSent(true)
    }
  }

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
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="manager@restaurant.com"
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
                onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                placeholder="Your password"
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
              disabled={loading}
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
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#444',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  cursor: 'pointer',
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
