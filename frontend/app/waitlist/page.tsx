import Script from 'next/script'
import Navbar from '@/app/components/Navbar'

const CITIES = ['New York', 'Los Angeles', 'Miami', 'Chicago', 'San Francisco']

export default function WaitlistPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Script
        src="https://subscribe-forms.beehiiv.com/embed.js"
        strategy="lazyOnload"
      />

      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-lg px-8 py-16 lg:px-0">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="mb-12 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
            For restaurants
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Bring Slate to your
            <br />
            restaurant.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed" style={{ color: '#A0A0A0' }}>
            Join the waitlist and we&apos;ll reach out to get your restaurant listed on Slate.
          </p>
        </div>

        {/* ── Beehiiv embed ─────────────────────────────────────────────── */}
        <div className="mb-14">
          <iframe
            src="https://subscribe-forms.beehiiv.com/2e03b9ed-4478-4968-bfd2-8d380cade7c0"
            data-test-id="beehiiv-embed"
            frameBorder={0}
            scrolling="no"
            style={{
              width: '100%',
              maxWidth: '100%',
              height: '291px',
              margin: 0,
              borderRadius: 0,
              backgroundColor: 'transparent',
              boxShadow: 'none',
            }}
          />
        </div>

        {/* ── Social proof ──────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-sm font-semibold text-white">
            143 restaurants already on the waitlist
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {CITIES.map((city, i) => (
              <span key={city} className="flex items-center gap-2">
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs" style={{ color: '#A0A0A0' }}>
                  {city}
                </span>
                {i < CITIES.length - 1 && (
                  <span className="text-xs" style={{ color: '#404040' }}>•</span>
                )}
              </span>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
