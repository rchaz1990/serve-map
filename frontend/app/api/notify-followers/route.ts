import { NextResponse } from 'next/server'
import { escapeHtml, getRequestUser, supabaseAdmin as getSupabaseAdmin } from '@/lib/server-auth'
import { workerTermsOnFile } from '@/lib/legal-server'
import { isTestProfile, isTesterEmail } from '@/lib/test-profiles'

export async function POST(request: Request) {
  // Only the server themself, or a manager at a venue where they work, can notify
  // that server's followers. Names come from the database, not from the caller.
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const supabaseAdmin = getSupabaseAdmin()
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const body = await request.json().catch(() => null)
  const { serverId, restaurantName: requestedRestaurant, type } = (body ?? {}) as {
    serverId?: string; restaurantName?: string; type?: string
  }

  if (!serverId || !requestedRestaurant || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (type !== 'shift_started' && type !== 'job_changed') {
    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 })
  }

  const { data: serverRow } = await supabaseAdmin
    .from('servers')
    .select('id, name, wallet_address')
    .eq('id', serverId)
    .maybeSingle()
  if (!serverRow) return NextResponse.json({ error: 'Server not found' }, { status: 404 })

  // The venue must be one of this server's jobs; use the stored spelling.
  const { data: jobs } = await supabaseAdmin
    .from('server_restaurants')
    .select('restaurant_name')
    .eq('server_id', serverId)
  const job = (jobs ?? []).find(
    j => (j.restaurant_name ?? '').toLowerCase() === requestedRestaurant.trim().toLowerCase(),
  )
  if (!job) return NextResponse.json({ error: 'Venue not linked to this server' }, { status: 403 })
  const restaurantName = job.restaurant_name as string

  const isSelf = serverRow.wallet_address === user.id
  // Managers: only a Slate-verified manager bound to this exact venue (name + address).
  let isVenueManager = false
  if (!isSelf) {
    const { data: controls, error: controlsErr } = await supabaseAdmin.rpc('manager_controls', {
      p_auth_id: user.id,
      p_server_id: serverId,
      p_restaurant: restaurantName,
    })
    if (controlsErr) console.error('[notify-followers] manager_controls:', controlsErr.message)
    isVenueManager = controls === true
  }
  if (!isSelf && !isVenueManager) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  // Followers are emailed about a worker only after that worker has agreed to the current
  // Terms/Privacy as a worker (existing workers agree from their dashboard). Unclaimed
  // profiles never pass.
  if (!(await workerTermsOnFile(supabaseAdmin, serverRow.wallet_address as string | null))) {
    return NextResponse.json(
      { error: 'This worker needs to accept the current Terms and Privacy Policy first.', code: 'worker_terms_required' },
      { status: 403 },
    )
  }

  const serverName = (serverRow.name as string | null) || 'Your server'

  // Only approved followers who confirmed "Follow and email me", at their own account
  // address (migration 38). Never a stored or client-supplied address.
  const { data: recipientRows, error: recipientsError } = await supabaseAdmin
    .rpc('notification_recipients', { p_server_id: serverId })
  if (recipientsError) {
    console.error('[notify-followers] recipients:', recipientsError.message)
    return NextResponse.json({ error: 'Could not load followers' }, { status: 503 })
  }
  const followers = ((recipientRows ?? []) as { email: string | null }[])
    .map(r => ({ follower_email: r.email }))

  // Test profiles (migration 42): their emails may only reach authorized test accounts.
  // If any recipient is not a test account (e.g. a real follow made before the profile was
  // marked as a test profile), send nothing at all.
  const testProfile = await isTestProfile(supabaseAdmin, serverId)
  if (testProfile === 'error') return NextResponse.json({ error: 'Could not check profile' }, { status: 503 })
  if (testProfile === true) {
    for (const f of followers) {
      const ok = await isTesterEmail(supabaseAdmin, f.follower_email)
      if (ok !== true) {
        console.error('[notify-followers] test profile has a non-test follower; nothing sent', serverId)
        return NextResponse.json({ error: 'Test profile has non-test followers; nothing was sent.', code: 'test_mix' }, { status: 409 })
      }
    }
  }

  if (!followers || followers.length === 0) {
    return NextResponse.json({ success: true, notified: 0 })
  }

  // Cooldown: one notification of a kind per server per 30 minutes
  {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: recentNotif } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('server_id', serverId)
      .eq('type', type)
      .gte('created_at', thirtyMinsAgo)
      .limit(1)
      .maybeSingle()
    if (recentNotif) {
      return NextResponse.json({ success: true, notified: 0, message: 'Notifications already sent recently' })
    }
  }

  const firstName = serverName.split(' ')[0]
  const htmlFirst = escapeHtml(firstName)
  const htmlServer = escapeHtml(serverName)
  const htmlRestaurant = escapeHtml(restaurantName)

  let subject = ''
  let html = ''

  if (type === 'shift_started') {
    subject = `${firstName} is working tonight 🍸`
    html = `
      <div style="background:#000;color:#fff;padding:40px;font-family:Georgia,serif;max-width:600px;">
        <h1 style="font-size:28px;margin-bottom:16px;">${htmlFirst} is live tonight.</h1>
        <p style="color:#aaa;font-size:16px;line-height:1.7;">${htmlServer} just activated their shift at <strong style="color:white;">${htmlRestaurant}</strong>.</p>
        <div style="margin:32px 0;">
          <a href="https://slatenow.xyz/server/${serverId}" style="display:inline-block;background:#fff;color:#000;padding:14px 32px;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;">View profile</a>
        </div>
        <p style="color:#333;font-size:12px;">You're following ${htmlFirst} on Slate. <a href="https://slatenow.xyz/account" style="color:#555;">Manage follows</a></p>
      </div>
    `
  } else if (type === 'job_changed') {
    subject = `${firstName} has moved to ${restaurantName}`
    html = `
      <div style="background:#000;color:#fff;padding:40px;font-family:Georgia,serif;max-width:600px;">
        <h1 style="font-size:28px;margin-bottom:16px;">${htmlFirst} has a new home.</h1>
        <p style="color:#aaa;font-size:16px;line-height:1.7;">${htmlServer} is now working at <strong style="color:white;">${htmlRestaurant}</strong>.</p>
        <div style="margin:32px 0;">
          <a href="https://slatenow.xyz/server/${serverId}" style="display:inline-block;background:#fff;color:#000;padding:14px 32px;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;">See their profile</a>
        </div>
        <p style="color:#333;font-size:12px;">You're following ${htmlFirst} on Slate. <a href="https://slatenow.xyz/account" style="color:#555;">Manage follows</a></p>
      </div>
    `
  } else {
    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 })
  }

  // Save notifications to database
  const notificationInserts = followers
    .filter(f => f.follower_email)
    .map(f => ({
      recipient_email: f.follower_email,
      type,
      title: subject,
      message: `${serverName} is at ${restaurantName}`,
      server_id: serverId,
      server_name: serverName,
      restaurant_name: restaurantName,
      link: `https://slatenow.xyz/server/${serverId}`,
    }))

  if (notificationInserts.length > 0) {
    const { error } = await supabaseAdmin.from('notifications').insert(notificationInserts)
    if (error) console.error('[notify-followers] DB insert error:', error)
  }

  // Plain-text alternative: some inboxes treat HTML-only mail as more likely spam.
  const text = type === 'shift_started'
    ? `${serverName} just started a shift at ${restaurantName}.\n\nView profile: https://slatenow.xyz/server/${serverId}\n\nYou're following ${firstName} on Slate. Manage follows: https://slatenow.xyz/account`
    : `${serverName} is now working at ${restaurantName}.\n\nSee their profile: https://slatenow.xyz/server/${serverId}\n\nYou're following ${firstName} on Slate. Manage follows: https://slatenow.xyz/account`

  // Send in parallel to avoid a serverless timeout. Resend reports most failures
  // as a returned { error } rather than a thrown exception, so check both.
  const recipients = followers.filter(f => f.follower_email)
  const emailResults = await Promise.all(
    recipients.map(async follower => {
      try {
        const { error } = await resend.emails.send({
          from: 'Slate <team@slatenow.xyz>',
          to: follower.follower_email!,
          subject,
          html,
          text,
        })
        if (error) {
          console.error('[notify-followers] Resend rejected email:', serverId, type, error.name, error.message)
          return false
        }
        return true
      } catch (err) {
        console.error('[notify-followers] Email send threw:', serverId, type, err)
        return false
      }
    })
  )
  const notified = emailResults.filter(Boolean).length
  const failed = emailResults.length - notified

  return NextResponse.json({ success: failed === 0, notified, failed })
}
