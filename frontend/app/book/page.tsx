'use client'

import { useState } from 'react'
import Navbar from '@/app/components/Navbar'

// ── Static data ─────────────────────────────────────────────────────────────

const restaurants = [
  { id: 'eleven-madison', name: 'Eleven Madison Park', location: 'NoMad, New York' },
  { id: 'le-bernardin',   name: 'Le Bernardin',        location: 'Midtown, New York' },
  { id: 'carbone',        name: 'Carbone',              location: 'Greenwich Village, New York' },
]

const times = [
  '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM',
  '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM',
  '9:30 PM', '10:00 PM',
]

// ── Sub-components ──────────────────────────────────────────────────────────

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#A0A0A0' }}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none border-b border-white/20 bg-transparent pb-3 pt-1 text-sm text-white focus:border-white focus:outline-none"
          style={{ colorScheme: 'dark' }}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M2 4L6 8L10 4" stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

function TextField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
}: {
  id: string
  label: string
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#A0A0A0' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-b border-white/20 bg-transparent pb-3 pt-1 text-sm text-white placeholder-white/20 focus:border-white focus:outline-none"
        style={{ colorScheme: 'dark' }}
      />
    </div>
  )
}

// ── Step indicator ──────────────────────────────────────────────────────────

const stepLabels = ['Your experience', 'Confirm']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {stepLabels.map((label, i) => {
        const n = i + 1
        const isActive = n === current
        const isDone = n < current
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: isActive || isDone ? '#FFFFFF' : '#A0A0A0' }}
              >
                0{n}
              </span>
              <span
                className="max-w-[5rem] truncate text-center text-xs sm:max-w-none"
                style={{ color: isActive ? '#FFFFFF' : '#A0A0A0' }}
              >
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div
                className="mx-6 mb-4 h-px w-12 shrink-0 sm:w-20"
                style={{ backgroundColor: isDone ? '#FFFFFF' : 'rgba(255,255,255,0.15)' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function BookPage() {
  const [step, setStep] = useState(1)

  // Step 1
  const [restaurant, setRestaurant] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [partySize, setPartySize] = useState('')

  // Step 2
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const selectedRestaurant = restaurants.find((r) => r.id === restaurant)

  const step1Complete = Boolean(restaurant && date && time && partySize)
  const step2Complete = Boolean(guestName.trim() && guestEmail.trim())

  // ── Confirmation screen ──────────────────────────────────────────────────

  if (confirmed) {
    return (
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">You&apos;re confirmed.</h1>
          <p className="mt-4 text-sm" style={{ color: '#A0A0A0' }}>
            {selectedRestaurant?.name} · {date} · {time} · {partySize} {Number(partySize) === 1 ? 'guest' : 'guests'}
          </p>
          <p className="mt-8 max-w-sm text-xs" style={{ color: '#A0A0A0' }}>
            A confirmation has been sent to {guestEmail}. Your rating after dining helps your server earn $SERVE rewards.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href="/rate" className="inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80">
              Rate your server after dining
            </a>
            <a href="/" className="inline-block rounded-full border border-white/30 px-8 py-3 text-sm font-medium text-white transition-colors hover:border-white">
              Back to home
            </a>
          </div>
        </main>
      </div>
    )
  }

  // ── Main flow ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>

      <Navbar />

      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-2xl px-8 pb-32 pt-12 lg:px-0">

        {/* Step indicator */}
        <div className="mb-14">
          <StepIndicator current={step} />
        </div>

        {/* ── Step 1: Experience ────────────────────────────────────── */}
        {step === 1 && (
          <section>
            <h1 className="mb-10 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Choose your experience
            </h1>

            <div className="flex flex-col gap-10">
              <SelectField id="restaurant" label="Restaurant" value={restaurant} onChange={setRestaurant}>
                <option value="" disabled style={{ backgroundColor: '#111' }}>Select a restaurant</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id} style={{ backgroundColor: '#111' }}>
                    {r.name} — {r.location}
                  </option>
                ))}
              </SelectField>

              <TextField
                id="date"
                label="Date"
                type="date"
                placeholder="Select a date"
                value={date}
                onChange={setDate}
              />

              <SelectField id="time" label="Time" value={time} onChange={setTime}>
                <option value="" disabled style={{ backgroundColor: '#111' }}>Select a time</option>
                {times.map((t) => (
                  <option key={t} value={t} style={{ backgroundColor: '#111' }}>{t}</option>
                ))}
              </SelectField>

              <SelectField id="party" label="Party size" value={partySize} onChange={setPartySize}>
                <option value="" disabled style={{ backgroundColor: '#111' }}>Select party size</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)} style={{ backgroundColor: '#111' }}>
                    {n} {n === 1 ? 'guest' : 'guests'}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="mt-14">
              <button
                onClick={() => setStep(2)}
                disabled={!step1Complete}
                className="w-full rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30 sm:w-auto"
              >
                Continue
              </button>
            </div>
          </section>
        )}

        {/* ── Step 2: Confirm ───────────────────────────────────────── */}
        {step === 2 && (
          <section>
            <h1 className="mb-10 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Confirm your reservation
            </h1>

            {/* Summary */}
            <div className="mb-10 border border-white/10 px-6 py-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#A0A0A0' }}>
                Reservation summary
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Restaurant', value: selectedRestaurant?.name },
                  { label: 'Date',       value: date },
                  { label: 'Time',       value: time },
                  { label: 'Party',      value: `${partySize} ${Number(partySize) === 1 ? 'guest' : 'guests'}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#A0A0A0' }}>{label}</span>
                    <span className="text-sm font-medium text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest details */}
            <div className="flex flex-col gap-8">
              <TextField
                id="name"
                label="Your name"
                placeholder="Full name"
                value={guestName}
                onChange={setGuestName}
              />
              <TextField
                id="email"
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={guestEmail}
                onChange={setGuestEmail}
              />
            </div>

            {/* Actions */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <button
                onClick={() => setConfirmed(true)}
                disabled={!step2Complete}
                className="order-first w-full rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30 sm:order-last sm:w-auto"
              >
                Confirm reservation
              </button>
              <button onClick={() => setStep(1)} className="text-center text-sm transition-colors sm:text-left" style={{ color: '#A0A0A0' }}>
                ← Back
              </button>
            </div>

            <p className="mt-6 text-xs" style={{ color: '#A0A0A0' }}>
              Your rating after dining helps servers earn $SERVE token rewards automatically.
            </p>
          </section>
        )}

      </main>

    </div>
  )
}
