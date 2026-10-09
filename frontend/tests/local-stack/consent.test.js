// Recruiting consent protections (migration 37) on the local real-database stack.
// Needs migrations 36 + 37 applied, and the app started with RESEND_BASE_URL pointing at
// the gateway (http://localhost:54400) so sent emails are recorded instead of delivered.
// usage: NODE_PATH=$(npm root -g) node consent.test.js <appUrl> <keys.json>
const { execFileSync } = require('child_process')
const fs = require('fs')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const { anon: ANON } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))
const sql = q => execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
const run = `c${Date.now()}`
let n = 0
const email = tag => `${run}-${++n}-${tag}@example.com`
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300)) }

async function account(tag) {
  const e = email(tag)
  const s = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: e, password: 'pass123456' }) })).json()
  return { email: e, id: s.user.id, token: s.access_token }
}
async function api(path, token, body) {
  const r = await fetch(APP + path, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
async function rest(method, path, token, body) {
  const r = await fetch(GW + '/rest/v1/' + path, { method, headers: { apikey: ANON, authorization: `Bearer ${token || ANON}`, 'content-type': 'application/json', prefer: 'return=minimal' }, body: body === undefined ? undefined : JSON.stringify(body) })
  return r.status
}
async function visibleWorker(tag) {
  const a = await account(tag)
  const id = sql(`insert into servers (name, email, wallet_address, open_to_opportunities) values ('Worker ${tag}', '${a.email}', '${a.id}', true) returning id`).split('\n')[0]
  return { ...a, serverId: id }
}
async function verifiedManager(tag) {
  const a = await account(tag)
  const id = sql(`insert into restaurant_managers (email, name, restaurant_name, auth_id, verified_at, verified_restaurant_name, verified_restaurant_address)
    values ('${a.email}', 'Mgr ${tag}', 'Hiring Spot ${run}', '${a.id}', now(), 'Hiring Spot ${run}', '2 Hire St, New York, NY') returning id`).split('\n')[0]
  return { ...a, managerId: id }
}
const contact = (m, w) => api('/api/contact-server', m.token, { serverId: w.serverId })
const emailsTo = async to => (await (await fetch(GW + '/__emails?to=' + encodeURIComponent(to))).json()).length
const rows = (mid, sid) => sql(`select count(*) from recruiting_contacts where manager_id = '${mid}'${sid ? ` and server_id = '${sid}'` : ''}`)
const setResend = mode => fetch(GW + '/__resend', { method: 'POST', body: JSON.stringify({ mode }) })
const attemptsTo = async to => (await (await fetch(GW + '/__emails?all=1&to=' + encodeURIComponent(to))).json())
const reservation = (mid, sid) => sql(`select coalesce(sent_at::text, 'NULL') || '|' || coalesce(provider_message_id, 'NULL') from recruiting_contacts where manager_id = '${mid}' and server_id = '${sid}'`)
const LOG = process.env.APP_LOG
const logHas = text => !LOG || fs.readFileSync(LOG, 'utf8').includes(text)

;(async () => {
  // ── 1. New workers are hidden by default ──
  const plain = await account('plain')
  const pid = sql(`insert into servers (name, email, wallet_address) values ('Default Worker', '${plain.email}', '${plain.id}') returning id`).split('\n')[0]
  check('C1 database default: new profile hidden from recruiters', sql(`select open_to_opportunities::text from servers where id = '${pid}'`) === 'false')
  const fresh = await account('signup')
  const su = await api('/api/signup-server', fresh.token, { name: 'Signup Worker', restaurant: `Some Bar ${run}`, role: 'Server' })
  check('C2 worker sign-up creates a hidden profile', su.status === 200 && sql(`select open_to_opportunities::text from servers where wallet_address = '${fresh.id}'`) === 'false', su)
  check('C3 worker can deliberately turn it on', await rest('PATCH', `servers?id=eq.${pid}`, plain.token, { open_to_opportunities: true }) < 300
    && sql(`select open_to_opportunities::text from servers where id = '${pid}'`) === 'true')

  // ── 2. One contact per manager–worker pair ──
  const m1 = await verifiedManager('m1')
  const w1 = await visibleWorker('w1')
  const first = await contact(m1, w1)
  check('C4 first contact succeeds and sends one email', first.status === 200 && await emailsTo(w1.email) === 1 && rows(m1.managerId, w1.serverId) === '1', first)
  const again = await contact(m1, w1)
  check('C5 second contact to the same worker → 409, no second email', again.status === 409 && again.json?.code === 'already_contacted' && await emailsTo(w1.email) === 1, again)
  const m2 = await verifiedManager('m2')
  check('C6 a different manager can still contact that worker', (await contact(m2, w1)).status === 200 && await emailsTo(w1.email) === 2)

  // Concurrent requests for the same pair
  const w2 = await visibleWorker('w2')
  const burst = await Promise.all(Array.from({ length: 8 }, () => contact(m1, w2)))
  const codes = burst.map(r => r.status).sort()
  check('C7 8 simultaneous requests, same pair → exactly one sent', codes.filter(c => c === 200).length === 1 && codes.filter(c => c === 409).length === 7
    && await emailsTo(w2.email) === 1 && rows(m1.managerId, w2.serverId) === '1', codes)

  // ── Daily limit (10 per rolling 24 h) under concurrency ──
  const m3 = await verifiedManager('m3')
  const many = []; for (let i = 0; i < 12; i++) many.push(await visibleWorker(`d${i}`))
  const dayBurst = await Promise.all(many.map(w => contact(m3, w)))
  const dc = dayBurst.map(r => r.status)
  let sent = 0; for (const w of many) sent += await emailsTo(w.email)
  check('C8 12 simultaneous contacts to different workers → exactly 10 sent, 2 refused (429)',
    dc.filter(c => c === 200).length === 10 && dc.filter(c => c === 429).length === 2 && sent === 10 && rows(m3.managerId) === '10', { dc, sent })
  sql(`update recruiting_contacts set created_at = now() - interval '25 hours' where manager_id = '${m3.managerId}'`)
  const later = many.find((w, i) => dc[i] === 429)
  check('C9 limit is a rolling 24 hours: older contacts stop counting', (await contact(m3, later)).status === 200)

  // ── Delivery outcomes ──
  const m4 = await verifiedManager('m4')
  const w4 = await visibleWorker('w4')
  const ok4 = await contact(m4, w4)
  const att4 = await attemptsTo(w4.email)
  const res4 = reservation(m4.managerId, w4.serverId).split('|')
  check('C10 confirmed send → sent_at and provider message id recorded; idempotency key = reservation id',
    ok4.status === 200 && res4[0] !== 'NULL' && res4[1] !== 'NULL'
    && att4.length === 1 && att4[0].idempotencyKey === `recruit/${sql(`select id from recruiting_contacts where manager_id = '${m4.managerId}'`)}`, { ok4, res4, att4 })

  // Definite rejection (4xx) → released, safe to retry
  const w5 = await visibleWorker('w5')
  await setResend('reject')
  const rej = await contact(m4, w5)
  await setResend('ok')
  check('C11 provider rejects (4xx) → 502 send_rejected, reservation released', rej.status === 502 && rej.json?.code === 'send_rejected' && rows(m4.managerId, w5.serverId) === '0', rej)
  check('C12 retry after a confirmed rejection succeeds', (await contact(m4, w5)).status === 200 && reservation(m4.managerId, w5.serverId).split('|')[0] !== 'NULL')

  // Ambiguous outcomes → kept unresolved, never auto-retried
  for (const [tag, mode] of [['C13', 'error500'], ['C14', 'drop'], ['C15', 'noid']]) {
    const w = await visibleWorker(`amb-${mode}`)
    await setResend(mode)
    const r = await contact(m4, w)
    await setResend('ok')
    const kept = reservation(m4.managerId, w.serverId)
    const id = sql(`select id from recruiting_contacts where manager_id = '${m4.managerId}' and server_id = '${w.serverId}'`)
    const again = await contact(m4, w)
    check(`${tag} provider ${mode} → 502 delivery_unconfirmed; reservation kept unresolved; retry refused; logged for reconciliation`,
      r.status === 502 && r.json?.code === 'delivery_unconfirmed' && kept === 'NULL|NULL' && again.status === 409
      && (await attemptsTo(w.email)).length === 1 && logHas(`RECONCILE reservation=${id} delivery unconfirmed`), { r, kept, again: again.status })
  }
  check('C16 unresolved reservations count toward the daily limit', rows(m4.managerId) === '5')

  // Bookkeeping failures are logged, never silently lost
  const w6 = await visibleWorker('w6')
  sql(`revoke delete on public.recruiting_contacts from service_role`)
  await setResend('reject')
  const relFail = await contact(m4, w6)
  await setResend('ok')
  sql(`grant delete on public.recruiting_contacts to service_role`)
  const id6 = sql(`select id from recruiting_contacts where manager_id = '${m4.managerId}' and server_id = '${w6.serverId}'`)
  check('C17 release fails after a rejection → reservation kept and logged RECONCILE', relFail.status === 502 && id6 !== '' && logHas(`RECONCILE reservation=${id6} rejected by provider but release failed`), { relFail, id6 })
  const w7 = await visibleWorker('w7')
  sql(`revoke update on public.recruiting_contacts from service_role`)
  const markFail = await contact(m4, w7)
  sql(`grant update on public.recruiting_contacts to service_role`)
  const id7 = sql(`select id from recruiting_contacts where manager_id = '${m4.managerId}' and server_id = '${w7.serverId}'`)
  check('C18 sent but sent_at update fails → success to manager, reservation kept, logged RECONCILE', markFail.status === 200
    && reservation(m4.managerId, w7.serverId) === 'NULL|NULL' && logHas(`RECONCILE reservation=${id7} sent`), { markFail })

  // Reconciliation query from the runbook finds exactly the unresolved rows
  sql(`update recruiting_contacts set created_at = created_at - interval '11 minutes' where manager_id = '${m4.managerId}'`)
  const unresolved = sql(`select count(*) from public.recruiting_contacts where sent_at is null and created_at < now() - interval '10 minutes' and manager_id = '${m4.managerId}'`)
  check('C19 runbook reconciliation query lists the 5 unresolved reservations (3 ambiguous, 1 failed release, 1 failed mark)', unresolved === '5', unresolved)

  // ── Still refused ──
  const hidden = await account('hidden')
  const hid = sql(`insert into servers (name, email, wallet_address) values ('Hidden Worker', '${hidden.email}', '${hidden.id}') returning id`).split('\n')[0]
  const h = await api('/api/contact-server', m4.token, { serverId: hid })
  check('C20 hidden worker → 404, nothing recorded or sent', h.status === 404 && sql(`select count(*) from recruiting_contacts where server_id = '${hid}'`) === '0' && await emailsTo(hidden.email) === 0, h)
  const unver = await account('unver')
  sql(`insert into restaurant_managers (email, name, restaurant_name, auth_id) values ('${unver.email}', 'U', 'Hiring Spot ${run}', '${unver.id}')`)
  check('C21 unverified manager → 403 (verification still required)', (await api('/api/contact-server', unver.token, { serverId: w4.serverId })).status === 403)

  // ── The record itself is server-only ──
  const r1 = await fetch(GW + '/rest/v1/recruiting_contacts?select=*', { headers: { apikey: ANON, authorization: `Bearer ${m1.token}` } })
  const r2 = await rest('POST', 'recruiting_contacts', m1.token, { manager_id: m1.managerId, server_id: w4.serverId })
  const r3 = await rest('DELETE', `recruiting_contacts?manager_id=eq.${m1.managerId}`, m1.token)
  const r4 = await fetch(GW + '/rest/v1/rpc/claim_recruiting_contact', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${m1.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ p_manager_id: m1.managerId, p_server_id: w4.serverId, p_daily_limit: 1000 }) })
  check('C22 managers cannot read, add, delete contact records or call the claim function',
    r1.status >= 400 && r2 >= 400 && r3 >= 400 && r4.status >= 400 && rows(m1.managerId) === '2', [r1.status, r2, r3, r4.status])

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
