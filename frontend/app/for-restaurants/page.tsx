import Navbar from '@/app/components/Navbar'

export default function ForRestaurantsPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="px-6 py-20 lg:px-24 lg:py-32">
          <div className="mx-auto max-w-4xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              For restaurants &amp; bars
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your staff is your
              <br />
              greatest asset.
              <br />
              We help you prove it.
            </h1>
            <p className="max-w-xl text-base leading-relaxed" style={{ color: '#606060' }}>
              Slate works with how you already operate. Reservation or walk-in. We bring your team&apos;s excellence to the surface.
            </p>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── The pitch ─────────────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <div className="max-w-2xl space-y-5 text-base leading-8" style={{ color: '#C0C0C0' }}>
              <p>
                When a great server joins your team they bring their reputation with them. On Slate that reputation is visible. Their followers get notified. Guests who&apos;ve followed them across three other restaurants now know they&apos;re at your venue.
              </p>
              <p>
                That&apos;s not marketing. That&apos;s word of mouth at scale — driven entirely by the quality of your staff.
              </p>
              <p>
                No reservation system changes. No new software to learn. Slate layers on top of how you already operate.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── What restaurants get ──────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="mb-10 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              What you get
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[
                {
                  title: 'Staff-driven discovery',
                  body: 'When a top-rated server joins your team their followers get notified automatically. Your hiring becomes a marketing event.',
                },
                {
                  title: 'Retain your best people',
                  body: '$SERVE token rewards give your top servers a financial reason to stay and perform at their best. Happy staff means happy guests.',
                },
                {
                  title: 'Real performance data',
                  body: 'See which staff members drive the most repeat visits, highest ratings, and best reviews. Know who your stars are before they leave.',
                },
                {
                  title: 'Live vibe intelligence',
                  body: "Guests report your venue's energy in real time. See when you're running hot and surface that intelligence to new guests nearby.",
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

        {/* ── How it works for venues ───────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="mb-10 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              How it works
            </p>
            <div className="flex flex-col">
              {[
                {
                  n: '01',
                  title: 'Apply to join',
                  body: 'Tell us about your venue. We onboard NYC restaurants and bars during our pilot phase. No reservation system required.',
                },
                {
                  n: '02',
                  title: 'Your servers claim their profiles',
                  body: 'Each server or bartender on your team claims their free Slate profile. Takes 2 minutes. They activate their shift QR each day.',
                },
                {
                  n: '03',
                  title: 'Guests scan after great service',
                  body: "When a guest has an exceptional experience they scan the server's QR code. A verified on-chain rating is created. No fake reviews.",
                },
                {
                  n: '04',
                  title: 'Their followers come to you',
                  body: 'Every guest who follows a server on your team gets notified when that server is working. Their loyalty drives your covers.',
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
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Pricing note ──────────────────────────────────────────────── */}
        <section className="px-6 py-14 lg:px-24" style={{ backgroundColor: '#080808' }}>
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-2 text-xl font-bold text-white sm:text-2xl">Simple, fair pricing.</h2>
            <p className="max-w-md text-sm leading-relaxed" style={{ color: '#606060' }}>
              $1 per cover processed through Slate. Significantly less than OpenTable or Resy. Free for guests, always. No monthly minimums during the pilot.
            </p>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Single CTA ────────────────────────────────────────────────── */}
        <section className="px-6 py-24 text-center lg:px-24 lg:py-36">
          <div className="mx-auto max-w-xl">
            <h2 className="mb-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Join the NYC pilot.
            </h2>
            <p className="mx-auto mb-10 text-base leading-relaxed" style={{ color: '#606060' }}>
              We&apos;re onboarding a small number of NYC restaurants and bars for our founding cohort. Apply now to be among the first venues on Slate.
            </p>
            <a
              href="/waitlist"
              className="block w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:inline-block sm:w-auto sm:px-10"
            >
              Apply to join Slate →
            </a>
            <p className="mt-4 text-xs" style={{ color: '#404040' }}>NYC venues only · Pilot phase · Limited spots</p>
          </div>
        </section>

      </main>
    </div>
  )
}
