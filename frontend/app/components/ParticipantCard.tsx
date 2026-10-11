'use client'

import { useState } from 'react'
import { CONSENT_CARDS, type ParticipantRole } from '@/lib/participant-documents'
import { PARTICIPANT_COPY, recordParticipation } from '@/lib/participant'

// Early-test consent card (Vera's wording, verbatim). Separate from the Terms/Privacy
// checkbox; nothing is recorded until the box is ticked and "Agree and continue" is pressed.
// "Not now" records nothing.
export default function ParticipantCard({ role, onAgreed }: { role: ParticipantRole; onAgreed: () => void }) {
  const card = CONSENT_CARDS[role]
  const [ticked, setTicked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [declined, setDeclined] = useState(false)

  async function agree() {
    if (!ticked) return
    setBusy(true); setError('')
    const err = await recordParticipation('accept', role)
    setBusy(false)
    if (err) { setError(err); return }
    onAgreed()
  }

  return (
    <div data-testid={`participant-card-${role}`} className="rounded-xl border border-white/15 p-5 text-left">
      <p className="text-sm font-semibold text-white">{card.title}</p>
      <div className="mt-3 space-y-3 text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
        {card.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <a href={`/early-test#${role}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-white underline underline-offset-2">
        {card.link}
      </a>
      <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-white">
        <input type="checkbox" data-testid="participant-checkbox" className="mt-0.5" checked={ticked} onChange={e => setTicked(e.target.checked)} />
        <span>{card.checkbox}</span>
      </label>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {declined && <p data-testid="participant-declined" className="mt-3 text-xs" style={{ color: '#A0A0A0' }}>{PARTICIPANT_COPY.notNow[role]}</p>}
      <div className="mt-4 flex gap-2">
        <button
          onClick={agree}
          disabled={!ticked || busy}
          className="flex-1 rounded-full bg-white py-2.5 text-xs font-semibold text-black disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Agree and continue'}
        </button>
        <button
          onClick={() => setDeclined(true)}
          disabled={busy}
          className="flex-1 rounded-full border border-white/20 py-2.5 text-xs font-medium text-white disabled:opacity-40"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
