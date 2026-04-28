'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'

export default function ForRestaurantsPage() {
  const router = useRouter()

  useEffect(() => {
    const userType = localStorage.getItem('slateUserType')
    if (userType === 'manager') {
      router.push('/restaurant/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="px-6 py-20 lg:px-24 lg:py-32">
          <div className="mx-auto max-w-4xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              For Restaurants
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your staff&apos;s reputation
              <br />
              is your restaurant&apos;s
              <br />
              reputation.
            </h1>
            <p className="mb-10 max-w-xl text-base leading-relaxed" style={{ color: '#606060' }}>
              Slate gives you real data on the people who make your guests come back.
            </p>
            <a
              href="/restaurant/signup"
              className="inline-block rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              Get Started Free →
            </a>
            <p className="mt-4 text-xs" style={{ color: '#404040' }}>Free to get started. No contract.</p>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Three value props ────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="mb-10 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              Why Slate
            </p>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {[
                {
                  title: 'Staff Intelligence',
                  body: 'See which servers and bartenders are driving repeat business. Real ratings from real guests — not a manager’s gut feeling.',
                },
                {
                  title: 'Talent Discovery',
                  body: 'Find the highest rated servers and bartenders in NYC. Verified track records. No resumes. No guessing.',
                },
                {
                  title: 'Guest Loyalty',
                  body: 'When guests follow your staff on Slate they come back to your venue specifically. Staff retention becomes guest retention.',
                },
              ].map(card => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-7"
                >
                  <p className="mb-3 text-sm font-semibold text-white">{card.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#606060' }}>{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Pricing ──────────────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-24" style={{ backgroundColor: '#080808' }}>
          <div className="mx-auto max-w-4xl">
            <p className="mb-10 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              Pricing
            </p>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {[
                {
                  tier: 'Free',
                  price: '$0',
                  cadence: 'forever',
                  highlight: false,
                  features: [
                    'Ghost listing',
                    'Vibe reports',
                    'Basic venue page',
                  ],
                },
                {
                  tier: 'Verified Partner',
                  price: '$99',
                  cadence: 'per month',
                  highlight: true,
                  features: [
                    'Staff analytics',
                    'Talent discovery',
                    'Priority placement',
                    'Guest intelligence reports',
                  ],
                },
                {
                  tier: 'Premium',
                  price: '$299',
                  cadence: 'per month',
                  highlight: false,
                  features: [
                    'Everything in Verified Partner',
                    'Scheduling tools',
                    'Reservation features',
                  ],
                },
              ].map(plan => (
                <div
                  key={plan.tier}
                  className="flex flex-col rounded-2xl px-7 py-8"
                  style={{
                    border: plan.highlight ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: plan.highlight ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white">{plan.tier}</p>
                  <div className="mb-6 flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight text-white">{plan.price}</span>
                    <span className="text-xs" style={{ color: '#606060' }}>{plan.cadence}</span>
                  </div>
                  <ul className="flex flex-1 flex-col gap-3">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0 text-white">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Bottom CTA ──────────────────────────────────────────────── */}
        <section className="px-6 py-24 text-center lg:px-24 lg:py-36">
          <div className="mx-auto max-w-xl">
            <h2 className="mb-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Free to get started.
              <br />
              No contract.
            </h2>
            <p className="mx-auto mb-10 text-base leading-relaxed" style={{ color: '#606060' }}>
              Claim your restaurant in two minutes. See who&apos;s driving your repeat business tonight.
            </p>
            <a
              href="/restaurant/signup"
              className="block w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:inline-block sm:w-auto sm:px-10"
            >
              Create Your Restaurant Account →
            </a>
          </div>
        </section>

      </main>
    </div>
  )
}
