'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

const LOGO = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.75" y="0.75" width="18.5" height="18.5" rx="3.25" stroke="white" strokeWidth="1.5" />
    <line x1="5" y1="7"  x2="15" y2="7"  stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="5" y1="10" x2="15" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="5" y1="13" x2="15" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const NAV_LINKS = [
  { href: '/live',            label: "What's Live", pulse: true },
  { href: '/for-servers',     label: 'For Servers',     pulse: false },
  { href: '/for-restaurants', label: 'For Restaurants', pulse: false },
  { href: '/whitepaper',      label: 'Whitepaper',      pulse: false },
]

export default function Navbar({ overlay = false }: { overlay?: boolean }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [serverId, setServerId] = useState<string | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user?.email) {
        checkIfServer(s.user.email)
      } else {
        setAuthLoaded(true)
      }
    })

    // Listen for auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user?.email) {
        checkIfServer(s.user.email)
      } else {
        setServerId(null)
        setAuthLoaded(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkIfServer(email: string) {
    const { data } = await supabase
      .from('servers')
      .select('id')
      .eq('email', email)
      .limit(1)
      .single()
    setServerId(data?.id ?? null)
    setAuthLoaded(true)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isServer = authLoaded && session && serverId
  const isGuest = authLoaded && session && !serverId

  // Desktop authenticated links
  function DesktopAuthLinks() {
    if (!authLoaded) return null
    if (!session) {
      return (
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/login"
            className="text-xs font-medium text-white/50 transition-colors hover:text-white"
          >
            Sign in
          </a>
          <a
            href="/get-started"
            className="rounded-full bg-white px-5 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-80"
          >
            Get Started
          </a>
        </div>
      )
    }
    return (
      <div className="hidden items-center gap-4 md:flex">
        {isServer && (
          <a
            href="/dashboard"
            className="text-xs font-medium text-white/50 transition-colors hover:text-white"
          >
            Dashboard
          </a>
        )}
        {isGuest && (
          <a
            href="/account"
            className="text-xs font-medium text-white/50 transition-colors hover:text-white"
          >
            My Dashboard
          </a>
        )}
        <button
          onClick={handleSignOut}
          className="rounded-full border border-white/20 px-5 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <>
      <header
        className={[
          'flex h-16 items-center justify-between px-8 lg:px-16',
          overlay ? 'absolute left-0 right-0 top-0 z-20' : '',
        ].filter(Boolean).join(' ')}
      >
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          {LOGO}
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Slate</span>
        </a>

        {/* Middle nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ href, label, pulse }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-2 text-xs font-medium text-white/50 transition-colors hover:text-white"
            >
              {pulse && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white/70" />
                </span>
              )}
              {label}
            </a>
          ))}
        </nav>

        {/* Auth area */}
        <DesktopAuthLinks />

        {/* Hamburger */}
        <button
          className="flex items-center justify-center text-white md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>
      </header>

      {/* Mobile full-screen overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black md:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between px-8">
            <a href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5">
              {LOGO}
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Slate</span>
            </a>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="border-t border-white/10" />

          <nav className="flex flex-1 flex-col overflow-y-auto px-8 pt-6">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-white/10 py-5 text-2xl font-semibold text-white"
              >
                {label}
              </a>
            ))}
            {isServer && (
              <a
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="border-b border-white/10 py-5 text-2xl font-semibold text-white"
              >
                Dashboard
              </a>
            )}
            {isGuest && (
              <a
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="border-b border-white/10 py-5 text-2xl font-semibold text-white"
              >
                My Dashboard
              </a>
            )}
          </nav>

          <div className="shrink-0 px-8 pb-10 pt-6">
            {session ? (
              <button
                onClick={() => { setMenuOpen(false); handleSignOut() }}
                className="block w-full rounded-full border border-white/25 py-4 text-center text-sm font-semibold text-white"
              >
                Sign out
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <a
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full rounded-full border border-white/25 py-4 text-center text-sm font-semibold text-white"
                >
                  Sign in
                </a>
                <a
                  href="/get-started"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full rounded-full bg-white py-4 text-center text-sm font-semibold text-black"
                >
                  Get Started
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
