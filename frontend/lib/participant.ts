'use client'

import { authJsonHeaders } from '@/lib/auth-fetch'
import { PARTICIPANT_VERSION, type ParticipantRole } from '@/lib/participant-documents'

// UI messages. Wording reviewed by Vera (2026-10-11 copy/privacy pass); do not change it
// without her review. See docs/EARLY_TEST_ACCEPTANCE_CRITERIA.md.
export const PARTICIPANT_COPY = {
  notNow: {
    guest: 'You haven\u2019t joined the early test. You can keep browsing, but rating and other early-test actions stay off until you agree.',
    worker: 'You haven\u2019t joined the early test. Your public profile remains hidden, and new ratings and shifts stay off until you accept the current worker agreement. Your account and existing history are preserved.',
  },
  withdrawn: {
    guest: 'You\u2019ve stopped taking part in the early test. You can\u2019t submit new ratings or take other early-test actions. Ratings you already submitted remain public unless you separately ask us to delete them at team@slatenow.xyz.',
    // Vera: "existing history", because public visibility and the preserved record differ.
    worker: 'You\u2019ve stopped taking part in the early test. New ratings and shifts are blocked and your public profile is hidden. Your account and existing history are kept. You can take part again by accepting the current worker agreement.',
  },
  remainLabel: 'Keep my Slate account after the early test',
  remainHelp: 'Thirty days after the test ends, Slate will review early-test accounts and associated content. Slate plans to delete them unless you choose to remain. Some records may be retained when necessary for legal, security, audit or provider-backup purposes. You can change your choice until the review date.',
  // Public visitors (profile, QR and rating pages). Deliberately says nothing about why.
  unavailable: 'This profile is not publicly available right now.',
  // Only the worker's own dashboard explains the reason.
  hiddenOwn: 'This profile is temporarily hidden because the worker has not accepted Slate\u2019s current participation agreement.',
} as const

// The end-of-test review date. Set it (YYYY-MM-DD) once the founder declares the test's end;
// until then no date is shown. Never invent one.
export const EARLY_TEST_REVIEW_DATE: string | null = null

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
