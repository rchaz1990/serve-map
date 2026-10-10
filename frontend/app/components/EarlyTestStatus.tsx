'use client'

import { useEffect, useState } from 'react'
import ParticipantCard from '@/app/components/ParticipantCard'
import { PARTICIPANT_COPY, fetchParticipation, recordParticipation, type ParticipationStatus } from '@/lib/participant'
import type { ParticipantRole } from '@/lib/participant-documents'

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''

// /account: early-test participation (guest, and worker if the account has a profile),
// "Stop taking part" (withdrawal, effective immediately) and the end-of-test election.
export default function EarlyTestStatus() {
  const [s, setS] = useState<ParticipationStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState<ParticipantRole | null>(null)

  const reload = async () => setS(await fetchParticipation())
  useEffect(() => { fetchParticipation().then(setS) }, [])
  if (!s) return null

  async function act(action: 'withdraw' | 'remain_yes' | 'remain_no', role?: ParticipantRole) {
    setBusy(true); setError('')
    const err = await recordParticipation(action, role)
    setBusy(false)
    if (err) { setError(err); return }
    await reload()
  }

  const roles: ParticipantRole[] = s.hasWorkerProfile ? ['guest', 'worker'] : ['guest']
  return (
    <div data-testid="early-test-status" className="space-y-6">
      {roles.map(role => {
        const r = s[role]
        return (
          <div key={role} data-testid={`early-test-${role}`}>
            {r.agreed ? (
              <>
                <p className="text-sm text-white">
                  You&apos;re taking part in Slate&apos;s early test as a {role} (agreed {fmt(r.agreedAt)}).{' '}
                  <a href={`/early-test#${role}`} className="underline underline-offset-2">Read the information sheet</a>
                </p>
                <button
                  data-testid={`withdraw-${role}`}
                  disabled={busy}
                  onClick={() => { if (window.confirm('Stop taking part in the early test?')) act('withdraw', role) }}
                  className="mt-3 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                >
                  Stop taking part
                </button>
              </>
            ) : (
              <>
                {r.withdrawnAt
                  ? <p data-testid={`withdrawn-${role}`} className="text-sm" style={{ color: '#A0A0A0' }}>{PARTICIPANT_COPY.withdrawn[role]}</p>
                  : <p className="text-sm" style={{ color: '#A0A0A0' }}>{PARTICIPANT_COPY.notNow[role]}</p>}
                {joining === role
                  ? <div className="mt-3"><ParticipantCard role={role} onAgreed={() => { setJoining(null); reload() }} /></div>
                  : <button onClick={() => setJoining(role)} className="mt-3 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white">
                      Take part in the early test
                    </button>}
              </>
            )}
          </div>
        )
      })}
      {s.everParticipated && (
        <label className="flex items-start gap-2 text-sm text-white" data-testid="remain-election">
          <input
            type="checkbox"
            className="mt-1"
            data-testid="remain-checkbox"
            checked={s.remain === true}
            disabled={busy}
            onChange={e => act(e.target.checked ? 'remain_yes' : 'remain_no')}
          />
          <span>
            {PARTICIPANT_COPY.remainLabel}
            <span className="mt-1 block text-xs" style={{ color: '#A0A0A0' }}>{PARTICIPANT_COPY.remainHelp}</span>
          </span>
        </label>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
