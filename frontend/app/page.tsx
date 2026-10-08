import Image from 'next/image'
import Navbar from '@/app/components/Navbar'
import { MotionSection } from '@/app/components/motion'

const MARQUEE_CSS = `
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.marquee-track { animation: marquee 28s linear infinite; }
`

const MARQUEE_ITEMS = [
  "Your service · Your reputation",
  "Rate the person, not the place",
  "Follow the talent",
  "Wherever you work",
  "Built for hospitality workers",
  "Free for servers & bartenders",
  "NYC tonight",
  "Your service record",
]

export default function Home() {
  return (
    <div className="slate-page overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: MARQUEE_CSS }} />
      <Navbar overlay />

      <main>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <MotionSection immediate className="relative flex min-h-screen flex-col items-start justify-center px-6 lg:px-24">
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
            <p className="slate-eyebrow mb-6">Now live in NYC</p>
            <h1 className="slate-title mb-5 text-5xl leading-[1.0] sm:text-6xl lg:text-8xl">
              Your night
              <br />
              starts here.
            </h1>
            <p className="mb-4 max-w-xl text-lg font-medium text-white/90 sm:text-xl lg:text-2xl">
              Your service. Your reputation. Wherever you work.
            </p>
            <p className="mb-10 max-w-xl text-sm leading-relaxed sm:text-base slate-muted">
              Portable worker profiles, guest ratings, and Slate Points — free for every hospitality worker.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/servers/signup"
                className="slate-btn slate-btn-primary slate-btn-lg w-full sm:w-auto"
              >
                I work in hospitality
              </a>
              <a
                href="/login?mode=signup"
                className="slate-btn slate-btn-ghost slate-btn-lg w-full sm:w-auto"
              >
                I&apos;m a guest
              </a>
            </div>
          </div>
        </MotionSection>

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
        <MotionSection className="px-6 py-16 lg:px-24 lg:py-28">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                {
                  n: '01',
                  label: 'FEEL THE VIBE',
                  body: 'See which venues are electric tonight — reported by guests who are there.',
                },
                {
                  n: '02',
                  label: 'RATE THE PERSON',
                  body: 'Scan your server\'s QR code after great service and rate them in 30 seconds. Not the restaurant — the individual.',
                },
                {
                  n: '03',
                  label: 'FOLLOW THE TALENT',
                  body: 'Your favorite bartender moves spots. Follow them, and know when they\'re working — wherever that is.',
                },
              ].map(item => (
                <div key={item.n} className="relative overflow-hidden px-0 py-10 sm:px-10 sm:py-8 first:pl-0 last:pr-0">
                  {/* Watermark number */}
                  <span
                    className="pointer-events-none absolute right-2 top-0 select-none font-bold leading-none text-white sm:right-4"
                    style={{ fontSize: 'clamp(5rem, 10vw, 8rem)', opacity: 0.04 }}
                  >
                    {item.n}
                  </span>
                  {/* Label */}
                  <p className="mb-4 text-[10px] font-semibold tracking-[0.22em] text-white">
                    {item.label}
                  </p>
                  {/* Rule */}
                  <div className="mb-5 h-px w-8 bg-white" />
                  {/* Body */}
                  <p className="text-sm leading-7" style={{ color: '#808080' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </MotionSection>

        {/* ── Split A: For servers ──────────────────────────────────────── */}
        <MotionSection className="flex flex-col sm:flex-row">
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
              Your reputation shouldn&apos;t reset when you change jobs. Build a service record that follows your career.
            </p>
            <a
              href="/servers/signup"
              className="w-full rounded-full bg-white px-6 py-3.5 text-center text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:w-fit"
            >
              Claim your profile →
            </a>
          </div>
        </MotionSection>

        {/* ── Split B: Feel the vibe ────────────────────────────────────── */}
        <MotionSection className="flex flex-col sm:flex-row-reverse">
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
              Reported by guests on the ground. See which venues are packed, live, or chill tonight.
            </p>
            <a
              href="/live"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:w-fit sm:justify-start"
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
              See what&apos;s live →
            </a>
          </div>
        </MotionSection>

        <div className="border-t border-white/10" />

        {/* ── For servers callout ───────────────────────────────────────── */}
        <MotionSection className="px-6 py-20 text-center lg:px-24 lg:py-32" style={{ backgroundColor: '#080808' }}>
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              For servers &amp; bartenders
            </p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Are you a server or bartender?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed" style={{ color: '#606060' }}>
              Your reputation should belong to you — not your employer, not a review site. Claim your free profile and earn Slate Points every time a guest rates your service.
            </p>
            <a
              href="/servers/signup"
              className="inline-block w-full rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80 sm:w-auto"
            >
              Claim your free profile →
            </a>
            <p className="mt-4 text-xs" style={{ color: '#404040' }}>Free forever. Takes 2 minutes.</p>
            <p className="mt-3 text-xs" style={{ color: '#404040' }}>
              Choose whether follows need your approval. Block anyone at any time. You are always in control.
            </p>
          </div>
        </MotionSection>

        <div className="border-t border-white/10" />

        {/* ── How $SERVE Works ─────────────────────────────────────────── */}
        <MotionSection className="px-6 py-20 lg:px-24 lg:py-28" style={{ backgroundColor: '#050505' }}>
          <div className="mx-auto max-w-4xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#404040' }}>
              Where Slate is going
            </p>
            <h2 className="mb-8 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              The value you create should come back to you.
            </h2>
            <p className="mb-6 max-w-2xl text-base leading-8" style={{ color: '#C0C0C0' }}>
              Slate is building a future where hospitality workers own their professional reputation, carry it wherever they work, and participate in the value they create. It starts with a service record and Slate Points today. No crypto knowledge required.
            </p>
            <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-3">
              {[
                { label: 'Today', body: 'Every guest rating earns you Slate Points and builds a reputation score that never resets.' },
                { label: 'Planned', body: '$SERVE — a reward layer for the workers who create value in hospitality. Not launched yet.' },
                { label: 'The vision', body: 'A network members help shape — built on Solana where ownership and portability matter.' },
              ].map(item => (
                <div key={item.label} className="px-8 py-8" style={{ backgroundColor: '#050505' }}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white">{item.label}</p>
                  <div className="mb-4 h-px w-6 bg-white/30" />
                  <p className="text-sm leading-7" style={{ color: '#808080' }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </MotionSection>

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
                href="https://x.com/slate_xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-colors hover:text-white"
                style={{ color: '#606060' }}
              >
                @slate_xyz
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
                Building on Solana
              </span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="mb-4 text-xs leading-6" style={{ color: '#404040' }}>
              <span className="font-semibold" style={{ color: '#606060' }}>When does $SERVE launch?</span>
              {' '}Not yet — $SERVE launches only after Slate hits real traction milestones. Slate Points are not a token and have no cash value. We&apos;ll share full details before anything launches.
            </p>
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
