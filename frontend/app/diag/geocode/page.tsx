'use client'

// TEST-ONLY diagnostic for PR #34. Lives on the never-merged branch
// diag/geocode-check-pr34, so it only exists on that branch's Vercel preview.
// It geocodes a few real venue names with the PR's helper and shows the
// coordinates. It reads no location, writes nothing to Supabase, and creates
// no shifts, vibes or ratings.

import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { geocodeAddress } from '@/lib/geocode'

// Same query shapes the app sends: live/venue use "<name> NYC"; the dashboard
// tries the bare name first, then "<name> NYC".
const CASES: { label: string; run: () => Promise<{ lat: number; lng: number } | null>; expect: 'nyc' | 'none' }[] = [
  { label: 'live/venue: "Attaboy NYC"', run: () => geocodeAddress('Attaboy NYC'), expect: 'nyc' },
  { label: 'live/venue: "Employees Only NYC"', run: () => geocodeAddress('Employees Only NYC'), expect: 'nyc' },
  { label: 'live/venue: "Death & Co NYC"', run: () => geocodeAddress('Death & Co NYC'), expect: 'nyc' },
  {
    label: 'dashboard: "Carbone", then "Carbone NYC"',
    run: async () => (await geocodeAddress('Carbone')) ?? (await geocodeAddress('Carbone NYC')),
    expect: 'nyc',
  },
  { label: 'nonsense query returns nothing', run: () => geocodeAddress('zzqx-no-such-place-93817'), expect: 'none' },
]

const inNyc = (p: { lat: number; lng: number }) => p.lat > 40.45 && p.lat < 40.95 && p.lng > -74.3 && p.lng < -73.65

type Row = { label: string; result: string; pass: boolean }

export default function GeocodeDiagnostic() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') notFound()
  const [rows, setRows] = useState<Row[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const out: Row[] = []
      for (const c of CASES) {
        const p = await c.run()
        const pass = c.expect === 'none' ? p === null : p !== null && inNyc(p)
        out.push({ label: c.label, result: p ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : 'no result', pass })
        if (!cancelled) setRows([...out])
      }
      if (!cancelled) setDone(true)
    })()
    return () => { cancelled = true }
  }, [])

  const passed = rows.filter((r) => r.pass).length
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#eee', background: '#111', minHeight: '100vh' }}>
      <p style={{ color: '#f5a524', fontWeight: 700 }}>TEST-ONLY DIAGNOSTIC · PR #34 preview · not part of Slate</p>
      <h1 style={{ fontSize: 20 }}>Maps JavaScript geocoder check</h1>
      <p style={{ fontSize: 13, color: '#aaa' }}>Uses the current Google key from this preview. No location is read and nothing is saved.</p>
      <table style={{ marginTop: 16, borderCollapse: 'collapse', fontSize: 14 }}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td style={{ padding: '6px 12px 6px 0' }}>{r.pass ? '✅' : '❌'}</td>
              <td style={{ padding: '6px 12px 6px 0' }}>{r.label}</td>
              <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>{r.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p id="summary" style={{ marginTop: 16, fontWeight: 700 }}>
        {done ? `${passed}/${CASES.length} passed` : 'Running…'}
      </p>
    </main>
  )
}
