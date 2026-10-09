import { notFound } from 'next/navigation'

// The April 2026 whitepaper is withdrawn from the public site pending a factual and
// vision review (it describes unapproved plans as if decided). The original text is
// preserved at docs/archive/whitepaper-v1.0-2026-04.tsx.txt. This route returns 404.
export default function WhitepaperPage() {
  notFound()
}
