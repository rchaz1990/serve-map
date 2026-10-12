import { NextResponse } from 'next/server'
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

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

// Environment is read through this alias on purpose: `process.env.NEXT_PUBLIC_*` written out
// literally is replaced at build time, but the guard and the verification clients must agree
// on the SAME runtime values.
const runtimeEnv = process.env as Record<string, string | undefined>

function isLocalUrl(value: string | undefined): boolean {
  try {
    const host = new URL(value ?? '').hostname
    return host === 'localhost' || host === '127.0.0.1'
  } catch {
    return false
  }
}

/**
 * Verification is OFF unless one of these holds:
 *  - Production kill switch: VERCEL_ENV === 'production' AND SLATE_VERIFICATION_ENABLED === '1'
 *    (missing, '0' or anything else → off; default off).
 *  - Local test: SLATE_VERIFICATION_LOCAL_TEST === '1', NOT on Vercel (VERCEL and VERCEL_ENV
 *    unset; Vercel sets them on every Preview/Development build and runtime), AND the Supabase
 *    URL is localhost/127.0.0.1. Any other Supabase URL refuses, whatever NODE_ENV is.
 */
export function verificationAllowed(env: Record<string, string | undefined> = runtimeEnv): boolean {
  if (env.VERCEL_ENV === 'production') return env.SLATE_VERIFICATION_ENABLED === '1'
  if (env.SLATE_VERIFICATION_LOCAL_TEST !== '1' || env.VERCEL || env.VERCEL_ENV) return false
  return isLocalUrl(env.NEXT_PUBLIC_SUPABASE_URL)
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE })
}
export const unavailable = () => json({ error: 'Not available.' }, 503)

export function logCode(code: string, id?: string) {
  // Only a fixed code and (optionally) the random record id. Nothing else, ever.
  console.error(`[verification] ${code}${id ? ` ${id}` : ''}`)
}

// The verification routes use their own service-role client, built from the same runtime
// Supabase URL the guard checked (never a build-time copy).
let client: SupabaseClient | null = null
export function admin(): SupabaseClient {
  if (!client) {
    client = createClient(runtimeEnv['NEXT_PUBLIC_SUPABASE_URL']!, runtimeEnv['SUPABASE_SERVICE_ROLE_KEY']!,
      { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return client
}

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
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const { data, error } = await admin().auth.getUser(token)
  if (error || !data?.user) return null
  return data.user.app_metadata?.slate_verifier === true ? data.user : null
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
 * Deletes one file through the Storage API (never with SQL, which would orphan it) and confirms
 * it is gone: the file can no longer be fetched AND its storage record no longer exists.
 * True only when both are confirmed.
 */
export async function removeAndConfirm(db: SupabaseClient, path: string): Promise<boolean> {
  try {
    const { error: rmErr } = await db.storage.from(VERIFICATION_BUCKET).remove([path])
    if (rmErr) return false
    const { data: stillThere } = await db.storage.from(VERIFICATION_BUCKET).exists(path)
    const { data: rowThere, error: rowErr } = await db.rpc('verification_object_exists', { p_name: path })
    return stillThere === false && !rowErr && rowThere === false
  } catch {
    return false
  }
}

/**
 * Deletes a record's file and confirms it (removeAndConfirm). Only a confirmed deletion clears
 * object_path and sets deleted_at; otherwise the record keeps object_path (deletion pending)
 * and the sweep retries.
 */
export async function deleteAndConfirm(db: SupabaseClient, id: string, path: string): Promise<DeleteResult> {
  if (!(await removeAndConfirm(db, path))) { logCode('delete_unconfirmed', id); return 'pending' }
  const { error: upErr } = await db.from('employment_verifications')
    .update({ object_path: null, deleted_at: new Date().toISOString() })
    .eq('id', id).eq('object_path', path)
  if (upErr) { logCode('delete_record_failed', id); return 'pending' }
  return 'deleted'
}

export const ROLE_CATEGORIES = ['server', 'bartender', 'other_approved'] as const
export const BOROUGHS = ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten_island'] as const
export const EVIDENCE_TYPES = ['schedule', 'employee_portal', 'pay_document_redacted', 'other_approved'] as const
export const REJECTION_REASONS = ['unredacted_sensitive', 'wrong_or_unclear_person', 'role_unclear', 'not_qualifying_role',
  'stale_record', 'unreadable', 'unsupported', 'tied_to_slate', 'other'] as const
