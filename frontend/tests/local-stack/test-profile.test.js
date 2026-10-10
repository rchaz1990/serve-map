// Test worker profiles are invisible to the public and never mix with real users (migration 42).
// Local stack only. Applies 42 to the local database if it isn't there yet.
// usage: NODE_PATH=$(npm root -g) node test-profile.test.js <appUrl> <keys.json>
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const LEGAL_VERSION = fs.readFileSync(path.join(__dirname, '../../lib/legal.ts'), 'utf8').match(/LEGAL_VERSION = '([^']+)'/)[1]
const { anon: ANON } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))
const PSQL = ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB]
const sql = q => execFileSync('psql', [...PSQL, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
const sqlFile = t => { try { return { ok: true, out: execFileSync('psql', [...PSQL, '-v', 'ON_ERROR_STOP=1', '-q'], { input: t, encoding: 'utf8', stdio: 'pipe' }) } } catch (e) { return { ok: false, out: String(e.stderr || e.message) } } }
const run = `t${Date.now()}`
let n = 0
const email = tag => `${run}-${++n}-${tag}@example.com`
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300)) }

async function account(tag, { tester = false } = {}) {
  const e = email(tag)
  if (tester) sql(`insert into test_accounts (email, note) values ('${e}', 'local test')`)
  const s = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: e, password: 'pass123456' }) })).json()
  return { email: e, id: s.user.id, token: s.access_token }
}
async function rest(method, p, token, body, prefer = 'return=representation') {
  const r = await fetch(GW + '/rest/v1/' + p, { method, headers: { apikey: ANON, authorization: `Bearer ${token || ANON}`, 'content-type': 'application/json', prefer }, body: body === undefined ? undefined : JSON.stringify(body) })
  let text = ''; try { text = await r.text() } catch {}
  return { status: r.status, text }
}
async function api(p, token, body) {
  const r = await fetch(APP + p, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
const VENUE = `Guard Bar ${run}`
async function signupWorker(a) {
  const r = await api('/api/signup-server', a.token, { name: `Tess ${a.email.split('-')[2]}`, restaurant: VENUE, role: 'Server', legalAccepted: LEGAL_VERSION })
  const id = sql(`select id from servers where wallet_address = '${a.id}'`)
  return { ...a, r, serverId: id }
}
// Column-level grants: select only public columns (id / server_id), as the app does.
const COLS = { servers: 'id', server_restaurants: 'server_id', shifts: 'server_id', ratings: 'server_id' }
const visible = async (table, filter, token) => (await rest('GET', `${table}?select=${COLS[table]}&${filter}`, token)).text
const agreeGuest = a => api('/api/legal/accept', a.token, { version: LEGAL_VERSION })
const follow = (a, w) => rest('POST', 'follows', a.token, { follower_id: a.id, server_id: w.serverId, follower_type: 'guest', notify_email: true }, 'return=minimal')
const rate = (a, w) => api('/api/submit-rating', a.token, { serverId: w.serverId, score: 5, legalAccepted: LEGAL_VERSION })

;(async () => {
  if (sql(`select count(*) from pg_class where relname = 'test_accounts'`) === '0') {
    const m = sqlFile(fs.readFileSync(path.join(__dirname, '../../supabase-sql/security/42_test_profile_guard.sql'), 'utf8'))
    check('G0 migration 42 applies', m.ok, m.out)
  }
  check('G1 nothing is marked as a test profile until an email is listed', sql(`select count(*) from servers where test_profile and wallet_address in (select id::text from auth.users where email not in (select email from test_accounts))`) === '0')

  const tw = await signupWorker(await account('testworker', { tester: true }))
  const rw = await signupWorker(await account('realworker'))
  check('G2 authorized test account completes worker sign-up; profile marked test by the database; real sign-up unchanged',
    tw.r.status === 200 && sql(`select test_profile from servers where id = '${tw.serverId}'`) === 't' && rw.r.status === 200 && sql(`select test_profile from servers where id = '${rw.serverId}'`) === 'f', { tw: tw.r, rw: rw.r })

  const realGuest = await account('realguest'); await agreeGuest(realGuest)
  const tester = await account('testguest', { tester: true }); await agreeGuest(tester)

  // Visibility
  sql(`insert into shifts (server_id, restaurant_name, is_active) values ('${tw.serverId}', '${VENUE}', true), ('${rw.serverId}', '${VENUE}', true)`)
  for (const [who, tok] of [['anon', null], ['real signed-in user', realGuest.token]]) {
    const s = await visible('servers', `id=eq.${tw.serverId}`, tok), sr = await visible('server_restaurants', `server_id=eq.${tw.serverId}`, tok)
    const sh = await visible('shifts', `server_id=eq.${tw.serverId}`, tok)
    const venueStaff = await visible('server_restaurants', `restaurant_name=eq.${encodeURIComponent(VENUE)}`, tok)
    check(`G3 ${who}: test profile, its workplace, shifts and venue staff entry are invisible; the real worker at the same venue is visible`,
      s === '[]' && sr === '[]' && sh === '[]' && !venueStaff.includes(tw.serverId) && venueStaff.includes(rw.serverId), { s, sr, sh, venueStaff })
  }
  const own = await visible('servers', `id=eq.${tw.serverId}`, tw.token), other = await visible('servers', `id=eq.${tw.serverId}`, tester.token)
  check('G4 the owner and other authorized test accounts can see the test profile', own.includes(tw.serverId) && other.includes(tw.serverId), { own, other })

  // Clients cannot change the flag
  const off = await rest('PATCH', `servers?id=eq.${tw.serverId}`, tw.token, { test_profile: false })
  const on = await rest('PATCH', `servers?id=eq.${rw.serverId}`, rw.token, { test_profile: true })
  const selfFlag = await rest('PATCH', `servers?id=eq.${rw.serverId}`, rw.token, { bio: 'still public' }, 'return=minimal')
  check('G5 nobody can set or clear test_profile from the app; normal profile edits still work and do not change it',
    off.status >= 400 && on.status >= 400 && selfFlag.status < 300 && sql(`select test_profile from servers where id = '${tw.serverId}'`) === 't' && sql(`select test_profile from servers where id = '${rw.serverId}'`) === 'f', { off, on, selfFlag })
  check('G6 test_accounts is not readable by app users', (await rest('GET', 'test_accounts?select=email', tester.token)).status >= 400 && (await rest('GET', 'test_accounts?select=email', null)).status >= 400)

  // No mixing: follows
  const f1 = await follow(realGuest, tw), f2 = await follow(tester, rw), f3 = await follow(tester, tw), f4 = await follow(realGuest, rw)
  check('G7 follows: real→test and test→real refused; test→test and real→real work',
    f1.status >= 400 && f2.status >= 400 && f3.status === 201 && f4.status === 201, { f1, f2, f3, f4 })

  // No mixing: ratings
  const r1 = await rate(realGuest, tw), r2 = await rate(tester, rw), r3 = await rate(tester, tw), r4 = await rate(realGuest, rw)
  check('G8 ratings: real→test answered as not found (404), test→real refused (403 test_mix), nothing stored; test→test and real→real work',
    r1.status === 404 && r2.status === 403 && r2.json?.code === 'test_mix' && r3.status === 200 && r4.status === 200
      && sql(`select count(*) from ratings where server_id = '${rw.serverId}'`) === '1' && sql(`select count(*) from ratings where server_id = '${tw.serverId}'`) === '1', { r1, r2, r3, r4 })
  const realRatingsOfTest = await visible('ratings', `server_id=eq.${tw.serverId}`, null)
  check('G9 the test profile\'s rating is invisible to the public, visible to testers; the real worker\'s points and totals reflect only real ratings',
    realRatingsOfTest === '[]' && (await visible('ratings', `server_id=eq.${tw.serverId}`, tester.token)).includes(tw.serverId)
      && sql(`select total_ratings from servers where id = '${rw.serverId}'`) === '1')

  // Shift emails from a test worker reach only test followers
  const note = await api('/api/notify-followers', tw.token, { serverId: tw.serverId, restaurantName: VENUE, type: 'shift_started' })
  const sent = await (await fetch(GW + '/__emails?to=' + encodeURIComponent(tester.email))).json()
  const sentReal = await (await fetch(GW + '/__emails?to=' + encodeURIComponent(realGuest.email))).json()
  check('G10 a test worker\'s shift email goes to its test follower only', note.status === 200 && sent.length === 1 && sentReal.length === 0, note)

  // /api/rating-status and /api/track-scan (service-role routes)
  {
    const status = async (w, tok) => { const r = await fetch(APP + '/api/rating-status?server=' + w.serverId, { headers: tok ? { authorization: `Bearer ${tok}` } : {} }); return { status: r.status, json: await r.json().catch(() => null) } }
    const unknown = { serverId: '00000000-0000-4000-8000-000000000000' }
    const sAnon = await status(tw, null), sReal = await status(tw, realGuest.token), sTester = await status(tw, tester.token), sUnknown = await status(unknown, null), sRealWorker = await status(rw, null)
    check('G15 rating-status: a test profile looks exactly like an unknown id (404, accepting false) to anonymous and real users; testers get the real answer; real workers unchanged',
      sAnon.status === 404 && sReal.status === 404 && sAnon.json?.accepting === false && sUnknown.status === 404 && JSON.stringify(sAnon.json) === JSON.stringify(sUnknown.json)
        && sTester.status === 200 && sTester.json?.accepting === true && sRealWorker.status === 200 && sRealWorker.json?.accepting === true, { sAnon, sReal, sTester, sUnknown, sRealWorker })
    const scan = async (w, tok, isTest = false) => { const r = await fetch(APP + '/api/track-scan', { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify({ serverId: w.serverId, sessionId: `s-${run}`, isTest }) }); return r.status }
    const scans = w => sql(`select count(*) || '|' || count(*) filter (where is_test) from qr_scans where server_id = '${w.serverId}'`)
    const a1 = await scan(tw, null), a2 = await scan(tw, null, true), a3 = await scan(tw, realGuest.token, true)
    check('G16 track-scan: anonymous or real-user scans of a test profile are refused (404) and not recorded, even with isTest=true', a1 === 404 && a2 === 404 && a3 === 404 && scans(tw) === '0|0', { a1, a2, a3, rows: scans(tw) })
    const t1 = await scan(tw, tester.token, false), r1 = await scan(rw, null, false)
    check('G17 track-scan: a test account\'s scan of a test profile is recorded (always labelled test); anonymous scans of real workers unchanged',
      t1 === 200 && scans(tw) === '1|1' && r1 === 200 && scans(rw) === '1|0', { t1, r1, tw: scans(tw), rw: scans(rw) })
  }

  // Notification isolation when a profile with real followers becomes a test profile
  {
    const w = await signupWorker(await account('mixedworker'))
    const realFan = await account('realfan'); await agreeGuest(realFan)
    const f = await follow(realFan, w)
    sql(`insert into test_accounts (email) values ('${w.email}')`)
    const testFan = await account('testfan', { tester: true })
    sql(`set session_replication_role = replica; insert into follows (follower_id, follower_email, server_id, follower_type, status, notify_email, email_opt_in_at) values ('${testFan.id}', '${testFan.email}', '${w.serverId}', 'guest', 'approved', true, now())`)
    const blocked = await api('/api/notify-followers', w.token, { serverId: w.serverId, restaurantName: VENUE, type: 'shift_started' })
    const sentAny = (await (await fetch(GW + '/__emails?to=' + encodeURIComponent(realFan.email))).json()).length + (await (await fetch(GW + '/__emails?to=' + encodeURIComponent(testFan.email))).json()).length
    check('G18 a test profile with a pre-existing real follower: notify fails closed (409), no email to anyone, nothing stored',
      f.status === 201 && blocked.status === 409 && blocked.json?.code === 'test_mix' && sentAny === 0 && sql(`select count(*) from notifications where server_id = '${w.serverId}'`) === '0', { f, blocked, sentAny })
    sql(`delete from follows where server_id = '${w.serverId}' and follower_id = '${realFan.id}'`)
    const ok = await api('/api/notify-followers', w.token, { serverId: w.serverId, restaurantName: VENUE, type: 'shift_started' })
    check('G19 once only test followers remain, the email reaches the test follower only',
      ok.status === 200 && ok.json?.notified === 1 && (await (await fetch(GW + '/__emails?to=' + encodeURIComponent(realFan.email))).json()).length === 0, ok)
  }

  // Listing an existing account later hides its existing profile
  const later = await signupWorker(await account('latertester'))
  const before = await visible('servers', `id=eq.${later.serverId}`, null)
  sql(`insert into test_accounts (email) values ('${later.email}')`)
  const after = await visible('servers', `id=eq.${later.serverId}`, null)
  check('G11 adding an existing account to test_accounts hides its existing profile immediately', before.includes(later.serverId) && after === '[]', { before, after })

  // Pages
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  const ctx = await browser.newContext()
  await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort())
  const page = await ctx.newPage()
  const body = async p => { await page.goto(APP + p, { waitUntil: 'networkidle', timeout: 120000 }); await page.waitForTimeout(1500); return (await page.textContent('body')) || '' }
  const rateTxt = await body(`/rate?server=${tw.serverId}`), profileTxt = await body(`/server/${tw.serverId}`), venueTxt = await body(`/venue/${encodeURIComponent(VENUE)}`)
  const name = sql(`select name from servers where id = '${tw.serverId}'`)
  check('G12 anonymous visitor: rate page, profile page and venue page never show the test profile',
    !rateTxt.includes(name) && /not found/i.test(rateTxt) && !profileTxt.includes(name) && !venueTxt.includes(name), { name })
  const realName = sql(`select name from servers where id = '${rw.serverId}'`)
  check('G13 real worker\'s public pages unchanged', (await body(`/server/${rw.serverId}`)).includes(realName.split(' ')[0]))
  await browser.close()

  // Rollback safety
  {
    const m42 = path.join(__dirname, '../../supabase-sql/security/42_test_profile_guard.sql')
    const rbFile = path.join(__dirname, '../../supabase-sql/security/42_rollback_test_profile_guard.sql')
    const stillThere = () => sql(`select count(*) from pg_class where relname = 'test_accounts'`) === '1' && sql(`select count(*) from pg_policy where polname = 'servers_hide_test'`) === '1'
    const refused = sqlFile(fs.readFileSync(rbFile, 'utf8'))
    check('G20 rollback refuses while test profiles exist, and changes nothing (profiles stay hidden)',
      !refused.ok && /test profiles still exist/.test(refused.out) && stillThere() && (await visible('servers', `id=eq.${tw.serverId}`, null)) === '[]', refused.out)
    // Local stand-in for the approved deletion procedure: remove every test profile, then empty the list.
    const ids = `(select id from servers where test_profile)`
    sql(`delete from follows where server_id in ${ids}; delete from notifications where server_id in ${ids}; delete from ratings where server_id in ${ids}; delete from shifts where server_id in ${ids}; delete from server_restaurants where server_id in ${ids}; delete from suggestions where server_id in ${ids}; delete from servers where test_profile;`)
    const refused2 = sqlFile(fs.readFileSync(rbFile, 'utf8'))
    check('G21 rollback still refuses while test_accounts lists accounts', !refused2.ok && /test_accounts is not empty/.test(refused2.out) && stillThere(), refused2.out)
    sql(`delete from test_accounts`)
    const rb = sqlFile(fs.readFileSync(rbFile, 'utf8'))
    const gone = sql(`select count(*) from pg_class where relname = 'test_accounts'`) === '0' && sql(`select count(*) from information_schema.columns where table_name = 'servers' and column_name = 'test_profile'`) === '0'
    const re = sqlFile(fs.readFileSync(m42, 'utf8'))
    check('G22 with no test profiles and an empty list, rollback removes everything 42 added; re-apply works', rb.ok && gone && re.ok, { rb: rb.out, re: re.out })
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
