'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'react-qr-code'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type Server = {
  id: string
  name: string
  email: string | null
  role: string | null
  photo_url: string | null
  average_rating: number | null
  total_ratings: number | null
  follower_count: number | null
  serve_balance: number | null
  serve_balance_lifetime: number | null
  is_founding_member: boolean | null
  open_to_opportunities: boolean | null
  specialties: string[] | null
  follow_approval: string | null
  profile_visibility: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT_MONO = '"Space Mono", ui-monospace, SFMono-Regular, monospace'

const SPECIALTY_OPTIONS = [
  'Cocktails', 'Wine', 'Beer', 'Whiskey',
  'Fine Dining', 'Casual Dining', 'Nightlife',
  'Events & Catering',
]

const QR_DURATION_MS = 8 * 60 * 60 * 1000 // 8 hours

const SERVER_SELECT = `
  id, name, email, role, photo_url, average_rating, total_ratings,
  follower_count, serve_balance, serve_balance_lifetime,
  is_founding_member, open_to_opportunities, specialties,
  follow_approval, profile_visibility
`

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  // Core state
  const [loading, setLoading] = useState(true)
  const [server, setServer] = useState<Server | null>(null)
  const [restaurantName, setRestaurantName] = useState('')

  // Shift / QR state
  const [shiftActive, setShiftActive] = useState(false)
  const [shiftStartedAt, setShiftStartedAt] = useState<number | null>(null)
  const [msLeft, setMsLeft] = useState(0)

  // Specialties
  const [editingSpecialties, setEditingSpecialties] = useState(false)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [specialtiesSaving, setSpecialtiesSaving] = useState(false)
  const [specialtiesSaved, setSpecialtiesSaved] = useState(false)

  // Privacy
  const [requireApproval, setRequireApproval] = useState(false)
  const [profileVisibility, setProfileVisibility] = useState('public')
  const [openToOpportunities, setOpenToOpportunities] = useState(true)

  // Worker Council
  const [suggestion, setSuggestion] = useState('')
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false)
  const [suggestionSent, setSuggestionSent] = useState(false)

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      console.log('Session user ID:', session.user.id)
      console.log('Session email:', session.user.email)

      // Primary lookup
      const { data: byWallet, error } = await supabase
        .from('servers')
        .select(SERVER_SELECT)
        .eq('wallet_address', session.user.id)
        .maybeSingle()

      console.log('Server data found:', byWallet)
      console.log('Server query error:', error)

      let row: Server | null = (byWallet as Server | null) ?? null

      // Email fallback — re-points wallet_address so next login uses the fast path
      if (!row && session.user.email) {
        const { data: byEmail } = await supabase
          .from('servers')
          .select(SERVER_SELECT)
          .ilike('email', session.user.email)
          .maybeSingle()

        console.log('Server found by email:', byEmail)

        if (byEmail) {
          await supabase
            .from('servers')
            .update({ wallet_address: session.user.id })
            .eq('id', (byEmail as Server).id)
          row = byEmail as Server
        }
      }

      if (cancelled) return

      if (!row) {
        setLoading(false)
        return
      }

      // Restaurants
      const { data: restaurants } = await supabase
        .from('server_restaurants')
        .select('restaurant_name, is_primary')
        .eq('server_id', row.id)

      const primary = restaurants?.find(r => r.is_primary) || restaurants?.[0]
      const resolvedRestaurantName = primary?.restaurant_name || ''

      if (cancelled) return

      setServer(row)
      setRestaurantName(resolvedRestaurantName)
      setSelectedSpecialties(row.specialties ?? [])
      setRequireApproval((row.follow_approval ?? 'automatic') === 'approval')
      setProfileVisibility(row.profile_visibility ?? 'public')
      setOpenToOpportunities(row.open_to_opportunities ?? true)
      setLoading(false)

      localStorage.setItem('slateUserType', 'server')
      localStorage.setItem('slateServerId', row.id)
      if (row.name) localStorage.setItem('slateServerName', row.name)
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Restore shift state from localStorage on mount ──────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('slate-shift-started-at')
    if (!stored) return
    const ts = parseInt(stored, 10)
    if (Number.isFinite(ts) && Date.now() - ts < QR_DURATION_MS) {
      setShiftActive(true)
      setShiftStartedAt(ts)
    } else {
      localStorage.removeItem('slate-shift-started-at')
    }
  }, [])

  // ── Tick the shift countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (!shiftActive || shiftStartedAt === null) return

    const tick = () => {
      const remaining = QR_DURATION_MS - (Date.now() - shiftStartedAt)
      if (remaining <= 0) {
        setShiftActive(false)
        setShiftStartedAt(null)
        localStorage.removeItem('slate-shift-started-at')
      } else {
        setMsLeft(remaining)
      }
    }

    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [shiftActive, shiftStartedAt])

  function formatCountdown(ms: number) {
    const totalMins = Math.ceil(ms / 60_000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // ── Shift actions ───────────────────────────────────────────────────────────
  async function handleStartShift() {
    if (!server || !restaurantName) return
    const ts = Date.now()
    localStorage.setItem('slate-shift-started-at', String(ts))
    setShiftStartedAt(ts)
    setShiftActive(true)

    await supabase.from('shifts').insert({
      server_id: server.id,
      restaurant_name: restaurantName,
      started_at: new Date().toISOString(),
      is_active: true,
      activated_by: 'self',
    })

    // Notify followers — best effort
    fetch('/api/notify-followers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverId: server.id,
        serverName: server.name,
        restaurantName,
        type: 'shift_started',
      }),
    }).catch(() => {})
  }

  async function handleEndShift() {
    if (!server) return
    setShiftActive(false)
    setShiftStartedAt(null)
    localStorage.removeItem('slate-shift-started-at')

    await supabase
      .from('shifts')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('server_id', server.id)
      .eq('is_active', true)
  }

  // ── Specialties ─────────────────────────────────────────────────────────────
  function toggleSpecialty(spec: string) {
    setSelectedSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec],
    )
  }

  async function saveSpecialties() {
    if (!server) return
    setSpecialtiesSaving(true)
    const { error } = await supabase
      .from('servers')
      .update({ specialties: selectedSpecialties })
      .eq('id', server.id)
    setSpecialtiesSaving(false)
    if (!error) {
      setEditingSpecialties(false)
      setSpecialtiesSaved(true)
      setTimeout(() => setSpecialtiesSaved(false), 2000)
    }
  }

  // ── Privacy ─────────────────────────────────────────────────────────────────
  async function toggleApproval() {
    if (!server) return
    const next = !requireApproval
    setRequireApproval(next)
    await supabase
      .from('servers')
      .update({ follow_approval: next ? 'approval' : 'automatic' })
      .eq('id', server.id)
  }

  async function updateVisibility(value: string) {
    if (!server) return
    setProfileVisibility(value)
    await supabase
      .from('servers')
      .update({ profile_visibility: value })
      .eq('id', server.id)
  }

  async function toggleTalentSearch() {
    if (!server) return
    const next = !openToOpportunities
    setOpenToOpportunities(next)
    await supabase
      .from('servers')
      .update({ open_to_opportunities: next })
      .eq('id', server.id)
  }

  // ── Worker Council ──────────────────────────────────────────────────────────
  async function submitSuggestion() {
    if (!server || !suggestion.trim()) return
    setSuggestionSubmitting(true)
    const { error } = await supabase
      .from('suggestions')
      .insert({
        server_id: server.id,
        title: suggestion.slice(0, 100),
        description: suggestion,
        status: 'pending',
      })
    setSuggestionSubmitting(false)
    if (!error) {
      setSuggestion('')
      setSuggestionSent(true)
      setTimeout(() => setSuggestionSent(false), 3000)
    }
  }

  // ── Sign out ────────────────────────────────────────────────────────────────
  async function handleSignOut() {
    localStorage.removeItem('slateUserType')
    localStorage.removeItem('slateServerId')
    localStorage.removeItem('slateServerName')
    localStorage.removeItem('slate-shift-started-at')
    await supabase.auth.signOut()
    router.push('/')
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-3xl px-8 py-12 lg:px-16">

        {loading ? (
          <p className="text-sm" style={{ color: '#606060' }}>Loading your profile…</p>
        ) : !server ? (
          <div className="rounded-2xl border border-white/10 p-7" style={{ backgroundColor: '#0a0a0a' }}>
            <p className="text-sm font-semibold text-white">Setting up your profile…</p>
            <p className="mt-1 text-xs" style={{ color: '#606060' }}>
              We&apos;re still saving your info. Try refreshing in a moment. If this persists, sign out and sign back in.
            </p>
          </div>
        ) : (
          <>

            {/* ── Stats row ──────────────────────────────────────────────── */}
            <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Rating',    value: server.average_rating ? server.average_rating.toFixed(1) : '—' },
                { label: 'Reviews',   value: server.total_ratings ?? 0 },
                { label: 'Followers', value: server.follower_count ?? 0 },
                { label: '$SERVE',    value: server.serve_balance_lifetime ?? 0 },
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

            {/* ── Shift / QR ─────────────────────────────────────────────── */}
            <div className="mb-8 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444', marginBottom: '8px' }}>
                Shift
              </p>

              {shiftActive ? (
                <>
                  <p className="mb-1 text-base font-semibold text-white">
                    On shift{restaurantName ? ` at ${restaurantName}` : ''}
                  </p>
                  <p className="mb-5 text-xs" style={{ color: '#606060' }}>
                    QR active — {formatCountdown(msLeft)} left
                  </p>

                  <div className="mb-5 flex flex-col items-center gap-5">
                    <div className="rounded-2xl bg-white p-5">
                      <QRCode
                        value={`https://slatenow.xyz/scan/${server.id}`}
                        size={200}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                    <p className="max-w-xs text-center text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
                      Show this to your guests so they can rate and follow you
                    </p>
                  </div>

                  <button
                    onClick={handleEndShift}
                    className="w-full rounded-full border border-white/20 py-3 text-xs font-semibold text-white transition-colors hover:border-white"
                  >
                    End Shift
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-1 text-base font-semibold text-white">
                    {restaurantName ? `Ready to start your shift at ${restaurantName}?` : "You're off the clock"}
                  </p>
                  <p className="mb-5 text-xs" style={{ color: '#606060' }}>
                    Activates an 8-hour QR window so guests can rate and follow you.
                  </p>
                  <button
                    onClick={handleStartShift}
                    disabled={!restaurantName}
                    className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
                  >
                    Start Shift
                  </button>
                  {!restaurantName && (
                    <p className="mt-3 text-xs" style={{ color: '#606060' }}>
                      Add a workplace to your profile to start a shift.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* ── Specialties (collapsed by default) ─────────────────────── */}
            <div className="mb-6 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
              <div className="mb-4 flex items-center justify-between">
                <p style={{ fontFamily: FONT_MONO, fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444' }}>
                  Specialties
                </p>
                {!editingSpecialties && (
                  <button
                    onClick={() => setEditingSpecialties(true)}
                    style={{ background: 'none', border: 'none', color: '#444', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline', fontFamily: FONT_MONO }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {!editingSpecialties ? (
                <>
                  {selectedSpecialties.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedSpecialties.map(s => (
                        <span key={s} style={{ border: '1px solid #222', color: '#555', padding: '4px 12px', fontSize: '11px', letterSpacing: '1px' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#333', fontSize: '13px' }}>No specialties added</span>
                  )}
                  {specialtiesSaved && (
                    <p style={{ marginTop: '12px', fontFamily: FONT_MONO, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#444' }}>
                      Specialties updated ✓
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-4px' }}>
                    {SPECIALTY_OPTIONS.map(spec => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        style={{
                          background: selectedSpecialties.includes(spec) ? 'white' : 'transparent',
                          color: selectedSpecialties.includes(spec) ? 'black' : '#555',
                          border: '1px solid #333',
                          padding: '8px 16px',
                          fontSize: '12px',
                          letterSpacing: '1px',
                          cursor: 'pointer',
                          margin: '4px',
                        }}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                    <button
                      onClick={saveSpecialties}
                      disabled={specialtiesSaving}
                      className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-50"
                    >
                      {specialtiesSaving ? 'Updating…' : 'Update'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingSpecialties(false)
                        setSelectedSpecialties(server.specialties ?? [])
                      }}
                      style={{ background: 'none', border: 'none', color: '#444', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', fontFamily: FONT_MONO }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ── Privacy settings ───────────────────────────────────────── */}
            <div className="mb-8 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444', marginBottom: '8px' }}>
                Privacy Settings
              </p>

              {/* Approve followers */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', borderBottom: '1px solid #0d0d0d' }}>
                <div>
                  <div style={{ color: 'white', fontSize: '14px' }}>Approve followers</div>
                  <div style={{ color: '#444', fontSize: '12px', marginTop: '4px' }}>
                    Manually approve each follow request
                  </div>
                </div>
                <button
                  onClick={toggleApproval}
                  style={{
                    width: '52px', height: '28px', borderRadius: '14px',
                    background: requireApproval ? '#22c55e' : '#111',
                    border: 'none', cursor: 'pointer', position: 'relative', padding: 0,
                  }}
                >
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: requireApproval ? '27px' : '3px', transition: 'left 0.2s ease' }} />
                </button>
              </div>

              {/* Profile visibility */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', borderBottom: '1px solid #0d0d0d' }}>
                <div>
                  <div style={{ color: 'white', fontSize: '14px' }}>Profile visibility</div>
                  <div style={{ color: '#444', fontSize: '12px', marginTop: '4px' }}>
                    Control who can find your profile
                  </div>
                </div>
                <select
                  value={profileVisibility}
                  onChange={(e) => updateVisibility(e.target.value)}
                  style={{ background: '#111', color: 'white', border: '1px solid #222', padding: '8px 12px', fontSize: '12px', letterSpacing: '1px', cursor: 'pointer' }}
                >
                  <option value="public">Public</option>
                  <option value="shift_only">Shift only</option>
                  <option value="private">Private</option>
                </select>
              </div>

              {/* Talent search */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 0', gap: '16px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: 'white', fontSize: '14px' }}>Appear in restaurant talent search</div>
                  <div style={{ color: '#444', fontSize: '12px', marginTop: '4px' }}>
                    Let restaurants discover your profile when hiring
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <button
                    onClick={toggleTalentSearch}
                    style={{
                      width: '52px', height: '28px', borderRadius: '14px',
                      background: openToOpportunities ? '#22c55e' : '#111',
                      border: 'none', cursor: 'pointer', position: 'relative', padding: 0,
                    }}
                  >
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: openToOpportunities ? '27px' : '3px', transition: 'left 0.2s ease' }} />
                  </button>
                  <span style={{ color: openToOpportunities ? '#22c55e' : '#444', fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '6px', fontFamily: FONT_MONO }}>
                    {openToOpportunities ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Worker Council ─────────────────────────────────────────── */}
            <div className="mb-8 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
              <p style={{ fontFamily: FONT_MONO, fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444', marginBottom: '8px' }}>
                Worker Council
              </p>
              <p style={{ color: '#555', fontSize: '14px', lineHeight: 1.55, marginBottom: '20px' }}>
                Have a suggestion for how Slate should grow? Submit it to the Worker Council.
              </p>

              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Share your idea..."
                style={{
                  width: '100%',
                  background: '#050505',
                  border: '1px solid #111',
                  color: 'white',
                  padding: '16px',
                  fontSize: '14px',
                  fontFamily: 'Georgia, serif',
                  minHeight: '80px',
                  resize: 'none',
                  marginBottom: '12px',
                  outline: 'none',
                }}
              />
              <button
                onClick={submitSuggestion}
                disabled={suggestionSubmitting || !suggestion.trim()}
                style={{
                  background: 'transparent',
                  color: '#555',
                  border: '1px solid #222',
                  padding: '10px 24px',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  cursor: suggestionSubmitting || !suggestion.trim() ? 'not-allowed' : 'pointer',
                  opacity: suggestionSubmitting || !suggestion.trim() ? 0.5 : 1,
                }}
              >
                {suggestionSubmitting ? 'Submitting…' : 'Submit Suggestion'}
              </button>

              {suggestionSent && (
                <p style={{ marginTop: '14px', fontFamily: FONT_MONO, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#4ade80' }}>
                  Suggestion submitted to the Worker Council ✓
                </p>
              )}
            </div>

          </>
        )}

        {/* ── Sign out ─────────────────────────────────────────────────────── */}
        <div className="border-t border-white/10 py-8">
          <button
            onClick={handleSignOut}
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
