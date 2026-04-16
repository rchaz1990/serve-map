'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/app/components/Navbar'

type ServerData = {
  id: string
  name: string
  role: string | null
  average_rating: number | null
  total_ratings: number | null
}

type Status = 'loading' | 'active' | 'not_found'

export default function ScanPage() {
  const params = useParams()
  const serverId = params?.code as string

  const [status, setStatus] = useState<Status>('loading')
  const [server, setServer] = useState<ServerData | null>(null)
  const [followed, setFollowed] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!serverId) { setStatus('not_found'); return }

    const load = async () => {
      const { data: serverData } = await supabase
        .from('servers')
        .select('id, name, role, average_rating, total_ratings')
        .eq('id', serverId)
        .maybeSingle()

      if (!serverData) { setStatus('not_found'); return }
      setServer(serverData as ServerData)

      // Store for rating page $SERVE rewards
      localStorage.setItem('slateRatingServerId', serverId)
      localStorage.setItem('slateRatingServerName', serverData.name)

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setCurrentUserId(session.user.id)
        setCurrentUserEmail(session.user.email ?? null)

        const { data: followRow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', session.user.id)
          .eq('server_id', serverId)
          .maybeSingle()
        if (followRow) setFollowed(true)
      }

      setStatus('active')
    }

    load()
  }, [serverId])

  async function handleFollow() {
    if (!currentUserId) { window.location.href = '/login'; return }
    setFollowLoading(true)
    if (followed) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId)
        .eq('server_id', serverId)
      setFollowed(false)
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUserId,
        follower_email: currentUserEmail,
        server_id: serverId,
        follower_type: localStorage.getItem('slateUserType') ?? 'guest',
      })
      setFollowed(true)
    }
    setFollowLoading(false)
  }

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

  // ── Not found ────────────────────────────────────────────────────────────
  if (status === 'not_found' || !server) {
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">This QR code is not valid</h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
            This server profile could not be found. Ask your server for their current QR code.
          </p>
          <a
            href="/live"
            className="mt-8 rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
          >
            See what&apos;s live tonight
          </a>
        </main>
      </div>
    )
  }

  const firstName = server.name.split(' ')[0]
  const initials = server.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

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
          {initials}
        </div>

        {/* Name + role */}
        <h1 className="text-2xl font-bold tracking-tight text-white">{server.name}</h1>
        <p className="mt-1 text-sm" style={{ color: '#A0A0A0' }}>{server.role ?? 'Server'}</p>

        {/* Rating */}
        {server.average_rating ? (
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-lg font-semibold text-white">{server.average_rating.toFixed(1)}</span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
            </svg>
            {server.total_ratings ? (
              <span className="text-sm" style={{ color: '#606060' }}>· {server.total_ratings} reviews</span>
            ) : null}
          </div>
        ) : null}

        {/* Message */}
        <p className="mx-auto mt-8 max-w-xs text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
          Rate your experience with {firstName} and follow them to know where they work next.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col gap-3">
          <a
            href="/rate"
            className="block rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80"
          >
            Rate {firstName}
          </a>
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className="block w-full rounded-full border py-4 text-sm font-semibold transition-colors"
            style={{
              borderColor: followed ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
              color: '#FFFFFF',
              backgroundColor: followed ? 'rgba(255,255,255,0.06)' : 'transparent',
              opacity: followLoading ? 0.5 : 1,
              cursor: followLoading ? 'default' : 'pointer',
            }}
          >
            {followed ? `Following ${firstName} ✓` : `Follow ${firstName}`}
          </button>
          <a
            href={`/server/${server.id}`}
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
