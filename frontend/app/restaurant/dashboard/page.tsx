'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────

type StaffMember = {
  server_id: string
  name: string
  role: string | null
  photo_url: string | null
  average_rating: number
  total_ratings: number
  follower_count: number
  is_on_shift: boolean
}

const REFRESH_MS = 5 * 60 * 1000

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Toggle (large, iPad-friendly) ──────────────────────────────────────────────

function ShiftToggle({
  on,
  busy,
  onChange,
}: {
  on: boolean
  busy: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={() => onChange(!on)}
      className="relative h-12 w-24 shrink-0 rounded-full border transition-colors disabled:opacity-50"
      style={{
        backgroundColor: on ? '#22c55e' : 'rgba(255,255,255,0.08)',
        borderColor: on ? '#22c55e' : 'rgba(255,255,255,0.2)',
      }}
    >
      <span
        className="absolute top-1 h-10 w-10 rounded-full bg-white shadow-md transition-transform"
        style={{ transform: on ? 'translateX(48px)' : 'translateX(4px)' }}
      />
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RestaurantManagerDashboard() {
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [managerName, setManagerName] = useState<string>('')
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [busyServerId, setBusyServerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (rName?: string) => {
    const targetName = rName ?? restaurantName
    if (!targetName) return

    const [staffRes, shiftsRes] = await Promise.all([
      supabase
        .from('server_restaurants')
        .select('server_id, servers(id, name, role, photo_url, average_rating, total_ratings, follower_count)')
        .eq('restaurant_name', targetName),
      supabase
        .from('shifts')
        .select('server_id, is_active')
        .eq('restaurant_name', targetName)
        .eq('is_active', true),
    ])

    const activeServerIds = new Set((shiftsRes.data ?? []).map(s => s.server_id))

    const merged: StaffMember[] = (staffRes.data ?? [])
      .map((row: Record<string, unknown>) => {
        const srv = row.servers as Record<string, unknown> | null
        if (!srv) return null
        const id = srv.id as string
        return {
          server_id: id,
          name: (srv.name as string) ?? 'Unnamed',
          role: (srv.role as string) ?? null,
          photo_url: (srv.photo_url as string) ?? null,
          average_rating: (srv.average_rating as number) ?? 0,
          total_ratings: (srv.total_ratings as number) ?? 0,
          follower_count: (srv.follower_count as number) ?? 0,
          is_on_shift: activeServerIds.has(id),
        }
      })
      .filter(Boolean) as StaffMember[]

    // Stable order: on-shift first, then by name
    merged.sort((a, b) => {
      if (a.is_on_shift !== b.is_on_shift) return a.is_on_shift ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    setStaff(merged)
    setLoading(false)
  }, [restaurantName])

  // Initial auth + manager lookup
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/restaurant/signup')
        return
      }

      const { data: manager, error: mErr } = await supabase
        .from('restaurant_managers')
        .select('name, restaurant_name')
        .eq('auth_id', session.user.id)
        .maybeSingle()

      if (mErr) {
        console.error('[manager dashboard] manager lookup:', mErr)
        setError(mErr.message)
        setLoading(false)
        return
      }
      if (!manager) {
        router.push('/restaurant/signup')
        return
      }

      setManagerName(manager.name ?? '')
      setRestaurantName(manager.restaurant_name)
      await loadData(manager.restaurant_name)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!restaurantName) return
    const id = setInterval(() => { loadData() }, REFRESH_MS)
    return () => clearInterval(id)
  }, [restaurantName, loadData])

  async function handleToggle(member: StaffMember, next: boolean) {
    if (!restaurantName) return
    setBusyServerId(member.server_id)
    try {
      if (next) {
        // Activate shift
        const { error: insertErr } = await supabase.from('shifts').insert({
          server_id: member.server_id,
          restaurant_name: restaurantName,
          started_at: new Date().toISOString(),
          is_active: true,
          activated_by: 'manager',
        })
        if (insertErr) throw new Error(insertErr.message)

        // Notify followers — best-effort
        fetch('/api/notify-followers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverId: member.server_id,
            serverName: member.name,
            restaurantName,
            type: 'shift_started',
          }),
        }).catch(err => console.error('[manager dashboard] notify-followers:', err))
      } else {
        // Deactivate active shift
        const { error: updateErr } = await supabase
          .from('shifts')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('server_id', member.server_id)
          .eq('restaurant_name', restaurantName)
          .eq('is_active', true)
        if (updateErr) throw new Error(updateErr.message)
      }

      // Optimistic update
      setStaff(prev => prev.map(s =>
        s.server_id === member.server_id ? { ...s, is_on_shift: next } : s
      ))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[manager dashboard] toggle:', msg)
      setError(msg)
    } finally {
      setBusyServerId(null)
    }
  }

  const onShiftCount = staff.filter(s => s.is_on_shift).length

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-3xl px-8 py-12 lg:py-16">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
            Manager Dashboard
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {restaurantName ?? '…'}
          </h1>
          {managerName && (
            <p className="mt-3 text-sm" style={{ color: '#A0A0A0' }}>
              Signed in as {managerName}
            </p>
          )}

          <div className="mt-8 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white tabular-nums">{onShiftCount}</span>
            <span className="text-sm" style={{ color: '#A0A0A0' }}>
              {onShiftCount === 1 ? 'staff working tonight' : 'staff working tonight'}
            </span>
          </div>
          <p className="mt-2 text-xs" style={{ color: '#606060' }}>
            Auto-refreshes every 5 minutes
          </p>
        </div>

        <div className="border-t border-white/10" />

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* ── Staff list ──────────────────────────────────────────────────── */}
        <section className="py-10">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>
            Staff
          </p>

          {loading ? (
            <p className="text-sm" style={{ color: '#606060' }}>Loading…</p>
          ) : staff.length === 0 ? (
            <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>
              No staff are linked to this restaurant yet. Once your servers list this restaurant on their Slate profile, they&apos;ll appear here.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {staff.map(member => {
                const busy = busyServerId === member.server_id
                return (
                  <div
                    key={member.server_id}
                    className="flex items-center gap-5 rounded-2xl border border-white/10 px-5 py-5"
                    style={{ backgroundColor: '#0a0a0a' }}
                  >
                    {/* Photo */}
                    <div className="shrink-0">
                      {member.photo_url ? (
                        <Image
                          src={member.photo_url}
                          alt={member.name}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-base font-bold text-white">
                          {initials(member.name)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="truncate text-base font-semibold text-white">{member.name}</p>
                        {member.is_on_shift ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                            style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)' }}
                          >
                            On Shift
                          </span>
                        ) : (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#A0A0A0', border: '1px solid rgba(255,255,255,0.15)' }}
                          >
                            Not Working
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs capitalize" style={{ color: '#A0A0A0' }}>
                        {member.role ?? 'Server'}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: '#606060' }}>
                        {member.average_rating > 0 && (
                          <>
                            <span className="font-semibold text-white">
                              {member.average_rating.toFixed(1)} ★
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <span>
                          {member.follower_count} {member.follower_count === 1 ? 'follower' : 'followers'}
                        </span>
                      </div>
                    </div>

                    {/* Toggle */}
                    <ShiftToggle
                      on={member.is_on_shift}
                      busy={busy}
                      onChange={next => handleToggle(member, next)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div className="border-t border-white/10 py-8">
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-xs font-medium transition-colors hover:text-white"
            style={{ color: '#404040' }}
          >
            Sign out →
          </button>
        </div>
      </main>
    </div>
  )
}
