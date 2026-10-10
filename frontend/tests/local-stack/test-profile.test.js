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
  check('G8 ratings: real→test and test→real refused (403 test_mix, nothing stored); test→test and real→real work',
    r1.status === 403 && r1.json?.code === 'test_mix' && r2.status === 403 && r3.status === 200 && r4.status === 200
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

  // Rollback and re-apply
  const rb = sqlFile(fs.readFileSync(path.join(__dirname, '../../supabase-sql/security/42_rollback_test_profile_guard.sql'), 'utf8'))
  const gone = sql(`select count(*) from pg_class where relname = 'test_accounts'`) === '0' && sql(`select count(*) from information_schema.columns where table_name = 'servers' and column_name = 'test_profile'`) === '0'
  const re = sqlFile(fs.readFileSync(path.join(__dirname, '../../supabase-sql/security/42_test_profile_guard.sql'), 'utf8'))
  check('G14 rollback removes everything 42 added; re-apply works', rb.ok && gone && re.ok, { rb: rb.out, re: re.out })

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
