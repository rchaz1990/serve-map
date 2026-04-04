'use client'

import { useState, useEffect, useRef } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { getOrCreateDemoKeypair, keypairToWallet, getProgram, deriveServerProfilePDA } from '@/lib/solana'

const STEPS = ['Your info', 'Work history', 'Photo & bio']

// Verify the key is inlined at build time (visible in browser console)
console.log('Google Maps key:', process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY ? 'loaded' : 'missing')

export default function ServerSignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [txSig, setTxSig] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!txSig) return
    const t = setTimeout(() => router.push('/dashboard'), 2000)
    return () => clearTimeout(t)
  }, [txSig, router])

  // Step 1 fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Step 2 fields
  const [role, setRole] = useState('')
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [years, setYears] = useState('')

  // Restaurant autocomplete
  const venueInputRef = useRef<HTMLInputElement>(null)
  const [confirmedPlace, setConfirmedPlace] = useState<{ name: string; address: string } | null>(null)
  const [googleLoaded, setGoogleLoaded] = useState(false)

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
    // clear the input value so autocomplete starts fresh
    if (venueInputRef.current) venueInputRef.current.value = ''
  }

  // Step 3 fields
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')

  const canAdvanceStep0 = firstName && lastName && email
  const canAdvanceStep1 = role && venue && city
  const canAdvanceStep2 = bio.length >= 20

  async function handleClaim() {
    setLoading(true)
    setError(null)
    try {
      const keypair = await getOrCreateDemoKeypair()
      const wallet = keypairToWallet(keypair)
      const program = getProgram(wallet)

      const fullName   = `${firstName} ${lastName}`.trim()
      const restaurant = `${venue}, ${city}`.trim()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sig = await (program as any).methods
        .initializeProfile(fullName, restaurant)
        .accounts({ owner: keypair.publicKey })
        .signers([keypair])
        .rpc()

      const profilePDA = deriveServerProfilePDA(keypair.publicKey)
      localStorage.setItem('slate-server-profile', profilePDA.toBase58())
      setTxSig(sig)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('already in use') ? 'A profile already exists for this wallet.' : msg)
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    if (step < 2) setStep(step + 1)
    else handleClaim()
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (txSig) {
    return (
      <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
        <Navbar />
        <div className="border-t border-white/10" />
        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-8">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Profile created on-chain! ✓</h1>
            <p className="mt-3 text-sm" style={{ color: '#A0A0A0' }}>
              Your portable profile has been written to the Solana blockchain and is permanently yours.
            </p>
            <div className="mt-6 rounded-xl border border-white/10 px-4 py-4 text-left">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: '#606060' }}>Transaction</p>
              <p className="break-all font-mono text-xs text-white">{txSig}</p>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2" style={{ color: '#A0A0A0' }}>
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-xs">Taking you to your dashboard…</p>
            </div>
          </div>
        </main>
      </div>
    )
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
              </div>
            )}

            {/* ── Step 2: Photo & bio ── */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                    Profile photo <span style={{ color: '#606060' }}>(optional)</span>
                  </label>
                  <div className="flex h-24 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-white/20 transition-colors hover:border-white/40">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" style={{ color: '#A0A0A0' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <span className="text-sm" style={{ color: '#A0A0A0' }}>Upload a photo</span>
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
