'use client'

import { useState } from 'react'
import Navbar from '@/app/components/Navbar'

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Earn $SERVE',
    description: 'Great service earns automatic weekly rewards. No application, no approval — just show up.',
  },
  {
    step: '02',
    title: 'Convert instantly',
    description: '$SERVE converts to USD at the current market rate. One tap, no exchange accounts needed.',
  },
  {
    step: '03',
    title: 'Direct to your bank',
    description: 'Arrives in 1–2 business days. No crypto knowledge required.',
  },
]

export default function PayPage() {
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)

  function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) setJoined(true)
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-2xl px-8 pb-24 pt-16 lg:px-0">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
            For servers & bartenders
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Slate Pay
          </h1>
          <p className="mt-3 text-lg" style={{ color: '#A0A0A0' }}>
            Your earnings, your way.
          </p>
        </div>

        {/* ── Balance card ────────────────────────────────────────────── */}
        <div
          className="mb-6 rounded-2xl border border-white/10 p-8"
          style={{ backgroundColor: '#0a0a0a' }}
        >
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#606060' }}>
            This month&apos;s earnings
          </p>

          <div className="mb-1 flex items-end gap-3">
            <span className="text-5xl font-bold tracking-tight text-white">847</span>
            <span className="mb-1 text-xl font-semibold text-white">$SERVE</span>
          </div>
          <p className="text-sm" style={{ color: '#A0A0A0' }}>≈ $47.23 USD</p>

          {/* Mini sparkline — decorative */}
          <div className="mt-6 flex items-end gap-1" style={{ height: '40px' }}>
            {[30, 45, 38, 60, 52, 70, 65, 80, 72, 90, 85, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  backgroundColor: i === 11 ? '#FFFFFF' : `rgba(255,255,255,${0.1 + i * 0.04})`,
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────────────── */}
        <div className="mb-12 grid grid-cols-2 gap-3">
          {/* Send to bank */}
          <div className="relative">
            <span className="absolute -right-2 -top-2 z-10 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
              Coming Soon
            </span>
            <button
              disabled
              className="w-full rounded-2xl bg-white py-5 text-sm font-semibold text-black opacity-60"
            >
              <div className="flex flex-col items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
                <span>Send to bank</span>
              </div>
            </button>
          </div>

          {/* Get Slate Card */}
          <div className="relative">
            <span className="absolute -right-2 -top-2 z-10 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
              Coming Soon
            </span>
            <button
              disabled
              className="w-full rounded-2xl border border-white/20 py-5 text-sm font-semibold text-white opacity-60"
            >
              <div className="flex flex-col items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
                <span>Get Slate Card</span>
              </div>
            </button>
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className="mb-12 border-t border-white/10" />

        {/* ── How it works ────────────────────────────────────────────── */}
        <div className="mb-12">
          <p className="mb-8 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
            How it works
          </p>

          <div>
            {HOW_IT_WORKS.map(({ step, title, description }, i) => (
              <div key={step}>
                <div className="flex gap-6 py-8">
                  <span
                    className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums"
                    style={{ color: '#404040' }}
                  >
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
                      {description}
                    </p>
                  </div>
                </div>
                {i < HOW_IT_WORKS.length - 1 && <div className="border-t border-white/10" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className="mb-12 border-t border-white/10" />

        {/* ── Waitlist banner ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 p-8" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="mb-6">
            <span className="mb-4 inline-block rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white">
              Coming Q3 2026
            </span>
            <h2 className="text-xl font-bold text-white">
              Slate Pay is coming soon.
            </h2>
            <p className="mt-2 text-sm" style={{ color: '#A0A0A0' }}>
              Join the waitlist to be first when payouts go live.
            </p>
          </div>

          {joined ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 shrink-0 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <p className="text-sm text-white">
                You&apos;re on the list. We&apos;ll reach you at <span className="font-medium">{email}</span>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/40"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
              >
                Join Waitlist
              </button>
            </form>
          )}
        </div>

      </main>
    </div>
  )
}
