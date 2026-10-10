// Early-test scope lock (PR-A): paused features refused for every role, the rating's account
// identifier private, no shift distance, no QR-scan record, clearer used-link message.
// Criteria: docs/EARLY_TEST_ACCEPTANCE_CRITERIA.md (S1–S11, requirement 7).
// Local stack only. Applies 43 (and later 43b) to the local database if missing.
// usage: NODE_PATH=$(npm root -g) node scope-lock.test.js <appUrl> <keys.json>
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const LEGAL_VERSION = fs.readFileSync(path.join(__dirname, '../../lib/legal.ts'), 'utf8').match(/LEGAL_VERSION = '([^']+)'/)[1]
const { anon: ANON, service: SERVICE } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))
const PSQL = ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB]
const sql = q => execFileSync('psql', [...PSQL, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
const sqlFile = f => { try { return { ok: true, out: execFileSync('psql', [...PSQL, '-v', 'ON_ERROR_STOP=1', '-q', '-f', path.join(__dirname, '../../supabase-sql/security', f)], { encoding: 'utf8', stdio: 'pipe' }) } } catch (e) { return { ok: false, out: String(e.stderr || e.message) } } }
const run = `sl${Date.now()}`
let n = 0
const email = tag => `${run}-${++n}-${tag}@example.com`
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 400)) }

