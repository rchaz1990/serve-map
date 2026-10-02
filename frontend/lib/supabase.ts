import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Passthrough lock — do not use Navigator LockManager.
 *
 * auth-js ≤2.103 defaults to navigatorLock in the browser. Concurrent
 * getSession / onAuthStateChange / client init then race the Web Locks API
 * and emit "Lock broken by another request with the 'steal' option", which
 * can leave awaiters hanging. That hung /restaurant/dashboard on Loading
 * after cold reload (Navbar + dashboard both calling getSession).
 *
 * In-tab token refresh remains single-flighted inside GoTrueClient. This
 * matches the lockless default introduced in supabase-js 2.107+.
 */
async function lockNoOp<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  return await fn()
}

type BrowserSupabase = SupabaseClient

const globalForSupabase = globalThis as typeof globalThis & {
  __slateSupabase?: BrowserSupabase
}

function createSingletonClient(): BrowserSupabase {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    isSingleton: true,
    auth: {
      lock: lockNoOp,
    },
  })
}

/** Single browser client across HMR / Strict Mode remounts. */
export const supabase: BrowserSupabase =
  globalForSupabase.__slateSupabase ??
  (globalForSupabase.__slateSupabase = createSingletonClient())

/** Coalesce concurrent getSession() into one in-flight promise. */
let inFlightSession: Promise<Session | null> | null = null

export function getAuthSession(): Promise<Session | null> {
  if (!inFlightSession) {
    inFlightSession = supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('[supabase] getSession:', error.message)
          return null
        }
        return data.session
      })
      .catch((err) => {
        console.error('[supabase] getSession failed:', err)
        return null
      })
      .finally(() => {
        // Allow a fresh read after this turn (auth events may have settled).
        queueMicrotask(() => {
          inFlightSession = null
        })
      })
  }
  return inFlightSession
}

/** Reject if `promise` does not settle within `ms`. Accepts thenables (e.g. PostgrestBuilder). */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label = 'operation',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}
