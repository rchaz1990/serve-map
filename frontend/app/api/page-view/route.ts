import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PAUSED } from '@/lib/early-test'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function isValidPath(path: unknown): path is string {
  if (typeof path !== 'string') return false
  if (path.length === 0 || path.length > 200) return false
  if (!path.startsWith('/')) return false
  if (path.includes('?') || path.includes('#')) return false
  if (path.includes('//')) return false
  if (path.includes('://')) return false
  return true
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const path = (body as { path?: unknown })?.path
  if (!isValidPath(path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }
  // Early test: QR-scan pages are never recorded (see lib/early-test.ts).
  if (PAUSED.qrScanTracking && (path === '/scan' || path.startsWith('/scan/'))) {
    return new NextResponse(null, { status: 204 })
  }

  const { error } = await supabaseAdmin.from('page_views').insert({ path })
  if (error) {
    console.error(error.message)
  }
  return new NextResponse(null, { status: 204 })
}
