'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

type StaffMember = {
  server_id: string
  name: string
  role: string | null
  photo_url: string | null
  average_rating: number
  total_ratings: number
  follower_count: number
  is_on_shift: boolean
}

type RatingRow = {
  id: string
  score: number
  server_id: string
  created_at: string
  comment: string | null
  guest_name: string | null
}

type VibeRow = {
  id: string
  vibe: string | null
  created_at: string
}

type CommentRow = {
  id: string
  comment: string
  commenter_name: string | null
  created_at: string
}

type Trending = 'up' | 'down' | 'flat' | null

type LeaderboardSort = 'rating' | 'followers' | 'ratings_count'

type Analytics = {
  totalRatingsThisMonth: number
  avgStaffRating: number
  totalFollowers: number
  vibesThisMonth: number
  monthlyRatings: RatingRow[]
  last30dVibes: VibeRow[]
  comments: CommentRow[]
  trendingByServerId: Record<string, Trending>
}

const REFRESH_MS = 5 * 60 * 1000
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const VIBE_KEYS = ['PACKED', 'LIVE', 'CHILL'] as const
const VIBE_LABEL: Record<string, string> = { PACKED: 'Packed', LIVE: 'Live', CHILL: 'Chill' }

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function startOfMonth(d = new Date()) {
  const r = new Date(d)
  r.setDate(1); r.setHours(0, 0, 0, 0)
  return r
}

function startOfLastMonth() {
  const r = startOfMonth()
  r.setMonth(r.getMonth() - 1)
  return r
}

// ── Toggle (large, iPad-friendly) ──────────────────────────────────────────────

