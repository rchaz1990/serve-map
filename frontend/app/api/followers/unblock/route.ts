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

  // Delete the blocked row — guest can request again after this
  const { error } = await supabaseAdmin
    .from('follows')
    .delete()
    .eq('id', followId)
    .eq('server_id', server.id)
    .eq('status', 'blocked')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
