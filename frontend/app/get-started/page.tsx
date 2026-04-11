import Navbar from '@/app/components/Navbar'

export default function GetStartedPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-20">

        {/* Header */}
        <div className="mb-16 text-center">
          <p
            className="mb-8 text-[10px] font-semibold uppercase tracking-[0.4em]"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            Welcome to Slate
          </p>
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Who are you?
          </h1>
          <p className="text-base" style={{ color: '#606060' }}>
            We&apos;ll get you set up in the right place.
          </p>
        </div>

        {/* Cards */}
        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Card 1 — Guests */}
          <div
            className="flex flex-col px-8 py-10"
            style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: '#000' }}
          >
            <p
              className="mb-5 text-[10px] font-semibold uppercase tracking-[0.25em]"
              style={{ color: '#404040' }}
            >
              For guests
            </p>
            <div className="mb-6 h-px w-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <h2 className="mb-3 text-xl font-bold tracking-tight text-white">
              I&apos;m going out tonight
            </h2>
            <p className="mb-10 flex-1 text-sm leading-7" style={{ color: '#606060' }}>
              Create a free account to follow your favorite servers, get notified when they move restaurants, and leave verified ratings after great experiences.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="/login"
                className="block w-full bg-white py-3.5 text-center text-sm font-semibold text-black transition-opacity hover:opacity-80"
              >
                Create guest account
              </a>
              <a
                href="/live"
                className="block w-full text-center text-xs font-medium text-white/40 transition-colors hover:text-white"
              >
                Just browsing? Explore →
              </a>
            </div>
          </div>

          {/* Card 2 — Servers (prominent) */}
          <div
            className="flex flex-col px-8 py-10"
            style={{ border: '1px solid rgba(255,255,255,0.7)', backgroundColor: '#000' }}
          >
            <p
              className="mb-5 text-[10px] font-semibold uppercase tracking-[0.25em]"
              style={{ color: '#808080' }}
            >
              For servers &amp; bartenders
            </p>
            <div className="mb-6 h-px w-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <h2 className="mb-3 text-xl font-bold tracking-tight text-white">
              I work in hospitality
            </h2>
            <p className="mb-10 flex-1 text-sm leading-7" style={{ color: '#606060' }}>
              Claim your free portable profile. Build your on-chain reputation. Earn $SERVE rewards for every great shift.
            </p>
            <a
              href="/servers/signup"
              className="block w-full bg-white py-3.5 text-center text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              Claim my profile
            </a>
          </div>

          {/* Card 3 — Restaurants */}
          <div
            className="flex flex-col px-8 py-10"
            style={{ border: '1px solid rgba(255,255,255,0.15)', backgroundColor: '#000' }}
          >
            <p
              className="mb-5 text-[10px] font-semibold uppercase tracking-[0.25em]"
              style={{ color: '#404040' }}
            >
              For restaurants
            </p>
            <div className="mb-6 h-px w-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <h2 className="mb-3 text-xl font-bold tracking-tight text-white">
              I own or manage a venue
            </h2>
            <p className="mb-10 flex-1 text-sm leading-7" style={{ color: '#606060' }}>
              Your venue may already be on Slate. Claim it for free and see what guests are saying tonight.
            </p>
            <a
              href="/waitlist"
              className="block w-full border border-white/30 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:border-white"
            >
              Claim my venue
            </a>
          </div>

        </div>

        {/* Footer note */}
        <p className="mt-14 text-xs" style={{ color: '#404040' }}>
          Free forever for every server and bartender.
        </p>

      </main>
    </div>
  )
}
