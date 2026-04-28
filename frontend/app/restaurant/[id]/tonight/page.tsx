'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

type ActiveServer = {
  shift_id: string
  server_id: string
  name: string
  role: string | null
  photo_url: string | null
  average_rating: number
  follower_count: number
  started_at: string
}

type VibeReport = {
  id: string
  vibe: string
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const VIBE_EMOJI: Record<string, string> = {
  CHILL: '🧊',
  LIVE: '🔥',
  PACKED: '🚀',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function firstName(name: string) {
  return name.split(' ')[0]
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RestaurantTonightPage() {
  const { id } = useParams<{ id: string }>()
  const restaurantName = decodeURIComponent(id ?? '')

  const [activeServers, setActiveServers] = useState<ActiveServer[]>([])
  const [vibes, setVibes] = useState<VibeReport[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!restaurantName) return
    const since12h = new Date(Date.now() - 12 * 3_600_000).toISOString()
    const since48h = new Date(Date.now() - 48 * 3_600_000).toISOString()

    const [shiftsRes, vibesRes] = await Promise.all([
      supabase
        .from('shifts')
        .select('id, server_id, started_at, servers(id, name, role, photo_url, average_rating, follower_count)')
        .ilike('restaurant_name', restaurantName)
        .eq('is_active', true)
        .gte('started_at', since12h)
        .order('started_at', { ascending: false }),
      supabase
        .from('vibe_reports')
        .select('id, vibe, created_at')
        .ilike('restaurant_name', restaurantName)
        .gte('created_at', since48h)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    if (shiftsRes.data) {
      const mapped = shiftsRes.data
        .map((s: Record<string, unknown>) => {
          const srv = s.servers as Record<string, unknown> | null
          if (!srv) return null
          return {
            shift_id: s.id as string,
            server_id: srv.id as string,
            name: (srv.name as string) ?? 'Server',
            role: (srv.role as string) ?? null,
            photo_url: (srv.photo_url as string) ?? null,
            average_rating: (srv.average_rating as number) ?? 0,
            follower_count: (srv.follower_count as number) ?? 0,
            started_at: s.started_at as string,
          }
        })
        .filter(Boolean) as ActiveServer[]
      setActiveServers(mapped)
    }

    if (vibesRes.data) setVibes(vibesRes.data as VibeReport[])
    setLoading(false)
  }, [restaurantName])

  useEffect(() => { load() }, [load])

  if (!restaurantName) return null

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-2xl px-8 py-16 lg:py-20">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
            Tonight at
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {restaurantName}
          </h1>
        </div>

        <div className="border-t border-white/10" />

        {/* ── Who's working tonight ────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-8 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>
            Who&apos;s working tonight
          </p>

          {loading ? (
            <p className="text-sm" style={{ color: '#606060' }}>Loading…</p>
          ) : activeServers.length === 0 ? (
            <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>
              No servers have checked in yet tonight. Check back later.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-white/10">
              {activeServers.map(s => (
                <div key={s.shift_id} className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:gap-6">
                  {/* Photo */}
                  <div className="shrink-0">
                    {s.photo_url ? (
                      <Image
                        src={s.photo_url}
                        alt={s.name}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-base font-bold text-white">
                        {initials(s.name)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-white">{s.name}</p>
                    <p className="mt-0.5 text-xs capitalize" style={{ color: '#A0A0A0' }}>
                      {s.role ?? 'Server'}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: '#606060' }}>
                      {s.average_rating > 0 && (
                        <>
                          <span className="font-semibold text-white">{s.average_rating.toFixed(1)} ★</span>
                          <span>·</span>
                        </>
                      )}
                      <span>
                        {s.follower_count} {s.follower_count === 1 ? 'follower' : 'followers'}
                      </span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/rate?server=${s.server_id}`}
                      className="rounded-full bg-white px-4 py-2 text-center text-xs font-semibold text-black transition-opacity hover:opacity-80"
                    >
                      Rate {firstName(s.name)}
                    </Link>
                    <Link
                      href={`/server/${s.server_id}`}
                      className="rounded-full border border-white/25 px-4 py-2 text-center text-xs font-semibold text-white transition-colors hover:border-white"
                    >
                      Follow {firstName(s.name)}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-white/10" />

        {/* ── Recent vibe reports ──────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-8 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>
            Recent vibe reports
          </p>

          {vibes.length === 0 ? (
            <p className="text-sm" style={{ color: '#606060' }}>
              No vibe reports yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {vibes.map(v => {
                const key = (v.vibe ?? '').toUpperCase()
                return (
                  <div key={v.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: '20px' }}>{VIBE_EMOJI[key] ?? '✨'}</span>
                      <p className="text-sm font-semibold capitalize text-white">
                        {(v.vibe ?? 'reported').toLowerCase()}
                      </p>
                    </div>
                    <p className="text-xs" style={{ color: '#606060' }}>
                      {timeAgo(v.created_at)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
