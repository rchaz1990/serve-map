import { NextResponse } from 'next/server'
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { supabaseAdmin, getRequestUser } from '@/lib/server-auth'

// Employment verification (server only). See docs/EMPLOYMENT_VERIFICATION.md.
//
// LOGGING RULE: never log or return file contents, file names, storage paths or URLs,
// invite/receipt/continuation secrets or their hashes, image metadata, or reviewer
// judgments. Errors are logged as `[verification] <code>` plus at most the record id.

export const VERIFICATION_BUCKET = 'employment-verification'
export const MAX_BYTES = 4 * 1024 * 1024
export const INVITE_TTL_HOURS = 72
export const UNREVIEWED_DELETE_HOURS = 24
export const CONTINUE_TTL_DAYS = 14
export const NO_STORE = { 'Cache-Control': 'no-store, max-age=0', 'Referrer-Policy': 'no-referrer' }

/**
 * Verification runs only in Production, or in a local test where SLATE_VERIFICATION_LOCAL_TEST=1
 * is set and the code is NOT running on Vercel. Vercel sets VERCEL=1 and VERCEL_ENV on every
 * build and runtime (production, preview, development), so the local setting can never take
 * effect in a Preview deployment.
 */
export function verificationAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.VERCEL_ENV === 'production') return true
  return env.SLATE_VERIFICATION_LOCAL_TEST === '1' && !env.VERCEL && !env.VERCEL_ENV
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE })
}
export const unavailable = () => json({ error: 'Not available.' }, 503)

export function logCode(code: string, id?: string) {
  // Only a fixed code and (optionally) the random record id. Nothing else, ever.
  console.error(`[verification] ${code}${id ? ` ${id}` : ''}`)
}

export const admin = (): SupabaseClient => supabaseAdmin()

/** A new random secret (returned once) and the SHA-256 hash that is stored. */
export function newSecret(): { secret: string; hash: string } {
  const secret = randomBytes(32).toString('base64url')
  return { secret, hash: hashSecret(secret) }
}
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}
export function validSecretShape(s: unknown): s is string {
  return typeof s === 'string' && /^[A-Za-z0-9_-]{43}$/.test(s)
}

export const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

/** A random storage object name with nothing personal in it. */
export function newObjectPath(type: 'image/jpeg' | 'image/png'): string {
  return `${randomUUID()}.${type === 'image/png' ? 'png' : 'jpg'}`
}

/** JPEG (FF D8 FF) or PNG (89 50 4E 47 0D 0A 1A 0A) by content, not by name or header. */
export function imageKind(bytes: Uint8Array): 'image/jpeg' | 'image/png' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) return 'image/png'
  return null
}

/** The signed-in user if their account carries the server-set verifier flag, else null. */
export async function requireVerifier(request: Request): Promise<User | null> {
  const user = await getRequestUser(request)
  if (!user) return null
  return user.app_metadata?.slate_verifier === true ? user : null
}

/** The cron caller (same secret and exact `Bearer ` format as /api/cleanup-shifts). */
export function cronAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET_KEY
  if (typeof expected !== 'string' || expected.length < 32) return false
  const m = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')
  if (!m) return false
  const a = Buffer.from(m[1], 'utf8'), b = Buffer.from(expected, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export type DeleteResult = 'deleted' | 'pending'

/**
 * Deletes the file through the Storage API (never with SQL, which would orphan it), then
 * confirms both that the file can no longer be fetched and that its storage record is gone.
 * Only a confirmed deletion clears object_path and sets deleted_at; otherwise the record keeps
 * object_path (deletion pending) and the sweep retries.
 */
export async function deleteAndConfirm(db: SupabaseClient, id: string, path: string): Promise<DeleteResult> {
  try {
    const { error: rmErr } = await db.storage.from(VERIFICATION_BUCKET).remove([path])
    if (rmErr) { logCode('delete_failed', id); return 'pending' }
    const { data: stillThere } = await db.storage.from(VERIFICATION_BUCKET).exists(path)
    const { data: rowThere, error: rowErr } = await db.rpc('verification_object_exists', { p_name: path })
    if (stillThere !== false || rowErr || rowThere !== false) { logCode('delete_unconfirmed', id); return 'pending' }
    const { error: upErr } = await db.from('employment_verifications')
      .update({ object_path: null, deleted_at: new Date().toISOString() })
      .eq('id', id).eq('object_path', path)
    if (upErr) { logCode('delete_record_failed', id); return 'pending' }
    return 'deleted'
  } catch {
    logCode('delete_exception', id)
    return 'pending'
  }
}

export const ROLE_CATEGORIES = ['server', 'bartender', 'other_approved'] as const
export const BOROUGHS = ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten_island'] as const
export const EVIDENCE_TYPES = ['schedule', 'employee_portal', 'pay_document_redacted', 'other_approved'] as const
export const REJECTION_REASONS = ['unredacted_sensitive', 'wrong_or_unclear_person', 'role_unclear', 'not_qualifying_role',
  'stale_record', 'unreadable', 'unsupported', 'tied_to_slate', 'other'] as const
