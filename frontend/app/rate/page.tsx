'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

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

// ── Inner form (needs Suspense because of useSearchParams) ────────────────────

type ServerRow = {
  id: string
  name: string
  role: string | null
  average_rating: number | null
  total_ratings: number | null
  slate_points: number | null
}

function RateForm() {
  const searchParams = useSearchParams()
  const serverId = searchParams.get('server')

  const [serverData, setServerData] = useState<ServerRow | null>(null)
  const [rating, setRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    console.log('serverId from URL:', serverId)
    if (!serverId) return

    const loadServer = async () => {
      const { data } = await supabase
        .from('servers')
        .select('id, name, role, average_rating, total_ratings, slate_points')
        .eq('id', serverId)
        .maybeSingle()
      console.log('serverData:', data)
      setServerData(data as ServerRow | null)
    }

    loadServer()
  }, [serverId])

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

    try {
      setLoading(true)
      setError('')

      const { data: { session } } = await supabase.auth.getSession()

      const { error: ratingError } = await supabase
        .from('ratings')
        .insert({
          server_id: serverId,
          score: rating,
          comment: comment || null,
          tags: selectedTags.length > 0 ? selectedTags : null,
          guest_email: session?.user?.email || 'anonymous',
          gps_verified: false,
          verification_method: 'qr_scan',
        })

      if (ratingError) {
        console.error('Rating insert error:', ratingError)
        setError(`Failed to submit rating: ${ratingError.message}`)
        return
      }

      // Update server stats — best-effort, non-blocking
      const { data: fresh, error: fetchErr } = await supabase
        .from('servers')
        .select('average_rating, total_ratings, slate_points')
        .eq('id', serverId)
        .maybeSingle()

      if (fetchErr) console.error('Server fetch error (non-fatal):', fetchErr)

      if (fresh) {
        const newTotal = (fresh.total_ratings || 0) + 1
        const newAverage = (((fresh.average_rating || 0) * (fresh.total_ratings || 0)) + rating) / newTotal

        const { error: updateErr } = await supabase
          .from('servers')
          .update({
            average_rating: parseFloat(newAverage.toFixed(1)),
            total_ratings: newTotal,
            slate_points: (fresh.slate_points || 0) + 25,
          })
          .eq('id', serverId)

        if (updateErr) console.error('Server stats update error (non-fatal):', updateErr)
      }

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
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
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
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Rating submitted ✓
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
            Your {rating}-star review has been saved to {serverFirstName}&apos;s profile.
          </p>
          <div className="mt-6 flex w-full max-w-sm items-center gap-3 rounded-xl border border-white/10 px-6 py-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-5 w-5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
            <p className="text-xs" style={{ color: '#A0A0A0' }}>
              {serverFirstName} earned <span className="font-semibold text-white">25 Slate Points</span> for your rating.
            </p>
          </div>
          <a href="/" className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80">
            Back to home
          </a>
        </main>
      </div>
    )
  }

  // ── Rating form ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-lg px-8 pb-32 pt-16 lg:px-0">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <section className="mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
            Rate your experience
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How was your experience with {serverFirstName}?
          </h1>
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
            What stood out? <span className="normal-case tracking-normal font-normal">(optional)</span>
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
            placeholder={`Tell ${serverFirstName === 'your server' ? 'future guests' : serverFirstName + ' and future guests'} about your experience...`}
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
                Your rating earns {serverFirstName} Slate Points
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
                Every rating you leave builds {serverFirstName}&apos;s permanent on-chain reputation.
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
            onClick={handleSubmitRating}
            disabled={rating === 0 || loading}
            className="w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-25"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Submitting…
              </span>
            ) : 'Submit Rating'}
          </button>
          {rating === 0 && !loading && (
            <p className="text-center text-xs" style={{ color: '#A0A0A0' }}>
              Select a star rating to continue
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
