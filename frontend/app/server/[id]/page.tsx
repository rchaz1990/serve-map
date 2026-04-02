'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Navbar from '@/app/components/Navbar'

// Demo data — in production this would be fetched by `id` from the chain.
const profile = {
  id: "marcus-johnson",
  initials: "MJ",
  name: "Marcus Johnson",
  role: "Head Bartender",
  restaurant: "Eleven Madison Park",
  location: "New York, NY",
  rating: 4.9,
  totalRatings: 127,
  followers: 89,
  totalBookings: 312,
  yearsExperience: 7,
  repeatGuestPct: 78,
  serveTokens: 847,
  serveTokensGoal: 1000,
  bio: "Seven years behind the bar and at the table. Known for remembering names, preferences, and making every reservation feel like a regular's.",
}

const reviews = [
  {
    guest: "Sarah K.",
    rating: 5,
    date: "March 12, 2025",
    comment:
      "Marcus remembered my dietary restrictions from a visit six months prior — without me saying a word. That level of attention is rare anywhere, let alone at this scale.",
  },
  {
    guest: "David L.",
    rating: 5,
    date: "March 3, 2025",
    comment:
      "Effortless pacing, genuinely warm without being performative. He made our anniversary dinner feel personal. Already requested him for our next visit.",
  },
  {
    guest: "Rachel M.",
    rating: 4,
    date: "February 22, 2025",
    comment:
      "Attentive without hovering. Knew when to engage and when to give us space. The cocktail recommendations were exactly right.",
  },
]

const career = [
  {
    restaurant: "Eleven Madison Park",
    location: "New York, NY",
    role: "Head Bartender",
    period: "Jan 2023 – Present",
    current: true,
  },
  {
    restaurant: "Le Bernardin",
    location: "New York, NY",
    role: "Senior Server",
    period: "Aug 2020 – Dec 2022",
    current: false,
  },
  {
    restaurant: "Nobu Fifty Seven",
    location: "New York, NY",
    role: "Server",
    period: "Mar 2018 – Jul 2020",
    current: false,
  },
]

const stats = [
  { label: "Avg. rating", value: `${profile.rating}` },
  { label: "Total bookings", value: profile.totalBookings.toLocaleString() },
  { label: "Years experience", value: `${profile.yearsExperience}` },
  { label: "Repeat guests", value: `${profile.repeatGuestPct}%` },
]

// Placeholder follower initials
const followerAvatars = ["SK", "DL", "RM"]

