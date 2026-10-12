'use client'

import { useEffect, useRef, useState } from 'react'
import { AGE_ATTESTATION, VERIFICATION_CONSENT_VERSION, VERIFICATION_COPY as C } from '@/lib/verification-copy'

// Employment check for a PROVISIONAL early-test candidate (see docs/EMPLOYMENT_VERIFICATION.md).
// The link's secret is in the URL fragment (#…), which browsers never send to servers or logs.
// The image is re-encoded in the browser before upload (drops EXIF such as GPS location) and
// the preview shows exactly what will be sent. Nothing about the file is logged or stored
// beyond the upload itself.

type State = 'loading' | 'invalid' | 'expired' | 'consent' | 'upload' | 'sending' | 'submitted' | 'withdrawn'
  | 'rejected_file' | 'age' | 'done' | 'unavailable'

const MAX_INPUT = 15 * 1024 * 1024
const MAX_OUT = 4 * 1024 * 1024
const MAX_SIDE = 3000

async function post(path: string, body: unknown) {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json: json as Record<string, unknown> }
}

/** Decode and redraw the image: the result carries pixels only (no EXIF, GPS or text chunks). */
async function reencode(file: File): Promise<Blob> {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') throw new Error('unsupported')
  if (file.size > MAX_INPUT) throw new Error('too_large')
  let bmp: ImageBitmap
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { throw new Error('unreadable') }
  let scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const draw = async (type: string, quality?: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bmp.width * scale)); canvas.height = Math.max(1, Math.round(bmp.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('unreadable')
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('unreadable')), type, quality))
  }
  let out = await draw(file.type, file.type === 'image/jpeg' ? 0.9 : undefined)
  // Too big: fall back to JPEG and shrink until it fits.
  for (let i = 0; out.size > MAX_OUT && i < 5; i++) { scale *= 0.8; out = await draw('image/jpeg', 0.85) }
  bmp.close()
  if (out.size > MAX_OUT) throw new Error('too_large')
  return out
}

