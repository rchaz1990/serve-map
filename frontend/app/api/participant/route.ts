import { NextResponse } from 'next/server'
import { getRequestUser, supabaseAdmin } from '@/lib/server-auth'
import { PARTICIPANT_VERSION } from '@/lib/participant-documents'
import { participantState, recordParticipantEvent, type ParticipantAction } from '@/lib/participant-server'

// Early-test participant agreements (separate from the Terms/Privacy acknowledgment).
//   GET  → the signed-in account's state (guest / worker / remain election)
//   POST { action: 'accept' | 'withdraw', role: 'guest' | 'worker', version? }
//   POST { action: 'remain_yes' | 'remain_no' }   end-of-test election (participants only)
// Everything is recorded by the database (record_participant_event): one log entry plus the
// account record, in one transaction. Nothing is recorded for "Not now".

const noStore = { 'Cache-Control': 'no-store' }

async function state(userId: string) {
  // Fresh account record (not the sign-in token).
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(userId)
  if (error || !data?.user) return null
  const { data: profile } = await supabaseAdmin().from('servers').select('id').eq('wallet_address', userId).maybeSingle()
  return { ...participantState(data.user), hasWorkerProfile: !!profile }
}

export async function GET(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401, headers: noStore })
  const s = await state(user.id)
  if (!s) return NextResponse.json({ error: 'Could not load your early-test status.' }, { status: 503, headers: noStore })
  return NextResponse.json(s, { headers: noStore })
}

export async function POST(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  const body = await request.json().catch(() => null) as { action?: unknown; role?: unknown; version?: unknown } | null
  const action = body?.action
  if (action !== 'accept' && action !== 'withdraw' && action !== 'remain_yes' && action !== 'remain_no') {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }
  const remain = action === 'remain_yes' || action === 'remain_no'
  const role = remain ? 'account' : body?.role
  if (!remain && role !== 'guest' && role !== 'worker') {
    return NextResponse.json({ error: 'Unknown role.' }, { status: 400 })
  }
  // A link or a stale page is never consent: accepting must carry the current version.
  if (action === 'accept' && body?.version !== PARTICIPANT_VERSION) {
    return NextResponse.json({ error: 'Please read and agree to the current early-test information.', code: 'participant_version' }, { status: 400 })
  }
  const r = await recordParticipantEvent(supabaseAdmin(), user.id, role as 'guest' | 'worker' | 'account', action as ParticipantAction,
    action === 'accept' ? PARTICIPANT_VERSION : null)
  if (!r.ok) {
    if (r.code === 'no_worker_profile') return NextResponse.json({ error: 'No worker profile on this account.', code: r.code }, { status: 403 })
    if (r.code === 'not_a_participant') return NextResponse.json({ error: 'Only early-test participants can choose this.', code: r.code }, { status: 400 })
    if (r.code === 'version_mismatch') return NextResponse.json({ error: 'Please read and agree to the current early-test information.', code: 'participant_version' }, { status: 400 })
    return NextResponse.json({ error: 'We could not save that. Please try again.' }, { status: 503 })
  }
  const s = await state(user.id)
  return NextResponse.json({ success: true, ...(s ?? {}) })
}
