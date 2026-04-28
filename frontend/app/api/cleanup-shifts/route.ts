import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key !== process.env.CRON_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const twelveHoursAgo = new Date(
    Date.now() - 12 * 60 * 60 * 1000
  ).toISOString()

  const { error } = await supabase
    .from('shifts')
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
    })
    .eq('is_active', true)
    .lt('started_at', twelveHoursAgo)

  if (error) {
    console.error('[cleanup-shifts] update error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Stale shifts cleaned up',
  })
}