export default function VerifyPage() {
  const [state, setState] = useState<State>('loading')
  const [error, setError] = useState('')
  const [consent, setConsent] = useState(false)
  const [redacted, setRedacted] = useState(false)
  const [ageOk, setAgeOk] = useState(false)
  const [image, setImage] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const secret = useRef('')

  useEffect(() => {
    secret.current = window.location.hash.slice(1)
    post('/api/verification/start', { secret: secret.current }).then(r => {
      if (r.status === 503) return setState('unavailable')
      setState((r.json.state as State) ?? 'invalid')
    }).catch(() => setState('invalid'))
  }, [])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function setSecret(next: string) {
    secret.current = next
    window.history.replaceState(null, '', `/verify#${next}`)
  }

  async function choose(file: File | undefined) {
    setError(''); setRedacted(false); setImage(null)
    if (preview) { URL.revokeObjectURL(preview); setPreview(null) }
    if (!file) return
    try {
      const out = await reencode(file)
      setImage(out); setPreview(URL.createObjectURL(out))
    } catch (e) {
      const code = (e as Error).message
      setError(code === 'too_large' ? 'That file is too large. Please send a screenshot under 4 MB.'
        : code === 'unsupported' ? 'Please choose a PNG or JPEG image (a screenshot works best).'
        : 'That image could not be read. Please try another screenshot.')
    }
  }

  async function send() {
    if (!image || !consent || !redacted) return
    setError(''); setState('sending')
    const issued = await post('/api/verification/upload-url', {
      secret: secret.current, consent: true, consentVersion: VERIFICATION_CONSENT_VERSION, redactionAck: true,
      contentType: image.type, size: image.size,
    })
    if (issued.status !== 200 || typeof issued.json.uploadUrl !== 'string') {
      setState('upload'); setError('We could not start the upload. Please try again, or contact the Slate team for a new link.'); return
    }
    if (typeof issued.json.receipt === 'string') setSecret(issued.json.receipt)
    const put = await fetch(issued.json.uploadUrl, {
      method: 'PUT', body: image,
      headers: { 'content-type': image.type, 'x-upsert': 'false', 'cache-control': 'max-age=0',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    }).catch(() => null)
    if (!put || !put.ok) { setState('upload'); setError('The upload did not finish. Please try again.'); return }
    const done = await post('/api/verification/submitted', { secret: secret.current })
    if (done.json.state === 'submitted') { setState('submitted'); setImage(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); return }
    if (done.json.state === 'rejected_file') { setState('rejected_file'); return }
    setState('upload'); setError('We could not confirm the upload. Please try again.')
  }

  async function withdraw() {
    if (!window.confirm('Withdraw from the employment check? Any image you sent will be deleted.')) return
    const r = await post('/api/verification/withdraw', { secret: secret.current })
    if (r.json.state === 'withdrawn') setState('withdrawn')
    else setError('We could not withdraw. Please contact the Slate team.')
  }

  async function attest() {
    if (!ageOk) return
    const r = await post('/api/verification/age', { secret: secret.current, attest: true })
    if (r.json.state === 'done') setState('done')
    else setError('We could not save that. Please contact the Slate team for a new link.')
  }

  const card = 'mx-auto max-w-xl px-6 py-12 text-sm leading-relaxed text-white'
  const muted = { color: '#A0A0A0' }
  const btn = 'mt-6 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black disabled:opacity-40'
  const ghost = 'mt-6 ml-3 rounded-full border border-white/20 px-5 py-2.5 text-xs font-medium text-white'

  if (state === 'loading') return <main className={card}><p style={muted}>Loading…</p></main>
  if (state === 'unavailable') return <main className={card}><p>This page is not available.</p></main>
  if (state === 'invalid') return <main className={card}><p data-testid="verify-invalid">{C.invalid}</p></main>
  if (state === 'expired') return <main className={card}><p data-testid="verify-expired">{C.expired}</p></main>
  if (state === 'withdrawn') return <main className={card}><p data-testid="verify-withdrawn">{C.withdrawn}</p></main>
  if (state === 'rejected_file') return <main className={card}><p data-testid="verify-rejected">{C.rejectedFile}</p></main>
  if (state === 'done') {
    return (
      <main className={card}>
        <p data-testid="verify-done">{C.done}</p>
        <a href="/early-test" className="mt-4 inline-block underline underline-offset-2">Read the early-test information</a>
      </main>
    )
  }
  if (state === 'submitted') {
    return (
      <main className={card}>
        <p data-testid="verify-submitted">{C.submitted}</p>
        <button className={ghost.replace('ml-3 ', '')} onClick={withdraw}>Withdraw</button>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </main>
    )
  }
  if (state === 'age') {
    return (
      <main className={card} data-testid="verify-age">
        <h1 className="text-lg font-semibold">Confirm your age</h1>
        <p className="mt-2" style={muted}>{C.verifiedIntro}</p>
        <label className="mt-5 flex items-start gap-3">
          <input type="checkbox" data-testid="age-checkbox" className="mt-1 h-4 w-4 accent-white" checked={ageOk} onChange={e => setAgeOk(e.target.checked)} />
          <span>{AGE_ATTESTATION}</span>
        </label>
        <button className={btn} disabled={!ageOk} onClick={attest}>Continue</button>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </main>
    )
  }

  // consent / upload / sending
  return (
    <main className={card} data-testid="verify-form">
      <h1 className="text-lg font-semibold">{C.title}</h1>
      <p className="mt-2" style={muted}>{C.intro}</p>
      <p className="mt-5 font-semibold">What we check — nothing else</p>
      <ul className="mt-1 list-disc pl-5" style={muted}>{C.checks.map(c => <li key={c}>{c}</li>)}</ul>
      <p className="mt-5 font-semibold">What you can send (one image)</p>
      <ul className="mt-1 list-disc pl-5" style={muted}>{C.accepted.map(c => <li key={c}>{c}</li>)}</ul>
      <p className="mt-5 font-semibold">Before you send it, cover or crop out:</p>
      <ul className="mt-1 list-disc pl-5" data-testid="redaction-list" style={muted}>{C.redact.map(c => <li key={c}>{c}</li>)}</ul>
      <p className="mt-5" style={muted}>{C.retention}</p>
      <p className="mt-2" style={muted}>{C.howTo}</p>

      <label className="mt-6 flex items-start gap-3">
        <input type="checkbox" data-testid="consent-checkbox" className="mt-1 h-4 w-4 accent-white" checked={consent}
          onChange={e => { setConsent(e.target.checked); if (state === 'consent' && e.target.checked) setState('upload') }} />
        <span>{C.consentLabel}</span>
      </label>

      {consent && state !== 'consent' && (
        <div className="mt-6">
          <input type="file" data-testid="file-input" accept="image/png,image/jpeg" disabled={state === 'sending'}
            onChange={e => choose(e.target.files?.[0])} />
          {preview && (
            <div className="mt-4">
              <p className="text-xs" style={muted}>This is exactly what will be sent:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview of the image you are about to send" data-testid="preview" className="mt-2 max-h-[60vh] w-full rounded-lg border border-white/10 object-contain" />
              <label className="mt-4 flex items-start gap-3">
                <input type="checkbox" data-testid="redacted-checkbox" className="mt-1 h-4 w-4 accent-white" checked={redacted} onChange={e => setRedacted(e.target.checked)} />
                <span>{C.redactedLabel}</span>
              </label>
            </div>
          )}
          <button className={btn} data-testid="send" disabled={!image || !redacted || state === 'sending'} onClick={send}>
            {state === 'sending' ? 'Sending…' : 'Send for review'}
          </button>
          <button className={ghost} onClick={withdraw}>Withdraw</button>
        </div>
      )}
      {error && <p className="mt-3 text-xs text-red-400" role="alert">{error}</p>}
    </main>
  )
}
