import Navbar from '@/app/components/Navbar'

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-3xl px-8 py-16 lg:py-24">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-16">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#606060' }}>
            Technical Document
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            Slate Whitepaper
          </h1>
          <p className="mt-4 text-base" style={{ color: '#606060' }}>
            Version 1.0 — April 2026
          </p>
          <div className="mt-8">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download PDF
            </a>
          </div>
        </div>

        <div className="border-t border-white/10" />

        {/* ── Executive Summary ────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>01</p>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">Executive Summary</h2>
          <div className="space-y-4 text-base leading-8" style={{ color: '#C0C0C0' }}>
            <p>
              Slate is a decentralized application built on Solana that creates the first portable reputation system for hospitality workers. Servers and bartenders create verifiable on-chain profiles that follow them from employer to employer, accumulate ratings from real verified dining experiences, and automatically earn $SERVE token rewards for exceptional service.
            </p>
            <p>
              The hospitality industry employs over 15 million workers in the United States alone. Despite being the most critical factor in the dining experience, individual servers and bartenders have no infrastructure to build, own, or monetize their professional reputation. Slate changes that — permanently.
            </p>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── The Problem ─────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>02</p>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">The Problem</h2>
          <div className="space-y-4 text-base leading-8" style={{ color: '#C0C0C0' }}>
            <p>
              Every great server and bartender builds something invaluable over their career: loyal regulars, a personal reputation for excellence, and a following of guests who return specifically because of them. But today that value belongs to the restaurant — not the worker. When a server changes jobs their reviews stay on the restaurant&apos;s Yelp page. Their regulars have no way to find them. Their reputation resets to zero. They start over at every new employer as if their years of excellent service never happened.
            </p>
            <p>This creates three cascading problems:</p>
          </div>

          <div className="my-8 space-y-5">
            {[
              {
                label: 'For workers',
                body: 'No portable career credential. No way to monetize their individual excellence. No ownership of the relationships they build with guests over years of service.',
              },
              {
                label: 'For guests',
                body: 'No way to follow the people who actually make their dining experiences memorable. Forced to rate restaurants instead of the individuals who serve them. No way to find their favorite server or bartender when they move.',
              },
              {
                label: 'For restaurants',
                body: 'High turnover rates driven by workers who feel undervalued and unrecognized. No data on which staff members drive repeat visits and revenue. No competitive advantage in attracting top talent.',
              },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5">
                <p className="mb-1.5 text-sm font-semibold text-white">{item.label}</p>
                <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>{item.body}</p>
              </div>
            ))}
          </div>

          <p className="text-base leading-8" style={{ color: '#C0C0C0' }}>
            The existing solutions — OpenTable, Resy, Yelp — all rate the restaurant. Nobody rates the person. Nobody gives workers ownership of their professional identity.
          </p>
        </section>

        <div className="border-t border-white/10" />

        {/* ── The Solution ─────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>03</p>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">The Solution</h2>
          <div className="space-y-4 text-base leading-8" style={{ color: '#C0C0C0' }}>
            <p>
              Slate gives every server and bartender a portable on-chain profile stored as a Program Derived Address (PDA) on the Solana blockchain. This profile is permanent, immutable, and belongs entirely to the worker. No employer can take it away. No platform can delete it. It follows them from restaurant to restaurant for their entire career.
            </p>
          </div>

          <div className="my-8 space-y-6">
            {[
              {
                label: 'For servers and bartenders',
                items: [
                  'Claim a free profile in under 2 minutes',
                  'Every verified rating from a real dining experience is stored permanently on-chain',
                  'Guests follow them directly — not the restaurant',
                  'When they move to a new restaurant their followers get notified automatically',
                  'Top rated servers earn $SERVE token rewards weekly with no application or approval',
                  'Cash out directly to their bank account through Slate Pay',
                ],
              },
              {
                label: 'For guests',
                items: [
                  'Book tables at any Slate restaurant',
                  'Rate the server or bartender directly after a verified dining experience',
                  'Follow their favorites across every restaurant they ever work at',
                  'Get notified when a followed server moves to a new restaurant',
                  'Earn $SERVE rewards for sharing real time restaurant data',
                ],
              },
              {
                label: 'For restaurants',
                items: [
                  'Apply to join the Slate network',
                  'When a top rated server joins their team that server\'s followers automatically discover and book at their restaurant',
                  'Access staff performance analytics showing which team members drive the most bookings and repeat visits',
                  'Retain top talent by giving them a platform where their excellence is recognized and rewarded',
                ],
              },
            ].map(group => (
              <div key={group.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5">
                <p className="mb-4 text-sm font-semibold text-white">{group.label}</p>
                <ul className="space-y-2">
                  {group.items.map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-6" style={{ color: '#A0A0A0' }}>
                      <span className="mt-1 shrink-0 text-xs" style={{ color: '#606060' }}>—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── How Slate Works ──────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>04</p>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">How Slate Works</h2>

          <div className="space-y-8">
            {[
              {
                title: 'The Guest Journey',
                body: 'A guest visits a Slate restaurant and is served by a member of the team. After dining they open Slate and rate their server directly — verified by their booking or by scanning the server\'s unique QR code at the table. That rating is written permanently to the Solana blockchain. If the service was exceptional the guest follows that server. From that moment forward wherever that server works — across every restaurant in the Slate network — that guest can find them, book with them, and follow their career.',
              },
              {
                title: 'The Server Journey',
                body: 'A server claims their free Slate profile. They enter their name, current restaurant, and specialty. Their profile goes live immediately. As verified ratings accumulate their on-chain score builds. When their score reaches the top 20% of servers in their area they begin earning weekly $SERVE token rewards distributed automatically by smart contract. No application. No approval. No middleman. When they move to a new restaurant their entire profile history — every rating, every follower, every earned token — moves with them. Their reputation is theirs forever.',
              },
              {
                title: 'The QR Code System',
                body: 'Every server can activate a unique QR code at the start of their shift. Guests who dine with them scan it directly at the table. This creates a verified connection between guest and server without requiring the guest to have booked through Slate in advance. The QR code remains active for 8 hours covering a full shift including doubles.',
              },
            ].map(block => (
              <div key={block.title}>
                <h3 className="mb-3 text-base font-semibold text-white">{block.title}</h3>
                <p className="text-base leading-8" style={{ color: '#C0C0C0' }}>{block.body}</p>
              </div>
            ))}

            <div>
              <h3 className="mb-3 text-base font-semibold text-white">The Verification System</h3>
              <p className="mb-4 text-base leading-8" style={{ color: '#C0C0C0' }}>
                Slate uses a three layer verification system to ensure every rating comes from a genuine dining experience:
              </p>
              <div className="space-y-3">
                {[
                  { n: '1', label: 'Booking verification', desc: 'Guests who booked through Slate are automatically verified.' },
                  { n: '2', label: 'QR code verification', desc: "Guests who scan a server's active shift QR code are verified." },
                  { n: '3', label: 'GPS geofencing', desc: 'Guests must be physically within 300 meters of the restaurant to submit a rating.' },
                ].map(v => (
                  <div key={v.n} className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 font-mono text-[10px] text-white">
                      {v.n}
                    </span>
                    <p className="text-sm leading-6" style={{ color: '#A0A0A0' }}>
                      <span className="font-semibold text-white">{v.label} — </span>{v.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Technology ───────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>05</p>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">Technology</h2>
          <p className="mb-8 text-base leading-8" style={{ color: '#C0C0C0' }}>
            Slate is built on the Solana blockchain using the Anchor framework.
          </p>

          <h3 className="mb-5 text-base font-semibold text-white">Smart Contract Architecture</h3>
          <div className="space-y-4">
            {[
              {
                name: 'ServerProfile PDA',
                desc: 'Stores owner public key, name, current restaurant, total ratings, cumulative score, average score, follower count, and verification status.',
                seeds: "Seeds: [b'server-profile', owner.key()]",
              },
              {
                name: 'Rating PDA',
                desc: 'Stores rater public key, server public key, score (1–5), booking verification status, and comment. One rating per guest per server prevents duplicate submissions.',
                seeds: "Seeds: [b'rating', server_profile, rater]",
              },
              {
                name: 'FollowRequest PDA',
                desc: 'Stores requester public key, target server public key, and status (Pending / Approved / Blocked). Servers must approve follow requests. Servers can block any user at any time. Blocking only affects following — never ratings.',
                seeds: "Seeds: [b'follow', requester, server_profile]",
              },
              {
                name: '$SERVE Token Mint',
                desc: 'SPL token with fixed supply. Treasury PDA holds mint authority. Distribution controlled entirely by smart contract based on verified on-chain ratings data.',
                seeds: null,
              },
            ].map(pda => (
              <div key={pda.name} className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5">
                <p className="mb-2 font-mono text-sm font-semibold text-white">{pda.name}</p>
                <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>{pda.desc}</p>
                {pda.seeds && (
                  <p className="mt-3 font-mono text-xs" style={{ color: '#606060' }}>{pda.seeds}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-6">
            {[
              {
                title: 'Why Solana',
                body: "Solana's transaction fees of fractions of a penny make micro-interactions like individual ratings and weekly token distributions economically viable at scale. A rating costs less than $0.001 to write on-chain. Weekly $SERVE distributions to thousands of servers are feasible only on Solana. No other blockchain makes this consumer experience possible at the price point required for mainstream hospitality adoption.",
              },
              {
                title: 'Frontend',
                body: 'Next.js with TypeScript and Tailwind CSS. Privy embedded wallets abstract all crypto complexity from end users. Guests and servers sign up with email or Google — no seed phrases, no wallet downloads, no gas fees visible to the user. The blockchain runs silently in the background.',
              },
              {
                title: 'Live Product',
                body: 'Slate is live at slatenow.xyz. Smart contract deployed with real on-chain transactions processing successfully. Full user flows for guests, servers, and restaurants available publicly.',
              },
            ].map(block => (
              <div key={block.title}>
                <h3 className="mb-2 text-base font-semibold text-white">{block.title}</h3>
                <p className="text-base leading-8" style={{ color: '#C0C0C0' }}>{block.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── $SERVE Token ─────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>06</p>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">$SERVE Token</h2>
          <p className="mb-8 text-base leading-8" style={{ color: '#C0C0C0' }}>
            $SERVE is a fixed supply SPL token on Solana that rewards the best servers and bartenders in the hospitality industry.
          </p>

          {/* Supply */}
          <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: '#606060' }}>Total Supply</p>
            <p className="text-2xl font-bold text-white">100,000,000 $SERVE</p>
            <p className="mt-1 text-xs" style={{ color: '#606060' }}>Fixed forever</p>
          </div>

          {/* Allocation */}
          <h3 className="mb-4 text-base font-semibold text-white">Allocation</h3>
          <div className="mb-8 space-y-2">
            {[
              { pct: '35%', label: 'Server rewards', note: 'Vested over 6 years, emissions tied to platform revenue' },
              { pct: '20%', label: 'Ecosystem and liquidity', note: '10M for Raydium liquidity pool, 10M for grants and partnerships' },
              { pct: '20%', label: 'Treasury', note: 'Controlled by multisig, spent only through community governance' },
              { pct: '15%', label: 'Team and founder', note: '1 year cliff, 4 year linear vest' },
              { pct: '10%', label: 'Early community', note: 'Earned through verified activity — first 1,000 servers with 10+ verified ratings' },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
                <span className="w-10 shrink-0 font-mono text-sm font-bold text-white">{row.pct}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{row.label}</p>
                  <p className="text-xs leading-5" style={{ color: '#606060' }}>{row.note}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {[
              {
                title: 'How Servers Earn $SERVE',
                body: 'Every week the Slate smart contract calculates a performance score for every server on the platform. Score = Average Rating × Booking Volume × Repeat Guest Percentage. The top 20% of servers by score share that week\'s reward distribution from the treasury. Higher scores earn larger shares. Minimum 5 verified ratings required to qualify.',
              },
            ].map(block => (
              <div key={block.title}>
                <h3 className="mb-2 text-base font-semibold text-white">{block.title}</h3>
                <p className="text-base leading-8" style={{ color: '#C0C0C0' }}>{block.body}</p>
              </div>
            ))}
          </div>

          <div className="my-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5">
              <p className="mb-4 text-sm font-semibold text-white">Demand drivers</p>
              <ul className="space-y-2">
                {[
                  'Guests spend $SERVE for priority reservations with in-demand servers',
                  'Servers stake $SERVE to boost profile visibility in search',
                  'Every booking fee generates automatic buy pressure on $SERVE',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-5" style={{ color: '#A0A0A0' }}>
                    <span className="shrink-0" style={{ color: '#606060' }}>—</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5">
              <p className="mb-4 text-sm font-semibold text-white">Deflationary mechanics</p>
              <ul className="space-y-2">
                {[
                  'Every booking: 1% of fee value burned in $SERVE',
                  'Every profile boost purchase: 100% of $SERVE spent is burned',
                  'Every priority reservation: 50% of $SERVE spent is burned',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-5" style={{ color: '#A0A0A0' }}>
                    <span className="shrink-0" style={{ color: '#606060' }}>—</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            {[
              {
                title: 'Sustainability',
                body: '$SERVE emissions are tied entirely to real platform revenue — not to new token minting after the initial distribution. As bookings grow treasury grows. As treasury grows server rewards grow. The token is designed to appreciate in value as the platform scales not depreciate through inflation.',
              },
              {
                title: 'Cashout',
                body: 'Servers convert $SERVE to USDC through Slate Pay and receive direct bank transfers within 1–2 business days. No crypto knowledge required. The experience feels identical to direct deposit.',
              },
            ].map(block => (
              <div key={block.title}>
                <h3 className="mb-2 text-base font-semibold text-white">{block.title}</h3>
                <p className="text-base leading-8" style={{ color: '#C0C0C0' }}>{block.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Roadmap ──────────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>07</p>
          <h2 className="mb-8 text-2xl font-bold tracking-tight text-white sm:text-3xl">Roadmap</h2>

          <div className="space-y-5">
            {[
              {
                period: 'Q2 2026',
                label: 'Foundation',
                items: [
                  'Hackathon submission and community launch',
                  'Deploy to Solana devnet',
                  'Onboard 50 founding server profiles in NYC',
                  '3–5 restaurant partners in New York City',
                  '$SERVE reward system active on devnet',
                ],
              },
              {
                period: 'Q3 2026',
                label: 'NYC Launch',
                items: [
                  'Deploy to Solana mainnet',
                  '100 active server profiles across NYC',
                  '10 restaurant partners',
                  'Slate Pay bank transfer integration live',
                  '$SERVE rewards distributed on mainnet',
                ],
              },
              {
                period: 'Q4 2026',
                label: 'Growth',
                items: [
                  '250 active server profiles',
                  '25 restaurant partners',
                  'Real time restaurant intelligence feature launch',
                  'iOS and Android PWA launch',
                  'Expansion to one additional city',
                ],
              },
              {
                period: 'Q1–Q2 2027',
                label: 'Token Launch',
                items: [
                  '$SERVE token public launch on Raydium',
                  '500 active server profiles',
                  '50 restaurant partners',
                  '3 cities active',
                  'Slate debit card partnership launch',
                ],
              },
              {
                period: '2027–2028',
                label: 'National',
                items: [
                  '1,000+ active server profiles',
                  'National expansion across 10 US cities',
                  'Full restaurant scheduling integration',
                  'Native iOS and Android apps',
                  '$SERVE token on major exchanges',
                ],
              },
            ].map(phase => (
              <div key={phase.period} className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5">
                <div className="mb-4 flex items-baseline gap-3">
                  <span className="font-mono text-sm font-bold text-white">{phase.period}</span>
                  <span className="text-sm" style={{ color: '#606060' }}>— {phase.label}</span>
                </div>
                <ul className="space-y-1.5">
                  {phase.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-sm leading-6" style={{ color: '#A0A0A0' }}>
                      <span className="mt-1 shrink-0 text-xs" style={{ color: '#404040' }}>—</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Governance ───────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>08</p>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">The Slate Worker Council</h2>

          <div className="mb-8 space-y-4 text-base leading-8" style={{ color: '#C0C0C0' }}>
            <p>
              Slate is built for hospitality workers — and in Q1 2027 they will govern it.
            </p>
            <p>
              Every verified server and bartender with a Slate profile becomes a member of the Slate Worker Council — the first reputation-weighted governance system in hospitality.
            </p>
            <p>
              Unlike traditional DAOs where voting power is determined by token holdings — giving control to the wealthiest participants — the Slate Worker Council weights votes by reputation. The servers and bartenders who have actually built careers on Slate make the decisions that shape it.
            </p>
          </div>

          {/* Voting power tiers */}
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white">How voting power works</h3>
          <div className="mb-8 space-y-2">
            {[
              { tier: 'Bronze Council Member', condition: '10 verified ratings', votes: '1 vote' },
              { tier: 'Silver Council Member', condition: '50 verified ratings', votes: '3 votes' },
              { tier: 'Gold Council Member',   condition: '100 verified ratings', votes: '10 votes' },
              { tier: 'Platinum Council Member', condition: 'Top 1% in city', votes: '25 votes' },
            ].map(row => (
              <div key={row.tier} className="flex items-baseline gap-3 border-b border-white/[0.06] py-3">
                <span className="w-48 shrink-0 text-sm font-medium text-white">{row.tier}</span>
                <span className="flex-1 text-sm" style={{ color: '#A0A0A0' }}>{row.condition}</span>
                <span className="text-sm font-semibold text-white">{row.votes}</span>
              </div>
            ))}
            <p className="pt-2 text-sm leading-7" style={{ color: '#606060' }}>
              Plus 1 additional vote per 1,000 $SERVE held.
            </p>
          </div>

          {/* What the council votes on */}
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white">What the Worker Council votes on</h3>
          <div className="mb-8 space-y-2">
            {[
              'Which cities Slate expands to next',
              'New features to prioritize',
              '$SERVE reward distribution percentages',
              'Community guidelines and safety policies',
              'Treasury spending proposals',
              'Partnership and restaurant policy decisions',
            ].map(item => (
              <div key={item} className="flex items-start gap-2 py-1 text-sm leading-7" style={{ color: '#A0A0A0' }}>
                <span className="mt-1 shrink-0 text-xs" style={{ color: '#404040' }}>—</span>
                {item}
              </div>
            ))}
          </div>

          <div className="mb-10 rounded-xl border border-white/25 bg-white/[0.04] px-6 py-5">
            <p className="text-sm leading-7" style={{ color: '#C0C0C0' }}>
              The people who build their careers on Slate will shape its future. Not investors. Not the company. The workers.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#606060' }}>
              Launching Q1 2027 alongside mainnet governance infrastructure.
            </p>
          </div>

          {/* Community Suggestions */}
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white">Community Suggestions</h3>
          <div className="space-y-4 text-base leading-8" style={{ color: '#C0C0C0' }}>
            <p>
              Before formal governance launches every server and bartender can submit product suggestions directly through their Slate dashboard. Suggestions are publicly visible and other members can upvote them. The most upvoted suggestions get prioritized by the Slate team each month.
            </p>
            <p>
              This is how Slate gets built — by the people who use it every day.
            </p>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Business Model ───────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>09</p>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">Business Model</h2>

          <div className="mb-8 space-y-4 text-base leading-8" style={{ color: '#C0C0C0' }}>
            <p>
              Slate operates a four-stream revenue model that never charges servers or bartenders.
            </p>
          </div>

          {/* Free for servers callout */}
          <div className="mb-10 rounded-xl border border-white/25 bg-white/[0.04] px-6 py-5">
            <p className="mb-1 text-sm font-bold text-white">For servers and bartenders: Free forever.</p>
            <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>No subscriptions. No fees. No exceptions.</p>
          </div>

          {/* Four revenue streams */}
          <div className="mb-10 space-y-4">
            {[
              {
                stream: 'Stream 1',
                title: 'Restaurant Subscriptions',
                body: '$99/month for Verified Partner tier and $299/month for Premium — includes advanced analytics, scheduling tools, and Scheduling & Reservations. Predictable recurring revenue from restaurants that benefit from better staff retention and performance data.',
              },
              {
                stream: 'Stream 2',
                title: '$SERVE Token Ecosystem',
                body: 'Guests earn small amounts of $SERVE by leaving verified ratings and reporting live vibes. Servers earn the majority by delivering great service and building loyal followings. The token circulates naturally within the platform. No one needs to buy crypto — they earn it by participating.',
              },
              {
                stream: 'Stream 3',
                title: '2% Cashout Fee on Slate Pay',
                body: 'When servers convert their earned $SERVE into real money Slate takes a small 2% fee. Servers only pay when they actually receive money — fairer than most gig platforms.',
              },
              {
                stream: 'Stream 4',
                title: 'Anonymized Data Insights — Year 2–3 Vision',
                body: 'Long-term Slate will license aggregated anonymized trend data — vibe patterns, peak times, staff performance correlations — to real estate developers, hospitality publications, hotel chains, and tourism boards. No personal data is ever sold.',
              },
            ].map(item => (
              <div key={item.stream} className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5">
                <div className="mb-2 flex items-baseline gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#404040' }}>{item.stream}</span>
                  <span className="text-sm font-semibold text-white">{item.title}</span>
                </div>
                <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>{item.body}</p>
              </div>
            ))}
          </div>

          {/* One-liner summary */}
          <div className="rounded-xl border border-white/15 px-6 py-5">
            <p className="text-sm leading-7" style={{ color: '#C0C0C0' }}>
              &ldquo;We never charge the workers. We charge the venues who need them, capture a small fee when workers cash out their rewards, and long term we monetize the most valuable real-time hospitality dataset ever built — without touching a single piece of personal data.&rdquo;
            </p>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Team ─────────────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>10</p>
          <h2 className="mb-8 text-2xl font-bold tracking-tight text-white sm:text-3xl">Team</h2>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-base font-bold text-black">
                CR
              </div>
              <div>
                <p className="text-base font-semibold text-white">Chaz Rodriguez</p>
                <p className="text-xs" style={{ color: '#606060' }}>Founder</p>
              </div>
            </div>
            <p className="text-sm leading-7" style={{ color: '#A0A0A0' }}>
              NYC native and hospitality industry veteran. Built Slate from zero — no prior coding experience — in under one week using Solana, Anchor, and Next.js. The insight behind Slate came from years working directly in NYC hospitality and watching great servers and bartenders lose their reputation every time they changed jobs. Direct access to the NYC hospitality community provides an unfair advantage in user acquisition that no outside founder can replicate. Currently competing in the Solana Frontier Hackathon (April 6 — May 11, 2026) through Colosseum.
            </p>
          </div>
        </section>

        <div className="border-t border-white/10" />

        {/* ── Conclusion ───────────────────────────────────────────────────── */}
        <section className="py-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#606060' }}>11</p>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">Conclusion</h2>
          <div className="space-y-4 text-base leading-8" style={{ color: '#C0C0C0' }}>
            <p>
              The hospitality industry has never had infrastructure that puts workers first. Every platform — from OpenTable to Yelp to Blackbird — is built around the restaurant or the guest. The people who actually deliver the experience have been invisible.
            </p>
            <p>
              Slate changes that permanently. By giving servers and bartenders portable on-chain reputations, verified individual ratings, automatic token rewards, and a following that belongs to them — Slate creates something that has never existed in the history of hospitality: a career platform built for the people doing the work.
            </p>
            <p>
              The technology is ready. The market is ready. The workers are ready. Slate is built on Solana because only Solana makes this economically viable at scale. And it&apos;s built by someone who lived this problem — not someone who read about it in a market research report.
            </p>
          </div>

          <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-6">
            <div className="space-y-2 text-sm" style={{ color: '#A0A0A0' }}>
              <div className="flex items-center gap-3">
                <span style={{ color: '#606060' }}>Live at</span>
                <span className="font-mono text-white">slatenow.xyz</span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ color: '#606060' }}>GitHub</span>
                <span className="font-mono text-white">github.com/rchaz1990/serve-map</span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ color: '#606060' }}>Contact</span>
                <span className="font-mono text-white">team@slatenow.xyz</span>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
