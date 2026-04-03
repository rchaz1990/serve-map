'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import Navbar from '@/app/components/Navbar'

const QR_DURATION_MS = 8 * 60 * 60 * 1000 // 8 hours

function useQRCode() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [activatedAt, setActivatedAt] = useState<number | null>(null)
  const [msLeft, setMsLeft] = useState(0)

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const code = localStorage.getItem('slate-qr-code')
    const ts = localStorage.getItem('slate-qr-activated-at')
    if (code && ts) {
      const activated = parseInt(ts, 10)
      const remaining = activated + QR_DURATION_MS - Date.now()
      if (remaining > 0) {
        setQrCode(code)
        setActivatedAt(activated)
        setMsLeft(remaining)
      } else {
        localStorage.removeItem('slate-qr-code')
        localStorage.removeItem('slate-qr-activated-at')
      }
    }
  }, [])

  // Countdown tick
  useEffect(() => {
    if (!activatedAt) return
    const id = setInterval(() => {
      const remaining = activatedAt + QR_DURATION_MS - Date.now()
      if (remaining <= 0) {
        deactivate()
      } else {
        setMsLeft(remaining)
      }
    }, 10000) // update every 10s
    return () => clearInterval(id)
  }, [activatedAt])

  function activate() {
    const code = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    const now = Date.now()
    localStorage.setItem('slate-qr-code', code)
    localStorage.setItem('slate-qr-activated-at', String(now))
    setQrCode(code)
    setActivatedAt(now)
    setMsLeft(QR_DURATION_MS)
  }

  function deactivate() {
    localStorage.removeItem('slate-qr-code')
    localStorage.removeItem('slate-qr-activated-at')
    setQrCode(null)
    setActivatedAt(null)
    setMsLeft(0)
  }

  function formatCountdown(ms: number) {
    const totalMins = Math.ceil(ms / 60000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  return { qrCode, msLeft, activate, deactivate, formatCountdown }
}

const stats = [
  { label: 'Total Ratings', value: '127' },
  { label: 'Average Score', value: '4.9 ★' },
  { label: 'Followers', value: '89' },
  { label: '$SERVE Earned', value: '847' },
]

const weeklyEarnings = [
  { week: 'Feb 3', amount: 180 },
  { week: 'Feb 10', amount: 210 },
  { week: 'Feb 17', amount: 195 },
  { week: 'Feb 24', amount: 262 },
]

const reviews = [
  {
    guest: 'Sarah K.',
    rating: 5,
    date: 'March 12, 2025',
    comment: 'Marcus remembered my dietary restrictions from a visit six months prior — without me saying a word.',
  },
  {
    guest: 'David L.',
    rating: 5,
    date: 'March 3, 2025',
    comment: 'Effortless pacing, genuinely warm without being performative. Already requested him for our next visit.',
  },
  {
    guest: 'Rachel M.',
    rating: 4,
    date: 'February 22, 2025',
    comment: 'Attentive without hovering. Knew when to engage and when to give us space.',
  },
]

const followers = [
  { initials: 'SK', name: 'Sarah K.', since: 'Mar 12' },
  { initials: 'DL', name: 'David L.', since: 'Mar 3' },
  { initials: 'RM', name: 'Rachel M.', since: 'Feb 22' },
]

const career = [
  { restaurant: 'Eleven Madison Park', role: 'Head Bartender', period: 'Jan 2023 – Present', current: true },
  { restaurant: 'Le Bernardin', role: 'Senior Server', period: 'Aug 2020 – Dec 2022', current: false },
  { restaurant: 'Nobu Fifty Seven', role: 'Server', period: 'Mar 2018 – Jul 2020', current: false },
]

const reservations = [
  {
    guest: 'James T.',
    date: 'Thursday, April 10',
    time: '7:30 PM',
    party: 4,
    restaurant: 'Eleven Madison Park',
  },
  {
    guest: 'Priya N.',
    date: 'Saturday, April 12',
    time: '8:00 PM',
    party: 2,
    restaurant: 'Eleven Madison Park',
  },
]

const SERVE_BALANCE = 847
const SERVE_GOAL = 1000
const serveProgress = Math.round((SERVE_BALANCE / SERVE_GOAL) * 100)
const maxWeekly = Math.max(...weeklyEarnings.map(w => w.amount))

export default function DashboardPage() {
  const [copied, setCopied] = useState(false)
  const { qrCode, msLeft, activate, deactivate, formatCountdown } = useQRCode()

  function handleCopy() {
    navigator.clipboard.writeText('https://slatenow.xyz/server/1')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-5xl px-8 py-12 lg:px-16">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Welcome back, Marcus
              </h1>
              {/* Verified badge */}
              <span title="Verified on-chain profile">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 shrink-0">
                  <circle cx="12" cy="12" r="12" fill="white" />
                  <path d="M7 12.5l3.5 3.5 6.5-7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <p className="mt-1 text-sm font-medium" style={{ color: '#4ade80' }}>
              Your profile is live on Slate ✓
            </p>
          </div>
          <a
            href="/server/1"
            className="self-start rounded-full border border-white/20 px-5 py-2 text-xs font-semibold text-white transition-colors hover:border-white sm:self-auto"
          >
            View public profile →
          </a>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-1.5 rounded-2xl border border-white/10 p-5"
              style={{ backgroundColor: '#0a0a0a' }}
            >
              <span className="text-2xl font-bold text-white">{value}</span>
              <span className="text-xs" style={{ color: '#A0A0A0' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Two-col layout: rewards + reviews ───────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* $SERVE Rewards */}
          <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">$SERVE Rewards</p>
              <a
                href="/pay"
                className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-80"
              >
                Cash out
              </a>
            </div>

            {/* Balance */}
            <div className="mb-1">
              <span className="text-3xl font-bold text-white">{SERVE_BALANCE}</span>
              <span className="ml-1.5 text-sm font-medium text-white">$SERVE</span>
            </div>
            <p className="mb-5 text-xs" style={{ color: '#A0A0A0' }}>≈ $47.23 USD</p>

            {/* Progress to next tier */}
            <div className="mb-1.5 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full bg-white" style={{ width: `${serveProgress}%` }} />
            </div>
            <div className="mb-6 flex justify-between text-xs" style={{ color: '#606060' }}>
              <span>Next tier: {SERVE_GOAL} $SERVE</span>
              <span className="text-white">{SERVE_GOAL - SERVE_BALANCE} away</span>
            </div>

            {/* Weekly bar chart */}
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#606060' }}>
              Last 4 weeks
            </p>
            <div className="flex items-end gap-2" style={{ height: '56px' }}>
              {weeklyEarnings.map(({ week, amount }) => (
                <div key={week} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-sm bg-white"
                    style={{ height: `${Math.round((amount / maxWeekly) * 100)}%`, opacity: amount === maxWeekly ? 1 : 0.35 }}
                  />
                  <span className="text-[9px]" style={{ color: '#606060' }}>{week.split(' ')[1]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Recent Reviews</p>
              <a href="/server/1" className="text-xs transition-colors hover:text-white" style={{ color: '#A0A0A0' }}>
                View all →
              </a>
            </div>

            <div className="flex flex-col gap-0">
              {reviews.map(({ guest, rating, date, comment }, i) => (
                <div key={i}>
                  <div className="py-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{guest}</span>
                        <span className="text-xs tracking-wide" style={{ color: '#A0A0A0' }}>
                          {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                        </span>
                      </div>
                      <span className="text-[10px]" style={{ color: '#606060' }}>{date}</span>
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
                      &ldquo;{comment}&rdquo;
                    </p>
                  </div>
                  {i < reviews.length - 1 && <div className="border-t border-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Two-col layout: following + career ──────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Your Following */}
          <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Your Following</p>
              <span className="text-2xl font-bold text-white">89</span>
            </div>

            <div className="mb-5 flex flex-col gap-0">
              {followers.map(({ initials, name, since }, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white">
                        {initials}
                      </div>
                      <span className="text-sm text-white">{name}</span>
                    </div>
                    <span className="text-xs" style={{ color: '#606060' }}>Since {since}</span>
                  </div>
                  {i < followers.length - 1 && <div className="border-t border-white/10" />}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 px-4 py-3">
              <p className="text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
                Your followers get notified when you move to a new restaurant.
              </p>
            </div>
          </div>

          {/* Career History */}
          <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Career History</p>
              <p className="text-xs" style={{ color: '#A0A0A0' }}>Verified on-chain</p>
            </div>

            <div className="mb-5">
              {career.map(({ restaurant, role, period, current }, i) => (
                <div key={i}>
                  <div className="flex flex-col gap-0.5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{restaurant}</span>
                      {current && (
                        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: '#A0A0A0' }}>{role}</span>
                      <span className="text-xs tabular-nums" style={{ color: '#606060' }}>{period}</span>
                    </div>
                  </div>
                  {i < career.length - 1 && <div className="border-t border-white/10" />}
                </div>
              ))}
            </div>

            <button className="w-full rounded-xl border border-white/15 py-2.5 text-xs font-medium text-white transition-colors hover:border-white">
              + Add new restaurant
            </button>
          </div>
        </div>

        {/* ── Upcoming Reservations ───────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Upcoming Reservations</p>
            <span
              className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs font-medium text-white"
            >
              {reservations.length} confirmed
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reservations.map(({ guest, date, time, party, restaurant }, i) => (
              <div key={i} className="rounded-xl border border-white/10 p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white">
                    {guest.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] font-medium text-white">
                    {party} guests
                  </span>
                </div>
                <p className="text-sm font-semibold text-white">{guest}</p>
                <p className="mt-0.5 text-xs" style={{ color: '#A0A0A0' }}>{restaurant}</p>
                <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: '#A0A0A0' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                  {date} · {time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── My QR Code ──────────────────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">My QR Code</p>
              <p className="mt-0.5 text-xs" style={{ color: '#A0A0A0' }}>
                Let guests scan to rate and follow you instantly
              </p>
            </div>
            {qrCode && (
              <span className="rounded-full border border-white/20 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white">
                Active {formatCountdown(msLeft)}
              </span>
            )}
          </div>

          {qrCode ? (
            <>
              {/* QR code */}
              <div className="mb-5 flex flex-col items-center gap-5">
                <div className="rounded-2xl bg-white p-5">
                  <QRCode
                    value={`https://slatenow.xyz/scan/${qrCode}`}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <p className="max-w-xs text-center text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
                  Show this to your guests so they can rate and follow you
                </p>
              </div>

              {/* URL + deactivate */}
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="flex-1 truncate font-mono text-xs" style={{ color: '#606060' }}>
                  slatenow.xyz/scan/{qrCode}
                </span>
              </div>
              <button
                onClick={deactivate}
                className="w-full rounded-full border border-white/20 py-3 text-xs font-semibold text-white transition-colors hover:border-white"
              >
                Deactivate
              </button>
            </>
          ) : (
            <button
              onClick={activate}
              className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              Activate my QR code
            </button>
          )}
        </div>

        {/* ── Share your profile ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
          <p className="mb-1.5 text-sm font-semibold text-white">Share your profile</p>
          <p className="mb-5 text-xs" style={{ color: '#A0A0A0' }}>
            Let guests find and follow you directly.
          </p>

          {/* Profile URL */}
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
            <span className="flex-1 truncate font-mono text-xs text-white">
              slatenow.xyz/server/1
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          {/* Social share buttons */}
          <div className="flex gap-3">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-xs font-medium text-white transition-colors hover:border-white">
              {/* Instagram gradient icon simplified to white for B&W design */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
              </svg>
              Instagram
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-xs font-medium text-white transition-colors hover:border-white">
              {/* X / Twitter */}
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </button>
          </div>
        </div>

      </main>
    </div>
  )
}
