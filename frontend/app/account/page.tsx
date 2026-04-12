'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

type AuthUser = {
  id: string
  email: string
  user_metadata: { full_name?: string }
  created_at: string
}

type FollowedServer = {
  id: string
  name: string
  role: string
  average_rating: number
  primary_restaurant: string | null
}

type RatingLeft = {
  id: string
  score: number
  comment: string | null
  restaurant_name: string | null
  created_at: string
  server_name: string | null
}

type VibeReport = {
  id: string
  venue_name: string
  vibe: string
  reported_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function Stars({ score }: { score: number }) {
  return (
    <span className="text-sm">
      {'★'.repeat(Math.round(score))}{'☆'.repeat(5 - Math.round(score))}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [following, setFollowing] = useState<FollowedServer[]>([])
  const [ratingsLeft, setRatingsLeft] = useState<RatingLeft[]>([])
  const [vibeReports, setVibeReports] = useState<VibeReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }
      setUser(authUser as AuthUser)

      // Ratings this guest has left (matched by user id or email)
      const [{ data: rats }, { data: vibes }] = await Promise.all([
        supabase
          .from('ratings')
          .select('id, score, comment, restaurant_name, created_at, server_name')
          .eq('guest_id', authUser.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('vibe_reports')
          .select('id, venue_name, vibe, reported_at')
          .eq('guest_id', authUser.id)
          .order('reported_at', { ascending: false }),
      ])

      if (rats) setRatingsLeft(rats as RatingLeft[])
      if (vibes) setVibeReports(vibes as VibeReport[])

      // Follows — join through follows table if it exists, else empty
      const { data: follows } = await supabase
        .from('follows')
        .select('server_id, servers(id, name, role, average_rating, server_restaurants(restaurant_name, is_primary))')
        .eq('guest_id', authUser.id)

      if (follows) {
        const mapped = follows.map((f: Record<string, unknown>) => {
          const srv = f.servers as Record<string, unknown> | null
          if (!srv) return null
          const rests = (srv.server_restaurants as { restaurant_name: string; is_primary: boolean }[]) ?? []
          const primary = rests.find(r => r.is_primary)?.restaurant_name ?? rests[0]?.restaurant_name ?? null
          return {
            id: srv.id as string,
            name: srv.name as string,
            role: srv.role as string,
            average_rating: (srv.average_rating as number) ?? 0,
            primary_restaurant: primary,
          }
        }).filter(Boolean) as FollowedServer[]
        setFollowing(mapped)
      }

      setLoading(false)
    }
    load()
  }, [router])

  const serveFromRatings = ratingsLeft.length * 10
  const serveFromVibes = vibeReports.length * 5
  const totalServe = serveFromRatings + serveFromVibes

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
        <Navbar />
        <div className="border-t border-white/10" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm" style={{ color: '#404040' }}>Loading your account…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const displayName = user.user_metadata?.full_name ?? user.email.split('@')[0]

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-3xl px-8 py-16 lg:px-16 lg:py-20">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-12">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl font-bold text-black">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <h1 className="mb-1 text-3xl font-bold tracking-tight text-white">{displayName}</h1>
          <p className="mb-1 text-sm" style={{ color: '#A0A0A0' }}>{user.email}</p>
          <p className="text-xs" style={{ color: '#606060' }}>
            Member since {formatDate(user.created_at)}
          </p>
          {totalServe > 0 && (
            <p className="mt-3 text-sm font-semibold text-white">{totalServe} $SERVE earned</p>
          )}
        </div>

        <div className="border-t border-white/10" />

        {/* ── Following ───────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
            Servers you follow
          </p>
          {following.length === 0 ? (
            <p className="text-sm leading-7" style={{ color: '#606060' }}>
              You&apos;re not following anyone yet.{' '}
              <a href="/live" className="text-white underline-offset-2 hover:underline">
                Discover servers at slatenow.xyz/live
              </a>
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-white/10">
              {following.map(s => (
                <a key={s.id} href={`/server/${s.id}`} className="flex items-center justify-between py-5 transition-opacity hover:opacity-70">
                  <div>
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    <p className="mt-0.5 text-xs" style={{ color: '#606060' }}>
                      {s.role}{s.primary_restaurant ? ` · ${s.primary_restaurant}` : ''}
                    </p>
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

        {/* ── Ratings left ────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
            Ratings you&apos;ve left
          </p>
          {ratingsLeft.length === 0 ? (
            <p className="text-sm leading-7" style={{ color: '#606060' }}>
              You haven&apos;t rated anyone yet. Scan a server&apos;s QR code after great service.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-white/10">
              {ratingsLeft.map(r => (
                <div key={r.id} className="py-6">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-sm font-semibold text-white">
                        {r.server_name ?? 'Server'}
                      </span>
                      {r.restaurant_name && (
                        <span className="ml-2 text-xs" style={{ color: '#606060' }}>
                          at {r.restaurant_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Stars score={r.score} />
                      <span className="text-xs" style={{ color: '#606060' }}>{formatDate(r.created_at)}</span>
                    </div>
                  </div>
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

        {/* ── $SERVE activity ─────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
            Your $SERVE activity
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-white">Ratings left</p>
                <p className="text-xs" style={{ color: '#606060' }}>10 $SERVE per verified rating</p>
              </div>
              <p className="text-sm font-bold text-white">+{serveFromRatings} $SERVE</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-white">Vibe reports</p>
                <p className="text-xs" style={{ color: '#606060' }}>5 $SERVE per vibe report</p>
              </div>
              <p className="text-sm font-bold text-white">+{serveFromVibes} $SERVE</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/25 px-4 py-4">
              <p className="text-sm font-semibold text-white">Total earned</p>
              <p className="text-base font-bold text-white">{totalServe} $SERVE</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
