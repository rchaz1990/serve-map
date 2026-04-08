import Image from 'next/image'
import Navbar from '@/app/components/Navbar'

export default function Home() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Navbar overlay />

      <main>

        {/* ── Section 1: Hero ─────────────────────────────────────────── */}
        <section className="relative flex min-h-screen flex-col items-start justify-center px-8 lg:px-24">
          <Image
            src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1920&q=80"
            alt=""
            fill
            priority
            className="object-cover"
            style={{ zIndex: 0 }}
          />
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.78)', zIndex: 1 }} />
          <div className="relative mx-auto w-full max-w-5xl pt-24 pb-20" style={{ zIndex: 2 }}>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#404040' }}>
              NYC · Live Now
            </p>
            <h1 className="mb-6 text-5xl font-bold leading-[1.0] tracking-tight text-white sm:text-6xl lg:text-8xl">
              Your night
              <br />
              starts here.
            </h1>
            <p className="mb-4 max-w-xl text-lg font-medium text-white sm:text-xl lg:text-2xl">
              Discover the night. Follow the ones who make it.
            </p>
            <p className="mb-12 max-w-lg text-sm leading-relaxed sm:text-base" style={{ color: '#606060' }}>
              See what&apos;s live in NYC tonight. Rate and follow the servers and bartenders who make it unforgettable.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/live"
                className="inline-block rounded-full bg-white px-8 py-4 text-center text-sm font-semibold text-black transition-opacity hover:opacity-80"
              >
                See what&apos;s live →
              </a>
              <a
                href="/for-servers"
                className="inline-block rounded-full border border-white/25 px-8 py-4 text-center text-sm font-medium text-white transition-colors hover:border-white"
              >
                I work in hospitality
              </a>
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Section 2: Three value props ────────────────────────────── */}
        <section className="px-8 py-20 lg:px-24 lg:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                {
                  icon: '🔥',
                  title: 'Feel the vibe',
                  body: 'See which venues are live right now. Community reported, location verified.',
                },
                {
                  icon: '⭐',
                  title: 'Rate the person',
                  body: 'After a great experience scan their QR and leave a verified on-chain rating. Not the restaurant — the individual.',
                },
                {
                  icon: '👤',
                  title: 'Follow forever',
                  body: 'Your favorite bartender moves spots. You already know. Follow the talent, not the venue.',
                },
              ].map(item => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-8"
                >
                  <span className="mb-5 block text-2xl">{item.icon}</span>
                  <p className="mb-2 text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#606060' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Split section A: For servers ────────────────────────────── */}
        <section className="flex min-h-[520px] flex-col sm:flex-row">
          {/* Photo */}
          <div className="relative min-h-[280px] w-full sm:w-[60%]">
            <Image
              src="https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1200&q=80"
              alt="Bartender at work"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }} />
          </div>
          {/* Copy */}
          <div className="flex w-full flex-col justify-center px-10 py-16 sm:w-[40%] lg:px-16" style={{ backgroundColor: '#080808' }}>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#404040' }}>
              For servers &amp; bartenders
            </p>
            <h2 className="mb-5 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              Your reputation.
              <br />
              Your rewards.
            </h2>
            <p className="mb-8 text-sm leading-relaxed" style={{ color: '#606060' }}>
              Your ratings live on the blockchain. Portable. Permanent. Yours forever — no matter where you work next.
            </p>
            <a
              href="/server-waitlist"
              className="inline-block w-fit rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              Claim your profile →
            </a>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Section 3: Mission statement ────────────────────────────── */}
        <section className="px-8 py-24 text-center lg:px-24 lg:py-32">
          <div className="mx-auto max-w-3xl">
            <p className="mb-6 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              The hospitality industry generates $1 trillion a year.
            </p>
            <p className="mx-auto mb-16 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: '#606060' }}>
              The servers and bartenders who make it possible have never had a platform built for them.
            </p>

            <div className="mb-16 border-t border-white/10" />

            <div className="grid grid-cols-3 gap-6 sm:gap-10">
              {[
                { stat: '15M+', label: 'Hospitality workers in the US' },
                { stat: '0',    label: 'Platforms built for their reputation' },
                { stat: '∞',    label: 'Potential when you change that' },
              ].map(item => (
                <div key={item.stat}>
                  <p className="mb-2 text-3xl font-bold text-white sm:text-5xl">{item.stat}</p>
                  <p className="text-xs leading-5 sm:text-sm" style={{ color: '#606060' }}>{item.label}</p>
                </div>
              ))}
            </div>

            <p className="mx-auto mt-16 max-w-md text-sm font-medium text-white sm:text-base">
              Slate is the first. Built for the people who deserve it most.
            </p>
          </div>
        </section>

        {/* ── Split section B: Feel the vibe (reversed) ───────────────── */}
        <section className="flex min-h-[520px] flex-col sm:flex-row-reverse">
          {/* Photo */}
          <div className="relative min-h-[280px] w-full sm:w-[55%]">
            <Image
              src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1200&q=80"
              alt="Busy NYC bar"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} />
          </div>
          {/* Copy */}
          <div className="flex w-full flex-col justify-center px-10 py-16 sm:w-[45%] lg:px-16" style={{ backgroundColor: '#080808' }}>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#404040' }}>
              Feel the vibe
            </p>
            <h2 className="mb-5 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              NYC is alive
              <br />
              tonight.
            </h2>
            <p className="mb-8 text-sm leading-relaxed" style={{ color: '#606060' }}>
              Updated in real time. Community reported. Location verified. See which venues are packed, live, or chill — right now.
            </p>
            <a
              href="/live"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
              See what&apos;s live →
            </a>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Section 4: How it works ──────────────────────────────────── */}
        <section className="px-8 py-24 lg:px-24 lg:py-32">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              How it works
            </p>
            <h2 className="mb-16 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Three steps. One night you&apos;ll never forget.
            </h2>

            <div className="flex flex-col gap-0">
              {[
                {
                  n: '01',
                  title: 'Feel the vibe',
                  body: 'Open Slate and see which venues near you are live right now. Chill, Live, or Packed — reported by real guests who are there.',
                },
                {
                  n: '02',
                  title: 'Meet someone great',
                  body: 'You sit down. Your server or bartender is exceptional. They show you their QR code. You scan it — takes 3 seconds.',
                },
                {
                  n: '03',
                  title: 'Rate and follow',
                  body: 'Leave a verified on-chain rating. Follow them. Next time they\'re working somewhere new — you\'ll know. Their reputation follows them forever.',
                },
              ].map((step, i) => (
                <div key={step.n}>
                  <div className="flex items-start gap-8 py-10 sm:gap-16">
                    <span className="shrink-0 font-mono text-xs font-medium" style={{ color: '#404040' }}>{step.n}</span>
                    <div>
                      <h3 className="mb-2 text-base font-semibold text-white">{step.title}</h3>
                      <p className="max-w-lg text-sm leading-relaxed" style={{ color: '#606060' }}>{step.body}</p>
                    </div>
                  </div>
                  {i < 2 && <div className="border-t border-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Section 5: For servers callout ──────────────────────────── */}
        <section className="px-8 py-24 lg:px-24 lg:py-32" style={{ backgroundColor: '#080808' }}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              For servers &amp; bartenders
            </p>
            <h2 className="mb-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Are you a server or bartender?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed" style={{ color: '#606060' }}>
              Your reputation belongs to you. Not your employer. Not Yelp. Not OpenTable. Claim your free profile and start earning $SERVE rewards for every great shift.
            </p>
            <a
              href="/server-waitlist"
              className="inline-block rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              Claim your free profile →
            </a>
            <p className="mt-4 text-xs" style={{ color: '#404040' }}>Free forever. Takes 2 minutes.</p>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Section 6: Safety and trust ─────────────────────────────── */}
        <section className="px-8 py-20 lg:px-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Built with safety first.
            </h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
              {[
                'Ratings verified by QR scan or GPS — no fake reviews',
                'Servers approve or block any follow request at any time',
                'Your location is never stored — only used to verify your visit',
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

      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="px-8 py-12 lg:px-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            {/* Brand */}
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-white">Slate</p>
              <p className="max-w-xs text-xs leading-5" style={{ color: '#404040' }}>
                Discover the night. Follow the ones who make it.
              </p>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              {[
                { label: 'Explore', href: '/explore' },
                { label: 'How it Works', href: '/how-it-works' },
                { label: 'For Servers', href: '/for-servers' },
                { label: 'For Restaurants', href: '/for-restaurants' },
                { label: 'Whitepaper', href: '/whitepaper' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-xs transition-colors hover:text-white"
                  style={{ color: '#606060' }}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Signals */}
            <div className="flex flex-col gap-2">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#A0A0A0' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-2 w-2"><circle cx="12" cy="12" r="12" /></svg>
                Built on Solana
              </span>
              <a href="https://twitter.com/slatenow" target="_blank" rel="noopener noreferrer" className="text-xs transition-colors hover:text-white" style={{ color: '#606060' }}>@slatenow</a>
              <span className="text-xs" style={{ color: '#404040' }}>NYC · 2026</span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-xs" style={{ color: '#404040' }}>
              © 2026 Slate · team@slatenow.xyz
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
