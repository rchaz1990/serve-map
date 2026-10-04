'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PageViewBeacon() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith('/internal') || pathname.startsWith('/api')) return

    fetch('/api/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname])

  return null
}
