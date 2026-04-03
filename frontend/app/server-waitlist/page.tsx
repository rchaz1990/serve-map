import Script from 'next/script'
import Navbar from '@/app/components/Navbar'

export default function ServerWaitlistPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}
    >
      <Script
        src="https://subscribe-forms.beehiiv.com/embed.js"
        strategy="lazyOnload"
      />

      <Navbar />
      <div className="border-t border-white/10" />

      <main className="mx-auto max-w-md px-8 py-16 lg:px-0">

        {/* Founding member badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] px-4 py-1.5">
            <span className="text-xs">✦</span>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white">Founding Member — Early Access</span>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Be a founding
            <br />
            member of Slate.
          </h1>
          <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed" style={{ color: '#A0A0A0' }}>
            Claim your portable profile when we launch. Founding members get bonus $SERVE rewards.
          </p>
        </div>

        {/* Beehiiv embed */}
        <iframe
          src="https://subscribe-forms.beehiiv.com/d331f392-5042-4085-aeb8-66ecc5468941"
          data-test-id="beehiiv-embed"
          frameBorder={0}
          scrolling="no"
          style={{
            width: '100%',
            maxWidth: '100%',
            height: '291px',
            margin: 0,
            borderRadius: 0,
            backgroundColor: 'transparent',
            boxShadow: 'none',
          }}
        />

        <p className="mt-6 text-center text-xs" style={{ color: '#606060' }}>
          Free forever for servers and bartenders.
        </p>

      </main>
    </div>
  )
}
