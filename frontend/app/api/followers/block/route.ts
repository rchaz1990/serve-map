import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getServerForRequest(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data } = await supabaseAdmin
    .from('servers')
    .select('id')
    .eq('wallet_address', user.id)
    .maybeSingle()
  return data ?? null
}

export async function POST(request: Request) {
  const server = await getServerForRequest(request)
  if (!server) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { followId } = await request.json()
  if (!followId) return NextResponse.json({ error: 'Missing followId' }, { status: 400 })

  // Atomic: block + decrement follower_count only if previously approved, via RPC
  const { error } = await supabaseAdmin.rpc('block_follower', {
    p_follow_id: followId,
    p_server_id: server.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
