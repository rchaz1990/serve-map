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
      "Reserve your table in seconds. Next time — book with the same server wherever they work. Your loyalty follows the talent, not just the restaurant. Next time? Book with them again — wherever they work.",
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
        <section className="relative flex min-h-screen flex-col justify-end overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1920&q=80"
            alt="Moody upscale bar"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />

          {/* Spacer below the 64px navbar */}
          <div className="relative z-10 h-20 shrink-0" />

          {/* Content */}
          <div className="relative z-10 w-full px-6 pb-16 sm:px-8 sm:pb-24 lg:px-16 lg:pb-32">
            <div className="mx-auto max-w-5xl">
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[clamp(2rem,5.5vw,4.5rem)]">
                Your table.
                <br />
                Your server.
                <br />
                Your experience.
              </h1>

              <p className="mt-6 max-w-md text-sm leading-relaxed sm:mt-10 sm:text-base" style={{ color: '#A0A0A0' }}>
                Slate lets you book a table and request the server who makes it worth coming back to — and rate them directly after.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:mt-10 sm:flex-row">
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

        {/* ── Three pillars — desktop only ───────────────────────────── */}
        <section className="hidden lg:block px-8 py-16 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                    </svg>
                  ),
                  heading: 'Rate the person',
                  sub: 'Not just the restaurant',
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                  ),
                  heading: 'Follow anywhere',
                  sub: 'They move, you know',
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                    </svg>
                  ),
                  heading: 'Earn $SERVE',
                  sub: 'Great service pays',
                },
              ].map(item => (
                <div
                  key={item.heading}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-7"
                >
                  {item.icon}
                  <div>
                    <p className="text-sm font-semibold text-white">{item.heading}</p>
                    <p className="mt-1 text-xs" style={{ color: '#606060' }}>{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Divider (desktop only, above screenshots) ──────────────── */}
        <div className="hidden lg:block border-t border-white/10" />

        {/* ── App screenshots — desktop only ─────────────────────────── */}
        <section className="hidden lg:block overflow-hidden px-8 py-20 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <p className="mb-10 text-center text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
              Built for the dining experience
            </p>
            <div className="flex items-end justify-center gap-6">

              {/* Phone 1: Server Profile */}
              <div className="flex w-full max-w-[200px] flex-col items-center gap-3">
                <div
                  className="flex w-full flex-col overflow-hidden rounded-[2rem]"
                  style={{ aspectRatio: '9/19', border: '1px solid rgba(255,255,255,0.18)', backgroundColor: '#0a0a0a', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.6)' }}
                >
                  <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
                    <span className="text-[8px] font-semibold text-white/30">9:41</span>
                    <div className="flex gap-1"><div className="h-1 w-3 rounded-sm bg-white/20" /><div className="h-1 w-1 rounded-sm bg-white/20" /></div>
                  </div>
                  <div className="flex flex-1 flex-col items-center px-4 pt-2 pb-4">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">MJ</div>
                    <p className="text-[10px] font-bold text-white">Marcus Johnson</p>
                    <p className="mt-0.5 text-[8px]" style={{ color: '#F59E0B' }}>4.9 ★ · 127 ratings</p>
                    <p className="mt-0.5 text-[8px]" style={{ color: '#606060' }}>Carbone, West Village</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-1">
                      {['89 Followers', 'Top 1%', 'Cocktails'].map(s => (
                        <span key={s} className="rounded-full px-1.5 py-0.5 text-[7px] font-medium text-white/60" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>{s}</span>
                      ))}
                    </div>
                    <div className="flex-1" />
                    <div className="w-full rounded-full bg-white py-1.5 text-center text-[8px] font-bold text-black">Reserve with Marcus</div>
                  </div>
                  <div className="shrink-0 pb-3 flex justify-center"><div className="h-0.5 w-12 rounded-full bg-white/20" /></div>
                </div>
                <p className="text-center text-[10px] leading-4" style={{ color: '#606060' }}>On-chain reputation · Verified ratings</p>
              </div>

              {/* Phone 2: Explore (raised) */}
              <div className="flex w-full max-w-[200px] flex-col items-center gap-3 -translate-y-4">
                <div
                  className="flex w-full flex-col overflow-hidden rounded-[2rem]"
                  style={{ aspectRatio: '9/19', border: '1px solid rgba(255,255,255,0.18)', backgroundColor: '#0a0a0a', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.6)' }}
                >
                  <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
                    <span className="text-[8px] font-semibold text-white/30">9:41</span>
                    <div className="flex gap-1"><div className="h-1 w-3 rounded-sm bg-white/20" /><div className="h-1 w-1 rounded-sm bg-white/20" /></div>
                  </div>
                  <div className="flex flex-1 flex-col px-3 pt-1 pb-4">
                    <p className="mb-3 text-[10px] font-bold text-white">Find your restaurant</p>
                    <div className="mb-3 rounded-lg px-2 py-1.5 text-[8px]" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#606060' }}>Search restaurants…</div>
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

              {/* Phone 3: Rate */}
              <div className="flex w-full max-w-[200px] flex-col items-center gap-3">
                <div
                  className="flex w-full flex-col overflow-hidden rounded-[2rem]"
                  style={{ aspectRatio: '9/19', border: '1px solid rgba(255,255,255,0.18)', backgroundColor: '#0a0a0a', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.6)' }}
                >
                  <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
                    <span className="text-[8px] font-semibold text-white/30">9:41</span>
                    <div className="flex gap-1"><div className="h-1 w-3 rounded-sm bg-white/20" /><div className="h-1 w-1 rounded-sm bg-white/20" /></div>
                  </div>
                  <div className="flex flex-1 flex-col items-center px-4 pt-3 pb-4">
                    <p className="mb-1 text-center text-[10px] font-bold leading-tight text-white">How was your<br />experience?</p>
                    <p className="mb-4 text-[8px]" style={{ color: '#606060' }}>Marcus Johnson · Carbone</p>
                    <div className="mb-4 flex gap-1">
                      {[1,2,3,4,5].map(s => <span key={s} className="text-sm" style={{ color: '#F59E0B' }}>★</span>)}
                    </div>
                    <div className="mb-4 flex items-center gap-1 rounded-full px-2 py-1 text-[7px] font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                      <span>✓</span><span>Verified Visit</span>
                    </div>
                    <div className="flex-1" />
                    <div className="w-full rounded-full bg-white py-1.5 text-center text-[8px] font-bold text-black">Submit Rating</div>
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
        <section className="px-6 py-14 sm:px-8 sm:py-24 lg:px-16 lg:py-32">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-24">

              {/* Steps */}
              <div>
                <p className="mb-8 text-xs font-semibold uppercase tracking-[0.2em] sm:mb-12" style={{ color: '#A0A0A0' }}>
                  For guests
                </p>
                <div>
                  {steps.map(({ number, title, description }, i) => (
                    <div key={number}>
                      <div className="flex flex-col gap-2 py-6 sm:py-8">
                        <span className="text-xs font-medium" style={{ color: '#A0A0A0' }}>{number}</span>
                        <div>
                          <h3 className="text-sm font-semibold text-white sm:text-base">{title}</h3>
                          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{description}</p>
                        </div>
                      </div>
                      {i < steps.length - 1 && <div className="border-t border-white/10" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bartender image — desktop only */}
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
        <section id="for-servers" className="relative overflow-hidden px-6 py-14 sm:px-8 sm:py-24 lg:px-16 lg:py-32">
          <Image
            src="https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=1920&q=80"
            alt="Elegant restaurant interior"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/80" />

          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="mb-10 flex flex-col gap-5 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] sm:mb-4" style={{ color: '#A0A0A0' }}>
                  For servers
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-5xl">
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
                  <div className="flex flex-col gap-2 py-6 sm:flex-row sm:items-start sm:gap-16 sm:py-10">
                    <h3 className="w-52 shrink-0 text-sm font-semibold text-white sm:text-base">{title}</h3>
                    <p className="max-w-md text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>{description}</p>
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
      <footer className="px-6 py-8 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Slate</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#A0A0A0' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5"><circle cx="12" cy="12" r="12" /></svg>
                Built on Solana
              </span>
              <a
                href="https://twitter.com/slatenow"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium transition-colors hover:text-white"
                style={{ color: '#606060' }}
              >
                @slatenow
              </a>
              <span className="text-[10px]" style={{ color: '#404040' }}>NYC Pilot — April 2026</span>
            </div>
            <p className="text-xs" style={{ color: '#404040' }}>© {new Date().getFullYear()} Slate</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
