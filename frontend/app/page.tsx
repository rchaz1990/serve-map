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
      "Reserve your table and request your server in one step. Your preference is confirmed on-chain.",
  },
  {
    number: "03",
    title: "Leave a verified rating",
    description:
      "Post-visit, your rating is attached to the server's profile permanently — not the restaurant's Yelp page.",
  },
];

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
];

export default function Home() {
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

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="px-8 pb-32 pt-24 lg:px-16 lg:pb-40 lg:pt-36">
          <div className="mx-auto max-w-5xl">
            <h1
              className="text-[clamp(3rem,8vw,7rem)] font-bold leading-[1.0] tracking-tight text-white"
            >
              Your table.
              <br />
              Your server.
              <br />
              Your experience.
            </h1>

            <p className="mt-10 max-w-md text-base leading-relaxed" style={{ color: "#A0A0A0" }}>
              Slate lets you book a table and request the server who makes it worth coming back to — and rate them directly after.
            </p>

            <a
              href="/reserve"
              className="mt-10 inline-block rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-opacity hover:opacity-80"
            >
              Make a reservation
            </a>
          </div>
        </section>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

        {/* ── How it works ───────────────────────────────────────────── */}
        <section className="px-8 py-24 lg:px-16 lg:py-32">
          <div className="mx-auto max-w-5xl">
            <p className="mb-16 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#A0A0A0" }}>
              For guests
            </p>

            <div>
              {steps.map(({ number, title, description }, i) => (
                <div key={number}>
                  <div className="flex flex-col gap-3 py-10 sm:flex-row sm:items-start sm:gap-16">
                    <span className="w-12 shrink-0 text-xs font-medium" style={{ color: "#A0A0A0" }}>
                      {number}
                    </span>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-16">
                      <h3 className="w-52 shrink-0 text-base font-semibold text-white">
                        {title}
                      </h3>
                      <p className="max-w-md text-sm leading-relaxed" style={{ color: "#A0A0A0" }}>
                        {description}
                      </p>
                    </div>
                  </div>
                  {i < steps.length - 1 && <div className="border-t border-white/10" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="border-t border-white/10" />

        {/* ── For Servers ────────────────────────────────────────────── */}
        <section id="for-servers" className="px-8 py-24 lg:px-16 lg:py-32" style={{ backgroundColor: "#0a0a0a" }}>
          <div className="mx-auto max-w-5xl">
            <div className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#A0A0A0" }}>
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
                    <h3 className="w-52 shrink-0 text-base font-semibold text-white">
                      {title}
                    </h3>
                    <p className="max-w-md text-sm leading-relaxed" style={{ color: "#A0A0A0" }}>
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
