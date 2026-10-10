'use client'

import { authJsonHeaders } from '@/lib/auth-fetch'
import { PARTICIPANT_VERSION, type ParticipantRole } from '@/lib/participant-documents'

// UI messages NOT supplied by Vera — drafted by Atlas, pending Vera's review
// (docs/EARLY_TEST_ACCEPTANCE_CRITERIA.md, "UI copy not supplied by Vera").
export const PARTICIPANT_COPY = {
  notNow: {
    guest: 'You haven\'t joined the early test. You can keep browsing, but rating stays off until you agree.',
    worker: 'You haven\'t joined the early test. Your profile stays hidden, and new ratings and shifts are off until you agree.',
  },
  withdrawn: {
    guest: 'You\'ve stopped taking part in the early test. You can\'t submit new ratings. Ratings you already submitted stay public unless you ask us to delete them at team@slatenow.xyz.',
    worker: 'You\'ve stopped taking part in the early test. New ratings and shifts are blocked and your public profile is hidden. Your account and history are kept. You can take part again by accepting the current worker agreement.',
  },
  remainLabel: 'Keep my Slate account after the early test',
  remainHelp: 'Thirty days after the test ends, Slate plans to delete early-test accounts and their content unless you choose to stay. You can change this until then.',
  unavailable: 'This profile isn\'t available right now.',
} as const

export type ParticipationStatus = {
  version: string
  guest: { agreed: boolean; agreedAt: string | null; withdrawnAt: string | null }
  worker: { agreed: boolean; agreedAt: string | null; withdrawnAt: string | null }
  remain: boolean | null
  remainAt: string | null
  everParticipated: boolean
  hasWorkerProfile: boolean
}

export async function fetchParticipation(accessToken?: string): Promise<ParticipationStatus | null> {
  try {
    const res = await fetch('/api/participant', { headers: await authJsonHeaders(accessToken), cache: 'no-store' })
    return res.ok ? await res.json() as ParticipationStatus : null
  } catch { return null }
}

/** Records accept / withdraw / remain. Returns an error message, or null on success. */
export async function recordParticipation(
  action: 'accept' | 'withdraw' | 'remain_yes' | 'remain_no', role?: ParticipantRole,
): Promise<string | null> {
  try {
    const res = await fetch('/api/participant', {
      method: 'POST',
      headers: await authJsonHeaders(),
      body: JSON.stringify({ action, role, version: action === 'accept' ? PARTICIPANT_VERSION : undefined }),
    })
    if (res.ok) return null
    const json = await res.json().catch(() => null) as { error?: string } | null
    return json?.error ?? 'We could not save that. Please try again.'
  } catch {
    return 'We could not save that. Please try again.'
  }
}
