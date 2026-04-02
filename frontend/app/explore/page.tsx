'use client'

import { useState } from 'react'
import Navbar from '@/app/components/Navbar'

const FILTERS = ['All', 'Fine Dining', 'Cocktail Bars', 'Casual Dining', 'Wine Bars', 'Top Rated Staff', 'NYC']

const RESTAURANTS = [
  {
    id: 1,
    name: 'Carbone',
    cuisine: 'Italian',
    neighborhood: 'West Village, NYC',
    staffRating: 4.9,
    reviews: 89,
    servers: 3,
    filters: ['Fine Dining', 'NYC', 'Top Rated Staff'],
  },
  {
    id: 2,
    name: 'Employees Only',
    cuisine: 'Cocktail Bar',
    neighborhood: 'West Village, NYC',
    staffRating: 4.8,
    reviews: 134,
    servers: 5,
    filters: ['Cocktail Bars', 'NYC'],
  },
  {
    id: 3,
    name: 'Le Bernardin',
    cuisine: 'French Fine Dining',
    neighborhood: 'Midtown, NYC',
    staffRating: 4.9,
    reviews: 201,
    servers: 6,
    filters: ['Fine Dining', 'NYC', 'Top Rated Staff'],
  },
  {
    id: 4,
    name: 'Nobu',
    cuisine: 'Japanese',
    neighborhood: 'Tribeca, NYC',
    staffRating: 4.7,
    reviews: 156,
    servers: 4,
    filters: ['Fine Dining', 'NYC'],
  },
  {
    id: 5,
    name: 'Gramercy Tavern',
    cuisine: 'American',
    neighborhood: 'Gramercy, NYC',
    staffRating: 4.9,
    reviews: 178,
    servers: 5,
    filters: ['Fine Dining', 'NYC', 'Top Rated Staff'],
  },
  {
    id: 6,
    name: 'The NoMad Bar',
    cuisine: 'Cocktail Bar',
    neighborhood: 'NoMad, NYC',
    staffRating: 4.8,
    reviews: 92,
    servers: 3,
    filters: ['Cocktail Bars', 'NYC'],
  },
]

function filterRestaurants(restaurants: typeof RESTAURANTS, query: string, active: string) {
  return restaurants.filter(r => {
    const matchesQuery =
      !query ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.cuisine.toLowerCase().includes(query.toLowerCase()) ||
      r.neighborhood.toLowerCase().includes(query.toLowerCase())

    const matchesFilter = active === 'All' || r.filters.includes(active)

    return matchesQuery && matchesFilter
  })
}

export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  const results = filterRestaurants(RESTAURANTS, query, activeFilter)

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
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Find your restaurant
          </h1>
          <p className="mb-6 max-w-xl text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
            Every restaurant on Slate has verified staff ratings. Book knowing your experience is backed by real reviews.
          </p>

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
              placeholder="Search restaurants, cuisine, or neighborhood..."
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
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={[
                  'shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
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
          {results.length === RESTAURANTS.length
            ? `${results.length} restaurants in New York`
            : `${results.length} result${results.length !== 1 ? 's' : ''}`}
        </p>

        {/* ── Restaurant grid ── */}
        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(r => (
              <div
                key={r.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              >
                {/* Name + cuisine */}
                <div className="mb-4">
                  <p className="text-base font-bold text-white">{r.name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: '#A0A0A0' }}>
                    {r.cuisine} · {r.neighborhood}
                  </p>
                </div>

                {/* Staff rating */}
                <div className="mb-3 flex items-center gap-2">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-white">
                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-white">{r.staffRating.toFixed(1)}</span>
                  <span className="text-xs" style={{ color: '#606060' }}>staff rating</span>
                </div>

                {/* Verified stats */}
                <div className="mb-5 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-white/30" />
                    <span className="text-xs" style={{ color: '#A0A0A0' }}>
                      {r.reviews} verified reviews
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-white/30" />
                    <span className="text-xs" style={{ color: '#A0A0A0' }}>
                      {r.servers} Slate verified servers
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <a
                  href="/book"
                  className="mt-auto block rounded-full border border-white/20 py-2.5 text-center text-xs font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-black"
                >
                  Reserve a table
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-medium text-white">No results found</p>
            <p className="mt-2 text-xs" style={{ color: '#606060' }}>
              Try a different restaurant, cuisine, or neighborhood.
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
            <p className="text-base font-semibold text-white">Are you a restaurant owner?</p>
            <p className="mt-1 text-sm" style={{ color: '#A0A0A0' }}>
              List your restaurant on Slate and let verified staff ratings drive reservations.
            </p>
          </div>
          <a
            href="/for-restaurants"
            className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
          >
            List your restaurant
          </a>
        </div>

      </main>
    </div>
  )
}
