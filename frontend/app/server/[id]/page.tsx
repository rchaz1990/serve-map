// Demo data — in production this would be fetched by `id` from the chain.
const profile = {
  id: "marcus-johnson",
  initials: "MJ",
  name: "Marcus Johnson",
  role: "Head Bartender",
  restaurant: "Eleven Madison Park",
  location: "New York, NY",
  rating: 4.9,
  totalRatings: 127,
  followers: 89,
  totalBookings: 312,
  yearsExperience: 7,
  repeatGuestPct: 78,
  serveTokens: "2,450",
  bio: "Seven years behind the bar and at the table. Known for remembering names, preferences, and making every reservation feel like a regular's.",
};

const reviews = [
  {
    guest: "Sarah K.",
    rating: 5,
    date: "March 12, 2025",
    comment:
      "Marcus remembered my dietary restrictions from a visit six months prior — without me saying a word. That level of attention is rare anywhere, let alone at this scale.",
  },
  {
    guest: "David L.",
    rating: 5,
    date: "March 3, 2025",
    comment:
      "Effortless pacing, genuinely warm without being performative. He made our anniversary dinner feel personal. Already requested him for our next visit.",
  },
  {
    guest: "Rachel M.",
    rating: 4,
    date: "February 22, 2025",
    comment:
      "Attentive without hovering. Knew when to engage and when to give us space. The cocktail recommendations were exactly right.",
  },
];

const career = [
  {
    restaurant: "Eleven Madison Park",
    location: "New York, NY",
    role: "Head Bartender",
    period: "Jan 2023 – Present",
    current: true,
  },
  {
    restaurant: "Le Bernardin",
    location: "New York, NY",
    role: "Senior Server",
    period: "Aug 2020 – Dec 2022",
    current: false,
  },
  {
    restaurant: "Nobu Fifty Seven",
    location: "New York, NY",
    role: "Server",
    period: "Mar 2018 – Jul 2020",
    current: false,
  },
];

const stats = [
  { label: "Avg. rating", value: `${profile.rating}` },
  { label: "Total bookings", value: profile.totalBookings.toLocaleString() },
  { label: "Years experience", value: `${profile.yearsExperience}` },
  { label: "Repeat guests", value: `${profile.repeatGuestPct}%` },
];

export default async function ServerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // `id` available for future data fetching
  const { id: _id } = await params;

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: "#000000", fontFamily: "var(--font-geist-sans)" }}
    >

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header className="flex h-16 items-center justify-between px-8 lg:px-16">
        <a
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-white"
        >
          Slate
        </a>
        <nav className="flex items-center gap-3">
          <a
            href="/login"
            className="rounded-full border border-white/30 px-5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white hover:text-white"
          >
            Log in
          </a>
          <a
            href="/signup"
            className="rounded-full bg-white px-5 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-80"
          >
            Sign up
          </a>
        </nav>
      </header>

      <main>

        {/* ── Profile Header ─────────────────────────────────────────── */}
        <section className="px-8 pb-16 pt-16 lg:px-16 lg:pt-20">
          <div className="mx-auto max-w-5xl">

            {/* Avatar + name block */}
            <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-12">

              {/* Avatar */}
              <div
                className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-bold text-black"
                aria-label={`${profile.name} avatar`}
              >
                {profile.initials}
              </div>

              {/* Identity */}
              <div className="flex flex-col gap-3">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    {profile.name}
                  </h1>
                  <p className="mt-1 text-sm" style={{ color: "#A0A0A0" }}>
                    {profile.role} · {profile.restaurant} · {profile.location}
                  </p>
                </div>

                {/* Rating */}
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold text-white">
                    {profile.rating} ★
                  </span>
                  <span className="text-sm" style={{ color: "#A0A0A0" }}>
                    {profile.totalRatings} ratings
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "#A0A0A0" }}
                    aria-hidden
                  >
                    ·
                  </span>
                  <span className="text-sm" style={{ color: "#A0A0A0" }}>
                    {profile.followers} followers
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-2 flex flex-wrap gap-3">
                  <a
                    href={`/reserve?server=${profile.id}`}
                    className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
                  >
                    Reserve with Marcus
                  </a>
                  <a
                    href={`/follow?server=${profile.id}`}
                    className="rounded-full border border-white/30 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:border-white"
                  >
                    Follow
                  </a>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="mt-10 max-w-2xl text-sm leading-relaxed" style={{ color: "#A0A0A0" }}>
              {profile.bio}
            </p>
          </div>
        </section>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

        {/* ── Stats Row ──────────────────────────────────────────────── */}
        <section className="px-8 py-12 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
              {stats.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 px-6 py-8 first:pl-0"
                  style={{ backgroundColor: "#000000" }}
                >
                  <span className="text-3xl font-bold text-white">{value}</span>
                  <span className="text-xs uppercase tracking-widest" style={{ color: "#A0A0A0" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

        {/* ── $SERVE Rewards ─────────────────────────────────────────── */}
        <section className="px-8 py-12 lg:px-16" style={{ backgroundColor: "#0a0a0a" }}>
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {/* Badge icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Top Rated Server — $SERVE Rewards Active</p>
                  <p className="text-xs" style={{ color: "#A0A0A0" }}>
                    Marcus is in the top 5% of servers on Slate and earns automatic token rewards.
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-white">{profile.serveTokens}</p>
                <p className="text-xs uppercase tracking-widest" style={{ color: "#A0A0A0" }}>$SERVE earned</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

        {/* ── Recent Reviews ─────────────────────────────────────────── */}
        <section className="px-8 py-16 lg:px-16 lg:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="mb-12 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#A0A0A0" }}>
              Recent reviews
            </p>

            <div>
              {reviews.map(({ guest, rating, date, comment }, i) => (
                <div key={i}>
                  <div className="py-10">
                    {/* Review header */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-white">{guest}</span>
                        <span className="text-xs" style={{ color: "#A0A0A0" }}>
                          {"★".repeat(rating)}{"☆".repeat(5 - rating)}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: "#A0A0A0" }}>{date}</span>
                    </div>
                    {/* Comment */}
                    <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "#A0A0A0" }}>
                      &ldquo;{comment}&rdquo;
                    </p>
                  </div>
                  {i < reviews.length - 1 && <div className="border-t border-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

        {/* ── Career History ─────────────────────────────────────────── */}
        <section className="px-8 py-16 lg:px-16 lg:py-24" style={{ backgroundColor: "#0a0a0a" }}>
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 flex items-end justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#A0A0A0" }}>
                Career history
              </p>
              <p className="text-xs" style={{ color: "#A0A0A0" }}>
                Profile is portable · verified on-chain
              </p>
            </div>

            <div>
              {career.map(({ restaurant, location, role, period, current }, i) => (
                <div key={i}>
                  <div className="flex flex-col gap-1 py-8 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-semibold text-white">{restaurant}</span>
                        {current && (
                          <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-xs" style={{ color: "#A0A0A0" }}>
                        {role} · {location}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums" style={{ color: "#A0A0A0" }}>{period}</span>
                  </div>
                  {i < career.length - 1 && <div className="border-t border-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between px-8 py-8 lg:px-16">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
          Slate
        </span>
        <p className="text-xs" style={{ color: "#A0A0A0" }}>
          © {new Date().getFullYear()} Slate
        </p>
      </footer>

    </div>
  );
}
