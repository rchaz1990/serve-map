'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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


// ── Profile preferences (specialties + visibility) ───────────────────────────

const SPECIALTY_OPTIONS = [
  'Cocktails', 'Wine', 'Beer', 'Whiskey',
  'Fine Dining', 'Casual Dining', 'Nightlife',
  'Events & Catering',
]

function ProfilePreferencesSection({
  serverId,
  initialSpecialties,
  initialOpenToOpportunities,
}: {
  serverId: string | null
  initialSpecialties: string[]
  initialOpenToOpportunities: boolean
}) {
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(initialSpecialties)
  const [openToOpportunities, setOpenToOpportunities] = useState<boolean>(initialOpenToOpportunities)
  const [savingSpecs, setSavingSpecs] = useState(false)
  const [editingSpecialties, setEditingSpecialties] = useState(false)
  const [specialtiesSaved, setSpecialtiesSaved] = useState(false)
  const [busyToggle, setBusyToggle] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sync if parent props change (initial load races)
  useEffect(() => { setSelectedSpecialties(initialSpecialties) }, [initialSpecialties])
  useEffect(() => { setOpenToOpportunities(initialOpenToOpportunities) }, [initialOpenToOpportunities])

  function toggleSpecialty(specialty: string) {
    setSelectedSpecialties(prev =>
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    )
  }

  async function saveSpecialties() {
    if (!serverId) return
    setSavingSpecs(true)
    setError(null)
    const { error: updateErr } = await supabase
      .from('servers')
      .update({ specialties: selectedSpecialties })
      .eq('id', serverId)
    setSavingSpecs(false)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    setEditingSpecialties(false)
    setSpecialtiesSaved(true)
    setTimeout(() => setSpecialtiesSaved(false), 2000)
  }

  async function toggleOpenToOpportunities(next: boolean) {
    if (!serverId) return
    setBusyToggle(true)
    setError(null)
    const { error: updateErr } = await supabase
      .from('servers')
      .update({ open_to_opportunities: next })
      .eq('id', serverId)
    setBusyToggle(false)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    setOpenToOpportunities(next)
  }

  const FONT_MONO = '"Space Mono", ui-monospace, SFMono-Regular, monospace'

  return (
    <>
      {/* ── Specialties (collapsed by default) ─────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: '10px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#444',
            }}
          >
            Specialties
          </p>
          {!editingSpecialties && (
            <button
              onClick={() => setEditingSpecialties(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#444',
                fontSize: '10px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontFamily: FONT_MONO,
              }}
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
                  <span
                    key={s}
                    style={{
                      border: '1px solid #222',
                      color: '#555',
                      padding: '4px 12px',
                      fontSize: '11px',
                      letterSpacing: '1px',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ color: '#333', fontSize: '13px' }}>
                No specialties added
              </span>
            )}
            {specialtiesSaved && (
              <p
                style={{
                  marginTop: '12px',
                  fontFamily: FONT_MONO,
                  fontSize: '10px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: '#444',
                }}
              >
                Specialties updated ✓
              </p>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-4px' }}>
              {SPECIALTY_OPTIONS.map(specialty => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => toggleSpecialty(specialty)}
                  style={{
                    background: selectedSpecialties.includes(specialty) ? 'white' : 'transparent',
                    color: selectedSpecialties.includes(specialty) ? 'black' : '#555',
                    border: '1px solid #333',
                    padding: '8px 16px',
                    fontSize: '12px',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    margin: '4px',
                  }}
                >
                  {specialty}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <button
                onClick={saveSpecialties}
                disabled={savingSpecs || !serverId}
                className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {savingSpecs ? 'Updating…' : 'Update'}
              </button>
              <button
                onClick={() => {
                  setEditingSpecialties(false)
                  setSelectedSpecialties(initialSpecialties)
                }}
                disabled={savingSpecs}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#444',
                  fontSize: '10px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: FONT_MONO,
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Talent search toggle ─────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="text-sm font-semibold text-white">Appear in restaurant talent search</p>
            <p className="mt-1 text-xs leading-6" style={{ color: '#A0A0A0' }}>
              Let restaurants discover your profile when hiring.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
            <button
              role="switch"
              aria-checked={openToOpportunities}
              disabled={busyToggle || !serverId}
              onClick={() => toggleOpenToOpportunities(!openToOpportunities)}
              style={{
                width: '52px',
                height: '28px',
                borderRadius: '14px',
                background: openToOpportunities ? '#22c55e' : '#111',
                position: 'relative',
                cursor: busyToggle ? 'wait' : 'pointer',
                border: 'none',
                padding: 0,
                opacity: busyToggle ? 0.5 : 1,
              }}
            >
              <span
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'white',
                  position: 'absolute',
                  top: '3px',
                  left: openToOpportunities ? '27px' : '3px',
                  transition: 'left 0.2s ease',
                }}
              />
            </button>
            <span
              style={{
                color: openToOpportunities ? '#22c55e' : '#444',
                fontSize: '10px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                marginTop: '6px',
                fontFamily: FONT_MONO,
              }}
            >
              {openToOpportunities ? 'Visible' : 'Hidden'}
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-400">{error}</p>
        )}
      </div>
    </>
  )
}

// ── $SERVE reputation + bi-weekly payout ──────────────────────────────────────

function ServeRewardsSection({
  serverId,
  lifetimeBalance,
}: {
  serverId: string | null
  lifetimeBalance: number
}) {
  const [periodEarned, setPeriodEarned] = useState(0)

  useEffect(() => {
    if (!serverId) return
    let cancelled = false
    const load = async () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('ratings')
        .select('serve_reward')
        .eq('server_id', serverId)
        .gte('created_at', twoWeeksAgo)
      if (cancelled) return
      const total = (data ?? []).reduce((sum, r: { serve_reward?: number | null }) => sum + (r.serve_reward ?? 0), 0)
      setPeriodEarned(total)
    }
    load()
    return () => { cancelled = true }
  }, [serverId])

  // Next payout = next 14-day boundary anchored on 2026-05-01
  const today = new Date()
  const anchor = new Date('2026-05-01')
  const daysSinceAnchor = Math.floor((today.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24))
  const daysUntilPayout = ((14 - (daysSinceAnchor % 14)) % 14) || 14
  const nextPayout = new Date(today)
  nextPayout.setDate(today.getDate() + daysUntilPayout)
  const nextPayoutDate = nextPayout.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <div className="mb-8 rounded-2xl border border-white/10" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Reputation Score */}
      <div style={{ padding: '24px', borderBottom: '1px solid #0d0d0d' }}>
        <div
          style={{
            fontSize: '10px',
            letterSpacing: '3px',
            color: '#444',
            textTransform: 'uppercase',
            marginBottom: '16px',
            fontFamily: '"Space Mono", ui-monospace, monospace',
          }}
        >
          Reputation Score
        </div>

        <div style={{ fontSize: '36px', fontFamily: 'Georgia, serif', fontWeight: 700, color: 'white', lineHeight: 1 }}>
          {lifetimeBalance}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#444',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginTop: '8px',
            fontFamily: '"Space Mono", ui-monospace, monospace',
          }}
        >
          $SERVE earned lifetime
        </div>
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#444', lineHeight: 1.6 }}>
          Your permanent on-chain reputation score. Only goes up. Never resets.
        </div>
      </div>

      {/* Bi-Weekly Payout */}
      <div style={{ padding: '24px' }}>
        <div
          style={{
            fontSize: '10px',
            letterSpacing: '3px',
            color: '#444',
            textTransform: 'uppercase',
            marginBottom: '16px',
            fontFamily: '"Space Mono", ui-monospace, monospace',
          }}
        >
          Bi-Weekly Payout
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1px',
            background: '#111',
            marginBottom: '16px',
          }}
        >
          <div style={{ background: '#000', padding: '16px' }}>
            <div style={{ fontSize: '22px', fontFamily: 'Georgia, serif', fontWeight: 700, color: 'white' }}>
              {periodEarned}
            </div>
            <div
              style={{
                fontSize: '9px',
                color: '#444',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginTop: '4px',
                fontFamily: '"Space Mono", ui-monospace, monospace',
              }}
            >
              $SERVE this period
            </div>
          </div>
          <div style={{ background: '#000', padding: '16px' }}>
            <div
              style={{
                fontSize: '11px',
                color: '#444',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontFamily: '"Space Mono", ui-monospace, monospace',
              }}
            >
              Next payout
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              {nextPayoutDate}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.7 }}>
          The top 20% of active servers receive a cash payout every two weeks through Slate Pay — funded by restaurant subscriptions.
          Every $SERVE you earn counts toward your ranking. The more stars you get, the more written reviews, the more follows — the higher you rank.
        </div>
      </div>
    </div>
  )
}

