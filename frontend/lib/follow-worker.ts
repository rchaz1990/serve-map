'use client'

import { supabase } from '@/lib/supabase'

export type FollowResult = 'approved' | 'pending' | 'closed' | 'error'

/**
 * Follow a worker with shift-email opt-in. Call only from the "Follow and email me"
 * confirmation (FollowConsent). The database decides the status from the worker's
 * follow-approval setting, stamps the email opt-in, and enforces the agreement and
 * test-account rules; the browser writes nothing else.
 */
export async function followWorker(serverId: string): Promise<FollowResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return 'error'
  const { data, error } = await supabase.from('follows').insert({
    follower_id: session.user.id,
    follower_email: session.user.email,
    server_id: serverId,
    follower_type: 'guest',
    notify_email: true,
  }).select('status').single()
  if (error?.code === '23505') {
    // Already following (one follow per guest per worker): report the existing status.
    const { data: existing } = await supabase.from('follows').select('status')
      .eq('follower_id', session.user.id).eq('server_id', serverId).maybeSingle()
    return existing?.status === 'approved' ? 'approved' : 'pending'
  }
  if (error?.code === '42501') return 'closed'
  if (error) return 'error'
  return data?.status === 'approved' ? 'approved' : 'pending'
}
