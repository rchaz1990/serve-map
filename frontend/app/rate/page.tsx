'use client'

import { useState } from 'react'

const tags = [
  'Attentive',
  'Friendly',
  'Great Recommendations',
  'Fast Service',
  'Made it Special',
  'Above and Beyond',
]

function StarSelector({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
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
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill={n <= active ? '#FFFFFF' : 'none'}
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

const ratingLabels: Record<number, string> = {
  1: 'Poor',
  2: 'Below average',
  3: 'Good',
  4: 'Great',
  5: 'Exceptional',
}

export default function RatePage() {
  const [rating, setRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const canSubmit = rating > 0

  // ── Submitted state ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
      >
        <header className="flex h-16 items-center px-8 lg:px-16">
          <a href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
            Slate
          </a>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          {/* Check circle */}
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Rating submitted.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
            Your {rating}-star review has been recorded on-chain and attached to Marcus&apos;s profile permanently.
          </p>

          {/* $SERVE notice */}
          <div className="mt-8 flex items-center gap-3 rounded-none border border-white/10 px-6 py-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-5 w-5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
            <p className="text-xs" style={{ color: '#A0A0A0' }}>
              Your rating contributes to Marcus&apos;s $SERVE token rewards.
            </p>
          </div>

          <a
            href="/"
            className="mt-10 inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
          >
            Back to home
          </a>
        </main>
      </div>
    )
  }

  // ── Rating form ────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      {/* Navbar */}
      <header className="flex h-16 items-center justify-between px-8 lg:px-16">
        <a href="/" className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
          Slate
        </a>
      </header>

      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-lg px-8 pb-32 pt-16 lg:px-0">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <section className="mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
            Verified booking
          </p>
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
          {/* Label */}
          <div className="mt-4 h-5">
            {rating > 0 && (
              <p className="text-sm font-medium text-white">
                {ratingLabels[rating]}
              </p>
            )}
          </div>
        </section>

        <div className="border-t border-white/10 mb-14" />

        {/* ── Quick tags ──────────────────────────────────────────────── */}
        <section className="mb-14">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#A0A0A0' }}>
            What stood out? <span className="normal-case tracking-normal font-normal" style={{ color: '#A0A0A0' }}>(optional)</span>
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
            Written review <span className="normal-case tracking-normal font-normal" style={{ color: '#A0A0A0' }}>(optional)</span>
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
            {/* Token icon */}
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Your rating directly contributes to Marcus&apos;s $SERVE token rewards
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
                Top-rated servers earn $SERVE tokens automatically on-chain. Your verified review is permanent and tamper-proof — it can&apos;t be deleted by the restaurant.
              </p>
            </div>
          </div>
        </section>

        {/* ── Submit ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setSubmitted(true)}
            disabled={!canSubmit}
            className="w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-25"
          >
            Submit rating
          </button>
          {!canSubmit && (
            <p className="text-center text-xs" style={{ color: '#A0A0A0' }}>
              Select a star rating to continue
            </p>
          )}
        </div>

      </main>
    </div>
  )
}
