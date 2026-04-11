import Navbar from '@/app/components/Navbar'

const TIERS = [
  {
    tag: 'Automatic — Free',
    name: 'Ghost listing',
    price: null,
    body: 'Any venue reported by guests appears on Slate\'s live map automatically. No signup required. Your guests are already putting you on the map.',
    cta: null,
  },
  {
    tag: 'Free forever',
    name: 'Claimed listing',
    price: null,
    body: 'Claim your venue page, add your details, and see what guests are saying about your spot tonight. Always free.',
    cta: { label: 'Claim your venue →', href: '/waitlist' },
  },
  {
    tag: 'Verified partner',
    name: '$99 / month',
    price: '$99',
    body: 'See which staff members drive the most repeat visits. Access shift analytics, guest insights, and recruiting tools to find and attract top rated servers in NYC.',
    cta: { label: 'Apply to join →', href: '/waitlist' },
  },
]

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
            <h1 className="mb-5 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your venue is probably
              <br />
              already on Slate.
            </h1>
            <p className="mb-10 max-w-xl text-base leading-relaxed" style={{ color: '#606060' }}>
              Guests are already reporting vibes at NYC venues tonight. Claim yours for free.
            </p>
            <a
              href="/waitlist"
              className="inline-block w-full rounded-full bg-white px-8 py-4 text-center text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:w-auto"
            >
              Claim your venue →
            </a>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Three tiers ───────────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <p className="mb-12 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              How it works for restaurants
            </p>

            <div className="flex flex-col gap-0">
              {TIERS.map((tier, i) => (
                <div key={tier.name}>
                  <div className="flex flex-col gap-5 py-10 sm:flex-row sm:items-start sm:gap-16">
                    {/* Number */}
                    <span className="shrink-0 font-mono text-xs font-medium" style={{ color: '#404040' }}>
                      0{i + 1}
                    </span>
                    <div className="flex-1">
                      {/* Tag */}
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
                        {tier.tag}
                      </p>
                      {/* Name */}
                      <h3 className="mb-3 text-lg font-bold text-white">{tier.name}</h3>
                      {/* Body */}
                      <p className="mb-5 max-w-lg text-sm leading-7" style={{ color: '#A0A0A0' }}>{tier.body}</p>
                      {/* CTA */}
                      {tier.cta && (
                        <a
                          href={tier.cta.href}
                          className={[
                            'inline-block rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80',
                            i === 2
                              ? 'bg-white text-black'
                              : 'border border-white/25 text-white hover:border-white',
                          ].join(' ')}
                        >
                          {tier.cta.label}
                        </a>
                      )}
                    </div>
                  </div>
                  {i < TIERS.length - 1 && <div className="border-t border-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Staff flywheel ────────────────────────────────────────────── */}
        <section className="px-6 py-20 lg:px-24 lg:py-32" style={{ backgroundColor: '#080808' }}>
          <div className="mx-auto max-w-3xl">
            <p className="mb-6 text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">
              When a top rated server joins your team their followers get notified and book at your restaurant.
            </p>
            <p className="text-base leading-relaxed" style={{ color: '#606060' }}>
              Your staff becomes your most powerful marketing tool.
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
              We&apos;re onboarding a small number of NYC restaurants and bars for our founding cohort. Apply now to be among the first claimed venues on Slate.
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
