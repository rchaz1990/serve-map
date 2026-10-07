'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { MotionSection } from '@/app/components/motion'
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

type VibeReport = {
  id: string
  restaurant_name: string
  vibe: string
  created_at: string
}

type RatingLeft = {
  id: string
  score: number
  comment: string | null
  restaurant_name: string | null
  created_at: string
  server_name: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const VIBE_LABEL: Record<string, string> = {
  CHILL: 'Chill',
  LIVE: 'Live',
  PACKED: 'Packed',
}

const VIBE_EMOJI: Record<string, string> = {
  CHILL: '🧊',
  LIVE: '🔥',
  PACKED: '🚀',
}

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
  const [vibeReports, setVibeReports] = useState<VibeReport[]>([])
  const [ratingsLeft, setRatingsLeft] = useState<RatingLeft[]>([])
  const [serveBalance, setServeBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }
      setUser(authUser as AuthUser)

      const [{ data: rats }, { data: vibes }, { data: rewards }] = await Promise.all([
        // ratings has no guest_name/server_name columns — join servers for display name
        supabase
          .from('ratings')
          // restaurant_name is never written to ratings; selecting it can fail the whole query
          .select('id, score, comment, created_at, server_id, servers(name)')
          .eq('guest_id', authUser.id)
          .order('created_at', { ascending: false }),
        // Own vibe reports. Reporter emails are not publicly readable, so the
        // database matches them to the signed-in user's email.
        supabase.rpc('my_vibe_reports'),
        supabase
          .from('guest_rewards')
          .select('slate_points')
          .eq('email', authUser.email)
          .maybeSingle(),
      ])

      if (rewards?.slate_points != null) setServeBalance(rewards.slate_points)

      if (rats) {
        const mappedRats = (rats as Array<Record<string, unknown>>).map((r) => {
          const srv = r.servers as { name?: string } | null
          return {
            id: r.id as string,
            score: r.score as number,
            comment: (r.comment as string | null) ?? null,
            restaurant_name: null,
            created_at: r.created_at as string,
            server_name: srv?.name ?? null,
          }
        })
        setRatingsLeft(mappedRats)
      }
      if (vibes) setVibeReports(vibes as VibeReport[])

      // Follows — filter by follower_id (not guest_id); embed servers + server_restaurants
      const { data: follows } = await supabase
        .from('follows')
        .select('server_id, servers(id, name, role, average_rating, server_restaurants(restaurant_name, is_primary))')
        .eq('follower_id', authUser.id)

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

  if (loading) {
    return (
      <div className="slate-page">
        <Navbar />
        <div className="slate-rule" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="slate-eyebrow">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const displayName = user.user_metadata?.full_name ?? user.email.split('@')[0]

  return (
    <div className="slate-page">
      <Navbar />
      <div className="slate-rule" />

      <main className="slate-main mx-auto max-w-3xl px-8 py-16 lg:px-16 lg:py-20">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <MotionSection as="div" immediate className="mb-12">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-bold text-black">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <span className="slate-pill">Guest</span>
          </div>
          <h1 className="slate-title mb-2 text-3xl">{displayName}</h1>
          <p className="mb-1 text-sm slate-secondary">{user.email}</p>
          <p className="mb-4 text-xs slate-muted">
            Since {formatDate(user.created_at)}
          </p>
          {serveBalance > 0 && (
            <p className="text-sm font-semibold text-white">
              {serveBalance} <span className="font-normal slate-muted">Slate Points</span>
            </p>
          )}
        </MotionSection>

        <div className="slate-rule" />

        {/* ── Section 1: Servers you follow ───────────────────────────────── */}
        <MotionSection className="py-12">
          <p className="slate-eyebrow mb-6">Following</p>
          {following.length === 0 ? (
            <div>
              <p className="mb-5 text-sm leading-7 slate-muted">
                No one yet. Find talent on What&apos;s Live.
              </p>
              <a href="/live" className="slate-btn slate-btn-ghost">
                What&apos;s Live
              </a>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-white/10">
              {following.map(s => (
                <div key={s.id} className="flex items-center justify-between py-5">
                  <div>
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    <p className="mt-0.5 text-xs" style={{ color: '#606060' }}>
                      {s.role}{s.primary_restaurant ? ` · ${s.primary_restaurant}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {s.average_rating > 0 && (
                      <span className="text-sm font-semibold text-white">{s.average_rating.toFixed(1)} ★</span>
                    )}
                    <a
                      href={`/server/${s.id}`}
                      className="text-xs font-semibold text-white transition-opacity hover:opacity-60"
                    >
                      View profile →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MotionSection>

        <div className="slate-rule" />

        {/* ── Section 2: Venues you've vibed ──────────────────────────────── */}
        <MotionSection className="py-12">
          <p className="slate-eyebrow mb-6">Vibes</p>
          {vibeReports.length === 0 ? (
            <div>
              <p className="mb-5 text-sm leading-7 slate-muted">
                No vibes reported yet.
              </p>
              <a href="/live" className="slate-btn slate-btn-ghost">
                Report a vibe
              </a>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-white/10">
              {vibeReports.map(v => (
                <div key={v.id} className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{v.restaurant_name}</p>
                    <p className="mt-0.5 text-xs" style={{ color: '#606060' }}>
                      {VIBE_EMOJI[v.vibe]} {VIBE_LABEL[v.vibe] ?? v.vibe} · {formatDate(v.created_at)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: '#A0A0A0' }}>+5 $SERVE</span>
                </div>
              ))}
            </div>
          )}
        </MotionSection>

        <div className="slate-rule" />

        {/* ── Section 3: Ratings you've left ──────────────────────────────── */}
        <MotionSection className="py-12">
          <p className="slate-eyebrow mb-6">Ratings</p>
          {ratingsLeft.length === 0 ? (
            <p className="text-sm leading-7 slate-muted">
              No ratings yet. Scan a QR after great service.
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
        </MotionSection>

        <div className="slate-rule" />

        {/* ── Section 4: Slate Points activity ─────────────────────────────── */}
        <MotionSection className="py-12">
          <p className="slate-eyebrow mb-6">Slate Points</p>
          <div className="flex flex-col gap-3">
            <div className="slate-card flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-medium text-white">Ratings</p>
                <p className="text-xs slate-muted">10 pts each</p>
              </div>
              <p className="text-sm font-bold text-white">+{ratingsLeft.length * 10}</p>
            </div>
            <div className="slate-card flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-medium text-white">Vibes</p>
                <p className="text-xs slate-muted">1–5 pts each</p>
              </div>
              <p className="text-sm font-bold text-white">+{vibeReports.length > 0 ? `~${vibeReports.length * 3}` : 0}</p>
            </div>
            <div className="slate-card flex items-center justify-between px-4 py-4" style={{ borderColor: 'var(--slate-border-strong)' }}>
              <p className="text-sm font-semibold text-white">Total</p>
              <p className="text-base font-bold text-white">{serveBalance}</p>
            </div>
          </div>
        </MotionSection>

        <div className="slate-rule" />
        <div className="py-8">
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-xs font-medium slate-muted transition-colors hover:text-white"
          >
            Sign out
          </button>
        </div>

      </main>
    </div>
  )
}