function ShiftToggle({
  on,
  busy,
  onChange,
}: {
  on: boolean
  busy: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={() => onChange(!on)}
      className="relative h-12 w-24 shrink-0 rounded-full border transition-colors disabled:opacity-50"
      style={{
        backgroundColor: on ? '#22c55e' : 'rgba(255,255,255,0.08)',
        borderColor: on ? '#22c55e' : 'rgba(255,255,255,0.2)',
      }}
    >
      <span
        className="absolute top-1 h-10 w-10 rounded-full bg-white shadow-md transition-transform"
        style={{ transform: on ? 'translateX(48px)' : 'translateX(4px)' }}
      />
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RestaurantManagerDashboard() {
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [managerName, setManagerName] = useState<string>('')
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [busyServerId, setBusyServerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSort>('rating')

  const loadAnalytics = useCallback(async (rName: string, current: StaffMember[]) => {
    const ids = current.map(s => s.server_id)
    const monthStart = startOfMonth().toISOString()
    const lastMonthStart = startOfLastMonth().toISOString()
    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()

    if (ids.length === 0) {
      // No staff yet — still pull venue-level data
      const [vibeCountRes, last30dVibesRes, commentsRes] = await Promise.all([
        supabase.from('vibe_reports').select('id', { count: 'exact', head: true }).eq('restaurant_name', rName).gte('created_at', monthStart),
        supabase.from('vibe_reports').select('id, vibe, created_at').eq('restaurant_name', rName).gte('created_at', since30d),
        supabase.from('venue_comments').select('id, comment, commenter_name, created_at').eq('restaurant_name', rName).order('created_at', { ascending: false }).limit(10),
      ])
      setAnalytics({
        totalRatingsThisMonth: 0,
        avgStaffRating: 0,
        totalFollowers: 0,
        vibesThisMonth: vibeCountRes.count ?? 0,
        monthlyRatings: [],
        last30dVibes: (last30dVibesRes.data ?? []) as VibeRow[],
        comments: (commentsRes.data ?? []) as CommentRow[],
        trendingByServerId: {},
      })
      return
    }

    const [
      monthlyRatingsRes,
      allScoresRes,
      vibeCountRes,
      last30dVibesRes,
      commentsRes,
    ] = await Promise.all([
      supabase
        .from('ratings')
        .select('id, score, server_id, created_at, comment, guest_name')
        .in('server_id', ids)
        .gte('created_at', lastMonthStart)
        .order('created_at', { ascending: false }),
      supabase
        .from('ratings')
        .select('score')
        .in('server_id', ids),
      supabase
        .from('vibe_reports')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_name', rName)
        .gte('created_at', monthStart),
      supabase
        .from('vibe_reports')
        .select('id, vibe, created_at')
        .eq('restaurant_name', rName)
        .gte('created_at', since30d),
      supabase
        .from('venue_comments')
        .select('id, comment, commenter_name, created_at')
        .eq('restaurant_name', rName)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const monthlyRatings = (monthlyRatingsRes.data ?? []) as RatingRow[]
    const allScores = (allScoresRes.data ?? []) as { score: number }[]

    const totalRatingsThisMonth = monthlyRatings.filter(r => r.created_at >= monthStart).length
    const avgStaffRating = allScores.length === 0
      ? 0
      : allScores.reduce((sum, r) => sum + (r.score ?? 0), 0) / allScores.length
    const totalFollowers = current.reduce((sum, s) => sum + s.follower_count, 0)

    // Trending: per-server avg this month vs last month
    const thisMonthByServer: Record<string, { sum: number; n: number }> = {}
    const lastMonthByServer: Record<string, { sum: number; n: number }> = {}
    for (const r of monthlyRatings) {
      const bucket = r.created_at >= monthStart ? thisMonthByServer : lastMonthByServer
      const cur = bucket[r.server_id] ?? { sum: 0, n: 0 }
      cur.sum += r.score
      cur.n += 1
      bucket[r.server_id] = cur
    }
    const trendingByServerId: Record<string, Trending> = {}
    for (const s of current) {
      const tm = thisMonthByServer[s.server_id]
      const lm = lastMonthByServer[s.server_id]
      if (tm && lm) {
        const delta = tm.sum / tm.n - lm.sum / lm.n
        trendingByServerId[s.server_id] = delta > 0.1 ? 'up' : delta < -0.1 ? 'down' : 'flat'
      } else if (tm && !lm) {
        trendingByServerId[s.server_id] = 'up'
      } else if (!tm && lm) {
        trendingByServerId[s.server_id] = 'down'
      } else {
        trendingByServerId[s.server_id] = null
      }
    }

    setAnalytics({
      totalRatingsThisMonth,
      avgStaffRating,
      totalFollowers,
      vibesThisMonth: vibeCountRes.count ?? 0,
      monthlyRatings,
      last30dVibes: (last30dVibesRes.data ?? []) as VibeRow[],
      comments: (commentsRes.data ?? []) as CommentRow[],
      trendingByServerId,
    })
  }, [])

  const loadData = useCallback(async (rName?: string) => {
    const targetName = rName ?? restaurantName
    if (!targetName) return

    const [staffRes, shiftsRes] = await Promise.all([
      supabase
        .from('server_restaurants')
        .select('server_id, servers(id, name, role, photo_url, average_rating, total_ratings, follower_count)')
        .eq('restaurant_name', targetName),
      supabase
        .from('shifts')
        .select('server_id, is_active')
        .eq('restaurant_name', targetName)
        .eq('is_active', true),
    ])

    const activeServerIds = new Set((shiftsRes.data ?? []).map(s => s.server_id))

    const merged: StaffMember[] = (staffRes.data ?? [])
      .map((row: Record<string, unknown>) => {
        const srv = row.servers as Record<string, unknown> | null
        if (!srv) return null
        const id = srv.id as string
        return {
          server_id: id,
          name: (srv.name as string) ?? 'Unnamed',
          role: (srv.role as string) ?? null,
          photo_url: (srv.photo_url as string) ?? null,
          average_rating: (srv.average_rating as number) ?? 0,
          total_ratings: (srv.total_ratings as number) ?? 0,
          follower_count: (srv.follower_count as number) ?? 0,
          is_on_shift: activeServerIds.has(id),
        }
      })
      .filter(Boolean) as StaffMember[]

    // Stable order: on-shift first, then by name
    merged.sort((a, b) => {
      if (a.is_on_shift !== b.is_on_shift) return a.is_on_shift ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    setStaff(merged)
    setLoading(false)

    // Fire analytics in parallel — don't block staff render
    loadAnalytics(targetName, merged).catch(err => {
      console.error('[manager dashboard] analytics:', err)
    })
  }, [restaurantName, loadAnalytics])

  // Initial auth + manager lookup
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/restaurant/signup')
        return
      }

      const { data: manager, error: mErr } = await supabase
        .from('restaurant_managers')
        .select('name, restaurant_name')
        .eq('auth_id', session.user.id)
        .maybeSingle()

      if (mErr) {
        console.error('[manager dashboard] manager lookup:', mErr)
        setError(mErr.message)
        setLoading(false)
        return
      }
      if (!manager) {
        router.push('/restaurant/signup')
        return
      }

      setManagerName(manager.name ?? '')
      setRestaurantName(manager.restaurant_name)
      await loadData(manager.restaurant_name)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!restaurantName) return
    const id = setInterval(() => { loadData() }, REFRESH_MS)
    return () => clearInterval(id)
  }, [restaurantName, loadData])

  async function handleToggle(member: StaffMember, next: boolean) {
    if (!restaurantName) return
    setBusyServerId(member.server_id)
    try {
      if (next) {
        // Activate shift
        const { error: insertErr } = await supabase.from('shifts').insert({
          server_id: member.server_id,
          restaurant_name: restaurantName,
          started_at: new Date().toISOString(),
          is_active: true,
          activated_by: 'manager',
        })
        if (insertErr) throw new Error(insertErr.message)

        // Notify followers — best-effort
        fetch('/api/notify-followers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverId: member.server_id,
            serverName: member.name,
            restaurantName,
            type: 'shift_started',
          }),
        }).catch(err => console.error('[manager dashboard] notify-followers:', err))
      } else {
        // Deactivate active shift
        const { error: updateErr } = await supabase
          .from('shifts')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('server_id', member.server_id)
          .eq('restaurant_name', restaurantName)
          .eq('is_active', true)
        if (updateErr) throw new Error(updateErr.message)
      }

      // Optimistic update
      setStaff(prev => prev.map(s =>
        s.server_id === member.server_id ? { ...s, is_on_shift: next } : s
      ))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[manager dashboard] toggle:', msg)
      setError(msg)
    } finally {
      setBusyServerId(null)
    }
  }

  const onShiftCount = staff.filter(s => s.is_on_shift).length

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-3xl px-8 py-12 lg:py-16">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
            Manager Dashboard
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {restaurantName ?? '…'}
          </h1>
          {managerName && (
            <p className="mt-3 text-sm" style={{ color: '#A0A0A0' }}>
              Signed in as {managerName}
            </p>
          )}

          <div className="mt-8 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white tabular-nums">{onShiftCount}</span>
            <span className="text-sm" style={{ color: '#A0A0A0' }}>
              {onShiftCount === 1 ? 'staff working tonight' : 'staff working tonight'}
            </span>
          </div>
          <p className="mt-2 text-xs" style={{ color: '#606060' }}>
            Auto-refreshes every 5 minutes
          </p>
        </div>

        <div className="border-t border-white/10" />

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* ── Staff list ──────────────────────────────────────────────────── */}
        <section className="py-10">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>
            Staff
          </p>

          {loading ? (
            <p className="text-sm" style={{ color: '#606060' }}>Loading…</p>
          ) : staff.length === 0 ? (
            <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>
              No staff are linked to this restaurant yet. Once your servers list this restaurant on their Slate profile, they&apos;ll appear here.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {staff.map(member => {
                const busy = busyServerId === member.server_id
                return (
                  <div
                    key={member.server_id}
                    className="flex items-center gap-5 rounded-2xl border border-white/10 px-5 py-5"
                    style={{ backgroundColor: '#0a0a0a' }}
                  >
                    {/* Photo */}
                    <div className="shrink-0">
                      {member.photo_url ? (
                        <Image
                          src={member.photo_url}
                          alt={member.name}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-base font-bold text-white">
                          {initials(member.name)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="truncate text-base font-semibold text-white">{member.name}</p>
                        {member.is_on_shift ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                            style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)' }}
                          >
                            On Shift
                          </span>
                        ) : (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#A0A0A0', border: '1px solid rgba(255,255,255,0.15)' }}
                          >
                            Not Working
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs capitalize" style={{ color: '#A0A0A0' }}>
                        {member.role ?? 'Server'}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: '#606060' }}>
                        {member.average_rating > 0 && (
                          <>
                            <span className="font-semibold text-white">
                              {member.average_rating.toFixed(1)} ★
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <span>
                          {member.follower_count} {member.follower_count === 1 ? 'follower' : 'followers'}
                        </span>
                      </div>
                    </div>

                    {/* Toggle */}
                    <ShiftToggle
                      on={member.is_on_shift}
                      busy={busy}
                      onChange={next => handleToggle(member, next)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── STAFF INTELLIGENCE ─────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

        <section className="pt-12 pb-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#A0A0A0' }}>
            Staff Intelligence
          </p>
          <p className="text-sm" style={{ color: '#606060' }}>
            Performance and venue signals across your team
          </p>
        </section>

        {/* Section 1 — Overview Stats */}
        <section className="py-10">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>
            Overview
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total Ratings This Month', value: analytics?.totalRatingsThisMonth ?? 0 },
              { label: 'Average Staff Rating', value: analytics ? analytics.avgStaffRating.toFixed(1) : '—' },
              { label: 'Total Followers', value: analytics?.totalFollowers ?? 0 },
              { label: 'Vibe Reports This Month', value: analytics?.vibesThisMonth ?? 0 },
            ].map(stat => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 px-5 py-5"
                style={{ backgroundColor: '#0a0a0a' }}
              >
                <p className="text-3xl font-bold tabular-nums text-white">{stat.value}</p>
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#606060' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2 — Staff Leaderboard */}
        <div className="border-t border-white/10" />
        <section className="py-10">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>
              Leaderboard
            </p>
            <div className="flex items-center gap-1 rounded-full border border-white/10 p-1 text-[10px] font-semibold uppercase tracking-widest">
              {([
                { key: 'rating', label: 'Rating' },
                { key: 'followers', label: 'Followers' },
                { key: 'ratings_count', label: 'Reviews' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setLeaderboardSort(opt.key)}
                  className="rounded-full px-3 py-1.5 transition-colors"
                  style={{
                    backgroundColor: leaderboardSort === opt.key ? '#FFFFFF' : 'transparent',
                    color: leaderboardSort === opt.key ? '#000000' : '#A0A0A0',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {staff.length === 0 ? (
            <p className="text-sm" style={{ color: '#606060' }}>No staff to rank yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-white/10">
              {[...staff]
                .sort((a, b) => {
                  if (leaderboardSort === 'followers') return b.follower_count - a.follower_count
                  if (leaderboardSort === 'ratings_count') return b.total_ratings - a.total_ratings
                  return b.average_rating - a.average_rating
                })
                .map((member, i) => {
                  const trend = analytics?.trendingByServerId[member.server_id] ?? null
                  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'flat' ? '–' : ''
                  const trendColor = trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : '#606060'
                  return (
                    <div key={member.server_id} className="flex items-center gap-4 py-4">
                      <span className="w-6 shrink-0 font-mono text-sm font-semibold" style={{ color: '#606060' }}>
                        {i + 1}
                      </span>
                      <div className="shrink-0">
                        {member.photo_url ? (
                          <Image src={member.photo_url} alt={member.name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" unoptimized />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                            {initials(member.name)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                        <p className="text-xs" style={{ color: '#606060' }}>
                          {member.total_ratings} {member.total_ratings === 1 ? 'rating' : 'ratings'} · {member.follower_count} {member.follower_count === 1 ? 'follower' : 'followers'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold text-white tabular-nums">
                          {member.average_rating > 0 ? member.average_rating.toFixed(1) : '—'}
                        </span>
                        <span className="text-xs" style={{ color: '#A0A0A0' }}>
                          {'★'.repeat(Math.round(member.average_rating))}{'☆'.repeat(Math.max(0, 5 - Math.round(member.average_rating)))}
                        </span>
                        {trendIcon && (
                          <span className="ml-1 text-sm font-semibold" style={{ color: trendColor }}>{trendIcon}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </section>

        {/* Section 3 — Venue Intelligence */}
        <div className="border-t border-white/10" />
        <section className="py-10">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>
            Venue Intelligence
          </p>

          {/* Day-of-week */}
          <div className="mb-10">
            <p className="mb-4 text-xs font-medium" style={{ color: '#A0A0A0' }}>Vibe by day of week (last 30 days)</p>
            {(() => {
              const vibes = analytics?.last30dVibes ?? []
              if (vibes.length === 0) {
                return <p className="text-sm" style={{ color: '#606060' }}>No vibe reports in the last 30 days.</p>
              }
              const byDay: Record<number, { count: number; vibes: Record<string, number> }> = {}
              for (const v of vibes) {
                const dow = new Date(v.created_at).getDay()
                const key = (v.vibe ?? '').toUpperCase()
                const cell = byDay[dow] ?? { count: 0, vibes: {} }
                cell.count += 1
                cell.vibes[key] = (cell.vibes[key] ?? 0) + 1
                byDay[dow] = cell
              }
              const ordered = Object.entries(byDay)
                .map(([dow, cell]) => {
                  const top = Object.entries(cell.vibes).sort((a, b) => b[1] - a[1])[0]?.[0]
                  return { dow: Number(dow), count: cell.count, top }
                })
                .sort((a, b) => b.count - a.count)
              return (
                <div className="flex flex-col divide-y divide-white/10">
                  {ordered.map(row => (
                    <div key={row.dow} className="flex items-center justify-between py-3">
                      <span className="text-sm font-semibold text-white">{DAY_NAMES[row.dow]}</span>
                      <span className="text-sm" style={{ color: '#A0A0A0' }}>
                        {row.count} {row.count === 1 ? 'report' : 'reports'}
                        {row.top && <span style={{ color: '#606060' }}> — mostly {VIBE_LABEL[row.top] ?? row.top.toLowerCase()}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Vibe percentage breakdown */}
          <div className="mb-10">
            <p className="mb-4 text-xs font-medium" style={{ color: '#A0A0A0' }}>Vibe mix (last 30 days)</p>
            {(() => {
              const vibes = analytics?.last30dVibes ?? []
              const total = vibes.length
              if (total === 0) {
                return <p className="text-sm" style={{ color: '#606060' }}>—</p>
              }
              const counts: Record<string, number> = {}
              for (const v of vibes) {
                const key = (v.vibe ?? '').toUpperCase()
                counts[key] = (counts[key] ?? 0) + 1
              }
              return (
                <div className="flex flex-col gap-3">
                  {VIBE_KEYS.map(k => {
                    const pct = Math.round(((counts[k] ?? 0) / total) * 100)
                    return (
                      <div key={k} className="flex items-center gap-4">
                        <span className="w-16 text-sm font-semibold text-white">{VIBE_LABEL[k]}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-12 text-right text-sm tabular-nums" style={{ color: '#A0A0A0' }}>{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Recent guest comments */}
          <div>
            <p className="mb-4 text-xs font-medium" style={{ color: '#A0A0A0' }}>Recent guest comments</p>
            {(() => {
              const comments = analytics?.comments ?? []
              if (comments.length === 0) {
                return <p className="text-sm" style={{ color: '#606060' }}>No guest comments yet.</p>
              }
              return (
                <div className="flex flex-col divide-y divide-white/10">
                  {comments.map(c => (
                    <div key={c.id} className="py-4">
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span className="text-sm font-semibold text-white">{c.commenter_name ?? 'Anonymous'}</span>
                        <span className="text-xs" style={{ color: '#606060' }}>{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>&ldquo;{c.comment}&rdquo;</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </section>

        {/* Section 4 — Recent Ratings */}
        <div className="border-t border-white/10" />
        <section className="py-10">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>
            Recent Ratings
          </p>
          {(() => {
            const recent = (analytics?.monthlyRatings ?? []).slice(0, 10)
            if (recent.length === 0) {
              return <p className="text-sm" style={{ color: '#606060' }}>No ratings yet this month.</p>
            }
            const staffById = new Map(staff.map(s => [s.server_id, s]))
            return (
              <div className="flex flex-col divide-y divide-white/10">
                {recent.map(r => {
                  const member = staffById.get(r.server_id)
                  return (
                    <div key={r.id} className="py-5">
                      <div className="mb-2 flex items-center gap-3">
                        <div className="shrink-0">
                          {member?.photo_url ? (
                            <Image src={member.photo_url} alt={member.name} width={32} height={32} className="h-8 w-8 rounded-full object-cover" unoptimized />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                              {member ? initials(member.name) : '?'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{member?.name ?? 'Server'}</p>
                          <p className="text-xs" style={{ color: '#606060' }}>
                            {r.guest_name ? `from ${r.guest_name}` : 'from a guest'} · {timeAgo(r.created_at)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-white">
                          {'★'.repeat(Math.round(r.score))}{'☆'.repeat(Math.max(0, 5 - Math.round(r.score)))}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="ml-11 text-sm leading-7" style={{ color: '#A0A0A0' }}>
                          &ldquo;{r.comment}&rdquo;
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </section>

        <div className="border-t border-white/10 py-8">
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-xs font-medium transition-colors hover:text-white"
            style={{ color: '#404040' }}
          >
            Sign out →
          </button>
        </div>
      </main>
    </div>
  )
}
