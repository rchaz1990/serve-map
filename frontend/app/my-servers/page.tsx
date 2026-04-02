'use client'

import { useState } from 'react'
import Image from 'next/image'
import Navbar from '@/app/components/Navbar'

const MY_SERVERS = [
  {
    id: 1,
    name: 'Marcus Johnson',
    firstName: 'Marcus',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    restaurant: 'Carbone',
    neighborhood: 'West Village',
    myRating: 5,
    diningCount: 3,
    lastVisited: 'March 15, 2026',
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
    diningCount: 1,
    lastVisited: 'February 28, 2026',
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
    diningCount: 2,
    lastVisited: 'January 10, 2026',
    following: false,
  },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-xs text-white">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

export default function MyServersPage() {
  const [notificationDismissed, setNotificationDismissed] = useState(false)

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-5xl px-8 py-16 lg:px-16">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-10">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            My Servers
          </h1>
          <p className="text-sm" style={{ color: '#A0A0A0' }}>
            The people who made your dining experiences memorable.
          </p>
          <p className="mt-1.5 text-xs" style={{ color: '#606060' }}>
            Servers appear here after you dine with them and leave a verified rating.
          </p>
        </div>

        {/* ── Notification banner ─────────────────────────────────────── */}
        {!notificationDismissed && (
          <div className="mb-8 flex items-start justify-between gap-4 rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-sm">🔔</span>
              <div>
                <p className="text-sm font-medium text-white">
                  Marcus Johnson just moved to a new restaurant —{' '}
                  <span className="font-semibold">Carbone, West Village</span>
                </p>
                <a
                  href="/book"
                  className="mt-2 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-80"
                >
                  Reserve with Marcus
                </a>
              </div>
            </div>
            <button
              onClick={() => setNotificationDismissed(true)}
              className="shrink-0 text-sm transition-colors hover:text-white"
              style={{ color: '#606060' }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* ── Server cards ────────────────────────────────────────────── */}
        <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MY_SERVERS.map(server => (
            <div
              key={server.id}
              className="relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20"
            >
              {/* Following badge */}
              {server.following && (
                <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-black px-2.5 py-0.5 text-[10px] font-semibold text-white">
                  Following ✓
                </span>
              )}

              {/* Photo + name */}
              <div className="mb-5 flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/20">
                  <Image
                    src={server.photo}
                    alt={server.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 pr-16">
                  <p className="truncate text-base font-bold text-white">{server.name}</p>
                  <p className="truncate text-xs" style={{ color: '#A0A0A0' }}>
                    {server.restaurant} · {server.neighborhood}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="mb-5 flex flex-col gap-2.5 border-t border-white/10 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#A0A0A0' }}>Your rating</span>
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={server.myRating} />
                    <span className="text-xs font-medium text-white">{server.myRating}.0</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#A0A0A0' }}>Dined together</span>
                  <span className="text-xs font-medium text-white">
                    {server.diningCount} {server.diningCount === 1 ? 'time' : 'times'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#A0A0A0' }}>Last visited</span>
                  <span className="text-xs font-medium text-white">{server.lastVisited}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-auto flex flex-col gap-2">
                <a
                  href="/book"
                  className="block rounded-full bg-white py-2.5 text-center text-xs font-semibold text-black transition-opacity hover:opacity-80"
                >
                  Reserve with {server.firstName}
                </a>
                <a
                  href="/server/1"
                  className="block rounded-full border border-white/20 py-2.5 text-center text-xs font-medium text-white transition-colors hover:border-white"
                >
                  View Profile
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

        {/* ── Empty state prompt ──────────────────────────────────────── */}
        <div className="flex flex-col items-center py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/15">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" style={{ color: '#A0A0A0' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white">Dine at any Slate restaurant to add servers to your list</p>
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed" style={{ color: '#606060' }}>
            After your visit, leave a verified rating and the server is added here automatically.
          </p>
          <a
            href="/explore"
            className="mt-6 rounded-full border border-white/20 px-6 py-2.5 text-xs font-semibold text-white transition-colors hover:border-white"
          >
            Find a restaurant
          </a>
        </div>

      </main>
    </div>
  )
}
