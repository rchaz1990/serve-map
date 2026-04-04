import Navbar from '@/app/components/Navbar'

const steps = {
  guests: [
    {
      n: '01',
      title: 'Book a table at any Slate restaurant',
      body: 'Browse verified restaurants and reserve in seconds. Your history travels with your guest profile.',
    },
    {
      n: '02',
      title: 'Experience exceptional service',
      body: 'Every server on Slate has verified ratings from real diners. After your visit rate them directly and follow them forever. The best service you ever had stays with you.',
    },
    {
      n: '03',
      title: 'Rate them directly after dining',
      body: 'GPS-verified ratings take 30 seconds. No fake reviews — only guests who were actually there can leave feedback.',
    },
    {
      n: '04',
      title: 'Follow them — get notified wherever they work next',
      body: 'Great service shouldn\'t be a one-time thing. Follow your favorite servers and find them at every restaurant they move to.',
    },
  ],
  servers: [
    {
      n: '01',
      title: 'Claim your free profile in 2 minutes',
      body: 'Your profile lives on the Solana blockchain — not owned by any employer, not deletable by any manager. It\'s permanently yours.',
    },
    {
      n: '02',
      title: 'Every verified rating builds your on-chain reputation',
      body: 'Each GPS-verified rating is a permanent record. Your score is tamper-proof and portable to every job you take.',
    },
    {
      n: '03',
      title: 'Earn $SERVE token rewards weekly automatically',
      body: 'High-rated servers earn $SERVE tokens distributed every week. The better your service, the more you earn.',
    },
    {
      n: '04',
      title: 'Your profile follows you from job to job forever',
      body: 'Switch restaurants? Your reviews come with you. A 4.9 rating at Carbone is a 4.9 rating at your next gig.',
    },
  ],
  restaurants: [
    {
      n: '01',
      title: 'Join Slate',
      body: 'Apply to list your restaurant and get discovered by guests who follow their favorite servers. When a top server joins your team their following comes with them.',
    },
    {
      n: '02',
      title: 'Retain your best staff',
      body: '$SERVE token rewards give your top servers a financial reason to stay and perform at their best. Happy staff means happy guests.',
    },
    {
      n: '03',
      title: 'Understand your team',
      body: 'Access real analytics on which staff members drive the most bookings, repeat visits, and highest ratings. Know who your stars are before they leave.',
    },
    {
      n: '04',
      title: 'Access staff performance analytics',
      body: 'See real ratings by shift, cover count, and section. Know exactly which servers drive repeat guests.',
    },
  ],
}

const liveReports = [
  { icon: '◉', label: 'How busy is it right now?', detail: 'Quiet / Moderate / Packed — reported in real time by verified guests on-site.' },
  { icon: '◎', label: 'Are there bar seats available?', detail: 'Know before you walk in whether the bar has room or is standing only.' },
  { icon: '◷', label: 'What\'s the current wait time?', detail: 'Actual waits from people inside — not the host\'s optimistic estimate.' },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-5xl px-8 py-20 lg:py-28">

        {/* Hero */}
        <div className="mb-20 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
            How it Works
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Built around the people<br className="hidden sm:block" /> who make dining great
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed" style={{ color: '#A0A0A0' }}>
            Slate connects guests, servers, and restaurants through a portable reputation system that belongs to everyone who earns it.
          </p>
        </div>

        {/* ── FOR GUESTS ─────────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-10 flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>For Guests</span>
            <div className="flex-1 border-t border-white/10" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {steps.guests.map(s => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="mb-3 font-mono text-xs" style={{ color: '#404040' }}>{s.n}</p>
                <h3 className="mb-2 text-base font-semibold text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <a
              href="/explore"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              Browse restaurants →
            </a>
          </div>
        </section>

        {/* ── FOR SERVERS ────────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-10 flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>For Servers</span>
            <div className="flex-1 border-t border-white/10" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {steps.servers.map(s => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="mb-3 font-mono text-xs" style={{ color: '#404040' }}>{s.n}</p>
                <h3 className="mb-2 text-base font-semibold text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <a
              href="/servers/signup"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              Claim your profile →
            </a>
          </div>
        </section>

        {/* ── FOR RESTAURANTS ────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-10 flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>For Restaurants</span>
            <div className="flex-1 border-t border-white/10" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {steps.restaurants.map(s => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="mb-3 font-mono text-xs" style={{ color: '#404040' }}>{s.n}</p>
                <h3 className="mb-2 text-base font-semibold text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <a
              href="/for-restaurants"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              List your restaurant →
            </a>
          </div>
        </section>

        {/* ── LIVE INTELLIGENCE ──────────────────────────────────────────── */}
        <section>
          <div className="mb-10 flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>Live Intelligence</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
              <span className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#A0A0A0' }}>Real-time data</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Know what&apos;s happening before you leave the house
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
              Guests earn $SERVE tokens for reporting real-time restaurant conditions — verified by GPS. The result is a live layer of intelligence that no restaurant website will ever show you.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {liveReports.map(r => (
                <div key={r.label} className="rounded-xl border border-white/10 p-5">
                  <p className="mb-3 text-lg" style={{ color: '#606060' }}>{r.icon}</p>
                  <p className="mb-1 text-sm font-semibold text-white">{r.label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#606060' }}>{r.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border border-white/10 p-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-white">Location-verified reports only</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: '#606060' }}>
                    You must be within 300m of the restaurant to submit. No remote guesses, no stale data.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-white/10 p-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-white">More accurate = more $SERVE earned</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: '#606060' }}>
                    Reports validated against subsequent reports earn bonus tokens. Accuracy is rewarded over volume.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <a
                href="/live"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
              >
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
                See live reports →
              </a>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
