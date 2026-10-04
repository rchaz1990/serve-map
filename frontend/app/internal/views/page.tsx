'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type PathCount = { path: string; count: number }

type Stats = {
  total: number
  last24h: number
  last7d: number
  byPath: PathCount[]
}

export default function InternalViewsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'forbidden' | 'ok' | 'error'>('loading')
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login?redirect=/internal/views')
        return
      }
      try {
        const res = await fetch('/api/internal/page-views', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (cancelled) return
        if (res.status === 403) {
          setStatus('forbidden')
          return
        }
        if (!res.ok) {
          setStatus('error')
          return
        }
        const body = (await res.json()) as Stats
        if (cancelled) return
        setStats(body)
        setStatus('ok')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  if (status === 'forbidden') {
    return <p>not available for this account</p>
  }

  if (status === 'error') {
    return <p>Could not load views.</p>
  }

  if (status !== 'ok' || !stats) return null

  return (
    <main>
      <p>total views: {stats.total}</p>
      <p>last 24 hours: {stats.last24h}</p>
      <p>last 7 days: {stats.last7d}</p>
      <ul>
        {stats.byPath.map((row) => (
          <li key={row.path}>
            {row.path}: {row.count}
          </li>
        ))}
      </ul>
    </main>
  )
}
