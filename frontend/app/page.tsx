import Image from 'next/image'
import Navbar from '@/app/components/Navbar'

const steps = [
  {
    number: "01",
    title: "Find your person",
    description:
      "Search servers and bartenders by name, restaurant, or rating. Follow the ones worth returning for.",
  },
  {
    number: "02",
    title: "Book directly",
    description:
      "Reserve your table in seconds. Next time — book with the same server wherever they work. Your loyalty follows the talent, not just the restaurant.",
  },
  {
    number: "03",
    title: "Leave a verified rating",
    description:
      "Post-visit, your rating is attached to the server's profile permanently — not the restaurant's Yelp page.",
  },
  {
    number: "04",
    title: "Follow your favorites",
    description:
      "Send follow requests — servers approve or block anyone at any time. Your safety and privacy are always in your control.",
  },
]

const serverPerks = [
  {
    title: "Portable profile",
    description:
      "Your ratings follow you from job to job. No employer owns your reputation.",
  },
  {
    title: "Individual ratings",
    description:
      "Guests rate you specifically — verified by booking. Every star is earned.",
  },
  {
    title: "$SERVE rewards",
    description:
      "Top-rated servers earn tokens automatically. No application. No approval.",
  },
  {
    title: "Your safety, always",
    description:
      "Guests send follow requests — you approve or block anyone, anytime. Your safety and privacy are always in your control.",
  },
]

