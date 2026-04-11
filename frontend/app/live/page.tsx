'use client'

import { useState, useEffect, useRef } from 'react'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type Vibe = 'CHILL' | 'LIVE' | 'PACKED'

interface Venue {
  id: number
  name: string
  neighborhood: string
  vibe: Vibe
  minutesAgo: number
  servers: number
  energy: number
}

// ── Data ──────────────────────────────────────────────────────────────────────

const VENUES: Venue[] = [
  { id: 1, name: 'Employees Only',    neighborhood: 'West Village',      vibe: 'PACKED', minutesAgo: 3,  servers: 2, energy: 96 },
  { id: 2, name: 'Death & Co',        neighborhood: 'East Village',      vibe: 'LIVE',   minutesAgo: 7,  servers: 1, energy: 62 },
  { id: 3, name: 'Attaboy',           neighborhood: 'Lower East Side',   vibe: 'PACKED', minutesAgo: 2,  servers: 3, energy: 99 },
  { id: 4, name: 'Dante',             neighborhood: 'West Village',      vibe: 'LIVE',   minutesAgo: 12, servers: 2, energy: 58 },
  { id: 5, name: 'The Dead Rabbit',   neighborhood: 'Financial District', vibe: 'LIVE',  minutesAgo: 5,  servers: 1, energy: 71 },
  { id: 6, name: "Please Don't Tell", neighborhood: 'East Village',      vibe: 'PACKED', minutesAgo: 1,  servers: 4, energy: 100 },
  { id: 7, name: 'Maison Premiere',   neighborhood: 'Williamsburg',      vibe: 'CHILL',  minutesAgo: 18, servers: 2, energy: 28 },
  { id: 8, name: 'Amor y Amargo',     neighborhood: 'East Village',      vibe: 'CHILL',  minutesAgo: 22, servers: 1, energy: 22 },
]

