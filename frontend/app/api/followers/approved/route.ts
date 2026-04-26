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

  const { data, error } = await supabaseAdmin
    .from('follows')
    .select('id, follower_id, follower_email, created_at')
    .eq('server_id', server.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ followers: data ?? [] })
}