// ── Privacy settings (follow approval + profile visibility) ──────────────────

function PrivacySettingsSection({
  serverId,
  initialFollowApproval,
  initialProfileVisibility,
}: {
  serverId: string | null
  initialFollowApproval: string
  initialProfileVisibility: string
}) {
  const [requireApproval, setRequireApproval] = useState(initialFollowApproval === 'approval')
  const [profileVisibility, setProfileVisibility] = useState(initialProfileVisibility)

  // Re-sync if parent props change (initial load races)
  useEffect(() => { setRequireApproval(initialFollowApproval === 'approval') }, [initialFollowApproval])
  useEffect(() => { setProfileVisibility(initialProfileVisibility) }, [initialProfileVisibility])

  const FONT_MONO = '"Space Mono", ui-monospace, SFMono-Regular, monospace'

  const toggleApproval = async () => {
    if (!serverId) return
    const newValue = !requireApproval
    setRequireApproval(newValue)
    const { error } = await supabase
      .from('servers')
      .update({ follow_approval: newValue ? 'approval' : 'automatic' })
      .eq('id', serverId)
    if (error) {
      console.error('[PrivacySettingsSection] approval update:', error)
      // Revert optimistic update
      setRequireApproval(!newValue)
    }
  }

  const updateVisibility = async (value: string) => {
    if (!serverId) return
    const previous = profileVisibility
    setProfileVisibility(value)
    const { error } = await supabase
      .from('servers')
      .update({ profile_visibility: value })
      .eq('id', serverId)
    if (error) {
      console.error('[PrivacySettingsSection] visibility update:', error)
      setProfileVisibility(previous)
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: '10px',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          color: '#444',
          marginBottom: '8px',
        }}
      >
        Privacy Settings
      </p>

      {/* Follow approval */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 0',
          borderBottom: '1px solid #0d0d0d',
        }}
      >
        <div>
          <div style={{ color: 'white', fontSize: '14px' }}>
            Approve followers
          </div>
          <div style={{ color: '#444', fontSize: '12px', marginTop: '4px' }}>
            Manually approve each follow request
          </div>
        </div>
        <button
          onClick={() => toggleApproval()}
          disabled={!serverId}
          style={{
            width: '52px',
            height: '28px',
            borderRadius: '14px',
            background: requireApproval ? '#22c55e' : '#111',
            border: 'none',
            cursor: serverId ? 'pointer' : 'not-allowed',
            position: 'relative',
            padding: 0,
            opacity: serverId ? 1 : 0.5,
          }}
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '3px',
              left: requireApproval ? '27px' : '3px',
              transition: 'left 0.2s ease',
            }}
          />
        </button>
      </div>

      {/* Profile visibility */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 0',
        }}
      >
        <div>
          <div style={{ color: 'white', fontSize: '14px' }}>
            Profile visibility
          </div>
          <div style={{ color: '#444', fontSize: '12px', marginTop: '4px' }}>
            Control who can find your profile
          </div>
        </div>
        <select
          value={profileVisibility}
          onChange={(e) => updateVisibility(e.target.value)}
          disabled={!serverId}
          style={{
            background: '#111',
            color: 'white',
            border: '1px solid #222',
            padding: '8px 12px',
            fontSize: '12px',
            letterSpacing: '1px',
            cursor: serverId ? 'pointer' : 'not-allowed',
          }}
        >
          <option value="public">Public</option>
          <option value="shift_only">Shift only</option>
          <option value="private">Private</option>
        </select>
      </div>
    </div>
  )
}

