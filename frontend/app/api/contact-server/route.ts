import { NextResponse } from 'next/server'
import { escapeHtml, getRequestUser, supabaseAdmin } from '@/lib/server-auth'

// A signed-in restaurant manager asks to connect with a server who opted in to
// talent discovery. The recipient address is looked up here, never taken from
// the request, and only opted-in servers can be contacted.
//
// Permission model (docs/VERIFIED_MANAGERS.md): recruiting is deliberately NOT bound
// to the manager's venue — the dashboard's Talent tab lists workers from other venues.
// It requires (1) a Slate-verified manager and (2) the worker's open_to_opportunities
// setting. Shift control and follower notifications ARE venue-bound (manager_controls).
// The worker's email is never returned to the manager; replies go manager → worker.
export async function POST(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const serverId = (body as { serverId?: unknown } | null)?.serverId
  if (typeof serverId !== 'string' || !serverId) {
    return NextResponse.json({ error: 'Missing serverId' }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const { data: manager } = await admin
    .from('restaurant_managers')
    .select('name, email, verified_at, verified_restaurant_name')
    .eq('auth_id', user.id)
    .maybeSingle()
  if (!manager) return NextResponse.json({ error: 'Restaurant manager account required' }, { status: 403 })
  // Only Slate-verified managers can contact workers, and only in the name of the
  // venue Slate verified (never the self-typed restaurant name).
  if (!manager.verified_at || !manager.verified_restaurant_name) {
    return NextResponse.json({ error: 'Your restaurant account is pending verification by Slate.' }, { status: 403 })
  }

  const { data: server } = await admin
    .from('servers')
    .select('name, email, open_to_opportunities')
    .eq('id', serverId)
    .maybeSingle()
  if (!server || !server.open_to_opportunities) {
    return NextResponse.json({ error: 'This server is not open to contact' }, { status: 404 })
  }
  if (!server.email) return NextResponse.json({ error: 'No email on file for this server' }, { status: 409 })

  const restaurantName = manager.verified_restaurant_name as string
  const managerName = (manager.name as string | null) || 'A manager'
  const firstName = ((server.name as string | null) || 'Hi').split(' ')[0]
  const replyTo = (manager.email as string | null) || user.email || undefined

  const h = {
    first: escapeHtml(firstName),
    manager: escapeHtml(managerName),
    restaurant: escapeHtml(restaurantName),
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: 'Slate <team@slatenow.xyz>',
    to: server.email as string,
    replyTo,
    subject: `${restaurantName} wants to connect with you on Slate`,
    html: `
      <div style="background:#000;color:#fff;padding:40px;
        font-family:Georgia,serif;max-width:600px;">
        <h1 style="font-size:28px;margin-bottom:16px;">
          ${h.first}, a restaurant noticed you.
        </h1>
        <p style="color:#aaa;font-size:16px;line-height:1.7;">
          ${h.manager} from ${h.restaurant} saw your
          Slate profile and wants to connect.
        </p>
        <div style="margin:32px 0;padding:24px;
          border:1px solid #222;">
          <p style="color:#666;font-size:12px;
            letter-spacing:3px;text-transform:uppercase;
            margin-bottom:8px;">
            What to do next
          </p>
          <p style="color:#aaa;font-size:15px;line-height:1.7;">
            Simply reply to this email to start the conversation.
            Your reply goes directly to ${h.manager} at
            ${h.restaurant}.
          </p>
        </div>
        <p style="color:#333;font-size:13px;margin-top:40px;">
          Slate — Your reputation belongs to you.<br>
          slatenow.xyz
        </p>
      </div>
    `,
  })
  if (error) {
    console.error('[contact-server] send failed:', error)
    return NextResponse.json({ error: 'Could not send message' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
