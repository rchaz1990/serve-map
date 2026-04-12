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

type ServerRow = { id: string; name: string | null }

export default function Navbar({ overlay = false }: { overlay?: boolean }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [serverRow, setServerRow] = useState<ServerRow | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)

  useEffect(() => {
    // ── Step 1: Read localStorage synchronously — no async delay ──────────────
    // This runs before the first paint so the nav never shows a logged-out flash.
    const storedId   = localStorage.getItem('slateServerId')
    const storedType = localStorage.getItem('slateUserType')
    const storedName = localStorage.getItem('slateServerName')

    if (storedId && storedType === 'server') {
      // We know the user is a server — show Dashboard/Sign out immediately
      setServerRow({ id: storedId, name: storedName })
      setAuthLoaded(true)  // ← render auth links right now, no waiting
    }

    // ── Step 2: Verify with Supabase in background ────────────────────────────
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)

      if (s?.user) {
        if (!storedId) {
          // No cached state — need to detect from Supabase
          const found = await detectServer(s.user.id, s.user.email ?? null)
          if (found) {
            setServerRow(found)
            localStorage.setItem('slateServerId', found.id)
            localStorage.setItem('slateUserType', 'server')
            if (found.name) localStorage.setItem('slateServerName', found.name)
          } else {
            setServerRow(null)
            localStorage.setItem('slateUserType', 'guest')
            localStorage.removeItem('slateServerId')
            localStorage.removeItem('slateServerName')
          }
        }
        // If storedId exists, trust the cache — already set in Step 1
      } else {
        // No active session — clear any stale cache
        setServerRow(null)
        localStorage.removeItem('slateUserType')
        localStorage.removeItem('slateServerId')
        localStorage.removeItem('slateServerName')
      }
      setAuthLoaded(true)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      if (s?.user) {
        // Re-run detection after sign-in events (e.g. redirected from /login)
        const found = await detectServer(s.user.id, s.user.email ?? null)
        if (found) {
          setServerRow(found)
          localStorage.setItem('slateServerId', found.id)
          localStorage.setItem('slateUserType', 'server')
          if (found.name) localStorage.setItem('slateServerName', found.name)
        } else {
          setServerRow(null)
          localStorage.setItem('slateUserType', 'guest')
          localStorage.removeItem('slateServerId')
          localStorage.removeItem('slateServerName')
        }
        setAuthLoaded(true)
      } else {
        setServerRow(null)
        setAuthLoaded(true)
        localStorage.removeItem('slateUserType')
        localStorage.removeItem('slateServerId')
        localStorage.removeItem('slateServerName')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function detectServer(userId: string, userEmail: string | null): Promise<ServerRow | null> {
    console.log('[Navbar] Detecting server for userId:', userId, 'email:', userEmail)

    // Method 1 — match by Supabase auth user ID stored in wallet_address
    const { data: byId } = await supabase
      .from('servers')
      .select('id, name')
      .eq('wallet_address', userId)
      .maybeSingle()
    if (byId) { console.log('[Navbar] Found by wallet_address'); return byId }

    // Method 2 — case-insensitive email match
    if (userEmail) {
      const { data: byEmail } = await supabase
        .from('servers')
        .select('id, name')
        .ilike('email', userEmail)
        .maybeSingle()
      if (byEmail) { console.log('[Navbar] Found by email'); return byEmail }
    }

    // Method 3 — localStorage server ID
    const storedId = localStorage.getItem('slateServerId')
    if (storedId) {
      const { data: byStored } = await supabase
        .from('servers')
        .select('id, name')
        .eq('id', storedId)
        .maybeSingle()
      if (byStored) { console.log('[Navbar] Found by localStorage id'); return byStored }
    }

    console.log('[Navbar] No server row found — treating as guest')
    return null
  }

  async function handleSignOut() {
    localStorage.removeItem('slateUserType')
    localStorage.removeItem('slateServerId')
    localStorage.removeItem('slateServerName')
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const serverId = serverRow?.id ?? null
  const isServer = authLoaded && session && serverRow
  const isGuest  = authLoaded && session && !serverRow

  function DesktopAuthLinks() {
    if (!authLoaded) return null
    if (!session) {
      return (
        <div className="hidden items-center gap-3 md:flex">
          <a href="/login" className="text-xs font-medium text-white/50 transition-colors hover:text-white">
            Sign in
          </a>
          <a href="/get-started" className="rounded-full bg-white px-5 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-80">
            Get Started
          </a>
        </div>
      )
    }
    return (
      <div className="hidden items-center gap-4 md:flex">
        {isServer && (
          <>
            <a href={`/server/${serverId}`} className="text-xs font-medium text-white/50 transition-colors hover:text-white">
              My Profile
            </a>
            <a href="/dashboard" className="text-xs font-medium text-white/50 transition-colors hover:text-white">
              Dashboard
            </a>
          </>
        )}
        {isGuest && (
          <a href="/account" className="text-xs font-medium text-white/50 transition-colors hover:text-white">
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
        <a href="/" className="flex items-center gap-2.5">
          {LOGO}
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Slate</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ href, label, pulse }) => (
            <a key={href} href={href} className="flex items-center gap-2 text-xs font-medium text-white/50 transition-colors hover:text-white">
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

        <DesktopAuthLinks />

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

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black md:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between px-8">
            <a href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5">
              {LOGO}
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Slate</span>
            </a>
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="flex h-10 w-10 items-center justify-center text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="border-t border-white/10" />

          <nav className="flex flex-1 flex-col overflow-y-auto px-8 pt-6">
            {NAV_LINKS.map(({ href, label }) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="border-b border-white/10 py-5 text-2xl font-semibold text-white">
                {label}
              </a>
            ))}
            {isServer && (
              <>
                <a href={`/server/${serverId}`} onClick={() => setMenuOpen(false)} className="border-b border-white/10 py-5 text-2xl font-semibold text-white">
                  My Profile
                </a>
                <a href="/dashboard" onClick={() => setMenuOpen(false)} className="border-b border-white/10 py-5 text-2xl font-semibold text-white">
                  Dashboard
                </a>
              </>
            )}
            {isGuest && (
              <a href="/account" onClick={() => setMenuOpen(false)} className="border-b border-white/10 py-5 text-2xl font-semibold text-white">
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
                <a href="/login" onClick={() => setMenuOpen(false)} className="block w-full rounded-full border border-white/25 py-4 text-center text-sm font-semibold text-white">
                  Sign in
                </a>
                <a href="/get-started" onClick={() => setMenuOpen(false)} className="block w-full rounded-full bg-white py-4 text-center text-sm font-semibold text-black">
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
