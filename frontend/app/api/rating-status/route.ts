import { NextResponse } from 'next/server'
import { getRequestUser, supabaseAdmin } from '@/lib/server-auth'
import { workerTermsOnFile } from '@/lib/legal-server'
import { viewerMayUseProfile } from '@/lib/test-profiles'

// Whether a worker can receive new ratings: only workers who have accepted the current
// Terms/Privacy as a worker (unclaimed profiles never can). Returns a yes/no only.
// /api/submit-rating enforces the same rule on the server.
// A test profile (migration 42) is reported as not found to anyone who isn't an
// authorized test account — the same answer as for an id that doesn't exist.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('server') ?? ''
  const notFound = () => NextResponse.json({ accepting: false }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ accepting: false }, { status: 400 })
  }
  const admin = supabaseAdmin()
  const access = await viewerMayUseProfile(admin, id, await getRequestUser(request))
  if (access === 'error') return NextResponse.json({ accepting: false }, { status: 503 })
  if (access === 'hidden') return notFound()
  const { data: server } = await admin.from('servers').select('wallet_address').eq('id', id).maybeSingle()
  if (!server) return notFound()
  const accepting = await workerTermsOnFile(admin, server.wallet_address as string | null)
  return NextResponse.json({ accepting }, { headers: { 'Cache-Control': 'no-store' } })
}
