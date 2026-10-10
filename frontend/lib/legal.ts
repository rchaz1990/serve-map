// Version of the Terms of Service + Privacy Policy that people acknowledge.
// Bump it whenever either document changes materially: everyone is then asked again
// (worker sign-up and guest rating both check the version, on the server).
//
// RELEASE: one version for the whole Stranger Test release (#36 → #48). In the release
// commit, set this to the publication date (YYYY-MM-DD) and set the same value in
// migration 39's current_legal_version(). Tests fail if the two differ.
export const LEGAL_VERSION = '2026-10'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "Effective October 12, 2026" (or "Effective October 2026" before a day is set), from LEGAL_VERSION. */
export function legalEffectiveLabel(version: string = LEGAL_VERSION): string {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(version)
  if (!m) return `Version ${version}`
  const month = MONTHS[Number(m[2]) - 1]
  return m[3] ? `Effective ${month} ${Number(m[3])}, ${m[1]}` : `Effective ${month} ${m[1]}`
}

export type LegalContext = 'worker' | 'guest'
