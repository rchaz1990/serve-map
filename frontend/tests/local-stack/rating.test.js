// /api/submit-rating against a REAL local database (production grants/RLS + migration 34)
// and the app's real route. usage: node rating.test.js <appUrl> <keys.json>
const { execFileSync } = require('child_process')
const fs = require('fs')
const crypto = require('crypto')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const { anon: ANON } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))
const sql = q => execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
let n = 0
const email = tag => `r${Date.now()}-${++n}-${tag}@example.com`

async function account(tag) {
  const r = await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: email(tag) }) })
  return r.json()
}
async function worker(tag) {
  const a = await account(tag)
  const id = sql(`insert into servers (name, email, wallet_address) values ('Worker ${tag}', '${a.user.email}', '${a.user.id}') returning id`).split('\n')[0]
  return { ...a, serverId: id }
}
async function rate(token, body) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  const r = await fetch(APP + '/api/submit-rating', { method: 'POST', headers, body: JSON.stringify(body) })
  return { status: r.status, json: await r.json() }
}
const stats = id => sql(`select total_ratings || '|' || average_rating || '|' || serve_balance || '|' ||
  (select count(*) from ratings where server_id = '${id}') || '|' ||
  (select count(*) from serve_ledger where account_id = '${id}') from servers where id = '${id}'`)
const ratingsBy = (e, id) => Number(sql(`select count(*) from ratings where lower(guest_email) = lower('${e}')${id ? ` and server_id = '${id}'` : ''}`))

let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300)) }

