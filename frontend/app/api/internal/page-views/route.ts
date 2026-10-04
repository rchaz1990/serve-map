import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_EMAIL = 'r.chaz1990@gmail.com'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function countSince(sinceIso?: string): Promise<number> {
  let query = supabaseAdmin
    .from('page_views')
    .select('*', { count: 'exact', head: true })
  if (sinceIso) query = query.gte('created_at', sinceIso)
  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function topPaths(): Promise<{ path: string; count: number }[]> {
  const counts = new Map<string, number>()
  const pageSize = 1000
  let from = 0

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('page_views')
      .select('path')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    for (const row of rows) {
      if (typeof row.path !== 'string' || !row.path) continue
      counts.set(row.path, (counts.get(row.path) ?? 0) + 1)
    }
    if (rows.length < pageSize) break
    from += pageSize
  }

  return [...counts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
    .slice(0, 20)
}

export async function GET(request: Request) {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = (user.email ?? '').toLowerCase()
  if (email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const now = Date.now()
    const last24hSince = new Date(now - 24 * 60 * 60 * 1000).toISOString()
    const last7dSince = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [total, last24h, last7d, byPath] = await Promise.all([
      countSince(),
      countSince(last24hSince),
      countSince(last7dSince),
      topPaths(),
    ])
    return NextResponse.json({ total, last24h, last7d, byPath })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load page views'
    console.error(message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
