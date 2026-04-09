import Image from 'next/image'
import Navbar from '@/app/components/Navbar'

const MARQUEE_CSS = `
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.marquee-track { animation: marquee 28s linear infinite; }
`

const MARQUEE_ITEMS = [
  "Employees Only · PACKED 🚀",
  "Death & Co · LIVE 🔥",
  "Attaboy · PACKED 🚀",
  "Dante · LIVE 🔥",
  "The Dead Rabbit · LIVE 🔥",
  "Please Don't Tell · PACKED 🚀",
  "Maison Premiere · CHILL 🧊",
  "Amor y Amargo · CHILL 🧊",
]

export default function Home() {
  return (
    <div
      className="min-h-screen overflow-x-hidden text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <style dangerouslySetInnerHTML={{ __html: MARQUEE_CSS }} />
      <Navbar overlay />

      <main>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative flex min-h-screen flex-col items-start justify-center px-6 lg:px-24">
          <Image
            src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1920&q=80"
            alt=""
            fill
            priority
            className="object-cover"
            style={{ zIndex: 0 }}
          />
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.78)', zIndex: 1 }} />
          <div className="relative mx-auto w-full max-w-5xl pt-24 pb-16" style={{ zIndex: 2 }}>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#404040' }}>
              NYC · Live Now
            </p>
            <h1 className="mb-5 text-5xl font-bold leading-[1.0] tracking-tight text-white sm:text-6xl lg:text-8xl">
              Your night
              <br />
              starts here.
            </h1>
            <p className="mb-3 max-w-xl text-lg font-medium text-white sm:text-xl lg:text-2xl">
              Discover the night. Follow the ones who make it.
            </p>
            <p className="mb-10 max-w-lg text-sm leading-relaxed sm:text-base" style={{ color: '#606060' }}>
              See what&apos;s live in NYC tonight. Rate and follow the servers and bartenders who make it unforgettable.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/live"
                className="w-full rounded-full bg-white px-8 py-4 text-center text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:w-auto"
              >
                See what&apos;s live →
              </a>
              <a
                href="/for-servers"
                className="w-full rounded-full border border-white/25 px-8 py-4 text-center text-sm font-medium text-white transition-colors hover:border-white sm:w-auto"
              >
                I work in hospitality
              </a>
            </div>
          </div>
        </section>

        {/* ── Scrolling marquee ─────────────────────────────────────────── */}
        <div className="overflow-hidden border-y border-white/10 py-4" style={{ backgroundColor: '#050505' }}>
          <div className="marquee-track flex w-max gap-12 whitespace-nowrap">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={i} className="text-xs font-medium tracking-widest uppercase" style={{ color: '#404040' }}>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ── Three value props ─────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-24 lg:py-28">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-7 sm:px-7 sm:py-8"
                >
                  <span className="mb-5 block text-2xl">{item.icon}</span>
                  <p className="mb-2 text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#606060' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Split A: For servers ──────────────────────────────────────── */}
        <section className="flex flex-col sm:flex-row">
          <div className="relative min-h-[240px] w-full sm:min-h-[480px] sm:w-[60%]">
            <Image
              src="https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1200&q=80"
              alt="Bartender at work"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }} />
          </div>
          <div className="flex w-full flex-col justify-center px-8 py-14 sm:w-[40%] lg:px-16 lg:py-20" style={{ backgroundColor: '#080808' }}>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#404040' }}>
              For servers &amp; bartenders
            </p>
            <h2 className="mb-4 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              Your reputation.
              <br />
              Your rewards.
            </h2>
            <p className="mb-8 text-sm leading-relaxed" style={{ color: '#606060' }}>
              Your ratings live on the blockchain. Portable. Permanent. Yours forever — no matter where you work next.
            </p>
            <a
              href="/server-waitlist"
              className="w-full rounded-full bg-white px-6 py-3.5 text-center text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:w-fit"
            >
              Claim your profile →
            </a>
          </div>
        </section>

        {/* ── Split B: Feel the vibe ────────────────────────────────────── */}
        <section className="flex flex-col sm:flex-row-reverse">
          <div className="relative min-h-[240px] w-full sm:min-h-[480px] sm:w-[55%]">
            <Image
              src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1200&q=80"
              alt="Busy NYC bar"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} />
          </div>
          <div className="flex w-full flex-col justify-center px-8 py-14 sm:w-[45%] lg:px-16 lg:py-20" style={{ backgroundColor: '#080808' }}>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#404040' }}>
              Feel the vibe
            </p>
            <h2 className="mb-4 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              NYC is alive
              <br />
              tonight.
            </h2>
            <p className="mb-8 text-sm leading-relaxed" style={{ color: '#606060' }}>
              Updated in real time. Community reported. Location verified. See which venues are packed, live, or chill — right now.
            </p>
            <a
              href="/live"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:w-fit sm:justify-start"
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
              See what&apos;s live →
            </a>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── For servers callout ───────────────────────────────────────── */}
        <section className="px-6 py-20 text-center lg:px-24 lg:py-32" style={{ backgroundColor: '#080808' }}>
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              For servers &amp; bartenders
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Are you a server or bartender?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed" style={{ color: '#606060' }}>
              Your reputation belongs to you. Not your employer. Not Yelp. Claim your free profile and start earning $SERVE rewards for every great shift.
            </p>
            <a
              href="/server-waitlist"
              className="inline-block w-full rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:w-auto"
            >
              Claim your free profile →
            </a>
            <p className="mt-4 text-xs" style={{ color: '#404040' }}>Free forever. Takes 2 minutes.</p>
          </div>
        </section>

        <div className="border-t border-white/10" />

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="px-6 py-14 lg:px-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
            {/* Brand */}
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-white">Slate</p>
              <p className="max-w-xs text-xs leading-5" style={{ color: '#404040' }}>
                Discover the night. Follow the ones who make it.
              </p>
            </div>

            {/* Nav */}
            <nav className="flex flex-wrap gap-x-6 gap-y-3">
              {[
                { label: 'Live',            href: '/live' },
                { label: 'For Servers',     href: '/for-servers' },
                { label: 'For Restaurants', href: '/for-restaurants' },
                { label: 'Whitepaper',      href: '/whitepaper' },
                { label: 'How it Works',    href: '/how-it-works' },
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

            {/* Contact */}
            <div className="flex flex-col gap-2.5">
              <a
                href="https://twitter.com/slatenow"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-colors hover:text-white"
                style={{ color: '#606060' }}
              >
                @slatenow
              </a>
              <a
                href="mailto:team@slatenow.xyz"
                className="text-xs transition-colors hover:text-white"
                style={{ color: '#606060' }}
              >
                team@slatenow.xyz
              </a>
              <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: '#404040' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-2 w-2"><circle cx="12" cy="12" r="12" /></svg>
                Built on Solana
              </span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-xs" style={{ color: '#404040' }}>
              © 2026 Slate ·{' '}
              <a href="/privacy" className="transition-colors hover:text-white">Privacy Policy</a>
              {' '}·{' '}
              <a href="/terms" className="transition-colors hover:text-white">Terms of Service</a>
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
