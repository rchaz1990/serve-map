// Proof that this browser just followed a password-recovery link.
//
// Set ONLY by the server after Supabase verified a recovery link:
//   • /auth/confirm   — token_hash link of type "recovery" (works on any device)
//   • /auth/callback  — default (PKCE) link whose code exchange reports PASSWORD_RECOVERY
// /reset-password shows its form only when this marker matches the signed-in user,
// so an ordinary signed-in session is never treated as a recovery link.
// It is short-lived, scoped to /reset-password, and cleared after a successful change.

export const RECOVERY_COOKIE = 'slate_pw_recovery'
export const RECOVERY_MAX_AGE_SECONDS = 15 * 60

export function recoveryMarkerCookie(userId: string, requestUrl: URL) {
  return {
    name: RECOVERY_COOKIE,
    value: userId,
    options: {
      path: '/reset-password',
      maxAge: RECOVERY_MAX_AGE_SECONDS,
      sameSite: 'lax' as const,
      secure: requestUrl.protocol === 'https:',
      httpOnly: false, // read by the reset page; holds only the user id, no secret
    },
  }
}
