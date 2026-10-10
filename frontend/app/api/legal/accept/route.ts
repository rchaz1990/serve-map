import { NextResponse } from 'next/server'
import { getRequestUser, supabaseAdmin } from '@/lib/server-auth'
import { recordLegalAcceptance } from '@/lib/legal-server'

// Records a signed-in person's explicit acknowledgment of the Terms and Privacy Policy.
// Version + time are stored in server-only account metadata.
//   - guest (default): ticked box on guest sign-up, or before a first rating/follow.
//   - worker: an existing worker agreeing from the dashboard. Only accepted from an account
//     that owns a worker profile. New workers are recorded by /api/signup-server.
export async function POST(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const body = await request.json().catch(() => null) as { version?: unknown; context?: unknown } | null
  const context = body?.context === 'worker' ? 'worker' : 'guest'
  const admin = supabaseAdmin()
  if (context === 'worker') {
    const { data: profile } = await admin.from('servers').select('id').eq('wallet_address', user.id).maybeSingle()
    if (!profile) return NextResponse.json({ error: 'No worker profile on this account.' }, { status: 403 })
  }
  const result = await recordLegalAcceptance(admin, user, body?.version, context)
  if (result === 'missing') {
    return NextResponse.json({ error: 'Please confirm you agree to the Terms of Service and Privacy Policy.', code: 'legal_required' }, { status: 400 })
  }
  if (result === 'error') {
    return NextResponse.json({ error: 'We could not save your agreement. Please try again.' }, { status: 503 })
  }
  return NextResponse.json({ success: true, recorded: result === 'recorded' })
}
