import Image from 'next/image'
import Navbar from '@/app/components/Navbar'

const benefits = [
  {
    title: 'Your reputation, not theirs',
    description:
      'Ratings follow you when you change jobs. Your employer doesn\'t own your reviews — you do.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
      </svg>
    ),
  },
  {
    title: 'Get paid for excellence',
    description:
      'Top-rated servers earn $SERVE token rewards automatically every week. No application. No approval.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    title: 'Build your following',
    description:
      'Guests follow you directly. They reserve with you, not just the restaurant. Your regulars stay yours.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
  {
    title: 'Cash out easily',
    description:
      'Convert earnings to dollars directly in the app. Works like direct deposit. No crypto knowledge required.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
  },
]

const testimonials = [
  {
    quote: 'I moved restaurants and my regulars found me on Slate the same week.',
    name: 'James',
    role: 'Bartender, NYC',
    initials: 'JC',
  },
  {
    quote: 'Made an extra $200 last month just from $SERVE rewards.',
    name: 'Sofia',
    role: 'Server, Manhattan',
    initials: 'SR',
  },
  {
    quote: "My profile has more reviews than the restaurant's Yelp page.",
    name: 'Marcus',
    role: 'Fine Dining, NYC',
    initials: 'MJ',
  },
]

const steps = [
  {
    number: '01',
    title: 'Claim your free profile in 2 minutes',
    description: 'Name, current restaurant, and a short bio. That\'s all it takes to go live.',
  },
  {
    number: '02',
    title: 'Guests rate you directly after verified reservations',
    description: 'Every review is tied to a real reservation and written to the blockchain — permanent and tamper-proof.',
  },
  {
    number: '03',
    title: 'Earn $SERVE rewards automatically every week',
    description: 'Hit the top 5% and tokens start flowing. No paperwork, no manager approval.',
  },
]

const faqs = [
  {
    q: 'Is it free?',
    a: 'Yes, always free for servers and bartenders. Slate is free to join, free to maintain, and free forever.',
  },
  {
    q: 'What if I change restaurants?',
    a: 'Your profile and every rating follow you. Update your current venue in one tap — your history stays intact.',
  },
  {
    q: 'How do I get paid?',
    a: '$SERVE tokens cash out directly to your bank account via Slate Pay. Arriving Q3 2026.',
  },
  {
    q: 'Do my guests need crypto?',
    a: 'No. Guests never touch crypto. The blockchain is invisible to them — they just reserve and rate like normal.',
  },
]

export default function ForServersPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >

      {/* ── Early Access banner ───────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-black px-8 py-3 lg:px-16">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm">🎉</span>
            <div>
              <span className="text-xs font-semibold text-white">Early Access — Be one of the first servers on Slate</span>
              <span className="mx-2 text-white/20">·</span>
              <span className="text-xs" style={{ color: '#A0A0A0' }}>Founding members get bonus $SERVE rewards at launch</span>
            </div>
          </div>
          <a
            href="/servers/signup"
            className="shrink-0 rounded-full border border-white/25 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white"
          >
            Join now →
          </a>
        </div>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1574096079513-d8259312b785?w=1920&q=80"
          alt="Bartender at work"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />

        {/* Navbar sits on top of hero */}
        <div className="relative z-20">
          <Navbar overlay />
        </div>

        {/* Hero content — vertically centered */}
        <div className="relative z-10 flex flex-1 items-center">
          <div className="mx-auto w-full max-w-5xl px-8 py-24 lg:px-16">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: '#A0A0A0' }}>
              For servers &amp; bartenders
            </p>
            <h1 className="max-w-3xl text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.05] tracking-tight text-white">
              Your regulars follow you.
              <br />
              Now make it official.
            </h1>
            <p className="mt-8 max-w-xl text-base leading-relaxed" style={{ color: '#A0A0A0' }}>
              Build a portable reputation that follows you from restaurant to restaurant. Earn $SERVE rewards for every great review.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="/servers/signup"
                className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
              >
                Claim your free profile
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
            The platform built for the person behind the bar.
          </h2>

          <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2">
            {benefits.map(({ title, description, icon }) => (
              <div
                key={title}
                className="flex flex-col gap-4 p-8"
                style={{ backgroundColor: '#000000' }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white">
                  {icon}
                </div>
                <div>
                  <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10" />

      {/* ── Social proof ──────────────────────────────────────────────────── */}
      <section className="px-8 py-24 lg:px-16 lg:py-32" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
              Social proof
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Join 2,400+ servers already on Slate
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {testimonials.map(({ quote, name, role, initials }) => (
              <div
                key={name}
                className="flex flex-col justify-between rounded-2xl border border-white/10 p-7"
                style={{ backgroundColor: '#000000' }}
              >
                <p className="mb-8 text-sm leading-relaxed text-white">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{name}</p>
                    <p className="text-xs" style={{ color: '#A0A0A0' }}>{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10" />

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-8 py-24 lg:px-16 lg:py-32">
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
            How it works
          </p>
          <h2 className="mb-16 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Three steps. That&apos;s it.
          </h2>

          <div>
            {steps.map(({ number, title, description }, i) => (
              <div key={number}>
                <div className="flex gap-8 py-10 sm:gap-16">
                  <span
                    className="mt-0.5 w-8 shrink-0 text-xs font-semibold tabular-nums"
                    style={{ color: '#404040' }}
                  >
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
      <section className="px-8 py-24 lg:px-16 lg:py-32" style={{ backgroundColor: '#0a0a0a' }}>
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
      <section className="relative overflow-hidden px-8 py-32 lg:px-16">
        <Image
          src="https://images.unsplash.com/photo-1574096079513-d8259312b785?w=1920&q=80"
          alt="Bar background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/80" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Ready to own
            <br />
            your reputation?
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed" style={{ color: '#A0A0A0' }}>
            Free to join. Takes two minutes. Your reviews are yours forever.
          </p>
          <a
            href="/servers/signup"
            className="mt-10 inline-block rounded-full bg-white px-10 py-4 text-sm font-semibold text-black transition-opacity hover:opacity-80"
          >
            Claim your free profile
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
