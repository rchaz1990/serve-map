'use client'

import { useState } from 'react'
import Navbar from '@/app/components/Navbar'

// ── Types ────────────────────────────────────────────────────────────────────

type Vibe = 'Chill' | 'Live' | 'Packed'
type Busyness = 'Quiet' | 'Moderate' | 'Packed'
type BarSeats = 'Yes' | 'A few' | 'No'
type WaitTime = 'No wait' | '~15 min' | '30+ min'
type SubmitState = 'idle' | 'locating' | 'form' | 'submitting' | 'done'

// ── Static data ──────────────────────────────────────────────────────────────

const VIBE_CONFIG: Record<Vibe, {
  emoji: string
  label: string
  tagline: string
  count: number
  animClass: string
  glowStyle: React.CSSProperties
  activeGlowStyle: React.CSSProperties
  borderColor: string
  activeBorderColor: string
}> = {
  Chill: {
    emoji: '🧊',
    label: 'Chill',
    tagline: 'Calm & relaxed. Perfect for conversation.',
    count: 8,
    animClass: 'vibe-chill',
    glowStyle: { boxShadow: '0 0 12px rgba(96,165,250,0.12)' },
    activeGlowStyle: { boxShadow: '0 0 32px rgba(96,165,250,0.45)', borderColor: 'rgba(96,165,250,0.6)' },
    borderColor: 'rgba(96,165,250,0.25)',
    activeBorderColor: 'rgba(96,165,250,0.6)',
  },
  Live: {
    emoji: '🔥',
    label: 'Live',
    tagline: 'Busy and energetic. Great atmosphere tonight.',
    count: 12,
    animClass: 'vibe-live',
    glowStyle: { boxShadow: '0 0 12px rgba(251,146,60,0.12)' },
    activeGlowStyle: { boxShadow: '0 0 36px rgba(251,146,60,0.5)', borderColor: 'rgba(251,146,60,0.7)' },
    borderColor: 'rgba(251,146,60,0.25)',
    activeBorderColor: 'rgba(251,146,60,0.7)',
  },
  Packed: {
    emoji: '🚀',
    label: 'Packed',
    tagline: 'Slammed. Electric energy. Peak night.',
    count: 19,
    animClass: 'vibe-packed',
    glowStyle: { boxShadow: '0 0 12px rgba(255,255,255,0.08)' },
    activeGlowStyle: { boxShadow: '0 0 40px rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.8)' },
    borderColor: 'rgba(255,255,255,0.18)',
    activeBorderColor: 'rgba(255,255,255,0.8)',
  },
}

interface RestaurantCard {
  id: number
  restaurant: string
  neighborhood: string
  minutesAgo: number
  vibe: Vibe
  busyness: Busyness
  barSeats: string
  waitTime: string
  bookHref: string
}

const REPORTS: RestaurantCard[] = [
  { id: 1, restaurant: 'Carbone',    neighborhood: 'Greenwich Village', minutesAgo: 4,  vibe: 'Packed', busyness: 'Packed',   barSeats: 'Bar is full',      waitTime: '~45 min wait', bookHref: '/book' },
  { id: 2, restaurant: 'Don Angie',  neighborhood: 'West Village',      minutesAgo: 9,  vibe: 'Live',   busyness: 'Moderate', barSeats: '2 seats available', waitTime: '~15 min wait', bookHref: '/book' },
  { id: 3, restaurant: 'Lilia',      neighborhood: 'Williamsburg',      minutesAgo: 12, vibe: 'Packed', busyness: 'Packed',   barSeats: 'Bar is full',      waitTime: '~30 min wait', bookHref: '/book' },
  { id: 4, restaurant: 'Via Carota', neighborhood: 'West Village',      minutesAgo: 18, vibe: 'Live',   busyness: 'Moderate', barSeats: '4 seats available', waitTime: 'No wait',      bookHref: '/book' },
  { id: 5, restaurant: 'Rezdôra',    neighborhood: 'Flatiron',          minutesAgo: 22, vibe: 'Chill',  busyness: 'Quiet',    barSeats: '6 seats available', waitTime: 'No wait',      bookHref: '/book' },
  { id: 6, restaurant: "Raoul's",    neighborhood: 'SoHo',              minutesAgo: 31, vibe: 'Packed', busyness: 'Packed',   barSeats: 'Bar is full',      waitTime: '~20 min wait', bookHref: '/book' },
]

// ── Inline keyframe styles injected once ─────────────────────────────────────

