'use client'

import { supabase } from '@/lib/supabase'
import { authJsonHeaders } from '@/lib/auth-fetch'
import { LEGAL_VERSION } from '@/lib/legal'

/** True when the signed-in account has acknowledged the current Terms/Privacy (any context). */
export async function legalOnFile(): Promise<boolean> {
  const { data } = await supabase.auth.getUser() // fresh from the server, not the cached token
  const m = data.user?.app_metadata ?? {}
  return m.legal_guest_version === LEGAL_VERSION || m.legal_worker_version === LEGAL_VERSION
}

/** Records the guest's ticked acknowledgment on the server. Returns an error message or null. */
export async function recordGuestLegal(accessToken?: string): Promise<string | null> {
  try {
    const res = await fetch('/api/legal/accept', {
      method: 'POST',
      headers: await authJsonHeaders(accessToken),
      body: JSON.stringify({ version: LEGAL_VERSION }),
    })
    if (res.ok) return null
    const json = await res.json().catch(() => null) as { error?: string } | null
    return json?.error ?? 'We could not save your agreement. Please try again.'
  } catch {
    return 'We could not save your agreement. Please try again.'
  }
}
