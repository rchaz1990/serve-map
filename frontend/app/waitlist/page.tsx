'use client'

import { useState } from 'react'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

const PLANS = [
  { value: 'free',     label: 'Free listing',              note: 'Claim your page, see guest reports' },
  { value: 'verified', label: 'Verified Partner',          note: '$99/mo — staff analytics + priority placement' },
  { value: 'premium',  label: 'Premium Partner',           note: '$299/mo — everything + recruiting tools' },
]

const ROLES = ['Owner', 'Manager', 'GM']

export default function WaitlistPage() {
  const [restaurantName, setRestaurantName] = useState('')
  const [yourName, setYourName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [plan, setPlan] = useState('free')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = restaurantName && yourName && role && email

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    const { error: dbErr } = await supabase.from('restaurant_waitlist').insert({
      restaurant_name: restaurantName,
      contact_name: yourName,
      contact_role: role,
      email,
      phone: phone || null,
      plan_interest: plan,
    })

    if (dbErr) {
      console.error('[supabase] waitlist insert:', dbErr)
      // Still show success — don't block on DB error
    }

    // Also fire Beehiiv capture via API route
    fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        firstName: yourName.split(' ')[0],
        lastName: yourName.split(' ').slice(1).join(' '),
        role: `Restaurant ${role}`,
        venue: restaurantName,
        notifyMainnet: true,
      }),
    }).catch(() => {})

    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
        <Navbar />
        <div className="border-t border-white/10" />
        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="mb-3 text-2xl font-bold tracking-tight text-white">You&apos;re on the list.</h1>
            <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>
              We&apos;ll reach out within 24 hours to get your venue set up. Welcome to Slate.
            </p>
            <a
              href="/"
              className="mt-8 inline-block rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:border-white"
            >
              Back to home
            </a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">

          {/* Header */}
          <div className="mb-10 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              For restaurants &amp; bars
            </p>
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-white">
              Claim your venue on Slate
            </h1>
            <p className="text-sm leading-6" style={{ color: '#A0A0A0' }}>
              Your venue may already be on Slate&apos;s live map. Claim it for free and see what guests are saying tonight.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Restaurant name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Restaurant name</label>
              <input
                type="text"
                value={restaurantName}
                onChange={e => setRestaurantName(e.target.value)}
                placeholder="Employees Only"
                required
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>

            {/* Your name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Your name</label>
              <input
                type="text"
                value={yourName}
                onChange={e => setYourName(e.target.value)}
                placeholder="Jane Smith"
                required
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>

            {/* Role */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Your role</label>
              <div className="flex gap-2">
                {ROLES.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={[
                      'flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors',
                      role === r
                        ? 'border-white bg-white text-black'
                        : 'border-white/15 text-white hover:border-white/40',
                    ].join(' ')}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@myrestaurant.com"
                required
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
                Phone <span style={{ color: '#606060' }}>(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 212 555 0100"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              />
            </div>

            {/* Plan */}
            <div>
              <label className="mb-2 block text-xs font-medium" style={{ color: '#A0A0A0' }}>Which plan interests you?</label>
              <div className="flex flex-col gap-2">
                {PLANS.map(p => (
                  <label
                    key={p.value}
                    className={[
                      'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
                      plan === p.value ? 'border-white bg-white/[0.04]' : 'border-white/15 hover:border-white/30',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={p.value}
                      checked={plan === p.value}
                      onChange={() => setPlan(p.value)}
                      className="mt-0.5 accent-white"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{p.label}</p>
                      <p className="text-xs leading-5" style={{ color: '#606060' }}>{p.note}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="mt-2 w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Claim my venue →'}
            </button>

            <p className="text-center text-xs" style={{ color: '#404040' }}>
              Free listing is free forever. No credit card required.
            </p>

          </form>
        </div>
      </main>
    </div>
  )
}
