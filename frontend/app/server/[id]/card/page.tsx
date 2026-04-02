'use client'

import { useRef } from 'react'
import Navbar from '@/app/components/Navbar'

// Decorative QR code built from SVG rects — no external dependency.
function QRPlaceholder() {
  // Minimal QR-like grid pattern (7×7 finder squares + inner modules)
  const dark = '#FFFFFF'
  const size = 7 // cells per side
  // Sparse pattern that visually reads as a QR code
  const cells = [
    // Top-left finder
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],
    [0,1],[6,1],[0,2],[2,2],[3,2],[4,2],[6,2],
    [0,3],[2,3],[4,3],[6,3],[0,4],[2,4],[3,4],[4,4],[6,4],
    [0,5],[6,5],[0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6],
    // Data area scatter
    [8,0],[10,0],[12,0],[9,1],[11,1],[8,2],[10,2],[12,2],
    [8,4],[9,4],[11,4],[8,5],[10,5],[12,5],[9,6],[11,6],
    [0,8],[2,8],[4,8],[1,9],[3,9],[5,9],[0,10],[2,10],[4,10],
    [0,12],[1,12],[3,12],[5,12],[2,13],[4,13],[0,14],[2,14],[4,14],
    [8,8],[9,8],[10,8],[11,8],[12,8],[8,9],[12,9],[8,10],[10,10],[12,10],
    [8,11],[9,11],[11,11],[8,12],[9,12],[10,12],[11,12],[12,12],
    [6,8],[6,10],[6,12],[7,9],[7,11],
  ]
  const cell = 6
  const total = (size * 2 + 1) * cell // 15 cells wide

  return (
    <svg
      width={total}
      height={total}
      viewBox={`0 0 ${total} ${total}`}
      className="opacity-70"
    >
      {cells.map(([c, r], i) => (
        <rect key={i} x={c * cell} y={r * cell} width={cell - 1} height={cell - 1} fill={dark} />
      ))}
    </svg>
  )
}

export default function ServerCardPage() {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="flex flex-col items-center px-8 py-12">

        {/* Page header */}
        <div className="mb-8 w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-white">Your Slate card</h1>
          <p className="mt-1.5 text-sm" style={{ color: '#A0A0A0' }}>
            Screenshot and share to Instagram Stories.
          </p>
        </div>

        {/* ── The card ── */}
        <div
          ref={cardRef}
          className="relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-3xl border border-white/15"
          style={{
            backgroundColor: '#000000',
            aspectRatio: '9 / 16',
            padding: '2.5rem 2rem',
          }}
        >
          {/* Subtle radial glow behind the avatar */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{
              height: '55%',
              background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 70%)',
            }}
          />

          {/* Slate logo pill — top left */}
          <div className="absolute left-5 top-5">
            <span className="rounded-full border border-white/25 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white">
              Slate
            </span>
          </div>

          {/* Verified badge — top right */}
          <div className="absolute right-5 top-5 flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
              <circle cx="12" cy="12" r="12" fill="white" />
              <path d="M7 12.5l3.5 3.5 6.5-7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] font-semibold text-white">Verified</span>
          </div>

          {/* Main content — grows to fill */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-between pt-8">

            {/* Top section: avatar + name */}
            <div className="flex flex-col items-center gap-4">
              {/* Avatar */}
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/30 bg-white text-2xl font-bold text-black"
              >
                MJ
              </div>

              {/* Name */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-white">Marcus Johnson</h2>
                </div>
                <p className="mt-0.5 text-xs" style={{ color: '#A0A0A0' }}>
                  Head Bartender · Carbone, NYC
                </p>
              </div>
            </div>

            {/* Center: big rating */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-end leading-none">
                <span
                  className="font-bold text-white"
                  style={{ fontSize: '7rem', lineHeight: 1, letterSpacing: '-0.04em' }}
                >
                  4.9
                </span>
                <span
                  className="mb-3 ml-2 text-white"
                  style={{ fontSize: '3rem', lineHeight: 1 }}
                >
                  ★
                </span>
              </div>
              <p className="text-xs tracking-widest uppercase" style={{ color: '#606060' }}>
                127 verified reviews
              </p>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {['89 Followers', 'Top 1%', 'Craft Cocktails'].map(label => (
                <span
                  key={label}
                  className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* QR code + scan text */}
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <QRPlaceholder />
              </div>
              <p className="text-[10px] tracking-wide uppercase" style={{ color: '#606060' }}>
                Scan to follow me on Slate
              </p>
            </div>

            {/* Footer URL */}
            <p className="text-[11px] tracking-widest uppercase" style={{ color: '#404040' }}>
              slatenow.xyz
            </p>

          </div>
        </div>

        {/* Screenshot instructions */}
        <div className="mt-8 w-full max-w-sm rounded-2xl border border-white/10 p-5 text-center" style={{ backgroundColor: '#0a0a0a' }}>
          <p className="text-xs font-semibold text-white">How to share</p>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
            Screenshot this page on your phone, then share to Instagram Stories, X, or anywhere you want your regulars to find you.
          </p>
          <a
            href="/server/1"
            className="mt-4 inline-block text-xs transition-colors hover:text-white"
            style={{ color: '#606060' }}
          >
            ← Back to your profile
          </a>
        </div>

      </main>
    </div>
  )
}