async function account(tag) {
  const e = email(tag)
  const s = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: e, password: 'pass123456' }) })).json()
  return { email: e, id: s.user.id, token: s.access_token }
}
async function rest(method, p, token, body, prefer = 'return=representation') {
  const key = token === SERVICE ? SERVICE : ANON
  const r = await fetch(GW + '/rest/v1/' + p, { method, headers: { apikey: key, authorization: `Bearer ${token || ANON}`, 'content-type': 'application/json', prefer }, body: body === undefined ? undefined : JSON.stringify(body) })
  let text = ''; try { text = await r.text() } catch {}
  return { status: r.status, text }
}
async function api(p, token, body) {
  const r = await fetch(APP + p, { method: 'POST', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' }, body: JSON.stringify(body) })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
const VENUE = `Lock Bar ${run}`
async function worker(tag) {
  const a = await account(tag)
  await api('/api/signup-server', a.token, { name: `Wren ${tag}`, restaurant: VENUE, role: 'Server', legalAccepted: LEGAL_VERSION })
  return { ...a, serverId: sql(`select id from servers where wallet_address = '${a.id}'`) }
}
const count = q => Number(sql(`select count(*) from ${q}`))
const refused = r => r.status >= 400

;(async () => {
  if (sql(`select count(*) from pg_proc where proname = 'my_ratings'`) === '0') {
    const m = sqlFile('43_scope_lock.sql'); check('S0 migration 43 applies', m.ok, m.out)
  }
  if (sql(`select has_column_privilege('anon','public.ratings','guest_id','SELECT')`) === 'f') {
    const m = sqlFile('43b_rollback_rating_identifier_private.sql'); check('S0b reset: 43b rolled back for the pre-43b phase', m.ok, m.out)
  }

  const W = await worker('w')
  const G = await account('guest'), O = await account('other')
  const rated = await api('/api/submit-rating', G.token, { serverId: W.serverId, score: 5, legalAccepted: LEGAL_VERSION })
  const ratingId = sql(`select id from ratings where server_id = '${W.serverId}'`)
  check('S-setup rating still submits; server still records the rater internally',
    rated.status === 200 && sql(`select guest_id from ratings where id = '${ratingId}'`) === G.id, rated)

  // ── S6: paused features refused for every role ─────────────────────────────
  {
    const byGuest = await rest('POST', 'follows', G.token, { follower_id: G.id, server_id: W.serverId, follower_type: 'guest', notify_email: true }, 'return=minimal')
    const bySvc = await rest('POST', 'follows', SERVICE, { follower_id: G.id, follower_email: G.email, server_id: W.serverId, follower_type: 'guest', notify_email: true }, 'return=minimal')
    check('S6a new follow refused (signed-in guest and service role), nothing saved',
      refused(byGuest) && /feature_paused:follows/.test(byGuest.text) && refused(bySvc) && count(`follows where server_id = '${W.serverId}'`) === 0, { byGuest, bySvc })
    const vibeApi = await api('/api/verify-vibe', G.token, { restaurantName: VENUE, vibe: 'LIVE' })
    const vibeRpc = await rest('POST', 'rpc/submit_vibe_report', SERVICE, { p_email: G.email, p_restaurant_name: VENUE, p_vibe: 'LIVE', p_bar_seats: null, p_wait_time: null, p_user_lat: null, p_user_lng: null, p_distance_meters: null, p_location_consistent: false, p_new_account: false })
    check('S6b vibe report refused by the route (403 feature_paused) and in the database (service-role function), nothing saved',
      vibeApi.status === 403 && vibeApi.json?.code === 'feature_paused' && refused(vibeRpc) && /feature_paused:vibe_reports/.test(vibeRpc.text) && count(`vibe_reports where restaurant_name = '${VENUE}'`) === 0, { vibeApi, vibeRpc })
    const cAnon = await rest('POST', 'venue_comments', null, { restaurant_name: VENUE, comment: 'hi', commenter_name: 'x' }, 'return=minimal')
    const cAuth = await rest('POST', 'venue_comments', G.token, { restaurant_name: VENUE, comment: 'hi', commenter_name: 'x' }, 'return=minimal')
    const cSvc = await rest('POST', 'venue_comments', SERVICE, { restaurant_name: VENUE, comment: 'hi', commenter_name: 'x' }, 'return=minimal')
    check('S6c venue comment refused (logged out, signed in, service role), nothing saved',
      refused(cAnon) && refused(cAuth) && refused(cSvc) && count(`venue_comments where restaurant_name = '${VENUE}'`) === 0, { cAnon, cAuth, cSvc })
    // Existing follow (created before the pause) can still be removed.
    sql(`set session_replication_role = replica; insert into follows (follower_id, follower_email, server_id, follower_type, status) values ('${O.id}', '${O.email}', '${W.serverId}', 'guest', 'approved')`)
    const del = await rest('DELETE', `follows?follower_id=eq.${O.id}&server_id=eq.${W.serverId}`, O.token, undefined, 'return=minimal')
    check('S6d unfollowing an existing follow still works', del.status < 300 && count(`follows where follower_id = '${O.id}'`) === 0, del)
  }

  // ── S7: shift emails paused ─────────────────────────────────────────────────
  {
    const before = count('notifications')
    const r = await api('/api/notify-followers', W.token, { serverId: W.serverId, restaurantName: VENUE, type: 'shift_started' })
    const direct = await rest('POST', 'notifications', SERVICE, { recipient_email: G.email, server_id: W.serverId, type: 'shift_started', title: 'x', message: 'x' }, 'return=minimal')
    check('S7 shift emails paused: route sends and stores nothing; database refuses shift notifications even from the service role',
      r.status === 200 && r.json?.paused === true && refused(direct) && /feature_paused:shift_emails/.test(direct.text) && count('notifications') === before, { r, direct })
  }

  // ── S8: no shift distance stored ────────────────────────────────────────────
  {
    const ins = await rest('POST', 'shifts', W.token, { server_id: W.serverId, restaurant_name: VENUE, started_at: new Date().toISOString(), is_active: true, activated_by: 'server', gps_verified: true, distance_meters: 40 }, 'return=minimal')
    const row = sql(`select coalesce(distance_meters::text,'NULL') || '|' || gps_verified from shifts where server_id = '${W.serverId}' order by started_at desc limit 1`)
    check('S8 shift start with a distance (older app) still works; distance stored as NULL, pass/fail kept', ins.status === 201 && row === 'NULL|true', { ins, row })
    sql(`update shifts set distance_meters = 12 where server_id = '${W.serverId}'`)
    check('S8b a later update cannot store a distance either', sql(`select count(*) from shifts where server_id = '${W.serverId}' and distance_meters is not null`) === '0')
    sql(`update shifts set is_active = false where server_id = '${W.serverId}'`)
  }

  // ── S9–S10: no QR-scan record before or without agreement ───────────────────
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  async function page(as) {
    const ctx = await browser.newContext()
    await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort())
    const p = await ctx.newPage()
    if (as) {
      await p.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 120000 })
      await p.fill('input[placeholder="Email address"]', as.email); await p.fill('input[placeholder="Password"]', 'pass123456')
      await p.click('button:has-text("Sign in")'); await p.waitForTimeout(2500)
    }
    return p
  }
  {
    const scans0 = count('qr_scans'), views0 = count(`page_views where path like '/scan%'`)
    const p = await page(null)
    await p.goto(APP + `/scan/${W.serverId}`, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2000)
    await p.click('button:has-text("Rate ")'); await p.waitForTimeout(2500)   // → /rate, then sign-up
    const direct = await api('/api/track-scan', null, { serverId: W.serverId, sessionId: 'abc' })
    const view = await api('/api/page-view', null, { path: `/scan/${W.serverId}` })
    await p.context().close()
    const p2 = await page(G)
    await p2.goto(APP + `/scan/${W.serverId}`, { waitUntil: 'networkidle', timeout: 120000 }); await p2.waitForTimeout(2000)
    await p2.context().close()
    check('S9 opening a worker QR page (logged out and signed in) and going on to rate records no QR scan',
      count('qr_scans') === scans0 && direct.status === 200 && direct.json?.recorded === false, { scans0, now: count('qr_scans'), direct })
    check('S10 no /scan/ page view is recorded (beacon skips it; route refuses it)',
      count(`page_views where path like '/scan%'`) === views0 && view.status === 204, { views0, now: count(`page_views where path like '/scan%'`), view })
  }

  // ── UI: paused controls hidden ──────────────────────────────────────────────
  {
    const p = await page(G)
    await p.goto(APP + `/scan/${W.serverId}`, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2500)
    const scanFollow = await p.isVisible('[data-testid="returning-follow"]')
    const recent = await p.isVisible('[data-testid="rated-recently"]')
    await p.goto(APP + `/server/${W.serverId}`, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2000)
    const profileFollow = await p.isVisible('button:has-text("Follow ")')
    await p.goto(APP + '/live', { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2000)
    const liveImHere = await p.isVisible('button:has-text("I\'m here")')
    const liveSearch = /Where are you right now/.test((await p.textContent('body')) || '')
    await p.goto(APP + `/venue/${encodeURIComponent(VENUE)}`, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2000)
    const venueVibe = await p.isVisible('button:has-text("I\'m here right now")')
    const venuePaused = await p.isVisible('[data-testid="vibe-paused"]') && await p.isVisible('[data-testid="comments-paused"]')
    const venuePost = await p.isVisible('button:has-text("Post")')
    check('S6e UI: no Follow on the QR page (PR #51 button hidden; "rated recently" kept) or the profile page',
      !scanFollow && recent && !profileFollow, { scanFollow, recent, profileFollow })
    check('S6f UI: no vibe report forms on /live or the venue page, no comment form; "Not available during the early test" shown',
      !liveImHere && !liveSearch && !venueVibe && !venuePost && venuePaused, { liveImHere, liveSearch, venueVibe, venuePost, venuePaused })
    await p.context().close()
  }

  // ── S11: used/expired confirmation link message ─────────────────────────────
  {
    const p = await page(null)
    await p.goto(APP + '/auth/confirm?token_hash=used-or-expired&type=email', { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(1000)
    const t = (await p.textContent('body')) || ''
    check('S11 used/expired confirmation link → sign-in page says it may already be confirmed',
      p.url().includes('/login') && /This link has already been used or has expired\. If you already confirmed your email, sign in below\./.test(t), p.url())
    await p.context().close()
  }

  // ── "My Ratings" before and after 43b ───────────────────────────────────────
  const mine = async a => rest('POST', 'rpc/my_ratings', a ? a.token : null, {})
  {
    const m = await mine(G), o = await mine(O), anon = await mine(null)
    const rows = JSON.parse(m.text || '[]')
    check('S5a my_ratings(): author gets only their own rating, without the account identifier; other user gets none; logged out refused',
      m.status === 200 && rows.length === 1 && rows[0].id === ratingId && !('guest_id' in rows[0]) && JSON.parse(o.text) .length === 0 && refused(anon), { m, o, anon })
  }

  // ── S1–S5: apply 43b, then every route to guest_id is refused ───────────────
  {
    const m = sqlFile('43b_rating_identifier_private.sql'); check('S0c migration 43b applies (after the app)', m.ok, m.out)
    const probes = [
      ['select', 'ratings?select=guest_id'],
      ['star', 'ratings?select=*'],
      ['filter', `ratings?select=id&guest_id=eq.${G.id}`],
      ['order', 'ratings?select=id&order=guest_id'],
      ['embed', `servers?select=id,ratings(guest_id)&id=eq.${W.serverId}`],
    ]
    for (const [who, token] of [['logged out', null], ['another user', O.token], ['the author', G.token]]) {
      const res = {}
      for (const [k, q] of probes) res[k] = await rest('GET', q, token)
      check(`S1–S5 (${who}): guest_id cannot be selected, star-selected, filtered, sorted or embedded`,
        Object.values(res).every(refused) && !Object.values(res).some(r => r.text.includes(G.id)), Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.status])))
    }
    const pub = await rest('GET', `ratings?select=id,score,comment&server_id=eq.${W.serverId}`, null)
    const rel = await fetch(APP + `/api/rating-relationship?server=${W.serverId}`, { headers: { authorization: `Bearer ${G.token}` } }).then(r => r.json())
    const m2 = await mine(G)
    check('S5b still working after 43b: public ratings, rating-relationship, my_ratings()',
      pub.status === 200 && JSON.parse(pub.text).length === 1 && rel.rated === true && JSON.parse(m2.text).length === 1, { pub, rel, m2 })
    const p = await page(G)
    await p.goto(APP + '/account', { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2500)
    const t = (await p.textContent('body')) || ''
    check('S5c /account "My Ratings" lists the guest\'s rating (via my_ratings)', t.includes('Wren w') && !/No ratings yet/.test(t), t.slice(0, 200))
    await p.context().close()
    check('S5d no realtime publication includes ratings; no function returns ratings rows',
      sql(`select count(*) from pg_publication_tables where tablename = 'ratings'`) === '0' && sql(`select count(*) from pg_proc where prorettype = 'public.ratings'::regtype`) === '0')
  }

  // ── Rollback order ──────────────────────────────────────────────────────────
  {
    const early = sqlFile('43_rollback_scope_lock.sql')
    check('R1 43 rollback refuses while 43b is applied (forces the safe order)', !early.ok && /run 43b rollback first/.test(early.out), early.out.slice(0, 200))
    const b = sqlFile('43b_rollback_rating_identifier_private.sql'), again = sqlFile('43b_rating_identifier_private.sql')
    check('R2 43b rollback and re-apply both succeed (state restored)', b.ok && again.ok && sql(`select has_column_privilege('anon','public.ratings','guest_id','SELECT')`) === 'f', { b: b.out, again: again.out })
  }

  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
