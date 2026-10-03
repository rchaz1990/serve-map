'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import QRCode from 'react-qr-code'
import Navbar from '@/app/components/Navbar'
import { MotionSection } from '@/app/components/motion'
import { supabase, getAuthSession, withTimeout } from '@/lib/supabase'

const GUEST_RATE_ORIGIN = 'https://slatenow.xyz'

function guestScanUrl(serverId: string) {
  return `${GUEST_RATE_ORIGIN}/scan/${serverId}`
}

function venuePublicPath(restaurantName: string) {
  return `/restaurant/${encodeURIComponent(restaurantName.trim().toLowerCase().replace(/\s+/g, '-'))}`
}

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
  server_name: string | null
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
  recentVibesList: VibeListRow[]
  comments: CommentRow[]
  trendingByServerId: Record<string, Trending>
  /** Real rating points already fetched for sparklines. Not synthesized. */
  scoreHistory: { server_id: string; score: number; created_at: string }[]
}

type VibeListRow = {
  id: string
  vibe: string | null
  created_at: string
  gps_verified: boolean | null
}

type ActivityItem = {
  id: string
  at: string
  kind: 'rating' | 'vibe'
  title: string
  detail: string
}

function guestActivity(ratings: RatingRow[], vibes: VibeListRow[]): ActivityItem[] {
  const fromRatings: ActivityItem[] = ratings.map(r => ({
    id: `rating-${r.id}`,
    at: r.created_at,
    kind: 'rating',
    title: `Guest rated ${r.server_name ?? 'a server'}`,
    detail: `${'★'.repeat(Math.max(0, Math.min(5, Math.round(r.score))))}${r.comment ? ` · ${r.comment}` : ''}`,
  }))
  const fromVibes: ActivityItem[] = vibes.map(v => {
    const key = (v.vibe ?? '').toUpperCase()
    return {
      id: `vibe-${v.id}`,
      at: v.created_at,
      kind: 'vibe',
      title: `${VIBE_EMOJI[key] ?? ''} ${VIBE_LABEL[key] ?? (v.vibe || 'Vibe')} report`.trim(),
      detail: v.gps_verified ? 'GPS verified' : 'Guest vibe',
    }
  })
  return [...fromRatings, ...fromVibes]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8)
}

type TalentServer = {
  id: string
  name: string
  role: string | null
  photo_url: string | null
  average_rating: number
  total_ratings: number
  follower_count: number
  email: string | null
  specialties: string[]
  primary_restaurant: string | null
}

type RoleFilter = 'all' | 'bartender' | 'server'
type RatingFilter = 'any' | '4.0' | '4.5' | '5.0'
type FollowersFilter = 'any' | '10' | '50' | '100'
type DashboardTab = 'staff' | 'intelligence' | 'talent'

const REFRESH_MS = 60 * 1000
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const VIBE_KEYS = ['PACKED', 'LIVE', 'CHILL'] as const
const VIBE_LABEL: Record<string, string> = { PACKED: 'Packed', LIVE: 'Live', CHILL: 'Chill' }
const VIBE_EMOJI: Record<string, string> = { PACKED: '🚀', LIVE: '🔥', CHILL: '🧊' }

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

/** Chronological scores already loaded for this server. Never invents points. */
function recentScoresForServer(serverId: string, rows: { server_id: string; score: number; created_at: string }[]): number[] {
  return rows
    .filter(r => r.server_id === serverId)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(r => r.score)
    .slice(-12)
}

