import Image from 'next/image'
import Navbar from '@/app/components/Navbar'

const benefits = [
  {
    title: 'Attract guests who book for your staff',
    description:
      'Slate guests choose restaurants based on who is working that night. Your best servers drive reservations.',
  },
  {
    title: 'Verified ratings for every table',
    description:
      'Every review is tied to a confirmed reservation — no anonymous, fake, or one-off reviews inflating your score.',
  },
  {
    title: 'Retain your top talent',
    description:
      'Servers with on-chain profiles and $SERVE earnings are more invested. Reduce turnover by rewarding excellence.',
  },
  {
    title: 'No crypto knowledge required',
    description:
      'The blockchain layer is invisible to your staff and guests. Slate works like any modern reservation platform.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Apply to list your restaurant',
    description: 'Fill out a short form and we\'ll reach out within 48 hours to get you set up.',
  },
  {
    number: '02',
    title: 'Your staff claims their profiles',
    description: 'Each server and bartender creates their own portable Slate profile — takes under two minutes.',
  },
  {
    number: '03',
    title: 'Guests reserve, rate, and return',
    description: 'Bookings flow through Slate. Post-visit ratings are verified, permanent, and tied to individual staff.',
  },
]

const faqs = [
  {
    q: 'How much does it cost?',
    a: 'Slate is free for restaurants during the early access period. Pricing will be announced before general availability.',
  },
  {
    q: 'Does my staff need to do anything?',
    a: 'Each server creates a free Slate profile in about two minutes. After that, everything is automatic.',
  },
  {
    q: 'What happens to our existing reservation system?',
    a: 'Slate complements your existing setup. We handle the server-specific reservation and rating layer on top.',
  },
  {
    q: 'Is this only for fine dining?',
    a: 'No — any restaurant with table service can benefit. We started with fine dining but the platform works for any level.',
  },
]

export default function ForRestaurantsPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1920&q=80"
          alt="Elegant restaurant interior"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/75" />

        <div className="relative z-20">
          <Navbar overlay />
        </div>

        <div className="relative z-10 flex flex-1 items-center">
          <div className="mx-auto w-full max-w-5xl px-8 py-24 lg:px-16">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#A0A0A0' }}>
              For restaurants
            </p>
            <h1 className="max-w-3xl text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.05] tracking-tight text-white">
              Your best servers
              <br />
              fill your tables.
            </h1>
            <p className="mt-8 max-w-xl text-base leading-relaxed" style={{ color: '#A0A0A0' }}>
              Slate lets guests reserve a table and request the server who makes it worth coming back to — with verified on-chain ratings that protect your restaurant&apos;s reputation.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="/waitlist"
                className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
              >
                List your restaurant
              </a>
              <a
                href="#how-it-works"
                className="rounded-full border border-white/30 px-8 py-3.5 text-sm font-medium text-white transition-colors hover:border-white"
              >
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Slate ─────────────────────────────────────────────────────── */}
      <section className="px-8 py-24 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
            Why Slate
          </p>
          <h2 className="mb-16 max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Reservations tied to the people who make them memorable.
          </h2>

          <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2">
            {benefits.map(({ title, description }) => (
              <div
                key={title}
                className="flex flex-col gap-3 p-8"
                style={{ backgroundColor: '#000000' }}
              >
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10" />

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-8 py-24 lg:px-16 lg:py-32" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
            How it works
          </p>
          <h2 className="mb-16 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Live in three steps.
          </h2>

          <div>
            {steps.map(({ number, title, description }, i) => (
              <div key={number}>
                <div className="flex gap-8 py-10 sm:gap-16">
                  <span className="mt-0.5 w-8 shrink-0 text-xs font-semibold tabular-nums" style={{ color: '#404040' }}>
                    {number}
                  </span>
                  <div>
                    <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{description}</p>
                  </div>
                </div>
                {i < steps.length - 1 && <div className="border-t border-white/10" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10" />

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="px-8 py-24 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
            FAQ
          </p>
          <h2 className="mb-16 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Common questions.
          </h2>

          <div>
            {faqs.map(({ q, a }, i) => (
              <div key={q}>
                <div className="py-8">
                  <h3 className="mb-3 text-base font-semibold text-white">{q}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{a}</p>
                </div>
                {i < faqs.length - 1 && <div className="border-t border-white/10" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10" />

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-8 py-32 lg:px-16" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Ready to get
            <br />
            your restaurant listed?
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed" style={{ color: '#A0A0A0' }}>
            Apply now and we&apos;ll reach out within 48 hours. Free during early access.
          </p>
          <a
            href="/waitlist"
            className="mt-10 inline-block rounded-full bg-white px-10 py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80"
          >
            Get started free
          </a>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between border-t border-white/10 px-8 py-8 lg:px-16">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Slate</span>
        <p className="text-xs" style={{ color: '#A0A0A0' }}>
          © {new Date().getFullYear()} Slate
        </p>
      </footer>

    </div>
  )
}
