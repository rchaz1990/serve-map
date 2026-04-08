import Navbar from '@/app/components/Navbar'

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-4xl px-8 py-20 lg:py-28">

        {/* Header */}
        <div className="mb-20">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
            How it works
          </p>
          <h1 className="mb-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            How Slate works.
          </h1>
          <p className="max-w-xl text-base leading-relaxed" style={{ color: '#606060' }}>
            No reservations required. Just great experiences, real ratings, and a reputation that lasts forever.
          </p>
        </div>

        {/* ── For Guests ──────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-10 flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white">For guests</span>
            <div className="flex-1 border-t border-white/10" />
          </div>
          <div className="flex flex-col gap-0">
            {[
              {
                n: '01',
                title: 'Check what\'s live',
                body: 'Open Slate and see which NYC venues have active energy right now. Chill, Live, or Packed — reported by real guests who are there.',
              },
              {
                n: '02',
                title: 'Have a great experience',
                body: 'Go out. Sit down. Let the night happen naturally. No pre-selecting servers. No planning required.',
              },
              {
                n: '03',
                title: 'Scan and rate',
                body: 'Your server shares their QR code after service. Scan it, leave a verified rating in 30 seconds. GPS-confirmed. Tamper-proof.',
              },
              {
                n: '04',
                title: 'Follow forever',
                body: 'Follow them on Slate. When they move to a new venue you get notified automatically. The relationship is yours — not the restaurant\'s.',
              },
            ].map((step, i, arr) => (
              <div key={step.n}>
                <div className="flex items-start gap-8 py-8 sm:gap-16">
                  <span className="shrink-0 font-mono text-xs font-medium" style={{ color: '#404040' }}>{step.n}</span>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-white sm:text-base">{step.title}</h3>
                    <p className="max-w-lg text-sm leading-relaxed" style={{ color: '#606060' }}>{step.body}</p>
                  </div>
                </div>
                {i < arr.length - 1 && <div className="border-t border-white/10" />}
              </div>
            ))}
          </div>
          <div className="mt-8">
            <a
              href="/live"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
              See what&apos;s live →
            </a>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── For Servers & Bartenders ─────────────────────────────────── */}
        <section className="my-20">
          <div className="mb-10 flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white">For servers &amp; bartenders</span>
            <div className="flex-1 border-t border-white/10" />
          </div>
          <div className="flex flex-col gap-0">
            {[
              {
                n: '01',
                title: 'Claim your free profile',
                body: 'Takes 2 minutes. Your name, your restaurant, your specialty. Your profile goes live immediately.',
              },
              {
                n: '02',
                title: 'Activate your QR each shift',
                body: 'One tap. Your QR is live for 8 hours. Show it to guests after great service. No app download required for them.',
              },
              {
                n: '03',
                title: 'Build your on-chain reputation',
                body: 'Every verified rating is stored permanently on Solana. No employer can take it away. No platform can delete it.',
              },
              {
                n: '04',
                title: 'Earn $SERVE rewards',
                body: 'Top rated servers earn token rewards weekly. Distributed automatically by smart contract. No application needed.',
              },
              {
                n: '05',
                title: 'Follow your career anywhere',
                body: 'Change restaurants. Your profile, ratings, and followers come with you. Always. Your reputation is yours forever.',
              },
            ].map((step, i, arr) => (
              <div key={step.n}>
                <div className="flex items-start gap-8 py-8 sm:gap-16">
                  <span className="shrink-0 font-mono text-xs font-medium" style={{ color: '#404040' }}>{step.n}</span>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-white sm:text-base">{step.title}</h3>
                    <p className="max-w-lg text-sm leading-relaxed" style={{ color: '#606060' }}>{step.body}</p>
                  </div>
                </div>
                {i < arr.length - 1 && <div className="border-t border-white/10" />}
              </div>
            ))}
          </div>
          <div className="mt-8">
            <a
              href="/server-waitlist"
              className="inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              Claim your free profile →
            </a>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── For Restaurants ──────────────────────────────────────────── */}
        <section className="my-20">
          <div className="mb-10 flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white">For restaurants &amp; bars</span>
            <div className="flex-1 border-t border-white/10" />
          </div>
          <div className="flex flex-col gap-0">
            {[
              {
                n: '01',
                title: 'No reservations required',
                body: 'Any venue can join Slate. Reservation or walk-in. We work with how you already operate — no system changes needed.',
              },
              {
                n: '02',
                title: 'Your staff becomes your marketing',
                body: 'When a top server joins your team their followers get notified and come to you. Staff reputation drives real bookings.',
              },
              {
                n: '03',
                title: 'Real performance data',
                body: 'See which staff members drive the most repeat visits and highest ratings. Know who your stars are before they leave.',
              },
              {
                n: '04',
                title: 'The vibe meter',
                body: 'Guests report your venue\'s energy in real time. Live intelligence that surfaces your best nights and fills your slower ones.',
              },
            ].map((step, i, arr) => (
              <div key={step.n}>
                <div className="flex items-start gap-8 py-8 sm:gap-16">
                  <span className="shrink-0 font-mono text-xs font-medium" style={{ color: '#404040' }}>{step.n}</span>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-white sm:text-base">{step.title}</h3>
                    <p className="max-w-lg text-sm leading-relaxed" style={{ color: '#606060' }}>{step.body}</p>
                  </div>
                </div>
                {i < arr.length - 1 && <div className="border-t border-white/10" />}
              </div>
            ))}
          </div>
          <div className="mt-8">
            <a
              href="/for-restaurants"
              className="inline-block rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition-colors hover:border-white"
            >
              Learn more →
            </a>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Verification system ──────────────────────────────────────── */}
        <section className="mt-20">
          <div className="mb-8">
            <h2 className="mb-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              How we verify every rating.
            </h2>
            <p className="max-w-xl text-sm leading-relaxed" style={{ color: '#606060' }}>
              Slate uses three layers of verification to ensure every rating comes from a real experience:
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                title: 'QR code scan',
                body: 'Server activates their shift QR. Only guests at the table can scan it. Active for 8 hours per shift.',
              },
              {
                title: 'GPS geofencing',
                body: 'Guest must be within 300 meters of the venue to submit a rating. Location is checked once and never stored.',
              },
              {
                title: 'Booking verification',
                body: 'Guests who booked through partner venues are automatically verified without needing a QR scan.',
              },
            ].map(item => (
              <div
                key={item.title}
                className="flex items-start gap-5 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <div>
                  <p className="mb-1 text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#606060' }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs" style={{ color: '#404040' }}>
            This makes Slate&apos;s ratings the most trustworthy individual service ratings in hospitality.
          </p>
        </section>

      </main>
    </div>
  )
}
