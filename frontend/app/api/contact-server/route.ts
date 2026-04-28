import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { Resend: ResendClass } = await import('resend')
  const resend = new ResendClass(process.env.RESEND_API_KEY)

  const {
    serverEmail, serverName, restaurantName,
    managerName, managerEmail
  } = await request.json()

  const firstName = serverName.split(' ')[0]

  await resend.emails.send({
    from: 'Slate <team@slatenow.xyz>',
    to: serverEmail,
    replyTo: managerEmail,
    subject: `${restaurantName} wants to connect with you on Slate`,
    html: `
      <div style="background:#000;color:#fff;padding:40px;
        font-family:Georgia,serif;max-width:600px;">
        <h1 style="font-size:28px;margin-bottom:16px;">
          ${firstName}, a restaurant noticed you.
        </h1>
        <p style="color:#aaa;font-size:16px;line-height:1.7;">
          ${managerName} from ${restaurantName} saw your
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
            Your reply goes directly to ${managerName} at
            ${restaurantName}.
          </p>
        </div>
        <p style="color:#333;font-size:13px;margin-top:40px;">
          Slate — Your reputation belongs to you.<br>
          slatenow.xyz
        </p>
      </div>
    `
  })

  return NextResponse.json({ success: true })
}