const ANIM_CSS = `
@keyframes chillPulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.03); }
}
@keyframes chillPulseActive {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50%       { opacity: 1;    transform: scale(1.06); }
}
@keyframes liveFlicker {
  0%, 100% { opacity: 0.75; transform: scale(1); }
  25%       { opacity: 1;   transform: scale(1.04); }
  50%       { opacity: 0.8; transform: scale(1.01); }
  75%       { opacity: 1;   transform: scale(1.05); }
}
@keyframes liveFlickerActive {
  0%, 100% { opacity: 0.9;  transform: scale(1); }
  25%       { opacity: 1;   transform: scale(1.07); }
  50%       { opacity: 0.85; transform: scale(1.02); }
  75%       { opacity: 1;   transform: scale(1.08); }
}
@keyframes packedFlash {
  0%, 100% { opacity: 0.65; transform: scale(1); }
  20%       { opacity: 1;   transform: scale(1.06); }
  40%       { opacity: 0.7; transform: scale(1.01); }
  60%       { opacity: 1;   transform: scale(1.05); }
  80%       { opacity: 0.6; transform: scale(1); }
}
@keyframes packedFlashActive {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  20%       { opacity: 1;   transform: scale(1.09); }
  40%       { opacity: 0.75; transform: scale(1.02); }
  60%       { opacity: 1;   transform: scale(1.08); }
  80%       { opacity: 0.7; transform: scale(1); }
}
.vibe-chill        { animation: chillPulse 3s ease-in-out infinite; }
.vibe-chill-active { animation: chillPulseActive 2.2s ease-in-out infinite; }
.vibe-live         { animation: liveFlicker 2s ease-in-out infinite; }
.vibe-live-active  { animation: liveFlickerActive 1.4s ease-in-out infinite; }
.vibe-packed       { animation: packedFlash 1.6s ease-in-out infinite; }
.vibe-packed-active { animation: packedFlashActive 0.9s ease-in-out infinite; }
`

// ── Vibe badge used in restaurant cards ─────────────────────────────────────

