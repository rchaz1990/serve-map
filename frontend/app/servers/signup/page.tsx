'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

const STEPS = ['Your info', 'Work history', 'Photo & bio']

// Verify the key is inlined at build time (visible in browser console)
console.log('Google Maps key:', process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY ? 'loaded' : 'missing')

export default function ServerSignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 0 fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Step 2 fields
  const [role, setRole] = useState('')
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [years, setYears] = useState('')

  // Primary restaurant autocomplete
  const venueInputRef = useRef<HTMLInputElement>(null)
  const [confirmedPlace, setConfirmedPlace] = useState<{ name: string; address: string } | null>(null)
  const [googleLoaded, setGoogleLoaded] = useState(false)

  // Second workplace
  const [showSecondVenue, setShowSecondVenue] = useState(false)
  const [venue2, setVenue2] = useState('')
  const [city2, setCity2] = useState('')
  const venue2InputRef = useRef<HTMLInputElement>(null)
  const [confirmedPlace2, setConfirmedPlace2] = useState<{ name: string; address: string } | null>(null)

  // Initialise Google Places Autocomplete whenever step 1 is visible and the
  // script has loaded (or was already loaded on a previous render).
  useEffect(() => {
    if (step !== 1 || !googleLoaded || !venueInputRef.current || confirmedPlace) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google
    if (!google?.maps?.places) return

    const autocomplete = new google.maps.places.Autocomplete(venueInputRef.current, {
      types: ['establishment'],
      componentRestrictions: { country: 'us' },
    })

    // Ensure the dropdown renders above all overlays
    const style = document.createElement('style')
    style.innerHTML = '.pac-container { z-index: 99999 !important; pointer-events: all !important; }'
    document.head.appendChild(style)

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const name    = place.name ?? ''
      const address = place.formatted_address ?? ''
      setVenue(name)
      setCity(address)
      setConfirmedPlace({ name, address })
    })

    // Prevent Enter from submitting the form while the dropdown is open
    const input = venueInputRef.current
    const suppressEnter = (e: KeyboardEvent) => { if (e.key === 'Enter') e.preventDefault() }
    input.addEventListener('keydown', suppressEnter)
    return () => {
      input.removeEventListener('keydown', suppressEnter)
      style.remove()
    }
  }, [step, googleLoaded, confirmedPlace])

  function clearPlace() {
    setConfirmedPlace(null)
    setVenue('')
    setCity('')
    if (venueInputRef.current) venueInputRef.current.value = ''
  }

  // Second venue autocomplete
  useEffect(() => {
    if (step !== 1 || !googleLoaded || !showSecondVenue || !venue2InputRef.current || confirmedPlace2) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google
    if (!google?.maps?.places) return

    const ac2 = new google.maps.places.Autocomplete(venue2InputRef.current, {
      types: ['establishment'],
      componentRestrictions: { country: 'us' },
    })
    ac2.addListener('place_changed', () => {
      const place = ac2.getPlace()
      const name    = place.name ?? ''
      const address = place.formatted_address ?? ''
      setVenue2(name)
      setCity2(address)
      setConfirmedPlace2({ name, address })
    })
    const input2 = venue2InputRef.current
    const suppressEnter = (e: KeyboardEvent) => { if (e.key === 'Enter') e.preventDefault() }
    input2.addEventListener('keydown', suppressEnter)
    return () => input2.removeEventListener('keydown', suppressEnter)
  }, [step, googleLoaded, showSecondVenue, confirmedPlace2])

  function clearPlace2() {
    setConfirmedPlace2(null)
    setVenue2('')
    setCity2('')
    if (venue2InputRef.current) venue2InputRef.current.value = ''
  }

  // Step 3 fields
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setPhotoError(null)
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setPhotoError('Please upload a JPG, PNG, or GIF.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo must be under 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const canAdvanceStep0 = firstName && lastName && email
  const canAdvanceStep1 = role && venue && city
  const canAdvanceStep2 = bio.length >= 20

  async function handleClaim() {
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const fullName = `${firstName} ${lastName}`.trim()

      // Step 1 — Create Supabase auth account so server can log back in
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (authError) throw new Error(authError.message)

      // Step 1b — Upload photo to Supabase Storage if provided
      let photoUrl: string | null = null
      const photoFile = photoInputRef.current?.files?.[0]
      if (photoFile && authData.user?.id) {
        const ext = photoFile.name.split('.').pop() ?? 'jpg'
        const path = `avatars/${authData.user.id}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, photoFile, { upsert: true, contentType: photoFile.type })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
          photoUrl = urlData.publicUrl
        } else {
          console.error('Photo upload error (non-fatal):', uploadError)
        }
      }

      // Step 2 — Create server profile via API route (server-side Supabase insert)
      const res = await fetch('/api/signup-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email,
          role,
          // Use confirmedPlace.name as primary source; fall back to venue state then raw input value
          restaurant: confirmedPlace?.name || venue || venueInputRef.current?.value || '',
          restaurantAddress: confirmedPlace?.address ?? city ?? '',
          city: city || confirmedPlace?.address || '',
          restaurant2: confirmedPlace2?.name || venue2 || undefined,
          restaurantAddress2: confirmedPlace2?.address ?? city2 ?? undefined,
          city2: city2 || confirmedPlace2?.address || undefined,
          userId: authData.user?.id,  // Supabase auth UID → saved to wallet_address
          photoUrl,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        const errMsg = typeof json.error === 'string'
          ? json.error
          : json.error?.message || JSON.stringify(json.error) || 'Signup failed'
        throw new Error(errMsg)
      }

      // Capture email in Beehiiv — fire and forget
      fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, lastName, role, venue: `${venue}, ${city}`.trim() }),
      }).catch(() => {})

      // Send welcome email — fire and forget
      fetch('/api/welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName, type: 'server' }),
      }).catch(() => {})

      // Mark as server in localStorage so Navbar resolves immediately
      localStorage.setItem('slateUserType', 'server')
      localStorage.setItem('slateServerId', json.serverId)
      localStorage.setItem('slateServerName', json.serverName ?? fullName)

      // Redirect to dashboard — auth session is now active
      router.push('/dashboard')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    if (step < 2) setStep(step + 1)
    else handleClaim()
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Load Google Maps JS — afterInteractive so it doesn't block the page */}
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
                <span className="text-xs">✦</span>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white">Founding Member — Early Access</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Claim your profile</h1>
              <p className="mt-3 text-sm" style={{ color: '#A0A0A0' }}>
                Your reputation follows you. Build it once, keep it forever.
              </p>
            </div>

            {/* Step indicators */}
            <div className="mb-10 flex items-center justify-center gap-2">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={[
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                      i < step ? 'bg-white text-black' : i === step ? 'border border-white text-white' : 'border border-white/20 text-white/30',
                    ].join(' ')}>
                      {i < step ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : i + 1}
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: i === step ? '#FFFFFF' : '#A0A0A0' }}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="mb-4 h-px w-8 transition-colors" style={{ backgroundColor: i < step ? '#FFFFFF' : 'rgba(255,255,255,0.15)' }} />
                  )}
                </div>
              ))}
            </div>

            {/* ── Step 0: Your info ── */}
            {step === 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>First name</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Marcus"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40" />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Last name</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Chen"
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="marcus@email.com"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                    Phone <span style={{ color: '#606060' }}>(optional)</span>
                  </label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 212 555 0100"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Create a password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" minLength={6}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Confirm password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40" />
                </div>
              </div>
            )}

            {/* ── Step 1: Work history ── */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                {/* Role */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Role</label>
                  <div className="flex gap-2">
                    {['Server', 'Bartender', 'Both'].map(r => (
                      <button key={r} onClick={() => setRole(r)}
                        className={['flex-1 rounded-xl border py-3 text-sm font-medium transition-colors',
                          role === r ? 'border-white bg-white text-black' : 'border-white/15 text-white hover:border-white/40',
                        ].join(' ')}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Restaurant autocomplete */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                    Current restaurant or bar
                  </label>

                  {confirmedPlace ? (
                    /* Confirmed card */
                    <div className="rounded-xl border border-white/20 bg-white/[0.05] px-4 py-3">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: '#606060' }}>
                            Is this your restaurant?
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">{confirmedPlace.name}</p>
                          <p className="text-xs" style={{ color: '#A0A0A0' }}>{confirmedPlace.address}</p>
                        </div>
                        <button onClick={clearPlace}
                          className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white transition-colors hover:border-white">
                          Change
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0">
                          <circle cx="12" cy="12" r="12" fill="white" />
                          <path d="M7 12.5l3.5 3.5 6.5-7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-xs font-medium text-white">Confirmed</span>
                      </div>
                    </div>
                  ) : (
                    /* Google autocomplete input */
                    <input
                      ref={venueInputRef}
                      type="text"
                      placeholder="Search for your restaurant..."
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
                    />
                  )}
                </div>

                {/* Years of experience */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Years of experience</label>
                  <input type="number" min="0" max="50" value={years} onChange={e => setYears(e.target.value)} placeholder="5"
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40" />
                </div>

                {/* Second workplace */}
                {!showSecondVenue ? (
                  <button
                    type="button"
                    onClick={() => setShowSecondVenue(true)}
                    className="text-left text-xs font-medium transition-colors hover:text-white"
                    style={{ color: '#606060' }}
                  >
                    + Add another workplace
                  </button>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                      Second workplace <span style={{ color: '#606060' }}>(optional)</span>
                    </label>
                    {confirmedPlace2 ? (
                      <div className="rounded-xl border border-white/20 bg-white/[0.05] px-4 py-3">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{confirmedPlace2.name}</p>
                            <p className="text-xs" style={{ color: '#A0A0A0' }}>{confirmedPlace2.address}</p>
                          </div>
                          <button onClick={clearPlace2}
                            className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white transition-colors hover:border-white">
                            Change
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0">
                            <circle cx="12" cy="12" r="12" fill="white" />
                            <path d="M7 12.5l3.5 3.5 6.5-7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-xs font-medium text-white">Confirmed</span>
                        </div>
                      </div>
                    ) : (
                      <input
                        ref={venue2InputRef}
                        type="text"
                        placeholder="Search for second restaurant..."
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Photo & bio ── */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                    Profile photo <span style={{ color: '#606060' }}>(optional)</span>
                  </label>
                  {/* Hidden file input */}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  {/* Clickable avatar / upload area */}
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/20 transition-colors hover:border-white/50 focus:outline-none"
                      aria-label="Upload profile photo"
                    >
                      {photoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoPreview} alt="Profile preview" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 text-white/40">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                          </svg>
                        </span>
                      )}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="text-sm font-medium text-white underline-offset-2 hover:underline"
                      >
                        {photoPreview ? 'Change photo' : 'Upload photo'}
                      </button>
                      <p className="mt-1 text-xs" style={{ color: '#606060' }}>JPG, PNG or GIF · max 5 MB</p>
                      {photoError && (
                        <p className="mt-1 text-xs text-red-400">{photoError}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 flex items-baseline justify-between text-xs font-medium" style={{ color: '#A0A0A0' }}>
                    <span>Bio</span>
                    <span style={{ color: bio.length >= 20 ? '#A0A0A0' : '#606060' }}>{bio.length}/200</span>
                  </label>
                  <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 200))}
                    placeholder="Tell guests what makes your service memorable..." rows={4}
                    className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40" />
                  {bio.length < 20 && bio.length > 0 && (
                    <p className="mt-1 text-xs" style={{ color: '#606060' }}>{20 - bio.length} more characters required</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                    Instagram <span style={{ color: '#606060' }}>(optional)</span>
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus-within:border-white/40 transition-colors">
                    <span className="shrink-0 text-sm" style={{ color: '#606060' }}>@</span>
                    <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="yourusername"
                      className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Navigation */}
            <div className={['mt-8 flex gap-3', step > 0 ? 'flex-row' : 'flex-col'].join(' ')}>
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} disabled={loading}
                  className="flex-1 rounded-full border border-white/20 py-3.5 text-sm font-medium text-white transition-colors hover:border-white disabled:opacity-40">
                  Back
                </button>
              )}
              <button onClick={handleNext}
                disabled={loading || (step === 0 && !canAdvanceStep0) || (step === 1 && !canAdvanceStep1) || (step === 2 && !canAdvanceStep2)}
                className="flex-1 rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-40">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating on-chain…
                  </span>
                ) : step < 2 ? 'Continue' : 'Claim my profile'}
              </button>
            </div>

          </div>
        </main>
      </div>
    </>
  )
}
