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
const DAILY_CONTACT_LIMIT = 10

export async function POST(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const serverId = (body as { serverId?: unknown } | null)?.serverId
  if (typeof serverId !== 'string' || !serverId) {
    return NextResponse.json({ error: 'Missing serverId' }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const { data: manager, error: managerError } = await admin
    .from('restaurant_managers')
    .select('id, name, email, verified_at, verified_restaurant_name')
    .eq('auth_id', user.id)
    .maybeSingle()
  // Fail closed (e.g. deployed before migration 36 added the verification columns).
  if (managerError) {
    console.error('[contact-server] manager lookup:', managerError.message)
    return NextResponse.json({ error: 'Your restaurant account is pending verification by Slate.' }, { status: 403 })
  }
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

  // Consent limits (migration 37): one recruiting email per manager → worker, ever, and
  // at most DAILY_CONTACT_LIMIT per manager per rolling 24 hours. Claimed atomically in
  // the database before sending; released again if the email can't be sent.
  const { data: claim, error: claimError } = await admin.rpc('claim_recruiting_contact', {
    p_manager_id: manager.id,
    p_server_id: serverId,
    p_daily_limit: DAILY_CONTACT_LIMIT,
  })
  if (claimError || typeof claim !== 'string') {
    console.error('[contact-server] claim:', claimError?.message ?? claim)
    return NextResponse.json({ error: 'Contacting servers is temporarily unavailable.' }, { status: 503 })
  }
  if (claim === 'already_contacted') {
    return NextResponse.json({ error: 'You have already contacted this server. They can reply to your email if they are interested.', code: 'already_contacted' }, { status: 409 })
  }
  if (claim === 'daily_limit') {
    return NextResponse.json({ error: `Daily limit reached: you can contact up to ${DAILY_CONTACT_LIMIT} servers per 24 hours.`, code: 'daily_limit' }, { status: 429 })
  }
  const reservationId = claim

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
  // The reservation id doubles as the provider idempotency key, so one reservation can
  // never produce two emails, even if someone retries it during reconciliation.
  let sendResult: { data?: { id?: string } | null; error?: { statusCode?: number | null; name?: string } | null } | null = null
  try {
    sendResult = await resend.emails.send({
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
  }, { idempotencyKey: `recruit/${reservationId}` })
  } catch (e) {
    console.error('[contact-server] send threw:', e instanceof Error ? e.message : e)
    sendResult = null
  }

  const outcome = classifySend(sendResult)

  if (outcome.kind === 'sent') {
    const { error: markErr } = await admin
      .from('recruiting_contacts')
      .update({ sent_at: new Date().toISOString(), provider_message_id: outcome.messageId })
      .eq('id', reservationId)
    if (markErr) {
      // Email went out; only the bookkeeping failed. Reservation stays (no repeat possible).
      console.error(`[contact-server] RECONCILE reservation=${reservationId} sent (provider id ${outcome.messageId}) but sent_at not recorded: ${markErr.message}`)
    }
    return NextResponse.json({ success: true })
  }

  if (outcome.kind === 'rejected') {
    // The provider definitely refused it, so nothing was sent: release the reservation.
    console.error(`[contact-server] send rejected reservation=${reservationId} status=${outcome.status}`)
    const { error: releaseErr } = await admin
      .from('recruiting_contacts')
      .delete()
      .eq('id', reservationId)
      .is('sent_at', null)
    if (releaseErr) {
      console.error(`[contact-server] RECONCILE reservation=${reservationId} rejected by provider but release failed: ${releaseErr.message}`)
    }
    return NextResponse.json({ error: 'Could not send message. Please try again later.', code: 'send_rejected' }, { status: 502 })
  }

  // Ambiguous: it may or may not have been delivered. Keep the reservation (never risk a
  // second email) and leave it for manual reconciliation against the provider's logs.
  console.error(`[contact-server] RECONCILE reservation=${reservationId} delivery unconfirmed (${outcome.reason})`)
  return NextResponse.json({
    error: 'We could not confirm your message was sent. Please do not resend; Slate will check and follow up.',
    code: 'delivery_unconfirmed',
  }, { status: 502 })
}

type SendOutcome =
  | { kind: 'sent'; messageId: string }
  | { kind: 'rejected'; status: number }
  | { kind: 'unconfirmed'; reason: string }

// Only an explicit 4xx answer from the provider proves the message was not accepted.
// Timeouts, network failures, 5xx, thrown errors and replies without an id are ambiguous.
function classifySend(
  result: { data?: { id?: string } | null; error?: { statusCode?: number | null; name?: string } | null } | null,
): SendOutcome {
  if (!result) return { kind: 'unconfirmed', reason: 'exception' }
  if (result.error) {
    const status = typeof result.error.statusCode === 'number' ? result.error.statusCode : null
    if (status !== null && status >= 400 && status < 500) return { kind: 'rejected', status }
    return { kind: 'unconfirmed', reason: status === null ? 'no response' : `provider ${status}` }
  }
  const id = result.data?.id
  if (typeof id === 'string' && id) return { kind: 'sent', messageId: id }
  return { kind: 'unconfirmed', reason: 'no message id' }
}