export default function ServerProfilePage() {
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(profile.followers)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (!showToast) return
    const t = setTimeout(() => setShowToast(false), 3000)
    return () => clearTimeout(t)
  }, [showToast])

  function handleFollow() {
    if (following) {
      setFollowing(false)
      setFollowerCount(c => c - 1)
    } else {
      setFollowing(true)
      setFollowerCount(c => c + 1)
      setShowToast(true)
    }
  }

  const serveProgress = Math.round((profile.serveTokens / profile.serveTokensGoal) * 100)

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: "#000000", fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Navbar overlaid on banner */}
      <div className="relative z-20">
        <Navbar overlay />
      </div>

      {/* ── Banner ──────────────────────────────────────────────────────── */}
      <div className="relative h-56 w-full overflow-hidden sm:h-72 lg:h-96">
        <Image
          src="https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1920&q=80"
          alt="Bar background"
          fill
          priority
          className="object-cover"
        />
        {/* Gradient overlay — heavier at bottom so avatar pops */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black" />
      </div>

      {/* ── Profile Header ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-8 lg:px-16">

        {/* Avatar row — pulled up over the banner */}
        <div className="relative -mt-16 mb-6 flex flex-col gap-6 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">

          {/* Avatar */}
          <div
            className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-4 border-black bg-white text-3xl font-bold text-black sm:h-36 sm:w-36"
            aria-label={`${profile.name} avatar`}
          >
            {profile.initials}
          </div>

          {/* Reserve CTA — stacks on mobile, row on desktop */}
          <div className="flex flex-col gap-3 sm:flex-row sm:pb-2">
            <a
              href="/book"
              className="w-full rounded-full bg-white px-8 py-3 text-center text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:w-auto"
            >
              Reserve with Marcus
            </a>
            <button
              onClick={handleFollow}
              className={[
                'w-full rounded-full border px-6 py-3 text-sm font-medium transition-colors sm:w-auto',
                following
                  ? 'border-white/40 text-white/60 hover:border-white/60'
                  : 'border-white/30 text-white hover:border-white',
              ].join(' ')}
            >
              {following ? 'Following ✓' : '+ Follow'}
            </button>
            <a
              href="/server/1/card"
              className="w-full rounded-full border border-white/20 px-5 py-3 text-center text-sm font-medium text-white/60 transition-colors hover:border-white hover:text-white sm:w-auto"
            >
              Share my card
            </a>
          </div>
        </div>

        {/* Name + verified + meta */}
        <div className="mb-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {profile.name}
            </h1>
            {/* Verified badge */}
            <span title="Verified on-chain profile" className="flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                <circle cx="12" cy="12" r="12" fill="white" />
                <path
                  d="M7 12.5l3.5 3.5 6.5-7"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
          <p className="text-sm" style={{ color: "#A0A0A0" }}>
            {profile.role} · {profile.restaurant} · {profile.location}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-lg font-bold text-white">
              {profile.rating} ★
            </span>
            <span className="text-sm" style={{ color: "#A0A0A0" }}>
              {profile.totalRatings} verified ratings
            </span>
            <span style={{ color: "#404040" }}>·</span>
            <span className="text-sm" style={{ color: "#A0A0A0" }}>
              {followerCount} followers
            </span>
            <span style={{ color: "#404040" }}>·</span>
            <span className="text-sm" style={{ color: "#A0A0A0" }}>
              {profile.totalBookings} bookings
            </span>
          </div>
        </div>

        {/* Bio */}
        <p className="mb-0 max-w-2xl text-sm leading-relaxed" style={{ color: "#A0A0A0" }}>
          {profile.bio}
        </p>

      </div>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="mt-10 border-t border-white/10" />

      {/* ── Stats Row ───────────────────────────────────────────────────── */}
      <section className="px-8 py-12 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
            {stats.map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col gap-1 px-6 py-8 first:pl-0"
                style={{ backgroundColor: "#000000" }}
              >
                <span className="text-3xl font-bold text-white">{value}</span>
                <span className="text-xs uppercase tracking-widest" style={{ color: "#A0A0A0" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10" />

      {/* ── $SERVE Rewards + Following — two-col on desktop ─────────────── */}
      <section className="px-8 py-12 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* $SERVE Rewards card */}
            <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: "#0a0a0a" }}>
              {/* Header row */}
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">$SERVE Rewards</p>
                    <p className="text-xs" style={{ color: "#A0A0A0" }}>Earned automatically from verified ratings</p>
                  </div>
                </div>
                {/* Top 1% badge */}
                <span className="shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  Top 1%
                </span>
              </div>

              {/* Token amount */}
              <div className="mb-5">
                <span className="text-4xl font-bold text-white">{profile.serveTokens.toLocaleString()}</span>
                <span className="ml-2 text-sm font-medium" style={{ color: "#A0A0A0" }}>$SERVE earned this month</span>
              </div>

              {/* Progress bar */}
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${serveProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: "#606060" }}>
                  Next tier: {profile.serveTokensGoal.toLocaleString()} $SERVE
                </p>
                <p className="text-xs font-medium text-white">
                  {profile.serveTokensGoal - profile.serveTokens} away
                </p>
              </div>
            </div>

            {/* Following card */}
            <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: "#0a0a0a" }}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Followers</p>
                  <p className="text-xs" style={{ color: "#A0A0A0" }}>People following Marcus's career</p>
                </div>
                <span className="text-3xl font-bold text-white">{profile.followers}</span>
              </div>

              {/* Follower avatars */}
              <div className="mb-5 flex items-center gap-1">
                {followerAvatars.map((initials, i) => (
                  <div
                    key={i}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white text-xs font-bold text-black"
                    style={{ marginLeft: i > 0 ? '-0.5rem' : '0' }}
                  >
                    {initials}
                  </div>
                ))}
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black text-xs font-medium"
                  style={{ marginLeft: '-0.5rem', backgroundColor: "#1a1a1a", color: "#A0A0A0" }}
                >
                  +{profile.followers - followerAvatars.length}
                </div>
              </div>

              {/* Follow prompt */}
              <div className="rounded-xl border border-white/10 px-4 py-3.5">
                <p className="text-xs leading-relaxed" style={{ color: "#A0A0A0" }}>
                  Follow Marcus to get notified when he moves to a new restaurant or has availability.
                </p>
                <button
                  onClick={handleFollow}
                  className={[
                    'mt-3 inline-block rounded-full px-5 py-2 text-xs font-semibold transition-opacity hover:opacity-80',
                    following ? 'border border-white/30 text-white' : 'bg-white text-black',
                  ].join(' ')}
                >
                  {following ? 'Following ✓' : 'Follow Marcus'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10" />

      {/* ── Recent Reviews ──────────────────────────────────────────────── */}
      <section className="px-8 py-16 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-12 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#A0A0A0" }}>
            Recent reviews
          </p>

          <div>
            {reviews.map(({ guest, rating, date, comment }, i) => (
              <div key={i}>
                <div className="py-10">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-white">{guest}</span>
                      <span className="text-xs tracking-widest" style={{ color: "#A0A0A0" }}>
                        {"★".repeat(rating)}{"☆".repeat(5 - rating)}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: "#A0A0A0" }}>{date}</span>
                  </div>
                  <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "#A0A0A0" }}>
                    &ldquo;{comment}&rdquo;
                  </p>
                </div>
                {i < reviews.length - 1 && <div className="border-t border-white/10" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10" />

      {/* ── Career History ──────────────────────────────────────────────── */}
      <section className="px-8 py-16 lg:px-16 lg:py-24" style={{ backgroundColor: "#0a0a0a" }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 flex items-end justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#A0A0A0" }}>
              Career history
            </p>
            <p className="text-xs" style={{ color: "#A0A0A0" }}>
              Profile is portable · verified on-chain
            </p>
          </div>

          <div>
            {career.map(({ restaurant, location, role, period, current }, i) => (
              <div key={i}>
                <div className="flex flex-col gap-1 py-8 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold text-white">{restaurant}</span>
                      {current && (
                        <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: "#A0A0A0" }}>
                      {role} · {location}
                    </span>
                  </div>
                  <span className="text-xs tabular-nums" style={{ color: "#A0A0A0" }}>{period}</span>
                </div>
                {i < career.length - 1 && <div className="border-t border-white/10" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10" />

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between px-8 py-8 lg:px-16">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Slate</span>
        <p className="text-xs" style={{ color: "#A0A0A0" }}>
          © {new Date().getFullYear()} Slate
        </p>
      </footer>

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      <div
        className={[
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-white/20 bg-black px-5 py-3 shadow-lg transition-all duration-300',
          showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none',
        ].join(' ')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 shrink-0 text-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        <p className="text-xs font-medium text-white">
          You&apos;re now following Marcus. We&apos;ll notify you when he moves restaurants.
        </p>
      </div>

    </div>
  )
}
