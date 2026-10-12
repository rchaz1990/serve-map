import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  title: 'Employment check',
}

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children
}
