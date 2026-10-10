// Terms/Privacy acknowledgment (worker sign-up, guest rating) and corrected public copy,
// on the local real-database stack. No production, no real emails.
// usage: NODE_PATH=$(npm root -g) node legal.test.js <appUrl> <keys.json>
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
const run = `l${Date.now()}`
let n = 0
const email = tag => `${run}-${++n}-${tag}@example.com`
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300)) }

const MAPS_STUB = `window.google = { maps: { places: { Autocomplete: function (input) {
  var place = null;
  this.addListener = function (ev, cb) { input.addEventListener('change', function () {
    place = { name: input.value, formatted_address: input.value + ', New York, NY',
      geometry: { location: { lat: function () { return 40.74 }, lng: function () { return -73.99 } } } }; cb() }) };
  this.getPlace = function () { return place };
} } } };`

async function account(tag) {
  const e = email(tag)
  const s = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: e, password: 'pass123456' }) })).json()
  return { email: e, id: s.user.id, token: s.access_token }
}
async function api(p, token, body) {
  const r = await fetch(APP + p, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
const appMeta = async token => (await (await fetch(GW + '/auth/v1/user', { headers: { apikey: ANON, authorization: `Bearer ${token}` } })).json()).app_metadata || {}
const profiles = id => sql(`select count(*) from servers where wallet_address = '${id}'`)
async function worker(tag) {
  const a = await account(tag)
  const id = sql(`insert into servers (name, email, wallet_address) values ('Rated ${tag}', '${a.email}', '${a.id}') returning id`).split('\n')[0]
  return { ...a, serverId: id }
}

;(async () => {
  // ── API: worker sign-up ──
  const w = await account('worker')
  const body = { name: 'Legal Worker', restaurant: `Consent Bar ${run}`, role: 'Server' }
  let r = await api('/api/signup-server', w.token, body)
  check('L1 worker sign-up without acknowledgment → 400, no profile', r.status === 400 && r.json?.code === 'legal_required' && profiles(w.id) === '0', r)
  r = await api('/api/signup-server', w.token, { ...body, legalAccepted: '2000-01' })
  check('L2 stale version → 400, no profile', r.status === 400 && profiles(w.id) === '0', r)
  r = await api('/api/signup-server', w.token, { ...body, legalAccepted: LEGAL_VERSION })
  const wm = await appMeta(w.token)
  check('L3 with acknowledgment → profile created; version + time recorded server-side (worker)',
    r.status === 200 && profiles(w.id) === '1' && wm.legal_worker_version === LEGAL_VERSION && !!wm.legal_worker_at, { r, wm })

  // ── API: guest rating ──
  const s1 = await worker('s1'), s2 = await worker('s2')
  const g = await account('guest')
  const ratings = () => sql(`select count(*) from ratings where guest_email = '${g.email}'`)
  r = await api('/api/submit-rating', g.token, { serverId: s1.serverId, score: 5 })
  check('L4 first rating without acknowledgment → 400, nothing saved', r.status === 400 && r.json?.code === 'legal_required' && ratings() === '0', r)
  r = await api('/api/submit-rating', g.token, { serverId: s1.serverId, score: 5, legalAccepted: LEGAL_VERSION })
  const gm = await appMeta(g.token)
  check('L5 with acknowledgment → rating saved; acknowledgment recorded (guest)', r.status === 200 && ratings() === '1' && gm.legal_guest_version === LEGAL_VERSION, { r, gm })
  r = await api('/api/submit-rating', g.token, { serverId: s2.serverId, score: 4 })
  check('L6 later ratings by the same guest need no new tick (version on file)', r.status === 200 && ratings() === '2', r)
  check('L7 worker acknowledgment does not count as guest acknowledgment (separate contexts)',
    (await api('/api/submit-rating', w.token, { serverId: s1.serverId, score: 5 })).json?.code === 'legal_required')

  // ── Browser ──
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  async function fresh() {
    const ctx = await browser.newContext()
    await ctx.route('**/*', rt => {
      const u = new URL(rt.request().url())
      if (u.hostname === 'maps.googleapis.com') return rt.fulfill({ contentType: 'application/javascript', body: MAPS_STUB })
      return u.hostname === 'localhost' ? rt.continue() : rt.abort()
    })
    return ctx.newPage()
  }
  const go = (page, p) => page.goto(APP + p, { waitUntil: 'networkidle', timeout: 120000 })
  const text = async page => (await page.textContent('body')) ?? ''

  // Worker sign-up UI: final button stays disabled until the box is ticked
  {
    const page = await fresh(); const e = email('uiworker')
    await go(page, '/servers/signup?test=1')
    await page.fill('input[placeholder="Marcus"]', 'Una'); await page.fill('input[placeholder="Chen"]', 'Interface')
    await page.fill('input[placeholder="marcus@email.com"]', e)
    await page.fill('input[placeholder="Min. 6 characters"]', 'pass123456'); await page.fill('input[placeholder="Repeat your password"]', 'pass123456')
    await page.click('button:has-text("Continue")'); await page.click('button:has-text("Server")')
    await page.fill('input[placeholder="Search for your restaurant..."]', `UI Bar ${run}`); await page.dispatchEvent('input[placeholder="Search for your restaurant..."]', 'change')
    await page.click('button:has-text("Continue")'); await page.fill('textarea', 'Twenty plus characters of bio text here.')
    const claim = page.locator('button:has-text("Claim my profile")')
    const box = page.locator('[data-testid="legal-consent"] input[type="checkbox"]')
    const disabledBefore = await claim.isDisabled()
    const unticked = !(await box.isChecked())
    const links = await page.locator('[data-testid="legal-consent"] a[href="/terms"]').count() === 1 && await page.locator('[data-testid="legal-consent"] a[href="/privacy"]').count() === 1
    const created = sql(`select count(*) from auth.users where email = '${e}'`)
    const disclosure = (await page.textContent('[data-testid="shift-disclosure"]').catch(() => '')) || ''
    check('L8b sign-up explains that starting a shift is public and may email followers, and the follow-approval setting',
      /anyone can\s+see which venue you.re working at/.test(disclosure) && /email your\s+followers/.test(disclosure) && /follow approval/.test(await text(page)), disclosure)
    check('L8 sign-up UI: box unticked by default, Terms + Privacy links, Claim disabled, no account created yet',
      disabledBefore && unticked && links && created === '0', { disabledBefore, unticked, links, created })
    await box.check()
    await claim.click(); await page.waitForURL('**/dashboard', { timeout: 30000 }).catch(() => {})
    const uid = sql(`select id from auth.users where email = '${e}'`)
    check('L9 after ticking: profile created', !!uid && profiles(uid) === '1', page.url())
  }

  // Rating UI: checkbox required on first rating, hidden once on file
  {
    const s3 = await worker('s3')
    const guest = await account('uiguest')
    const page = await fresh()
    await go(page, '/login'); await page.fill('input[placeholder="Email address"]', guest.email); await page.fill('input[placeholder="Password"]', 'pass123456')
    await page.click('button:has-text("Sign in")'); await page.waitForTimeout(2000)
    await go(page, `/rate?server=${s3.serverId}`); await page.waitForTimeout(1500)
    const box = page.locator('[data-testid="legal-consent"] input[type="checkbox"]')
    check('L10 rating UI: acknowledgment shown, unticked, with Terms + Privacy links', await box.isVisible() && !(await box.isChecked())
      && await page.locator('[data-testid="legal-consent"] a[href="/terms"]').count() === 1)
    check('L10b no Follow action on the rating form before the agreed rating', await page.locator('main button:has-text("Follow")').count() === 0)
    await page.click('[aria-label="5 stars"]'); await page.click('button:has-text("Submit")'); await page.waitForTimeout(1000)
    const savedEarly = sql(`select count(*) from ratings where guest_email = '${guest.email}'`)
    check('L11 submit without ticking → message, nothing saved', /confirm you agree/i.test(await text(page)) && savedEarly === '0', savedEarly)
    await box.check(); await page.click('button:has-text("Submit")'); await page.waitForTimeout(2000)
    check('L12 ticked → rating saved', sql(`select count(*) from ratings where guest_email = '${guest.email}'`) === '1')
    await page.click('button:has-text("Follow")'); await page.waitForTimeout(1000)
    const panel = (await page.textContent('[data-testid="follow-consent"]').catch(() => '')) || ''
    const followsBefore = sql(`select count(*) from follows where follower_id = '${guest.id}'`)
    check('L12b after rating, Follow opens an explanation (shift emails incl. venue, email visible to worker, unfollow) before anything is saved',
      /email you when .* starts a shift, including where they.re working/.test(panel) && /see your email address/.test(panel) && /unfollow/i.test(panel) && followsBefore === '0', { panel, followsBefore })
    await page.click('button:has-text("Follow and email me")'); await page.waitForTimeout(1500)
    check('L12c confirming creates the follow', sql(`select count(*) from follows where follower_id = '${guest.id}' and server_id = '${s3.serverId}'`) === '1')
    const s4 = await worker('s4')
    // New session so the client sees the recorded acknowledgment
    const page2 = await fresh()
    await go(page2, '/login'); await page2.fill('input[placeholder="Email address"]', guest.email); await page2.fill('input[placeholder="Password"]', 'pass123456')
    await page2.click('button:has-text("Sign in")'); await page2.waitForTimeout(2000)
    await go(page2, `/rate?server=${s4.serverId}`); await page2.waitForTimeout(1500)
    check('L13 returning guest (acknowledgment on file) → no checkbox', await page2.locator('[data-testid="legal-consent"]').count() === 0)
  }

  // Scan page: rate only — no follow before the agreed rating
  {
    const s5 = await worker('s5')
    const page = await fresh()
    await go(page, `/scan/${s5.serverId}`); await page.waitForTimeout(1500)
    check('L20 scan page offers Rate but no Follow', await page.locator('button:has-text("Rate")').count() === 1 && await page.locator('button:has-text("Follow")').count() === 0)
  }

  // Guest sign-up: unticked agreement, required, recorded server-side
  {
    const page = await fresh(); const e = email('guestsignup')
    await go(page, '/login?mode=signup')
    await page.fill('input[placeholder="Your name"]', 'Gia Guest'); await page.fill('input[placeholder="Email address"]', e); await page.fill('input[placeholder="Password"]', 'pass123456')
    const create = page.locator('button:has-text("Create account")')
    const box = page.locator('[data-testid="legal-consent"] input[type="checkbox"]')
    check('L21 guest sign-up: agreement unticked, Create account disabled, no account yet',
      !(await box.isChecked()) && await create.isDisabled() && sql(`select count(*) from auth.users where email = '${e}'`) === '0')
    await box.check(); await create.click(); await page.waitForTimeout(2500)
    const tok = await (await fetch(GW + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: 'pass123456' }) })).json()
    const m = await appMeta(tok.access_token)
    check('L22 after ticking: account created and acknowledgment recorded server-side (guest, version + time)', m.legal_guest_version === LEGAL_VERSION && !!m.legal_guest_at, m)
    const fresh2 = await account('noack')
    const bad = await api('/api/legal/accept', fresh2.token, {})
    check('L23b /api/legal/accept without the ticked version → 400, nothing recorded', bad.status === 400 && !(await appMeta(fresh2.token)).legal_guest_version, bad)
  }

  // Profile follow by a guest with no acknowledgment on file
  {
    const s6 = await worker('s6')
    const g2 = await account('profilefollow')
    const page = await fresh()
    await go(page, '/login'); await page.fill('input[placeholder="Email address"]', g2.email); await page.fill('input[placeholder="Password"]', 'pass123456')
    await page.click('button:has-text("Sign in")'); await page.waitForTimeout(2000)
    await go(page, `/server/${s6.serverId}`); await page.waitForTimeout(1500)
    await page.click('button:has-text("Follow")'); await page.waitForTimeout(1000)
    const confirm = page.locator('button:has-text("Follow and email me")')
    const legalBox = page.locator('[data-testid="follow-consent"] [data-testid="legal-consent"] input[type="checkbox"]')
    check('L24 profile Follow: explanation + unticked agreement; confirm disabled; nothing saved yet',
      await legalBox.isVisible() && await confirm.isDisabled() && sql(`select count(*) from follows where follower_id = '${g2.id}'`) === '0')
    await legalBox.check(); await confirm.click(); await page.waitForTimeout(1500)
    check('L25 after ticking: acknowledgment recorded, then follow created',
      (await appMeta(g2.token)).legal_guest_version === LEGAL_VERSION && sql(`select count(*) from follows where follower_id = '${g2.id}'`) === '1')
  }

  // ── Public copy ──
  {
    const page = await fresh()
    const visible = async p => { await go(page, p); return await text(page) }
    const terms = await visible('/terms'), privacy = await visible('/privacy'), home = await visible('/')
    const pay = await visible('/pay'), wp = await visible('/whitepaper'), forServers = await visible('/for-servers')
    check('L14 Terms: no "on the Solana blockchain and are permanent"; has agreement + location sections',
      !/written to the Solana blockchain/i.test(terms) && /Agreeing to These Terms/.test(terms) && /Location Checks/.test(terms) && /no guarantee/i.test(terms))
    check('L15 Privacy: discloses stored coordinates and visible distance; no "never stored"',
      /store your coordinates and your distance from the venue/.test(privacy) && /not proof/.test(privacy) && !/never stored/i.test(privacy))
    check('L16 Home: no "Building on Solana", no 1:1 conversion, $SERVE "may never launch"',
      !/Building on Solana/.test(home) && !/1:1/.test(home) && /may never launch/.test(home))
    check('L17 /pay: no balance, USD conversion or bank payout', /Not available/.test(pay) && !/≈ \$/.test(pay) && !/business days/.test(pay))
    const wpRes = await page.goto(APP + '/whitepaper', { waitUntil: 'networkidle' })
    check('L18 /whitepaper returns 404 and none of its content', wpRes.status() === 404 && !/Cashout Fee|major exchanges/.test(wp), wpRes.status())
    const pages = { home, forServers, terms, gs: await visible('/get-started'), wl: await visible('/server-waitlist') }
    const forever = Object.entries(pages).filter(([, t]) => /free forever|permanently free/i.test(t)).map(([k]) => k)
    check('L19b no "free forever"/"permanently free" on home, for-servers, get-started, waitlist or Terms', forever.length === 0 && /currently free for servers and bartenders/.test(terms), forever)
    check('L19 for-servers: no "Permanent. Immutable."', !/Immutable/.test(forServers) && !/Permanent\./.test(forServers))
  }
  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
