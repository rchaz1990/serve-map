// PR #44 code running against a database WITHOUT migration 36 (the deploy window when
// code ships first). Proves the new code fails closed for managers before 36 runs.
// Requires the local database in its pre-36 state (36_rollback applied).
// usage: NODE_PATH=$(npm root -g) node manager-premigration.test.js <appUrl> <keys.json>
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const { anon: ANON } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))
const sql = q => execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
const run = `p${Date.now()}`
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

;(async () => {
  check('P0 database is in the pre-36 state', sql(`select count(*) from information_schema.columns where table_name = 'restaurant_managers' and column_name = 'verified_at'`) === '0')
  const VENUE = `Window Cafe ${run}`
  const w = await account('worker')
  const sid = sql(`insert into servers (name, email, wallet_address, open_to_opportunities) values ('Worker W', '${w.email}', '${w.id}', true) returning id`).split('\n')[0]
  sql(`insert into server_restaurants (server_id, restaurant_name, restaurant_address) values ('${sid}', '${VENUE}', '1 Window St, New York, NY')`)
  const m = await account('mgr')
  const ins = await fetch(GW + '/rest/v1/restaurant_managers', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${m.token}`, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({ email: m.email, name: 'Window Manager', restaurant_name: VENUE, auth_id: m.id }) })
  check('P1 self-typed manager row created (the old trust model would treat it as this venue\'s manager)', ins.status === 201)

  const nf = await api('/api/notify-followers', m.token, { serverId: sid, restaurantName: VENUE, type: 'shift_started' })
  check('P2 notify-followers refuses the unverified manager before 36 (old route allowed this)', nf.status === 403, nf)
  const cs = await api('/api/contact-server', m.token, { serverId: sid })
  check('P3 contact-server refuses before 36 (pending verification)', cs.status === 403 && /pending verification/i.test(cs.json?.error ?? ''), cs)
  const self = await api('/api/notify-followers', w.token, { serverId: sid, restaurantName: VENUE, type: 'shift_started' })
  check('P4 worker can still notify own followers', self.status !== 401 && self.status !== 403, self)

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  const ctx = await browser.newContext()
  await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort())
  const page = await ctx.newPage()
  await page.goto(APP + '/restaurant/login', { waitUntil: 'networkidle', timeout: 120000 })
  await page.fill('input[placeholder="manager@restaurant.com"]', m.email); await page.fill('input[placeholder="Your password"]', 'pass123456')
  await page.click('button:has-text("Sign in")'); await page.waitForURL('**/restaurant/dashboard', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(3000)
  const toggle = page.locator('button[aria-label^="Start"]').first()
  check('P5 dashboard loads before 36: pending banner, toggle disabled (no error page)',
    await page.isVisible('[data-testid="pending-verification"]') && await toggle.count() > 0 && await toggle.isDisabled(), page.url())
  await browser.close()

  // Not a check: the pre-36 database itself still trusts the self-typed name for shifts
  // (production today). Migration 36 closes it; run it right after the code deploys.
  const raw = await fetch(GW + '/rest/v1/shifts', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${m.token}`, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({ server_id: sid, restaurant_name: VENUE, started_at: new Date().toISOString(), is_active: true, activated_by: 'manager' }) })
  console.log(`INFO direct database shift insert by unverified manager before 36: HTTP ${raw.status} (closed by migration 36)`)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
