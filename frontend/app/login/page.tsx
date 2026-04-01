'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy, useLoginWithOAuth } from '@privy-io/react-auth'
import Navbar from '@/app/components/Navbar'

export default function LoginPage() {
  const router = useRouter()
  const { login, authenticated, ready } = usePrivy()
  const { initOAuth } = useLoginWithOAuth()

  // Redirect already-authenticated users immediately.
  useEffect(() => {
    if (ready && authenticated) {
      router.push('/book')
    }
  }, [ready, authenticated, router])

  // `ready` flips true once Privy has hydrated. Render the full page
  // immediately so there is never a blank screen — buttons are simply
  // disabled until the SDK is ready.
  const busy = !ready

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-8">
        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Welcome to Slate
            </h1>
            <p className="mt-3 text-sm" style={{ color: '#A0A0A0' }}>
              Sign in to book tables and follow your favourite servers.
            </p>
          </div>

          {/* Auth buttons */}
          <div className="flex flex-col gap-3">

            {/* Email */}
            <button
              onClick={() => login({ loginMethods: ['email'] })}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-white py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {/* Envelope icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              Continue with Email
            </button>

            {/* Google */}
            <button
              onClick={() => initOAuth({ provider: 'google' })}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-white/20 py-3.5 text-sm font-medium text-white transition-colors hover:border-white disabled:opacity-40"
            >
              {/* Google "G" mark */}
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#FFFFFF"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#FFFFFF"
                  fillOpacity={0.7}
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FFFFFF"
                  fillOpacity={0.5}
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#FFFFFF"
                  fillOpacity={0.3}
                />
              </svg>
              Continue with Google
            </button>

          </div>

          {/* Divider */}
          <div className="my-8 border-t border-white/10" />

          {/* No wallet disclaimer */}
          <p className="text-center text-xs" style={{ color: '#A0A0A0' }}>
            No crypto wallet needed.
            <br />
            An embedded wallet is created for you automatically.
          </p>
        </div>
      </main>
    </div>
  )
}