;(async () => {
  const w1 = await worker('w1')

  // ── forged / missing identity ──
  let r = await rate(null, { serverId: w1.serverId, score: 5 })
  check('no sign-in → 401', r.status === 401 && stats(w1.serverId).startsWith('0|'), r)
  r = await rate(ANON, { serverId: w1.serverId, score: 5 })
  check('anon key as token → 401', r.status === 401, r)
  const forgedTok = (await account('forge')).access_token.replace(/\.[^.]+$/, '.AAAA')
  r = await rate(forgedTok, { serverId: w1.serverId, score: 1 })
  check('forged token → 401', r.status === 401 && stats(w1.serverId).startsWith('0|'), r)

  // ── legitimate ──
  const g1 = await account('guest')
  r = await rate(g1.access_token, { serverId: w1.serverId, score: 5, comment: 'Great', guestEmail: 'someone@else.com', amount: 9999, serve_reward: 9999 })
  const row = sql(`select guest_email || '|' || serve_reward || '|' || coalesce(guest_id,'') from ratings where server_id = '${w1.serverId}'`)
  check('signed-in guest rates a worker → saved; email/reward come from the server, not the body',
    r.status === 200 && row === `${g1.user.email}|45|${g1.user.id}` && stats(w1.serverId) === '1|5.0|45|1|1', { r, row, s: stats(w1.serverId) })

  r = await rate(g1.access_token, { serverId: w1.serverId, score: 1 })
  check('same guest, same worker within 24 h → 429, nothing changes', r.status === 429 && stats(w1.serverId) === '1|5.0|45|1|1', { r, s: stats(w1.serverId) })

  const w2 = await worker('w2')
  r = await rate(g1.access_token, { serverId: w2.serverId, score: 4 })
  check('same guest, different worker → allowed', r.status === 200 && stats(w2.serverId).startsWith('1|4.0|'), r)

  sql(`update ratings set created_at = now() - interval '25 hours' where server_id = '${w1.serverId}'`)
  r = await rate(g1.access_token, { serverId: w1.serverId, score: 4 })
  check('repeat visit the next day (25 h later) → allowed', r.status === 200 && stats(w1.serverId).startsWith('2|4.5|'), { r, s: stats(w1.serverId) })

  // history recorded before this change (mixed-case email) counts
  const g2 = await account('history')
  const w3 = await worker('w3')
  sql(`insert into ratings (server_id, score, guest_email, created_at) values ('${w3.serverId}', 5, '${g2.user.email.toUpperCase()}', now() - interval '1 hour')`)
  r = await rate(g2.access_token, { serverId: w3.serverId, score: 1 })
  check('existing rating from the same email (any letter case) within 24 h → 429', r.status === 429 && ratingsBy(g2.user.email, w3.serverId) === 1, r)

  // ── self-rating ──
  r = await rate(w1.access_token, { serverId: w1.serverId, score: 5 })
  check("worker rating their own profile → 403, nothing changes", r.status === 403 && stats(w1.serverId).startsWith('2|'), r)

  // ── unknown worker ──
  r = await rate(g1.access_token, { serverId: crypto.randomUUID(), score: 5 })
  check('unknown worker → 404', r.status === 404, r)

  // ── daily limit ──
  const g3 = await account('busy')
  const many = []
  for (let i = 0; i < 11; i++) many.push(await worker(`d${i}`))
  const statuses = []
  for (const w of many) statuses.push((await rate(g3.access_token, { serverId: w.serverId, score: 5 })).status)
  check('10 different workers in 24 h → allowed; 11th → 429', statuses.slice(0, 10).every(s => s === 200) && statuses[10] === 429 && ratingsBy(g3.user.email) === 10, statuses)

  // ── concurrency ──
  const g4 = await account('race')
  const w4 = await worker('w4')
  const burst = await Promise.all(Array.from({ length: 10 }, () => rate(g4.access_token, { serverId: w4.serverId, score: 1 })))
  check('10 simultaneous ratings, same guest + worker → exactly 1 saved; totals, balance and ledger +1 once',
    ratingsBy(g4.user.email, w4.serverId) === 1 && stats(w4.serverId) === '1|1.0|2|1|1' && burst.filter(x => x.status === 200).length === 1,
    { s: stats(w4.serverId), st: burst.map(x => x.status) })

  const g5 = await account('spray')
  const targets = []
  for (let i = 0; i < 15; i++) targets.push(await worker(`p${i}`))
  await Promise.all(targets.map(w => rate(g5.access_token, { serverId: w.serverId, score: 1 })))
  check('15 simultaneous ratings to different workers → never more than 10 saved', ratingsBy(g5.user.email) === 10, ratingsBy(g5.user.email))
  const consistent = targets.every(w => { const [t, , , c, l] = stats(w.serverId).split('|'); return t === c && c === l })
  check('every worker’s total, rating rows and ledger rows stay consistent after the race', consistent)

  // ── direct database access from the browser ──
  const gT = g1.access_token
  const before = sql(`select count(*) || '|' || sum(score) from ratings`)
  const tries = await Promise.all([
    fetch(GW + '/rest/v1/ratings', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${gT}`, 'content-type': 'application/json' }, body: JSON.stringify({ server_id: w1.serverId, score: 5 }) }),
    fetch(GW + `/rest/v1/ratings?server_id=eq.${w1.serverId}`, { method: 'PATCH', headers: { apikey: ANON, authorization: `Bearer ${gT}`, 'content-type': 'application/json' }, body: JSON.stringify({ score: 1 }) }),
    fetch(GW + `/rest/v1/ratings?server_id=eq.${w1.serverId}`, { method: 'DELETE', headers: { apikey: ANON, authorization: `Bearer ${gT}` } }),
    fetch(GW + `/rest/v1/servers?id=eq.${w1.serverId}`, { method: 'PATCH', headers: { apikey: ANON, authorization: `Bearer ${gT}`, 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify({ average_rating: 1 }) }),
    fetch(GW + '/rest/v1/rpc/submit_rating_reward', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${gT}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_server_id: w1.serverId, p_score: 5, p_comment: null, p_tags: [], p_guest_email: 'x@y.z', p_followed: false, p_amount: 35 }) }),
  ])
  const after = sql(`select count(*) || '|' || sum(score) from ratings`)
  check('signed-in browser cannot insert, edit or delete ratings, change averages, or call the rating function',
    tries.every(t => t.status === 401 || t.status === 403 || t.status === 404) && before === after && stats(w1.serverId).startsWith('2|4.5|'),
    { statuses: tries.map(t => t.status), before, after })

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
