import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, firstName, lastName, role, venue, notifyMainnet } = await req.json()

  if (!email || !firstName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const apiKey = process.env.BEEHIIV_API_KEY
  const pubId  = process.env.BEEHIIV_PUBLICATION_ID

  if (!apiKey || !pubId) {
    // Env vars not set — log and return success so signup still completes
    console.warn('[signup] Beehiiv env vars missing — skipping subscription')
    return NextResponse.json({ ok: true, skipped: true })
  }

  const body = {
    email,
    reactivate_existing: false,
    send_welcome_email: false,
    utm_source: 'slate-signup',
    utm_medium: 'devnet',
    custom_fields: [
      { name: 'First Name',        value: firstName },
      { name: 'Last Name',         value: lastName ?? '' },
      { name: 'Role',              value: role ?? '' },
      { name: 'Venue',             value: venue ?? '' },
      { name: 'Notify Mainnet',    value: notifyMainnet ? 'yes' : 'no' },
    ],
  }

  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('[signup] Beehiiv error:', res.status, text)
    // Return success anyway — don't block the user if Beehiiv is down
    return NextResponse.json({ ok: true, beehiivError: res.status })
  }

  return NextResponse.json({ ok: true })
}
