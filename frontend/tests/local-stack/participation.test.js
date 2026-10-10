// Limited-test data policy: no stored coordinates, internal distance, worker agreement gate,
// manual deletion and coordinate-cleanup scripts. Local stack only (no production).
// Apply 36, 37, 38 and 39_participant_data_policy.sql to the local database first.
// usage: NODE_PATH=$(npm root -g) node participation.test.js <appUrl> <keys.json>
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
const sqlFile = (text, extra = []) => {
  try { return { ok: true, out: execFileSync('psql', [...PSQL, '-v', 'ON_ERROR_STOP=1', ...extra], { input: text, encoding: 'utf8', stdio: 'pipe' }) } }
  catch (e) { return { ok: false, out: String(e.stderr || e.message) } }
}
const MANUAL = path.join(__dirname, '../../supabase-sql/manual')
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
async function rest(method, p, token, body, prefer = 'return=minimal') {
  const r = await fetch(GW + '/rest/v1/' + p, { method, headers: { apikey: ANON, authorization: `Bearer ${token || ANON}`, 'content-type': 'application/json', prefer }, body: body === undefined ? undefined : JSON.stringify(body) })
  let text = ''; try { text = await r.text() } catch {}
  return { status: r.status, text }
}
async function api(p, token, body) {
  const r = await fetch(APP + p, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
async function worker(tag, venue, { agree = false, approval = 'automatic' } = {}) {
  const a = await account(tag)
  const id = sql(`insert into servers (name, email, wallet_address, follow_approval) values ('Wren ${tag}', '${a.email}', '${a.id}', '${approval}') returning id`).split('\n')[0]
  sql(`insert into server_restaurants (server_id, restaurant_name, restaurant_address) values ('${id}', '${venue}', '1 Policy St, New York, NY')`)
  if (agree) await api('/api/legal/accept', a.token, { version: LEGAL_VERSION, context: 'worker' })
  return { ...a, serverId: id, venue }
}
const workerVersion = id => sql(`select coalesce(raw_app_meta_data ->> 'legal_worker_version', '') from auth.users where id = '${id}'`)
const shift = (w, token, extra = {}) => rest('POST', 'shifts', token, { server_id: w.serverId, restaurant_name: w.venue, started_at: new Date().toISOString(), is_active: true, activated_by: 'server', ...extra })
const activeShifts = sid => sql(`select count(*) from shifts where server_id = '${sid}' and is_active`)
const sentTo = async to => (await (await fetch(GW + '/__emails?to=' + encodeURIComponent(to))).json()).length
async function optedInFollower(w) {
  const g = await account('follower')
  await api('/api/legal/accept', g.token, { version: LEGAL_VERSION })
  await rest('POST', 'follows', g.token, { follower_id: g.id, server_id: w.serverId, follower_type: 'guest', notify_email: true })
  return g
}

;(async () => {
  const VENUE = `Policy Bar ${run}`

  // ── 1. Coordinates are not stored; the check result is ──
  {
    const g = await account('vibe')
    const r = await api('/api/verify-vibe', g.token, { restaurantName: VENUE, vibe: 'LIVE', userLat: 40.7128, userLng: -74.006, restaurantLat: 40.7129, restaurantLng: -74.0061 })
    const row = sql(`select coalesce(user_lat::text,'NULL') || '|' || coalesce(user_lng::text,'NULL') || '|' || gps_verified || '|' || coalesce(distance_meters::text,'NULL') from vibe_reports where reported_by = '${g.email}'`)
    check('P1 vibe report: location check still passes and distance is kept, but no coordinates are stored',
      r.status === 200 && r.json?.gpsVerified === true && /^NULL\|NULL\|(t|true)\|\d+$/.test(row), { r, row })
  }

  // ── 2. Exact distance is internal; the result stays public ──
  {
    const g = await account('reader')
    const anonDist = await rest('GET', 'vibe_reports?select=distance_meters&limit=1', null)
    const authDist = await rest('GET', 'shifts?select=distance_meters&limit=1', g.token)
    const pub = await rest('GET', 'vibe_reports?select=id,gps_verified,integrity_score&limit=1', null)
    const pubShift = await rest('GET', 'shifts?select=id,gps_verified,restaurant_name&limit=1', null)
    check('P2 distance_meters not readable by anon or signed-in users (vibe reports, shifts)', anonDist.status >= 400 && authDist.status >= 400, { anonDist, authDist })
    check('P3 location-check result still public (gps_verified, integrity_score)', pub.status === 200 && pubShift.status === 200, { pub, pubShift })
  }

  // ── 3. Worker agreement gate (database + emails) ──
  const wNo = await worker('noagree', VENUE)
  const fNo = await optedInFollower(wNo)
  {
    const ins = await shift(wNo, wNo.token)
    check('P4 worker without the current agreement cannot start a shift (database refuses)', ins.status >= 400 && activeShifts(wNo.serverId) === '0', ins)
    const note = await api('/api/notify-followers', wNo.token, { serverId: wNo.serverId, restaurantName: VENUE, type: 'shift_started' })
    check('P5 …and cannot email followers (403 worker_terms_required, nothing sent)', note.status === 403 && note.json?.code === 'worker_terms_required' && await sentTo(fNo.email) === 0, note)
    // A shift that existed before the change can still be ended, not re-activated.
    sql(`insert into shifts (server_id, restaurant_name, is_active, activated_by) values ('${wNo.serverId}', '${VENUE}', true, 'server')`)
    const end = await rest('PATCH', `shifts?server_id=eq.${wNo.serverId}&is_active=eq.true`, wNo.token, { is_active: false, ended_at: new Date().toISOString() })
    check('P6 an existing active shift can still be ended', end.status < 300 && activeShifts(wNo.serverId) === '0', end)
    const re = await rest('PATCH', `shifts?server_id=eq.${wNo.serverId}`, wNo.token, { is_active: true })
    check('P7 …but an ended shift cannot be re-activated without the agreement', re.status >= 400 && activeShifts(wNo.serverId) === '0', re)
  }
  {
    const guest = await account('notworker')
    const r = await api('/api/legal/accept', guest.token, { version: LEGAL_VERSION, context: 'worker' })
    check('P8 worker agreement only accepted from an account that owns a worker profile', r.status === 403 && workerVersion(guest.id) === '', r)
    const unticked = await api('/api/legal/accept', wNo.token, { context: 'worker' })
    check('P9 worker agreement needs the explicit version (no implied consent)', unticked.status === 400 && workerVersion(wNo.id) === '', unticked)
  }
  {
    const ok = await api('/api/legal/accept', wNo.token, { version: LEGAL_VERSION, context: 'worker' })
    const coords = await shift(wNo, wNo.token, { user_lat: 40.7, user_lng: -74.0 })
    check('P10 after agreeing: recorded; a shift that tries to save coordinates is still refused', ok.status === 200 && workerVersion(wNo.id) === LEGAL_VERSION && coords.status >= 400 && activeShifts(wNo.serverId) === '0', { ok, coords })
    const ins = await shift(wNo, wNo.token, { gps_verified: true, distance_meters: 40 })
    const note = await api('/api/notify-followers', wNo.token, { serverId: wNo.serverId, restaurantName: VENUE, type: 'shift_started' })
    check('P11 after agreeing: shift starts (result + distance kept) and the opted-in follower is emailed',
      ins.status === 201 && activeShifts(wNo.serverId) === '1' && note.status === 200 && note.json?.notified === 1 && await sentTo(fNo.email) === 1, { ins, note })
  }

  // ── 4. Manager-started shifts and unclaimed profiles ──
  {
    const V2 = `Policy Two ${run}`, ADDR = '2 Policy St, New York, NY 10001, USA'
    const wM = await worker('mgrstaff', V2)
    sql(`update server_restaurants set restaurant_address = '${ADDR}' where server_id = '${wM.serverId}'`)
    const m = await account('manager')
    sql(`insert into restaurant_managers (email, name, restaurant_name, auth_id, verified_at, verified_restaurant_name, verified_restaurant_address) values ('${m.email}', 'Max Manager', '${V2}', '${m.id}', now(), '${V2}', '${ADDR}')`)
    const before = await shift(wM, m.token, { restaurant_name: V2, activated_by: 'manager' })
    check('P12 verified manager cannot start a shift for a worker who has not agreed', before.status >= 400 && activeShifts(wM.serverId) === '0', before)
    await api('/api/legal/accept', wM.token, { version: LEGAL_VERSION, context: 'worker' })
    const after = await shift(wM, m.token, { restaurant_name: V2, activated_by: 'manager' })
    check('P13 …and can once the worker has agreed', after.status === 201 && activeShifts(wM.serverId) === '1', after)

    const legacy = sql(`insert into servers (name, email, wallet_address) values ('Unclaimed ${run}', 'unclaimed-${run}@example.com', 'legacy-${run}') returning id`).split('\n')[0]
    sql(`insert into server_restaurants (server_id, restaurant_name, restaurant_address) values ('${legacy}', '${V2}', '${ADDR}')`)
    const ul = await rest('POST', 'shifts', m.token, { server_id: legacy, restaurant_name: V2, is_active: true, activated_by: 'manager' })
    const un = await api('/api/notify-followers', m.token, { serverId: legacy, restaurantName: V2, type: 'shift_started' })
    check('P14 unclaimed profile (no sign-in account): no shift can start and no follower email is sent', ul.status >= 400 && un.status === 403, { ul, un })
  }

  // ── 4b. New ratings only for workers who accepted (server-enforced) ──
  const rateApi = (a, w, extra = {}) => api('/api/submit-rating', a.token, { serverId: w.serverId, score: 5, legalAccepted: LEGAL_VERSION, ...extra })
  const status = async w => (await (await fetch(APP + '/api/rating-status?server=' + w.serverId)).json()).accepting
  const wClosed = await worker('closed', VENUE)
  {
    const g = await account('rater')
    const r = await rateApi(g, wClosed)
    check('P32 rating a worker who has not accepted is refused on the server (403), nothing stored; status says closed',
      r.status === 403 && r.json?.code === 'worker_not_accepting' && sql(`select count(*) from ratings where server_id = '${wClosed.serverId}'`) === '0' && await status(wClosed) === false, r)
    await api('/api/legal/accept', wClosed.token, { version: LEGAL_VERSION, context: 'worker' })
    const r2 = await rateApi(g, wClosed)
    check('P33 once the worker accepts: status open and the rating posts', r2.status === 200 && await status(wClosed) === true && sql(`select count(*) from ratings where server_id = '${wClosed.serverId}'`) === '1', r2)
  }

  // ── 5. Dashboard agreement step ──
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  async function signedIn(a) {
    const ctx = await browser.newContext()
    await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort())
    const page = await ctx.newPage()
    await page.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 120000 })
    await page.fill('input[placeholder="Email address"]', a.email); await page.fill('input[placeholder="Password"]', 'pass123456')
    await page.click('button:has-text("Sign in")'); await page.waitForTimeout(2500)
    await page.goto(APP + '/dashboard', { waitUntil: 'networkidle', timeout: 120000 }); await page.waitForTimeout(2500)
    return page
  }
  {
    const wUI = await worker('ui', VENUE)
    const page = await signedIn(wUI)
    const gate = await page.isVisible('[data-testid="worker-terms-gate"]')
    const box = page.locator('[data-testid="worker-terms-gate"] input[type="checkbox"]')
    const btn = page.locator('button:has-text("Agree and continue")')
    const disclosure = (await page.textContent('[data-testid="shift-disclosure"]').catch(() => '')) || ''
    check('P15 existing worker sees the agreement step (not the dashboard), box unticked, button disabled',
      gate && !(await box.isChecked()) && await btn.isDisabled(), { gate })
    check('P16 the step explains shifts are public and location is used on the phone only, not stored',
      /anyone can\s+see which venue/.test(disclosure) && /isn.t sent to Slate or stored/.test(disclosure), disclosure)
    await box.check(); await btn.click(); await page.waitForTimeout(2500)
    check('P17 after ticking and agreeing: recorded and the dashboard opens', workerVersion(wUI.id) === LEGAL_VERSION && !(await page.isVisible('[data-testid="worker-terms-gate"]')), workerVersion(wUI.id))
    await page.context().close()
    const wOk = await worker('agreed', VENUE, { agree: true })
    const p2 = await signedIn(wOk)
    check('P18 a worker who already agreed never sees the step', !(await p2.isVisible('[data-testid="worker-terms-gate"]')) && /Wren/.test((await p2.textContent('body')) || ''))
    await p2.context().close()
  }

  {
    const wNot = await worker('pagenotice', VENUE)
    const ctx = await browser.newContext()
    await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort())
    const page = await ctx.newPage()
    await page.goto(APP + `/rate?server=${wNot.serverId}`, { waitUntil: 'networkidle', timeout: 120000 }); await page.waitForTimeout(1500)
    await page.click('[aria-label="5 stars"]').catch(() => {})
    check('P34 rate page: tells the guest this server is not taking ratings and Submit stays disabled',
      await page.isVisible('[data-testid="ratings-closed"]') && await page.locator('button:has-text("Submit")').isDisabled())
    await ctx.close()
  }

  // ── 6. Public copy ──
  {
    const ctx = await browser.newContext(); const page = await ctx.newPage()
    const visible = async p => { await page.goto(APP + p, { waitUntil: 'networkidle', timeout: 120000 }); return (await page.textContent('body')) || '' }
    const privacy = await visible('/privacy'), terms = await visible('/terms')
    check('P19 Privacy: temporary location use vs stored result; distance internal; older records disclosed',
      /This use is temporary/.test(privacy) && /We do not store your coordinates/.test(privacy) && /which only Slate can see/.test(privacy) && /recorded before this change/.test(privacy))
    check('P20 Privacy: deletion within 30 days after verification; what is removed and what is kept',
      /within 30 days/.test(privacy) && /What we keep after deletion/.test(privacy) && /cannot be edited or deleted/.test(privacy) && /backups until they expire/.test(privacy))
    check('P21 Privacy: 90-day inactive-data review is manual; nothing deleted automatically',
      /inactive for 90 days/.test(privacy) && /Nothing is deleted automatically/.test(privacy))
    check('P22 Terms: coordinates not stored; existing workers agree before using the dashboard; rating deletion on request',
      /Your coordinates are used only for that check and are not stored/.test(terms) && /before you next use your dashboard/.test(terms) && /ask us to delete a rating you wrote/.test(terms))
    await ctx.close()
  }
  // ── 6b. One policy version; effective date from it ──
  {
    const m39 = fs.readFileSync(path.join(__dirname, '../../supabase-sql/security/39_participant_data_policy.sql'), 'utf8').match(/select '([^']+)'::text/)[1]
    const ctx = await browser.newContext(); const page = await ctx.newPage()
    const label = async p => { await page.goto(APP + p, { waitUntil: 'networkidle', timeout: 120000 }); return (await page.textContent('[data-testid="legal-effective"]')) || '' }
    const tl = await label('/terms'), pl = await label('/privacy'), privacy = (await page.textContent('body')) || ''
    check('P35 one version: app LEGAL_VERSION = migration 39 current_legal_version(); Terms and Privacy show the same effective date from it',
      m39 === LEGAL_VERSION && tl === pl && /^Effective /.test(tl), { m39, LEGAL_VERSION, tl, pl })
    check('P36 Privacy: points from a deleted guest rating stay with the worker; backups/provider records described without a promised expiry',
      /stay in the worker.s balance/.test(privacy) && /own retention practices, which we do not control/.test(privacy) && !/until they expire/.test(privacy))
    await ctx.close()
  }
  await browser.close()

  // ── 6c. Migration 40: profiles without an account are hidden until claimed ──
  {
    if (sql(`select count(*) from pg_policy where polname = 'servers_hide_unclaimed'`) === '0') {
      // Local data has many account-less test profiles; check the guard, then apply 40 with it set to the local count.
      const localN = sql(`select count(*) from servers s where s.wallet_address !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and not exists (select 1 from auth.users u where lower(u.email) = lower(s.email))`)
      const m40 = fs.readFileSync(path.join(__dirname, '../../supabase-sql/security/40_hide_unclaimed_profiles.sql'), 'utf8')
      const guard = sqlFile(m40)
      check('P37 migration 40 stops (changes nothing) when the number of account-less profiles is not exactly 2', localN === '2' || (!guard.ok && /expected 2 profiles/.test(guard.out) && sql(`select count(*) from information_schema.columns where table_name = 'servers' and column_name = 'hidden_until_claimed'`) === '0'), guard.out)
      const applied = sqlFile(m40.replace('if n <> 2 then', `if n <> ${localN} then`))
      check('P38 migration 40 applies', applied.ok, applied.out)
    }
    const hid = sql(`insert into servers (name, email, wallet_address, hidden_until_claimed) values ('Hidden ${run}', 'hidden-${run}@example.com', 'legacy-h-${run}', true) returning id`).split('\n')[0]
    sql(`insert into server_restaurants (server_id, restaurant_name, restaurant_address) values ('${hid}', '${VENUE}', '1 Policy St')`)
    const g = await account('viewer')
    const get = (p, t) => rest('GET', p, t, undefined, 'return=representation')
    const anonS = await get(`servers?select=id&id=eq.${hid}`, null)
    const authS = await get(`servers?select=id&id=eq.${hid}`, g.token)
    const anonSR = await get(`server_restaurants?select=server_id&server_id=eq.${hid}`, null)
    const others = await get(`servers?select=id&id=eq.${wClosed.serverId}`, null)
    check('P39 hidden profile and its workplaces are invisible to anon and signed-in users; other profiles unaffected',
      anonS.text === '[]' && authS.text === '[]' && anonSR.text === '[]' && others.text.includes(wClosed.serverId), { anonS, authS, anonSR })
    const r = await rateApi(g, { serverId: hid })
    check('P40 hidden profile cannot receive a rating', r.status === 403 || r.status === 404, r)
    const claimant = await account('claimant')
    sql(`update servers set wallet_address = '${claimant.id}' where id = '${hid}'`)
    const after = await get(`servers?select=id&id=eq.${hid}`, null)
    check('P41 once claimed (linked to an account) it reappears; ratings still wait for the worker agreement',
      after.text.includes(hid) && (await rateApi(g, { serverId: hid })).status === 403, after)
  }

  // ── 7. Manual deletion scripts ──
  const preview = fs.readFileSync(path.join(MANUAL, 'participant_deletion_preview.sql'), 'utf8')
  const del = fs.readFileSync(path.join(MANUAL, 'participant_deletion.sql'), 'utf8')
  const fill = (t, a) => t.replaceAll('PARTICIPANT_EMAIL', a.email).replaceAll('PARTICIPANT_AUTH_ID', a.id)
  function previewCounts(a) {
    const out = execFileSync('psql', [...PSQL, '--csv', '-q'], { input: fill(preview, a), encoding: 'utf8' }).trim().split('\n')
    const head = out[0].split(','), vals = out[1].split(',')
    return Object.fromEntries(head.map((h, i) => [h, vals[i]]))
  }
  function deletion(a, counts) {
    let t = fill(del, a)
    for (const [k, v] of Object.entries(counts)) t = t.replace(new RegExp(`e_${k} int := 0`), `e_${k} int := ${v}`)
    return sqlFile(t)
  }
  const keys = ['ratings_written', 'follows_made', 'notifications_received', 'vibe_reports', 'venue_comments', 'guest_points_rows',
    'ratings_on_profile', 'followers', 'notifications_about_profile', 'workplaces', 'shifts', 'suggestions']
  const pick = c => Object.fromEntries(keys.map(k => [k, Number(c[k])]))
  {
    const W = await worker('rated', VENUE, { agree: true })
    const G = await account('leaver')
    const other = await account('stayer')
    sql(`insert into ratings (server_id, score, comment, guest_email) values ('${W.serverId}', 1, 'leaver comment', '${G.email}'), ('${W.serverId}', 5, 'stays', '${other.email}')`)
    sql(`update servers set total_ratings = 2, average_rating = 3.0 where id = '${W.serverId}'`)
    sql(`insert into serve_ledger (source, source_id, account_type, account_id, email, amount, balance_after) values ('rating', '${run}-x', 'server', '${W.serverId}', '${W.email}', 10, 10)`)
    sql(`set session_replication_role = replica; insert into follows (follower_id, follower_email, server_id, follower_type, status) values ('${G.id}', '${G.email}', '${W.serverId}', 'guest', 'approved')`)
    sql(`update servers set follower_count = 1 where id = '${W.serverId}'`)
    sql(`insert into notifications (recipient_email, type, title, message, server_id) values ('${G.email}', 'shift_started', 't', 'm', '${W.serverId}')`)
    sql(`insert into vibe_reports (restaurant_name, vibe, reported_by, user_lat, user_lng) values ('${VENUE}', 'LIVE', '${G.email}', 40.7, -74.0)`)
    sql(`insert into venue_comments (restaurant_name, comment, commenter_email, commenter_name) values ('${VENUE}', 'hi', '${G.email}', 'Leaver')`)
    sql(`insert into guest_rewards (email, slate_points) values ('${G.email}', 7)`)
    const c = previewCounts(G)
    check('P23 preview (read-only) finds the guest\'s rating, follow, notification, vibe report, comment and points',
      c.account_matches === '1' && c.worker_profiles === '0' && c.ratings_written === '1' && c.follows_made === '1' && c.notifications_received === '1'
        && c.vibe_reports === '1' && c.venue_comments === '1' && c.guest_points_rows === '1', c)
    const wrong = deletion(G, { ...pick(c), ratings_written: 2 })
    const still = previewCounts(G)
    check('P24 a count that differs from the preview stops the deletion; nothing is removed', !wrong.ok && /ratings_written/.test(wrong.out) && still.ratings_written === '1' && still.vibe_reports === '1', wrong.out)
    const ok = deletion(G, pick(c))
    const after = previewCounts(G)
    const agg = sql(`select total_ratings || '|' || average_rating || '|' || follower_count from servers where id = '${W.serverId}'`)
    check('P25 guest deletion removes all their rows; the worker\'s rating and follower count are recalculated',
      ok.ok && keys.slice(0, 6).every(k => after[k] === '0') && agg === '1|5.0|0', { out: ok.out, after, agg })
    check('P26 the other guest\'s rating and the worker\'s points-ledger row are untouched', sql(`select count(*) from ratings where guest_email = '${other.email}'`) === '1'
      && sql(`select count(*) from serve_ledger where account_id = '${W.serverId}'`) === '1')
  }
  {
    const W2 = await worker('leaving', VENUE, { agree: true })
    const F = await account('fan')
    sql(`insert into shifts (server_id, restaurant_name, is_active) values ('${W2.serverId}', '${VENUE}', false)`)
    sql(`insert into ratings (server_id, score, guest_email) values ('${W2.serverId}', 4, '${F.email}')`)
    sql(`set session_replication_role = replica; insert into follows (follower_id, follower_email, server_id, follower_type, status) values ('${F.id}', '${F.email}', '${W2.serverId}', 'guest', 'approved')`)
    sql(`insert into notifications (recipient_email, type, title, message, server_id) values ('${F.email}', 'shift_started', 't', 'm', '${W2.serverId}')`)
    sql(`insert into qr_scans (server_id, session_id) values ('${W2.serverId}', 's')`)
    sql(`insert into serve_ledger (source, source_id, account_type, account_id, email, amount, balance_after) values ('rating', '${run}-y', 'server', '${W2.serverId}', '${W2.email}', 10, 10)`)
    const c = previewCounts(W2)
    check('P27 worker preview: profile, workplace, shift, follower, rating, notification, cascades and kept ledger row',
      c.worker_profiles === '1' && c.workplaces === '1' && c.shifts === '1' && c.followers === '1' && c.ratings_on_profile === '1'
        && c.notifications_about_profile === '1' && c.qr_scans_cascade === '1' && c.ledger_rows_kept === '1', c)
    const ok = deletion(W2, pick(c))
    const gone = sql(`select (select count(*) from servers where id = '${W2.serverId}') + (select count(*) from shifts where server_id = '${W2.serverId}') + (select count(*) from qr_scans where server_id = '${W2.serverId}') + (select count(*) from follows where server_id = '${W2.serverId}') + (select count(*) from ratings where server_id = '${W2.serverId}')`)
    check('P28 worker deletion removes the profile and everything attached; the append-only ledger row remains',
      ok.ok && gone === '0' && sql(`select count(*) from serve_ledger where account_id = '${W2.serverId}'`) === '1', { out: ok.out, gone })
    const M = await account('mgr2')
    sql(`insert into restaurant_managers (email, name, restaurant_name, auth_id) values ('${M.email}', 'M', 'X', '${M.id}')`)
    const mgr = deletion(M, {})
    check('P29 manager accounts are refused by the procedure', !mgr.ok && /restaurant manager/.test(mgr.out), mgr.out)
  }

  // ── 8. Coordinate cleanup script (local data only) ──
  {
    const cleanup = fs.readFileSync(path.join(MANUAL, 'location_coordinate_cleanup.sql'), 'utf8')
    // Older-style rows that still carry coordinates (inserted directly, as before this change).
    sql(`insert into vibe_reports (restaurant_name, vibe, reported_by, gps_verified, user_lat, user_lng) values ('${VENUE}', 'LIVE', 'old-${run}@example.com', true, 40.7, -74.0)`)
    const wOld = await worker('oldshift', VENUE)
    sql(`insert into shifts (server_id, restaurant_name, is_active, user_lat, user_lng) values ('${wOld.serverId}', '${VENUE}', false, 40.7, -74.0)`)
    const v = sql(`select count(*) from vibe_reports where user_lat is not null or user_lng is not null`)
    const s = sql(`select count(*) from shifts where user_lat is not null or user_lng is not null`)
    const verified = sql(`select count(*) from vibe_reports where gps_verified`)
    const bad = sqlFile(cleanup.replace('e_vibe int := 152', `e_vibe int := ${Number(v) + 1}`).replace('e_shift int := 29', `e_shift int := ${s}`))
    check('P30 cleanup with unexpected counts changes nothing', !bad.ok && sql(`select count(*) from vibe_reports where user_lat is not null or user_lng is not null`) === v, bad.out)
    const good = sqlFile(cleanup.replace('e_vibe int := 152', `e_vibe int := ${v}`).replace('e_shift int := 29', `e_shift int := ${s}`))
    check('P31 cleanup clears all stored coordinates and keeps location-check results',
      good.ok && Number(v) > 0 && Number(s) > 0 && sql(`select count(*) from vibe_reports where user_lat is not null or user_lng is not null`) === '0'
        && sql(`select count(*) from shifts where user_lat is not null or user_lng is not null`) === '0' && sql(`select count(*) from vibe_reports where gps_verified`) === verified, { out: good.out, v, s })
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