const VIBE_META = {
  CHILL:  { emoji: '🧊', label: 'CHILL',  tagline: 'Calm energy. Good conversation. Perfect for a date.', reports: 14 },
  LIVE:   { emoji: '🔥', label: 'LIVE',   tagline: 'Buzzing energy. Great crowd. Night is just getting started.', reports: 31 },
  PACKED: { emoji: '🚀', label: 'PACKED', tagline: 'Electric. Wall to wall. Peak NYC energy.', reports: 8 },
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
@keyframes selectedGlow {
  0%,100% { box-shadow:0 0 20px rgba(255,255,255,.2); }
  50%     { box-shadow:0 0 40px rgba(255,255,255,.4); }
}
.anim-chill  { animation: chillBreathe 4s ease-in-out infinite; }
.anim-live   { animation: liveFlicker 2.2s ease-in-out infinite; }
.anim-packed { animation: packedPulse 1.1s ease-in-out infinite; }
.anim-chill-active  { animation: chillBreathe 3s ease-in-out infinite, selectedGlow 3s ease-in-out infinite; }
.anim-live-active   { animation: liveFlicker 1.6s ease-in-out infinite, selectedGlow 2s ease-in-out infinite; }
.anim-packed-active { animation: packedPulse .8s ease-in-out infinite, selectedGlow 1.2s ease-in-out infinite; }
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

// ── Venue card ────────────────────────────────────────────────────────────────

function VenueCard({ venue, delay }: { venue: Venue; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const animClass = venue.vibe === 'CHILL' ? 'anim-chill' : venue.vibe === 'LIVE' ? 'anim-live' : 'anim-packed'

  // Check-in form state
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [vibe, setVibe] = useState<string | null>(null)
  const [seats, setSeats] = useState<string | null>(null)
  const [wait, setWait] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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

  async function handleSubmit() {
    if (!vibe) return
    setSubmitting(true)
    const { error } = await supabase.from('vibe_reports').insert({
      venue_name: venue.name,
      neighborhood: venue.neighborhood,
      vibe,
      bar_seats: seats,
      wait_time: wait,
      reported_at: new Date().toISOString(),
    })
    if (error) console.error('[supabase] vibe_report:', error)
    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <div
      ref={ref}
      className={visible ? 'slide-up' : ''}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:border-white/25 hover:bg-white/[0.05]">
        {/* Card body */}
        <div className="group p-6">
          {/* Top row */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="text-base font-bold text-white">{venue.name}</h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white ${animClass}`}
              style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              {venue.vibe}
            </span>
          </div>

          <p className="mb-2 text-3xl">{VIBE_META[venue.vibe].emoji}</p>
          <p className="mb-4 text-xs" style={{ color: '#606060' }}>{venue.neighborhood}</p>

          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white/70" />
                </span>
                <span className="text-xs font-semibold text-white">
                  {venue.servers} Slate {venue.servers === 1 ? 'server' : 'servers'} on shift
                </span>
              </div>
              <span className="text-xs" style={{ color: '#404040' }}>
                Reported {venue.minutesAgo} min ago
              </span>
            </div>
          </div>

          {/* I'm here button */}
          {!submitted && (
            <button
              onClick={() => setCheckInOpen(o => !o)}
              className="w-full rounded-full border border-white/20 py-2.5 text-xs font-semibold text-white transition-colors hover:border-white"
            >
              {checkInOpen ? 'Cancel' : "I'm here right now 📍"}
            </button>
          )}
        </div>

        {/* Inline check-in form */}
        {checkInOpen && !submitted && (
          <div className="border-t border-white/10 px-6 pb-6 pt-5">
            <p className="mb-5 text-sm font-semibold text-white">
              You&apos;re at {venue.name}
            </p>

            {/* Vibe */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>What&apos;s the vibe?</p>
              <div className="flex flex-wrap gap-2">
                {[{ v: 'CHILL', label: 'Chill 🧊' }, { v: 'LIVE', label: 'Live 🔥' }, { v: 'PACKED', label: 'Packed 🚀' }].map(({ v, label }) => (
                  <Pill key={v} label={label} selected={vibe === v} onClick={() => setVibe(v)} />
                ))}
              </div>
            </div>

            {/* Bar seats */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Bar seats?</p>
              <div className="flex flex-wrap gap-2">
                {['Plenty', 'A few', 'None'].map(s => (
                  <Pill key={s} label={s} selected={seats === s} onClick={() => setSeats(s)} />
                ))}
              </div>
            </div>

            {/* Wait time */}
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
              {submitting ? 'Submitting…' : 'Share the vibe — earn 5 $SERVE 🍸'}
            </button>
          </div>
        )}

        {/* Success state */}
        {submitted && (
          <div className="border-t border-white/10 px-6 pb-5 pt-4">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <p className="text-xs font-medium text-white">
                Thanks! Guests can see {venue.name} is {vibe?.toLowerCase()} tonight ✓
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LivePage() {
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null)
  const [faqOpen, setFaqOpen] = useState(false)

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Navbar />
      <div className="border-t border-white/10" />

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
            <p className="mb-3 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: '#A0A0A0' }}>
              Real time energy from NYC venues — reported by people who are there right now.
            </p>
            <p className="text-xs" style={{ color: '#404040' }}>
              Updated in real time · Location verified reports only
            </p>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Vibe meter ───────────────────────────────────────────────── */}
        <section className="px-8 py-16 lg:px-16 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Share the vibe. Earn $SERVE.
              </h2>
              <p className="text-sm" style={{ color: '#606060' }}>
                Tap to report what you&apos;re experiencing right now.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(Object.keys(VIBE_META) as Vibe[]).map(vibe => {
                const meta = VIBE_META[vibe]
                const isSelected = selectedVibe === vibe
                const isDimmed = selectedVibe !== null && !isSelected
                const baseAnim = vibe === 'CHILL' ? 'anim-chill' : vibe === 'LIVE' ? 'anim-live' : 'anim-packed'
                const activeAnim = `${baseAnim}-active`

                return (
                  <button
                    key={vibe}
                    onClick={() => setSelectedVibe(isSelected ? null : vibe)}
                    className={`relative flex flex-col items-start rounded-2xl border p-7 text-left transition-all duration-300 ${isDimmed ? 'opacity-20' : 'opacity-100'}`}
                    style={{
                      borderColor: isSelected ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)',
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <span className={`mb-5 block text-4xl ${isSelected ? activeAnim : baseAnim}`}>
                      {meta.emoji}
                    </span>
                    <p className="mb-2 text-2xl font-black tracking-[0.15em] text-white">
                      {meta.label}
                    </p>
                    <p className="mb-5 text-xs leading-5" style={{ color: isSelected ? '#C0C0C0' : '#606060' }}>
                      {meta.tagline}
                    </p>
                    {isSelected ? (
                      <div
                        className="mt-auto w-full rounded-xl px-4 py-3 text-center text-xs font-semibold text-white"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                      >
                        Vibe submitted! +5 $SERVE earned ✓
                      </div>
                    ) : (
                      <p className="mt-auto text-xs" style={{ color: '#404040' }}>
                        {meta.reports} reports tonight
                      </p>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs" style={{ color: '#404040' }}>
                Must be at the venue to submit. GPS verified at launch.
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

        {/* ── Live venue feed ───────────────────────────────────────────── */}
        <section className="px-8 py-16 lg:px-16 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-40" style={{ animation: 'liveDot 1.4s ease-in-out infinite' }} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                NYC right now
              </h2>
              <span className="text-xs" style={{ color: '#404040' }}>
                · {VENUES.length} venues reporting
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {VENUES.map((venue, i) => (
                <VenueCard key={venue.id} venue={venue} delay={i * 60} />
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
