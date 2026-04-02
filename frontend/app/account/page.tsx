'use client'

import { useState } from 'react'
import Image from 'next/image'
import Navbar from '@/app/components/Navbar'

// ── Static data ──────────────────────────────────────────────────────────────

const upcomingReservations = [
  {
    id: 1,
    restaurant: 'Le Bernardin',
    neighborhood: 'Midtown, NYC',
    date: 'Thursday, April 10',
    time: '7:30 PM',
    party: 2,
    server: null, // first visit — TBD
  },
  {
    id: 2,
    restaurant: 'Carbone',
    neighborhood: 'West Village, NYC',
    date: 'Saturday, April 19',
    time: '8:00 PM',
    party: 4,
    server: 'Marcus Johnson',
  },
]

const myServers = [
  {
    id: 1,
    name: 'Marcus Johnson',
    firstName: 'Marcus',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    restaurant: 'Carbone',
    neighborhood: 'West Village',
    myRating: 5,
    following: true,
  },
  {
    id: 2,
    name: 'Sofia Rivera',
    firstName: 'Sofia',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    restaurant: 'Le Bernardin',
    neighborhood: 'Midtown',
    myRating: 5,
    following: true,
  },
  {
    id: 3,
    name: 'James Chen',
    firstName: 'James',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
    restaurant: 'Employees Only',
    neighborhood: 'West Village',
    myRating: 4,
    following: false,
  },
]

const diningHistory = [
  {
    id: 1,
    restaurant: 'Carbone',
    neighborhood: 'West Village, NYC',
    date: 'March 15, 2026',
    server: 'Marcus Johnson',
    rated: true,
    rating: 5,
  },
  {
    id: 2,
    restaurant: 'Employees Only',
    neighborhood: 'West Village, NYC',
    date: 'February 28, 2026',
    server: 'James Chen',
    rated: false,
    rating: null,
  },
  {
    id: 3,
    restaurant: 'Le Bernardin',
    neighborhood: 'Midtown, NYC',
    date: 'January 10, 2026',
    server: 'Sofia Rivera',
    rated: true,
    rating: 5,
  },
]

const following = [
  {
    id: 1,
    name: 'Marcus Johnson',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    restaurant: 'Carbone',
    neighborhood: 'West Village',
    alert: true,
    alertText: 'Just moved to Carbone',
  },
  {
    id: 2,
    name: 'Sofia Rivera',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    restaurant: 'Le Bernardin',
    neighborhood: 'Midtown',
    alert: false,
    alertText: null,
  },
  {
    id: 3,
    name: 'James Chen',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
    restaurant: 'Employees Only',
    neighborhood: 'West Village',
    alert: false,
    alertText: null,
  },
]

const accountStats = [
  { label: 'Total reservations', value: '12' },
  { label: 'Servers followed',   value: '3'  },
  { label: 'Reviews left',       value: '8'  },
  { label: 'Restaurants visited', value: '6' },
]

