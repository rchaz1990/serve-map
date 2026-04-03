'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navbar from '@/app/components/Navbar'

const QR_DURATION_MS = 8 * 60 * 60 * 1000 // 8 hours

// Static server data — in production this would be fetched by code lookup
const SERVER = {
  name: 'Marcus Johnson',
  firstName: 'Marcus',
  initials: 'MJ',
  rating: 4.9,
  reviews: 127,
  restaurant: 'Carbone',
  profileHref: '/server/1',
}

type Status = 'loading' | 'active' | 'expired'

export default function ScanPage() {
  const params = useParams()
  const code = params?.code as string

  const [status, setStatus] = useState<Status>('loading')
  const [followed, setFollowed] = useState(false)

  useEffect(() => {
    if (!code) { setStatus('expired'); return }

    const storedCode = localStorage.getItem('slate-qr-code')
    const storedTs   = localStorage.getItem('slate-qr-activated-at')

    if (storedCode !== code || !storedTs) {
      setStatus('expired')
      return
    }

    const activatedAt = parseInt(storedTs, 10)
    const remaining   = activatedAt + QR_DURATION_MS - Date.now()
    setStatus(remaining > 0 ? 'active' : 'expired')
  }, [code])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  // ── Expired ──────────────────────────────────────────────────────────────
  if (status === 'expired') {
    return (
      <div
        className="min-h-screen text-white"
        style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
      >
        <Navbar />
        <div className="border-t border-white/10" />
        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-8 text-center">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/15">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">This QR code has expired</h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
            Follow {SERVER.firstName} to stay connected and know where they work next.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 w-full max-w-xs">
            <button
              onClick={() => setFollowed(f => !f)}
              className="w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              {followed ? `Following ${SERVER.firstName} ✓` : `Follow ${SERVER.firstName}`}
            </button>
            <a
              href={SERVER.profileHref}
              className="py-2 text-xs transition-colors hover:text-white"
              style={{ color: '#606060' }}
            >
              View {SERVER.firstName}&apos;s profile →
            </a>
          </div>
        </main>
      </div>
    )
  }

  // ── Active ───────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-sm px-8 py-16 text-center">

        {/* Avatar */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white text-xl font-bold text-black">
          {SERVER.initials}
        </div>

        {/* Name + restaurant */}
        <h1 className="text-2xl font-bold tracking-tight text-white">{SERVER.name}</h1>
        <p className="mt-1 text-sm" style={{ color: '#A0A0A0' }}>{SERVER.restaurant}</p>

        {/* Rating */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-lg font-semibold text-white">{SERVER.rating}</span>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white">
            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
          </svg>
          <span className="text-sm" style={{ color: '#606060' }}>· {SERVER.reviews} reviews</span>
        </div>

        {/* Message */}
        <p className="mx-auto mt-8 max-w-xs text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
          You&apos;re dining with {SERVER.firstName} tonight. Rate your experience and follow them to know where they work next.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col gap-3">
          <a
            href="/rate"
            className="block rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80"
          >
            Rate {SERVER.firstName}
          </a>
          <button
            onClick={() => setFollowed(f => !f)}
            className="block w-full rounded-full border py-4 text-sm font-semibold transition-colors"
            style={{
              borderColor: followed ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
              color: '#FFFFFF',
              backgroundColor: followed ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}
          >
            {followed ? `Following ${SERVER.firstName} ✓` : `Follow ${SERVER.firstName}`}
          </button>
          <a
            href={SERVER.profileHref}
            className="block py-3 text-xs transition-colors hover:text-white"
            style={{ color: '#606060' }}
          >
            View full profile →
          </a>
        </div>

      </main>
    </div>
  )
}
