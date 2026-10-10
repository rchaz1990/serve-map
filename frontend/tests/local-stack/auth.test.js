// Sign-up, email confirmation, password reset and restaurant claims, in a real browser
// against the local real-database stack. The gateway simulates Supabase with email
// confirmation ON or OFF (POST /__config) and records sent links (GET /__last_email).
// usage: NODE_PATH=$(npm root -g) node auth.test.js <appUrl> <keys.json>
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const { anon: ANON } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))
const sql = q => execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
let n = 0
const email = tag => `a${Date.now()}-${++n}-${tag}@example.com`
const setConfirm = on => fetch(GW + '/__config', { method: 'POST', body: JSON.stringify({ confirm: on }) })
const lastEmail = async e => (await fetch(GW + '/__last_email?email=' + encodeURIComponent(e))).json()

// Stand-in for the Google Maps script: an Autocomplete that reports whatever is typed.
const MAPS_STUB = `window.google = { maps: { places: { Autocomplete: function (input) {
  var place = null;
  this.addListener = function (ev, cb) { input.addEventListener('change', function () {
    place = { name: input.value, formatted_address: input.value + ', New York, NY',
      geometry: { location: { lat: function () { return 40.74 }, lng: function () { return -73.99 } } } }; cb() }) };
  this.getPlace = function () { return place };
} } } };`

// Tick the Terms/Privacy agreement when the page has one (added by PR #36); no-op otherwise.
const agree = async page => { const box = page.locator('[data-testid="legal-consent"] input[type="checkbox"]'); if (await box.count()) await box.first().check() }
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300)) }

