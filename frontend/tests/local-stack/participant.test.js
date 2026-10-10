// Early-test participant agreements (PR-B): versioned guest and worker agreements separate from
// the Terms/Privacy, renewed legal acknowledgment, hidden non-participating workers, immediate
// withdrawal, end-of-test election, append-only records, rollback order.
// Criteria: docs/EARLY_TEST_ACCEPTANCE_CRITERIA.md (requirements 1, 2, 3, 5, 7, 8; E1–E12).
// Local stack only. Needs 43 + 43b + 44 applied; applies 44b itself (after the pre-44b checks).
// Turns the gateway's autoParticipant fixture OFF for its own accounts and restores it at the end.
// usage: NODE_PATH=$(npm root -g) node participant.test.js <appUrl> <keys.json>
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const ROOT = path.join(__dirname, '../..')
const LEGAL_VERSION = fs.readFileSync(path.join(ROOT, 'lib/legal.ts'), 'utf8').match(/LEGAL_VERSION = '([^']+)'/)[1]
const DOCS = fs.readFileSync(path.join(ROOT, 'lib/participant-documents.ts'), 'utf8')
const PV = DOCS.match(/PARTICIPANT_VERSION = '([^']+)'/)[1]
const { anon: ANON, service: SERVICE } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))
const PSQL = ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB]
const sql = q => execFileSync('psql', [...PSQL, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
const sqlFile = f => { try { return { ok: true, out: execFileSync('psql', [...PSQL, '-v', 'ON_ERROR_STOP=1', '-q', '-f', path.join(ROOT, 'supabase-sql/security', f)], { encoding: 'utf8', stdio: 'pipe' }) } } catch (e) { return { ok: false, out: String(e.stderr || e.message) } } }
const sqlTry = q => { try { return { ok: true, out: execFileSync('psql', [...PSQL, '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', q], { encoding: 'utf8', stdio: 'pipe' }) } } catch (e) { return { ok: false, out: String(e.stderr || e.message) } } }
const run = `pt${Date.now()}`
let n = 0
const email = tag => `${run}-${++n}-${tag}@example.com`
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 400)) }

const gwConfig = c => fetch(GW + '/__config', { method: 'POST', body: JSON.stringify(c) })
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
async function api(p, token, body, method = 'POST') {
  const r = await fetch(APP + p, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body) })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
const VENUE = `Agree Bar ${run}`
async function worker(tag) {
  const a = await account(tag)
  const r = await api('/api/signup-server', a.token, { name: `Kit ${tag}`, restaurant: VENUE, role: 'Server', legalAccepted: LEGAL_VERSION })
  return { ...a, name: `Kit ${tag}`, serverId: sql(`select id from servers where wallet_address = '${a.id}'`), signup: r.status }
}
const agree = (a, role) => api('/api/participant', a.token, { action: 'accept', role, version: PV })
const withdraw = (a, role) => api('/api/participant', a.token, { action: 'withdraw', role })
const legal = a => api('/api/legal/accept', a.token, { version: LEGAL_VERSION })
const rate = (g, w) => api('/api/submit-rating', g.token, { serverId: w.serverId, score: 5, legalAccepted: LEGAL_VERSION })
const rpcRate = g => w => rest('POST', 'rpc/submit_rating_reward', SERVICE, { p_server_id: w.serverId, p_score: 4, p_comment: null, p_tags: [], p_guest_email: g.email, p_followed: false, p_amount: 20 })
const events = a => sql(`select coalesce(string_agg(role || ':' || action || ':' || coalesce(version, '-'), ',' order by id), '') from participant_consent_events where user_id = '${a.id}'`)
const meta = a => JSON.parse(sql(`select coalesce(raw_app_meta_data::text, '{}') from auth.users where id = '${a.id}'`))
const visibleTo = async (w, token) => {
  const q = async t => (await rest('GET', `${t}?select=${t === 'servers' ? 'id' : 'server_id'}&${t === 'servers' ? 'id' : 'server_id'}=eq.${w.serverId}`, token)).text
  return { servers: await q('servers'), server_restaurants: await q('server_restaurants'), shifts: await q('shifts'), ratings: await q('ratings'),
    embed: (await rest('GET', `server_restaurants?select=servers(id)&restaurant_name=eq.${encodeURIComponent(VENUE)}`, token)).text }
}
const hiddenEverywhere = v => v.servers === '[]' && v.server_restaurants === '[]' && v.shifts === '[]' && v.ratings === '[]'

