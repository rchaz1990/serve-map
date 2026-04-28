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
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw new Error(authError.message)
      if (!data.user?.id) throw new Error('Sign in did not return a user.')

      // Confirm there's a manager profile attached
      const { data: manager, error: lookupError } = await supabase
        .from('restaurant_managers')
        .select('restaurant_name')
        .eq('auth_id', data.user.id)
        .maybeSingle()

      if (lookupError) throw new Error(lookupError.message)
      if (!manager) {
        await supabase.auth.signOut()
        throw new Error('No manager profile found for this account. Please sign up as a manager.')
      }

      localStorage.setItem('slateUserType', 'manager')
      localStorage.setItem('slateManagerRestaurant', manager.restaurant_name)

      router.push('/restaurant/dashboard')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
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
                onKeyDown={e => { if (e.key === 'Enter') handleSignIn() }}
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
              onClick={handleSignIn}
              disabled={loading}
              className="mt-2 w-full rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

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