function RatingSparkline({ scores }: { scores: number[] }) {
  const w = 72
  const h = 22
  const pad = 2
  const label = scores.length < 2
    ? 'Not enough ratings for a trend'
    : `Rating trend from ${scores.length} recent scores`
  if (scores.length < 2) {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} style={{ display: 'block', flexShrink: 0 }}>
        <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
    )
  }
  const min = 1
  const max = 5
  const pts = scores.map((s, i) => {
    const clamped = Math.min(max, Math.max(min, s))
    const x = pad + (i / (scores.length - 1)) * (w - pad * 2)
    const y = pad + (1 - (clamped - min) / (max - min)) * (h - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} style={{ display: 'block', flexShrink: 0 }}>
      <polyline fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  )
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

// ── Talent card (with hover state) ────────────────────────────────────────────

function TalentCard({
  t,
  contacted,
  contacting,
  onContact,
}: {
  t: TalentServer
  contacted: boolean
  contacting: boolean
  onContact: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#0a0a0a' : 'transparent',
        border: '1px solid #0d0d0d',
        padding: '24px',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ flexShrink: 0 }}>
          {t.photo_url ? (
            <Image
              src={t.photo_url}
              alt={t.name}
              width={56}
              height={56}
              unoptimized
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #1a1a1a' }}
            />
          ) : (
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#0a0a0a',
                border: '1px solid #1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#444',
                fontSize: '18px',
                fontFamily: 'Georgia, serif',
              }}
            >
              {initials(t.name)}
            </div>
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '18px',
              color: 'white',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t.name}
          </p>
          <p
            style={{
              marginTop: '6px',
              fontFamily: '"Space Mono", ui-monospace, monospace',
              fontSize: '10px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#444',
            }}
          >
            {t.role ?? 'Server'}
          </p>
          <div
            style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '12px',
              fontFamily: '"Space Mono", ui-monospace, monospace',
              color: '#555',
            }}
          >
            <span>
              <span style={{ color: 'white', fontWeight: 700 }}>
                {t.average_rating > 0 ? t.average_rating.toFixed(1) : '—'}
              </span>{' '}
              ({t.total_ratings})
            </span>
            <span>·</span>
            <span>{t.follower_count} followers</span>
          </div>
        </div>
      </div>

      {t.primary_restaurant && (
        <p
          style={{
            marginTop: '20px',
            fontSize: '12px',
            fontFamily: '"Space Mono", ui-monospace, monospace',
            letterSpacing: '0.05em',
            color: '#444',
          }}
        >
          Currently at <span style={{ color: '#888' }}>{t.primary_restaurant}</span>
        </p>
      )}

      {t.specialties.length > 0 && (
        <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {t.specialties.map(spec => (
            <span
              key={spec}
              style={{
                border: '1px solid #1a1a1a',
                padding: '4px 10px',
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: '"Space Mono", ui-monospace, monospace',
                color: '#666',
              }}
            >
              {spec}
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: '24px', display: 'flex', gap: '8px', flexDirection: 'row' }}>
        <a
          href={`/server/${t.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            background: '#FFFFFF',
            color: '#000000',
            padding: '12px 18px',
            fontSize: '10px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontFamily: '"Space Mono", ui-monospace, monospace',
            fontWeight: 700,
            textAlign: 'center',
            textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
        >
          View Profile
        </a>
        <button
          onClick={onContact}
          disabled={contacting || contacted || !t.email}
          style={{
            flex: 1,
            background: 'transparent',
            color: contacted ? '#4ade80' : !t.email ? '#333' : '#FFFFFF',
            padding: '12px 18px',
            fontSize: '10px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontFamily: '"Space Mono", ui-monospace, monospace',
            fontWeight: 700,
            border: '1px solid #FFFFFF',
            borderColor: contacted ? '#4ade80' : !t.email ? '#1a1a1a' : '#FFFFFF',
            cursor: contacting || contacted || !t.email ? 'default' : 'pointer',
            opacity: contacting ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >
          {contacted ? 'Message Sent' : contacting ? 'Sending…' : !t.email ? 'No Email' : 'Contact'}
        </button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RestaurantManagerDashboard() {
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [managerName, setManagerName] = useState<string>('')
  const [managerEmail, setManagerEmail] = useState<string>('')
  const [staff, setStaff] = useState<StaffMember[]>([])
  const staffRef = useRef<StaffMember[]>([])
  staffRef.current = staff
  const [loading, setLoading] = useState(true)
  const [busyServerId, setBusyServerId] = useState<string | null>(null)
  const [copiedRateId, setCopiedRateId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSort>('rating')

  // Tab + talent discovery
  const [activeTab, setActiveTab] = useState<DashboardTab>('staff')
  const [talent, setTalent] = useState<TalentServer[]>([])
  const [talentLoading, setTalentLoading] = useState(false)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('any')
  const [followersFilter, setFollowersFilter] = useState<FollowersFilter>('any')
  const [contactingId, setContactingId] = useState<string | null>(null)
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set())

  const loadAnalytics = useCallback(async (rName: string, current: StaffMember[]) => {
    const ids = current.map(s => s.server_id)
    const monthStart = startOfMonth().toISOString()
    const lastMonthStart = startOfLastMonth().toISOString()
    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()

    if (ids.length === 0) {
      // No staff yet — still pull venue-level data
      const [vibeCountRes, last30dVibesRes, recentVibesRes, commentsRes] = await Promise.all([
        supabase.from('vibe_reports').select('id', { count: 'exact', head: true }).eq('restaurant_name', rName).gte('created_at', monthStart),
        supabase.from('vibe_reports').select('id, vibe, created_at').eq('restaurant_name', rName).gte('created_at', since30d),
        supabase.from('vibe_reports').select('id, vibe, created_at, gps_verified').eq('restaurant_name', rName).order('created_at', { ascending: false }).limit(10),
        supabase.from('venue_comments').select('id, comment, commenter_name, created_at').eq('restaurant_name', rName).order('created_at', { ascending: false }).limit(10),
      ])
      setAnalytics({
        totalRatingsThisMonth: 0,
        avgStaffRating: 0,
        totalFollowers: 0,
        vibesThisMonth: vibeCountRes.count ?? 0,
        monthlyRatings: [],
        last30dVibes: (last30dVibesRes.data ?? []) as VibeRow[],
        recentVibesList: (recentVibesRes.data ?? []) as VibeListRow[],
        comments: (commentsRes.data ?? []) as CommentRow[],
        trendingByServerId: {},
        scoreHistory: [],
      })
      return
    }

    const [
      monthlyRatingsRes,
      allScoresRes,
      vibeCountRes,
      last30dVibesRes,
      recentVibesRes,
      commentsRes,
    ] = await Promise.all([
      // ratings has no guest_name/server_name — join servers(name) like account/restaurant profile
      supabase
        .from('ratings')
        .select('id, score, server_id, created_at, comment, servers(name)')
        .in('server_id', ids)
        .gte('created_at', lastMonthStart)
        .order('created_at', { ascending: false }),
      supabase
        .from('ratings')
        .select('server_id, score, created_at')
        .in('server_id', ids)
        .order('created_at', { ascending: true }),
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
        .from('vibe_reports')
        .select('id, vibe, created_at, gps_verified')
        .eq('restaurant_name', rName)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('venue_comments')
        .select('id, comment, commenter_name, created_at')
        .eq('restaurant_name', rName)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    if (monthlyRatingsRes.error) {
      console.error('[manager dashboard] ratings:', monthlyRatingsRes.error)
    }
    if (allScoresRes.error) {
      console.error('[manager dashboard] ratings scores:', allScoresRes.error)
    }

    // Remap servers(name) embed (PostgREST/TS may type it as array) → flat server_name
    const monthlyRatings: RatingRow[] = ((monthlyRatingsRes.data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const srv = row.servers as { name?: string } | { name?: string }[] | null
      const nested = Array.isArray(srv) ? (srv[0] ?? null) : srv
      return {
        id: row.id as string,
        score: row.score as number,
        server_id: row.server_id as string,
        created_at: row.created_at as string,
        comment: (row.comment as string | null) ?? null,
        server_name: nested?.name ?? null,
      }
    })
    const allScores = (allScoresRes.data ?? []) as { server_id: string; score: number; created_at: string }[]

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
      recentVibesList: (recentVibesRes.data ?? []) as VibeListRow[],
      comments: (commentsRes.data ?? []) as CommentRow[],
      trendingByServerId,
      scoreHistory: allScores.filter(r => r.server_id && r.created_at),
    })
  }, [])

  // Talent discovery — servers with open_to_opportunities=true, excluding current staff
  const loadTalent = useCallback(async (currentStaff: StaffMember[]) => {
    setTalentLoading(true)
    const staffIds = new Set(currentStaff.map(s => s.server_id))

    const { data, error: tErr } = await supabase
      .from('servers')
      .select('id, name, role, photo_url, average_rating, total_ratings, follower_count, email, specialties, server_restaurants(restaurant_name, is_primary)')
      .eq('open_to_opportunities', true)

    if (tErr) {
      console.error('[manager dashboard] talent load:', tErr)
      setTalentLoading(false)
      return
    }

    const mapped: TalentServer[] = (data ?? [])
      .filter((row: Record<string, unknown>) => !staffIds.has(row.id as string))
      .map((row: Record<string, unknown>) => {
        const restaurants = (row.server_restaurants as { restaurant_name: string; is_primary: boolean }[]) ?? []
        const primary = restaurants.find(r => r.is_primary)?.restaurant_name ?? restaurants[0]?.restaurant_name ?? null
        return {
          id: row.id as string,
          name: (row.name as string) ?? 'Unnamed',
          role: (row.role as string) ?? null,
          photo_url: (row.photo_url as string) ?? null,
          average_rating: (row.average_rating as number) ?? 0,
          total_ratings: (row.total_ratings as number) ?? 0,
          follower_count: (row.follower_count as number) ?? 0,
          email: (row.email as string) ?? null,
          specialties: (row.specialties as string[]) ?? [],
          primary_restaurant: primary,
        }
      })

    setTalent(mapped)
    setTalentLoading(false)
  }, [])

  const loadData = useCallback(async (rName?: string) => {
    const targetName = rName ?? restaurantName
    if (!targetName) {
      setLoading(false)
      return
    }

    try {
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

      if (staffRes.error) console.error('[manager dashboard] staff:', staffRes.error)

      // On-shift = shifts.is_active for this restaurant (same source as the toggle).
      // Do NOT use server_restaurants.currently_working — that is an employment/"Here now"
      // flag and is not what the manager shift switch writes.
      if (shiftsRes.error) {
        console.error('[manager dashboard] shifts:', shiftsRes.error)
      }
      const shiftsOk = !shiftsRes.error
      const activeServerIds = new Set(
        (shiftsOk ? (shiftsRes.data ?? []) : [])
          .map(s => s.server_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      )

      const priorOnShift = new Set(
        shiftsOk ? [] : staffRef.current.filter(s => s.is_on_shift).map(s => s.server_id),
      )

      const merged: StaffMember[] = (staffRes.data ?? [])
        .map((row: Record<string, unknown>) => {
          const raw = row.servers as Record<string, unknown> | Record<string, unknown>[] | null
          const srv = Array.isArray(raw) ? (raw[0] ?? null) : raw
          // Canonical id from join row; fall back to embed (array-safe)
          const id = (row.server_id as string | undefined) ?? (srv?.id as string | undefined)
          if (!id || !srv) return null
          return {
            server_id: id,
            name: (srv.name as string) ?? 'Unnamed',
            role: (srv.role as string) ?? null,
            photo_url: (srv.photo_url as string) ?? null,
            average_rating: (srv.average_rating as number) ?? 0,
            total_ratings: (srv.total_ratings as number) ?? 0,
            follower_count: (srv.follower_count as number) ?? 0,
            is_on_shift: shiftsOk ? activeServerIds.has(id) : priorOnShift.has(id),
          }
        })
        .filter(Boolean) as StaffMember[]

      merged.sort((a, b) => {
        if (a.is_on_shift !== b.is_on_shift) return a.is_on_shift ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      setStaff(merged)

      // Fire analytics + talent in parallel — don't block staff render
      loadAnalytics(targetName, merged).catch(err => {
        console.error('[manager dashboard] analytics:', err)
      })
      loadTalent(merged).catch(err => {
        console.error('[manager dashboard] talent:', err)
      })
    } catch (err) {
      console.error('[manager dashboard] loadData:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      // Always clear Loading — never hang on query/network errors
      setLoading(false)
    }
  }, [restaurantName, loadAnalytics, loadTalent])

  // Initial auth + manager lookup
  // Auth reads go through getAuthSession (coalesced) + withTimeout so a
  // Navigator Lock hang cannot leave Loading stuck forever.
  useEffect(() => {
    let cancelled = false
    const AUTH_TIMEOUT_MS = 8_000

    async function checkAuth() {
      try {
        const session = await withTimeout(
          getAuthSession(),
          AUTH_TIMEOUT_MS,
          'Auth session',
        )

        if (cancelled) return

        if (!session) {
          // No session — send to LOGIN not signup
          router.push('/restaurant/login')
          return
        }

        const managerRes = await withTimeout(
          supabase
            .from('restaurant_managers')
            .select('*')
            .eq('auth_id', session.user.id)
            .maybeSingle(),
          AUTH_TIMEOUT_MS,
          'Manager lookup',
        )

        if (cancelled) return

        const { data: managerData, error: managerErr } = managerRes

        if (managerErr) {
          console.error('[manager dashboard] restaurant_managers:', managerErr)
          setError(managerErr.message)
          return
        }

        if (!managerData) {
          // Has session but no manager row
          // Sign them out first to avoid "already registered" error
          await supabase.auth.signOut()
          localStorage.removeItem('slateUserType')
          localStorage.removeItem('slateManagerId')
          localStorage.removeItem('slateRestaurantName')
          router.push('/restaurant/login')
          return
        }

        // Valid manager — set localStorage and continue
        localStorage.setItem('slateUserType', 'manager')
        localStorage.setItem('slateManagerId', managerData.id)
        localStorage.setItem('slateRestaurantName', managerData.restaurant_name)

        setManagerName(managerData.name ?? '')
        setManagerEmail(managerData.email ?? session.user.email ?? '')
        setRestaurantName(managerData.restaurant_name)
        await loadData(managerData.restaurant_name)
      } catch (err) {
        console.error('[manager dashboard] checkAuth:', err)
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard')
        }
      } finally {
        // Always clear Loading — never hang when auth lock/timeout fails
        // before loadData runs. loadData also clears loading in its finally.
        if (!cancelled) setLoading(false)
      }
    }
    checkAuth()
    return () => { cancelled = true }
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
        // Activate shift — HANDOFF #9: server_id required for venue tonight join
        if (!member.server_id) throw new Error('Missing server_id — cannot activate shift')
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

  async function handleContact(server: TalentServer) {
    if (!restaurantName || !managerName || !server.email) {
      setError('Missing details — refresh the page and try again.')
      return
    }
    setContactingId(server.id)
    try {
      const res = await fetch('/api/contact-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverEmail: server.email,
          serverName: server.name,
          restaurantName,
          managerName,
          managerEmail,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to send message.')
      setContactedIds(prev => {
        const next = new Set(prev)
        next.add(server.id)
        return next
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setContactingId(null)
    }
  }

  // Filtered talent
  const filteredTalent = talent.filter(t => {
    if (roleFilter !== 'all') {
      const r = (t.role ?? '').toLowerCase()
      if (roleFilter === 'bartender' && !r.includes('bartender')) return false
      if (roleFilter === 'server' && !r.includes('server')) return false
    }
    if (ratingFilter !== 'any' && t.average_rating < parseFloat(ratingFilter)) return false
    if (followersFilter !== 'any' && t.follower_count < parseInt(followersFilter, 10)) return false
    return true
  })

  const onShiftCount = staff.filter(s => s.is_on_shift).length
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="slate-page">
      {/* Editorial fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
      />

      <Navbar />
      <div className="slate-rule" />

      <main className="slate-main mx-auto max-w-3xl px-8 py-12 lg:py-16">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <MotionSection as="div" immediate className="mb-8">
          <p
            className="mb-4"
            style={{
              fontFamily: '"Space Mono", ui-monospace, SFMono-Regular, monospace',
              fontSize: '10px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#444',
            }}
          >
            Manager dashboard
          </p>
          <h1
            className="text-white"
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontWeight: 600,
              fontSize: '32px',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
            }}
          >
            {restaurantName ?? '…'}
          </h1>

          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span
              style={{
                fontFamily: '"Space Mono", ui-monospace, monospace',
                fontSize: '11px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#666',
              }}
            >
              {todayDate}
            </span>
            {managerName && (
              <>
                <span style={{ color: '#222' }}>·</span>
                <span style={{ fontSize: '11px', color: '#444' }}>Signed in as {managerName}</span>
              </>
            )}
            {restaurantName && (
              <>
                <span style={{ color: '#222' }}>·</span>
                <a
                  href={venuePublicPath(restaurantName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '11px',
                    color: '#888',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  View public page
                </a>
              </>
            )}
          </div>

          <p className="mt-5 text-sm leading-6" style={{ color: '#888', maxWidth: '36rem' }}>
            Flip someone on shift to show guests who&apos;s working tonight. Each on-shift server gets a guest rating QR.
          </p>

          <div className="mt-7 flex items-center gap-3">
            {onShiftCount > 0 && (
              <span className="slate-shift-pulse" aria-hidden />
            )}
            <span
              className="text-white"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontWeight: 600,
                fontSize: '40px',
                lineHeight: 1,
              }}
            >
              {onShiftCount}
            </span>
            <span
              style={{
                fontFamily: '"Space Mono", ui-monospace, monospace',
                fontSize: '10px',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#666',
              }}
            >
              On the floor tonight
            </span>
          </div>
          <p className="mt-2 text-xs" style={{ color: '#444', fontFamily: '"Space Mono", ui-monospace, monospace', letterSpacing: '0.1em' }}>
            Live · refreshes every 60s
          </p>
        </MotionSection>

        <div className="slate-rule" style={{ marginBottom: 0 }} />

        {/* ── Tabs (minimal text links, white underline on active) ───────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {([
            { key: 'staff' as const, label: 'On floor' },
            { key: 'intelligence' as const, label: 'Insights' },
            { key: 'talent' as const, label: 'Hire' },
          ]).map(t => {
            const active = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  position: 'relative',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '20px 0',
                  fontSize: '11px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  fontFamily: '"Space Mono", ui-monospace, monospace',
                  color: active ? '#FFFFFF' : '#444',
                  transition: 'color 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-1px',
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: '#FFFFFF',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="mt-6 flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-xs text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 text-[10px] uppercase tracking-widest text-red-300/80 hover:text-red-200"
              style={{ fontFamily: '"Space Mono", ui-monospace, monospace' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── STAFF TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'staff' && (
          <MotionSection className="py-6">
            {loading ? (
              <p className="text-sm py-6" style={{ color: '#606060' }}>Loading your floor…</p>
            ) : staff.length === 0 ? (
              <div className="py-8" style={{ border: '1px solid #151515', background: '#050505', padding: '28px 24px' }}>
                <p
                  style={{
                    fontFamily: '"Space Mono", ui-monospace, monospace',
                    fontSize: '10px',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: '#555',
                    marginBottom: '12px',
                  }}
                >
                  Get started
                </p>
                <p className="text-white" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '22px', fontWeight: 500, lineHeight: 1.25 }}>
                  No staff linked yet
                </p>
                <p className="mt-3 text-sm leading-7" style={{ color: '#A0A0A0', maxWidth: '32rem' }}>
                  Ask your servers and bartenders to add <span style={{ color: '#fff' }}>{restaurantName ?? 'this restaurant'}</span> on their Slate profile. They&apos;ll show up here automatically — then you can put them on shift in one tap.
                </p>
                <ol className="mt-6 space-y-3 text-sm" style={{ color: '#888', listStyle: 'decimal', paddingLeft: '1.25rem' }}>
                  <li>Servers open Slate and add this venue to their jobs</li>
                  <li>They appear on this On floor list</li>
                  <li>Toggle On shift so guests see who&apos;s working tonight</li>
                </ol>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-xs" style={{ color: '#555', fontFamily: '"Space Mono", ui-monospace, monospace', letterSpacing: '0.12em' }}>
                  {staff.length} linked · flip the switch to put someone on the floor
                </p>
                {staff.map(member => {
                  const isActive = member.is_on_shift
                  const busy = busyServerId === member.server_id
                  const scanUrl = guestScanUrl(member.server_id)
                  const copyScan = async () => {
                    try {
                      await navigator.clipboard.writeText(scanUrl)
                      setCopiedRateId(member.server_id)
                      setTimeout(() => setCopiedRateId(prev => prev === member.server_id ? null : prev), 2000)
                    } catch {
                      // ignore clipboard failures
                    }
                  }
                  return (
                    <div
                      key={member.server_id}
                      style={{
                        padding: '28px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '56px 1fr auto',
                          gap: '24px',
                          alignItems: 'center',
                        }}
                      >
                      {/* Photo */}
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#0a0a0a', overflow: 'hidden', border: '1px solid #1a1a1a' }}>
                        {member.photo_url ? (
                          <Image
                            src={member.photo_url}
                            alt={member.name}
                            width={56}
                            height={56}
                            unoptimized
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: '20px', fontFamily: '"Playfair Display", Georgia, serif' }}>
                            {member.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              color: 'white',
                              fontSize: '18px',
                              fontFamily: 'Georgia, "Times New Roman", serif',
                              lineHeight: 1.2,
                            }}
                          >
                            {member.name}
                          </span>
                          {isActive && (
                            <span
                              aria-label="On shift"
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: '#4ade80',
                                boxShadow: '0 0 6px rgba(74, 222, 128, 0.5)',
                              }}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            color: '#444',
                            fontSize: '10px',
                            letterSpacing: '3px',
                            textTransform: 'uppercase',
                            marginTop: '6px',
                            fontFamily: '"Space Mono", ui-monospace, monospace',
                          }}
                        >
                          {member.role ?? 'Server'}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', alignItems: 'center' }}>
                          <span style={{ color: '#555', fontSize: '12px', fontFamily: '"Space Mono", ui-monospace, monospace' }}>
                            {member.average_rating > 0 ? member.average_rating.toFixed(1) : '—'} rating
                          </span>
                          <RatingSparkline scores={recentScoresForServer(member.server_id, analytics?.scoreHistory ?? [])} />
                          <span style={{ color: '#555', fontSize: '12px', fontFamily: '"Space Mono", ui-monospace, monospace' }}>
                            {member.follower_count || 0} followers
                          </span>
                        </div>
                      </div>

                      {/* Toggle — hero element; Copy sits here so on-shift QR entry is obvious */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <button
                          onClick={() => handleToggle(member, !isActive)}
                          disabled={busy}
                          style={{
                            width: '76px',
                            height: '40px',
                            borderRadius: '20px',
                            background: isActive ? '#FFFFFF' : 'transparent',
                            border: isActive ? '1px solid #FFFFFF' : '1px solid #1a1a1a',
                            cursor: busy ? 'wait' : 'pointer',
                            position: 'relative',
                            transition: 'all 0.25s ease',
                            padding: 0,
                          }}
                          aria-label={isActive ? `End ${member.name}'s shift` : `Start ${member.name}'s shift`}
                        >
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: isActive ? '#000000' : '#1a1a1a',
                              position: 'absolute',
                              top: '4px',
                              left: isActive ? '41px' : '4px',
                              transition: 'all 0.25s ease',
                            }}
                          />
                        </button>
                        <span
                          style={{
                            color: isActive ? '#FFFFFF' : '#555',
                            fontSize: '9px',
                            letterSpacing: '2.5px',
                            textTransform: 'uppercase',
                            fontFamily: '"Space Mono", ui-monospace, monospace',
                          }}
                        >
                          {isActive ? 'On shift' : 'Start shift'}
                        </span>
                        {isActive && (
                          <button
                            type="button"
                            onClick={copyScan}
                            style={{
                              background: 'transparent',
                              border: '1px solid #333',
                              color: '#FFFFFF',
                              fontSize: '9px',
                              letterSpacing: '0.15em',
                              textTransform: 'uppercase',
                              padding: '6px 10px',
                              cursor: 'pointer',
                              fontFamily: '"Space Mono", ui-monospace, monospace',
                            }}
                          >
                            {copiedRateId === member.server_id ? 'Copied' : 'Copy link'}
                          </button>
                        )}
                      </div>
                      </div>

                      {/* Guest rate QR — sibling of grid (not a spanning cell) so it always paints when on shift */}
                      {isActive && (
                        <div
                          style={{
                            marginTop: '16px',
                            padding: '20px',
                            border: '1px solid #111',
                            background: '#050505',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '20px',
                          }}
                        >
                          <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px' }}>
                            <QRCode
                              value={scanUrl}
                              size={96}
                              bgColor="#ffffff"
                              fgColor="#000000"
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <p
                              style={{
                                fontFamily: '"Space Mono", ui-monospace, monospace',
                                fontSize: '10px',
                                letterSpacing: '0.25em',
                                textTransform: 'uppercase',
                                color: '#555',
                                marginBottom: '8px',
                              }}
                            >
                              Guest rate QR
                            </p>
                            <p style={{ color: '#A0A0A0', fontSize: '13px', lineHeight: 1.5, marginBottom: '12px' }}>
                              Guests scan this to rate {member.name.split(' ')[0]} — no app download needed.
                              Print it or show it on a phone at the table.
                            </p>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                border: '1px solid #1a1a1a',
                                background: '#0a0a0a',
                                padding: '10px 12px',
                                borderRadius: '8px',
                              }}
                            >
                              <span
                                style={{
                                  flex: 1,
                                  fontFamily: '"Space Mono", ui-monospace, monospace',
                                  fontSize: '11px',
                                  color: '#888',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                slatenow.xyz/scan/{member.server_id}
                              </span>
                              <button
                                type="button"
                                onClick={copyScan}
                                style={{
                                  flexShrink: 0,
                                  background: 'transparent',
                                  border: '1px solid #333',
                                  color: '#FFFFFF',
                                  fontSize: '10px',
                                  letterSpacing: '0.15em',
                                  textTransform: 'uppercase',
                                  padding: '6px 10px',
                                  cursor: 'pointer',
                                  fontFamily: '"Space Mono", ui-monospace, monospace',
                                }}
                              >
                                {copiedRateId === member.server_id ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#555' }}>
                Guest activity
              </p>
              <p className="mt-2 mb-4 text-xs" style={{ color: '#555' }}>
                Recent ratings and vibe reports for this venue.
              </p>
              {(() => {
                if (!analytics) {
                  return <p className="text-sm" style={{ color: '#606060' }}>Loading activity…</p>
                }
                const items = guestActivity(analytics.monthlyRatings, analytics.recentVibesList)
                if (items.length === 0) {
                  return <p className="text-sm" style={{ color: '#606060' }}>No guest activity yet.</p>
                }
                return (
                  <div className="flex flex-col divide-y divide-white/10">
                    {items.map(item => (
                      <div key={item.id} className="flex items-baseline justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{item.title}</p>
                          {item.detail && (
                            <p className="truncate text-xs" style={{ color: '#666' }}>{item.detail}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-[11px]" style={{ color: '#555', fontFamily: '"Space Mono", ui-monospace, monospace' }}>
                          {timeAgo(item.at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </MotionSection>
        )}

        {/* ── INTELLIGENCE TAB ────────────────────────────────────────────── */}
        {activeTab === 'intelligence' && (
        <>
        <MotionSection style={{ paddingTop: '40px', paddingBottom: '8px' }}>
          <p
            style={{
              fontFamily: '"Space Mono", ui-monospace, monospace',
              fontSize: '10px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#444',
              marginBottom: '8px',
            }}
          >
            Insights
          </p>
          <p
            className="text-white"
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: '24px',
              fontWeight: 500,
              lineHeight: 1.2,
            }}
          >
            How your team and floor are performing
          </p>
          <p className="mt-3 text-sm leading-6" style={{ color: '#666', maxWidth: '36rem' }}>
            Ratings, followers, guest vibes, and recent feedback — all for {restaurantName ?? 'your venue'}.
          </p>
        </MotionSection>

        {/* Section 1 — Overview Stats (2x2) */}
        <MotionSection style={{ paddingTop: '32px', paddingBottom: '40px' }}>
          <p
            style={{
              fontFamily: '"Space Mono", ui-monospace, monospace',
              fontSize: '9px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#444',
              marginBottom: '20px',
            }}
          >
            Overview
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Ratings this month', value: analytics?.totalRatingsThisMonth ?? 0 },
              { label: 'Avg staff rating', value: analytics ? analytics.avgStaffRating.toFixed(1) : '—' },
              { label: 'Team followers', value: analytics?.totalFollowers ?? 0 },
              { label: 'Vibe reports this month', value: analytics?.vibesThisMonth ?? 0 },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: '#050505',
                  border: '1px solid #111',
                  padding: '28px 24px',
                }}
              >
                <p
                  className="text-white"
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontSize: '36px',
                    fontWeight: 500,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {stat.value}
                </p>
                <p
                  style={{
                    marginTop: '14px',
                    fontFamily: '"Space Mono", ui-monospace, monospace',
                    fontSize: '9px',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: '#444',
                    lineHeight: 1.4,
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </MotionSection>

        {/* Section 2 — Staff Leaderboard */}
        <div style={{ height: '1px', background: '#0d0d0d' }} />
        <MotionSection style={{ paddingTop: '40px', paddingBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
            <p
              style={{
                fontFamily: '"Space Mono", ui-monospace, monospace',
                fontSize: '9px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#444',
              }}
            >
              Leaderboard
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #111', padding: '3px' }}>
              {([
                { key: 'rating', label: 'Rating' },
                { key: 'followers', label: 'Followers' },
                { key: 'ratings_count', label: 'Reviews' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setLeaderboardSort(opt.key)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '9px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontFamily: '"Space Mono", ui-monospace, monospace',
                    background: leaderboardSort === opt.key ? '#FFFFFF' : 'transparent',
                    color: leaderboardSort === opt.key ? '#000000' : '#666',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {staff.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#444' }}>No staff to rank yet.</p>
          ) : (
            <div>
              {[...staff]
                .sort((a, b) => {
                  if (leaderboardSort === 'followers') return b.follower_count - a.follower_count
                  if (leaderboardSort === 'ratings_count') return b.total_ratings - a.total_ratings
                  return b.average_rating - a.average_rating
                })
                .map((member, i) => {
                  const trend = analytics?.trendingByServerId[member.server_id] ?? null
                  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'flat' ? '–' : ''
                  const trendColor = trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : '#444'
                  const isTopRank = i === 0
                  return (
                    <div
                      key={member.server_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        padding: '18px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        border: isTopRank ? '1px solid rgba(255,255,255,0.4)' : undefined,
                        borderBottomColor: isTopRank ? 'rgba(255,255,255,0.4)' : '#0d0d0d',
                        marginBottom: isTopRank ? '4px' : undefined,
                        background: isTopRank ? '#050505' : 'transparent',
                      }}
                    >
                      <span
                        style={{
                          width: '24px',
                          flexShrink: 0,
                          fontFamily: '"Space Mono", ui-monospace, monospace',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: isTopRank ? '#FFFFFF' : '#222',
                          textAlign: 'center',
                        }}
                      >
                        {i + 1}
                      </span>
                      <div style={{ flexShrink: 0 }}>
                        {member.photo_url ? (
                          <Image src={member.photo_url} alt={member.name} width={40} height={40} unoptimized style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0a0a0a', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '13px', fontFamily: 'Georgia, serif' }}>
                            {initials(member.name)}
                          </div>
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.name}
                        </p>
                        <p style={{ marginTop: '3px', fontSize: '10px', fontFamily: '"Space Mono", ui-monospace, monospace', letterSpacing: '0.1em', color: '#444' }}>
                          {member.total_ratings} ratings · {member.follower_count} followers
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontFamily: '"Playfair Display", Georgia, serif',
                            fontSize: '18px',
                            fontWeight: 600,
                            color: 'white',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {member.average_rating > 0 ? member.average_rating.toFixed(1) : '—'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#444' }}>
                          {'★'.repeat(Math.round(member.average_rating))}{'☆'.repeat(Math.max(0, 5 - Math.round(member.average_rating)))}
                        </span>
                        {trendIcon && (
                          <span style={{ fontSize: '13px', fontWeight: 700, color: trendColor }}>{trendIcon}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </MotionSection>

        {/* Section 3 — Venue Intelligence */}
        <div style={{ height: '1px', background: '#0d0d0d' }} />
        <MotionSection className="py-10">
          <p className="mb-6" style={{ fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444' }}>
            Venue Intelligence
          </p>

          {/* Day-of-week */}
          <div className="mb-10">
            <p className="mb-4" style={{ fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666' }}>Vibe by day of week — Last 30 days</p>
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
            <p className="mb-4" style={{ fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666' }}>Vibe mix — Last 30 days</p>
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
            <p className="mb-4" style={{ fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666' }}>Recent guest comments</p>
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
        </MotionSection>

        {/* Section 4 — Recent Ratings */}
        <div style={{ height: '1px', background: '#0d0d0d' }} />
        <MotionSection className="py-10">
          <p className="mb-6" style={{ fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444' }}>
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
                          <p className="truncate text-sm font-semibold text-white">{member?.name ?? r.server_name ?? 'Server'}</p>
                          <p className="text-xs" style={{ color: '#606060' }}>
                            from a guest · {timeAgo(r.created_at)}
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
        </MotionSection>

        {/* Section 5 — Recent Vibe Reports */}
        <div style={{ height: '1px', background: '#0d0d0d' }} />
        <MotionSection className="py-10">
          <p className="mb-6" style={{ fontFamily: '"Space Mono", ui-monospace, monospace', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#444' }}>
            Recent Vibe Reports
          </p>
          {(() => {
            const recent = analytics?.recentVibesList ?? []
            if (recent.length === 0) {
              return <p className="text-sm" style={{ color: '#606060' }}>No vibe reports yet.</p>
            }
            return (
              <div className="flex flex-col divide-y divide-white/10">
                {recent.map(v => {
                  const key = (v.vibe ?? '').toUpperCase()
                  return (
                    <div key={v.id} className="flex items-center justify-between gap-3 py-4">
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: '20px' }}>{VIBE_EMOJI[key] ?? '✨'}</span>
                        <div>
                          <p className="text-sm font-semibold capitalize text-white">
                            {VIBE_LABEL[key] ?? (v.vibe ?? 'reported').toLowerCase()}
                          </p>
                          <p className="text-xs" style={{ color: '#606060' }}>{timeAgo(v.created_at)}</p>
                        </div>
                      </div>
                      {v.gps_verified ? (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                          style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)' }}
                        >
                          GPS Verified
                        </span>
                      ) : (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#606060', border: '1px solid rgba(255,255,255,0.15)' }}
                        >
                          Unverified
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </MotionSection>
        </>
        )}

        {/* ── TALENT DISCOVERY TAB ────────────────────────────────────────── */}
        {activeTab === 'talent' && (
          <MotionSection style={{ paddingTop: '40px', paddingBottom: '40px' }}>
            <div style={{ marginBottom: '28px' }}>
              <p
                style={{
                  fontFamily: '"Space Mono", ui-monospace, monospace',
                  fontSize: '10px',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: '#444',
                  marginBottom: '8px',
                }}
              >
                Hire
              </p>
              <p
                className="text-white"
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: '24px',
                  fontWeight: 500,
                  lineHeight: 1.2,
                }}
              >
                Servers open to opportunities
              </p>
              <p className="mt-3 text-sm leading-6" style={{ color: '#666', maxWidth: '36rem' }}>
                Filter by role and ratings, then Contact to introduce your venue. Your current staff are hidden from this list.
              </p>
            </div>
            {/* Filter bar — minimal dropdown selects */}
            <div
              style={{
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
                marginBottom: '32px',
                paddingBottom: '24px',
                borderBottom: '1px solid #0d0d0d',
              }}
            >
              {[
                {
                  label: 'Role',
                  value: roleFilter,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange: (v: string) => setRoleFilter(v as any),
                  options: [
                    { value: 'all', label: 'All Roles' },
                    { value: 'bartender', label: 'Bartender' },
                    { value: 'server', label: 'Server' },
                  ],
                },
                {
                  label: 'Min Rating',
                  value: ratingFilter,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange: (v: string) => setRatingFilter(v as any),
                  options: [
                    { value: 'any', label: 'Any rating' },
                    { value: '4.0', label: '4.0+' },
                    { value: '4.5', label: '4.5+' },
                    { value: '5.0', label: '5.0' },
                  ],
                },
                {
                  label: 'Min Followers',
                  value: followersFilter,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange: (v: string) => setFollowersFilter(v as any),
                  options: [
                    { value: 'any', label: 'Any followers' },
                    { value: '10', label: '10+' },
                    { value: '50', label: '50+' },
                    { value: '100', label: '100+' },
                  ],
                },
              ].map(group => (
                <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px' }}>
                  <span
                    style={{
                      fontFamily: '"Space Mono", ui-monospace, monospace',
                      fontSize: '9px',
                      letterSpacing: '0.3em',
                      textTransform: 'uppercase',
                      color: '#444',
                    }}
                  >
                    {group.label}
                  </span>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={group.value}
                      onChange={e => group.onChange(e.target.value)}
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid #1a1a1a',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontFamily: 'Georgia, serif',
                        padding: '6px 24px 6px 0',
                        outline: 'none',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      {group.options.map(opt => (
                        <option key={opt.value} value={opt.value} style={{ background: '#000', color: '#fff' }}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      style={{
                        position: 'absolute',
                        right: '0',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '12px',
                        height: '12px',
                        color: '#666',
                        pointerEvents: 'none',
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Results */}
            {talentLoading ? (
              <p style={{ fontSize: '13px', color: '#444' }}>Loading talent…</p>
            ) : filteredTalent.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.7 }}>
                No servers match these filters. Try widening the criteria.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredTalent.map(t => {
                  const contacted = contactedIds.has(t.id)
                  const contacting = contactingId === t.id
                  return (
                    <TalentCard
                      key={t.id}
                      t={t}
                      contacted={contacted}
                      contacting={contacting}
                      onContact={() => handleContact(t)}
                    />
                  )
                })}
              </div>
            )}
          </MotionSection>
        )}

        <div style={{ height: '1px', background: '#0d0d0d', marginTop: '8px' }} />
        <div style={{ paddingTop: '32px', paddingBottom: '32px' }}>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: '"Space Mono", ui-monospace, monospace',
              fontSize: '10px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#444',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
          >
            Sign Out →
          </button>
        </div>
      </main>
    </div>
  )
}
