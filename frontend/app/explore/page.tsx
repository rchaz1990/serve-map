'use client'

import { useEffect, useMemo, useState } from 'react'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

const FILTERS = ['All', 'Claimed', 'Top Rated Staff', 'NYC'] as const
type Filter = (typeof FILTERS)[number]

type ExploreVenue = {
  name: string
  /** Exact DB name — used in /restaurant/[id] so lookup never ghosts empty demo names. */
  href: string
  location: string
  staffRating: number | null
  servers: number
  claimed: boolean
  filters: Filter[]
}

function slugPathForName(name: string): string {
  // Prefer the canonical restaurant_name in the URL so Profile ilike matches
  // names with apostrophes (e.g. Sadie's) — kebab-only slugs break those.
  return `/restaurant/${encodeURIComponent(name)}`
}

function formatLocation(city: string | null, address: string | null): string {
  const raw = (city || address || '').trim()
  if (!raw) return 'New York'
  if (/\bNY\b|New York/i.test(raw)) return 'New York, NY'
  // "Neighborhood, City" → keep first two segments when present
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
  return raw
}

function aggregateVenues(
  rows: Array<{
    restaurant_name: string | null
    restaurant_address: string | null
    city: string | null
    servers: { average_rating: number | null } | { average_rating: number | null }[] | null
  }>,
  claimedNames: Set<string>,
): ExploreVenue[] {
  type Acc = {
    name: string
    city: string | null
    address: string | null
    ratings: number[]
    servers: number
  }
  const byName = new Map<string, Acc>()

  for (const row of rows) {
    const name = (row.restaurant_name || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    let acc = byName.get(key)
    if (!acc) {
      acc = { name, city: null, address: null, ratings: [], servers: 0 }
      byName.set(key, acc)
    }
    acc.servers += 1
    acc.city = row.city || acc.city
    acc.address = row.restaurant_address || acc.address
    const srv = Array.isArray(row.servers) ? row.servers[0] : row.servers
    if (srv?.average_rating != null && Number(srv.average_rating) > 0) {
      acc.ratings.push(Number(srv.average_rating))
    }
  }

  const venues: ExploreVenue[] = []
  for (const acc of byName.values()) {
    const staffRating =
      acc.ratings.length > 0
        ? Math.round((acc.ratings.reduce((a, b) => a + b, 0) / acc.ratings.length) * 10) / 10
        : null
    const claimed = claimedNames.has(acc.name.toLowerCase())
    const location = formatLocation(acc.city, acc.address)
    const filters: Filter[] = ['All']
    if (claimed) filters.push('Claimed')
    if (staffRating != null && staffRating >= 4) filters.push('Top Rated Staff')
    if (/new york|\bny\b|nyc/i.test(location) || /new york|\bny\b/i.test(acc.city || '') || /new york|\bny\b/i.test(acc.address || '')) {
      filters.push('NYC')
    }
    venues.push({
      name: acc.name,
      href: slugPathForName(acc.name),
      location,
      staffRating,
      servers: acc.servers,
      claimed,
      filters,
    })
  }

  return venues.sort((a, b) => {
    if (b.servers !== a.servers) return b.servers - a.servers
    return a.name.localeCompare(b.name)
  })
}

function filterVenues(venues: ExploreVenue[], query: string, active: Filter) {
  const q = query.trim().toLowerCase()
  return venues.filter((v) => {
    const matchesQuery =
      !q ||
      v.name.toLowerCase().includes(q) ||
      v.location.toLowerCase().includes(q)
    const matchesFilter = active === 'All' || v.filters.includes(active)
    return matchesQuery && matchesFilter
  })
}

export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [venues, setVenues] = useState<ExploreVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [srRes, mgrRes] = await Promise.all([
          supabase
            .from('server_restaurants')
            .select('restaurant_name, restaurant_address, city, servers(average_rating)'),
          supabase.from('restaurant_managers').select('restaurant_name'),
        ])

        if (cancelled) return

        if (srRes.error) {
          console.error('[explore] server_restaurants', srRes.error)
          setError('Could not load venues. Try again in a moment.')
          setVenues([])
          return
        }
        if (mgrRes.error) {
          console.error('[explore] restaurant_managers', mgrRes.error)
        }

        const claimed = new Set(
          (mgrRes.data ?? [])
            .map((m) => (m.restaurant_name || '').trim().toLowerCase())
            .filter(Boolean),
        )

        setVenues(
          aggregateVenues(
            (srRes.data ?? []) as Parameters<typeof aggregateVenues>[0],
            claimed,
          ),
        )
      } catch (err) {
        console.error('[explore] load failed', err)
        if (!cancelled) {
          setError('Could not load venues. Try again in a moment.')
          setVenues([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const results = useMemo(
    () => filterVenues(venues, query, activeFilter),
    [venues, query, activeFilter],
  )

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
            Real venues with Slate staff — not a demo catalog. Open a card to see who works there tonight.
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
              placeholder="Search restaurants or neighborhood..."
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
          {loading
            ? 'Loading venues…'
            : error
              ? error
              : results.length === venues.length
                ? `${results.length} venue${results.length !== 1 ? 's' : ''} with Slate staff`
                : `${results.length} result${results.length !== 1 ? 's' : ''}`}
        </p>

        {/* ── Restaurant grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(r => (
              <a
                key={r.name}
                href={r.href}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              >
                {/* Name + location */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
                      style={
                        r.claimed
                          ? { borderColor: 'rgba(255,255,255,0.3)', color: '#ffffff' }
                          : { borderColor: 'rgba(255,255,255,0.1)', color: '#606060' }
                      }
                    >
                      {r.claimed ? 'Claimed' : 'On Slate'}
                    </span>
                  </div>
                  <p className="text-base font-bold text-white">{r.name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: '#A0A0A0' }}>
                    {r.location}
                  </p>
                </div>

                {/* Staff rating */}
                {r.staffRating != null ? (
                  <div className="mb-3 flex items-center gap-2">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-white">
                      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-white">{r.staffRating.toFixed(1)}</span>
                    <span className="text-xs" style={{ color: '#606060' }}>staff rating</span>
                  </div>
                ) : (
                  <div className="mb-3">
                    <span className="text-xs" style={{ color: '#606060' }}>No staff ratings yet</span>
                  </div>
                )}

                {/* Verified stats */}
                <div className="mb-5 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-white/30" />
                    <span className="text-xs" style={{ color: '#A0A0A0' }}>
                      {r.servers} Slate server{r.servers !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-auto block rounded-full border border-white/20 py-2.5 text-center text-xs font-semibold text-white">
                  View restaurant →
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-medium text-white">
              {error ? 'Venues unavailable' : venues.length === 0 ? 'No venues on Slate yet' : 'No results found'}
            </p>
            <p className="mt-2 text-xs" style={{ color: '#606060' }}>
              {venues.length === 0
                ? 'When servers add a workplace, it will show up here.'
                : 'Try a different restaurant or clear filters.'}
            </p>
            {(query || activeFilter !== 'All') && (
              <button
                onClick={() => { setQuery(''); setActiveFilter('All') }}
                className="mt-6 rounded-full border border-white/20 px-6 py-2.5 text-xs font-medium text-white transition-colors hover:border-white"
              >
                Clear filters
              </button>
            )}
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
