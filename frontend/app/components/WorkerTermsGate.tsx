'use client'

import { useState } from 'react'
import LegalConsent from '@/app/components/LegalConsent'
import WorkerDisclosure from '@/app/components/WorkerDisclosure'
import { recordWorkerLegal } from '@/lib/legal-client'

// Existing workers (profiles created before the agreement step) must agree to the current
// Terms/Privacy before using their dashboard, starting shifts or emailing followers.
// Nothing about the account or profile changes until they tick and confirm.
export default function WorkerTermsGate({ onAccepted, onSignOut }: { onAccepted: () => void; onSignOut: () => void }) {
  const [ticked, setTicked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    if (!ticked) { setError('Please confirm you agree to the Terms of Service and Privacy Policy.'); return }
    setBusy(true); setError('')
    const err = await recordWorkerLegal()
    setBusy(false)
    if (err) { setError(err); return }
    onAccepted()
  }

  return (
    <div className="slate-card mb-10 p-7" data-testid="worker-terms-gate">
      <p className="text-sm font-semibold text-white">Before you continue: Slate&apos;s Terms and Privacy Policy</p>
      <p className="mb-4 mt-1 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
        We&apos;ve updated how Slate works and what we store. Please read and agree before you use your profile,
        start shifts or send updates to your followers. Your profile, ratings and followers stay as they are.
      </p>
      <WorkerDisclosure />
      <LegalConsent checked={ticked} onChange={setTicked}>
        I&apos;m 18 or older, and I&apos;ve read and agree to Slate&apos;s
      </LegalConsent>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      <div className="mt-5 flex gap-3">
        <button
          onClick={confirm}
          disabled={!ticked || busy}
          className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Agree and continue'}
        </button>
        <button onClick={onSignOut} className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-medium text-white">
          Not now — sign out
        </button>
      </div>
    </div>
  )
}
