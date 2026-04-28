'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RestaurantManagerSignupPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [confirmedPlace, setConfirmedPlace] = useState<{ name: string; address: string } | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleLoaded, setGoogleLoaded] = useState(false)

  const venueInputRef = useRef<HTMLInputElement>(null)

  const ROLE_OPTIONS = ['General Manager', 'Assistant Manager', 'Host', 'Owner']

  // Google Places autocomplete
  useEffect(() => {
    if (!googleLoaded || !venueInputRef.current || confirmedPlace) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google
    if (!google?.maps?.places) return

    const autocomplete = new google.maps.places.Autocomplete(venueInputRef.current, {
      types: ['establishment'],
      componentRestrictions: { country: 'us' },
    })

    const style = document.createElement('style')
    style.innerHTML = '.pac-container { z-index: 99999 !important; pointer-events: all !important; }'
    document.head.appendChild(style)

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const placeName = place.name ?? ''
      const placeAddress = place.formatted_address ?? ''
      setRestaurantName(placeName)
      setConfirmedPlace({ name: placeName, address: placeAddress })
    })

    const input = venueInputRef.current
    const suppressEnter = (e: KeyboardEvent) => { if (e.key === 'Enter') e.preventDefault() }
    input.addEventListener('keydown', suppressEnter)
    return () => {
      input.removeEventListener('keydown', suppressEnter)
      style.remove()
    }
  }, [googleLoaded, confirmedPlace])

  function clearPlace() {
    setConfirmedPlace(null)
    setRestaurantName('')
    if (venueInputRef.current) venueInputRef.current.value = ''
  }

  const canSubmit = !!(
    name &&
    email &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    restaurantName &&
    role
  )

  async function handleSubmit() {
    setError(null)
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (!email.trim()) { setError('Please enter your email.'); return }
    if (!restaurantName) { setError('Please select your restaurant.'); return }
    if (!role) { setError('Please select your role.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      // 1. Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (authError) throw new Error(authError.message)
      if (!authData.user?.id) throw new Error('Signup did not return a user id.')

      // 2. Insert into restaurant_managers
      const { error: insertError } = await supabase
        .from('restaurant_managers')
        .insert({
          email,
          name,
          restaurant_name: restaurantName,
          auth_id: authData.user.id,
          role,
        })
      if (insertError) throw new Error(insertError.message)

      localStorage.setItem('slateUserType', 'manager')
      localStorage.setItem('slateManagerRestaurant', restaurantName)

      // 3. Redirect to manager dashboard
      router.push('/restaurant/dashboard')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={() => setGoogleLoaded(true)}
      />

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
              <h1 className="text-3xl font-bold tracking-tight text-white">Manage your floor</h1>
              <p className="mt-3 text-sm" style={{ color: '#A0A0A0' }}>
                Toggle your team on shift in one tap. Guests see who&apos;s working tonight.
              </p>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4">
              {/* Restaurant */}
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                  Restaurant
                </label>
                {confirmedPlace ? (
                  <div className="rounded-xl border border-white/20 bg-white/[0.05] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{confirmedPlace.name}</p>
                        <p className="text-xs" style={{ color: '#A0A0A0' }}>{confirmedPlace.address}</p>
                      </div>
                      <button
                        onClick={clearPlace}
                        className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white transition-colors hover:border-white"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <input
                    ref={venueInputRef}
                    type="text"
                    placeholder="Search for your restaurant..."
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
                  />
                )}
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Manager / Host name"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
                />
              </div>

              {/* Role */}
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                  Your role
                </label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 pr-10 text-sm text-white outline-none transition-colors focus:border-white/40"
                    style={{ color: role ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}
                  >
                    <option value="" disabled style={{ color: '#000' }}>Select your role…</option>
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt} value={opt} style={{ color: '#000' }}>{opt}</option>
                    ))}
                  </select>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>

              {/* Email */}
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

              {/* Password */}
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
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
                />
              </div>

              {/* Confirm password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  minLength={6}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="mt-2 w-full rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {loading ? 'Creating account…' : 'Create manager account'}
              </button>

              <p className="mt-2 text-center text-xs" style={{ color: '#606060' }}>
                Already have an account?{' '}
                <a href="/restaurant/login" className="text-white underline-offset-2 hover:underline">
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
