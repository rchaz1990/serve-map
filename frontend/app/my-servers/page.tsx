'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/app/components/Navbar'

type FollowedServer = {
  server_id: string
  servers: {
    id: string
    name: string
    role: string | null
    average_rating: number | null
    total_ratings: number | null
  } | null
  created_at: string
}

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating)
  return (
    <span className="text-xs text-white">
      {'★'.repeat(rounded)}{'☆'.repeat(5 - rounded)}
    </span>
  )
}

export default function MyServersPage() {
  const [follows, setFollows] = useState<FollowedServer[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { setLoading(false); return }
      setUserId(session.user.id)

      const { data } = await supabase
        .from('follows')
        .select('server_id, created_at, servers(id, name, role, average_rating, total_ratings)')
        .eq('follower_id', session.user.id)
        .order('created_at', { ascending: false })

      setFollows((data ?? []) as unknown as FollowedServer[])
      setLoading(false)
    }
    load()
  }, [])

  async function handleUnfollow(serverId: string) {
    if (!userId) return
    await supabase.from('follows').delete()
      .eq('follower_id', userId)
      .eq('server_id', serverId)
    setFollows(prev => prev.filter(f => f.server_id !== serverId))
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-5xl px-8 py-16 lg:px-16">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-10">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            My Servers
          </h1>
          <p className="text-sm" style={{ color: '#A0A0A0' }}>
            The people who made your dining experiences memorable.
          </p>
          <p className="mt-1.5 text-xs" style={{ color: '#606060' }}>
            Servers appear here after you follow them from their QR code or profile.
          </p>
        </div>

        {/* ── Server cards ────────────────────────────────────────────── */}
        {loading ? (
          <p className="text-sm" style={{ color: '#606060' }}>Loading…</p>
        ) : follows.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/15">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" style={{ color: '#A0A0A0' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white">No servers followed yet</p>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed" style={{ color: '#606060' }}>
              Scan a server&apos;s QR code or visit their profile to follow them. They&apos;ll appear here.
            </p>
            <a
              href="/live"
              className="mt-6 rounded-full border border-white/20 px-6 py-2.5 text-xs font-semibold text-white transition-colors hover:border-white"
            >
              See who&apos;s live tonight
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {follows.map(f => {
              const s = f.servers
              if (!s) return null
              const firstName = s.name.split(' ')[0]
              const initials = s.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <div
                  key={f.server_id}
                  className="relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20"
                >
                  <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-black px-2.5 py-0.5 text-[10px] font-semibold text-white">
                    Following ✓
                  </span>

                  <div className="mb-5 flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white text-sm font-bold text-black">
                      {initials}
                    </div>
                    <div className="min-w-0 pr-16">
                      <p className="truncate text-base font-bold text-white">{s.name}</p>
                      <p className="truncate text-xs" style={{ color: '#A0A0A0' }}>
                        {s.role ?? 'Server'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-5 flex flex-col gap-2.5 border-t border-white/10 pt-5">
                    {s.average_rating != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: '#A0A0A0' }}>Rating</span>
                        <div className="flex items-center gap-1.5">
                          <StarRating rating={s.average_rating} />
                          <span className="text-xs font-medium text-white">{s.average_rating.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: '#A0A0A0' }}>Reviews</span>
                      <span className="text-xs font-medium text-white">{s.total_ratings ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: '#A0A0A0' }}>Following since</span>
                      <span className="text-xs font-medium text-white">
                        {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-2">
                    <a
                      href={`/server/${s.id}`}
                      className="block rounded-full bg-white py-2.5 text-center text-xs font-semibold text-black transition-opacity hover:opacity-80"
                    >
                      View {firstName}&apos;s profile
                    </a>
                    <button
                      onClick={() => handleUnfollow(f.server_id)}
                      className="block w-full rounded-full border border-white/20 py-2.5 text-center text-xs font-medium text-white transition-colors hover:border-white"
                    >
                      Unfollow
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
