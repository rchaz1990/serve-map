import Navbar from '@/app/components/Navbar'

export default function ForServersPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="px-6 py-20 lg:px-24 lg:py-32">
          <div className="mx-auto max-w-4xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              For servers &amp; bartenders
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your reputation.
              <br />
              Your career.
              <br />
              Your rewards.
            </h1>
            <p className="mb-6 max-w-xl text-base leading-relaxed" style={{ color: '#606060' }}>
              Your reputation shouldn&apos;t reset when you change jobs. Slate is built entirely for the people who make hospitality great.
            </p>
            <p className="text-sm font-semibold text-white">
              Free for servers and bartenders. No credit card.
            </p>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── The problem ───────────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              The problem
            </p>
            <div className="max-w-2xl space-y-5 text-base leading-8" style={{ color: '#C0C0C0' }}>
              <p>
                You&apos;ve spent years building something real. Loyal regulars. A reputation for excellence. A following that comes back for you — not the restaurant.
              </p>
              <p>
                But when you change jobs it disappears overnight. Your reviews stay on the restaurant&apos;s Yelp page. Your regulars lose you. You start over at zero.
              </p>
              <p className="font-semibold text-white">
                Slate is built to change that.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── What you get ──────────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="mb-10 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              What you get
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[
                {
                  title: 'Portable reputation',
                  body: 'Build a service record that follows your career. Your ratings and reputation score stay on your Slate profile when you change jobs.',
                },
                {
                  title: 'Real followers',
                  body: 'Guests follow you — not the restaurant. Start a shift and your followers get an email, wherever you\'re working. The relationship is yours.',
                },
                {
                  title: 'Merit-based Slate Points',
                  body: 'Every guest rating earns Slate Points — more for higher stars, with bonuses for written reviews and new follows. A record that you showed up and delivered.',
                },
                {
                  title: 'Your QR code',
                  body: 'Start your shift and your QR appears in your dashboard. Guests scan it after great service to rate and follow you. No app download required.',
                },
              ].map(card => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-7"
                >
                  <p className="mb-3 text-sm font-semibold text-white">{card.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#606060' }}>{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── How $SERVE works ──────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              How Slate Points work
            </h2>
            <div className="max-w-2xl space-y-5 text-base leading-8" style={{ color: '#C0C0C0' }}>
              <p>
                Every rating you receive earns Slate Points based on the quality of your service.
              </p>
            </div>

            {/* Star rewards table */}
            <div className="mt-8 max-w-xl rounded-2xl border border-white/10 bg-white/[0.03]">
              {[
                { label: '5 stars + written review + follow', amount: '50 pts', highlight: true },
                { label: '4 stars',                          amount: '20 pts base' },
                { label: '3 stars',                          amount: '10 pts base' },
                { label: '2 stars',                          amount: '5 pts base' },
                { label: '1 star',                           amount: '2 pts base' },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between px-6 py-4"
                  style={{
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}
                >
                  <span className={row.highlight ? 'text-sm font-semibold text-white' : 'text-sm'} style={{ color: row.highlight ? '#FFFFFF' : '#A0A0A0' }}>
                    {row.label}
                  </span>
                  <span className="text-sm font-semibold text-white tabular-nums">{row.amount}</span>
                </div>
              ))}
            </div>

            {/* Bonuses */}
            <div className="mt-6 max-w-xl rounded-2xl border border-white/10 px-6 py-5" style={{ backgroundColor: '#080808' }}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>Bonuses</p>
              <div className="flex items-center justify-between py-1.5 text-sm" style={{ color: '#C0C0C0' }}>
                <span>Written review</span>
                <span className="text-white">+10 pts</span>
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm" style={{ color: '#C0C0C0' }}>
                <span>New follow</span>
                <span className="text-white">+5 pts</span>
              </div>
            </div>

            <div className="mt-8 max-w-2xl space-y-5 text-base leading-8" style={{ color: '#C0C0C0' }}>
              <p>
                Your lifetime Slate Points are your reputation score. It only goes up, and it doesn&apos;t reset when you change jobs.
              </p>
              <p>
                The value you create should come back to you. We&apos;d like to build $SERVE, a reward layer for the workers who make hospitality great. It hasn&apos;t been created, it may never launch, and Slate Points have no cash value. If that changes, we&apos;ll publish the rules first.
              </p>
              <p className="font-semibold text-white">
                No crypto knowledge required. Just recognition for real hospitality.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Safety ────────────────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-24" style={{ backgroundColor: '#080808' }}>
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              You&apos;re in complete control.
            </h2>
            <p className="mb-8 max-w-xl text-base leading-relaxed" style={{ color: '#606060' }}>
              Choose whether follows need your approval. Block anyone at any time. Your contact details and location are never shown on your public profile.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
              {[
                'Turn on follow approval to review every request',
                'Block any guest at any time — no questions asked',
                'Your location is never shown publicly',
              ].map(point => (
                <div key={point} className="flex items-start gap-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Single CTA ────────────────────────────────────────────────── */}
        <section className="px-6 py-24 text-center lg:px-24 lg:py-36">
          <div className="mx-auto max-w-xl">
            <h2 className="mb-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Build a service record that follows your career.
            </h2>
            <p className="mx-auto mb-10 text-base leading-relaxed" style={{ color: '#606060' }}>
              Your service. Your reputation. Wherever you work. Free for servers and bartenders — takes 2 minutes.
            </p>
            <a
              href="/servers/signup"
              className="block w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:inline-block sm:w-auto sm:px-10"
            >
              Claim your free profile →
            </a>
            <p className="mt-4 text-xs" style={{ color: '#404040' }}>Free for servers and bartenders. No crypto knowledge needed.</p>
          </div>
        </section>

      </main>
    </div>
  )
}
