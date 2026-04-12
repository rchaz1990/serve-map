'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

type VibeReport = {
  id: string
  venue_name: string
  vibe: string
  bar_seats: string | null
  wait_time: string | null
  reported_at: string
}

type StaffMember = {
  server_id: string
  restaurant_name: string
  is_primary: boolean
  currently_working: boolean
  server_name: string
  server_role: string
  average_rating: number
  follower_count: number
}

type Rating = {
  id: string
  score: number
  comment: string | null
  created_at: string
  guest_name: string | null
  server_name: string | null
}

type ClaimStatus = 'ghost' | 'claimed' | 'verified'

// ── Helpers ────────────────────────────────────────────────────────────────────

const VIBE_EMOJI: Record<string, string> = {
  CHILL: '🧊',
  LIVE: '🔥',
  PACKED: '🚀',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return formatDate(iso)
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function Stars({ score }: { score: number }) {
  return (
    <span className="text-sm">
      {'★'.repeat(Math.round(score))}{'☆'.repeat(5 - Math.round(score))}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RestaurantProfilePage() {
  const { id } = useParams<{ id: string }>()
  const restaurantName = decodeURIComponent(id ?? '')

  const router = useRouter()
  const [vibeReports, setVibeReports] = useState<VibeReport[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('ghost')
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    if (!restaurantName) return
    async function load() {
      setLoading(true)

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [
        { data: vibes },
        { data: serverRests },
        { data: rats },
        { data: waitlistRow },
      ] = await Promise.all([
        // Vibe reports for this venue (last 48h, ordered newest first)
        supabase
          .from('vibe_reports')
          .select('id, venue_name, vibe, bar_seats, wait_time, reported_at')
          .ilike('venue_name', restaurantName)
          .gte('reported_at', new Date(Date.now() - 48 * 3_600_000).toISOString())
          .order('reported_at', { ascending: false }),

        // Staff linked to this restaurant via server_restaurants → servers
        supabase
          .from('server_restaurants')
          .select('server_id, restaurant_name, is_primary, currently_working, servers(name, role, average_rating, follower_count)')
          .ilike('restaurant_name', restaurantName),

        // Ratings at this restaurant (most recent 10)
        supabase
          .from('ratings')
          .select('id, score, comment, created_at, guest_name, server_name')
          .ilike('restaurant_name', restaurantName)
          .order('created_at', { ascending: false })
          .limit(10),

        // Claim status
        supabase
          .from('restaurant_waitlist')
          .select('id')
          .ilike('restaurant_name', restaurantName)
          .limit(1),
      ])

      if (vibes) setVibeReports(vibes as VibeReport[])

      if (serverRests) {
        const mapped = serverRests.map((sr: Record<string, unknown>) => {
          const srv = sr.servers as Record<string, unknown> | null
          return {
            server_id: sr.server_id as string,
            restaurant_name: sr.restaurant_name as string,
            is_primary: sr.is_primary as boolean,
            currently_working: sr.currently_working as boolean,
            server_name: (srv?.name as string) ?? 'Unknown',
            server_role: (srv?.role as string) ?? '',
            average_rating: (srv?.average_rating as number) ?? 0,
            follower_count: (srv?.follower_count as number) ?? 0,
          }
        })
        setStaff(mapped)
      }

      if (rats) setRatings(rats as Rating[])

      if (waitlistRow && waitlistRow.length > 0) {
        setClaimStatus('claimed')
      }

      setLoading(false)
    }
    load()
  }, [restaurantName])

  // Check auth (page is public; only vibe submit requires login)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
        <Navbar />
        <div className="border-t border-white/10" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm" style={{ color: '#404040' }}>Loading venue…</p>
        </div>
      </div>
    )
  }

  if (!restaurantName) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
        <Navbar />
        <div className="border-t border-white/10" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm" style={{ color: '#606060' }}>Venue not found.</p>
        </div>
      </div>
    )
  }

  // Derived values
  const latestVibe = vibeReports[0] ?? null
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayCount = vibeReports.filter(v => new Date(v.reported_at) >= todayStart).length

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-3xl px-8 py-16 lg:px-16 lg:py-20">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-12">
          {/* Claim badge */}
          <div className="mb-5 flex items-center gap-3">
            <span
              className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
              style={
                claimStatus === 'claimed'
                  ? { borderColor: 'rgba(255,255,255,0.3)', color: '#ffffff' }
                  : { borderColor: 'rgba(255,255,255,0.1)', color: '#606060' }
              }
            >
              {claimStatus === 'ghost' ? 'Ghost listing' : claimStatus === 'claimed' ? 'Claimed' : 'Verified Partner'}
            </span>
            {latestVibe && (
              <span className="text-[10px] font-medium" style={{ color: '#404040' }}>
                Last report {timeAgo(latestVibe.reported_at)}
              </span>
            )}
          </div>

          {/* Name */}
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {restaurantName}
          </h1>

          {/* Current vibe */}
          {latestVibe ? (
            <div className="mt-4 flex items-center gap-3">
              <span style={{ fontSize: 32 }}>{VIBE_EMOJI[latestVibe.vibe] ?? '📍'}</span>
              <div>
                <p className="text-sm font-semibold text-white capitalize">{latestVibe.vibe.toLowerCase()} right now</p>
                <p className="text-xs" style={{ color: '#606060' }}>
                  {todayCount} {todayCount === 1 ? 'report' : 'reports'} today
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm" style={{ color: '#606060' }}>
              No vibe reports yet tonight.
            </p>
          )}
        </div>

        <div className="border-t border-white/10" />

        {/* ── Current vibe details ─────────────────────────────────────────── */}
        {latestVibe && (
          <>
            <section className="py-12">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
                Right now
              </p>

              <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {latestVibe.bar_seats && (
                  <div className="rounded-xl border border-white/10 px-4 py-5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#404040' }}>
                      Bar seats
                    </p>
                    <p className="text-sm font-semibold text-white capitalize">{latestVibe.bar_seats}</p>
                  </div>
                )}
                {latestVibe.wait_time && (
                  <div className="rounded-xl border border-white/10 px-4 py-5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#404040' }}>
                      Wait time
                    </p>
                    <p className="text-sm font-semibold text-white">{latestVibe.wait_time}</p>
                  </div>
                )}
                <div className="rounded-xl border border-white/10 px-4 py-5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#404040' }}>
                    Reports today
                  </p>
                  <p className="text-sm font-semibold text-white">{todayCount}</p>
                </div>
              </div>

              <button
                onClick={() => loggedIn ? router.push('/live') : router.push('/login?message=' + encodeURIComponent('Sign in to report the vibe'))}
                className="rounded-full border border-white/25 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white"
              >
                I&apos;m here — report the vibe →
              </button>
            </section>

            <div className="border-t border-white/10" />
          </>
        )}

        {/* ── Staff ───────────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
            Staff on Slate
          </p>

          {staff.length === 0 ? (
            <p className="text-sm leading-7" style={{ color: '#606060' }}>
              No servers have listed this venue yet.{' '}
              <a href="/servers/signup" className="text-white underline-offset-2 hover:underline">
                Work here? Join Slate.
              </a>
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-white/10">
              {staff.map(s => (
                <a
                  key={s.server_id}
                  href={`/server/${s.server_id}`}
                  className="flex items-center justify-between py-5 transition-opacity hover:opacity-70"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
                      {initials(s.server_name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{s.server_name}</p>
                        {s.currently_working && (
                          <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white">
                            Here now
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs" style={{ color: '#606060' }}>
                        {s.server_role}
                        {s.follower_count > 0 ? ` · ${s.follower_count} ${s.follower_count === 1 ? 'follower' : 'followers'}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {s.average_rating > 0 && (
                      <p className="text-sm font-semibold text-white">{s.average_rating.toFixed(1)} ★</p>
                    )}
                    <p className="text-xs" style={{ color: '#404040' }}>View profile →</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-white/10" />

        {/* ── Recent ratings ───────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
            Guest ratings
          </p>

          {ratings.length === 0 ? (
            <p className="text-sm leading-7" style={{ color: '#606060' }}>
              No ratings yet at this venue.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-white/10">
              {ratings.map(r => (
                <div key={r.id} className="py-6">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">
                        {r.guest_name ?? 'Guest'}
                      </span>
                      <Stars score={r.score} />
                    </div>
                    <span className="shrink-0 text-xs" style={{ color: '#606060' }}>
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                  {r.server_name && (
                    <p className="mb-1 text-xs" style={{ color: '#404040' }}>
                      for {r.server_name}
                    </p>
                  )}
                  {r.comment && (
                    <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-white/10" />

        {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
        <section className="py-12">
          {claimStatus === 'ghost' ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Own or manage {restaurantName}?</p>
              <p className="mb-6 text-sm leading-7" style={{ color: '#606060' }}>
                Claim this listing for free to see what guests are saying and connect with your team on Slate.
              </p>
              <a
                href="/waitlist"
                className="inline-block rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
              >
                Claim this venue →
              </a>
            </div>
          ) : claimStatus === 'claimed' ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Want more from Slate?</p>
              <p className="mb-6 text-sm leading-7" style={{ color: '#606060' }}>
                Upgrade to a Verified Partner to unlock staff analytics, shift visibility, and guest insights.
              </p>
              <a
                href="/for-restaurants"
                className="inline-block rounded-full border border-white/25 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white"
              >
                See partner plans →
              </a>
            </div>
          ) : (
            <div>
              <p className="mb-6 text-sm font-semibold text-white">Manage your Slate venue dashboard.</p>
              <a
                href="/dashboard"
                className="inline-block rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
              >
                Go to dashboard →
              </a>
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