// ── Worker Council suggestion form ────────────────────────────────────────────

function WorkerCouncilSection({ serverId }: { serverId: string | null }) {
  const [suggestion, setSuggestion] = useState('')
  const [suggestionSent, setSuggestionSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const FONT_MONO = '"Space Mono", ui-monospace, SFMono-Regular, monospace'

  const handleSubmitSuggestion = async () => {
    if (!suggestion.trim() || !serverId) return
    setSubmitting(true)
    const { error } = await supabase
      .from('suggestions')
      .insert({
        server_id: serverId,
        title: suggestion.slice(0, 100),
        description: suggestion,
        status: 'pending',
      })
    setSubmitting(false)
    if (!error) {
      setSuggestion('')
      setSuggestionSent(true)
      setTimeout(() => setSuggestionSent(false), 3000)
    } else {
      console.error('[WorkerCouncilSection] submit:', error)
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: '#0a0a0a' }}>
      <p
        style={{
          fontFamily: FONT_MONO,
          fontSize: '10px',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          color: '#444',
          marginBottom: '8px',
        }}
      >
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
        onClick={handleSubmitSuggestion}
        disabled={submitting || !suggestion.trim() || !serverId}
        style={{
          background: 'transparent',
          color: '#555',
          border: '1px solid #222',
          padding: '10px 24px',
          fontSize: '11px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          cursor: submitting || !suggestion.trim() ? 'not-allowed' : 'pointer',
          opacity: submitting || !suggestion.trim() || !serverId ? 0.5 : 1,
        }}
      >
        {submitting ? 'Submitting…' : 'Submit Suggestion'}
      </button>

      {suggestionSent && (
        <p
          style={{
            marginTop: '14px',
            fontFamily: FONT_MONO,
            fontSize: '10px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#4ade80',
          }}
        >
          Suggestion submitted to the Worker Council ✓
        </p>
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
    serve_balance: number
    serve_balance_lifetime: number
    photo_url: string | null
  } | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [recentRatings, setRecentRatings] = useState<{
    id: string
    guest_name: string | null
    score: number
    created_at: string
    comment: string | null
  }[]>([])
  const [profileLoading, setProfileLoading] = useState(true)

  // Restaurant picker — shown before shift starts
  const [restaurants, setRestaurants] = useState<{ id: string; restaurant_name: string; is_primary: boolean; restaurant_address: string | null }[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('')
  const [showRestaurantPicker, setShowRestaurantPicker] = useState(false)

  // Profile preferences (specialties + visibility) — loaded with serverData
  const [profileSpecialties, setProfileSpecialties] = useState<string[]>([])
  const [profileOpenToOpportunities, setProfileOpenToOpportunities] = useState<boolean>(false)
  const [profileFollowApproval, setProfileFollowApproval] = useState<string>('approval')
  const [profileVisibility, setProfileVisibility] = useState<string>('public')


  // Load all dashboard data scoped to the logged-in server
  useEffect(() => {
    async function loadDashboardData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/login'); return }

      console.log('[Dashboard] Loading for auth user:', session.user.id)

      // Primary lookup: wallet_address = Supabase auth UID (set at signup)
      const { data: serverData, error } = await supabase
        .from('servers')
        .select('id, name, role, average_rating, total_ratings, follower_count, is_founding_member, serve_balance, serve_balance_lifetime, photo_url, specialties, open_to_opportunities, follow_approval, profile_visibility')
        .eq('wallet_address', session.user.id)
        .maybeSingle()

      console.log('[Dashboard] Server data:', serverData, error ?? '')

      if (!serverData) {
        // Fallback: email match for accounts created before wallet_address was wired up
        const { data: byEmail } = await supabase
          .from('servers')
          .select('id, name, role, average_rating, total_ratings, follower_count, is_founding_member, serve_balance, serve_balance_lifetime, photo_url, specialties, open_to_opportunities, follow_approval, profile_visibility')
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
      row: { id: string; name: string | null; role?: string | null; average_rating: number | null; total_ratings: number | null; follower_count?: number | null; is_founding_member?: boolean | null; serve_balance?: number | null; serve_balance_lifetime?: number | null; photo_url?: string | null; specialties?: string[] | null; open_to_opportunities?: boolean | null; follow_approval?: string | null; profile_visibility?: string | null },
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

      // Followers — use the DB column as source of truth (maintained by atomic RPC)
      const { data: followRows } = await supabase
        .from('follows')
        .select('id, created_at')
        .eq('server_id', row.id)
        .eq('status', 'approved')
      const followerCount = row.follower_count ?? followRows?.length ?? 0

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
        serve_balance: row.serve_balance ?? 0,
        serve_balance_lifetime: row.serve_balance_lifetime ?? 0,
        photo_url: row.photo_url ?? null,
      })
      setProfileSpecialties(row.specialties ?? [])
      setProfileOpenToOpportunities(row.open_to_opportunities ?? false)
      setProfileFollowApproval(row.follow_approval ?? 'approval')
      setProfileVisibility(row.profile_visibility ?? 'public')
      setProfileLoading(false)
    }

    loadDashboardData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refreshServeBalance() {
    const serverId = localStorage.getItem('slateServerId')
    if (!serverId) return
    const { data } = await supabase
      .from('servers')
      .select('serve_balance, serve_balance_lifetime')
      .eq('id', serverId)
      .maybeSingle()
    if (data != null) {
      setServerProfile(prev => prev
        ? { ...prev, serve_balance: data.serve_balance ?? 0, serve_balance_lifetime: data.serve_balance_lifetime ?? 0 }
        : prev,
      )
    }
  }

  const handlePhotoUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      console.log('No file selected')
      return
    }

    console.log('File selected:', file.name, file.size, file.type)

    const { data: { session } } = await supabase.auth.getSession()
    console.log('Session:', session?.user?.email)

    if (!session) {
      alert('Please sign in to upload a photo')
      return
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
    console.log('Uploading as:', fileName)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('Avatars')
      .upload(fileName, file, { upsert: true, contentType: file.type })

    console.log('Upload result:', uploadData, uploadError)

    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('Avatars').getPublicUrl(fileName)

    console.log('Public URL:', publicUrl)

    const { data: updateData, error: updateError } = await supabase
      .from('servers')
      .update({ photo_url: publicUrl })
      .eq('wallet_address', session.user.id)
      .select()

    console.log('Update result:', updateData, updateError)

    if (updateError) {
      alert(`Failed to save photo: ${updateError.message}`)
      return
    }

    alert('Photo updated successfully!')
    window.location.reload()
  }

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

  const handleStartShift = (restaurantName: string) => {
    // Activate immediately — GPS captured silently in the background
    activate()
    setShiftToast(true)
    setShowRestaurantPicker(false)

    // Notify followers (fire and forget)
    if (serverProfile) {
      fetch('/api/notify-followers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: serverProfile.id,
          serverName: serverProfile.name,
          restaurantName,
          type: 'shift_started',
        }),
      }).catch(() => {})
    }

    const insertShift = async (gpsVerified: boolean, distance: number | null, userLat: number | null, userLng: number | null) => {
      const { data, error } = await supabase.from('shifts').insert({
        server_id: serverProfile?.id ?? null,
        restaurant_name: restaurantName,
        started_at: new Date().toISOString(),
        is_active: true,
        gps_verified: gpsVerified,
        distance_meters: distance,
        user_lat: userLat,
        user_lng: userLng,
      }).select('id').single()
      if (error) console.error('[supabase] shift start:', error)
      else setShiftDbId(data.id)
    }

    if (!navigator.geolocation) {
      insertShift(false, null, null, null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude
        const userLng = position.coords.longitude
        try {
          let geoData: { results: { geometry: { location: { lat: number; lng: number } } }[]; status: string }
          const res1 = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(restaurantName)}&key=AIzaSyDEX_QtjOnjalHTTKlvnt-XK297_ANANr8`)
          geoData = await res1.json()
          if (!geoData.results?.length) {
            const res2 = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(restaurantName + ' NYC')}&key=AIzaSyDEX_QtjOnjalHTTKlvnt-XK297_ANANr8`)
            geoData = await res2.json()
          }
          if (geoData.results?.length) {
            const rLat = geoData.results[0].geometry.location.lat
            const rLng = geoData.results[0].geometry.location.lng
            const R = 6371000
            const dLat = (rLat - userLat) * Math.PI / 180
            const dLon = (rLng - userLng) * Math.PI / 180
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(userLat * Math.PI / 180) * Math.cos(rLat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
            const distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
            insertShift(distance <= 500, distance, userLat, userLng)
          } else {
            insertShift(false, null, userLat, userLng)
          }
        } catch {
          insertShift(false, null, userLat, userLng)
        }
      },
      () => { insertShift(false, null, null, null) },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-5xl px-8 py-12 lg:px-16">

        {/* ── Header (server name + greeting) ─────────────────────────── */}
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
          <div className="flex items-center gap-5">
            {/* Profile photo */}
            <div className="shrink-0 text-center">
              {serverProfile.photo_url ? (
                <img
                  src={serverProfile.photo_url}
                  alt={serverProfile.name}
                  style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #222' }}
                />
              ) : (
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#444', fontFamily: 'Georgia, serif' }}>
                  {serverProfile.name?.[0]?.toUpperCase() ?? '·'}
                </div>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpdate} style={{ display: 'none' }} />
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{ marginTop: '6px', color: '#666', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%' }}
              >
                {serverProfile.photo_url ? 'Update' : 'Add photo'}
              </button>
            </div>
            {/* Name + status */}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Welcome back, {serverProfile.name.split(' ')[0]}
                </h1>
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
          </div>
          <a
            href={`/server/${serverProfile.id}`}
            className="self-start rounded-full border border-white/20 px-5 py-2 text-xs font-semibold text-white transition-colors hover:border-white sm:self-auto"
          >
            View public profile →
          </a>
        </div>
        )}

        {/* ── Stats row (Rating, Reviews, Followers, $SERVE) ──────────── */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Rating',    value: serverProfile?.avg_rating ? serverProfile.avg_rating.toFixed(1) : '—' },
            { label: 'Reviews',   value: serverProfile?.total_ratings ?? 0 },
            { label: 'Followers', value: serverProfile?.follower_count ?? 0 },
            { label: '$SERVE',    value: serverProfile?.serve_balance_lifetime ?? 0 },
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

        {/* ── $SERVE rewards (lifetime score + bi-weekly payout) ────────── */}
        <ServeRewardsSection
          serverId={serverProfile?.id ?? null}
          lifetimeBalance={serverProfile?.serve_balance_lifetime ?? 0}
        />

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
              onClick={() => {
                if (isOnShift) {
                  // Mark shift inactive in Supabase
                  if (shiftDbId) {
                    supabase.from('shifts').update({ is_active: false, ended_at: new Date().toISOString() })
                      .eq('id', shiftDbId).then(({ error }) => { if (error) console.error('[supabase] shift end:', error) })
                  }
                  deactivate()
                  refreshServeBalance()
                  setVibeSubmitted(false)
                  setSelectedVibe(null)
                  setShiftCovers('')
                  setShiftSpecials('')
                  setShiftDbId(null)
                  setShowRestaurantPicker(false)
                } else {
                  // Show restaurant picker (or skip if auto-selected and only one)
                  if (restaurants.length <= 1 && selectedRestaurant) {
                    handleStartShift(selectedRestaurant)
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
                    onClick={() => { setSelectedRestaurant(r.restaurant_name); handleStartShift(r.restaurant_name) }}
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

          {/* QR section — only when on shift */}
          {isOnShift && qrCode && (
            <div className="mt-7 border-t border-white/10 pt-7">
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                <div className="rounded-2xl bg-white p-4">
                  <QRCode
                    value={`https://slatenow.xyz/scan/${serverProfile?.id}`}
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
                      slatenow.xyz/rate?server={serverProfile?.id}
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

        {/* ── Profile preferences (specialties + talent toggle) ───────── */}
        <ProfilePreferencesSection
          serverId={serverProfile?.id ?? null}
          initialSpecialties={profileSpecialties}
          initialOpenToOpportunities={profileOpenToOpportunities}
        />

        {/* ── Privacy settings ────────────────────────────────────────── */}
        <PrivacySettingsSection
          serverId={serverProfile?.id ?? null}
          initialFollowApproval={profileFollowApproval}
          initialProfileVisibility={profileVisibility}
        />

        {/* ── Worker Council ──────────────────────────────────────────── */}
        <WorkerCouncilSection serverId={serverProfile?.id ?? null} />

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
