// Version of the Terms of Service + Privacy Policy that people acknowledge.
// Bump it whenever either document changes materially: everyone is then asked again
// (worker sign-up and guest rating both check the version, on the server).
export const LEGAL_VERSION = '2026-10'

export type LegalContext = 'worker' | 'guest'
