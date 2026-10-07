import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

// Server-only helpers for API routes. Never import this from a client component.

let admin: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
  }
  return admin
}

/** The signed-in user behind `Authorization: Bearer <token>`, or null. */
export async function getRequestUser(request: Request): Promise<User | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const { data, error } = await supabaseAdmin().auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

/** Escape text before putting it into email HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
