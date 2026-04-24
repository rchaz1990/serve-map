'use client'

import { useState, useEffect, useRef } from 'react'
import Script from 'next/script'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type Vibe = 'CHILL' | 'LIVE' | 'PACKED'

interface VibeReport {
  id: string
  restaurant_name: string
  vibe: string
  bar_seats: string | null
  wait_time: string | null
  gps_verified: boolean
  integrity_score: number
  created_at: string
}

interface VenueDisplay {
  name: string
  latestReport: VibeReport | null
  reportCount: number
}

// ── Default NYC venues (Tier 3) ───────────────────────────────────────────────

const DEFAULT_VENUES: { name: string; emoji: string }[] = [
  { name: 'Employees Only',    emoji: '🍸' },
  { name: 'Death & Co',        emoji: '🥃' },
  { name: 'Attaboy',           emoji: '🍹' },
  { name: 'Dante',             emoji: '🍷' },
  { name: 'The Dead Rabbit',   emoji: '🐰' },
  { name: "Please Don't Tell", emoji: '🤫' },
  { name: 'Maison Premiere',   emoji: '🦪' },
  { name: 'Amor y Amargo',     emoji: '🌹' },
  { name: 'Carbone',           emoji: '🍝' },
  { name: 'Don Angie',         emoji: '🧆' },
  { name: 'Via Carota',        emoji: '🥗' },
  { name: 'Lilia',             emoji: '🍝' },
  { name: 'Lucali',            emoji: '🍕' },
  { name: 'Le Bernardin',      emoji: '🐟' },
  { name: 'Balthazar',         emoji: '🥐' },
]

// ── Haversine distance ────────────────────────────────────────────────────────

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Vibe metadata ─────────────────────────────────────────────────────────────

const VIBE_META: Record<string, { emoji: string; tagline: string }> = {
  CHILL:  { emoji: '🧊', tagline: 'Calm energy. Good conversation.' },
  LIVE:   { emoji: '🔥', tagline: 'Buzzing energy. Great crowd.' },
  PACKED: { emoji: '🚀', tagline: 'Electric. Wall to wall.' },
}

const VIBE_EMOJI: Record<string, string> = { CHILL: '🧊', LIVE: '🔥', PACKED: '🚀' }

// ── CSS animations ────────────────────────────────────────────────────────────

const CSS = `
@keyframes liveDot {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:.4; transform:scale(1.4); }
}
@keyframes chillBreathe {
  0%,100% { opacity:.85; transform:scale(1); }
  50%      { opacity:1;  transform:scale(1.015); }
}
@keyframes liveFlicker {
  0%,100% { opacity:.8; }
  20%     { opacity:1; }
  40%     { opacity:.75; }
  60%     { opacity:1; }
  80%     { opacity:.82; }
}
@keyframes packedPulse {
  0%,100% { opacity:.7; transform:scale(1); }
  15%     { opacity:1;  transform:scale(1.03); }
  30%     { opacity:.65;}
  55%     { opacity:1;  transform:scale(1.02); }
  75%     { opacity:.7; }
}
@keyframes slideUp {
  from { opacity:0; transform:translateY(20px); }
  to   { opacity:1; transform:translateY(0); }
}
.anim-chill  { animation: chillBreathe 4s ease-in-out infinite; }
.anim-live   { animation: liveFlicker 2.2s ease-in-out infinite; }
.anim-packed { animation: packedPulse 1.1s ease-in-out infinite; }
.slide-up { animation: slideUp .5s ease-out forwards; opacity:0; }
`

// ── Pill button ───────────────────────────────────────────────────────────────

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
      style={{
        borderColor: selected ? 'white' : 'rgba(255,255,255,0.2)',
        backgroundColor: selected ? 'white' : 'black',
        color: selected ? 'black' : 'white',
      }}
    >
      {label}
    </button>
  )
}

