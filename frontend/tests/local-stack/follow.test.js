// Follow emails (migration 38): no third-party enrolment, explicit opt-in only.
// Needs 36 + 37 + 38 applied locally, and the app started with RESEND_BASE_URL pointing at
// the gateway (emails are recorded, not sent).
// usage: NODE_PATH=$(npm root -g) node follow.test.js <appUrl> <keys.json>
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const { anon: ANON } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))
const LEGAL_VERSION = fs.readFileSync(path.join(__dirname, '../../lib/legal.ts'), 'utf8').match(/LEGAL_VERSION = '([^']+)'/)[1]
const sql = q => execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
const run = `f${Date.now()}`
let n = 0
const email = tag => `${run}-${++n}-${tag}@example.com`
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300)) }

async function account(tag, opts = {}) {
  const e = email(tag)
  const s = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: e, password: 'pass123456', ...opts }) })).json()
  return { email: e, id: s.user.id, token: s.access_token }
}
async function api(p, token, body) {
  const r = await fetch(APP + p, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
async function rest(method, p, token, body) {
  const r = await fetch(GW + '/rest/v1/' + p, { method, headers: { apikey: ANON, authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'return=minimal' }, body: body === undefined ? undefined : JSON.stringify(body) })
  let text = ''; try { text = await r.text() } catch {}
  return { status: r.status, text }
}
const acknowledge = a => api('/api/legal/accept', a.token, { version: LEGAL_VERSION })
async function worker(tag, venue, approval = 'automatic') {
  const a = await account(tag)
  const id = sql(`insert into servers (name, email, wallet_address, follow_approval) values ('Worker ${tag}', '${a.email}', '${a.id}', '${approval}') returning id`).split('\n')[0]
  sql(`insert into server_restaurants (server_id, restaurant_name, restaurant_address) values ('${id}', '${venue}', '1 Notify St, New York, NY')`)
  return { ...a, serverId: id, venue }
}
const sentTo = async to => (await (await fetch(GW + '/__emails?to=' + encodeURIComponent(to))).json()).length
const follow = (a, w, extra = {}) => rest('POST', 'follows', a.token, { follower_id: a.id, server_id: w.serverId, follower_type: 'guest', ...extra })
const row = (a, w) => sql(`select follower_email || '|' || coalesce(email_opt_in_at::text, 'NULL') || '|' || status from follows where follower_id = '${a.id}' and server_id = '${w.serverId}'`)

;(async () => {
  const W = await worker('w', `Notify Bar ${run}`)

  // ── Third-party enrolment ──
  const a = await account('optin'); await acknowledge(a)
  const victim = `victim-${run}@example.com`
  const r1 = await follow(a, W, { follower_email: victim, notify_email: true })
  const ra = row(a, W).split('|')
  check('F1 client-supplied follower_email is ignored: stored address is the follower\'s own', r1.status < 300 && ra[0] === a.email.toLowerCase() && ra[1] !== 'NULL', { r1, ra })
  const up = await rest('PATCH', `follows?follower_id=eq.${a.id}`, a.token, { follower_email: victim })
  check('F2 follower cannot change follower_email afterwards', up.status >= 400 && row(a, W).startsWith(a.email.toLowerCase()), up)

  // ── Consent ──
  const b = await account('nooptin'); await acknowledge(b)
  const r2 = await follow(b, W)
  check('F3 follow without explicit email opt-in → saved, but not opted in', r2.status < 300 && row(b, W).split('|')[1] === 'NULL', r2)
  const c = await account('noterms')
  const r3 = await follow(c, W, { notify_email: true })
  check('F4 follow without a recorded Terms/Privacy acknowledgment → refused', r3.status >= 400 && /terms_not_accepted/.test(r3.text) && row(c, W) === '', r3)
  const d = await account('selfstamp'); await acknowledge(d)
  const r4 = await follow(d, W, { email_opt_in_at: new Date().toISOString() })
  check('F5 client cannot set email_opt_in_at directly', r4.status >= 400 && row(d, W) === '', r4)
  const rpc = await fetch(GW + '/rest/v1/rpc/notification_recipients', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${a.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ p_server_id: W.serverId }) })
  check('F6 users cannot list notification recipients', rpc.status >= 400, rpc.status)

  // ── Pre-38 rows (inserted with triggers off, as they exist in production today) ──
  const e1 = await account('legacyplain'); const e2 = await account('legacyopted')
  const spoof1 = `legacy-spoof1-${run}@example.com`, spoof2 = `legacy-spoof2-${run}@example.com`
  sql(`set session_replication_role = replica; insert into follows (follower_id, follower_email, server_id, follower_type, status) values ('${e1.id}', '${spoof1}', '${W.serverId}', 'guest', 'approved'); insert into follows (follower_id, follower_email, server_id, follower_type, status, email_opt_in_at, notify_email) values ('${e2.id}', '${spoof2}', '${W.serverId}', 'guest', 'approved', now(), true);`)

  // ── Send: the worker starts a shift ──
  const sent = await api('/api/notify-followers', W.token, { serverId: W.serverId, restaurantName: W.venue, type: 'shift_started' })
  const counts = {
    optedIn: await sentTo(a.email.toLowerCase()), victim: await sentTo(victim), notOptedIn: await sentTo(b.email.toLowerCase()),
    legacyPlainAccount: await sentTo(e1.email.toLowerCase()), legacyPlainSpoof: await sentTo(spoof1),
    legacyOptedAccount: await sentTo(e2.email.toLowerCase()), legacyOptedSpoof: await sentTo(spoof2),
  }
  check('F7 shift email goes to the opted-in follower\'s own address only (not the spoofed one)', sent.status === 200 && counts.optedIn === 1 && counts.victim === 0, { sent, counts })
  check('F8 follower who did not opt in gets no email', counts.notOptedIn === 0, counts)
  check('F9 existing follow without opt-in gets no email (neither account nor stored address)', counts.legacyPlainAccount === 0 && counts.legacyPlainSpoof === 0, counts)
  check('F10 even an opted-in row with a bad stored address emails the account address, never the stored one', counts.legacyOptedAccount === 1 && counts.legacyOptedSpoof === 0, counts)
  check('F11 notification records use account addresses only',
    sql(`select count(*) from notifications where server_id = '${W.serverId}' and recipient_email in ('${victim}', '${spoof1}', '${spoof2}')`) === '0'
    && sql(`select count(*) from notifications where server_id = '${W.serverId}'`) === '2')

  // Pending followers (approval mode) are not emailed
  const W2 = await worker('w2', `Approval Bar ${run}`, 'approval')
  const p1 = await account('pending'); await acknowledge(p1)
  await follow(p1, W2, { notify_email: true })
  await api('/api/notify-followers', W2.token, { serverId: W2.serverId, restaurantName: W2.venue, type: 'shift_started' })
  check('F12 pending (not yet approved) follower is not emailed', row(p1, W2).endsWith('|pending') && await sentTo(p1.email.toLowerCase()) === 0)

  // ── Workers never receive follower email addresses ──
  const named = await account('named', { data: { full_name: 'Gia Rossi' } }); await acknowledge(named)
  await follow(named, W, { notify_email: true })
  const direct = await fetch(GW + `/rest/v1/follows?select=follower_email&server_id=eq.${W.serverId}`, { headers: { apikey: ANON, authorization: `Bearer ${W.token}` } })
  const allowed = await fetch(GW + `/rest/v1/follows?select=id,status&server_id=eq.${W.serverId}`, { headers: { apikey: ANON, authorization: `Bearer ${W.token}` } })
  check('F14 worker cannot read follower email addresses directly (other follow columns still readable)', direct.status >= 400 && allowed.status === 200, [direct.status, allowed.status])
  const listRes = await fetch(APP + '/api/followers/approved', { headers: { authorization: `Bearer ${W.token}` } })
  const list = await listRes.json()
  const body = JSON.stringify(list)
  check('F15 followers list shows "first name + initial" or "Guest ····xxxx", and no email address anywhere',
    listRes.status === 200 && !body.includes('@') && list.followers.some(f => f.follower_label === 'Gia R.')
      && list.followers.some(f => /^Guest ····.{4}$/.test(f.follower_label)) && list.followers.every(f => !('follower_email' in f)), body.slice(0, 300))
  const pend = await (await fetch(APP + '/api/followers/pending', { headers: { authorization: `Bearer ${W2.token}` } })).json()
  check('F16 pending list (approval mode) also has no email address', !JSON.stringify(pend).includes('@') && pend.followers.length === 1, pend)

  // ── New Google account (no agreement yet): every consent-gated action is refused ──
  const goog = await account('google', { provider: 'google', data: { full_name: 'Gus Google' } })
  const target = await worker('w4', `Google Bar ${run}`)
  const gRate = await api('/api/submit-rating', goog.token, { serverId: target.serverId, score: 5 })
  const gFollow = await follow(goog, target, { notify_email: true })
  const gWorker = await api('/api/signup-server', goog.token, { name: 'Gus Google', restaurant: 'Somewhere', role: 'Server' })
  const gAccept = await api('/api/legal/accept', goog.token, {})
  check('F17 new Google user: rating refused without agreement', gRate.status === 400 && gRate.json?.code === 'legal_required', gRate)
  check('F18 new Google user: follow refused without agreement', gFollow.status >= 400 && /terms_not_accepted/.test(gFollow.text), gFollow)
  check('F19 new Google user: worker profile refused without agreement; agreement can\'t be recorded without the ticked version',
    gWorker.status === 400 && gAccept.status === 400, { gWorker, gAccept })

  // ── UI: profile follow by a guest with nothing on file ──
  const W3 = await worker('w3', `UI Bar ${run}`)
  const g = await account('uiguest')
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  const ctx = await browser.newContext()
  await ctx.route('**/*', rt => new URL(rt.request().url()).hostname === 'localhost' ? rt.continue() : rt.abort())
  const page = await ctx.newPage()
  await page.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 120000 })
  await page.fill('input[placeholder="Email address"]', g.email); await page.fill('input[placeholder="Password"]', 'pass123456')
  await page.click('button:has-text("Sign in")'); await page.waitForTimeout(2000)
  await page.goto(APP + `/server/${W3.serverId}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.click('button:has-text("Follow")'); await page.waitForTimeout(800)
  await page.check('[data-testid="follow-consent"] [data-testid="legal-consent"] input[type="checkbox"]')
  await page.click('button:has-text("Follow and email me")'); await page.waitForTimeout(1500)
  const ui = row(g, W3).split('|')
  check('F13 UI follow ("Follow and email me" after agreeing) → own address, opted in', ui[0] === g.email.toLowerCase() && ui[1] !== 'NULL' && ui[2] === 'approved', ui)
  await browser.close()

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
