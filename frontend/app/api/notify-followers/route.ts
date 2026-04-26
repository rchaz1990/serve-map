import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { serverId, serverName, restaurantName, type } = await request.json()

  if (!serverId || !serverName || !restaurantName || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: followers } = await supabaseAdmin
    .from('follows')
    .select('follower_email')
    .eq('server_id', serverId)
    .eq('status', 'approved')

  if (!followers || followers.length === 0) {
    return NextResponse.json({ success: true, notified: 0 })
  }

  // Fix 8: cooldown — skip if shift_started notification sent in last 30 min
  if (type === 'shift_started') {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: recentNotif } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('server_id', serverId)
      .eq('type', 'shift_started')
      .gte('created_at', thirtyMinsAgo)
      .maybeSingle()
    if (recentNotif) {
      return NextResponse.json({ success: true, notified: 0, message: 'Notifications already sent recently' })
    }
  }

  const firstName = serverName.split(' ')[0]

  let subject = ''
  let html = ''

  if (type === 'shift_started') {
    subject = `${firstName} is working tonight 🍸`
    html = `
      <div style="background:#000;color:#fff;padding:40px;font-family:Georgia,serif;max-width:600px;">
        <h1 style="font-size:28px;margin-bottom:16px;">${firstName} is live tonight.</h1>
        <p style="color:#aaa;font-size:16px;line-height:1.7;">${serverName} just activated their shift at <strong style="color:white;">${restaurantName}</strong>.</p>
        <div style="margin:32px 0;">
          <a href="https://slatenow.xyz/server/${serverId}" style="display:inline-block;background:#fff;color:#000;padding:14px 32px;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;">View profile</a>
        </div>
        <p style="color:#333;font-size:12px;">You're following ${firstName} on Slate. <a href="https://slatenow.xyz/account" style="color:#555;">Manage follows</a></p>
      </div>
    `
  } else if (type === 'job_changed') {
    subject = `${firstName} has moved to ${restaurantName}`
    html = `
      <div style="background:#000;color:#fff;padding:40px;font-family:Georgia,serif;max-width:600px;">
        <h1 style="font-size:28px;margin-bottom:16px;">${firstName} has a new home.</h1>
        <p style="color:#aaa;font-size:16px;line-height:1.7;">${serverName} is now working at <strong style="color:white;">${restaurantName}</strong>.</p>
        <div style="margin:32px 0;">
          <a href="https://slatenow.xyz/server/${serverId}" style="display:inline-block;background:#fff;color:#000;padding:14px 32px;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;">See their profile</a>
        </div>
        <p style="color:#333;font-size:12px;">You're following ${firstName} on Slate. <a href="https://slatenow.xyz/account" style="color:#555;">Manage follows</a></p>
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

  // Fix 6: parallel email sending to avoid serverless timeout
  const emailResults = await Promise.all(
    followers
      .filter(f => f.follower_email)
      .map(follower =>
        resend.emails.send({
          from: 'Slate <team@slatenow.xyz>',
          to: follower.follower_email!,
          subject,
          html,
        }).catch(err => {
          console.error('[notify-followers] Email failed for:', follower.follower_email, err)
          return null
        })
      )
  )
  const notified = emailResults.filter(Boolean).length

  return NextResponse.json({ success: true, notified })
}