function VibePill({ vibe, selected, onClick }: { vibe: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl border px-4 py-3 transition-colors"
      style={{
        borderColor: selected ? 'white' : 'rgba(255,255,255,0.2)',
        backgroundColor: selected ? 'white' : 'black',
        minWidth: '72px',
      }}
    >
      <span style={{ fontSize: '28px', lineHeight: 1 }}>{VIBE_EMOJI[vibe] ?? vibe}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: selected ? 'black' : '#606060' }}>
        {vibe.charAt(0) + vibe.slice(1).toLowerCase()}
      </span>
    </button>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ children, dot }: { children: React.ReactNode; dot?: boolean }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-40" style={{ animation: 'liveDot 1.4s ease-in-out infinite' }} />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
      )}
      <h2
        className="text-xs font-bold tracking-[0.25em] text-white"
        style={{ textTransform: 'uppercase', fontVariant: 'small-caps' }}
      >
        {children}
      </h2>
    </div>
  )
}

// ── Venue card (shared across all tiers) ──────────────────────────────────────

function VenueCard({
  venueName,
  tier,
  report,
  reportCount,
  defaultEmoji,
  delay,
}: {
  venueName: string
  tier: 1 | 2 | 3
  report: VibeReport | null
  reportCount: number
  defaultEmoji?: string
  delay: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  const [checkInOpen, setCheckInOpen] = useState(false)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsVerifiedForSubmit, setGpsVerifiedForSubmit] = useState(false)
  const [vibe, setVibe] = useState<string | null>(null)
  const [seats, setSeats] = useState<string | null>(null)
  const [wait, setWait] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [serveEarned, setServeEarned] = useState<number | null>(null)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const vibeName = report?.vibe as Vibe | undefined
  const animClass = vibeName === 'CHILL' ? 'anim-chill' : vibeName === 'LIVE' ? 'anim-live' : vibeName === 'PACKED' ? 'anim-packed' : ''

  const minutesAgo = report
    ? Math.round((Date.now() - new Date(report.created_at).getTime()) / 60000)
    : null
  const timeLabel = minutesAgo === null ? '' :
    minutesAgo < 1 ? 'just now' :
    minutesAgo < 60 ? `${minutesAgo}m ago` :
    `${Math.floor(minutesAgo / 60)}h ago`

  function handleImHere() {
    if (checkInOpen) {
      setCheckInOpen(false); setUserCoords(null)
      setVibe(null); setSeats(null); setWait(null)
      return
    }
    setCheckInOpen(true)
    setGpsVerifiedForSubmit(false)

    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude
        const userLng = pos.coords.longitude
        setUserCoords({ lat: userLat, lng: userLng })
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(venueName + ' NYC')}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY}`
          )
          const data = await res.json()
          const venueLat: number | null = data.results?.[0]?.geometry?.location?.lat ?? null
          const venueLng: number | null = data.results?.[0]?.geometry?.location?.lng ?? null
          if (venueLat !== null && venueLng !== null) {
            const dist = getDistanceMeters(userLat, userLng, venueLat, venueLng)
            if (dist <= 500) setGpsVerifiedForSubmit(true)
          }
        } catch { /* silent */ }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  async function handleSubmit() {
    if (!vibe) return
    setSubmitting(true)
    setSubmitError('')

    const { data: { session } } = await supabase.auth.getSession()
    const reporterEmail = session?.user?.email ?? localStorage.getItem('slateUserEmail') ?? undefined
    const coords = userCoords

    const res = await fetch('/api/verify-vibe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session?.user?.id ?? null,
        reporterEmail,
        restaurantName: venueName,
        vibe, barSeats: seats, waitTime: wait,
        userLat: coords?.lat ?? null,
        userLng: coords?.lng ?? null,
        restaurantLat: null, restaurantLng: null,
        gpsVerified: gpsVerifiedForSubmit,
        distanceMeters: null,
      }),
    })
    const json = await res.json()
    setSubmitting(false)

    if (res.status === 429) { setSubmitError(json.error); return }
    if (!res.ok) { setSubmitError('Something went wrong. Please try again.'); return }

    setServeEarned(json.serveReward ?? null)
    setSubmitMessage(json.message ?? '')
    setSubmitted(true)
  }

  // Card border style varies by tier
  const borderStyle = tier === 1
    ? '1px solid rgba(255,255,255,0.3)'
    : tier === 2
    ? '1px solid rgba(255,255,255,0.1)'
    : '1px solid rgba(255,255,255,0.06)'

  const bgStyle = tier === 1
    ? 'rgba(255,255,255,0.04)'
    : tier === 2
    ? 'rgba(255,255,255,0.02)'
    : 'transparent'

  return (
    <div ref={ref} className={visible ? 'slide-up' : ''} style={{ animationDelay: `${delay}ms` }}>
      <div
        className="rounded-2xl transition-all duration-300"
        style={{ border: borderStyle, backgroundColor: bgStyle }}
      >
        <div className="p-6">

          {/* Top row */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="text-base font-bold text-white">{venueName}</h3>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {tier === 1 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  GPS Verified
                </span>
              )}
              {vibeName && (
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white ${animClass}`}
                  style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)' }}
                >
                  {vibeName}
                </span>
              )}
            </div>
          </div>

          {/* Real report display (tiers 1 & 2) */}
          {report && vibeName ? (
            <>
              <p className="mb-2 text-3xl">{VIBE_META[vibeName]?.emoji}</p>
              <p className="mb-1 text-xs" style={{ color: '#606060' }}>{VIBE_META[vibeName]?.tagline}</p>
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: '#404040' }}>
                <span>{timeLabel}</span>
                {reportCount > 1 && <span>· {reportCount} reports</span>}
                {report.bar_seats && <span>· Seats: {report.bar_seats}</span>}
                {report.wait_time && <span>· Wait: {report.wait_time}</span>}
              </div>
            </>
          ) : (
            /* Tier 3: no real report */
            <>
              <p className="mb-2 text-3xl">{defaultEmoji ?? '🍽️'}</p>
              <p className="mb-4 text-xs" style={{ color: '#404040' }}>No reports yet tonight</p>
            </>
          )}

          {/* I'm here button */}
          {!submitted && (
            <button
              onClick={handleImHere}
              className="w-full rounded-full border py-2.5 text-xs font-semibold transition-colors"
              style={
                tier === 3 && !checkInOpen
                  ? { backgroundColor: 'white', color: 'black', border: '1px solid white' }
                  : { backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }
              }
            >
              {checkInOpen ? 'Cancel' : "I'm here 📍"}
            </button>
          )}
        </div>

        {/* Check-in panel */}
        {checkInOpen && !submitted && (
          <div className="border-t border-white/10 px-6 pb-6 pt-5">
            <p className="mb-5 text-sm font-semibold text-white">
              You&apos;re at {venueName}
              {gpsVerifiedForSubmit && (
                <span
                  className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  GPS ✓
                </span>
              )}
            </p>

            <div className="mb-4">
              <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>What&apos;s the vibe?</p>
              <div className="flex flex-wrap gap-2">
                {['CHILL', 'LIVE', 'PACKED'].map(v => (
                  <VibePill key={v} vibe={v} selected={vibe === v} onClick={() => setVibe(v)} />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Bar seats?</p>
              <div className="flex flex-wrap gap-2">
                {['Plenty', 'A few', 'None'].map(s => (
                  <Pill key={s} label={s} selected={seats === s} onClick={() => setSeats(s)} />
                ))}
              </div>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Wait time?</p>
              <div className="flex flex-wrap gap-2">
                {['No wait', '~15 min', '30+ min'].map(w => (
                  <Pill key={w} label={w} selected={wait === w} onClick={() => setWait(w)} />
                ))}
              </div>
            </div>

            {submitError && (
              <p className="mb-3 text-xs" style={{ color: '#f87171' }}>{submitError}</p>
            )}
            <button
              disabled={!vibe || submitting}
              onClick={handleSubmit}
              className="w-full rounded-full bg-white py-3 text-xs font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              {submitting ? 'Submitting…' : gpsVerifiedForSubmit ? 'Share the vibe — earn 5 $SERVE 🍸' : 'Share the vibe — earn 1 $SERVE 🍸'}
            </button>
          </div>
        )}

        {/* Success state */}
        {submitted && vibe && (
          <div className="border-t border-white/10 px-6 pb-6 pt-5">
            <div style={{ fontSize: '48px', lineHeight: 1 }} className="mb-3">
              {VIBE_META[vibe]?.emoji ?? VIBE_EMOJI[vibe]}
            </div>
            <p className="mb-1 text-sm font-semibold text-white capitalize">{vibe.toLowerCase()}</p>
            <p className="mb-1 text-xs" style={{ color: '#606060' }}>Reported just now</p>
            {submitMessage && (
              <p className="mb-1 text-xs font-semibold" style={{ color: (serveEarned ?? 0) > 0 ? '#4ade80' : '#9ca3af' }}>
                {submitMessage}
              </p>
            )}
            {(seats || wait) && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs" style={{ color: '#A0A0A0' }}>
                {seats && <span>Bar seats: {seats}</span>}
                {wait && <span>Wait: {wait}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Venue search + quick vibe form ────────────────────────────────────────────

function VenueSearch() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [selected, setSelected] = useState<{ name: string; address: string; lat: number | null; lng: number | null } | null>(null)

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [vibe, setVibe] = useState<string | null>(null)
  const [seats, setSeats] = useState<string | null>(null)
  const [wait, setWait] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ serveReward: number; message: string; error: string | null } | null>(null)

  function checkGpsForVenue(venueLat: number | null, venueLng: number | null) {
    setShowForm(true)
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude
        const userLng = pos.coords.longitude
        setUserCoords({ lat: userLat, lng: userLng })
        if (venueLat !== null && venueLng !== null) {
          console.log('[GPS] distance:', Math.round(getDistanceMeters(userLat, userLng, venueLat, venueLng)), 'm')
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    if (!googleLoaded || !inputRef.current || selected) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google
    if (!google?.maps?.places) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment'],
      componentRestrictions: { country: 'us' },
      fields: ['name', 'formatted_address', 'geometry'],
    })

    const style = document.createElement('style')
    style.innerHTML = '.pac-container { z-index: 99999 !important; pointer-events: all !important; }'
    document.head.appendChild(style)

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const lat = place.geometry?.location?.lat() ?? null
      const lng = place.geometry?.location?.lng() ?? null
      setSelected({ name: place.name ?? '', address: place.formatted_address ?? '', lat, lng })
      checkGpsForVenue(lat, lng)
    })

    const input = inputRef.current
    const suppressEnter = (e: KeyboardEvent) => { if (e.key === 'Enter') e.preventDefault() }
    input.addEventListener('keydown', suppressEnter)
    return () => { input.removeEventListener('keydown', suppressEnter); style.remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleLoaded, selected])

  function handleChange() {
    setSelected(null); setUserCoords(null); setShowForm(false)
    setVibe(null); setSeats(null); setWait(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleSubmit() {
    if (!selected || !vibe) return
    setSubmitting(true)

    const { data: { session } } = await supabase.auth.getSession()
    const reporterEmail = session?.user?.email ?? localStorage.getItem('slateUserEmail') ?? undefined
    const coords = userCoords

    const res = await fetch('/api/verify-vibe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session?.user?.id ?? null,
        reporterEmail,
        restaurantName: selected.name,
        vibe, barSeats: seats, waitTime: wait,
        userLat: coords?.lat ?? null,
        userLng: coords?.lng ?? null,
        restaurantLat: selected.lat,
        restaurantLng: selected.lng,
      }),
    })
    const json = await res.json()
    setSubmitting(false)

    if (res.status === 429) {
      setSubmitResult({ serveReward: 0, message: json.error, error: json.error })
      setSubmitted(true)
      return
    }
    if (res.ok) {
      setSubmitResult({ serveReward: json.serveReward ?? 0, message: json.message ?? '', error: null })
    }
    setSubmitted(true)
  }

  return (
    <div className="border-b border-white/10 px-8 py-10 lg:px-16" style={{ backgroundColor: '#050505' }}>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY}&libraries=places`}
        onLoad={() => setGoogleLoaded(true)}
      />
      <div className="mx-auto max-w-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
          Where are you right now?
        </p>

        {submitted ? (
          <div className="rounded-xl border border-white/15 px-5 py-4">
            <div className="flex items-start gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <div>
                <p className="text-sm font-medium text-white">
                  {selected?.name} is now showing as {vibe?.toLowerCase()} on Slate.
                </p>
                {submitResult?.message && (
                  <p className="mt-1 text-xs font-semibold" style={{ color: (submitResult.serveReward ?? 0) > 0 ? '#4ade80' : '#9ca3af' }}>
                    {submitResult.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : selected ? (
          <div className="rounded-xl border border-white/15 px-5 py-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{selected.name}</p>
                <p className="text-xs" style={{ color: '#606060' }}>{selected.address}</p>
              </div>
              <button onClick={handleChange} className="shrink-0 text-xs transition-colors hover:text-white" style={{ color: '#606060' }}>Change</button>
            </div>

            {showForm && (
              <>
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>What&apos;s the vibe?</p>
                  <div className="flex flex-wrap gap-2">
                    {['CHILL', 'LIVE', 'PACKED'].map(v => (
                      <VibePill key={v} vibe={v} selected={vibe === v} onClick={() => setVibe(v)} />
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Bar seats?</p>
                  <div className="flex flex-wrap gap-2">
                    {['Plenty', 'A few', 'None'].map(s => (
                      <Pill key={s} label={s} selected={seats === s} onClick={() => setSeats(s)} />
                    ))}
                  </div>
                </div>
                <div className="mb-5">
                  <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Wait time?</p>
                  <div className="flex flex-wrap gap-2">
                    {['No wait', '~15 min', '30+ min'].map(w => (
                      <Pill key={w} label={w} selected={wait === w} onClick={() => setWait(w)} />
                    ))}
                  </div>
                </div>
                <button
                  disabled={!vibe || submitting}
                  onClick={handleSubmit}
                  className="w-full rounded-full bg-white py-3 text-xs font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30"
                >
                  {submitting ? 'Verifying…' : 'Share the vibe — earn 5 $SERVE'}
                </button>
              </>
            )}
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for a bar or restaurant…"
            className="w-full border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/40"
            style={{ borderRadius: '4px' }}
          />
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LivePage() {
  const [loading, setLoading] = useState(true)
  const [tier1, setTier1] = useState<VenueDisplay[]>([])
  const [tier2, setTier2] = useState<VenueDisplay[]>([])
  const [tier3, setTier3] = useState<{ name: string; emoji: string }[]>([])
  const [weeklyCount, setWeeklyCount] = useState(0)

  useEffect(() => {
    async function loadData() {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const weekAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()

      const [verifiedRes, unverifiedRes, weeklyRes] = await Promise.all([
        supabase
          .from('vibe_reports')
          .select('*')
          .eq('gps_verified', true)
          .gte('created_at', since24h)
          .order('created_at', { ascending: false }),
        supabase
          .from('vibe_reports')
          .select('*')
          .eq('gps_verified', false)
          .gte('created_at', since24h)
          .order('created_at', { ascending: false }),
        supabase
          .from('vibe_reports')
          .select('id')
          .eq('gps_verified', true)
          .gte('created_at', weekAgo),
      ])

      setWeeklyCount(weeklyRes.data?.length ?? 0)

      // Group verified reports by venue (most recent first per venue)
      const verifiedMap = new Map<string, VibeReport[]>()
      for (const r of (verifiedRes.data ?? []) as VibeReport[]) {
        if (!verifiedMap.has(r.restaurant_name)) verifiedMap.set(r.restaurant_name, [])
        verifiedMap.get(r.restaurant_name)!.push(r)
      }

      // Group unverified reports, excluding venues already in verified
      const unverifiedMap = new Map<string, VibeReport[]>()
      for (const r of (unverifiedRes.data ?? []) as VibeReport[]) {
        if (verifiedMap.has(r.restaurant_name)) continue // already in tier 1
        if (!unverifiedMap.has(r.restaurant_name)) unverifiedMap.set(r.restaurant_name, [])
        unverifiedMap.get(r.restaurant_name)!.push(r)
      }

      const reportedNames = new Set([...verifiedMap.keys(), ...unverifiedMap.keys()])

      const t1: VenueDisplay[] = Array.from(verifiedMap.entries()).map(([name, reps]) => ({
        name,
        latestReport: reps[0],
        reportCount: reps.length,
      }))

      const t2: VenueDisplay[] = Array.from(unverifiedMap.entries()).map(([name, reps]) => ({
        name,
        latestReport: reps[0],
        reportCount: reps.length,
      }))

      const t3 = DEFAULT_VENUES.filter(v => !reportedNames.has(v.name))

      setTier1(t1)
      setTier2(t2)
      setTier3(t3)
      setLoading(false)
    }

    loadData()
  }, [])

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Navbar />
      <div className="border-t border-white/10" />

      <VenueSearch />

      <main>

        {/* ── Page header ────────────────────────────────────────────────── */}
        <section className="relative px-8 pt-16 pb-12 lg:px-16 lg:pt-20">
          <div className="absolute right-8 top-6 flex items-center gap-2 lg:right-16">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-40" style={{ animation: 'liveDot 1.4s ease-in-out infinite' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Live</span>
          </div>

          <div className="mx-auto max-w-5xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>NYC Tonight</p>
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              What&apos;s the vibe?
            </h1>
            <p className="mb-4 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: '#A0A0A0' }}>
              Real-time energy from NYC venues — reported by people who are there right now.
            </p>
            {!loading && weeklyCount > 0 && (
              <p className="text-xs font-semibold" style={{ color: '#606060' }}>
                {weeklyCount} GPS-verified {weeklyCount === 1 ? 'report' : 'reports'} this week
              </p>
            )}
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Feed ────────────────────────────────────────────────────────── */}
        <section className="px-8 py-16 lg:px-16 lg:py-20">
          <div className="mx-auto max-w-5xl">

            {loading ? (
              <p className="text-sm" style={{ color: '#404040' }}>Loading…</p>
            ) : (
              <div className="space-y-16">

                {/* Tier 1 — GPS Verified */}
                {tier1.length > 0 && (
                  <div>
                    <SectionHeading dot>Live Tonight</SectionHeading>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {tier1.map((v, i) => (
                        <VenueCard
                          key={v.name}
                          venueName={v.name}
                          tier={1}
                          report={v.latestReport}
                          reportCount={v.reportCount}
                          delay={i * 40}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tier 2 — Unverified */}
                {tier2.length > 0 && (
                  <div>
                    <SectionHeading>Recently Reported</SectionHeading>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {tier2.map((v, i) => (
                        <VenueCard
                          key={v.name}
                          venueName={v.name}
                          tier={2}
                          report={v.latestReport}
                          reportCount={v.reportCount}
                          delay={i * 40}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tier 3 — Default venues */}
                {tier3.length > 0 && (
                  <div>
                    <SectionHeading>Discover NYC</SectionHeading>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {tier3.map((v, i) => (
                        <VenueCard
                          key={v.name}
                          venueName={v.name}
                          tier={3}
                          report={null}
                          reportCount={0}
                          defaultEmoji={v.emoji}
                          delay={i * 30}
                        />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  )
}
