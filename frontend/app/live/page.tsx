'use client'

import { useState } from 'react'
import Navbar from '@/app/components/Navbar'

type Busyness = 'Quiet' | 'Moderate' | 'Packed'
type BarSeats = 'Yes' | 'A few' | 'No'
type WaitTime = 'No wait' | '~15 min' | '30+ min'

interface Report {
  id: number
  restaurant: string
  neighborhood: string
  minutesAgo: number
  busyness: Busyness
  barSeats: string
  waitTime: string
  tokensEarned: number
  bookHref: string
}

const REPORTS: Report[] = [
  {
    id: 1,
    restaurant: 'Carbone',
    neighborhood: 'Greenwich Village',
    minutesAgo: 4,
    busyness: 'Packed',
    barSeats: 'Bar is full',
    waitTime: '~45 min wait',
    tokensEarned: 5,
    bookHref: '/book',
  },
  {
    id: 2,
    restaurant: 'Don Angie',
    neighborhood: 'West Village',
    minutesAgo: 9,
    busyness: 'Moderate',
    barSeats: '2 seats available',
    waitTime: '~15 min wait',
    tokensEarned: 5,
    bookHref: '/book',
  },
  {
    id: 3,
    restaurant: 'Lilia',
    neighborhood: 'Williamsburg',
    minutesAgo: 12,
    busyness: 'Packed',
    barSeats: 'Bar is full',
    waitTime: '~30 min wait',
    tokensEarned: 5,
    bookHref: '/book',
  },
  {
    id: 4,
    restaurant: 'Via Carota',
    neighborhood: 'West Village',
    minutesAgo: 18,
    busyness: 'Moderate',
    barSeats: '4 seats available',
    waitTime: 'No wait',
    tokensEarned: 5,
    bookHref: '/book',
  },
  {
    id: 5,
    restaurant: 'Rezdôra',
    neighborhood: 'Flatiron',
    minutesAgo: 22,
    busyness: 'Quiet',
    barSeats: '6 seats available',
    waitTime: 'No wait',
    tokensEarned: 5,
    bookHref: '/book',
  },
  {
    id: 6,
    restaurant: 'Raoul\'s',
    neighborhood: 'SoHo',
    minutesAgo: 31,
    busyness: 'Packed',
    barSeats: 'Bar is full',
    waitTime: '~20 min wait',
    tokensEarned: 5,
    bookHref: '/book',
  },
]

const BUSYNESS_CONFIG: Record<Busyness, { bars: number; color: string; label: string }> = {
  Quiet:    { bars: 1, color: '#FFFFFF', label: 'Quiet' },
  Moderate: { bars: 2, color: '#FFFFFF', label: 'Moderate' },
  Packed:   { bars: 3, color: '#FFFFFF', label: 'Packed' },
}

function BusynessBar({ level }: { level: Busyness }) {
  const cfg = BUSYNESS_CONFIG[level]
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-3 w-5 rounded-sm transition-colors"
            style={{
              backgroundColor: i <= cfg.bars ? cfg.color : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-white">{cfg.label}</span>
    </div>
  )
}

type SubmitState = 'idle' | 'locating' | 'form' | 'submitting' | 'done'

export default function LivePage() {
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [busyness, setBusyness] = useState<Busyness | ''>('')
  const [barSeats, setBarSeats] = useState<BarSeats | ''>('')
  const [waitTime, setWaitTime] = useState<WaitTime | ''>('')

  function handleReportClick() {
    setSubmitState('locating')
    // Simulate GPS verification (1.2 s)
    setTimeout(() => setSubmitState('form'), 1200)
  }

  function handleSubmit() {
    if (!busyness || !barSeats || !waitTime) return
    setSubmitState('submitting')
    setTimeout(() => setSubmitState('done'), 1000)
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      {/* ── Coming Soon banner ──────────────────────────────────────────────── */}
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
                {/* Q1 */}
                <div>
                  <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>How busy is it?</p>
                  <div className="flex gap-2">
                    {(['Quiet', 'Moderate', 'Packed'] as Busyness[]).map(o => (
                      <button
                        key={o}
                        onClick={() => setBusyness(o)}
                        className={[
                          'flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors',
                          busyness === o ? 'border-white bg-white text-black' : 'border-white/15 text-white hover:border-white/40',
                        ].join(' ')}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q2 */}
                <div>
                  <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Bar seats available?</p>
                  <div className="flex gap-2">
                    {(['Yes', 'A few', 'No'] as BarSeats[]).map(o => (
                      <button
                        key={o}
                        onClick={() => setBarSeats(o)}
                        className={[
                          'flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors',
                          barSeats === o ? 'border-white bg-white text-black' : 'border-white/15 text-white hover:border-white/40',
                        ].join(' ')}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q3 */}
                <div>
                  <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Walk-in wait time?</p>
                  <div className="flex gap-2">
                    {(['No wait', '~15 min', '30+ min'] as WaitTime[]).map(o => (
                      <button
                        key={o}
                        onClick={() => setWaitTime(o)}
                        className={[
                          'flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors',
                          waitTime === o ? 'border-white bg-white text-black' : 'border-white/15 text-white hover:border-white/40',
                        ].join(' ')}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!busyness || !barSeats || !waitTime}
                  className="mt-1 w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30"
                >
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
              <h1 className="text-xl font-bold tracking-tight text-white">
                What&apos;s happening right now in NYC
              </h1>
            </div>
            <p className="mt-1 text-xs" style={{ color: '#606060' }}>
              Verified guest reports · updates in real time
            </p>
          </div>
        </div>

        {/* ── Report cards ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {REPORTS.map(r => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              {/* Header row */}
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">{r.restaurant}</h2>
                  <p className="mt-0.5 text-xs" style={{ color: '#606060' }}>{r.neighborhood}</p>
                </div>
                <span className="shrink-0 text-xs" style={{ color: '#606060' }}>
                  Reported {r.minutesAgo} min ago
                </span>
              </div>

              {/* Stats */}
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Busyness */}
                <div className="rounded-xl border border-white/10 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#606060' }}>
                    Busyness
                  </p>
                  <BusynessBar level={r.busyness} />
                </div>

                {/* Bar seats */}
                <div className="rounded-xl border border-white/10 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#606060' }}>
                    Bar seats
                  </p>
                  <p className="text-xs font-medium text-white">{r.barSeats}</p>
                </div>

                {/* Wait */}
                <div className="rounded-xl border border-white/10 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#606060' }}>
                    Wait time
                  </p>
                  <p className="text-xs font-medium text-white">{r.waitTime}</p>
                </div>
              </div>

              {/* Reporter + actions */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs" style={{ color: '#606060' }}>
                  Verified Slate guest ✓
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: '#404040' }}>
                    {r.tokensEarned} $SERVE earned
                  </span>
                  <a
                    href={r.bookHref}
                    className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-80"
                  >
                    Reserve a table
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-10 text-center text-xs" style={{ color: '#404040' }}>
          Reports expire after 2 hours · GPS verification required to submit
        </p>

      </main>
    </div>
  )
}
