'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { supabase } from '@/lib/supabase'

type Tab = 'pending' | 'approved' | 'blocked'

interface FollowRow {
  id: string
  follower_id: string
  follower_email: string | null
  created_at: string
}

function initials(email: string | null): string {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

function displayName(email: string | null): string {
  if (!email) return 'Unknown'
  return email.split('@')[0]
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

export default function FollowersPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('approved')
  const [pending, setPending] = useState<FollowRow[]>([])
  const [approved, setApproved] = useState<FollowRow[]>([])
  const [blocked, setBlocked] = useState<FollowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [requireApproval, setRequireApproval] = useState(true)

  const fetchAll = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const token = session.access_token

    setLoading(true)
    const headers = { Authorization: `Bearer ${token}` }

    const [pendingRes, approvedRes, blockedRes, serverRow] = await Promise.all([
      fetch('/api/followers/pending', { headers }).then(r => r.json()),
      fetch('/api/followers/approved', { headers }).then(r => r.json()),
      fetch('/api/followers/blocked', { headers }).then(r => r.json()),
      supabase
        .from('servers')
        .select('follow_approval')
        .eq('wallet_address', session.user.id)
        .maybeSingle(),
    ])

    if (pendingRes.error || approvedRes.error || blockedRes.error) {
      setError('Failed to load followers. Make sure you are signed in as a server account.')
      setLoading(false)
      return
    }

    setPending(pendingRes.followers ?? [])
    setApproved(approvedRes.followers ?? [])
    setBlocked(blockedRes.followers ?? [])
    setRequireApproval((serverRow.data?.follow_approval ?? 'approval') === 'approval')
    setLoading(false)
  }, [router])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function apiPost(path: string, body: object) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { error: 'Not signed in' }
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  async function handleApprove(followId: string) {
    setActionLoading(followId)
    const result = await apiPost('/api/followers/approve', { followId })
    if (result.error) { setError(result.error); setActionLoading(null); return }
    await fetchAll()
    setActionLoading(null)
  }

  async function handleBlock(followId: string) {
    setActionLoading(followId)
    const result = await apiPost('/api/followers/block', { followId })
    if (result.error) { setError(result.error); setActionLoading(null); return }
    await fetchAll()
    setActionLoading(null)
  }

  async function handleUnblock(followId: string) {
    setActionLoading(followId)
    const result = await apiPost('/api/followers/unblock', { followId })
    if (result.error) { setError(result.error); setActionLoading(null); return }
    await fetchAll()
    setActionLoading(null)
  }

  // Pending tab only shows when the server has approval mode on AND there are pending requests.
  // Otherwise the page is just a clean Followers / Blocked view.
  const showPendingTab = requireApproval && pending.length > 0

  const TABS: { key: Tab; label: string; count: number }[] = [
    ...(showPendingTab ? [{ key: 'pending' as Tab, label: 'Pending Requests', count: pending.length }] : []),
    { key: 'approved', label: 'Followers', count: approved.length },
    { key: 'blocked', label: 'Blocked', count: blocked.length },
  ]

  // If the active tab has been hidden, fall back to Followers
  const safeTab: Tab = tab === 'pending' && !showPendingTab ? 'approved' : tab
  const rows = safeTab === 'pending' ? pending : safeTab === 'approved' ? approved : blocked

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-3xl px-8 py-12 lg:px-6">

        {/* Back + header */}
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-xs transition-colors hover:text-white"
          style={{ color: '#606060' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Dashboard
        </Link>

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Followers</h1>
        <p className="mb-10 text-sm" style={{ color: '#606060' }}>
          Manage who follows you. Approve or block requests.
        </p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 flex gap-0 border-b border-white/10">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors"
              style={{ color: safeTab === t.key ? 'white' : '#404040' }}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className="ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    backgroundColor: t.key === 'pending' ? 'white' : 'rgba(255,255,255,0.15)',
                    color: t.key === 'pending' ? 'black' : 'white',
                  }}
                >
                  {t.count}
                </span>
              )}
              {safeTab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-sm" style={{ color: '#404040' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 p-10 text-center" style={{ backgroundColor: '#0a0a0a' }}>
            <p className="text-sm font-semibold text-white">
              {safeTab === 'pending' && 'No pending requests'}
              {safeTab === 'approved' && 'No followers yet'}
              {safeTab === 'blocked' && 'No blocked users'}
            </p>
            <p className="mt-1 text-xs" style={{ color: '#404040' }}>
              {safeTab === 'pending' && 'New follow requests will appear here for your approval.'}
              {safeTab === 'approved' && 'Approved followers appear here.'}
              {safeTab === 'blocked' && 'Users you block will appear here. Unblocking lets them request again.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map(row => {
              const busy = actionLoading === row.id
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 p-4"
                  style={{ backgroundColor: '#0a0a0a' }}
                >
                  {/* Avatar */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-sm font-bold text-white"
                    style={{ backgroundColor: '#111' }}
                  >
                    {initials(row.follower_email)}
                  </div>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {displayName(row.follower_email)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: '#404040' }}>
                      {safeTab === 'pending' ? 'Requested' : safeTab === 'approved' ? 'Following since' : 'Blocked'}{' '}
                      {timeAgo(row.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-2">
                    {safeTab === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(row.id)}
                          disabled={busy}
                          className="rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-black transition-opacity hover:opacity-80 disabled:opacity-40"
                        >
                          {busy ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleBlock(row.id)}
                          disabled={busy}
                          className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:border-white disabled:opacity-40"
                        >
                          {busy ? '…' : 'Block'}
                        </button>
                      </>
                    )}
                    {safeTab === 'approved' && (
                      <button
                        onClick={() => handleBlock(row.id)}
                        disabled={busy}
                        className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-40"
                      >
                        {busy ? '…' : 'Block'}
                      </button>
                    )}
                    {safeTab === 'blocked' && (
                      <button
                        onClick={() => handleUnblock(row.id)}
                        disabled={busy}
                        className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:border-white disabled:opacity-40"
                      >
                        {busy ? '…' : 'Unblock'}
                      </button>
                    )}
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
