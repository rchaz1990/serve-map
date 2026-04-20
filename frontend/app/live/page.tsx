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

const VIBE_META: Record<string, { emoji: string; label: string; tagline: string }> = {
  CHILL:  { emoji: '🧊', label: 'CHILL',  tagline: 'Calm energy. Good conversation. Perfect for a date.' },
  LIVE:   { emoji: '🔥', label: 'LIVE',   tagline: 'Buzzing energy. Great crowd. Night is just getting started.' },
  PACKED: { emoji: '🚀', label: 'PACKED', tagline: 'Electric. Wall to wall. Peak NYC energy.' },
}

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

const VIBE_EMOJI: Record<string, string> = { CHILL: '🧊', LIVE: '🔥', PACKED: '🚀' }

function VibePill({ vibe, selected, onClick }: { vibe: string; selected: boolean; onClick: () => void }) {
  const emoji = VIBE_EMOJI[vibe] ?? vibe
  const label = vibe.charAt(0) + vibe.slice(1).toLowerCase()
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
      <span style={{ fontSize: '28px', lineHeight: 1 }}>{emoji}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: selected ? 'black' : '#606060' }}>
        {label}
      </span>
    </button>
  )
}

// ── Vibe report card ──────────────────────────────────────────────────────────

function ReportCard({ report, reportCount, delay }: { report: VibeReport; reportCount: number; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const vibe = report.vibe as Vibe
  const animClass = vibe === 'CHILL' ? 'anim-chill' : vibe === 'LIVE' ? 'anim-live' : 'anim-packed'

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

  const minutesAgo = Math.round((Date.now() - new Date(report.created_at).getTime()) / 60000)
  const hoursAgo = Math.floor(minutesAgo / 60)
  const timeLabel =
    minutesAgo < 1 ? 'just now' :
    minutesAgo < 60 ? `${minutesAgo} min ago` :
    hoursAgo === 1 ? '1 hour ago' :
    `${hoursAgo} hours ago`

  return (
    <div
      ref={ref}
      className={visible ? 'slide-up' : ''}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:border-white/25 hover:bg-white/[0.05]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-white">{report.restaurant_name}</h3>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
              Verified
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white ${animClass}`}
              style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              {report.vibe}
            </span>
          </div>
        </div>

        <p className="mb-4 text-3xl">{VIBE_META[vibe]?.emoji ?? '📍'}</p>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: '#404040' }}>Reported {timeLabel}</span>
            {reportCount > 1 && (
              <span className="text-xs" style={{ color: '#404040' }}>{reportCount} reports here</span>
            )}
          </div>
          {(report.bar_seats || report.wait_time) && (
            <div className="flex gap-3 text-xs" style={{ color: '#606060' }}>
              {report.bar_seats && <span>Seats: {report.bar_seats}</span>}
              {report.wait_time && <span>Wait: {report.wait_time}</span>}
            </div>
          )}
        </div>
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
          const distance = getDistanceMeters(userLat, userLng, venueLat, venueLng)
          console.log('[GPS] VenueSearch distance:', Math.round(distance), 'm')
        }
      },
      () => { /* denied — form already shown */ },
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
    setSelected(null)
    setUserCoords(null)
    setShowForm(false)
    setVibe(null)
    setSeats(null)
    setWait(null)
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
    <div
      className="border-b border-white/10 px-8 py-10 lg:px-16"
      style={{ backgroundColor: '#050505' }}
    >
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
              <button onClick={handleChange} className="shrink-0 text-xs transition-colors hover:text-white" style={{ color: '#606060' }}>
                Change
              </button>
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

// ── Group reports by restaurant, most recent per venue first ──────────────────

function groupByRestaurant(reports: VibeReport[]): Array<{ latest: VibeReport; count: number }> {
  const grouped = new Map<string, VibeReport[]>()
  for (const r of reports) {
    if (!grouped.has(r.restaurant_name)) grouped.set(r.restaurant_name, [])
    grouped.get(r.restaurant_name)!.push(r)
  }
  return Array.from(grouped.values()).map(group => ({ latest: group[0], count: group.length }))
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LivePage() {
  const [faqOpen, setFaqOpen] = useState(false)
  const [tonightReports, setTonightReports] = useState<VibeReport[]>([])
  const [recentFallback, setRecentFallback] = useState<VibeReport[]>([])
  const [weeklyReportCount, setWeeklyReportCount] = useState(0)
  const [weeklyVenueCount, setWeeklyVenueCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [tonightRes, weeklyRes] = await Promise.all([
        supabase
          .from('vibe_reports')
          .select('*')
          .eq('gps_verified', true)
          .gte('created_at', fourHoursAgo)
          .order('created_at', { ascending: false }),
        supabase
          .from('vibe_reports')
          .select('id, restaurant_name')
          .eq('gps_verified', true)
          .gte('created_at', weekAgo),
      ])

      const tonight = tonightRes.data ?? []
      setTonightReports(tonight)

      const weekly = weeklyRes.data ?? []
      setWeeklyReportCount(weekly.length)
      setWeeklyVenueCount(new Set(weekly.map(r => r.restaurant_name)).size)

      // If nothing tonight, load last 5 verified reports from any time as fallback
      if (tonight.length === 0) {
        const { data: fallback } = await supabase
          .from('vibe_reports')
          .select('*')
          .eq('gps_verified', true)
          .order('created_at', { ascending: false })
          .limit(5)
        setRecentFallback(fallback ?? [])
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const hasTonight = tonightReports.length > 0
  const tonightGrouped = groupByRestaurant(tonightReports)
  const fallbackGrouped = groupByRestaurant(recentFallback)

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Navbar />
      <div className="border-t border-white/10" />

      <VenueSearch />

      <main>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <section className="relative px-8 pt-16 pb-12 lg:px-16 lg:pt-20">
          <div className="absolute right-8 top-6 flex items-center gap-2 lg:right-16">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-40" style={{ animation: 'liveDot 1.4s ease-in-out infinite' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Live</span>
          </div>

          <div className="mx-auto max-w-5xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              NYC Tonight
            </p>
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              What&apos;s the vibe?
            </h1>
            <p className="mb-4 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: '#A0A0A0' }}>
              Real time energy from NYC venues — reported by people who are there right now.
            </p>
            {!loading && weeklyReportCount > 0 && (
              <p className="text-xs font-semibold" style={{ color: '#606060' }}>
                {weeklyReportCount} verified {weeklyReportCount === 1 ? 'report' : 'reports'} across {weeklyVenueCount} {weeklyVenueCount === 1 ? 'venue' : 'venues'} this week
              </p>
            )}
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Vibe legend ──────────────────────────────────────────────── */}
        <section className="px-8 py-16 lg:px-16 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Share the vibe. Earn $SERVE.
              </h2>
              <p className="text-sm" style={{ color: '#606060' }}>
                Search for your venue above and report what you&apos;re experiencing right now.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(Object.keys(VIBE_META) as Vibe[]).map(vibe => {
                const meta = VIBE_META[vibe]
                const baseAnim = vibe === 'CHILL' ? 'anim-chill' : vibe === 'LIVE' ? 'anim-live' : 'anim-packed'
                return (
                  <div
                    key={vibe}
                    className="relative flex flex-col items-start rounded-2xl border p-7"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <span className={`mb-4 block ${baseAnim}`} style={{ fontSize: '48px', lineHeight: 1 }}>
                      {meta.emoji}
                    </span>
                    <p className="mb-1 text-lg font-black tracking-[0.15em] text-white">{meta.label}</p>
                    <p className="text-xs leading-5" style={{ color: '#606060' }}>{meta.tagline}</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs" style={{ color: '#404040' }}>
                Must be at the venue to submit. GPS verified.
              </p>
              <button
                onClick={() => setFaqOpen(o => !o)}
                className="flex items-center gap-2 text-xs transition-colors hover:text-white"
                style={{ color: '#606060' }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className={`h-3.5 w-3.5 transition-transform ${faqOpen ? 'rotate-90' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
                How do I earn $SERVE?
              </button>
              {faqOpen && (
                <div
                  className="mt-3 max-w-lg rounded-xl border border-white/10 px-5 py-4 text-xs leading-6"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#A0A0A0' }}
                >
                  Submit a vibe report while you&apos;re physically at a venue and earn 5 $SERVE tokens. Reports are verified via GPS — your location is checked once to confirm you&apos;re on-site and never stored. Reports validated by subsequent guests earn bonus tokens. Cash out $SERVE to your bank account through Slate Pay.
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Live feed ─────────────────────────────────────────────────── */}
        <section className="px-8 py-16 lg:px-16 lg:py-20">
          <div className="mx-auto max-w-5xl">

            {loading ? (
              <p className="text-sm" style={{ color: '#404040' }}>Loading…</p>

            ) : hasTonight ? (
              <>
                <div className="mb-10 flex items-center gap-3">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-40" style={{ animation: 'liveDot 1.4s ease-in-out infinite' }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    NYC right now
                  </h2>
                  <span className="text-xs" style={{ color: '#404040' }}>
                    · {tonightReports.length} verified {tonightReports.length === 1 ? 'report' : 'reports'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {tonightGrouped.map(({ latest, count }, i) => (
                    <ReportCard key={latest.restaurant_name} report={latest} reportCount={count} delay={i * 60} />
                  ))}
                </div>
              </>

            ) : (
              <>
                {/* Empty state — no verified reports tonight */}
                <div className="mb-12 rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-12 text-center">
                  <p className="mb-2 text-xl font-bold text-white">Be the first to report a vibe tonight.</p>
                  <p className="mb-8 text-sm" style={{ color: '#606060' }}>
                    No verified reports in the last 4 hours. Search for your venue above and share what you&apos;re seeing.
                  </p>
                  <a
                    href="#report"
                    onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
                  >
                    Report a vibe →
                  </a>
                </div>

                {/* Fallback: last 5 verified reports from any time */}
                {fallbackGrouped.length > 0 && (
                  <>
                    <h2 className="mb-6 text-lg font-bold tracking-tight text-white">
                      Recent reports
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {fallbackGrouped.map(({ latest, count }, i) => (
                        <ReportCard key={latest.restaurant_name} report={latest} reportCount={count} delay={i * 60} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

          </div>
        </section>

      </main>
    </div>
  )
}
