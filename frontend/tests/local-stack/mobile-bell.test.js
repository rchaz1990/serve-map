// Signed-in users on phones can reach their in-app notifications (Navbar bell on small screens).
// Local stack only. usage: NODE_PATH=$(npm root -g) node mobile-bell.test.js <appUrl> <keys.json>
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const [APP] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const sql = q => execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
const run = `mb${Date.now()}`
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300)) }

;(async () => {
  const e = `${run}-guest@example.com`
  const u = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: e, password: 'pass123456' }) })).json()
  const nid = sql(`insert into notifications (recipient_email, type, title, message, link) values ('${e}', 'shift_started', 'Rhea is working tonight', 'Rhea is at Test Bar', '/terms') returning id`).split('\n')[0]
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  async function ctx(viewport, signIn) {
    const c = await browser.newContext({ viewport, hasTouch: viewport.width < 768, isMobile: viewport.width < 768 })
    await c.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort())
    const p = await c.newPage()
    if (signIn) {
      await p.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 120000 })
      await p.fill('input[placeholder="Email address"]', e); await p.fill('input[placeholder="Password"]', 'pass123456')
      await p.click('button:has-text("Sign in")'); await p.waitForTimeout(2500)
    }
    await p.goto(APP + '/terms', { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2000)
    return p
  }
  const PHONE = { width: 390, height: 844 }

  {
    const p = await ctx(PHONE, false)
    check('M1 logged-out phone: no bell (nothing to show)', !(await p.isVisible('[data-testid="mobile-bell"]')))
    await p.context().close()
  }
  {
    const p = await ctx(PHONE, true)
    const bell = p.locator('[data-testid="mobile-bell"] button[aria-label^="Notifications"]')
    const visible = await bell.isVisible()
    const label = visible ? await bell.getAttribute('aria-label') : null
    const box = visible ? await bell.boundingBox() : null
    check('M2 signed-in phone: bell visible in the header with the unread count, tap target ≥ 36px', visible && label === 'Notifications (1 unread)' && box && box.width >= 36 && box.height >= 36, { visible, label, box })
    await bell.tap(); await p.waitForTimeout(500)
    const panel = await p.textContent('body')
    const panelBox = await p.locator('[data-testid="mobile-bell"] >> text=Rhea is working tonight').boundingBox()
    check('M3 tapping the bell lists the notification inside the screen width', /Rhea is working tonight/.test(panel) && panelBox && panelBox.x >= 0 && panelBox.x + panelBox.width <= PHONE.width, panelBox)
    await p.locator('[data-testid="mobile-bell"] >> text=Rhea is working tonight').tap(); await p.waitForTimeout(2000)
    check('M4 tapping the notification marks it read and opens its link', sql(`select is_read from notifications where id = '${nid}'`) === 't' && /\/terms/.test(p.url()), p.url())
    await p.waitForTimeout(1500)
    const label2 = await p.locator('[data-testid="mobile-bell"] button[aria-label^="Notifications"]').getAttribute('aria-label')
    check('M5 after reading: bell stays, no unread count', label2 === 'Notifications')
    await p.locator('[data-testid="mobile-bell"] button').tap(); await p.waitForTimeout(400)
    await p.tap('h1').catch(async () => { await p.mouse.click(20, 400) }); await p.waitForTimeout(400)
    check('M6 tapping outside closes the list', !(await p.isVisible('text=No new notifications')))
    await p.context().close()
  }
  {
    const p = await ctx({ width: 1280, height: 800 }, true)
    const desktopBells = await p.locator('button[aria-label^="Notifications"]').evaluateAll(els => els.filter(el => el.offsetParent !== null).length)
    await p.locator('button[aria-label^="Notifications"] >> visible=true').click(); await p.waitForTimeout(400)
    check('M7 desktop unchanged: exactly one visible bell and its list opens', desktopBells === 1 && await p.isVisible('text=No new notifications'), { desktopBells })
    await p.context().close()
  }
  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(err => { console.error('ERROR', err); process.exit(1) })
