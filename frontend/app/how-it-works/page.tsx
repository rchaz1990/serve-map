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
            Great experiences, real ratings, and a reputation that follows the person — not the venue.
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
                body: 'Open Slate and see which NYC venues have energy tonight. Chill, Live, or Packed — reported by guests who are there.',
              },
              {
                n: '02',
                title: 'Have a great experience',
                body: 'Go out. Sit down. Let the night happen naturally. No pre-selecting servers. No planning required.',
              },
              {
                n: '03',
                title: 'Scan and rate',
                body: 'Your server shares their QR code after service. Scan it and rate them in 30 seconds with your Slate account.',
              },
              {
                n: '04',
                title: 'Follow the talent',
                body: 'Follow them on Slate and get an email when they start a shift — wherever they work. The relationship is yours, not the restaurant\'s.',
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
                title: 'Show your QR each shift',
                body: 'Start your shift and your QR appears in your dashboard. Show it to guests after great service. No app download required for them.',
              },
              {
                n: '03',
                title: 'Build your service record',
                body: 'Every rating adds to your Slate profile and your reputation score. It belongs to your career, not your employer.',
              },
              {
                n: '04',
                title: 'Earn Slate Points',
                body: 'Every rating earns Slate Points today. $SERVE, a reward layer for workers, is planned — not yet launched.',
              },
              {
                n: '05',
                title: 'Follow your career anywhere',
                body: 'Change restaurants. Your profile, ratings, and followers come with you. Your reputation shouldn\'t reset when you change jobs.',
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
              href="/servers/signup"
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
                body: 'When your staff start a shift, their followers hear about it. Great staff can bring their regulars with them.',
              },
              {
                n: '03',
                title: 'Real performance data',
                body: 'See which staff members earn the highest ratings and the most followers. Know who your stars are before they leave.',
              },
              {
                n: '04',
                title: 'The vibe meter',
                body: 'Guests report your venue\'s energy as the night happens — a live read on your best nights and your slower ones.',
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
              How ratings work today.
            </h2>
            <p className="max-w-xl text-sm leading-relaxed" style={{ color: '#606060' }}>
              Slate ties every rating to a real person and a real account:
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                title: 'The server\'s own QR code',
                body: 'Each server has their own QR code. Guests rate from it, so every rating goes to the right person.',
              },
              {
                title: 'Signed-in guests',
                body: 'Rating requires a Slate account. Slate Points are calculated by Slate, never by the guest\'s phone.',
              },
              {
                title: 'Clear rules',
                body: 'Fake or coordinated ratings break our Terms. We remove them and can close the accounts behind them.',
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
            Location checks for ratings are in development. We&apos;ll keep adding protections as Slate grows.
          </p>
        </section>

      </main>
    </div>
  )
}
