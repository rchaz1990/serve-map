import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server-auth'
import { workerTermsOnFile } from '@/lib/legal-server'

// Whether a worker can receive new ratings: only workers who have accepted the current
// Terms/Privacy as a worker (unclaimed profiles never can). Public; returns a yes/no only.
// /api/submit-rating enforces the same rule on the server.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('server') ?? ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ accepting: false }, { status: 400 })
  }
  const admin = supabaseAdmin()
  const { data: server } = await admin.from('servers').select('wallet_address').eq('id', id).maybeSingle()
  const accepting = !!server && await workerTermsOnFile(admin, server.wallet_address as string | null)
  return NextResponse.json({ accepting }, { headers: { 'Cache-Control': 'no-store' } })
}