function VibeBadge({ vibe, small = false }: { vibe: Vibe; small?: boolean }) {
  const cfg = VIBE_CONFIG[vibe]
  const animClass = `${cfg.animClass}${small ? '' : ''}`
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${animClass}`}
      style={{
        border: `1px solid ${cfg.borderColor}`,
        ...cfg.glowStyle,
        backgroundColor: 'rgba(255,255,255,0.04)',
        color: '#FFFFFF',
      }}
    >
      {cfg.emoji} {cfg.label}
    </span>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function LivePage() {
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [busyness, setBusyness] = useState<Busyness | ''>('')
  const [barSeats, setBarSeats] = useState<BarSeats | ''>('')
  const [waitTime, setWaitTime] = useState<WaitTime | ''>('')

  function handleReportClick() {
    setSubmitState('locating')
    setTimeout(() => setSubmitState('form'), 1200)
  }

  function handleSubmit() {
    if (!busyness || !barSeats || !waitTime) return
    setSubmitState('submitting')
    setTimeout(() => setSubmitState('done'), 1000)
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      {/* Inject keyframe animations */}
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />

      <Navbar />
      <div className="border-t border-white/10" />

      {/* ── Coming Soon banner ──────────────────────────────────────────── */}
      <div className="border-b border-white/15 bg-black px-8 py-10 text-center sm:py-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
          Coming Soon
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Live Intelligence</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
          Earn $SERVE rewards for sharing real-time restaurant data — launching after our NYC pilot.
        </p>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-8">

        {/* ── Vibe Meter ─────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-white">What&apos;s the vibe right now?</h2>
            <p className="mt-1 text-xs" style={{ color: '#606060' }}>
              Tap to report — earn 5 $SERVE for every verified vibe
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {(Object.keys(VIBE_CONFIG) as Vibe[]).map(vibe => {
              const cfg = VIBE_CONFIG[vibe]
              const isSelected = selectedVibe === vibe
              const isDimmed = selectedVibe !== null && !isSelected
              const animClass = isSelected ? `${cfg.animClass}-active` : cfg.animClass

              return (
                <button
                  key={vibe}
                  onClick={() => setSelectedVibe(vibe)}
                  className={`relative flex flex-col items-center rounded-2xl px-3 py-6 text-center transition-all duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? cfg.activeBorderColor : cfg.borderColor}`,
                    ...(isSelected ? cfg.activeGlowStyle : cfg.glowStyle),
                  }}
                >
                  <span className={`mb-2 text-3xl sm:text-4xl ${animClass}`}>{cfg.emoji}</span>
                  <span className="text-sm font-bold text-white">{cfg.label}</span>
                  <span className="mt-1 hidden text-[10px] leading-4 sm:block" style={{ color: '#A0A0A0' }}>
                    {cfg.tagline}
                  </span>
                  {isSelected && (
                    <span
                      className="mt-3 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                    >
                      {cfg.count} people agree
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Vibe tagline for mobile (shown below buttons) */}
          {selectedVibe && (
            <p className="mt-3 text-center text-xs sm:hidden" style={{ color: '#A0A0A0' }}>
              {VIBE_CONFIG[selectedVibe].tagline}
            </p>
          )}

          {/* Post-vote feedback */}
          {selectedVibe && (
            <div
              className="mt-4 flex items-center justify-between rounded-xl px-5 py-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div>
                <p className="text-sm font-semibold text-white">
                  {VIBE_CONFIG[selectedVibe].count} people say it&apos;s {selectedVibe} tonight
                </p>
                <p className="mt-0.5 text-xs" style={{ color: '#A0A0A0' }}>
                  Thanks for sharing! You earned 5 $SERVE
                </p>
              </div>
              <div className="rounded-xl border border-white/15 px-3 py-2 text-center">
                <p className="text-sm font-bold text-white">+5</p>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: '#606060' }}>$SERVE</p>
              </div>
            </div>
          )}
        </section>

        {/* ── Earn banner ─────────────────────────────────────────────────── */}
        <div className="mb-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          {submitState === 'idle' && (
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
                  <span className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#A0A0A0' }}>
                    Are you there right now?
                  </span>
                </div>
                <p className="text-lg font-semibold text-white">Share what you see and earn $SERVE</p>
                <p className="mt-1 text-xs" style={{ color: '#606060' }}>
                  GPS-verified reports earn 5 $SERVE tokens instantly.
                </p>
              </div>
              <button
                onClick={handleReportClick}
                className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
              >
                Submit a report
              </button>
            </div>
          )}

          {submitState === 'locating' && (
            <div className="flex items-center gap-3">
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm text-white">Verifying your location…</span>
            </div>
          )}

          {submitState === 'form' && (
            <div>
              <div className="mb-5 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span className="text-xs font-semibold text-white">Location verified ✓</span>
              </div>
              <div className="flex flex-col gap-5">
                <div>
                  <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>How busy is it?</p>
                  <div className="flex gap-2">
                    {(['Quiet', 'Moderate', 'Packed'] as Busyness[]).map(o => (
                      <button key={o} onClick={() => setBusyness(o)}
                        className={['flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors',
                          busyness === o ? 'border-white bg-white text-black' : 'border-white/15 text-white hover:border-white/40',
                        ].join(' ')}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Bar seats available?</p>
                  <div className="flex gap-2">
                    {(['Yes', 'A few', 'No'] as BarSeats[]).map(o => (
                      <button key={o} onClick={() => setBarSeats(o)}
                        className={['flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors',
                          barSeats === o ? 'border-white bg-white text-black' : 'border-white/15 text-white hover:border-white/40',
                        ].join(' ')}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Walk-in wait time?</p>
                  <div className="flex gap-2">
                    {(['No wait', '~15 min', '30+ min'] as WaitTime[]).map(o => (
                      <button key={o} onClick={() => setWaitTime(o)}
                        className={['flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors',
                          waitTime === o ? 'border-white bg-white text-black' : 'border-white/15 text-white hover:border-white/40',
                        ].join(' ')}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleSubmit} disabled={!busyness || !barSeats || !waitTime}
                  className="mt-1 w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30">
                  Submit — earn 5 $SERVE
                </button>
              </div>
            </div>
          )}

          {submitState === 'submitting' && (
            <div className="flex items-center gap-3">
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm text-white">Submitting report…</span>
            </div>
          )}

          {submitState === 'done' && (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0">
                    <circle cx="12" cy="12" r="12" fill="white" />
                    <path d="M7 12.5l3.5 3.5 6.5-7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm font-semibold text-white">Report submitted — thank you!</span>
                </div>
                <p className="mt-1 pl-7 text-xs" style={{ color: '#A0A0A0' }}>
                  Your report is now live. Others can see it immediately.
                </p>
              </div>
              <div className="rounded-xl border border-white/15 px-4 py-2 text-center">
                <p className="text-base font-bold text-white">+5</p>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: '#606060' }}>$SERVE</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Live feed header ─────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
              <h2 className="text-xl font-bold tracking-tight text-white">
                What&apos;s happening right now in NYC
              </h2>
            </div>
            <p className="mt-1 text-xs" style={{ color: '#606060' }}>
              Verified guest reports · updates in real time
            </p>
          </div>
        </div>

        {/* ── Restaurant cards ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {REPORTS.map(r => (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white">{r.restaurant}</h3>
                  <p className="mt-0.5 text-xs" style={{ color: '#606060' }}>{r.neighborhood}</p>
                </div>
                <span className="shrink-0 text-xs" style={{ color: '#606060' }}>
                  Reported {r.minutesAgo} min ago
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <VibeBadge vibe={r.vibe} />
                <a
                  href={r.bookHref}
                  className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-80"
                >
                  Reserve a table
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-center text-xs leading-5" style={{ color: '#404040' }}>
          Vibe reports are community submitted. Location verified guests only at launch.
        </p>
        <p className="mt-2 text-center text-xs" style={{ color: '#333333' }}>
          Reports expire after 2 hours · GPS verification required to submit
        </p>

      </main>
    </div>
  )
}
