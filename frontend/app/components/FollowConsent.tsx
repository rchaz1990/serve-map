'use client'

import { useEffect, useState } from 'react'
import LegalConsent from '@/app/components/LegalConsent'
import { legalOnFile, recordGuestLegal } from '@/lib/legal-client'

// Shown after someone taps "Follow", before anything is saved. It states what following
// does, and — if this account hasn't acknowledged the Terms/Privacy yet — asks for an
// explicit tick, which is recorded on the server before the follow is created.
export default function FollowConsent({
  firstName,
  onConfirm,
  onCancel,
}: {
  firstName: string
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}) {
  const [needsLegal, setNeedsLegal] = useState<boolean | null>(null)
  const [ticked, setTicked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    legalOnFile().then(onFile => { if (!cancelled) setNeedsLegal(!onFile) }).catch(() => { if (!cancelled) setNeedsLegal(true) })
    return () => { cancelled = true }
  }, [])

  async function confirm() {
    setError('')
    if (needsLegal && !ticked) { setError('Please confirm you agree to the Terms of Service and Privacy Policy.'); return }
    setBusy(true)
    try {
      if (needsLegal) {
        const err = await recordGuestLegal()
        if (err) { setError(err); return }
      }
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div data-testid="follow-consent" className="rounded-xl border border-white/15 p-4 text-left">
      <p className="text-sm font-semibold text-white">Follow {firstName}?</p>
      <ul className="mt-2 list-disc pl-5 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
        <li>Slate will email you when {firstName} starts a shift, including where they&apos;re working.</li>
        <li>{firstName} will see your first name and last initial in their followers list — not your email address.</li>
        <li>You can unfollow at any time, which stops the emails.</li>
      </ul>
      {needsLegal && (
        <div className="mt-3">
          <LegalConsent id="follow-legal" checked={ticked} onChange={setTicked}>
            I&apos;m 18 or older, and I agree to Slate&apos;s
          </LegalConsent>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={onCancel} disabled={busy} className="flex-1 rounded-full border border-white/20 py-2.5 text-xs font-medium text-white disabled:opacity-40">
          Cancel
        </button>
        <button
          onClick={confirm}
          disabled={busy || needsLegal === null || (needsLegal && !ticked)}
          className="flex-1 rounded-full bg-white py-2.5 text-xs font-semibold text-black disabled:opacity-40"
        >
          {busy ? 'Following…' : 'Follow and email me'}
        </button>
      </div>
    </div>
  )
}
