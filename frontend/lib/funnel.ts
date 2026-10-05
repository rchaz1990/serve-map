/**
 * Minimal funnel instrumentation helpers (browser only).
 *
 * - Anonymous session ID: random UUID kept in localStorage so repeat scans from
 *   the same browser can be told apart from first scans. No login required.
 * - Test device flag: open any /scan/<id>?test=1 link once on a phone to mark
 *   that device as a test device (?test=0 turns it off). Scans and ratings made
 *   from a test device are saved with is_test = true so they can be excluded.
 */

const SESSION_KEY = 'slate_anon_session_id'
const TEST_DEVICE_KEY = 'slate_test_device'

let memorySessionId: string | null = null

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function getAnonSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = randomId()
    localStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    // Storage blocked (private mode etc.) — fall back to a per-page-load ID
    if (!memorySessionId) memorySessionId = randomId()
    return memorySessionId
  }
}

/** Apply ?test=1 / ?test=0 from the current URL, then return whether this device is a test device. */
export function isTestDevice(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get('test')
    if (param === '1') localStorage.setItem(TEST_DEVICE_KEY, '1')
    if (param === '0') localStorage.removeItem(TEST_DEVICE_KEY)
    return localStorage.getItem(TEST_DEVICE_KEY) === '1'
  } catch {
    return false
  }
}
