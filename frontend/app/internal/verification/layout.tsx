import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  title: 'Verification',
}

export default function InternalVerificationLayout({ children }: { children: React.ReactNode }) {
  return children
}
