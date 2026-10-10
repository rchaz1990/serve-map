'use client'

// A guest's unfinished rating, kept on this device while they sign in or sign up.
// - Stored in localStorage (survives the Google round-trip and an email-confirmation link
//   opened in the same browser), one entry per worker, for at most DRAFT_TTL_MS.
// - Never put in a URL, never logged, never sent anywhere until the guest taps Submit.
// - Restoring a draft only fills the form: it never submits and never ticks consent.

const PREFIX = 'slate_rating_draft:'
export const DRAFT_TTL_MS = 60 * 60 * 1000 // 1 hour

export type RatingDraft = { rating: number; tags: string[]; comment: string; savedAt: number }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function key(serverId: string) { return PREFIX + serverId.toLowerCase() }

export function saveRatingDraft(serverId: string, d: { rating: number; tags: string[]; comment: string }): void {
  if (!UUID_RE.test(serverId)) return
  try {
    const draft: RatingDraft = {
      rating: Math.max(0, Math.min(5, Math.round(d.rating))),
      tags: d.tags.filter(t => typeof t === 'string').slice(0, 12),
      comment: d.comment.slice(0, 280),
      savedAt: Date.now(),
    }
    localStorage.setItem(key(serverId), JSON.stringify(draft))
  } catch { /* storage unavailable: nothing saved */ }
}

/** The draft for this worker, if present and not expired. Expired or malformed drafts are removed. */
export function loadRatingDraft(serverId: string): RatingDraft | null {
  pruneExpiredDrafts()
  try {
    const raw = localStorage.getItem(key(serverId))
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<RatingDraft>
    const ok = typeof d.rating === 'number' && d.rating >= 0 && d.rating <= 5
      && Array.isArray(d.tags) && typeof d.comment === 'string'
      && typeof d.savedAt === 'number' && Date.now() - d.savedAt < DRAFT_TTL_MS
    if (!ok) { localStorage.removeItem(key(serverId)); return null }
    return { rating: d.rating!, tags: d.tags!.filter(t => typeof t === 'string').slice(0, 12), comment: d.comment!.slice(0, 280), savedAt: d.savedAt! }
  } catch {
    return null
  }
}

export function clearRatingDraft(serverId: string): void {
  try { localStorage.removeItem(key(serverId)) } catch { /* ignore */ }
}

function pruneExpiredDrafts(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(PREFIX)) continue
      try {
        const d = JSON.parse(localStorage.getItem(k) ?? '') as Partial<RatingDraft>
        if (typeof d.savedAt !== 'number' || Date.now() - d.savedAt >= DRAFT_TTL_MS) localStorage.removeItem(k)
      } catch { localStorage.removeItem(k) }
    }
  } catch { /* ignore */ }
}
