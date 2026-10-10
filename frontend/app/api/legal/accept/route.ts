import { NextResponse } from 'next/server'
import { getRequestUser, supabaseAdmin } from '@/lib/server-auth'
import { recordLegalAcceptance } from '@/lib/legal-server'

// Records a signed-in guest's explicit acknowledgment of the Terms and Privacy Policy
// (ticked box on guest sign-up, or before a first follow). Version + time are stored in
// server-only account metadata. Worker acknowledgment is recorded by /api/signup-server.
export async function POST(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const body = await request.json().catch(() => null) as { version?: unknown } | null
  const result = await recordLegalAcceptance(supabaseAdmin(), user, body?.version, 'guest')
  if (result === 'missing') {
    return NextResponse.json({ error: 'Please confirm you agree to the Terms of Service and Privacy Policy.', code: 'legal_required' }, { status: 400 })
  }
  if (result === 'error') {
    return NextResponse.json({ error: 'We could not save your agreement. Please try again.' }, { status: 503 })
  }
  return NextResponse.json({ success: true, recorded: result === 'recorded' })
}
