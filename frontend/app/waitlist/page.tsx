'use client'

import { useState } from 'react'
import Navbar from '@/app/components/Navbar'

const STAFF_OPTIONS = ['1–10', '11–25', '26–50', '51–100', '100+']

const CITIES = ['New York', 'Los Angeles', 'Miami', 'Chicago', 'San Francisco']


export default function WaitlistPage() {
  const [submitted, setSubmitted] = useState(false)

  const [restName, setRestName] = useState('')
  const [restContact, setRestContact] = useState('')
  const [restEmail, setRestEmail] = useState('')
  const [restCity, setRestCity] = useState('')
  const [restStaff, setRestStaff] = useState('')

  const restaurantValid = restName && restContact && restEmail && restCity

  if (submitted) {
    return (
      <div
        className="min-h-screen text-white"
        style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
      >
        <Navbar />
        <div className="border-t border-white/10" />
        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-8 text-center">
          <div className="w-full max-w-sm">
            <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              You&apos;re on the list! ✓
            </h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
              We&apos;ll reach out when Slate launches in your city. Early restaurant partners get featured placement and a dedicated onboarding call.
            </p>

            <div className="mt-10">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#606060' }}>
                Spread the word
              </p>
              <div className="flex justify-center gap-3">
                <a
                  href="https://twitter.com/intent/tweet?text=Just%20joined%20the%20Slate%20waitlist%20%E2%80%94%20bringing%20on-chain%20server%20ratings%20and%20%24SERVE%20rewards%20to%20our%20restaurant.%20slatenow.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs font-medium text-white transition-colors hover:border-white"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                </a>
                <button className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs font-medium text-white transition-colors hover:border-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                  </svg>
                  Share on Instagram
                </button>
              </div>
            </div>

            <a
              href="/"
              className="mt-8 inline-block text-xs transition-colors hover:text-white"
              style={{ color: '#606060' }}
            >
              ← Back to home
            </a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-lg px-8 py-16 lg:px-0">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="mb-12 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
            For restaurants
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Bring Slate to your
            <br />
            restaurant.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed" style={{ color: '#A0A0A0' }}>
            Join the waitlist and we&apos;ll reach out to get your restaurant listed on Slate.
          </p>
        </div>

        {/* ── Restaurant form ───────────────────────────────────────────── */}
        <div className="mb-14 rounded-2xl border border-white/10 p-8" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#A0A0A0' }}>
              For businesses
            </p>
            <h2 className="mt-2 text-lg font-bold text-white">I represent a restaurant</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Restaurant name</label>
              <input
                type="text"
                value={restName}
                onChange={e => setRestName(e.target.value)}
                placeholder="Le Bernardin"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Contact name</label>
              <input
                type="text"
                value={restContact}
                onChange={e => setRestContact(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Email</label>
              <input
                type="email"
                value={restEmail}
                onChange={e => setRestEmail(e.target.value)}
                placeholder="contact@restaurant.com"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>City</label>
              <input
                type="text"
                value={restCity}
                onChange={e => setRestCity(e.target.value)}
                placeholder="New York, NY"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                Number of staff <span style={{ color: '#606060' }}>(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={restStaff}
                  onChange={e => setRestStaff(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" style={{ backgroundColor: '#111' }}>Select range</option>
                  {STAFF_OPTIONS.map(o => (
                    <option key={o} value={o} style={{ backgroundColor: '#111' }}>{o} staff</option>
                  ))}
                </select>
                <svg viewBox="0 0 12 12" fill="none" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <path d="M2 4L6 8L10 4" stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSubmitted(true)}
            disabled={!restaurantValid}
            className="mt-6 w-full rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            Join as a Restaurant
          </button>
        </div>

        {/* ── Social proof ──────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-sm font-semibold text-white">
            143 restaurants already on the waitlist
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {CITIES.map((city, i) => (
              <span key={city} className="flex items-center gap-2">
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs" style={{ color: '#A0A0A0' }}>
                  {city}
                </span>
                {i < CITIES.length - 1 && (
                  <span className="text-xs" style={{ color: '#404040' }}>•</span>
                )}
              </span>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
