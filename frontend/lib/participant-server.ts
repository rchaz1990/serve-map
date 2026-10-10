import type { SupabaseClient, User } from '@supabase/supabase-js'
import { PARTICIPANT_VERSION, type ParticipantRole } from '@/lib/participant-documents'

// Early-test participant agreements (migration 44). The database is the source of truth:
// these helpers call its true/false functions, which read the account record directly —
// never the sign-in token — so a withdrawal takes effect immediately.
// Any database error is reported as 'error' so callers fail closed.

export type ParticipantAction = 'accept' | 'withdraw' | 'remain_yes' | 'remain_no'

export async function participantOk(admin: SupabaseClient, userId: string, role: ParticipantRole): Promise<boolean | 'error'> {
  const { data, error } = await admin.rpc('participant_ok', { p_user: userId, p_role: role })
  if (error) { console.error('[participant] participant_ok:', error.message); return 'error' }
  return data === true
}

export async function workerParticipating(admin: SupabaseClient, serverId: string): Promise<boolean | 'error'> {
  const { data, error } = await admin.rpc('worker_participant_ok', { p_server_id: serverId })
  if (error) { console.error('[participant] worker_participant_ok:', error.message); return 'error' }
  return data === true
}

/** The only writer: logs the event and updates the account record in one transaction. */
export async function recordParticipantEvent(
  admin: SupabaseClient, userId: string, role: ParticipantRole | 'account', action: ParticipantAction, version: string | null,
): Promise<{ ok: true; meta: Record<string, unknown> } | { ok: false; code: string }> {
  const { data, error } = await admin.rpc('record_participant_event', { p_user: userId, p_role: role, p_action: action, p_version: version })
  if (error) {
    const code = /participant: (\w[\w ]*)/.exec(error.message)?.[1]?.replace(/ /g, '_') ?? 'error'
    if (code === 'error') console.error('[participant] record:', error.message)
    return { ok: false, code }
  }
  return { ok: true, meta: (data ?? {}) as Record<string, unknown> }
}

/** Current state for one account, from its (fresh) account record. */
export function participantState(user: User) {
  const m = (user.app_metadata ?? {}) as Record<string, unknown>
  const role = (r: ParticipantRole) => ({
    agreed: m[`participant_${r}_version`] === PARTICIPANT_VERSION,
    agreedAt: (m[`participant_${r}_at`] as string | undefined) ?? null,
    withdrawnAt: (m[`participant_${r}_withdrawn_at`] as string | undefined) ?? null,
  })
  return {
    version: PARTICIPANT_VERSION,
    guest: role('guest'),
    worker: role('worker'),
    remain: typeof m.participant_remain === 'boolean' ? m.participant_remain : null,
    remainAt: (m.participant_remain_at as string | undefined) ?? null,
    everParticipated: !!(m.participant_guest_at || m.participant_worker_at),
  }
}
