'use client'

import Link from 'next/link'
import Navbar from '@/app/components/Navbar'

/**
 * Bare /scan has no server code — real guest QR landings are /scan/[code].
 * Show a clear empty state instead of a blank Next.js 404.
 */
export default function ScanIndexPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto flex max-w-lg flex-col items-center px-8 py-24 text-center lg:px-16">
        <div
          className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04]"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-7 w-7 text-white/70"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 4.5h4.5v4.5h-4.5V4.5zm0 10.5h4.5v4.5h-4.5V15zM15 4.5h4.5v4.5H15V4.5zm0 7.5h1.5V15H15v-3zm3 3h1.5v1.5H18V15zm-3 3h1.5v1.5H15V18zm3 0h1.5v1.5H18V18zm3-3h.75v1.5H21V15zm0 3h.75v1.5H21V18z"
            />
          </svg>
        </div>

        <h1 className="mb-3 text-2xl font-bold tracking-tight text-white">
          Scan a server QR
        </h1>
        <p className="mb-8 max-w-sm text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
          This page needs a server code from a Slate QR. Ask your server to show their code,
          or open the link they share — it looks like{' '}
          <span className="text-white/80">slatenow.xyz/scan/…</span>
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/explore"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
          >
            Explore restaurants
          </Link>
          <Link
            href="/get-started"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:border-white"
          >
            Get started
          </Link>
        </div>
      </main>
    </div>
  )
}
