'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { RECOVERY_COOKIE } from '@/lib/recovery-marker'

// Choose a new password after following a reset link.
//
// The form is shown only when BOTH hold:
//   1. there is a session, and
//   2. the server set the recovery marker for that same user, which happens only after
//      Supabase verified a recovery link (/auth/confirm type=recovery, any device; or
//      /auth/callback when the code exchange reports PASSWORD_RECOVERY, same browser).
// An ordinary signed-in session without the marker is told to request a reset link.

function readMarker(): string | null {
  const hit = document.cookie.split('; ').find(c => c.startsWith(`${RECOVERY_COOKIE}=`))
  return hit ? decodeURIComponent(hit.slice(RECOVERY_COOKIE.length + 1)) : null
}

function clearMarker() {
  document.cookie = `${RECOVERY_COOKIE}=; Max-Age=0; path=/reset-password; SameSite=Lax`
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState<'checking' | 'ok' | 'no_session' | 'no_recovery'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const marker = readMarker()
      if (cancelled) return
      if (!session) setReady('no_session')
      else if (marker && marker === session.user.id) setReady('ok')
      else setReady('no_recovery')
    })()
    return () => { cancelled = true }
  }, [])

  async function save() {
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    // Re-check at submit time: the marker may have expired or the account changed.
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || readMarker() !== session.user.id) { setReady(session ? 'no_recovery' : 'no_session'); return }
    setSaving(true)
    const { error: updErr } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updErr) { setError(updErr.message); return }
    clearMarker()
    setDone(true)
    setTimeout(() => router.push('/'), 1500)
  }

  const input = 'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/40'
  const muted = { color: '#A0A0A0' }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000' }}>
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Choose a new password</h1>
        {ready === 'checking' && <p className="text-sm" style={muted}>Checking your reset link…</p>}
        {(ready === 'no_session' || ready === 'no_recovery') && (
          <div className="mt-2">
            <p className="text-sm" style={muted}>
              {ready === 'no_session'
                ? 'This reset link has expired or was already used. Request a new one from the sign-in page.'
                : 'To change your password, use “Forgot password?” on the sign-in page and open the link we email you.'}
            </p>
            <a href="/login" className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">Back to sign in</a>
          </div>
        )}
        {ready === 'ok' && !done && (
          <div className="mt-4 flex flex-col gap-4">
            <input type="password" className={input} placeholder="New password (min. 6 characters)" value={password} onChange={e => setPassword(e.target.value)} />
            <input type="password" className={input} placeholder="Repeat new password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button onClick={save} disabled={saving} className="rounded-full bg-white py-3.5 text-sm font-semibold text-black disabled:opacity-40">
              {saving ? 'Saving…' : 'Save new password'}
            </button>
          </div>
        )}
        {done && <p className="mt-4 text-sm" style={{ color: '#4ade80' }}>Password updated. You&apos;re signed in.</p>}
      </main>
    </div>
  )
}
