import Navbar from '@/app/components/Navbar'

// This page previously showed a sample balance, a USD conversion and bank payouts.
// None of that exists. Until there is something real, it says so plainly.
export default function PayPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#000000', fontFamily: 'var(--font-geist-sans)' }}>
      <Navbar />
      <div className="border-t border-white/10" />
      <main className="mx-auto max-w-lg px-6 py-16 lg:py-24">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#A0A0A0' }}>
          For servers & bartenders
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Slate Pay</h1>
        <div className="mt-8 rounded-2xl border border-white/10 p-8" style={{ backgroundColor: '#0a0a0a' }}>
          <h2 className="text-xl font-bold text-white">Not available.</h2>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
            Slate does not pay out money or tokens today. Slate Points are a record of recognition — they have no cash
            value and can&apos;t be exchanged. A reward layer for workers is something we&apos;d like to build, but it
            isn&apos;t guaranteed. If that changes, we&apos;ll publish the rules first.
          </p>
          <a href="/for-servers" className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black">
            What Slate does today →
          </a>
        </div>
      </main>
    </div>
  )
}
