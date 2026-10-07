import { supabase } from '@/lib/supabase'

/**
 * JSON headers plus the signed-in user's access token, for API routes that
 * now require sign-in (notify-followers, contact-server, welcome-email).
 * Pass `accessToken` when a fresh session is already in hand (e.g. right after signUp).
 */
export async function authJsonHeaders(accessToken?: string | null): Promise<Record<string, string>> {
  let token = accessToken ?? null
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token ?? null
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}
