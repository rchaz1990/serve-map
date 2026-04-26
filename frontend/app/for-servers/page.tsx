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
              The first platform built entirely for the people who make hospitality great.
            </p>
            <p className="text-sm font-semibold text-white">
              Free forever. No credit card. No catch.
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
                That ends with Slate.
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
                  body: 'Your ratings live on the Solana blockchain. Permanent. Immutable. Yours forever. No employer can take them away.',
                },
                {
                  title: 'Real followers',
                  body: 'Guests follow you — not the restaurant. When you move your followers get notified automatically. The relationship is yours.',
                },
                {
                  title: 'Slate Points',
                  body: 'Every verified rating earns you Slate Points — redeemable 1:1 for $SERVE tokens at launch. The on-chain proof that you showed up and delivered.',
                },
                {
                  title: 'Your QR code',
                  body: 'Activate your shift QR with one tap. Guests scan it at the table after great service. No app download required for them.',
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

        {/* ── $SERVE ownership ──────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Your reputation belongs to you.
            </h2>
            <div className="max-w-2xl space-y-5 text-base leading-8" style={{ color: '#C0C0C0' }}>
              <p>
                Every rating you receive is stored permanently on Solana.
                Every shift you work builds a credential no employer can delete.
                And every verified rating earns you Slate Points —
                redeemable 1:1 for $SERVE tokens when we launch.
              </p>
              <p className="font-semibold text-white">
                No speculation. No crypto knowledge required. Just real rewards for real hospitality.
              </p>
              <p>
                $SERVE launches after Slate hits its traction milestones — not before.
                Until then, every point you earn is locked in and waiting.
                When you hold $SERVE you hold a piece of the platform you helped build.
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
              Follow requests require your approval. Block anyone at any time. Your ratings can never be removed — but your privacy is always protected.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
              {[
                'You approve or deny every follow request',
                'Block any guest at any time — no questions asked',
                'Your location is never stored or shared',
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
              Ready to own your reputation?
            </h2>
            <p className="mx-auto mb-10 text-base leading-relaxed" style={{ color: '#606060' }}>
              Free forever. Takes 2 minutes. Your reputation starts the moment you claim your profile.
            </p>
            <a
              href="/servers/signup"
              className="block w-full rounded-full bg-white py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:inline-block sm:w-auto sm:px-10"
            >
              Claim your free profile →
            </a>
            <p className="mt-4 text-xs" style={{ color: '#404040' }}>Free forever. No crypto knowledge needed.</p>
          </div>
        </section>

      </main>
    </div>
  )
}
