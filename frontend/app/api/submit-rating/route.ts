import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const ALLOWED_TAGS = [
  'Attentive',
  'Friendly',
  'Great Recommendations',
  'Fast Service',
  'Made it Special',
  'Above and Beyond',
] as const

// Keep in sync with submit_rating_reward in frontend/supabase-sql/serve_ledger.sql.
// The SQL function recomputes and rejects a mismatch. The client amount is ignored.
function rewardFor(score: number, hasComment: boolean, followed: boolean) {
  const starReward =
    score === 5 ? 35 :
    score === 4 ? 20 :
    score === 3 ? 10 :
    score === 2 ? 5 : 2
  const commentBonus = hasComment ? 10 : 0
  const followBonus = followed ? 5 : 0
  return {
    starReward,
    commentBonus,
    followBonus,
    total: starReward + commentBonus + followBonus,
  }
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Sign in to submit a rating.' }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
  const user = authData?.user
  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in to submit a rating.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { serverId, score, comment, tags, isTest } = body as {
    serverId?: unknown
    score?: unknown
    comment?: unknown
    tags?: unknown
    isTest?: unknown
  }

  if (typeof serverId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serverId)) {
    return NextResponse.json({ error: 'Server not found.' }, { status: 400 })
  }
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: 'Pick a rating from 1 to 5.' }, { status: 400 })
  }

  const commentText = typeof comment === 'string' ? comment.trim().slice(0, 2000) : ''
  const hasComment = commentText.length > 0
  const rawTags = Array.isArray(tags) ? tags : []
  const cleanTags = [...new Set(
    rawTags.filter((tag): tag is string =>
      typeof tag === 'string' && (ALLOWED_TAGS as readonly string[]).includes(tag),
    ),
  )]

  const { data: server, error: serverErr } = await supabaseAdmin
    .from('servers')
    .select('id')
    .eq('id', serverId)
    .maybeSingle()
  if (serverErr) {
    console.error('[submit-rating] server lookup:', serverErr.message)
    return NextResponse.json({ error: 'Could not submit rating.' }, { status: 500 })
  }
  if (!server) {
    return NextResponse.json({ error: 'Server not found.' }, { status: 404 })
  }

  const { data: follow, error: followErr } = await supabaseAdmin
    .from('follows')
    .select('id')
    .eq('server_id', serverId)
    .eq('follower_id', user.id)
    .maybeSingle()
  if (followErr) {
    console.error('[submit-rating] follow lookup:', followErr.message)
    return NextResponse.json({ error: 'Could not submit rating.' }, { status: 500 })
  }

  const reward = rewardFor(score, hasComment, !!follow)

  const { data, error } = await supabaseAdmin.rpc('submit_rating_reward', {
    p_server_id: serverId,
    p_score: score,
    p_comment: hasComment ? commentText : null,
    p_tags: cleanTags,
    p_guest_email: user.email ?? user.id,
    p_followed: !!follow,
    p_amount: reward.total,
  })

  if (error) {
    console.error('[submit-rating] rpc:', error.message)
    if (/does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json(
        { error: 'Rating rewards are not installed yet.' },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: 'Could not submit rating.' }, { status: 500 })
  }

  // Attribution for analysis: who rated (from the verified token) and whether it came
  // from a test device. Best-effort — the rating and reward are already saved.
  const ratingId = (data as { rating_id?: string } | null)?.rating_id
  if (ratingId) {
    const { error: attrErr } = await supabaseAdmin
      .from('ratings')
      .update({ guest_id: user.id, is_test: isTest === true })
      .eq('id', ratingId)
    if (attrErr) console.error('[submit-rating] attribution update:', attrErr.message)
  }

  return NextResponse.json({ success: true, reward, result: data })
}
