// Server Component — no state or browser APIs needed.
// overlay=true: positioned absolute over a full-bleed hero (homepage).
// overlay=false (default): normal document flow for all other pages.

export default function Navbar({ overlay = false }: { overlay?: boolean }) {
  return (
    <header
      className={[
        'flex h-16 items-center justify-between px-8 lg:px-16',
        overlay ? 'absolute left-0 right-0 top-0 z-20' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Logo */}
      <a
        href="/"
        className="text-sm font-semibold uppercase tracking-[0.2em] text-white"
      >
        Slate
      </a>

      {/* Middle nav — hidden on small screens */}
      <nav className="hidden items-center gap-8 md:flex">
        <a
          href="/explore"
          className="text-xs font-medium text-white/50 transition-colors hover:text-white"
        >
          Explore
        </a>
        <a
          href="/pay"
          className="text-xs font-medium text-white/50 transition-colors hover:text-white"
        >
          Slate Pay
        </a>
        <a
          href="/servers/signup"
          className="text-xs font-medium text-white/50 transition-colors hover:text-white"
        >
          For Servers
        </a>
        <a
          href="/#how-it-works"
          className="text-xs font-medium text-white/50 transition-colors hover:text-white"
        >
          How it Works
        </a>
      </nav>

      {/* Right buttons */}
      <div className="flex items-center gap-3">
        <a
          href="/dashboard"
          className="text-xs font-medium text-white/50 transition-colors hover:text-white"
        >
          Dashboard
        </a>
        <a
          href="/login"
          className="rounded-full border border-white/30 px-5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white hover:text-white"
        >
          Sign In
        </a>
        <a
          href="/explore"
          className="rounded-full bg-white px-5 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-80"
        >
          Get Started
        </a>
      </div>
    </header>
  )
}
