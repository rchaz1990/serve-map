'use client'

import { useState } from 'react'
import Image from 'next/image'
import Navbar from '@/app/components/Navbar'

const FILTERS = ['All', 'Bartenders', 'Servers', 'Fine Dining', 'Craft Cocktails', 'Wine', 'Top Rated']

const SERVERS = [
  {
    id: 1,
    name: 'Marcus Johnson',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    restaurant: 'Carbone',
    city: 'New York, NY',
    rating: 4.9,
    ratingCount: 214,
    specialty: 'Craft Cocktails',
    filters: ['Servers', 'Craft Cocktails', 'Top Rated'],
  },
  {
    id: 2,
    name: 'Sofia Rivera',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    restaurant: 'Le Bernardin',
    city: 'New York, NY',
    rating: 4.8,
    ratingCount: 189,
    specialty: 'Fine Dining & Wine',
    filters: ['Servers', 'Fine Dining', 'Wine'],
  },
  {
    id: 3,
    name: 'James Chen',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
    restaurant: 'Employees Only',
    city: 'New York, NY',
    rating: 4.9,
    ratingCount: 301,
    specialty: 'Mixology',
    filters: ['Bartenders', 'Craft Cocktails', 'Top Rated'],
  },
  {
    id: 4,
    name: 'Aisha Williams',
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80',
    restaurant: 'Nobu',
    city: 'New York, NY',
    rating: 4.7,
    ratingCount: 143,
    specialty: 'Sake & Japanese Cuisine',
    filters: ['Servers', 'Fine Dining'],
  },
  {
    id: 5,
    name: 'Tyler Brooks',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    restaurant: 'The NoMad Bar',
    city: 'New York, NY',
    rating: 4.8,
    ratingCount: 167,
    specialty: 'Classic Cocktails',
    filters: ['Bartenders'],
  },
  {
    id: 6,
    name: 'Maria Santos',
    photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80',
    restaurant: 'Gramercy Tavern',
    city: 'New York, NY',
    rating: 4.9,
    ratingCount: 258,
    specialty: 'Wine & Fine Dining',
    filters: ['Servers', 'Fine Dining', 'Wine', 'Top Rated'],
  },
]

function filterServers(servers: typeof SERVERS, query: string, active: string) {
  return servers.filter(s => {
    const matchesQuery =
      !query ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.restaurant.toLowerCase().includes(query.toLowerCase()) ||
      s.specialty.toLowerCase().includes(query.toLowerCase())

    const matchesFilter = active === 'All' || s.filters.includes(active)

    return matchesQuery && matchesFilter
  })
}

export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  const results = filterServers(SERVERS, query, activeFilter)

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-5xl px-8 py-16 lg:px-16">

        {/* ── Header ── */}
        <div className="mb-10">
          <h1 className="mb-6 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Find your server
          </h1>

          {/* Search bar */}
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: '#606060' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, restaurant, or specialty..."
              className="w-full rounded-xl border border-white/15 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/40"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-60"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" style={{ color: '#606060' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={[
                  'rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
                  activeFilter === f
                    ? 'border-white bg-white text-black'
                    : 'border-white/20 text-white hover:border-white/50',
                ].join(' ')}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── Results count ── */}
        <p className="mb-6 text-xs" style={{ color: '#606060' }}>
          {results.length === SERVERS.length
            ? `${results.length} servers in New York`
            : `${results.length} result${results.length !== 1 ? 's' : ''}`}
        </p>

        {/* ── Server grid ── */}
        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(server => (
              <div
                key={server.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              >
                {/* Avatar + name row */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/20">
                    <Image src={server.photo} alt={server.name} fill className="object-cover" sizes="44px" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{server.name}</p>
                    <p className="truncate text-xs" style={{ color: '#A0A0A0' }}>
                      {server.restaurant} · {server.city}
                    </p>
                  </div>
                </div>

                {/* Rating */}
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-white">
                      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-white">{server.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-xs" style={{ color: '#606060' }}>
                    {server.ratingCount} ratings
                  </span>
                </div>

                {/* Specialty tag */}
                <div className="mb-5">
                  <span className="inline-block rounded-full border border-white/15 px-3 py-1 text-xs" style={{ color: '#A0A0A0' }}>
                    {server.specialty}
                  </span>
                </div>

                {/* CTA */}
                <a
                  href="/server/1"
                  className="mt-auto block rounded-full border border-white/20 py-2.5 text-center text-xs font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-black"
                >
                  View Profile
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-medium text-white">No results found</p>
            <p className="mt-2 text-xs" style={{ color: '#606060' }}>
              Try a different name, restaurant, or specialty.
            </p>
            <button
              onClick={() => { setQuery(''); setActiveFilter('All') }}
              className="mt-6 rounded-full border border-white/20 px-6 py-2.5 text-xs font-medium text-white transition-colors hover:border-white"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── Bottom banner ── */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 px-8 py-8 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-base font-semibold text-white">Are you a server or bartender?</p>
            <p className="mt-1 text-sm" style={{ color: '#A0A0A0' }}>
              Build a portable reputation that follows you from job to job.
            </p>
          </div>
          <a
            href="/servers/signup"
            className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
          >
            Claim your free profile
          </a>
        </div>

      </main>
    </div>
  )
}
