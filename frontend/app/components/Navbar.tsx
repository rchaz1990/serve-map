'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

type Notification = {
  id: string
  created_at: string
  title: string
  message: string
  link: string | null
  is_read: boolean
}

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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [pendingFollowerCount, setPendingFollowerCount] = useState(0)
  const bellRef = useRef<HTMLDivElement>(null)

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

        // Load unread notifications
        if (s.user.email) {
          const { data: notifs } = await supabase
            .from('notifications')
            .select('id, created_at, title, message, link, is_read')
            .eq('recipient_email', s.user.email)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(10)
          if (notifs) {
            setNotifications(notifs as Notification[])
            setUnreadCount(notifs.length)
          }
        }

        // Load pending follower count for servers
        const sid = localStorage.getItem('slateServerId')
        if (sid) {
          const { count } = await supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('server_id', sid)
            .eq('status', 'pending')
          setPendingFollowerCount(count ?? 0)
        }
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setServerRow(null)
        setAuthLoaded(true)
        localStorage.removeItem('slateServerId')
        localStorage.removeItem('slateUserType')
        localStorage.removeItem('slateServerName')
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (s?.user) {
          setSession(s)
          const storedId = localStorage.getItem('slateServerId')
          if (storedId) {
            // Trust cached server ID — already hydrated in Step 1
            if (!serverRow) {
              setServerRow({ id: storedId, name: localStorage.getItem('slateServerName') })
            }
          } else {
            const { data } = await supabase
              .from('servers')
              .select('id, name')
              .eq('wallet_address', s.user.id)
              .maybeSingle()
            if (data?.id) {
              setServerRow(data)
              localStorage.setItem('slateServerId', data.id)
              localStorage.setItem('slateUserType', 'server')
              if (data.name) localStorage.setItem('slateServerName', data.name)
            }
          }
          setAuthLoaded(true)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

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
            <a href="/dashboard/followers" className="relative text-xs font-medium text-white/50 transition-colors hover:text-white">
              Followers
              {pendingFollowerCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -10,
                  background: 'white', color: 'black',
                  borderRadius: '50%', width: 14, height: 14,
                  fontSize: 8, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, lineHeight: 1,
                }}>
                  {pendingFollowerCount > 9 ? '9+' : pendingFollowerCount}
                </span>
              )}
            </a>
          </>
        )}
        {isGuest && (
          <a href="/account" className="text-xs font-medium text-white/50 transition-colors hover:text-white">
            My Dashboard
          </a>
        )}

        {/* Notification bell */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(v => !v)}
            aria-label="Notifications"
            style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 18, height: 18, color: unreadCount > 0 ? 'white' : 'rgba(255,255,255,0.4)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'white', color: 'black',
                borderRadius: '50%', width: 16, height: 16,
                fontSize: 9, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, lineHeight: 1,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 12px)', right: 0,
              background: '#0a0a0a', border: '1px solid #1e1e1e',
              width: 320, maxHeight: 400, overflowY: 'auto',
              zIndex: 1000, borderRadius: 8,
              boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', fontSize: 11, letterSpacing: '2px', color: '#444', textTransform: 'uppercase' }}>
                Notifications
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: '24px 16px', color: '#444', fontSize: 13, textAlign: 'center' }}>
                  No new notifications
                </div>
              ) : (
                notifications.map(n => (
                  <a
                    key={n.id}
                    href={n.link ?? '#'}
                    onClick={() => markRead(n.id)}
                    style={{ display: 'block', padding: '14px 16px', borderBottom: '1px solid #111', textDecoration: 'none', color: 'white' }}
                  >
                    <div style={{ fontSize: 13, marginBottom: 4, lineHeight: 1.4 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>
                      {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </a>
                ))
              )}
            </div>
          )}
        </div>

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
                <a href="/dashboard/followers" onClick={() => setMenuOpen(false)} className="flex items-center justify-between border-b border-white/10 py-5 text-2xl font-semibold text-white">
                  Followers
                  {pendingFollowerCount > 0 && (
                    <span style={{
                      background: 'white', color: 'black',
                      borderRadius: '999px', padding: '2px 8px',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {pendingFollowerCount}
                    </span>
                  )}
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
