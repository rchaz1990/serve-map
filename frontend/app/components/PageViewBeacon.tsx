'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { PAUSED } from '@/lib/early-test'

export function PageViewBeacon() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith('/internal') || pathname.startsWith('/api')) return
    // Early test: a /scan/<worker> page view would amount to a QR-scan record.
    if (PAUSED.qrScanTracking && pathname.startsWith('/scan')) return

    fetch('/api/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname])

  return null
}
