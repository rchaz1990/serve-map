'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Named verifiers only (server-set account flag, checked by every route).
// Rules: check only the allowed facts; no screenshots, downloads or notes; decide promptly —
// the image is deleted as soon as a decision is saved (and automatically within 24 hours).

type Row = { id: string; status: string; created_at: string; upload_issued_at: string | null; submitted_at: string | null
  decided_at: string | null; deleted_at: string | null; deletion_pending: boolean }

const ROLES = [['server', 'Server'], ['bartender', 'Bartender'], ['other_approved', 'Other approved floor role']]
const BOROUGHS = [['manhattan', 'Manhattan'], ['brooklyn', 'Brooklyn'], ['queens', 'Queens'], ['bronx', 'Bronx'], ['staten_island', 'Staten Island']]
const EVIDENCE = [['schedule', 'Work schedule'], ['employee_portal', 'Employee portal'], ['pay_document_redacted', 'Redacted pay document'], ['other_approved', 'Other approved record']]
const REASONS = [['unredacted_sensitive', 'Unredacted sensitive information'], ['wrong_or_unclear_person', 'Wrong or unclear person'],
  ['role_unclear', 'Role unclear'], ['not_qualifying_role', 'Not a qualifying role'], ['stale_record', 'Older than 60 days'],
  ['unreadable', 'Unreadable'], ['unsupported', 'Unsupported file'], ['tied_to_slate', 'Already tied to Slate'], ['other', 'Other']]

