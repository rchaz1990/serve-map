'use client'

import { useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import Navbar from '@/app/components/Navbar'
import { getOrCreateDemoKeypair, keypairToWallet, getProgram } from '@/lib/solana'
import { supabase } from '@/lib/supabase'

// ── Geofencing ───────────────────────────────────────────────────────────────

// Carbone, 181 Thompson St, New York, NY
const RESTAURANT_LAT = 40.7264
const RESTAURANT_LNG = -74.0022
const VERIFIED_RADIUS_M = 300

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type LocationStatus = 'idle' | 'requesting' | 'verified' | 'out-of-range' | 'denied'

// ── Tags + stars ─────────────────────────────────────────────────────────────

const tags = [
  'Attentive', 'Friendly', 'Great Recommendations',
  'Fast Service', 'Made it Special', 'Above and Beyond',
]

function StarSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="p-1 transition-transform hover:scale-110 focus:outline-none"
        >
          <svg width="40" height="40" viewBox="0 0 24 24"
            fill={n <= active ? '#FFFFFF' : 'none'}
            stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

const ratingLabels: Record<number, string> = {
  1: 'Poor', 2: 'Below average', 3: 'Good', 4: 'Great', 5: 'Exceptional',
}

const DEMO_SERVER_PROFILE = '11111111111111111111111111111111'

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RatePage() {
  const [rating, setRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [txSig, setTxSig] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)       // final verification state for submit

  // Location state
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function requestLocation() {
    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          RESTAURANT_LAT,
          RESTAURANT_LNG,
        )
        if (dist <= VERIFIED_RADIUS_M) {
          setLocationStatus('verified')
          setVerified(true)
        } else {
          setLocationStatus('out-of-range')
        }
      },
      () => {
        setLocationStatus('denied')
      },
      { timeout: 10_000, maximumAge: 60_000 },
    )
  }

  const canSubmit = rating > 0

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const keypair = await getOrCreateDemoKeypair()
      const wallet = keypairToWallet(keypair)
      const program = getProgram(wallet)

      const serverProfileKey =
        typeof window !== 'undefined'
          ? (localStorage.getItem('slate-server-profile') ?? DEMO_SERVER_PROFILE)
          : DEMO_SERVER_PROFILE
      const serverProfile = new PublicKey(serverProfileKey)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sig = await (program.methods as any)
        .submitRating(rating, comment, verified)
        .accounts({ serverProfile, rater: keypair.publicKey })
        .signers([keypair])
        .rpc()

      // ── $SERVE rewards (fire-and-forget, non-blocking) ─────────────────────
      // Guest earns 10 $SERVE for a verified rating
      if (verified) {
        const { data: { session } } = await supabase.auth.getSession()
        const guestEmail = session?.user?.email
        if (guestEmail) {
          supabase.rpc('increment_serve_balance', {
            user_email: guestEmail,
            amount: 10,
            user_type: 'guest',
          }).then(({ error }) => { if (error) console.error('[rate] guest reward error:', error) })
        }

        // Server earns 25 $SERVE — look up by Supabase server ID stored during scan
        const serverId = typeof window !== 'undefined'
          ? localStorage.getItem('slateRatingServerId')
          : null
        if (serverId) {
          supabase.rpc('increment_serve_balance_by_id', {
            server_id: serverId,
            amount: 25,
          }).then(({ error }) => { if (error) {
            // Fallback: direct update if RPC not available
            supabase.from('servers')
              .update({ serve_balance: supabase.rpc('serve_balance') })
              .eq('id', serverId)
          }})
        }
      }

      setTxSig(sig)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('already in use') ? 'You have already rated this server.' : msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Submitted state ──────────────────────────────────────────────────────────

  if (txSig) {
    return (
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Rating submitted on-chain ✓
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
            Your {rating}-star review has been permanently written to Solana and attached to Marcus&apos;s profile.
          </p>

          {/* Verified / unverified badge */}
          <div className="mt-5">
            {verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.07] px-4 py-1.5 text-xs font-semibold text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0">
                  <circle cx="12" cy="12" r="12" fill="white" />
                  <path d="M7 12.5l3.5 3.5 6.5-7" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Verified Visit ✓
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium" style={{ color: '#606060' }}>
                Unverified
              </span>
            )}
          </div>

          <div className="mt-6 w-full max-w-sm rounded-xl border border-white/10 px-4 py-4 text-left">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: '#606060' }}>Transaction</p>
            <p className="break-all font-mono text-xs text-white">{txSig}</p>
          </div>

          {verified && (
            <div className="mt-6 flex w-full max-w-sm items-center gap-3 rounded-none border border-white/10 px-6 py-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-5 w-5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
              <p className="text-xs" style={{ color: '#A0A0A0' }}>
                Your verified rating contributes to Marcus&apos;s $SERVE token rewards.
              </p>
            </div>
          )}

          <a href="/" className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80">
            Back to home
          </a>
        </main>
      </div>
    )
  }

  // ── Rating form ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-lg px-8 pb-32 pt-16 lg:px-0">

        {/* ── Location banner ─────────────────────────────────────────── */}
        {locationStatus === 'idle' && (
          <div className="mb-10 rounded-2xl border border-white/10 px-5 py-5" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="mb-4 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Allow location access to verify you&apos;re at the restaurant</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: '#606060' }}>
                  We only check your location to verify your visit — we never store or track you.
                </p>
              </div>
            </div>
            <button
              onClick={requestLocation}
              className="w-full rounded-full bg-white py-2.5 text-xs font-semibold text-black transition-opacity hover:opacity-80"
            >
              Allow Location
            </button>
          </div>
        )}

        {locationStatus === 'requesting' && (
          <div className="mb-10 flex items-center gap-3 rounded-2xl border border-white/10 px-5 py-4" style={{ backgroundColor: '#0a0a0a' }}>
            <svg className="h-4 w-4 animate-spin shrink-0 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-xs text-white">Checking your location…</p>
          </div>
        )}

        {locationStatus === 'verified' && (
          <div className="mb-10 flex items-center gap-3 rounded-2xl border border-white/15 px-5 py-4" style={{ backgroundColor: '#0a0a0a' }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0">
              <circle cx="12" cy="12" r="12" fill="white" />
              <path d="M7 12.5l3.5 3.5 6.5-7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-white">Location verified ✓</p>
              <p className="text-xs" style={{ color: '#A0A0A0' }}>You&apos;re at the restaurant. Your rating will earn Marcus $SERVE rewards.</p>
            </div>
          </div>
        )}

        {locationStatus === 'out-of-range' && (
          <div className="mb-10 rounded-2xl border border-white/10 px-5 py-5" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="mb-3 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" style={{ color: '#A0A0A0' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">You need to be at the restaurant to leave a verified rating</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: '#606060' }}>
                  Verified ratings earn Marcus $SERVE rewards. You can still submit an unverified rating — it won&apos;t count toward rewards.
                </p>
              </div>
            </div>
            <button
              onClick={() => { setLocationStatus('denied'); setVerified(false) }}
              className="w-full rounded-full border border-white/20 py-2.5 text-xs font-medium text-white transition-colors hover:border-white"
            >
              Rate Anyway (Unverified)
            </button>
          </div>
        )}

        {locationStatus === 'denied' && (
          <div className="mb-10 flex items-start gap-3 rounded-2xl border border-white/10 px-5 py-4" style={{ backgroundColor: '#0a0a0a' }}>
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" style={{ color: '#606060' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
              Location access helps verify your visit and earn $SERVE rewards. Your rating will be submitted as unverified.
            </p>
          </div>
        )}

        {/* ── Header ──────────────────────────────────────────────────── */}
        <section className="mb-14">
          <div className="mb-3 flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
              Verified booking
            </p>
            {/* Visit badge */}
            {locationStatus === 'verified' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 shrink-0">
                  <circle cx="12" cy="12" r="12" fill="white" />
                  <path d="M7 12.5l3.5 3.5 6.5-7" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Verified Visit ✓
              </span>
            ) : locationStatus === 'out-of-range' || locationStatus === 'denied' ? (
              <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-medium" style={{ color: '#606060' }}>
                Unverified
              </span>
            ) : null}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How was your experience with Marcus?
          </h1>
          <p className="mt-3 text-sm" style={{ color: '#A0A0A0' }}>
            Eleven Madison Park &nbsp;·&nbsp; March 18, 2025
          </p>
        </section>

        {/* ── Star rating ─────────────────────────────────────────────── */}
        <section className="mb-14">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#A0A0A0' }}>
            Overall rating
          </p>
          <StarSelector value={rating} onChange={setRating} />
          <div className="mt-4 h-5">
            {rating > 0 && (
              <p className="text-sm font-medium text-white">{ratingLabels[rating]}</p>
            )}
          </div>
        </section>

        <div className="border-t border-white/10 mb-14" />

        {/* ── Quick tags ──────────────────────────────────────────────── */}
        <section className="mb-14">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#A0A0A0' }}>
            What stood out? <span className="normal-case tracking-normal font-normal">({`optional`})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const active = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="rounded-full border px-4 py-2 text-xs font-medium transition-colors"
                  style={{
                    borderColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                    backgroundColor: active ? '#FFFFFF' : 'transparent',
                    color: active ? '#000000' : '#FFFFFF',
                  }}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </section>

        <div className="border-t border-white/10 mb-14" />

        {/* ── Written comment ─────────────────────────────────────────── */}
        <section className="mb-14">
          <label
            htmlFor="comment"
            className="mb-6 block text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: '#A0A0A0' }}
          >
            Written review <span className="normal-case tracking-normal font-normal">(optional)</span>
          </label>
          <textarea
            id="comment"
            rows={5}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell Marcus and future guests about your experience..."
            className="w-full resize-none border-b border-white/20 bg-transparent pb-4 pt-1 text-sm text-white placeholder-white/20 focus:border-white focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <span className="text-xs tabular-nums" style={{ color: comment.length > 0 ? '#A0A0A0' : 'transparent' }}>
              {comment.length} / 280
            </span>
          </div>
        </section>

        <div className="border-t border-white/10 mb-14" />

        {/* ── $SERVE notice ───────────────────────────────────────────── */}
        <section className="mb-14">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {locationStatus === 'verified'
                  ? 'Your verified rating earns Marcus $SERVE token rewards'
                  : 'Verified ratings earn $SERVE token rewards'}
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
                {locationStatus === 'verified'
                  ? 'Your location-verified review is permanent and tamper-proof — it can\'t be deleted by the restaurant.'
                  : 'Allow location access at the restaurant to submit a verified rating that counts toward $SERVE rewards.'}
              </p>
            </div>
          </div>
        </section>

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* ── Submit ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading || locationStatus === 'out-of-range'}
            className="w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-25"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Submitting on-chain…
              </span>
            ) : locationStatus === 'verified'
              ? 'Submit Verified Rating'
              : locationStatus === 'idle' || locationStatus === 'requesting'
              ? 'Submit Rating'
              : 'Submit Unverified Rating'}
          </button>
          {!canSubmit && !loading && (
            <p className="text-center text-xs" style={{ color: '#A0A0A0' }}>
              Select a star rating to continue
            </p>
          )}
          {locationStatus === 'idle' && canSubmit && (
            <p className="text-center text-xs" style={{ color: '#606060' }}>
              Allow location above to submit a verified rating that earns $SERVE rewards
            </p>
          )}
        </div>

      </main>
    </div>
  )
}
