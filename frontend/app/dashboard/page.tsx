'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import QRCode from 'react-qr-code'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

const QR_DURATION_MS = 8 * 60 * 60 * 1000 // 8 hours

function useQRCode() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [activatedAt, setActivatedAt] = useState<number | null>(null)
  const [msLeft, setMsLeft] = useState(0)

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const code = localStorage.getItem('slate-qr-code')
    const ts = localStorage.getItem('slate-qr-activated-at')
    if (code && ts) {
      const activated = parseInt(ts, 10)
      const remaining = activated + QR_DURATION_MS - Date.now()
      if (remaining > 0) {
        setQrCode(code)
        setActivatedAt(activated)
        setMsLeft(remaining)
      } else {
        localStorage.removeItem('slate-qr-code')
        localStorage.removeItem('slate-qr-activated-at')
      }
    }
  }, [])

  // Countdown tick
  useEffect(() => {
    if (!activatedAt) return
    const id = setInterval(() => {
      const remaining = activatedAt + QR_DURATION_MS - Date.now()
      if (remaining <= 0) {
        deactivate()
      } else {
        setMsLeft(remaining)
      }
    }, 10000) // update every 10s
    return () => clearInterval(id)
  }, [activatedAt])

  function activate() {
    const code = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    const now = Date.now()
    localStorage.setItem('slate-qr-code', code)
    localStorage.setItem('slate-qr-activated-at', String(now))
    setQrCode(code)
    setActivatedAt(now)
    setMsLeft(QR_DURATION_MS)
  }

  function deactivate() {
    localStorage.removeItem('slate-qr-code')
    localStorage.removeItem('slate-qr-activated-at')
    setQrCode(null)
    setActivatedAt(null)
    setMsLeft(0)
  }

  function formatCountdown(ms: number) {
    const totalMins = Math.ceil(ms / 60000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  return { qrCode, msLeft, activate, deactivate, formatCountdown }
}

// ── Workplace section ──────────────────────────────────────────────────────────

type Workplace = { id: string; restaurant_name: string; is_primary: boolean; currently_working: boolean }

function WorkplaceSection({ serverId }: { serverId: string | null }) {
  const [open, setOpen] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [newVenue, setNewVenue] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [confirmedPlace, setConfirmedPlace] = useState<{ name: string; address: string } | null>(null)
  const [isPrimary, setIsPrimary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  async function loadWorkplaces() {
    if (!serverId) return
    const { data } = await supabase
      .from('server_restaurants')
      .select('id, restaurant_name, is_primary, currently_working')
      .eq('server_id', serverId)
      .eq('currently_working', true)
    if (data) setWorkplaces(data as Workplace[])
  }

  useEffect(() => {
    loadWorkplaces()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId])

  useEffect(() => {
    if (!open || !googleLoaded || !inputRef.current || confirmedPlace) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google
    if (!google?.maps?.places) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment'],
      componentRestrictions: { country: 'us' },
    })

    const style = document.createElement('style')
    style.innerHTML = '.pac-container { z-index: 99999 !important; pointer-events: all !important; }'
    document.head.appendChild(style)

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const name = place.name ?? ''
      const address = place.formatted_address ?? ''
      setNewVenue(name)
      setNewAddress(address)
      setConfirmedPlace({ name, address })
    })

    const input = inputRef.current
    const suppressEnter = (e: KeyboardEvent) => { if (e.key === 'Enter') e.preventDefault() }
    input.addEventListener('keydown', suppressEnter)
    return () => { input.removeEventListener('keydown', suppressEnter); style.remove() }
  }, [open, googleLoaded, confirmedPlace])

  async function handleSave() {
    if (!confirmedPlace || !serverId) return
    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('server_restaurants').insert({
      server_id: serverId,
      restaurant_name: newVenue,
      restaurant_address: newAddress,
      is_primary: isPrimary,
      currently_working: true,
      start_date: today,
    })
    if (error) console.error('[supabase] workplace insert:', error)
    setSaving(false)
    setSaved(true)
    loadWorkplaces()
    setTimeout(() => { setSaved(false); setOpen(false); setConfirmedPlace(null); setNewVenue(''); setNewAddress(''); setIsPrimary(false) }, 2000)
  }

  return (
    <div className="mb-8 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY}&libraries=places`}
        onLoad={() => setGoogleLoaded(true)}
      />
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">My workplace</p>
        <button
          onClick={() => { setOpen(o => !o); setConfirmedPlace(null); setNewVenue(''); setNewAddress('') }}
          className="text-xs transition-colors hover:text-white"
          style={{ color: '#606060' }}
        >
          {open ? 'Cancel' : 'Update workplace'}
        </button>
      </div>

      {/* Current workplaces */}
      <div className="mb-4 flex flex-col gap-2">
        {workplaces.length === 0 && (
          <p className="text-xs" style={{ color: '#606060' }}>No current workplaces. Add one below.</p>
        )}
        {workplaces.map(w => (
          <div key={w.id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">{w.restaurant_name}</p>
              {w.is_primary && (
                <p className="text-xs" style={{ color: '#606060' }}>Primary workplace</p>
              )}
            </div>
            <button
              onClick={async () => {
                await supabase.from('server_restaurants').update({ currently_working: false }).eq('id', w.id)
                loadWorkplaces()
              }}
              className="text-xs transition-colors hover:text-white"
              style={{ color: '#404040' }}
            >
              I no longer work here
            </button>
          </div>
        ))}
      </div>

      {/* Add new workplace form */}
      {open && (
        <div className="border-t border-white/10 pt-5">
          <p className="mb-3 text-xs font-medium" style={{ color: '#A0A0A0' }}>Add a workplace</p>

          {confirmedPlace ? (
            <div className="mb-3 flex items-start justify-between rounded-xl border border-white/20 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{confirmedPlace.name}</p>
                <p className="text-xs" style={{ color: '#606060' }}>{confirmedPlace.address}</p>
              </div>
              <button
                onClick={() => { setConfirmedPlace(null); setNewVenue(''); setNewAddress(''); if (inputRef.current) inputRef.current.value = '' }}
                className="ml-3 shrink-0 text-xs transition-colors hover:text-white"
                style={{ color: '#606060' }}
              >
                Change
              </button>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for restaurant or bar…"
              className="mb-3 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
            />
          )}

          <label className="mb-4 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={e => setIsPrimary(e.target.checked)}
              className="accent-white"
            />
            <span className="text-xs font-medium text-white">This is my primary workplace</span>
          </label>

          {saved ? (
            <p className="text-xs font-medium text-white">Workplace updated.</p>
          ) : (
            <button
              disabled={!confirmedPlace || saving}
              onClick={handleSave}
              className="rounded-full bg-white px-6 py-2.5 text-xs font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              {saving ? 'Saving…' : 'Save workplace'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Worker Council / Suggestions ──────────────────────────────────────────────

type Suggestion = {
  id: string
  title: string
  description: string | null
  upvotes: number
  status: 'pending' | 'reviewed' | 'implemented'
}

const STATUS_LABEL: Record<Suggestion['status'], string> = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  implemented: 'Implemented',
}

function WorkerCouncilSection() {
  const [mounted, setMounted] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set())

  useEffect(() => {
    setMounted(true)
    fetchSuggestions()
  }, [])

  async function fetchSuggestions() {
    const { data } = await supabase
      .from('suggestions')
      .select('id, title, description, upvotes, status')
      .order('upvotes', { ascending: false })
      .limit(5)
    if (data) setSuggestions(data as Suggestion[])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from('suggestions').insert({
      title: title.trim(),
      description: description.trim() || null,
      upvotes: 0,
      status: 'pending',
    })
    if (error) console.error('[supabase] suggestion insert:', error)
    setSubmitting(false)
    setSubmitted(true)
    setTitle('')
    setDescription('')
    fetchSuggestions()
  }

  async function handleUpvote(id: string, current: number) {
    if (upvoted.has(id)) return
    setUpvoted(prev => new Set(prev).add(id))
    setSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, upvotes: s.upvotes + 1 } : s)
    )
    await supabase.from('suggestions').update({ upvotes: current + 1 }).eq('id', id)
  }

  if (!mounted) return null

  return (
    <div className="mt-8 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
          Worker Council
        </p>
        <h2 className="mb-1 text-xl font-bold tracking-tight text-white">Your voice matters.</h2>
        <p className="text-sm" style={{ color: '#606060' }}>
          Suggest a feature or improvement. The most upvoted ideas get built first.
        </p>
      </div>

      {/* Submit form */}
      {submitted ? (
        <div className="mb-8 flex items-center gap-2 rounded-xl border border-white/10 px-4 py-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <p className="text-sm font-medium text-white">
            Your suggestion has been submitted. Thank you for helping build Slate.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-8 flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
              What&apos;s your suggestion?
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Add a way to share my profile link on Instagram"
              required
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: '#A0A0A0' }}>
              Tell us more <span style={{ color: '#404040' }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Any extra context or details…"
              rows={3}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
              style={{ resize: 'none' }}
            />
          </div>
          <button
            type="submit"
            disabled={!title.trim() || submitting}
            className="self-start rounded-full bg-white px-6 py-2.5 text-xs font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            {submitting ? 'Submitting…' : 'Submit suggestion'}
          </button>
        </form>
      )}

      {/* Top suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#404040' }}>
            Top suggestions
          </p>
          <div className="flex flex-col gap-2">
            {suggestions.map(s => (
              <div
                key={s.id}
                className="flex items-start gap-4 rounded-xl border border-white/10 px-4 py-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                {/* Upvote */}
                <button
                  onClick={() => handleUpvote(s.id, s.upvotes)}
                  disabled={upvoted.has(s.id)}
                  className="flex shrink-0 flex-col items-center gap-0.5 transition-opacity hover:opacity-80 disabled:opacity-30"
                  aria-label="Upvote"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                  </svg>
                  <span className="font-mono text-xs font-semibold text-white">{s.upvotes}</span>
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="mb-0.5 text-sm font-semibold text-white">{s.title}</p>
                  {s.description && (
                    <p className="text-xs leading-5" style={{ color: '#606060' }}>{s.description}</p>
                  )}
                </div>

                {/* Status badge */}
                <span
                  className="shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                  style={{
                    borderColor: s.status === 'implemented' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)',
                    color: s.status === 'implemented' ? 'white' : '#606060',
                  }}
                >
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()

  // Server profile + activity data
  const [serverProfile, setServerProfile] = useState<{
    id: string
    name: string
    total_ratings: number
    avg_rating: number
    follower_count: number
  } | null>(null)
  const [recentRatings, setRecentRatings] = useState<{
    id: string
    guest_name: string | null
    score: number
    created_at: string
    comment: string | null
  }[]>([])
  const [recentFollowers, setRecentFollowers] = useState<{ id: string; created_at: string }[]>([])
  const [profileLoading, setProfileLoading] = useState(true)

  // Restaurant picker — shown before shift starts
  const [restaurants, setRestaurants] = useState<{ id: string; restaurant_name: string; is_primary: boolean; restaurant_address: string | null }[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('')
  const [showRestaurantPicker, setShowRestaurantPicker] = useState(false)

  // GPS shift verification
  const [shiftGpsError, setShiftGpsError] = useState<string | null>(null)
  const [shiftGpsLoading, setShiftGpsLoading] = useState(false)
  const [pendingShiftRestaurant, setPendingShiftRestaurant] = useState<string | null>(null)

  // Load all dashboard data scoped to the logged-in server
  useEffect(() => {
    async function loadDashboardData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/login'); return }

      console.log('[Dashboard] Loading for auth user:', session.user.id)

      // Primary lookup: wallet_address = Supabase auth UID (set at signup)
      const { data: serverData, error } = await supabase
        .from('servers')
        .select('id, name, role, average_rating, total_ratings, follower_count, is_founding_member')
        .eq('wallet_address', session.user.id)
        .maybeSingle()

      console.log('[Dashboard] Server data:', serverData, error ?? '')

      if (!serverData) {
        // Fallback: email match for accounts created before wallet_address was wired up
        const { data: byEmail } = await supabase
          .from('servers')
          .select('id, name, role, average_rating, total_ratings, follower_count, is_founding_member')
          .ilike('email', session.user.email ?? '')
          .maybeSingle()
        if (!byEmail) { setProfileLoading(false); return }
        console.log('[Dashboard] Found by email fallback')
        await hydrateFromServerRow(byEmail, session.user.id)
        return
      }

      await hydrateFromServerRow(serverData, session.user.id)
    }

    // Separate helper so both lookup paths share the same data-loading logic
    async function hydrateFromServerRow(
      row: { id: string; name: string | null; role?: string | null; average_rating: number | null; total_ratings: number | null; follower_count?: number | null; is_founding_member?: boolean | null },
      authUserId: string
    ) {
      // Keep wallet_address in sync for future logins
      await supabase.from('servers').update({ wallet_address: authUserId }).eq('id', row.id).eq('wallet_address', null as unknown as string)

      const resolvedName = row.name || localStorage.getItem('slateServerName') || ''
      localStorage.setItem('slateServerId', row.id)
      localStorage.setItem('slateUserType', 'server')
      if (resolvedName) localStorage.setItem('slateServerName', resolvedName)

      // Restaurants — use row.id (servers UUID), NOT the auth UID
      const { data: restRows } = await supabase
        .from('server_restaurants')
        .select('id, restaurant_name, is_primary, restaurant_address')
        .eq('server_id', row.id)
        .eq('currently_working', true)
      const rows = restRows ?? []
      console.log('[Dashboard] Restaurants found:', rows.length)
      setRestaurants(rows)
      if (rows.length === 1) setSelectedRestaurant(rows[0].restaurant_name)

      // Followers
      const { data: followRows } = await supabase
        .from('follows')
        .select('id, created_at')
        .eq('server_id', row.id)
      const followerCount = followRows?.length ?? (row.follower_count ?? 0)
      setRecentFollowers((followRows ?? []).slice(0, 5) as { id: string; created_at: string }[])

      // Ratings
      const { data: ratingRows } = await supabase
        .from('ratings')
        .select('id, guest_name, score, created_at, comment')
        .eq('server_id', row.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (ratingRows) setRecentRatings(ratingRows as typeof recentRatings)

      setServerProfile({
        id: row.id,
        name: resolvedName,
        total_ratings: row.total_ratings ?? 0,
        avg_rating: row.average_rating ?? 0,
        follower_count: followerCount,
      })
      setProfileLoading(false)
    }

    loadDashboardData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [copied, setCopied] = useState(false)
  const [shiftToast, setShiftToast] = useState(false)
  const { qrCode, msLeft, activate, deactivate, formatCountdown } = useQRCode()

  // Vibe check — shown inline after shift starts
  const [vibeSubmitted, setVibeSubmitted] = useState(false)
  const [selectedVibe, setSelectedVibe] = useState<'CHILL' | 'LIVE' | 'PACKED' | null>(null)
  const [shiftCovers, setShiftCovers] = useState('')
  const [shiftSpecials, setShiftSpecials] = useState('')
  const [shiftDbId, setShiftDbId] = useState<string | null>(null)

  // Shift state — mirrors QR: shift is on when a QR code is active
  const [shiftStartedAt, setShiftStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0) // seconds on shift

  // When QR activates, record shift start
  const isOnShift = !!qrCode

  useEffect(() => {
    if (qrCode && !shiftStartedAt) {
      const stored = localStorage.getItem('slate-qr-activated-at')
      setShiftStartedAt(stored ? parseInt(stored, 10) : Date.now())
    }
    if (!qrCode) {
      setShiftStartedAt(null)
      setElapsed(0)
    }
  }, [qrCode, shiftStartedAt])

  // Dismiss shift toast after 4 s
  useEffect(() => {
    if (!shiftToast) return
    const t = setTimeout(() => setShiftToast(false), 4000)
    return () => clearTimeout(t)
  }, [shiftToast])

  // Elapsed counter — ticks every second while on shift
  useEffect(() => {
    if (!shiftStartedAt) return
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - shiftStartedAt) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [shiftStartedAt])

  function formatElapsed(secs: number) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  function formatShiftStart(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function handleCopy() {
    const id = serverProfile?.id ?? ''
    navigator.clipboard.writeText(`https://slatenow.xyz/server/${id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function doStartShift(restaurantName: string, gpsVerified: boolean, distanceMeters: number | null, userLat: number | null, userLng: number | null) {
    activate()
    setShiftToast(true)
    setShowRestaurantPicker(false)
    setShiftGpsError(null)
    const { data, error } = await supabase.from('shifts').insert({
      restaurant_name: restaurantName,
      started_at: new Date().toISOString(),
      is_active: true,
      gps_verified: gpsVerified,
      distance_meters: distanceMeters,
      user_lat: userLat,
      user_lng: userLng,
    }).select('id').single()
    if (error) console.error('[supabase] shift start:', error)
    else setShiftDbId(data.id)
  }

  async function startShift(restaurantName: string) {
    setShowRestaurantPicker(false)
    setShiftGpsError(null)
    setShiftGpsLoading(true)
    setPendingShiftRestaurant(restaurantName)

    // Step 1 — request GPS
    let userLat: number
    let userLng: number

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      )
      userLat = pos.coords.latitude
      userLng = pos.coords.longitude
    } catch {
      // GPS denied or unavailable — allow shift without verification
      setShiftGpsLoading(false)
      await doStartShift(restaurantName, false, null, null, null)
      return
    }

    // Step 2 — geocode via REST API (avoids silent SDK callback failures)
    let venueLat: number | null = null
    let venueLng: number | null = null

    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(restaurantName + ' New York')}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY}`
      const res = await fetch(geocodeUrl)
      const data = await res.json()
      if (data.status === 'OK' && data.results[0]) {
        venueLat = data.results[0].geometry.location.lat
        venueLng = data.results[0].geometry.location.lng
      }
    } catch {
      // Geocoding fetch failed — proceed without distance check
    }

    if (venueLat === null || venueLng === null) {
      // Couldn't get venue coordinates — allow without blocking
      setShiftGpsLoading(false)
      await doStartShift(restaurantName, false, null, userLat, userLng)
      return
    }

    // Step 3 — Haversine distance
    const R = 6371000
    const dLat = (venueLat - userLat) * Math.PI / 180
    const dLon = (venueLng - userLng) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(userLat * Math.PI / 180) * Math.cos(venueLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    const distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))

    setShiftGpsLoading(false)

    // Step 4 — hard block if too far
    if (distance > 500) {
      setShiftGpsError(
        `You must be at ${restaurantName} to start your shift. You are ${distance}m away.`
      )
      return
    }

    // Step 5 — within range, start shift
    await doStartShift(restaurantName, true, distance, userLat, userLng)
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-5xl px-8 py-12 lg:px-16">

        {/* ── Shift Status Card ───────────────────────────────────────── */}
        <div
          className="mb-10 rounded-2xl p-7"
          style={{
            border: isOnShift ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.12)',
            backgroundColor: isOnShift ? 'rgba(255,255,255,0.04)' : '#0a0a0a',
          }}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {/* Status pill */}
              <div className="mb-3 flex items-center gap-2">
                {isOnShift ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                      On Shift
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-block h-2 w-2 rounded-full bg-white/20" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
                      Off Shift
                    </span>
                  </>
                )}
              </div>

              {/* Headline */}
              <h2 className="mb-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {isOnShift ? "You're live tonight 🔥" : "You're off the clock"}
              </h2>

              {/* Sub */}
              <p className="text-sm leading-relaxed" style={{ color: isOnShift ? '#A0A0A0' : '#606060' }}>
                {isOnShift
                  ? 'Guests near your venue can see you\'re working right now.'
                  : 'Toggle on when your shift starts to appear on the live map.'}
              </p>

              {/* Shift time info */}
              {isOnShift && shiftStartedAt && (
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <span className="text-xs" style={{ color: '#606060' }}>
                    Shift started: <span className="text-white">{formatShiftStart(shiftStartedAt)}</span>
                  </span>
                  <span className="text-xs" style={{ color: '#606060' }}>
                    Active for: <span className="font-mono text-white">{formatElapsed(elapsed)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Toggle button */}
            <button
              onClick={async () => {
                if (isOnShift) {
                  // Mark shift inactive in Supabase
                  if (shiftDbId) {
                    supabase.from('shifts').update({ is_active: false, ended_at: new Date().toISOString() })
                      .eq('id', shiftDbId).then(({ error }) => { if (error) console.error('[supabase] shift end:', error) })
                  }
                  deactivate()
                  setVibeSubmitted(false)
                  setSelectedVibe(null)
                  setShiftCovers('')
                  setShiftSpecials('')
                  setShiftDbId(null)
                  setShowRestaurantPicker(false)
                } else {
                  // Show restaurant picker (or skip if auto-selected and only one)
                  if (restaurants.length <= 1 && selectedRestaurant) {
                    await startShift(selectedRestaurant)
                  } else {
                    setShowRestaurantPicker(true)
                  }
                }
              }}
              className={[
                'shrink-0 rounded-full px-8 py-4 text-sm font-bold transition-all',
                isOnShift
                  ? 'border border-white/30 text-white hover:border-white'
                  : 'bg-white text-black hover:opacity-80',
              ].join(' ')}
            >
              {isOnShift ? 'End Shift' : 'Start Shift'}
            </button>
          </div>

          {/* Restaurant picker — shown before shift starts */}
          {showRestaurantPicker && !isOnShift && (
            <div className="mt-7 border-t border-white/10 pt-7">
              <p className="mb-4 text-sm font-semibold text-white">Which restaurant are you working at today?</p>
              <div className="flex flex-col gap-2">
                {restaurants.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRestaurant(r.restaurant_name); startShift(r.restaurant_name) }}
                    className={[
                      'flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors',
                      selectedRestaurant === r.restaurant_name
                        ? 'border-white bg-white/5'
                        : 'border-white/15 hover:border-white/40',
                    ].join(' ')}
                  >
                    <span className="text-sm font-medium text-white">{r.restaurant_name}</span>
                    {r.is_primary && (
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#606060' }}>
                        Primary
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowRestaurantPicker(false)}
                className="mt-4 text-xs transition-colors hover:text-white"
                style={{ color: '#606060' }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* GPS loading */}
          {shiftGpsLoading && !isOnShift && (
            <div className="mt-7 border-t border-white/10 pt-7">
              <div className="flex items-center gap-3">
                <svg className="h-4 w-4 animate-spin text-white/40" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-sm" style={{ color: '#A0A0A0' }}>Verifying your location…</p>
              </div>
            </div>
          )}

          {/* GPS shift error — hard block when server is too far from workplace */}
          {shiftGpsError && !isOnShift && !shiftGpsLoading && (
            <div className="mt-7 border-t border-white/10 pt-7">
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-5">
                <div className="mb-4 flex items-start gap-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mt-0.5 h-5 w-5 shrink-0 text-red-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <p className="text-sm font-medium leading-5" style={{ color: '#fca5a5' }}>{shiftGpsError}</p>
                </div>
                <button
                  onClick={() => { if (pendingShiftRestaurant) startShift(pendingShiftRestaurant) }}
                  className="w-full rounded-full border border-red-500/30 py-2.5 text-xs font-semibold text-red-400 transition-opacity hover:opacity-80"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* QR section — only when on shift */}
          {isOnShift && qrCode && (
            <div className="mt-7 border-t border-white/10 pt-7">
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                <div className="rounded-2xl bg-white p-4">
                  <QRCode
                    value={`https://slatenow.xyz/scan/${qrCode}`}
                    size={120}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">Your shift QR is active</p>
                    <span className="rounded-full border border-white/20 bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      {formatCountdown(msLeft)} left
                    </span>
                  </div>
                  <p className="mb-4 text-xs leading-relaxed" style={{ color: '#606060' }}>
                    Show this to guests after great service. They scan to rate and follow you — no app needed.
                  </p>
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="flex-1 truncate font-mono text-xs" style={{ color: '#606060' }}>
                      slatenow.xyz/scan/{qrCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vibe check — inline questions */}
              <div className="mt-7 border-t border-white/10 pt-7">
                {vibeSubmitted ? (
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <p className="text-xs font-medium text-white">Vibe submitted — your venue is on the live map.</p>
                  </div>
                ) : (
                  <>
                    <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      Quick check-in
                    </p>

                    {/* Q1: Vibe */}
                    <div className="mb-5">
                      <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>What&apos;s the vibe right now?</p>
                      <div className="flex gap-2">
                        {(['CHILL', 'LIVE', 'PACKED'] as const).map(v => (
                          <button
                            key={v}
                            onClick={() => setSelectedVibe(v)}
                            className={[
                              'flex-1 rounded-xl border py-2.5 text-xs font-semibold transition-colors',
                              selectedVibe === v
                                ? 'border-white bg-white text-black'
                                : 'border-white/15 text-white hover:border-white/40',
                            ].join(' ')}
                          >
                            {v === 'CHILL' ? '🧊' : v === 'LIVE' ? '🔥' : '🚀'} {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Q2: Covers */}
                    <div className="mb-5">
                      <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>How many covers tonight so far?</p>
                      <input
                        type="number"
                        min="0"
                        value={shiftCovers}
                        onChange={e => setShiftCovers(e.target.value)}
                        placeholder="e.g. 24"
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
                      />
                    </div>

                    {/* Q3: Specials */}
                    <div className="mb-5">
                      <p className="mb-2 text-xs font-medium" style={{ color: '#A0A0A0' }}>Any specials to share? <span style={{ color: '#606060' }}>(optional)</span></p>
                      <input
                        type="text"
                        value={shiftSpecials}
                        onChange={e => setShiftSpecials(e.target.value)}
                        placeholder="e.g. Truffle pasta, $18 negronis"
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40"
                      />
                    </div>

                    <button
                      disabled={!selectedVibe}
                      onClick={async () => {
                        if (!selectedVibe) return
                        // Update shift row with vibe data
                        if (shiftDbId) {
                          const { error } = await supabase.from('shifts').update({
                            vibe: selectedVibe,
                            covers: shiftCovers ? parseInt(shiftCovers) : null,
                            specials: shiftSpecials || null,
                          }).eq('id', shiftDbId)
                          if (error) console.error('[supabase] vibe update:', error)
                        }
                        setVibeSubmitted(true)
                      }}
                      className="rounded-full bg-white px-6 py-2.5 text-xs font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-30"
                    >
                      Submit check-in
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Update workplace ────────────────────────────────────────── */}
        <WorkplaceSection serverId={serverProfile?.id ?? null} />

        {/* ── Header ──────────────────────────────────────────────────── */}
        {profileLoading ? (
          <div className="mb-10">
            <p className="text-sm" style={{ color: '#606060' }}>Loading your profile…</p>
          </div>
        ) : !serverProfile ? (
          <div className="mb-10 rounded-2xl border border-white/10 p-7" style={{ backgroundColor: '#0a0a0a' }}>
            <p className="text-sm font-semibold text-white">Setting up your profile…</p>
            <p className="mt-1 text-xs" style={{ color: '#606060' }}>
              We&apos;re still saving your info. Try refreshing in a moment. If this persists, sign out and sign back in.
            </p>
          </div>
        ) : (
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Welcome back, {serverProfile.name.split(' ')[0]}
              </h1>
              {/* Verified badge */}
              <span title="Verified on-chain profile">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 shrink-0">
                  <circle cx="12" cy="12" r="12" fill="white" />
                  <path d="M7 12.5l3.5 3.5 6.5-7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <p className="mt-1 text-sm font-medium" style={{ color: '#4ade80' }}>
              Your profile is live on Slate ✓
            </p>
          </div>
          <a
            href={`/server/${serverProfile.id}`}
            className="self-start rounded-full border border-white/20 px-5 py-2 text-xs font-semibold text-white transition-colors hover:border-white sm:self-auto"
          >
            View public profile →
          </a>
        </div>
        )}

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Ratings', value: serverProfile?.total_ratings ?? 0 },
            { label: 'Avg Rating', value: serverProfile?.avg_rating ? serverProfile.avg_rating.toFixed(1) : '—' },
            { label: 'Followers', value: serverProfile?.follower_count ?? 0 },
            { label: 'Venues', value: restaurants.length },
            { label: '$SERVE Earned', value: (serverProfile?.total_ratings ?? 0) * 10 },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-1.5 rounded-2xl border border-white/10 p-5"
              style={{ backgroundColor: '#0a0a0a' }}
            >
              <span className="text-2xl font-bold text-white">{value}</span>
              <span className="text-xs" style={{ color: '#A0A0A0' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Two-col layout: rewards + reviews ───────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* $SERVE Rewards */}
          <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">$SERVE Rewards</p>
              <a
                href="/pay"
                className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-80"
              >
                Cash out
              </a>
            </div>

            {/* Balance */}
            <div className="mb-1">
              <span className="text-3xl font-bold text-white">{(serverProfile?.total_ratings ?? 0) * 10}</span>
              <span className="ml-1.5 text-sm font-medium text-white">$SERVE</span>
            </div>
            <p className="mb-5 text-xs" style={{ color: '#A0A0A0' }}>
              {serverProfile?.total_ratings ?? 0} ratings × 10 $SERVE each
            </p>

            <div className="rounded-xl border border-white/10 px-4 py-3">
              <p className="text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
                $SERVE launches on mainnet soon. Keep earning by collecting ratings from guests.
              </p>
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Recent Reviews</p>
              {serverProfile?.id && (
                <a href={`/server/${serverProfile.id}`} className="text-xs transition-colors hover:text-white" style={{ color: '#A0A0A0' }}>
                  View all →
                </a>
              )}
            </div>

            {recentRatings.length === 0 ? (
              <p className="text-xs" style={{ color: '#606060' }}>No reviews yet. Share your QR code to collect your first rating.</p>
            ) : (
              <div className="flex flex-col gap-0">
                {recentRatings.map((r, i) => (
                  <div key={r.id}>
                    <div className="py-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{r.guest_name ?? 'Guest'}</span>
                          <span className="text-xs tracking-wide" style={{ color: '#A0A0A0' }}>
                            {'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}
                          </span>
                        </div>
                        <span className="text-[10px]" style={{ color: '#606060' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
                          &ldquo;{r.comment}&rdquo;
                        </p>
                      )}
                    </div>
                    {i < recentRatings.length - 1 && <div className="border-t border-white/10" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Two-col layout: following + career ──────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Your Following */}
          <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Your Followers</p>
              <span className="text-2xl font-bold text-white">{serverProfile?.follower_count ?? 0}</span>
            </div>

            {recentFollowers.length === 0 ? (
              <p className="mb-5 text-xs" style={{ color: '#606060' }}>No followers yet. Share your profile link to grow your following.</p>
            ) : (
              <div className="mb-5 flex flex-col gap-0">
                {recentFollowers.map((f, i) => (
                  <div key={f.id}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white">
                          G
                        </div>
                        <span className="text-sm text-white">Guest</span>
                      </div>
                      <span className="text-xs" style={{ color: '#606060' }}>
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {i < recentFollowers.length - 1 && <div className="border-t border-white/10" />}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-white/10 px-4 py-3">
              <p className="text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
                Your followers get notified when you move to a new restaurant.
              </p>
            </div>
          </div>

          {/* Career History */}
          <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Career History</p>
              <p className="text-xs" style={{ color: '#A0A0A0' }}>Verified on-chain</p>
            </div>

            <div className="mb-5">
              {restaurants.length === 0 ? (
                <p className="text-xs" style={{ color: '#606060' }}>No venues added yet. Add a workplace above.</p>
              ) : (
                restaurants.map((r, i) => (
                  <div key={r.id}>
                    <div className="flex flex-col gap-0.5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{r.restaurant_name}</span>
                        {r.is_primary && (
                          <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: '#A0A0A0' }}>Server</span>
                      </div>
                    </div>
                    {i < restaurants.length - 1 && <div className="border-t border-white/10" />}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-full rounded-xl border border-white/15 py-2.5 text-xs font-medium text-white transition-colors hover:border-white"
            >
              + Add new restaurant
            </button>
          </div>
        </div>

        {/* ── My QR Code ──────────────────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">My QR Code</p>
              <p className="mt-0.5 text-xs" style={{ color: '#A0A0A0' }}>
                Let guests scan to rate and follow you instantly
              </p>
            </div>
            {qrCode && (
              <span className="rounded-full border border-white/20 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white">
                Active {formatCountdown(msLeft)}
              </span>
            )}
          </div>

          {qrCode ? (
            <>
              {/* QR code */}
              <div className="mb-5 flex flex-col items-center gap-5">
                <div className="rounded-2xl bg-white p-5">
                  <QRCode
                    value={`https://slatenow.xyz/scan/${qrCode}`}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <p className="max-w-xs text-center text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
                  Show this to your guests so they can rate and follow you
                </p>
              </div>

              {/* URL + deactivate */}
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="flex-1 truncate font-mono text-xs" style={{ color: '#606060' }}>
                  slatenow.xyz/scan/{qrCode}
                </span>
              </div>
              <button
                onClick={deactivate}
                className="w-full rounded-full border border-white/20 py-3 text-xs font-semibold text-white transition-colors hover:border-white"
              >
                Deactivate
              </button>
            </>
          ) : (
            <button
              onClick={activate}
              className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              Activate my QR code
            </button>
          )}
        </div>

        {/* ── Share your profile ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
          <p className="mb-1.5 text-sm font-semibold text-white">Share your profile</p>
          <p className="mb-5 text-xs" style={{ color: '#A0A0A0' }}>
            Let guests find and follow you directly.
          </p>

          {/* Profile URL */}
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
            <span className="flex-1 truncate font-mono text-xs text-white">
              slatenow.xyz/server/{serverProfile?.id ?? '…'}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          {/* Social share buttons */}
          <div className="flex gap-3">
            <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-xs font-medium text-white transition-colors hover:border-white">
              {/* Instagram gradient icon simplified to white for B&W design */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
              </svg>
              Instagram
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-xs font-medium text-white transition-colors hover:border-white">
              {/* X / Twitter */}
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </button>
          </div>
        </div>

        {/* ── Worker Council ──────────────────────────────────────────── */}
        <WorkerCouncilSection />

      </main>

      {/* ── Shift start toast ───────────────────────────────────────── */}
      <div
        className={[
          'fixed right-6 top-6 z-50 max-w-sm rounded-2xl border border-white/15 bg-black px-5 py-4 shadow-2xl transition-all duration-500',
          shiftToast ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0 pointer-events-none',
        ].join(' ')}
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px rgba(0,0,0,0.8)' }}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth={2.5} className="h-3 w-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Shift started</p>
            <p className="mt-0.5 text-xs leading-5" style={{ color: '#A0A0A0' }}>
              ✓ Your followers have been notified you&apos;re on shift.
            </p>
          </div>
        </div>
        {/* Progress bar draining over 4 s */}
        <div className="mt-3 h-0.5 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full bg-white/40"
            style={{
              width: shiftToast ? '0%' : '100%',
              transition: shiftToast ? 'width 4s linear' : 'none',
            }}
          />
        </div>
      </div>

      {/* ── Sign out ──────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10 px-8 py-8 lg:px-16">
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          className="text-xs font-medium transition-colors hover:text-white"
          style={{ color: '#404040' }}
        >
          Sign out →
        </button>
      </div>

    </div>
  )
}
