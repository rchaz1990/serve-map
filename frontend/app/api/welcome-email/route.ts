import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const { email, name, type } = await request.json()

  const serverEmail = {
    subject: 'Welcome to Slate — Your profile is live 🍸',
    html: `
      <div style="background:#000;color:#fff;padding:40px;font-family:Georgia,serif;max-width:600px;">
        <h1 style="font-size:32px;margin-bottom:16px;">Welcome to Slate, ${name.split(' ')[0]}.</h1>
        <p style="color:#aaa;font-size:16px;line-height:1.7;">Your founding member profile is live on Slate. Your reputation now follows you — from restaurant to restaurant, forever.</p>
        <div style="margin:32px 0;padding:24px;border:1px solid #222;">
          <p style="color:#666;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">What's next</p>
          <p style="color:#aaa;font-size:15px;line-height:1.7;">1. Go to your dashboard and activate your first shift<br>2. Share your profile link with guests<br>3. Earn $SERVE rewards for every great rating</p>
        </div>
        <a href="https://slatenow.xyz/dashboard" style="display:inline-block;background:#fff;color:#000;padding:14px 32px;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;">Go to your dashboard</a>
        <p style="color:#333;font-size:13px;margin-top:40px;">Slate — The reputation layer for hospitality workers.<br>slatenow.xyz</p>
      </div>
    `
  }

  const guestEmail = {
    subject: 'Welcome to Slate — Discover NYC tonight 🍸',
    html: `
      <div style="background:#000;color:#fff;padding:40px;font-family:Georgia,serif;max-width:600px;">
        <h1 style="font-size:32px;margin-bottom:16px;">Welcome to Slate, ${name.split(' ')[0]}.</h1>
        <p style="color:#aaa;font-size:16px;line-height:1.7;">You're now part of the first hospitality social layer built on Solana. Discover which NYC venues are live tonight and follow the servers who make your night unforgettable.</p>
        <div style="margin:32px 0;padding:24px;border:1px solid #222;">
          <p style="color:#666;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">What's next</p>
          <p style="color:#aaa;font-size:15px;line-height:1.7;">1. See which venues are live tonight<br>2. Report the vibe at wherever you're eating<br>3. Follow your favorite servers and bartenders</p>
        </div>
        <a href="https://slatenow.xyz/live" style="display:inline-block;background:#fff;color:#000;padding:14px 32px;text-decoration:none;font-size:14px;letter-spacing:2px;text-transform:uppercase;">See what's live tonight</a>
        <p style="color:#333;font-size:13px;margin-top:40px;">Slate — The reputation layer for hospitality workers.<br>slatenow.xyz</p>
      </div>
    `
  }

  const emailContent = type === 'server' ? serverEmail : guestEmail

  try {
    await resend.emails.send({
      from: 'Slate <team@slatenow.xyz>',
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    })
  } catch (err) {
    console.error('[welcome-email] Failed to send:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
