'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

type ServerRow = {
  id: string
  name: string
  email: string
  role: string
  wallet_address: string | null
  average_rating: number
  total_ratings: number
  follower_count: number
  is_founding_member: boolean
  created_at: string
  server_restaurants: RestaurantRow[]
  ratings: RatingRow[]
}

type RestaurantRow = {
  id: string
  restaurant_name: string
  restaurant_address: string | null
  city: string | null
  is_primary: boolean
  currently_working: boolean
}

type RatingRow = {
  id: string
  score: number
  comment: string | null
  restaurant_name: string | null
  created_at: string
  guest_name: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Stars({ score }: { score: number }) {
  const full = Math.round(score)
  return (
    <span className="text-sm">
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ServerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [server, setServer] = useState<ServerRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [guestId, setGuestId] = useState<string | null>(null)

  const profileUrl = typeof window !== 'undefined'
    ? window.location.href
    : `slatenow.xyz/server/${id}`

  // Load profile data — single nested query (no auth required)
  useEffect(() => {
    if (!id) return
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('servers')
        .select(`
          *,
          server_restaurants (
            id,
            restaurant_name,
            restaurant_address,
            city,
            is_primary,
            currently_working
          ),
          ratings (
            id,
            score,
            comment,
            restaurant_name,
            created_at,
            guest_name
          )
        `)
        .eq('id', id)
        .single()

      if (data) {
        // Sort restaurants: primary first; sort ratings: newest first
        const sorted = {
          ...data,
          server_restaurants: [...(data.server_restaurants ?? [])].sort(
            (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)
          ),
          ratings: [...(data.ratings ?? [])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
        }
        setServer(sorted as ServerRow)
      }
      setLoading(false)
    }
    load()
  }, [id])

  // Check auth + existing follow state
  useEffect(() => {
    if (!id) return
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setGuestId(session.user.id)
      const { data } = await supabase
        .from('follows')
        .select('server_id')
        .eq('guest_id', session.user.id)
        .eq('server_id', id)
        .limit(1)
        .single()
      if (data) setFollowing(true)
    })
  }, [id])

  async function handleFollow() {
    if (!guestId) {
      router.push(`/login?message=${encodeURIComponent('Sign in to follow this server')}`)
      return
    }
    setFollowLoading(true)
    if (following) {
      await supabase.from('follows').delete().eq('guest_id', guestId).eq('server_id', id)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ guest_id: guestId, server_id: id })
      setFollowing(true)
    }
    setFollowLoading(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(profileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
        <Navbar />
        <div className="border-t border-white/10" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm" style={{ color: '#404040' }}>Loading profile…</p>
        </div>
      </div>
    )
  }

  if (!server) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
        <Navbar />
        <div className="border-t border-white/10" />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-8 text-center">
          <p className="text-sm" style={{ color: '#606060' }}>This profile doesn&apos;t exist yet.</p>
          <a
            href="/live"
            className="rounded-full border border-white/25 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white"
          >
            Discover servers on Slate →
          </a>
        </div>
      </div>
    )
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const restaurants = server.server_restaurants ?? []
  const ratings = server.ratings ?? []
  const primaryRestaurant = restaurants.find(r => r.is_primary) ?? restaurants[0]

  // Calculate avg rating from actual ratings array (more accurate than stored field)
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    : server.average_rating

  const totalRatings = ratings.length || server.total_ratings
  const serveBalance = totalRatings * 10  // servers earn $SERVE when guests rate them

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-3xl px-8 py-16 lg:px-16 lg:py-20">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-12">
          {/* Avatar + founding badge */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-bold text-black">
              {initials(server.name)}
            </div>
            {server.is_founding_member && (
              <span className="rounded-full border border-white/20 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
                Founding Member
              </span>
            )}
          </div>

          {/* Name */}
          <h1 className="mb-1 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {server.name}
          </h1>

          {/* Role + restaurant */}
          <p className="mb-5 text-base" style={{ color: '#A0A0A0' }}>
            {server.role}
            {primaryRestaurant && <> · {primaryRestaurant.restaurant_name}</>}
          </p>

          {/* Stats row */}
          <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-2">
            {avgRating > 0 && (
              <span className="text-lg font-bold text-white">{avgRating.toFixed(1)} ★</span>
            )}
            <span className="text-sm" style={{ color: '#A0A0A0' }}>
              {totalRatings} verified {totalRatings === 1 ? 'rating' : 'ratings'}
            </span>
            <span style={{ color: '#404040' }}>·</span>
            <span className="text-sm" style={{ color: '#A0A0A0' }}>
              {server.follower_count} {server.follower_count === 1 ? 'follower' : 'followers'}
            </span>
          </div>

          {/* $SERVE balance */}
          {serveBalance > 0 && (
            <p className="mb-5 text-sm font-semibold text-white">{serveBalance} $SERVE earned</p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={[
                'rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50',
                following
                  ? 'border-white/30 text-white/60 hover:border-white/50'
                  : 'border-white text-white hover:bg-white hover:text-black',
              ].join(' ')}
            >
              {following ? 'Following ✓' : 'Follow'}
            </button>
            <button
              onClick={handleCopy}
              className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:border-white"
            >
              {copied ? 'Link copied!' : 'Copy profile link'}
            </button>
          </div>
        </div>

        <div className="border-t border-white/10" />

        {/* ── Where you'll find me ─────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
            Where you&apos;ll find me
          </p>

          {restaurants.length === 0 ? (
            <p className="text-sm" style={{ color: '#606060' }}>No restaurants listed yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-white/10">
              {restaurants.map(r => (
                <div key={r.id} className="flex items-center justify-between py-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{r.restaurant_name}</p>
                      {r.is_primary && (
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#606060' }}>
                          Primary
                        </span>
                      )}
                      {r.currently_working && (
                        <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white">
                          Currently here
                        </span>
                      )}
                    </div>
                    {(r.city || r.restaurant_address) && (
                      <p className="mt-0.5 text-xs" style={{ color: '#606060' }}>
                        {r.city ?? r.restaurant_address}
                      </p>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#404040' }}>{server.role}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-white/10" />

        {/* ── Ratings ─────────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
            What guests are saying
          </p>

          {ratings.length === 0 ? (
            <p className="text-sm leading-7" style={{ color: '#606060' }}>
              No ratings yet. Share your profile link with guests to start building your reputation.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-white/10">
              {ratings.map(r => (
                <div key={r.id} className="py-8">
                  <div className="mb-3 flex items-center justify-between gap-4">
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
                  {r.comment && (
                    <p className="mb-2 max-w-2xl text-sm leading-7" style={{ color: '#A0A0A0' }}>
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                  {r.restaurant_name && (
                    <p className="text-xs" style={{ color: '#404040' }}>at {r.restaurant_name}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-white/10" />

        {/* ── Share your profile ───────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
            Share your profile
          </p>
          <p className="mb-5 text-sm leading-7" style={{ color: '#606060' }}>
            Share this link with guests so they can rate you and follow you.
          </p>
          <div className="flex items-center gap-3 rounded-xl border border-white/15 px-4 py-3">
            <span className="flex-1 truncate font-mono text-sm" style={{ color: '#A0A0A0' }}>
              {profileUrl}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 text-xs font-semibold text-white transition-opacity hover:opacity-70"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>

      </main>
    </div>
  )
}
