'use client'

import type { ReactNode } from 'react'

// An explicit, unticked-by-default acknowledgment. The Terms and Privacy links open in
// a new tab so the form isn't lost. The server records the ticked version.
export default function LegalConsent({
  checked,
  onChange,
  children,
  id = 'legal-consent',
}: {
  checked: boolean
  onChange: (next: boolean) => void
  children: ReactNode
  id?: string
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-left" data-testid="legal-consent">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-white"
      />
      <span className="text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>
        {children}{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-white">Terms of Service</a>
        {' '}and{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-white">Privacy Policy</a>.
      </span>
    </label>
  )
}
