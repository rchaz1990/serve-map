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

export async function GET(request: Request) {
  const server = await getServerForRequest(request)
  if (!server) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Display label only (first name + initial, or "Guest ····xxxx"); never the follower's
  // email address (migration 38).
  const { data, error } = await supabaseAdmin
    .rpc('follower_list', { p_server_id: server.id, p_status: 'pending' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ followers: data ?? [] })
}