;(async () => {
  await gwConfig({ autoParticipant: false })
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  async function page(as) {
    const ctx = await browser.newContext()
    await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort())
    const p = await ctx.newPage()
    p.on('dialog', d => d.accept())
    if (as) {
      await p.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 120000 })
      await p.fill('input[placeholder="Email address"]', as.email); await p.fill('input[placeholder="Password"]', 'pass123456')
      await p.click('button:has-text("Sign in")'); await p.waitForTimeout(2500)
    }
    return p
  }
  const body = async p => (await p.textContent('body')) || ''
  try {
    if (sql(`select count(*) from pg_proc where proname = 'record_participant_event'`) === '0') {
      const m = sqlFile('44_participant_agreements.sql'); check('E0 migration 44 applies', m.ok, m.out)
    }
    if (sql(`select count(*) from pg_policy where polname = 'servers_hide_nonparticipants'`) === '1') {
      const m = sqlFile('44b_rollback_participant_enforcement.sql'); check('E0b reset: 44b rolled back for the pre-44b phase', m.ok, m.out)
    }

    // ── Accounts ─────────────────────────────────────────────────────────────
    const W = await worker('hidden')              // never agrees (until E5)
    const WP = await worker('in')                 // agrees as a worker
    const WP2 = await worker('in2')
    const G = await account('guest')              // never agrees (until E7b)
    const GP = await account('guestin')           // agrees as a guest
    for (const a of [G, GP]) await legal(a)
    const accWP = await agree(WP, 'worker'), accWP2 = await agree(WP2, 'worker'), accGP = await agree(GP, 'guest')
    check('E-setup new accounts start with no participant agreement; accept records version + time (account record) and one log entry',
      W.signup === 200 && !meta(W).participant_worker_version && accWP.status === 200 && accWP.json?.worker?.agreed === true && accGP.json?.guest?.agreed === true
        && meta(GP).participant_guest_version === PV && !!meta(GP).participant_guest_at && events(GP) === `guest:accept:${PV}` && accWP2.status === 200, { accWP, accGP, ev: events(GP) })

    // ── Pre-44b (B2 window): the route already enforces ─────────────────────
    {
      const a = await rate(GP, W), b = await rate(G, WP), c = await rate(GP, WP)
      check('E-pre route: a non-participating worker is already hidden by the app (rating → 404, same as unknown); a non-participating guest refused (participant_required); both agreed → saved',
        a.status === 404 && b.status === 403 && b.json?.code === 'participant_required' && c.status === 200
          && sql(`select count(*) from ratings where guest_email = '${G.email}'`) === '0', { a, b, c })
      const bad = await api('/api/participant', G.token, { action: 'accept', role: 'guest', version: '2026-01-01' })
      const noProfile = await api('/api/participant', G.token, { action: 'accept', role: 'worker', version: PV })
      const unknown = await api('/api/participant', G.token, { action: 'join' })
      const anon = await api('/api/participant', null, { action: 'accept', role: 'guest', version: PV })
      check('E-pre accept is refused with a stale version (400), as a worker without a profile (403), for an unknown action (400) or signed out (401); nothing recorded',
        bad.status === 400 && noProfile.status === 403 && unknown.status === 400 && anon.status === 401 && events(G) === '' && !meta(G).participant_guest_version, { bad, noProfile, unknown, anon })
    }

    // ── E11: records are server-only and append-only ────────────────────────
    {
      const anonRead = await rest('GET', 'participant_consent_events?select=id', null), userRead = await rest('GET', 'participant_consent_events?select=id', GP.token)
      const userWrite = await rest('POST', 'participant_consent_events', GP.token, { user_id: GP.id, role: 'guest', action: 'accept', version: PV }, 'return=minimal')
      const userRpc = await rest('POST', 'rpc/record_participant_event', GP.token, { p_user: G.id, p_role: 'guest', p_action: 'accept', p_version: PV })
      const okRpc = await rest('POST', 'rpc/participant_ok', GP.token, { p_user: G.id, p_role: 'guest' })
      const svcUpd = await rest('PATCH', `participant_consent_events?user_id=eq.${GP.id}`, SERVICE, { version: 'x' }, 'return=minimal')
      const svcDel = await rest('DELETE', `participant_consent_events?user_id=eq.${GP.id}`, SERVICE, undefined, 'return=minimal')
      const ownerUpd = sqlTry(`update participant_consent_events set version = 'x' where user_id = '${GP.id}'`)
      const ownerDel = sqlTry(`delete from participant_consent_events where user_id = '${GP.id}'`)
      check('E11 the consent log cannot be read or written by app users; app users cannot call the recorder or the checks; it is append-only even for the service role and the owner',
        anonRead.status >= 400 && userRead.status >= 400 && userWrite.status >= 400 && userRpc.status >= 400 && okRpc.status >= 400
          && svcUpd.status >= 400 && svcDel.status >= 400 && !ownerUpd.ok && /append-only/.test(ownerUpd.out) && !ownerDel.ok && events(GP) === `guest:accept:${PV}`,
        { anonRead: anonRead.status, userRead: userRead.status, userWrite: userWrite.status, userRpc: userRpc.status, okRpc: okRpc.status, svcUpd: svcUpd.status, svcDel: svcDel.status })
    }

    // Historical data on the never-agreeing worker (to prove nothing is deleted).
    sql(`set session_replication_role = replica; insert into ratings (server_id, score, guest_email, guest_id, comment) values ('${W.serverId}', 4, 'old-${run}@example.com', null, 'from before the test')`)
    sql(`set session_replication_role = replica; insert into shifts (server_id, restaurant_name, started_at, is_active, activated_by) values ('${W.serverId}', '${VENUE}', now(), true, 'server'), ('${WP.serverId}', '${VENUE}', now(), true, 'server')`)
    const rowsW = () => sql(`select (select count(*) from servers where id = '${W.serverId}') || '|' || (select count(*) from server_restaurants where server_id = '${W.serverId}') || '|' || (select count(*) from shifts where server_id = '${W.serverId}') || '|' || (select count(*) from ratings where server_id = '${W.serverId}')`)
    const before = rowsW()

    // ── Apply 44b (after the app) ────────────────────────────────────────────
    { const m = sqlFile('44b_participant_enforcement.sql'); check('E0c migration 44b applies (after the app)', m.ok, m.out) }

    // ── E1: one version and date ─────────────────────────────────────────────
    {
      let rel = { ok: true, out: '' }
      try { rel.out = execFileSync('node', [path.join(ROOT, 'scripts/legal-version.mjs'), 'check', '--release'], { encoding: 'utf8', stdio: 'pipe' }) } catch (e) { rel = { ok: false, out: String(e.stderr) } }
      const db = sql(`select public.current_legal_version() || '|' || public.current_participant_version()`)
      const p = await page(null)
      await p.goto(APP + '/early-test', { waitUntil: 'networkidle', timeout: 120000 })
      const t = await body(p)
      check('E1 one version 2026-10-13 everywhere: app Terms/Privacy + both agreements, database legal + participant; both sheets show it',
        PV === '2026-10-13' && LEGAL_VERSION === PV && rel.ok && db === `${PV}|${PV}` && (t.match(/Version: 2026-10-13/g) || []).length === 2, { rel, db, PV, LEGAL_VERSION })
      check('E1b /early-test shows Vera\'s guest and worker sheets verbatim (spot-checked sentences)',
        /Slate Early Product Test — Guest Information/.test(t) && /Following, shift emails, vibe reports and venue comments are not part of this first test\./.test(t)
          && /Slate will not display a public account identifier that links your ratings together\./.test(t)
          && /Slate Early Product Test — Worker Information/.test(t) && /your profile becomes visible again if you later accept the current worker agreement\./.test(t)
          && /Raw coordinates are not intended to be stored\./.test(t))
      await p.goto(APP + '/privacy', { waitUntil: 'networkidle' })
      const priv = await body(p)
      check('E3 Privacy: no visible rating identifier; no QR-scan recording during the test; old sentences gone; effective date from the new version',
        /does not show a public account identifier with your ratings/.test(priv) && /During our early test, Slate does not record QR code scans\./.test(priv)
          && !/Some older ratings also carry/.test(priv) && !/QR code scans \(with an anonymous browser identifier\)/.test(priv) && /October 13, 2026/.test(priv))
      await p.context().close()
    }

    // ── E2: renewed Terms/Privacy acknowledgment ────────────────────────────
    {
      const old = await account('oldack'); await agree(old, 'guest')
      sql(`update auth.users set raw_app_meta_data = raw_app_meta_data || '{"legal_guest_version":"2026-10-10"}' where id = '${old.id}'`)
      const r = await api('/api/submit-rating', old.token, { serverId: WP.serverId, score: 5 })
      const WO = await worker('oldterms'); await agree(WO, 'worker')
      sql(`update auth.users set raw_app_meta_data = raw_app_meta_data || '{"legal_worker_version":"2026-10-10"}' where id = '${WO.id}'`)
      const s = await rest('POST', 'shifts', WO.token, { server_id: WO.serverId, restaurant_name: VENUE, started_at: new Date().toISOString(), is_active: true, activated_by: 'server', gps_verified: false }, 'return=minimal')
      const toOld = await rate(GP, WO)
      check('E2 accounts on the 2026-10-10 Terms/Privacy must acknowledge again: guest rating refused (legal_required); worker cannot start a shift or receive ratings',
        r.status === 400 && r.json?.code === 'legal_required' && s.status >= 400 && toOld.status === 403, { r, s: s.status, toOld })
    }

    // ── E4: a worker who never agreed is hidden consistently; nothing deleted ─
    {
      const other = await account('viewer')
      const vAnon = await visibleTo(W, null), vOther = await visibleTo(W, other.token), vOwner = await visibleTo(W, W.token), vIn = await visibleTo(WP, null)
      check('E4a hidden from logged-out and other users: profile, workplaces, shifts, ratings (direct and embedded); the owner still sees their own; participating worker visible',
        hiddenEverywhere(vAnon) && hiddenEverywhere(vOther) && !vAnon.embed.includes(W.serverId) && !vOther.embed.includes(W.serverId)
          && vOwner.servers.includes(W.serverId) && vOwner.ratings.includes(W.serverId)
          && vIn.servers.includes(WP.serverId) && vAnon.embed.includes(WP.serverId), { vAnon, vOwner, vIn })
      const st = await fetch(APP + `/api/rating-status?server=${W.serverId}`).then(r => r.status)
      const rel = await fetch(APP + `/api/rating-relationship?server=${W.serverId}`, { headers: { authorization: `Bearer ${GP.token}` } }).then(r => r.status)
      const ts = await api('/api/track-scan', null, { serverId: W.serverId, sessionId: 'x' })
      const rt = await rate(GP, W)
      check('E4b server routes treat it as not found (rating-status, rating-relationship, track-scan → 404); ratings refused',
        st === 404 && rel === 404 && ts.status === 404 && rt.status === 404, { st, rel, ts: ts.status, rt })
      const p = await page(null)
      const texts = {}
      for (const [k, u] of [['profile', `/server/${W.serverId}`], ['scan', `/scan/${W.serverId}`], ['rate', `/rate?server=${W.serverId}`]]) {
        await p.goto(APP + u, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(1500); texts[k] = await body(p)
      }
      await p.goto(APP + `/restaurant/${encodeURIComponent(VENUE)}`, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2000); texts.venue = await body(p)
      await p.goto(APP + `/venue/${encodeURIComponent(VENUE)}`, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2000); texts.live = await body(p)
      await p.context().close()
      const un = /This profile isn.t available right now\./
      check('E4c pages: profile, QR and rate pages say "This profile isn\'t available right now."; venue staff and on-shift lists omit the hidden worker but show the participating one',
        un.test(texts.profile) && un.test(texts.scan) && un.test(texts.rate) && !texts.venue.includes(W.name) && texts.venue.includes(WP.name) && !texts.live.includes(W.name) && texts.live.includes(WP.name),
        Object.fromEntries(Object.entries(texts).map(([k, v]) => [k, v.slice(0, 120)])))
      check('E4d nothing deleted or changed while hidden (profile, workplaces, shifts, ratings row counts)', rowsW() === before, { before, now: rowsW() })
    }

    // ── E5: the worker agrees (dashboard card) → visible again, history intact ─
    {
      const p = await page(W)
      await p.goto(APP + '/dashboard', { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(3000)
      const card = await p.isVisible('[data-testid="participant-card-worker"]')
      const startDisabled = await p.locator('button:has-text("Start Shift")').isDisabled().catch(() => null)
      const cardText = (await p.textContent('[data-testid="participant-card-worker"]').catch(() => '')) || ''
      const agreeBtn = p.locator('[data-testid="participant-card-worker"] button:has-text("Agree and continue")')
      const disabledUntilTicked = await agreeBtn.isDisabled()
      const evBefore = events(W)
      await p.check('[data-testid="participant-card-worker"] [data-testid="participant-checkbox"]'); await agreeBtn.click(); await p.waitForTimeout(2000)
      const gone = !(await p.isVisible('[data-testid="participant-card-worker"]'))
      const startEnabled = !(await p.locator('button:has-text("Start Shift")').isDisabled().catch(() => true))
      await p.context().close()
      check('E5a dashboard: worker card (Vera\'s wording) shown, Start Shift disabled, Agree disabled until ticked, nothing recorded before',
        card && startDisabled === true && disabledUntilTicked && evBefore === '' && /This test is voluntary and for workers 18 or older\./.test(cardText)
          && /I am 18 or older, I have read the Slate Early Product Test worker information sheet, and I agree to participate\./.test(cardText), { card, startDisabled, disabledUntilTicked, evBefore })
      const v = await visibleTo(W, null)
      check('E5b after agreeing: card gone, Start Shift enabled, logged; profile, workplaces, shift and the old rating visible again; rows unchanged',
        gone && startEnabled && events(W) === `worker:accept:${PV}` && v.servers.includes(W.serverId) && v.ratings.includes(W.serverId) && v.shifts.includes(W.serverId) && rowsW() === before, { gone, startEnabled, ev: events(W), v })
    }

    // ── E6: a guest without the agreement is refused by the database too ───
    {
      const r = await rpcRate(G)(WP)
      check('E6 database refuses a rating from a guest without the agreement even via the service-role function (participant_required), nothing saved',
        r.status >= 400 && /participant_required/.test(r.text) && sql(`select count(*) from ratings where guest_email = '${G.email}'`) === '0', r)
    }

    // ── E7: real guest flow — QR → rate → sign up → card → agree → rate ────
    {
      const scans0 = sql('select count(*) from qr_scans')
      const p = await page(null)
      await p.goto(APP + `/scan/${WP2.serverId}`, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(1500)
      await p.click('button:has-text("Rate ")'); await p.waitForTimeout(2000)
      await p.click('[aria-label="5 stars"]'); await p.click('button:has-text("Submit")'); await p.waitForTimeout(2500)
      const e = email('newguest')
      await p.fill('input[placeholder="Your name"]', 'Nia New'); await p.fill('input[placeholder="Email address"]', e); await p.fill('input[placeholder="Password"]', 'pass123456')
      await p.check('[data-testid="legal-consent"] input[type="checkbox"]'); await p.click('button:has-text("Create account")'); await p.waitForTimeout(4000)
      const uid = sql(`select id from auth.users where email = '${e}'`)
      const NG = { id: uid, email: e }
      const onRate = p.url().includes('/rate')
      const card = await p.isVisible('[data-testid="participant-card-guest"]')
      const cardText = (await p.textContent('[data-testid="participant-card-guest"]').catch(() => '')) || ''
      const submitDisabled = await p.locator('button:has-text("Submit")').isDisabled()
      await p.click('[data-testid="participant-card-guest"] button:has-text("Not now")'); await p.waitForTimeout(500)
      const declined = (await p.textContent('[data-testid="participant-declined"]').catch(() => '')) || ''
      check('E7a after sign-up the guest returns to the rating with the card (Vera\'s wording), Submit disabled; "Not now" shows the message and records nothing; no QR scan recorded',
        onRate && card && submitDisabled && /This test is voluntary and for people 18 or older\./.test(cardText)
          && /I am 18 or older, I have read the Slate Early Product Test guest information sheet, and I agree to participate\./.test(cardText)
          && /rating stays off until you agree/.test(declined) && events(NG) === '' && sql('select count(*) from qr_scans') === scans0, { onRate, card, submitDisabled, declined, url: p.url() })
      await p.check('[data-testid="participant-card-guest"] [data-testid="participant-checkbox"]')
      await p.click('[data-testid="participant-card-guest"] button:has-text("Agree and continue")'); await p.waitForTimeout(2000)
      const legalBox = p.locator('[data-testid="legal-consent"] input[type="checkbox"]')
      if (await legalBox.count()) await legalBox.check()
      await p.click('button:has-text("Submit")'); await p.waitForTimeout(3000)
      const saved = sql(`select count(*) from ratings where guest_email = '${e}' and server_id = '${WP2.serverId}'`)
      await p.context().close()
      check('E7b ticked + agreed → logged, then the rating posts', events(NG) === `guest:accept:${PV}` && saved === '1', { ev: events(NG), saved })
    }

    // ── E8: withdrawal is immediate (old sign-in tokens included) ──────────
    {
      const oldToken = GP.token
      const p = await page(GP)
      await p.goto(APP + '/account', { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2500)
      await p.click('[data-testid="withdraw-guest"]'); await p.waitForTimeout(2000)
      const msg = (await p.textContent('[data-testid="withdrawn-guest"]').catch(() => '')) || ''
      await p.context().close()
      const r = await api('/api/submit-rating', oldToken, { serverId: WP2.serverId, score: 5, legalAccepted: LEGAL_VERSION })
      const db = await rpcRate(GP)(WP2)
      const m = meta(GP)
      check('E8a guest "Stop taking part" (/account): message shown; logged with time; with a token from before, the route AND the database refuse new ratings at once',
        /You.ve stopped taking part in the early test\. You can.t submit new ratings\./.test(msg) && !m.participant_guest_version && !!m.participant_guest_withdrawn_at
          && events(GP).endsWith('guest:withdraw:-') && r.status === 403 && r.json?.code === 'participant_required' && db.status >= 400 && /participant_required/.test(db.text), { msg, r, db: db.status })
      check('E8b withdrawal keeps the guest\'s existing rating public (not deleted)', (await rest('GET', `ratings?select=id&server_id=eq.${WP.serverId}`, null)).text !== '[]' && sql(`select count(*) from ratings where guest_email = '${GP.email}'`) === '1')

      const wTok = WP.token
      const act0 = sql(`select count(*) from shifts where server_id = '${WP.serverId}' and is_active`)
      const wr = await withdraw(WP, 'worker')
      const shiftsAfter = sql(`select count(*) from shifts where server_id = '${WP.serverId}' and is_active`)
      const s = await rest('POST', 'shifts', wTok, { server_id: WP.serverId, restaurant_name: VENUE, started_at: new Date().toISOString(), is_active: true, activated_by: 'server', gps_verified: false }, 'return=minimal')
      const NG2 = await account('g8'); await legal(NG2); await agree(NG2, 'guest')
      const rr = await rate(NG2, WP)
      const v = await visibleTo(WP, null)
      check('E8c worker withdrawal: active shift ended, new shift refused (old token), ratings refused, profile hidden, withdrawal time + log entry; rows kept',
        act0 === '1' && wr.status === 200 && shiftsAfter === '0' && s.status >= 400 && rr.status === 404 && hiddenEverywhere(v)
          && !!meta(WP).participant_worker_withdrawn_at && events(WP).endsWith('worker:withdraw:-') && sql(`select count(*) from servers where id = '${WP.serverId}'`) === '1', { wr, shiftsAfter, s: s.status, rr, v })
    }

    // ── E9: agreeing again restores participation ───────────────────────────
    {
      const a = await agree(GP, 'guest'), b = await agree(WP, 'worker')
      const r = await rate(GP, WP2)
      const v = await visibleTo(WP, null)
      check('E9 agreeing again restores participation: guest can rate; worker visible again with its ratings',
        a.status === 200 && b.status === 200 && r.status === 200 && v.servers.includes(WP.serverId) && v.ratings.includes(WP.serverId), { a: a.status, b: b.status, r, v })
    }

    // ── E10: end-of-test election ───────────────────────────────────────────
    {
      const st0 = await api('/api/participant', GP.token, undefined, 'GET')
      const y = await api('/api/participant', GP.token, { action: 'remain_yes' })
      const no = await api('/api/participant', GP.token, { action: 'remain_no' })
      const never = await account('never')
      const nv = await api('/api/participant', never.token, { action: 'remain_yes' })
      const p = await page(GP)
      await p.goto(APP + '/account', { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2500)
      const label = (await p.textContent('[data-testid="remain-election"]').catch(() => '')) || ''
      await p.click('[data-testid="remain-checkbox"]'); await p.waitForTimeout(2500)
      const uiChecked = await p.isChecked('[data-testid="remain-checkbox"]')
      await p.context().close()
      check('E10 election: default is not remaining; on/off each logged with a time; account record updated; non-participants refused; /account checkbox works',
        st0.json?.remain === null && y.json?.remain === true && no.json?.remain === false && nv.status === 400 && /Keep my Slate account after the early test/.test(label) && uiChecked
          && meta(GP).participant_remain === true && !!meta(GP).participant_remain_at && /account:remain_yes:-,account:remain_no:-,account:remain_yes:-$/.test(events(GP)), { st0: st0.json?.remain, y: y.json?.remain, no: no.json?.remain, nv: nv.status, ev: events(GP) })
      check('E10b no automatic deletion exists: no scheduled job or function deletes participants', sql(`select count(*) from pg_proc where proname ilike '%delete%participant%' or proname ilike '%purge%'`) === '0')
    }

    // ── E12: rollback order ──────────────────────────────────────────────────
    {
      const early = sqlFile('44_rollback_participant_agreements.sql')
      check('E12a 44 rollback refuses while 44b is applied', !early.ok && /44b is still applied/.test(early.out), early.out.slice(0, 200))
      const b = sqlFile('44b_rollback_participant_enforcement.sql')
      const legalAfter = sql('select public.current_legal_version()')
      const again = sqlFile('44b_participant_enforcement.sql')
      check('E12b 44b rollback restores legal version 2026-10-10 and removes the gates; re-applying works; the log is untouched',
        b.ok && legalAfter === '2026-10-10' && again.ok && sql('select public.current_legal_version()') === PV && events(GP).startsWith(`guest:accept:${PV}`), { b: b.out, again: again.out, legalAfter })
    }
  } finally {
    await browser.close()
    await gwConfig({ autoParticipant: true })
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(async e => { console.error('ERROR', e); await gwConfig({ autoParticipant: true }).catch(() => {}); process.exit(1) })
