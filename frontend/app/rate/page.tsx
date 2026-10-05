'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { MotionSection } from '@/app/components/motion'
import { supabase } from '@/lib/supabase'
import { isTestDevice } from '@/lib/funnel'

// ── Tags + stars ──────────────────────────────────────────────────────────────

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

/** Login URL that keeps the full /rate?server= path. Used by submit and follow. */
function rateLoginHref(serverId: string): string {
  return `/login?redirect=${encodeURIComponent(`/rate?server=${serverId}`)}`
}

// ── Inner form (needs Suspense because of useSearchParams) ────────────────────

type ServerRow = {
  id: string
  name: string
  role: string | null
  average_rating: number | null
  total_ratings: number | null
  serve_balance: number | null
  serve_balance_lifetime: number | null
  follower_count: number | null
}

function RateForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const serverId = searchParams.get('server')

  const [serverData, setServerData] = useState<ServerRow | null>(null)
  const [rating, setRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isFollowing, setIsFollowing] = useState(false)
  const [lastReward, setLastReward] = useState<{ starReward: number; commentBonus: number; followBonus: number; total: number } | null>(null)

  useEffect(() => {
    console.log('Rate page loaded with server:', serverId)
    if (!serverId) return

    const loadServer = async () => {
      // Reset transient state so revisits don't carry stale errors / follow state
      setError('')
      setServerData(null)
      setIsFollowing(false)

      const { data: server, error: lookupError } = await supabase
        .from('servers')
        .select('id, name, role, average_rating, total_ratings, serve_balance, serve_balance_lifetime, follower_count')
        .eq('id', serverId)
        .maybeSingle()

      console.log('Server lookup result:', server, lookupError)

      if (lookupError) {
        console.error('Supabase error:', lookupError)
        setError(`Database error: ${lookupError.message}`)
        return
      }

      if (!server) {
        console.error('No server found for ID:', serverId)
        setError('Server not found. Please scan the QR code again.')
        return
      }

      setServerData(server as ServerRow)

      // Check if the current guest is already following
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const { data: existingFollow } = await supabase
          .from('follows')
          .select('id')
          .eq('server_id', serverId)
          .eq('follower_id', session.user.id)
          .maybeSingle()
        setIsFollowing(!!existingFollow)
      }
    }

    loadServer()
  }, [serverId])

  const handleFollow = async () => {
    if (!serverId) return
    let session = (await supabase.auth.getSession()).data.session
    if (!session?.access_token) {
      const { data } = await supabase.auth.refreshSession()
      session = data.session
    }
    if (!session?.access_token || !session.user) {
      router.push(rateLoginHref(serverId))
      return
    }

    await supabase.from('follows').insert({
      follower_id: session.user.id,
      follower_email: session.user.email,
      server_id: serverId,
      follower_type: 'guest',
    })

    await supabase
      .from('servers')
      .update({
        follower_count: (serverData?.follower_count || 0) + 1,
      })
      .eq('id', serverId)

    setIsFollowing(true)
  }

  const serverName = serverData?.name || 'your server'
  const serverFirstName = serverName === 'your server' ? 'your server' : serverName.split(' ')[0]

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSubmitRating = async () => {
    if (!serverId) {
      setError('Server not found. Please scan the QR code again.')
      return
    }
    if (rating < 1) {
      setError('Pick a rating to continue.')
      return
    }

    try {
      setLoading(true)
      setError('')

      let token = (await supabase.auth.getSession()).data.session?.access_token ?? null
      if (!token) {
        const { data } = await supabase.auth.refreshSession()
        token = data.session?.access_token ?? null
      }
      if (!token) {
        router.push(rateLoginHref(serverId))
        return
      }

      // Reward is recomputed on the server. This request does not send an amount.
      const postRating = (accessToken: string) => fetch('/api/submit-rating', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          serverId,
          score: rating,
          comment: comment.trim() ? comment.trim() : null,
          tags: selectedTags,
          isTest: isTestDevice(),
        }),
      })

      let res = await postRating(token)

      if (res.status === 401) {
        const { data } = await supabase.auth.refreshSession()
        const retryToken = data.session?.access_token
        if (retryToken) res = await postRating(retryToken)
        if (res.status === 401) {
          router.push(rateLoginHref(serverId))
          return
        }
      }

      const body = await res.json().catch(() => null) as {
        error?: string
        reward?: { starReward: number; commentBonus: number; followBonus: number; total: number }
      } | null
      if (!res.ok || !body?.reward) {
        setError(body?.error || 'Failed to submit rating. Please try again.')
        return
      }

      setLastReward(body.reward)
      setSuccess(true)
    } catch (err) {
      console.error('Rating submission error:', err)
      setError('Failed to submit rating. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── No server ID ──────────────────────────────────────────────────────────

  if (!serverId) {
    return (
      <div className="slate-page flex flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="text-sm" style={{ color: '#A0A0A0' }}>
            No server found. Please scan a valid QR code.
          </p>
        </main>
      </div>
    )
  }

  // ── Success state ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="slate-page flex flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Rating submitted! ⭐
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
            Your {rating}-star review has been saved to {serverFirstName}&apos;s profile.
          </p>
          {/* Reward breakdown */}
          {lastReward && (
            <div
              style={{
                border: '1px solid #111',
                padding: '24px',
                marginTop: '24px',
                background: '#050505',
                width: '100%',
                maxWidth: '24rem',
                textAlign: 'left',
              }}
            >
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
                {serverFirstName} earned
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '13px' }}>
                  <span>{rating} star rating</span>
                  <span style={{ color: 'white' }}>+{lastReward.starReward} $SERVE</span>
                </div>

                {lastReward.commentBonus > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '13px' }}>
                    <span>Written review bonus</span>
                    <span style={{ color: 'white' }}>+{lastReward.commentBonus} $SERVE</span>
                  </div>
                )}

                {lastReward.followBonus > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '13px' }}>
                    <span>Follow bonus</span>
                    <span style={{ color: 'white' }}>+{lastReward.followBonus} $SERVE</span>
                  </div>
                )}

                <div
                  style={{
                    borderTop: '1px solid #111',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: 'white',
                    fontSize: '18px',
                    fontFamily: 'Georgia, serif',
                    fontWeight: 700,
                  }}
                >
                  <span>Total</span>
                  <span>{lastReward.total} $SERVE</span>
                </div>
              </div>
            </div>
          )}

          {/* Follow CTA — stays visible after rating so guest can still follow */}
          <div className="mt-8 w-full max-w-sm">
            {!isFollowing ? (
              <button
                onClick={handleFollow}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: 'white',
                  border: '1px solid #333',
                  padding: '16px',
                  fontSize: '14px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Follow {serverData?.name?.split(' ')[0] ?? ''}
              </button>
            ) : (
              <p style={{ color: '#444', fontSize: '13px' }}>
                Following ✓
              </p>
            )}
          </div>

          <a href="/" className="slate-btn slate-btn-primary mt-8">
            Back home
          </a>
        </main>
      </div>
    )
  }

  // ── Rating form ───────────────────────────────────────────────────────────

  return (
    <div className="slate-page">
      <Navbar />
      <div className="slate-rule" />

      <main className="slate-main mx-auto max-w-lg px-8 pb-32 pt-16 lg:px-0">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <MotionSection immediate className="mb-12">
          <p className="slate-eyebrow mb-4">Rate</p>
          <h1 className="slate-title text-3xl sm:text-4xl">
            How was {serverFirstName}?
          </h1>
        </MotionSection>

        {/* ── Star rating ─────────────────────────────────────────────── */}
        <MotionSection className="mb-12">
          <p className="slate-eyebrow mb-6">Overall</p>
          <StarSelector value={rating} onChange={setRating} />
          <div className="mt-4 h-5">
            {rating > 0 && (
              <p className="text-sm font-medium text-white">{ratingLabels[rating]}</p>
            )}
          </div>
        </MotionSection>

        <div className="slate-rule mb-12" />

        {/* ── Quick tags ──────────────────────────────────────────────── */}
        <MotionSection className="mb-12">
          <p className="slate-eyebrow mb-6">
            Highlights <span className="normal-case tracking-normal font-normal opacity-60">(optional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const active = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="rounded-full border px-4 py-2 text-xs font-medium"
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
        </MotionSection>

        <div className="slate-rule mb-12" />

        {/* ── Written comment ─────────────────────────────────────────── */}
        <MotionSection className="mb-12">
          <label
            htmlFor="comment"
            className="slate-eyebrow mb-6 block"
          >
            Review <span className="normal-case tracking-normal font-normal opacity-60">(optional)</span>
          </label>
          <textarea
            id="comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What made it great?"
            className="w-full resize-none border-b border-white/15 bg-transparent pb-4 pt-1 text-sm text-white placeholder-white/25 transition-colors focus:border-white focus:outline-none"
            maxLength={280}
          />
          <div className="mt-2 flex justify-end">
            <span className="text-xs tabular-nums" style={{ color: comment.length > 0 ? '#A0A0A0' : 'transparent' }}>
              {comment.length} / 280
            </span>
          </div>
        </MotionSection>

        <div className="slate-rule mb-12" />

        {/* ── Follow ──────────────────────────────────────────────────── */}
        <MotionSection className="mb-12">
          <p className="slate-eyebrow mb-5">Follow</p>
          {!isFollowing ? (
            <button
              onClick={handleFollow}
              className="slate-btn slate-btn-ghost w-full"
            >
              Follow {serverData?.name?.split(' ')[0] ?? serverFirstName}
            </button>
          ) : (
            <p className="text-center text-sm slate-muted">Following</p>
          )}
        </MotionSection>

        <div className="slate-rule mb-12" />

        {/* ── $SERVE notice ───────────────────────────────────────────── */}
        <MotionSection className="mb-12">
          <div className="slate-card flex items-start gap-4 px-4 py-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Earns {serverFirstName} Slate Points
              </p>
              <p className="mt-1 text-xs leading-relaxed slate-secondary">
                Builds their on-chain reputation.
              </p>
            </div>
          </div>
        </MotionSection>

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* ── Submit ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSubmitRating}
            disabled={rating === 0 || loading}
            className="slate-btn slate-btn-primary slate-btn-lg w-full disabled:opacity-25"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Submitting…
              </span>
            ) : 'Submit'}
          </button>
          {rating === 0 && !loading && (
            <p className="text-center text-xs slate-muted">
              Pick a rating to continue
            </p>
          )}
        </div>

      </main>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RatePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#000000' }} />
    }>
      <RateForm />
    </Suspense>
  )
}