// ── Sub-components ───────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="text-xs tracking-tight text-white">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const [cancelledIds, setCancelledIds] = useState<number[]>([])
  const [notifDismissed, setNotifDismissed] = useState(false)

  const activeReservations = upcomingReservations.filter(r => !cancelledIds.includes(r.id))

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-5xl px-6 py-12 lg:px-16">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
              AJ
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Welcome back, Alex
              </h1>
              <p className="mt-0.5 text-xs" style={{ color: '#606060' }}>
                Member since March 2026
              </p>
            </div>
          </div>
          <a
            href="/explore"
            className="hidden rounded-full border border-white/20 px-5 py-2 text-xs font-semibold text-white transition-colors hover:border-white sm:block"
          >
            Find a restaurant →
          </a>
        </div>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {accountStats.map(({ label, value }) => (
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

        {/* ── Upcoming Reservations ────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Upcoming Reservations</h2>
            <span
              className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs font-medium text-white"
            >
              {activeReservations.length} confirmed
            </span>
          </div>

          {activeReservations.length === 0 ? (
            <div className="rounded-2xl border border-white/10 px-6 py-10 text-center" style={{ backgroundColor: '#0a0a0a' }}>
              <p className="text-sm font-medium text-white">No upcoming reservations</p>
              <a
                href="/explore"
                className="mt-4 inline-block rounded-full border border-white/20 px-6 py-2.5 text-xs font-semibold text-white transition-colors hover:border-white"
              >
                Find a restaurant
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {activeReservations.map(r => (
                <div
                  key={r.id}
                  className="flex flex-col rounded-2xl border border-white/10 p-6"
                  style={{ backgroundColor: '#0a0a0a' }}
                >
                  {/* Restaurant */}
                  <div className="mb-4">
                    <p className="text-base font-bold text-white">{r.restaurant}</p>
                    <p className="mt-0.5 text-xs" style={{ color: '#A0A0A0' }}>{r.neighborhood}</p>
                  </div>

                  {/* Details */}
                  <div className="mb-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" style={{ color: '#606060' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                      <span className="text-xs text-white">{r.date} · {r.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" style={{ color: '#606060' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      <span className="text-xs text-white">{r.party} {r.party === 1 ? 'guest' : 'guests'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Server avatar dot */}
                      <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/30" />
                      <span className="text-xs" style={{ color: r.server ? '#FFFFFF' : '#606060' }}>
                        {r.server ?? 'Server TBD — first visit'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <a
                      href="/book"
                      className="flex-1 rounded-full border border-white/20 py-2.5 text-center text-xs font-semibold text-white transition-colors hover:border-white"
                    >
                      Manage reservation
                    </a>
                    <button
                      onClick={() => setCancelledIds(prev => [...prev, r.id])}
                      className="shrink-0 text-xs transition-colors hover:text-white"
                      style={{ color: '#606060' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── My Servers ───────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">My Servers</h2>
            <a
              href="/my-servers"
              className="text-xs transition-colors hover:text-white"
              style={{ color: '#A0A0A0' }}
            >
              View all →
            </a>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {myServers.map(server => (
              <div
                key={server.id}
                className="relative flex flex-col rounded-2xl border border-white/10 p-5"
                style={{ backgroundColor: '#0a0a0a' }}
              >
                {server.following && (
                  <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-black px-2 py-0.5 text-[10px] font-semibold text-white">
                    Following ✓
                  </span>
                )}
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/20">
                    <Image
                      src={server.photo}
                      alt={server.name}
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                  </div>
                  <div className="min-w-0 pr-12">
                    <p className="truncate text-sm font-bold text-white">{server.name}</p>
                    <p className="truncate text-xs" style={{ color: '#A0A0A0' }}>
                      {server.restaurant} · {server.neighborhood}
                    </p>
                  </div>
                </div>
                <div className="mb-4 flex items-center gap-1.5">
                  <StarRow rating={server.myRating} />
                  <span className="text-xs font-medium text-white">{server.myRating}.0</span>
                </div>
                <a
                  href="/book"
                  className="mt-auto block rounded-full bg-white py-2 text-center text-xs font-semibold text-black transition-opacity hover:opacity-80"
                >
                  Reserve with {server.firstName}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── Two-col: History + Following ─────────────────────────── */}
        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Recent Dining History */}
          <section
            className="rounded-2xl border border-white/10 p-6"
            style={{ backgroundColor: '#0a0a0a' }}
          >
            <h2 className="mb-5 text-base font-semibold text-white">Recent Dining History</h2>
            <div className="flex flex-col gap-0">
              {diningHistory.map(({ id, restaurant, neighborhood, date, server, rated, rating }, i) => (
                <div key={id}>
                  <div className="py-4">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{restaurant}</p>
                        <p className="text-xs" style={{ color: '#606060' }}>{neighborhood}</p>
                      </div>
                      {rated && rating ? (
                        <div className="shrink-0 flex items-center gap-1">
                          <StarRow rating={rating} />
                        </div>
                      ) : (
                        <a
                          href="/rate"
                          className="shrink-0 rounded-full border border-white/25 px-3 py-1 text-[10px] font-semibold text-white transition-colors hover:border-white"
                        >
                          Rate
                        </a>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: '#A0A0A0' }}>
                      {date} · {server}
                    </p>
                  </div>
                  {i < diningHistory.length - 1 && <div className="border-t border-white/10" />}
                </div>
              ))}
            </div>
          </section>

          {/* Following */}
          <section
            className="rounded-2xl border border-white/10 p-6"
            style={{ backgroundColor: '#0a0a0a' }}
          >
            <h2 className="mb-5 text-base font-semibold text-white">Following</h2>

            {/* Marcus alert */}
            {!notifDismissed && (
              <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-white">
                    Marcus Johnson just moved restaurants
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: '#A0A0A0' }}>
                    Now at Carbone, West Village
                  </p>
                  <a
                    href="/book"
                    className="mt-2 inline-block rounded-full bg-white px-3.5 py-1 text-[10px] font-semibold text-black transition-opacity hover:opacity-80"
                  >
                    Reserve with Marcus →
                  </a>
                </div>
                <button
                  onClick={() => setNotifDismissed(true)}
                  className="shrink-0 text-sm transition-colors hover:text-white"
                  style={{ color: '#606060' }}
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex flex-col gap-0">
              {following.map(({ id, name, photo, restaurant, neighborhood }, i) => (
                <div key={id}>
                  <div className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/20">
                        <Image
                          src={photo}
                          alt={name}
                          fill
                          className="object-cover"
                          sizes="36px"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{name}</p>
                        <p className="text-xs" style={{ color: '#606060' }}>
                          {restaurant} · {neighborhood}
                        </p>
                      </div>
                    </div>
                    <a
                      href="/book"
                      className="shrink-0 rounded-full border border-white/20 px-3.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:border-white"
                    >
                      Reserve
                    </a>
                  </div>
                  {i < following.length - 1 && <div className="border-t border-white/10" />}
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* ── CTA banner ───────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 px-8 py-8 sm:flex-row" style={{ backgroundColor: '#0a0a0a' }}>
          <div>
            <p className="text-base font-semibold text-white">Ready to dine again?</p>
            <p className="mt-1 text-sm" style={{ color: '#A0A0A0' }}>
              Every reservation earns you a verified review — and keeps your servers' records alive.
            </p>
          </div>
          <a
            href="/explore"
            className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
          >
            Find a restaurant
          </a>
        </div>

      </main>
    </div>
  )
}