function api(tok: string, path: string, body: unknown = {}) {
  return fetch(path, { method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
}
async function fetchRows(tok: string): Promise<{ status: 'forbidden' | 'error' | 'ok'; rows?: Row[] }> {
  const res = await api(tok, '/api/internal/verification/list').catch(() => null)
  if (!res) return { status: 'error' }
  if (res.status === 403) return { status: 'forbidden' }
  if (!res.ok) return { status: 'error' }
  return { status: 'ok', rows: ((await res.json()) as { rows: Row[] }).rows }
}

export default function InternalVerificationPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'loading' | 'forbidden' | 'ok' | 'error'>('loading')
  const [rows, setRows] = useState<Row[]>([])
  const [link, setLink] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [img, setImg] = useState<string | null>(null)
  const [form, setForm] = useState({ decision: '', role_category: '', venue: '', borough: '', evidence_type: '', rejection_reason: '' })
  const [msg, setMsg] = useState('')

  const call = (path: string, body: unknown = {}) => api(token, path, body)

  async function load(tok = token) {
    const r = await fetchRows(tok)
    setStatus(r.status); if (r.rows) setRows(r.rows)
  }

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login?redirect=/internal/verification'); return }
      const r = await fetchRows(session.access_token)
      if (cancelled) return
      setToken(session.access_token); setStatus(r.status); if (r.rows) setRows(r.rows)
    })
    return () => { cancelled = true }
  }, [router])
  useEffect(() => () => { if (img) URL.revokeObjectURL(img) }, [img])

  function close() { if (img) URL.revokeObjectURL(img); setImg(null); setOpen(null); setForm({ decision: '', role_category: '', venue: '', borough: '', evidence_type: '', rejection_reason: '' }) }

  async function invite() {
    setMsg(''); const res = await call('/api/internal/verification/invite')
    if (!res.ok) return setMsg('Could not create an invite.')
    const j = await res.json() as { secret: string; expiresAt: string }
    setLink(`${window.location.origin}/verify#${j.secret}`); load()
  }

  async function view(id: string) {
    close(); setMsg('')
    const res = await call('/api/internal/verification/file', { id })
    if (!res.ok) return setMsg('Image not available.')
    setImg(URL.createObjectURL(await res.blob())); setOpen(id)
  }

  async function decide() {
    if (!open) return
    const res = await call('/api/internal/verification/decision', { id: open, ...form })
    const j = await res.json().catch(() => ({})) as { status?: string; deletion?: string; continueSecret?: string | null; error?: string }
    if (!res.ok) return setMsg(`Not saved (${j.error ?? res.status}).`)
    close()
    setMsg(`Saved: ${j.status}. Image ${j.deletion === 'deleted' ? 'deleted and confirmed' : 'deletion PENDING — will retry'}.`)
    setLink(j.continueSecret ? `${window.location.origin}/verify#${j.continueSecret}` : '')
    load()
  }

  if (status === 'forbidden') return <p className="p-8">not available for this account</p>
  if (status === 'error') return <p className="p-8">Could not load.</p>
  if (status === 'loading') return <p className="p-8">Loading…</p>

  const sel = 'mt-1 block w-full rounded border border-white/20 bg-black px-2 py-1 text-white'
  return (
    <main className="mx-auto max-w-3xl p-8 text-sm text-white" data-testid="verifier-page">
      <h1 className="text-lg font-semibold">Employment verification</h1>
      <p className="mt-1 text-xs" style={{ color: '#A0A0A0' }}>
        Check only: NYC venue (current or within 60 days), qualifying role, guest-facing duties, not already tied to Slate.
        No screenshots, downloads or notes. The image is deleted when you save a decision.
      </p>
      <button className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black" onClick={invite}>Create invite link</button>
      {link && <p className="mt-2 break-all text-xs" data-testid="one-time-link">Send this once, then clear it: {link}</p>}
      {msg && <p className="mt-2 text-xs" data-testid="verifier-msg">{msg}</p>}

      <table className="mt-6 w-full text-left text-xs">
        <thead><tr><th>ID</th><th>Status</th><th>Created</th><th>Submitted</th><th /></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-white/10">
              <td className="py-1 font-mono">{r.id.slice(0, 8)}</td>
              <td>{r.status}{r.deletion_pending ? ' — deletion pending' : ''}</td>
              <td>{new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' ')}Z</td>
              <td>{r.submitted_at ? new Date(r.submitted_at).toISOString().slice(0, 16).replace('T', ' ') + 'Z' : ''}</td>
              <td>{r.status === 'submitted' && <button className="underline" onClick={() => view(r.id)}>Review</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {open && img && (
        <section className="mt-6 rounded-xl border border-white/15 p-4" data-testid="review-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="Submitted employment record" className="max-h-[70vh] w-full object-contain" onContextMenu={e => e.preventDefault()} draggable={false} />
          <label className="mt-4 block">Decision
            <select className={sel} value={form.decision} onChange={e => setForm({ ...form, decision: e.target.value })}>
              <option value="">Choose…</option><option value="verified">Verified</option>
              <option value="not_verified">Not verified</option><option value="withdrawn">Withdrawn (candidate asked)</option>
            </select>
          </label>
          {form.decision === 'verified' && <>
            <label className="mt-2 block">Role<select className={sel} value={form.role_category} onChange={e => setForm({ ...form, role_category: e.target.value })}><option value="" />{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="mt-2 block">Venue<input className={sel} maxLength={120} value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></label>
            <label className="mt-2 block">Borough<select className={sel} value={form.borough} onChange={e => setForm({ ...form, borough: e.target.value })}><option value="" />{BOROUGHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="mt-2 block">Evidence type<select className={sel} value={form.evidence_type} onChange={e => setForm({ ...form, evidence_type: e.target.value })}><option value="" />{EVIDENCE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          </>}
          {form.decision === 'not_verified' && (
            <label className="mt-2 block">Reason<select className={sel} value={form.rejection_reason} onChange={e => setForm({ ...form, rejection_reason: e.target.value })}><option value="" />{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          )}
          <button className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40" disabled={!form.decision} onClick={decide}>Save decision and delete image</button>
          <button className="mt-4 ml-3 rounded-full border border-white/20 px-4 py-2 text-xs" onClick={close}>Close</button>
        </section>
      )}
    </main>
  )
}
