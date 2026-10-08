// Drives the real signup page in Chromium against the isolated mock.
// usage: node flow.js <baseUrl> <label> [mode]
//   mode: normal (default) | reload-after-signup | double-click | resume-existing
const { chromium } = require('playwright')
const [base, label, mode = 'normal'] = process.argv.slice(2)
const MOCK = 'http://localhost:54400'
const t0 = Date.now()
const ts = () => ((Date.now() - t0) / 1000).toFixed(2).padStart(6)
const log = (...a) => console.log(ts(), ...a)

;(async () => {
  await fetch(MOCK + '/__reset')
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  // Isolation: nothing leaves localhost.
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url())
    return u.hostname === 'localhost' ? r.continue() : r.abort()
  })
  const page = await ctx.newPage()
  page.on('framenavigated', f => { if (f === page.mainFrame()) log('NAVIGATED', f.url()) })
  page.on('console', m => { const t = m.text(); if (/error|lock|signup|Navbar|fail/i.test(t) && !/Google Maps key|Download the React/.test(t)) log('console.' + m.type(), t.slice(0, 200)) })
  page.on('pageerror', e => log('PAGEERROR', e.message.slice(0, 200)))
  page.on('request', r => { const u = r.url(); if (u.startsWith(MOCK) && r.method() !== 'OPTIONS' || u.includes('/api/')) log('→', r.method(), u.replace(MOCK, 'SB').replace(base, '').slice(0, 110)) })
  page.on('requestfailed', r => log('✗ FAILED', r.method(), r.url().replace(MOCK, 'SB').slice(0, 90), r.failure()?.errorText))
  page.on('response', r => { const u = r.url(); if (u.includes('/api/')) log('←', r.status(), u.replace(base, '')) })

  const state = async () => {
    try {
      return await page.evaluate(() => ({
        marker: window.__marker === 1,
        btn: [...document.querySelectorAll('button')].map(b => b.innerText.trim()).find(t => /Continue|Claim|Creating/.test(t)),
        firstName: document.querySelector('input[placeholder="Marcus"]')?.value ?? null,
        err: document.querySelector('.text-red-400')?.innerText ?? null,
        path: location.pathname + location.search,
      }))
    } catch (e) { return { evalError: e.message.slice(0, 80) } }
  }

  async function fillAndClaim(skipAccount) {
    if (!skipAccount) {
      await page.fill('input[placeholder="Marcus"]', 'Hazel')
      await page.fill('input[placeholder="Chen"]', 'Tester')
      await page.fill('input[placeholder="marcus@email.com"]', 'r.chaz1990+hazeltest@gmail.com')
      await page.fill('input[placeholder="Min. 6 characters"]', 'testpass123')
      await page.fill('input[placeholder="Repeat your password"]', 'testpass123')
    }
    await page.click('button:has-text("Continue")')
    await page.click('button:has-text("Server")')
    await page.fill('input[placeholder="Search for your restaurant..."]', 'Slate Dry Run Test Venue')
    await page.click('button:has-text("Continue")')
    await page.fill('textarea', 'Twenty plus characters of bio text here.')
    await page.evaluate(() => { window.__marker = 1 })
    if (mode === 'double-click') {
      const b = page.locator('button:has-text("Claim my profile")')
      await Promise.all([b.click(), b.dblclick({ force: true }).catch(() => {})])
    } else {
      await page.click('button:has-text("Claim my profile")')
    }
    log('CLICKED Claim')
  }

  await page.goto(base + '/servers/signup?test=1', { waitUntil: 'networkidle', timeout: 180000 })
  log('LOADED', JSON.stringify(await state()))

  if (mode === 'resume-existing') {
    // An account exists with no profile (the orphan case): sign in, then open the signup page.
    await fetch(MOCK + '/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: 'r.chaz1990+hazeltest@gmail.com', password: 'x', data: { full_name: 'Hazel Tester', signup_role: 'server' } }) })
    await page.goto(base + '/login', { waitUntil: 'networkidle', timeout: 180000 })
    await page.fill('input[type="email"]', 'r.chaz1990+hazeltest@gmail.com')
    await page.fill('input[type="password"]', 'testpass123')
    await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first().click()
    await page.waitForTimeout(4000)
    log('AFTER LOGIN', JSON.stringify(await state()))
    await page.goto(base + '/servers/signup?test=1', { waitUntil: 'networkidle', timeout: 180000 })
    await page.waitForTimeout(2000)
    log('RESUME PAGE', JSON.stringify(await state()))
    await fillAndClaim(true)
  } else {
    await fillAndClaim(false)
  }

  if (mode === 'reload-after-signup') {
    await page.waitForResponse(r => r.url().includes('/auth/v1/signup'), { timeout: 10000 }).catch(() => {})
    await page.reload({ waitUntil: 'networkidle' })
    log('RELOADED', JSON.stringify(await state()))
    if ((await state()).path?.startsWith('/servers/signup')) await fillAndClaim(true)
  }

  for (const s of [1, 6, 15, 30]) {
    await page.waitForTimeout(s * 1000 - (Date.now() - t0) % 1000)
    log(`STATE@${s}s`, JSON.stringify(await state()))
  }
  if (mode === 'reload-after-signup' || mode === 'resume-existing') {
    // Recovery idempotency: visiting the signup page again must not create anything.
    await page.goto(base + '/servers/signup?test=1', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    log('REVISIT', JSON.stringify(await state()))
  }
  const st = await (await fetch(MOCK + '/__state')).json()
  log('DB', JSON.stringify({ users: st.users.length, servers: st.db.servers.map(s => ({ owner: s.wallet_address?.slice(0, 8), email: s.email, is_test: s.is_test })), restaurants: st.db.server_restaurants.length }))
  await browser.close()
})().catch(e => { console.error('FLOW ERROR', e.message); process.exit(1) })
