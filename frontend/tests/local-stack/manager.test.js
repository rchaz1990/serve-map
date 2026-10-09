// Verified restaurant managers (migration 36) against the local real-database stack.
// Apply supabase-sql/security/36_verified_managers.sql to the local database first.
// usage: NODE_PATH=$(npm root -g) node manager.test.js <appUrl> <keys.json>
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const { anon: ANON } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))
// Runs as the database owner = what Slate does in the SQL Editor.
const sql = q => execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
const sqlTry = q => { try { execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-qAt', '-c', q], { encoding: 'utf8', stdio: 'pipe' }); return 'ok' } catch (e) { return String(e.stderr || e.message) } }
const run = `m${Date.now()}`
let n = 0
const email = tag => `${run}-${++n}-${tag}@example.com`
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300)) }

async function account(tag, provider = 'email') {
  const e = email(tag)
  const s = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: e, password: 'pass123456', provider }) })).json()
  return { email: e, id: s.user.id, token: s.access_token }
}
async function rest(method, path, token, body, prefer = 'return=representation') {
  const r = await fetch(GW + '/rest/v1/' + path, { method, headers: { apikey: ANON, authorization: `Bearer ${token || ANON}`, 'content-type': 'application/json', prefer }, body: body === undefined ? undefined : JSON.stringify(body) })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
async function api(path, token, body) {
  const r = await fetch(APP + path, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
async function worker(tag, venue, address) {
  const a = await account(tag)
  const id = sql(`insert into servers (name, email, wallet_address, open_to_opportunities) values ('Worker ${tag}', '${a.email}', '${a.id}', true) returning id`).split('\n')[0]
  sql(`insert into server_restaurants (server_id, restaurant_name, restaurant_address) values ('${id}', '${venue}', '${address}')`)
  return { ...a, serverId: id }
}
const VENUE = `Twin Bistro ${run}`
const ADDR_A = '1 A St, New York, NY 10001, USA'
const ADDR_B = '99 Z Ave, Brooklyn, NY 11201, USA'
const activeShifts = sid => sql(`select count(*) from shifts where server_id = '${sid}' and is_active`)
const startShift = (token, sid, venue) => rest('POST', 'shifts', token, { server_id: sid, restaurant_name: venue, started_at: new Date().toISOString(), is_active: true, activated_by: 'manager' }, 'return=minimal')
const endShifts = (token, sid) => rest('PATCH', `shifts?server_id=eq.${sid}&is_active=eq.true`, token, { is_active: false, ended_at: new Date().toISOString() }, 'return=minimal')

;(async () => {
  // Workers: same restaurant NAME at two different addresses, plus another venue.
  const wA = await worker('wA', VENUE, ADDR_A)
  const wB = await worker('wB', VENUE, ADDR_B)
  const wC = await worker('wC', `Other Place ${run}`, '5 C Rd, New York, NY 10002, USA')

  // Manager signs up and names the restaurant themselves (as the app does today).
  const mA = await account('mA')
  const ins = await rest('POST', 'restaurant_managers', mA.token, { email: mA.email, name: 'Mia Manager', restaurant_name: VENUE, auth_id: mA.id, role: 'Owner' }, 'return=minimal')
  check('M0 manager can still self-register (unverified)', ins.status === 201 && sql(`select (verified_at is null)::text from restaurant_managers where auth_id = '${mA.id}'`) === 'true', ins)

  // ── Before verification ──
  check('M1 unverified manager cannot start a worker\'s shift', (await startShift(mA.token, wA.serverId, VENUE)).status >= 400 && activeShifts(wA.serverId) === '0')
  await rest('POST', 'shifts', wA.token, { server_id: wA.serverId, restaurant_name: VENUE, started_at: new Date().toISOString(), is_active: true, activated_by: 'server' }, 'return=minimal')
  const endTry = await endShifts(mA.token, wA.serverId)
  check('M2 unverified manager cannot end a worker\'s shift', activeShifts(wA.serverId) === '1', endTry)
  check('M3 worker still starts/ends own shift', (await endShifts(wA.token, wA.serverId)).status < 300 && activeShifts(wA.serverId) === '0')

  // ── Users can never verify themselves ──
  const mX = await account('mX')
  const selfVerify = await rest('POST', 'restaurant_managers', mX.token, { email: mX.email, restaurant_name: VENUE, auth_id: mX.id, verified_at: new Date().toISOString(), verified_restaurant_name: VENUE, verified_restaurant_address: ADDR_A }, 'return=minimal')
  check('M4 sign-up cannot set verified fields', selfVerify.status >= 400 && sql(`select count(*) from restaurant_managers where auth_id = '${mX.id}'`) === '0', selfVerify)
  const patch = await rest('PATCH', `restaurant_managers?auth_id=eq.${mA.id}`, mA.token, { verified_at: new Date().toISOString(), verified_restaurant_address: ADDR_A })
  check('M5 manager cannot mark own row verified', patch.status >= 400 && sql(`select (verified_at is null)::text from restaurant_managers where auth_id = '${mA.id}'`) === 'true', patch)
  const rpc = await rest('POST', 'rpc/manager_controls', mA.token, { p_auth_id: mA.id, p_server_id: wA.serverId, p_restaurant: VENUE })
  check('M6 manager_controls not callable by users', rpc.status >= 400, rpc)
  const note = await rest('GET', 'restaurant_managers?select=verification_note&limit=1', mA.token)
  const pub = await rest('GET', `restaurant_managers?select=verified_at,verified_restaurant_name&auth_id=eq.${mA.id}`, null)
  check('M7 verification_note private; verification status public', note.status >= 400 && pub.status === 200 && pub.json?.length === 1, { note, pub })
  check('M8 verification requires both name and address', /restaurant_managers_verified_binding/.test(sqlTry(`update restaurant_managers set verified_at = now(), verified_restaurant_name = '${VENUE}' where auth_id = '${mA.id}'`)))

  // ── Slate verifies mA for the venue at ADDR_A ──
  sql(`update restaurant_managers set verified_at = now(), verified_restaurant_name = '${VENUE}', verified_restaurant_address = '${ADDR_A}', verification_note = 'local test' where auth_id = '${mA.id}'`)
  const okStart = await startShift(mA.token, wA.serverId, VENUE)
  check('M9 verified manager starts shift for worker at the verified venue', okStart.status < 300 && activeShifts(wA.serverId) === '1', okStart)
  check('M10 verified manager ends that shift', (await endShifts(mA.token, wA.serverId)).status < 300 && activeShifts(wA.serverId) === '0')
  const caseVar = await startShift(mA.token, wA.serverId, `  ${VENUE.toUpperCase().replace(' ', '   ')} `)
  check('M11 name matching ignores case/extra spaces', caseVar.status < 300, caseVar)
  await endShifts(mA.token, wA.serverId)

  check('M12 SAME NAME, different address: cannot start that worker\'s shift', (await startShift(mA.token, wB.serverId, VENUE)).status >= 400 && activeShifts(wB.serverId) === '0')
  await rest('POST', 'shifts', wB.token, { server_id: wB.serverId, restaurant_name: VENUE, started_at: new Date().toISOString(), is_active: true, activated_by: 'server' }, 'return=minimal')
  await endShifts(mA.token, wB.serverId)
  check('M13 SAME NAME, different address: cannot end that worker\'s shift', activeShifts(wB.serverId) === '1')
  await endShifts(wB.token, wB.serverId)
  check('M14 other venue\'s worker: cannot start shift', (await startShift(mA.token, wC.serverId, `Other Place ${run}`)).status >= 400)
  check('M15 own worker under another venue name: refused', (await startShift(mA.token, wA.serverId, `Other Place ${run}`)).status >= 400)

  // Second unverified manager naming the same venue gets nothing.
  const mB = await account('mB')
  await rest('POST', 'restaurant_managers', mB.token, { email: mB.email, name: 'Imposter', restaurant_name: VENUE, auth_id: mB.id }, 'return=minimal')
  check('M16 impostor naming the same venue: no control', (await startShift(mB.token, wA.serverId, VENUE)).status >= 400)

  // Waitlist row claimed with Google stays unverified.
  const g = email('gclaim')
  await rest('POST', 'restaurant_managers', null, { email: g, name: 'G', restaurant_name: VENUE }, 'return=minimal')
  const gs = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: g, provider: 'google' }) })).json()
  const claimed = await rest('POST', 'rpc/link_my_manager', gs.access_token, {})
  check('M17 Google waitlist claim works but stays unverified (no shift control)', Array.isArray(claimed.json) && claimed.json.length === 1
    && (await startShift(gs.access_token, wA.serverId, VENUE)).status >= 400, claimed)

  // ── Server routes ──
  const nUnver = await api('/api/notify-followers', mB.token, { serverId: wA.serverId, restaurantName: VENUE, type: 'shift_started' })
  check('M18 notify-followers: unverified manager → 403', nUnver.status === 403, nUnver)
  const nOther = await api('/api/notify-followers', mA.token, { serverId: wB.serverId, restaurantName: VENUE, type: 'shift_started' })
  check('M19 notify-followers: verified manager, same-name other venue → 403', nOther.status === 403, nOther)
  const nOk = await api('/api/notify-followers', mA.token, { serverId: wA.serverId, restaurantName: VENUE, type: 'shift_started' })
  check('M20 notify-followers: verified manager at own venue → allowed', nOk.status !== 403 && nOk.status !== 401, nOk)
  const nSelf = await api('/api/notify-followers', wB.token, { serverId: wB.serverId, restaurantName: VENUE, type: 'shift_started' })
  check('M21 notify-followers: worker for self still allowed', nSelf.status !== 403 && nSelf.status !== 401, nSelf)
  const cUnver = await api('/api/contact-server', mB.token, { serverId: wC.serverId })
  check('M22 contact-server: unverified manager → 403 pending verification', cUnver.status === 403 && /pending verification/i.test(cUnver.json?.error ?? ''), cUnver)
  const cOk = await api('/api/contact-server', mA.token, { serverId: wC.serverId })
  check('M23 contact-server: verified manager → allowed (past auth)', cOk.status !== 403 && cOk.status !== 401, cOk)

  // ── Dashboard ──
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  async function dashboardAs(acct) {
    const ctx = await browser.newContext()
    await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort())
    const page = await ctx.newPage()
    await page.goto(APP + '/restaurant/login', { waitUntil: 'networkidle', timeout: 120000 })
    await page.fill('input[placeholder="manager@restaurant.com"]', acct.email); await page.fill('input[placeholder="Your password"]', 'pass123456')
    await page.click('button:has-text("Sign in")'); await page.waitForURL('**/restaurant/dashboard', { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(3000)
    return page
  }
  const pu = await dashboardAs(mB)
  const toggleU = pu.locator('button[aria-label^="Start"]').first()
  check('M24 dashboard (unverified): "Pending verification" shown, shift toggle disabled',
    await pu.isVisible('[data-testid="pending-verification"]') && await toggleU.count() > 0 && await toggleU.isDisabled(), pu.url())
  const pv = await dashboardAs(mA)
  const body = (await pv.textContent('body')) ?? ''
  check('M25 dashboard (verified): no pending banner; only the verified venue\'s workers listed',
    !(await pv.isVisible('[data-testid="pending-verification"]')) && body.includes('Worker wA') && !body.includes('Worker wB'), pv.url())
  await pv.click('button[aria-label="Start Worker wA\'s shift"]'); await pv.waitForTimeout(1500)
  check('M26 dashboard (verified): toggle starts the shift', activeShifts(wA.serverId) === '1')
  await endShifts(mA.token, wA.serverId)
  await browser.close()

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
