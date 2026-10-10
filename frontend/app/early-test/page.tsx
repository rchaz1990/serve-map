import Navbar from '@/app/components/Navbar'
import SimpleMarkdown from '@/app/components/SimpleMarkdown'
import { GUEST_SHEET_MD, WORKER_SHEET_MD } from '@/lib/participant-documents'

export const metadata = { title: 'Slate Early Product Test' }

// The participant information sheets, verbatim (lib/participant-documents.ts).
export default function EarlyTestPage() {
  return (
    <div className="slate-page">
      <Navbar />
      <div className="slate-rule" />
      <main className="slate-main mx-auto max-w-2xl px-6 py-12">
        <section id="guest" data-testid="guest-sheet" className="mb-16 scroll-mt-24">
          <SimpleMarkdown source={GUEST_SHEET_MD} />
        </section>
        <section id="worker" data-testid="worker-sheet" className="scroll-mt-24">
          <SimpleMarkdown source={WORKER_SHEET_MD} />
        </section>
      </main>
    </div>
  )
}