export default function Home() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >

      <Navbar overlay />

      <main>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="relative flex min-h-screen items-end overflow-hidden">
          {/* Background photo */}
          <Image
            src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1920&q=80"
            alt="Moody upscale bar"
            fill
            priority
            className="object-cover"
          />
          {/* Dark overlay — 60% black so text stays fully legible */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Content — sits above the overlay */}
          <div className="relative z-10 w-full px-8 pb-24 lg:px-16 lg:pb-32">
            <div className="mx-auto max-w-5xl">
              <h1 className="text-[clamp(2.25rem,8vw,7rem)] font-bold leading-[1.0] tracking-tight text-white">
                Your table.
                <br />
                Your server.
                <br />
                Your experience.
              </h1>

              <p className="mt-10 max-w-md text-base leading-relaxed" style={{ color: '#A0A0A0' }}>
                Slate lets you book a table and request the server who makes it worth coming back to — and rate them directly after.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/book"
                  className="block rounded-full bg-white px-8 py-3.5 text-center text-sm font-semibold text-black transition-opacity hover:opacity-80"
                >
                  Make a reservation
                </a>
                <a
                  href="/explore"
                  className="block rounded-full border border-white/30 px-8 py-3.5 text-center text-sm font-medium text-white transition-colors hover:border-white"
                >
                  Explore Restaurants
                </a>
              </div>
              <p className="mt-4 text-xs" style={{ color: '#606060' }}>No wallet needed · Free to use</p>
            </div>
          </div>
        </section>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

        {/* ── App screenshots ────────────────────────────────────────── */}
        <section className="overflow-hidden px-8 py-20 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <p className="mb-10 text-center text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
              Built for the dining experience
            </p>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:justify-center">

              {/* ── Phone 1: Server Profile ── */}
              <div className="flex w-full max-w-[200px] flex-col items-center gap-3">
                <div
                  className="flex w-full flex-col overflow-hidden rounded-[2rem]"
                  style={{
                    aspectRatio: '9/19',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backgroundColor: '#0a0a0a',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* Status bar */}
                  <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
                    <span className="text-[8px] font-semibold text-white/30">9:41</span>
                    <div className="flex gap-1"><div className="h-1 w-3 rounded-sm bg-white/20" /><div className="h-1 w-1 rounded-sm bg-white/20" /></div>
                  </div>
                  {/* Content */}
                  <div className="flex flex-1 flex-col items-center px-4 pt-2 pb-4">
                    {/* Avatar */}
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">MJ</div>
                    <p className="text-[10px] font-bold text-white">Marcus Johnson</p>
                    <p className="mt-0.5 text-[8px]" style={{ color: '#F59E0B' }}>4.9 ★ · 127 ratings</p>
                    <p className="mt-0.5 text-[8px]" style={{ color: '#606060' }}>Carbone, West Village</p>
                    {/* Stat pills */}
                    <div className="mt-3 flex flex-wrap justify-center gap-1">
                      {['89 Followers', 'Top 1%', 'Cocktails'].map(s => (
                        <span key={s} className="rounded-full px-1.5 py-0.5 text-[7px] font-medium text-white/60" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>{s}</span>
                      ))}
                    </div>
                    {/* Spacer */}
                    <div className="flex-1" />
                    {/* CTA */}
                    <div className="w-full rounded-full bg-white py-1.5 text-center text-[8px] font-bold text-black">
                      Reserve with Marcus
                    </div>
                  </div>
                  {/* Home pill */}
                  <div className="shrink-0 pb-3 flex justify-center"><div className="h-0.5 w-12 rounded-full bg-white/20" /></div>
                </div>
                <p className="text-center text-[10px] leading-4" style={{ color: '#606060' }}>On-chain reputation · Verified ratings</p>
              </div>

              {/* ── Phone 2: Explore (raised) ── */}
              <div className="flex w-full max-w-[200px] flex-col items-center gap-3 sm:-translate-y-4">
                <div
                  className="flex w-full flex-col overflow-hidden rounded-[2rem]"
                  style={{
                    aspectRatio: '9/19',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backgroundColor: '#0a0a0a',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.6)',
                  }}
                >
                  <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
                    <span className="text-[8px] font-semibold text-white/30">9:41</span>
                    <div className="flex gap-1"><div className="h-1 w-3 rounded-sm bg-white/20" /><div className="h-1 w-1 rounded-sm bg-white/20" /></div>
                  </div>
                  <div className="flex flex-1 flex-col px-3 pt-1 pb-4">
                    <p className="mb-3 text-[10px] font-bold text-white">Find your restaurant</p>
                    {/* Search bar */}
                    <div className="mb-3 rounded-lg px-2 py-1.5 text-[8px]" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#606060' }}>Search restaurants…</div>
                    {/* Cards */}
                    {[
                      { name: 'Carbone', hood: 'West Village', rating: '4.9' },
                      { name: 'Don Angie', hood: 'Greenwich Village', rating: '4.8' },
                    ].map(r => (
                      <div key={r.name} className="mb-2 rounded-xl p-2.5" style={{ border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[9px] font-semibold text-white">{r.name}</p>
                            <p className="text-[7px]" style={{ color: '#606060' }}>{r.hood}</p>
                          </div>
                          <span className="text-[7px] font-semibold" style={{ color: '#F59E0B' }}>{r.rating} ★</span>
                        </div>
                        <p className="mt-1.5 text-[7px]" style={{ color: '#A0A0A0' }}>Staff Rating 4.9★</p>
                      </div>
                    ))}
                    <div className="flex-1" />
                  </div>
                  <div className="shrink-0 pb-3 flex justify-center"><div className="h-0.5 w-12 rounded-full bg-white/20" /></div>
                </div>
                <p className="text-center text-[10px] leading-4" style={{ color: '#606060' }}>Browse restaurants &amp; top servers</p>
              </div>

              {/* ── Phone 3: Rate ── */}
              <div className="flex w-full max-w-[200px] flex-col items-center gap-3">
                <div
                  className="flex w-full flex-col overflow-hidden rounded-[2rem]"
                  style={{
                    aspectRatio: '9/19',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backgroundColor: '#0a0a0a',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.6)',
                  }}
                >
                  <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
                    <span className="text-[8px] font-semibold text-white/30">9:41</span>
                    <div className="flex gap-1"><div className="h-1 w-3 rounded-sm bg-white/20" /><div className="h-1 w-1 rounded-sm bg-white/20" /></div>
                  </div>
                  <div className="flex flex-1 flex-col items-center px-4 pt-3 pb-4">
                    <p className="mb-1 text-center text-[10px] font-bold leading-tight text-white">How was your<br />experience?</p>
                    <p className="mb-4 text-[8px]" style={{ color: '#606060' }}>Marcus Johnson · Carbone</p>
                    {/* Stars */}
                    <div className="mb-4 flex gap-1">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className="text-sm" style={{ color: '#F59E0B' }}>★</span>
                      ))}
                    </div>
                    {/* Verified badge */}
                    <div className="mb-4 flex items-center gap-1 rounded-full px-2 py-1 text-[7px] font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                      <span>✓</span><span>Verified Visit</span>
                    </div>
                    <div className="flex-1" />
                    {/* Submit */}
                    <div className="w-full rounded-full bg-white py-1.5 text-center text-[8px] font-bold text-black">
                      Submit Rating
                    </div>
                  </div>
                  <div className="shrink-0 pb-3 flex justify-center"><div className="h-0.5 w-12 rounded-full bg-white/20" /></div>
                </div>
                <p className="text-center text-[10px] leading-4" style={{ color: '#606060' }}>GPS-verified · 30 seconds</p>
              </div>

            </div>
          </div>
        </section>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

        {/* ── How it works ───────────────────────────────────────────── */}
        <section className="px-8 py-24 lg:px-16 lg:py-32">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">

              {/* Steps — left column */}
              <div>
                <p className="mb-12 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
                  For guests
                </p>

                <div>
                  {steps.map(({ number, title, description }, i) => (
                    <div key={number}>
                      <div className="flex flex-col gap-3 py-8">
                        <span className="text-xs font-medium" style={{ color: '#A0A0A0' }}>
                          {number}
                        </span>
                        <div>
                          <h3 className="text-base font-semibold text-white">{title}</h3>
                          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
                            {description}
                          </p>
                        </div>
                      </div>
                      {i < steps.length - 1 && <div className="border-t border-white/10" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Image — right column */}
              <div className="relative hidden overflow-hidden lg:block" style={{ aspectRatio: '3/4' }}>
                <Image
                  src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80"
                  alt="Bartender crafting a cocktail"
                  fill
                  className="object-cover"
                />
              </div>

            </div>
          </div>
        </section>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

        {/* ── For Servers ────────────────────────────────────────────── */}
        <section id="for-servers" className="relative overflow-hidden px-8 py-24 lg:px-16 lg:py-32">
          {/* Background photo */}
          <Image
            src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1920&q=80"
            alt="Elegant restaurant interior"
            fill
            className="object-cover"
          />
          {/* Heavy overlay so white text on white interior stays readable */}
          <div className="absolute inset-0 bg-black/80" />

          {/* Content */}
          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
                  For servers
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                  Your reputation
                  <br />
                  belongs to you.
                </h2>
              </div>
              <a
                href="/servers/signup"
                className="shrink-0 self-start rounded-full border border-white/30 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:border-white sm:self-auto"
              >
                Create your profile →
              </a>
            </div>

            <div className="border-t border-white/10">
              {serverPerks.map(({ title, description }, i) => (
                <div key={title}>
                  <div className="flex flex-col gap-2 py-10 sm:flex-row sm:items-start sm:gap-16">
                    <h3 className="w-52 shrink-0 text-base font-semibold text-white">{title}</h3>
                    <p className="max-w-md text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
                      {description}
                    </p>
                  </div>
                  {i < serverPerks.length - 1 && <div className="border-t border-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="px-8 py-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Slate</span>
            <div className="flex flex-wrap items-center gap-3">
              {/* Built on Solana */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#A0A0A0' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
                  <circle cx="12" cy="12" r="12" />
                </svg>
                Built on Solana
              </span>
              {/* Twitter */}
              <a
                href="https://twitter.com/slatenow"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium transition-colors hover:text-white"
                style={{ color: '#606060' }}
              >
                @slatenow
              </a>
              {/* Pilot */}
              <span className="text-[10px]" style={{ color: '#404040' }}>NYC Pilot — April 2026</span>
            </div>
            <p className="text-xs" style={{ color: '#404040' }}>
              © {new Date().getFullYear()} Slate
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