;(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  async function fresh() {
    const ctx = await browser.newContext()
    await ctx.route('**/*', r => {
      const u = new URL(r.request().url())
      if (u.hostname === 'maps.googleapis.com') return r.fulfill({ contentType: 'application/javascript', body: MAPS_STUB })
      return u.hostname === 'localhost' ? r.continue() : r.abort()
    })
    return ctx.newPage()
  }
  const text = async page => (await page.textContent('body')) ?? ''
  const go = (page, path) => page.goto(APP + path, { waitUntil: 'networkidle', timeout: 120000 })

  // ═════ Email confirmation ON ═════
  await setConfirm(true)

  // A. Guest sign-up → check email → can't sign in yet → resend → confirm link → signed in
  {
    const page = await fresh(); const e = email('guest')
    await go(page, '/login?mode=signup')
    await page.fill('input[placeholder="Your name"]', 'Guest Tester')
    await page.fill('input[placeholder="Email address"]', e)
    await page.fill('input[placeholder="Password"]', 'pass123456')
    await agree(page); await page.click('button:has-text("Create account")')
    await page.waitForTimeout(1500)
    check('A1 guest sign-up (confirmation on) → "check your email", stays on sign-in', /Check .* for a confirmation link/.test(await text(page)) && page.url().includes('/login'), page.url())
    check('A2 account exists but is unconfirmed', sql(`select email_confirmed_at is null from auth.users where email = '${e}'`) === 't')

    await page.click('button:has-text("Sign in")')
    await page.waitForTimeout(1500)
    check('A3 signing in before confirming → clear message + resend option', /confirm your email first/i.test(await text(page)) && await page.isVisible('text=Resend confirmation email'))
    const first = (await lastEmail(e)).token_hash
    await page.click('text=Resend confirmation email'); await page.waitForTimeout(1000)
    const resent = await lastEmail(e)
    check('A4 resend sends a new confirmation link', resent && resent.type === 'signup' && resent.token_hash !== first, resent)

    await go(page, `/auth/confirm?token_hash=${resent.token_hash}&type=signup`)
    check('A5 confirmation link → confirmed and signed in (guest lands on /get-started)',
      page.url().endsWith('/get-started') && sql(`select email_confirmed_at is not null from auth.users where email = '${e}'`) === 't', page.url())
    await go(page, `/auth/confirm?token_hash=${resent.token_hash}&type=signup`)
    check('A6 reusing the link → "expired or already used"', page.url().includes('error=link_invalid') && /expired or was already used/.test(await text(page)), page.url())
  }

  // B. Worker sign-up → check email → confirm on ANOTHER device → finish profile
  {
    const page = await fresh(); const e = email('worker')
    await go(page, '/servers/signup?test=1')
    await page.fill('input[placeholder="Marcus"]', 'Wanda'); await page.fill('input[placeholder="Chen"]', 'Worker')
    await page.fill('input[placeholder="marcus@email.com"]', e)
    await page.fill('input[placeholder="Min. 6 characters"]', 'pass123456'); await page.fill('input[placeholder="Repeat your password"]', 'pass123456')
    await page.click('button:has-text("Continue")'); await page.click('button:has-text("Server")')
    await page.fill('input[placeholder="Search for your restaurant..."]', 'Auth Test Bar'); await page.dispatchEvent('input[placeholder="Search for your restaurant..."]', 'change')
    await page.click('button:has-text("Continue")'); await page.fill('textarea', 'Twenty plus characters of bio text here.')
    await agree(page); await page.click('button:has-text("Claim my profile")'); await page.waitForTimeout(1500)
    check('B1 worker sign-up (confirmation on) → asked to confirm email, no profile yet',
      /confirm your account/i.test(await text(page)) && sql(`select count(*) from servers s join auth.users u on u.id::text = s.wallet_address where u.email = '${e}'`) === '0')
    const other = await fresh()                                   // phone / different browser
    await go(other, `/auth/confirm?token_hash=${(await lastEmail(e)).token_hash}&type=signup`)
    check('B2 confirm link on another device → sent to finish the worker profile', other.url().includes('/servers/signup'), other.url())
    await other.waitForTimeout(2500)
    check('B3 resume form prefilled from sign-up', await other.inputValue('input[placeholder="Marcus"]') === 'Wanda')
    await other.click('button:has-text("Continue")'); await other.click('button:has-text("Server")')
    await other.fill('input[placeholder="Search for your restaurant..."]', 'Auth Test Bar'); await other.dispatchEvent('input[placeholder="Search for your restaurant..."]', 'change')
    await other.click('button:has-text("Continue")'); await other.fill('textarea', 'Twenty plus characters of bio text here.')
    await agree(other); await other.click('button:has-text("Claim my profile")'); await other.waitForURL('**/dashboard', { timeout: 30000 }).catch(() => {})
    check('B4 profile created once, owned by the account', sql(`select count(*) from servers s join auth.users u on u.id::text = s.wallet_address where u.email = '${e}'`) === '1', other.url())
  }

  // C. Restaurant sign-up → check email → confirm → manager row created → dashboard
  async function restaurantSignup(page, e, venue, role = 'Host') {
    await go(page, '/restaurant/signup')
    await page.fill('input[placeholder="Search for your restaurant..."]', venue)
    await page.dispatchEvent('input[placeholder="Search for your restaurant..."]', 'change')
    await page.fill('input[placeholder="Manager / Host name"]', 'Morgan Manager')
    await page.selectOption('select', role)
    await page.fill('input[placeholder="manager@restaurant.com"]', e)
    await page.fill('input[placeholder="Min. 6 characters"]', 'pass123456'); await page.fill('input[placeholder="Repeat your password"]', 'pass123456')
    await page.click('button:has-text("Create manager account")'); await page.waitForTimeout(2000)
  }
  {
    const page = await fresh(); const e = email('mgr')
    await restaurantSignup(page, e, 'Confirm Bistro')
    check('C1 restaurant sign-up (confirmation on) → "check your email", no manager row yet',
      /Check .* for a confirmation link/.test(await text(page)) && sql(`select count(*) from restaurant_managers where lower(email) = '${e}'`) === '0')
    await go(page, `/auth/confirm?token_hash=${(await lastEmail(e)).token_hash}&type=signup`)
    const row = sql(`select m.restaurant_name || '|' || m.role || '|' || (m.auth_id = u.id::text) from restaurant_managers m join auth.users u on lower(u.email) = lower(m.email) where u.email = '${e}'`)
    check('C2 confirm link → manager row created from sign-up details → restaurant dashboard',
      page.url().includes('/restaurant/dashboard') && row === 'Confirm Bistro|Host|true', { url: page.url(), row })
  }

  // C3. Confirmed, but first sign-in happens on the restaurant login page instead
  {
    const page = await fresh(); const e = email('mgr2')
    await restaurantSignup(page, e, 'Login Bistro', 'Owner')
    // confirm via a default (PKCE) link opened elsewhere: email is confirmed, browser not signed in
    const t = (await lastEmail(e)).token_hash
    await fetch(GW + '/auth/v1/verify', { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'signup', token_hash: t }) })
    await go(page, '/restaurant/login')
    await page.fill('input[placeholder="manager@restaurant.com"]', e); await page.fill('input[placeholder="Your password"]', 'pass123456')
    await page.click('button:has-text("Sign in")'); await page.waitForURL('**/restaurant/dashboard', { timeout: 30000 }).catch(() => {})
    check('C3 first sign-in on restaurant login creates the manager row', page.url().includes('/restaurant/dashboard')
      && sql(`select restaurant_name || '|' || role from restaurant_managers where lower(email) = '${e}'`) === 'Login Bistro|Owner', page.url())
  }

  // D. Waitlist claims stay Google-only: confirming an inbox is not proof enough to claim
  {
    const e = email('waitlist')
    await fetch(GW + '/rest/v1/restaurant_managers', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${ANON}`, 'content-type': 'application/json', prefer: 'return=minimal' },
      body: JSON.stringify({ email: e, name: 'Wally', restaurant_name: 'Waitlist Cafe', role: 'Owner' }) })
    const page = await fresh()
    await restaurantSignup(page, e, 'Some Other Name')
    await go(page, `/auth/confirm?token_hash=${(await lastEmail(e)).token_hash}&type=signup`)
    const rows = sql(`select count(*) || '|' || string_agg(restaurant_name || ':' || (auth_id is not null), ',') from restaurant_managers where lower(email) = '${e}'`)
    check('D1 confirmed password account does NOT claim a waitlist row (Google-only kept), no duplicate created',
      page.url().includes('/restaurant/login?error=no_manager') && rows === '1|Waitlist Cafe:false', { url: page.url(), rows })
    const g = email('waitlistg')
    await fetch(GW + '/rest/v1/restaurant_managers', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${ANON}`, 'content-type': 'application/json', prefer: 'return=minimal' },
      body: JSON.stringify({ email: g, name: 'Gina', restaurant_name: 'Google Cafe', role: 'Owner' }) })
    const gs = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: g, provider: 'google' }) })).json()
    const claim = await (await fetch(GW + '/rest/v1/rpc/link_my_manager', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${gs.access_token}`, 'content-type': 'application/json' }, body: '{}' })).json()
    check('D2 Google account still claims its waitlist row', Array.isArray(claim) && claim[0]?.restaurant_name === 'Google Cafe'
      && sql(`select (auth_id is not null)::text from restaurant_managers where lower(email) = '${g}'`) === 'true', claim)
  }

  // E. Password reset (works from any device via the token link)
  {
    await setConfirm(false)
    const e = email('reset')
    await fetch(GW + '/auth/v1/signup', { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: 'oldpass123' }) })
    await setConfirm(true)
    const page = await fresh()
    await go(page, '/login'); await page.fill('input[placeholder="Email address"]', e)
    await page.click('text=Forgot password?'); await page.waitForTimeout(1000)
    const mailRec = await lastEmail(e)
    check('E1 reset requested → recovery email sent', /reset email sent/i.test(await text(page)) && mailRec?.type === 'recovery', mailRec)
    const phone = await fresh()
    await go(phone, `/auth/confirm?token_hash=${mailRec.token_hash}&type=recovery`)
    await phone.waitForTimeout(1500)
    check('E2 token reset link on another device → choose-a-new-password page', phone.url().endsWith('/reset-password') && await phone.isVisible('text=Save new password'), phone.url())
    await phone.fill('input[placeholder="New password (min. 6 characters)"]', 'short'); await phone.fill('input[placeholder="Repeat new password"]', 'short')
    await phone.click('button:has-text("Save new password")'); await phone.waitForTimeout(500)
    check('E3 too-short password rejected', /at least 6/.test(await text(phone)))
    await phone.fill('input[placeholder="New password (min. 6 characters)"]', 'newpass123'); await phone.fill('input[placeholder="Repeat new password"]', 'newpass123')
    await phone.click('button:has-text("Save new password")'); await phone.waitForTimeout(1000)
    check('E4 new password saved', /Password updated/.test(await text(phone)))
    const tok = async pw => (await fetch(GW + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON, 'content-type': 'application/json' }, body: JSON.stringify({ email: e, password: pw }) })).status
    check('E5 old password no longer works; new one does', await tok('oldpass123') === 400 && await tok('newpass123') === 200)
    await go(phone, '/reset-password'); await phone.waitForTimeout(1500)
    check('E6 marker cleared after use: revisiting /reset-password (still signed in) shows no form',
      !(await phone.isVisible('text=Save new password')) && /Forgot password\?/.test(await text(phone)))
    const nosession = await fresh(); await go(nosession, '/reset-password'); await nosession.waitForTimeout(1500)
    check('E7 reset page with no session → explains and links back', /expired or was already used/.test(await text(nosession)) && !(await nosession.isVisible('text=Save new password')))

    // An ordinary signed-in session is not a recovery link
    const signedIn = await fresh()
    await go(signedIn, '/login'); await signedIn.fill('input[placeholder="Email address"]', e); await signedIn.fill('input[placeholder="Password"]', 'newpass123')
    await signedIn.click('button:has-text("Sign in")'); await signedIn.waitForTimeout(2000)
    await go(signedIn, '/reset-password'); await signedIn.waitForTimeout(1500)
    check('E8 normal signed-in session → no password form, told to use "Forgot password?"',
      !(await signedIn.isVisible('text=Save new password')) && /use “Forgot password\?”/.test(await text(signedIn)), signedIn.url())
    await go(signedIn, '/reset-password?code=forged'); await signedIn.waitForTimeout(1500)
    check('E9 signed-in session + made-up ?code → no password form', !(await signedIn.isVisible('text=Save new password')), signedIn.url())
    await go(signedIn, '/login'); await signedIn.fill('input[placeholder="Email address"]', e); await signedIn.fill('input[placeholder="Password"]', 'newpass123')
    await signedIn.click('button:has-text("Sign in")'); await signedIn.waitForTimeout(2000)
    await signedIn.context().addCookies([{ name: 'slate_pw_recovery', value: '00000000-0000-0000-0000-000000000000', url: APP + '/reset-password' }])
    await go(signedIn, '/reset-password'); await signedIn.waitForTimeout(1500)
    check('E10 marker for a different account → no password form', !(await signedIn.isVisible('text=Save new password')) && /use “Forgot password\?”/.test(await text(signedIn)))

    // Default (PKCE) reset link opened in the same browser that requested it
    await signedIn.context().clearCookies()
    await go(signedIn, '/login'); await signedIn.fill('input[placeholder="Email address"]', e)
    await signedIn.click('text=Forgot password?'); await signedIn.waitForTimeout(1000)
    const pk = await lastEmail(e)
    await go(signedIn, `/auth/callback?code=${pk.code}`); await signedIn.waitForTimeout(1500)
    check('E11 default reset link, same browser → choose-a-new-password page', signedIn.url().endsWith('/reset-password') && await signedIn.isVisible('text=Save new password'), { url: signedIn.url(), pk })
    await signedIn.fill('input[placeholder="New password (min. 6 characters)"]', 'third123'); await signedIn.fill('input[placeholder="Repeat new password"]', 'third123')
    await signedIn.click('button:has-text("Save new password")'); await signedIn.waitForTimeout(1000)
    check('E12 password changed via default link', /Password updated/.test(await text(signedIn)) && await tok('third123') === 200)

    // Same kind of link opened in another browser cannot be used there
    const other = await fresh()
    await go(other, '/login'); await other.fill('input[placeholder="Email address"]', e)
    await other.click('text=Forgot password?'); await other.waitForTimeout(1000)
    const pk2 = await lastEmail(e)
    const third = await fresh(); await go(third, `/auth/callback?code=${pk2.code}`); await third.waitForTimeout(1500)
    check('E13 default reset link in a different browser → not signed in, no password form',
      third.url().includes('/login') && !(await third.isVisible('text=Save new password')), third.url())
    await go(third, `/reset-password?code=${pk2.code}`); await third.waitForTimeout(1500)
    check('E14 old-style /reset-password?code= link is routed through the callback (no form elsewhere)', !(await third.isVisible('text=Save new password')), third.url())
  }

  // F. Default (PKCE) links opened on another device; bad links
  {
    const page = await fresh()
    await go(page, '/auth/callback?code=from-another-device')
    check('F1 code link that cannot finish here → friendly "confirmed — sign in" notice', page.url().includes('notice=confirmed_elsewhere') && /If you just confirmed your email/.test(await text(page)), page.url())
    await go(page, '/auth/callback?error=access_denied&error_code=otp_expired')
    check('F2 expired default link → "expired or already used"', page.url().includes('error=link_invalid'), page.url())
    await go(page, '/auth/confirm?token_hash=nonsense&type=signup')
    check('F3 tampered token link → "expired or already used"', page.url().includes('error=link_invalid'), page.url())
    await go(page, '/auth/confirm?token_hash=x&type=admin')
    check('F4 unknown link type rejected', page.url().includes('error=link_invalid'), page.url())
  }

  // ═════ Email confirmation OFF (today's production setting) ═════
  await setConfirm(false)
  {
    const page = await fresh(); const e = email('guestoff')
    await go(page, '/login?mode=signup')
    await page.fill('input[placeholder="Your name"]', 'Off Guest'); await page.fill('input[placeholder="Email address"]', e); await page.fill('input[placeholder="Password"]', 'pass123456')
    await agree(page); await page.click('button:has-text("Create account")'); await page.waitForURL('**/live', { timeout: 30000 }).catch(() => {})
    check('G1 guest sign-up (confirmation off) → signed in straight away (unchanged)', page.url().includes('/live'), page.url())
  }
  {
    const page = await fresh(); const e = email('mgroff')
    await restaurantSignup(page, e, 'Instant Diner', 'General Manager')
    await page.waitForURL('**/restaurant/dashboard', { timeout: 30000 }).catch(() => {})
    check('G2 restaurant sign-up (confirmation off) → manager row + dashboard immediately (unchanged)',
      page.url().includes('/restaurant/dashboard') && sql(`select restaurant_name || '|' || role from restaurant_managers where lower(email) = '${e}'`) === 'Instant Diner|General Manager', page.url())
  }
  {
    const e = email('waitoff')
    await fetch(GW + '/rest/v1/restaurant_managers', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${ANON}`, 'content-type': 'application/json', prefer: 'return=minimal' },
      body: JSON.stringify({ email: e, name: 'W', restaurant_name: 'Unproven Cafe', role: 'Owner' }) })
    const page = await fresh()
    await restaurantSignup(page, e, 'Grab Attempt'); await page.waitForTimeout(1500)
    check('G3 auto-confirmed password account cannot claim a waitlist row by email (unproven inbox)',
      sql(`select count(*) || '|' || bool_and(auth_id is null) from restaurant_managers where lower(email) = '${e}'`) === '1|true' && /waitlist/i.test(await text(page)))
  }

  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
