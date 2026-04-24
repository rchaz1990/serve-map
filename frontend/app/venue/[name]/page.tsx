'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface VibeReport {
  id: string
  restaurant_name: string
  vibe: string
  bar_seats: string | null
  wait_time: string | null
  gps_verified: boolean
  created_at: string
}

interface ActiveServer {
  id: string
  server_id: string
  servers: {
    id: string
    name: string
    role: string | null
    photo_url: string | null
    average_rating: number | null
    total_ratings: number | null
  } | null
}

interface VenueComment {
  id: string
  created_at: string
  restaurant_name: string
  comment: string
  commenter_email: string | null
  commenter_name: string | null
  likes: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VIBE_META: Record<string, { emoji: string; label: string; tagline: string }> = {
  CHILL:  { emoji: '🧊', label: 'Chill',  tagline: 'Calm energy. Good conversation.' },
  LIVE:   { emoji: '🔥', label: 'Live',   tagline: 'Buzzing energy. Great crowd.' },
  PACKED: { emoji: '🚀', label: 'Packed', tagline: 'Electric. Wall to wall.' },
}

const VIBE_EMOJI: Record<string, string> = { CHILL: '🧊', LIVE: '🔥', PACKED: '🚀' }

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
@keyframes liveDot {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:.4; transform:scale(1.4); }
}
@keyframes packedPulse {
  0%,100% { opacity:.7; transform:scale(1); }
  15%     { opacity:1;  transform:scale(1.03); }
  55%     { opacity:1;  transform:scale(1.02); }
}
@keyframes liveFlicker {
  0%,100% { opacity:.8; }
  20%     { opacity:1; }
  40%     { opacity:.75; }
  60%     { opacity:1; }
}
@keyframes chillBreathe {
  0%,100% { opacity:.85; }
  50%      { opacity:1; }
}
.anim-CHILL  { animation: chillBreathe 4s ease-in-out infinite; }
.anim-LIVE   { animation: liveFlicker 2.2s ease-in-out infinite; }
.anim-PACKED { animation: packedPulse 1.1s ease-in-out infinite; }
`

// ── Vibe submission form ──────────────────────────────────────────────────────

function VibeForm({ venueName, onSubmitted }: { venueName: string; onSubmitted: () => void }) {
  const [open, setOpen] = useState(false)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsVerified, setGpsVerified] = useState(false)
  const [vibe, setVibe] = useState<string | null>(null)
  const [seats, setSeats] = useState<string | null>(null)
  const [wait, setWait] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleOpen() {
    if (open) { setOpen(false); return }
    setOpen(true)
    setGpsVerified(false)
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude
        const userLng = pos.coords.longitude
        setUserCoords({ lat: userLat, lng: userLng })
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(venueName + ' NYC')}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY}`
          )
          const data = await res.json()
          const vLat: number | null = data.results?.[0]?.geometry?.location?.lat ?? null
          const vLng: number | null = data.results?.[0]?.geometry?.location?.lng ?? null
          if (vLat !== null && vLng !== null && getDistanceMeters(userLat, userLng, vLat, vLng) <= 500) {
            setGpsVerified(true)
          }
        } catch { /* silent */ }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  async function handleSubmit() {
    if (!vibe) return
    setSubmitting(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/verify-vibe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session?.user?.id ?? null,
        reporterEmail: session?.user?.email ?? localStorage.getItem('slateUserEmail') ?? undefined,
        restaurantName: venueName,
        vibe, barSeats: seats, waitTime: wait,
        userLat: userCoords?.lat ?? null, userLng: userCoords?.lng ?? null,
        restaurantLat: null, restaurantLng: null,
        gpsVerified,
      }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (res.status === 429 || !res.ok) { setError(json.error ?? 'Something went wrong.'); return }
    setMessage(json.message ?? '')
    setSubmitted(true)
    onSubmitted()
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-white/15 p-6">
        <p className="text-2xl mb-2">{VIBE_EMOJI[vibe ?? ''] ?? '✓'}</p>
        <p className="text-sm font-semibold text-white capitalize">{vibe?.toLowerCase()}</p>
        <p className="mt-1 text-xs" style={{ color: '#606060' }}>Reported just now</p>
        {message && <p className="mt-1 text-xs font-semibold" style={{ color: '#4ade80' }}>{message}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
      <div className="p-6">
        <button
          onClick={handleOpen}
          className="w-full rounded-full bg-white py-3 text-xs font-semibold text-black transition-opacity hover:opacity-80"
        >
          {open ? 'Cancel' : "I'm here right now 📍"}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-6 pb-6 pt-5">
          <p className="mb-5 text-sm font-semibold text-white">
            You&apos;re at {venueName}
            {gpsVerified && (
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                GPS ✓
              </span>
            )}
          </p>

          <div className="mb-4">
            <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>What&apos;s the vibe?</p>
            <div className="flex flex-wrap gap-2">
              {(['CHILL', 'LIVE', 'PACKED'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setVibe(v)}
                  className="flex flex-col items-center gap-1 rounded-xl border px-4 py-3 transition-colors"
                  style={{
                    borderColor: vibe === v ? 'white' : 'rgba(255,255,255,0.2)',
                    backgroundColor: vibe === v ? 'white' : 'black',
                    minWidth: '72px',
                  }}
                >
                  <span style={{ fontSize: '28px', lineHeight: 1 }}>{VIBE_META[v].emoji}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: vibe === v ? 'black' : '#606060' }}>
                    {VIBE_META[v].label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Bar seats?</p>
            <div className="flex flex-wrap gap-2">
              {['Plenty', 'A few', 'None'].map(s => (
                <button key={s} onClick={() => setSeats(s)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{ borderColor: seats === s ? 'white' : 'rgba(255,255,255,0.2)', backgroundColor: seats === s ? 'white' : 'black', color: seats === s ? 'black' : 'white' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Wait time?</p>
            <div className="flex flex-wrap gap-2">
              {['No wait', '~15 min', '30+ min'].map(w => (
                <button key={w} onClick={() => setWait(w)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{ borderColor: wait === w ? 'white' : 'rgba(255,255,255,0.2)', backgroundColor: wait === w ? 'white' : 'black', color: wait === w ? 'black' : 'white' }}>
                  {w}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="mb-3 text-xs" style={{ color: '#f87171' }}>{error}</p>}
          <button
            disabled={!vibe || submitting}
            onClick={handleSubmit}
            className="w-full rounded-full bg-white py-3 text-xs font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            {submitting ? 'Submitting…' : gpsVerified ? 'Share the vibe — earn 5 $SERVE 🍸' : 'Share the vibe — earn 1 $SERVE 🍸'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Comments section ──────────────────────────────────────────────────────────

function CommentsSection({ venueName }: { venueName: string }) {
  const [comments, setComments] = useState<VenueComment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [posting, setPosting] = useState(false)
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from('venue_comments')
      .select('*')
      .eq('restaurant_name', venueName)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setComments(data as VenueComment[])
    setLoading(false)
  }, [venueName])

  useEffect(() => {
    loadComments()
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s))
    const interval = setInterval(loadComments, 30000)
    return () => clearInterval(interval)
  }, [loadComments])

  async function handlePost() {
    const trimmed = text.trim()
    if (!trimmed) return
    setPosting(true)
    const { data: { session: s } } = await supabase.auth.getSession()
    const commenterEmail = s?.user?.email ?? null
    const commenterName = name.trim() || (commenterEmail ? commenterEmail.split('@')[0] : 'Anonymous')
    const { error } = await supabase.from('venue_comments').insert({
      restaurant_name: venueName,
      comment: trimmed,
      commenter_email: commenterEmail,
      commenter_name: commenterName,
    })
    setPosting(false)
    if (!error) {
      setText('')
      loadComments()
    }
  }

  async function handleLike(commentId: string, currentLikes: number) {
    await supabase.from('venue_comments').update({ likes: currentLikes + 1 }).eq('id', commentId)
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: c.likes + 1 } : c))
  }

  return (
    <div>
      <h2
        className="mb-6 text-xs font-bold tracking-[0.25em] text-white"
        style={{ textTransform: 'uppercase', fontVariant: 'small-caps' }}
      >
        Comments
      </h2>

      {/* Post a comment */}
      <div className="mb-8 rounded-2xl border border-white/10 p-5" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
        {!session && (
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="mb-3 w-full border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/30"
            style={{ borderRadius: '6px' }}
          />
        )}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What's the vibe like right now?"
          rows={3}
          className="w-full resize-none border border-white/10 bg-transparent px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/30"
          style={{ borderRadius: '6px' }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost() }}
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[10px]" style={{ color: '#404040' }}>⌘↵ to post</p>
          <button
            onClick={handlePost}
            disabled={!text.trim() || posting}
            className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>

      {/* Comment list */}
      {loading ? (
        <p className="text-xs" style={{ color: '#404040' }}>Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs" style={{ color: '#404040' }}>No comments yet. Be the first.</p>
      ) : (
        <div className="space-y-3">
          {comments.map(c => (
            <div
              key={c.id}
              className="rounded-xl border border-white/8 p-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.015)' }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">
                  {c.commenter_name ?? 'Anonymous'}
                </span>
                <span className="text-[10px]" style={{ color: '#404040' }}>{timeAgo(c.created_at)}</span>
              </div>
              <p className="mb-3 text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{c.comment}</p>
              <button
                onClick={() => handleLike(c.id, c.likes)}
                className="flex items-center gap-1.5 text-[10px] transition-colors hover:text-white"
                style={{ color: '#606060' }}
              >
                <span>♡</span>
                <span>{c.likes > 0 ? c.likes : 'Like'}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function VenuePage() {
  const params = useParams()
  const rawName = params?.name as string
  const venueName = decodeURIComponent(rawName ?? '')

  const [reports, setReports] = useState<VibeReport[]>([])
  const [activeServers, setActiveServers] = useState<ActiveServer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadData = useCallback(async () => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [reportsRes, shiftsRes] = await Promise.all([
      supabase
        .from('vibe_reports')
        .select('*')
        .eq('restaurant_name', venueName)
        .gte('created_at', since24h)
        .order('created_at', { ascending: false }),
      supabase
        .from('shifts')
        .select('id, server_id, servers(id, name, role, photo_url, average_rating, total_ratings)')
        .eq('restaurant_name', venueName)
        .eq('is_active', true),
    ])

    setReports((reportsRes.data ?? []) as VibeReport[])
    setActiveServers((shiftsRes.data ?? []) as unknown as ActiveServer[])
    setLoading(false)
  }, [venueName])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  const latestReport = reports[0] ?? null
  const currentVibe = latestReport?.vibe?.toUpperCase() as keyof typeof VIBE_META | undefined
  const vibeMeta = currentVibe ? VIBE_META[currentVibe] : null

  // Vibe breakdown for today
  const vibeBreakdown = reports.reduce<Record<string, number>>((acc, r) => {
    const v = r.vibe?.toUpperCase()
    if (v) acc[v] = (acc[v] ?? 0) + 1
    return acc
  }, {})

  if (!venueName) return null

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-2xl px-8 py-12 lg:px-6">

        {/* ── Back link ──────────────────────────────────────────────────── */}
        <Link href="/live" className="mb-8 inline-flex items-center gap-2 text-xs transition-colors hover:text-white" style={{ color: '#606060' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Live
        </Link>

        {/* ── Venue header ───────────────────────────────────────────────── */}
        <div className="mb-12">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{venueName}</h1>
            {currentVibe && vibeMeta && (
              <span
                className={`mt-1 shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white anim-${currentVibe}`}
                style={{ border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                {currentVibe}
              </span>
            )}
          </div>

          {vibeMeta ? (
            <div className="flex items-center gap-4">
              <span style={{ fontSize: '48px', lineHeight: 1 }}>{vibeMeta.emoji}</span>
              <div>
                <p className="text-sm font-medium text-white">{vibeMeta.tagline}</p>
                <p className="mt-0.5 text-xs" style={{ color: '#606060' }}>
                  Last reported {timeAgo(latestReport!.created_at)}
                  {latestReport?.gps_verified && (
                    <span
                      className="ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
                    >
                      GPS ✓
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#606060' }}>No reports yet today. Be the first.</p>
          )}
        </div>

        {/* ── I'm here form ──────────────────────────────────────────────── */}
        <div className="mb-12">
          <VibeForm venueName={venueName} onSubmitted={() => setRefreshKey(k => k + 1)} />
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: '#404040' }}>Loading…</p>
        ) : (
          <div className="space-y-12">

            {/* ── Vibe history ───────────────────────────────────────────── */}
            {reports.length > 0 && (
              <div>
                <h2
                  className="mb-6 text-xs font-bold tracking-[0.25em] text-white"
                  style={{ textTransform: 'uppercase', fontVariant: 'small-caps' }}
                >
                  Today&apos;s Vibe History
                </h2>

                {/* Breakdown pills */}
                {Object.keys(vibeBreakdown).length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-2">
                    {Object.entries(vibeBreakdown).map(([v, count]) => (
                      <span
                        key={v}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white"
                      >
                        {VIBE_EMOJI[v] ?? ''} {v.charAt(0) + v.slice(1).toLowerCase()} · {count}
                      </span>
                    ))}
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-2">
                  {reports.map((r, i) => {
                    const v = r.vibe?.toUpperCase()
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-4 rounded-xl px-4 py-3"
                        style={{
                          backgroundColor: i === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                          border: i === 0 ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <span style={{ fontSize: '20px', lineHeight: 1, width: '24px', textAlign: 'center' }}>
                          {VIBE_EMOJI[v] ?? '•'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-white">
                            {v ? v.charAt(0) + v.slice(1).toLowerCase() : r.vibe}
                          </span>
                          {r.bar_seats && (
                            <span className="ml-2 text-[10px]" style={{ color: '#606060' }}>· Seats: {r.bar_seats}</span>
                          )}
                          {r.wait_time && (
                            <span className="ml-1 text-[10px]" style={{ color: '#606060' }}>· Wait: {r.wait_time}</span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {r.gps_verified && (
                            <span style={{ color: '#4ade80', fontSize: '10px' }}>GPS ✓</span>
                          )}
                          <span className="text-[10px]" style={{ color: '#404040' }}>{timeAgo(r.created_at)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Active servers ─────────────────────────────────────────── */}
            {activeServers.length > 0 && (
              <div>
                <h2
                  className="mb-6 text-xs font-bold tracking-[0.25em] text-white"
                  style={{ textTransform: 'uppercase', fontVariant: 'small-caps' }}
                >
                  Servers Here Tonight
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {activeServers.map(shift => {
                    const s = shift.servers
                    if (!s) return null
                    const initials = s.name
                      ? s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : '?'
                    return (
                      <div
                        key={shift.id}
                        className="flex items-center gap-4 rounded-xl border border-white/10 p-4"
                        style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white flex items-center justify-center text-sm font-bold text-black">
                          {s.photo_url
                            ? <img src={s.photo_url} alt={s.name} className="h-full w-full object-cover" />
                            : initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{s.name}</p>
                          {s.role && <p className="text-xs" style={{ color: '#606060' }}>{s.role}</p>}
                          {s.average_rating != null && (
                            <p className="text-xs" style={{ color: '#404040' }}>
                              ★ {s.average_rating.toFixed(1)} · {s.total_ratings ?? 0} reviews
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/rate?server=${s.id}`}
                          className="shrink-0 rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:border-white"
                        >
                          Rate
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Comments ───────────────────────────────────────────────── */}
            <div>
              <CommentsSection venueName={venueName} />
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
