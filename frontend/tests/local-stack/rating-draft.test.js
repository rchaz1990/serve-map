// First-time guest rating flow: the draft survives authentication and is never auto-submitted.
// Local stack only (integration of PRs #36/#46/#42 + this change). No real email or Google.
// usage: NODE_PATH=$(npm root -g) node rating-draft.test.js <appUrl> <keys.json>
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const [APP, KEYS, APP_LOG] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const sql = q => execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
const run = `d${Date.now()}`
let n = 0
const email = tag => `${run}-${++n}-${tag}@example.com`
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300)) }
const setConfirm = on => fetch(GW + '/__config', { method: 'POST', body: JSON.stringify({ confirm: on }) })
const lastEmail = async e => (await fetch(GW + '/__last_email?email=' + encodeURIComponent(e))).json()

async function account(tag) {
  const e = email(tag)
  const s = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: e, password: 'pass123456' }) })).json()
  return { email: e, id: s.user.id }
}
async function worker(tag) {
  const a = await account(tag)
  const id = sql(`insert into servers (name, email, wallet_address) values ('Riley ${tag}', '${a.email}', '${a.id}') returning id`).split('\n')[0]
  return { ...a, serverId: id }
}
const ratingsBy = e => sql(`select count(*) from ratings where lower(guest_email) = lower('${e}')`)
const ratingRow = e => sql(`select score || '|' || coalesce(comment, '') || '|' || array_to_string(tags, ',') from ratings where lower(guest_email) = lower('${e}')`)

;(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  const urls = []
  async function fresh() {
    const ctx = await browser.newContext()
    await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort())
    const page = await ctx.newPage()
    page.on('framenavigated', f => { if (f === page.mainFrame()) urls.push(f.url()) })
    return page
  }
  const go = (page, p) => page.goto(APP + p, { waitUntil: 'networkidle', timeout: 120000 })
  const text = async page => (await page.textContent('body')) ?? ''
  const COMMENT = `Secret draft note ${run}`
  async function draftRating(page, w, stars = 4) {
    await go(page, `/rate?server=${w.serverId}`); await page.waitForTimeout(1200)
    await page.click(`[aria-label="${stars} stars"]`)
    await page.click('button:has-text("Attentive")'); await page.click('button:has-text("Friendly")')
    await page.fill('textarea', COMMENT)
    await page.click('button:has-text("Submit")'); await page.waitForTimeout(1500)
  }
  const formState = async page => ({
    restored: await page.isVisible('[data-testid="draft-restored"]'),
    comment: await page.inputValue('textarea').catch(() => ''),
    starOn: await page.getAttribute('[aria-label="4 stars"]', 'aria-checked').catch(() => null),
  })
  await setConfirm(false)

  // 1. Signed-out guest → sign-up form, draft kept, nothing sent
  const w1 = await worker('w1')
  {
    const page = await fresh()
    await draftRating(page, w1)
    check('D1 signed-out Submit → sign-up form (not sign-in), with rating context; nothing posted',
      page.url().includes('/login') && page.url().includes('mode=signup') && await page.isVisible('input[placeholder="Your name"]')
        && await page.isVisible('[data-testid="rate-context"]') && sql(`select count(*) from ratings where server_id = '${w1.serverId}'`) === '0', page.url())

    // 2. Email sign-up (confirmation off) → back on that worker's rating page, draft restored, not submitted
    const g = email('guest')
    await page.fill('input[placeholder="Your name"]', 'Gina Guest'); await page.fill('input[placeholder="Email address"]', g); await page.fill('input[placeholder="Password"]', 'pass123456')
    await page.check('[data-testid="legal-consent"] input[type="checkbox"]')
    await page.click('button:has-text("Create account")'); await page.waitForURL(`**/rate?server=${w1.serverId}`, { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const st = await formState(page)
    check('D2 after email sign-up: back on the same worker\'s rating page with stars, tags and comment restored',
      page.url().endsWith(`/rate?server=${w1.serverId}`) && st.restored && st.comment === COMMENT && st.starOn === 'true'
        && await page.locator('button:has-text("Attentive")').evaluate(el => getComputedStyle(el).backgroundColor) === 'rgb(255, 255, 255)', { url: page.url(), st })
    check('D3 restored draft is NOT submitted automatically', ratingsBy(g) === '0')
    await page.click('button:has-text("Submit")'); await page.waitForTimeout(2000)
    check('D4 guest taps Submit → the restored rating is posted exactly as drafted (agreement was ticked at sign-up)',
      ratingRow(g) === `4|${COMMENT}|Attentive,Friendly`, ratingRow(g))
    check('D5 draft removed after posting', await page.evaluate(id => localStorage.getItem('slate_rating_draft:' + id), w1.serverId) === null)
  }

  // 3. Existing account signs in from the rating flow; agreement NOT pre-ticked
  const w2 = await worker('w2')
  {
    const existing = await account('existing')
    const page = await fresh()
    await draftRating(page, w2)
    await page.click('span:has-text("Sign in")'); await page.waitForTimeout(300)
    await page.fill('input[placeholder="Email address"]', existing.email); await page.fill('input[placeholder="Password"]', 'pass123456')
    await page.click('button:has-text("Sign in")'); await page.waitForURL(`**/rate?server=${w2.serverId}`, { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const st = await formState(page)
    const box = page.locator('[data-testid="legal-consent"] input[type="checkbox"]')
    check('D6 existing-account sign-in returns to the same rating page with the draft restored', page.url().endsWith(`/rate?server=${w2.serverId}`) && st.restored && st.comment === COMMENT, { url: page.url(), st })
    check('D7 agreement is shown unticked (never accepted on the guest\'s behalf); nothing posted yet', await box.isVisible() && !(await box.isChecked()) && ratingsBy(existing.email) === '0')
    await page.click('button:has-text("Submit")'); await page.waitForTimeout(1000)
    check('D8 Submit without ticking → refused, draft still on screen', ratingsBy(existing.email) === '0' && /confirm you agree/i.test(await text(page)) && (await formState(page)).comment === COMMENT)
    await box.check(); await page.click('button:has-text("Submit")'); await page.waitForTimeout(2000)
    check('D9 ticked → posted', ratingRow(existing.email) === `4|${COMMENT}|Attentive,Friendly`, ratingRow(existing.email))
  }

  // 4. Email confirmation ON: confirm link opened in the same browser returns to the draft
  const w3 = await worker('w3')
  await setConfirm(true)
  {
    const page = await fresh()
    await draftRating(page, w3)
    const g = email('confirm')
    await page.fill('input[placeholder="Your name"]', 'Cora Confirm'); await page.fill('input[placeholder="Email address"]', g); await page.fill('input[placeholder="Password"]', 'pass123456')
    await page.check('[data-testid="legal-consent"] input[type="checkbox"]')
    await page.click('button:has-text("Create account")'); await page.waitForTimeout(1500)
    check('D10 confirmation on: told to check email; nothing posted', /Check .* for a confirmation link/.test(await text(page)) && ratingsBy(g) === '0')
    const note = await page.textContent('[data-testid="draft-device-note"]').catch(() => '')
    check('D10b confirmation notice says the unposted rating is saved only in this browser/device',
      /hasn.t been posted/.test(note) && /only in this browser on this device/.test(note) && !note.includes(COMMENT), note)
    const mail = await lastEmail(g)
    await go(page, `/auth/confirm?token_hash=${mail.token_hash}&type=signup`); await page.waitForTimeout(1500)
    const st = await formState(page)
    const box = page.locator('[data-testid="legal-consent"] input[type="checkbox"]')
    check('D11 confirmation link (same browser) → back on the rating page with the draft restored',
      page.url().endsWith(`/rate?server=${w3.serverId}`) && st.restored && st.comment === COMMENT, { url: page.url(), st })
    check('D12 not submitted, and the agreement is asked for again unticked (no session existed at sign-up to record it)',
      ratingsBy(g) === '0' && await box.isVisible() && !(await box.isChecked()))
  }
  // 4b. Confirmation link opened on another device: no draft there; back in the original browser, sign-in restores it
  const w7 = await worker('w7')
  {
    const page = await fresh()
    await draftRating(page, w7)
    const g = email('elsewhere')
    await page.fill('input[placeholder="Your name"]', 'Eli Elsewhere'); await page.fill('input[placeholder="Email address"]', g); await page.fill('input[placeholder="Password"]', 'pass123456')
    await page.check('[data-testid="legal-consent"] input[type="checkbox"]')
    await page.click('button:has-text("Create account")'); await page.waitForTimeout(1500)
    const mail = await lastEmail(g)
    const other = await fresh()
    await go(other, `/auth/confirm?token_hash=${mail.token_hash}&type=signup`); await other.waitForTimeout(1500)
    check('D20 link opened on another device: not taken to the rating, no draft shown there, nothing posted',
      !other.url().includes('/rate') && !(await other.isVisible('[data-testid="draft-restored"]')) && ratingsBy(g) === '0', other.url())
    await other.context().close()
    await page.fill('input[placeholder="Email address"]', g); await page.fill('input[placeholder="Password"]', 'pass123456')
    await page.click('button:has-text("Sign in")'); await page.waitForURL(`**/rate?server=${w7.serverId}`, { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const st = await formState(page)
    check('D21 back in the original browser, sign-in returns to that rating with the draft restored, still unposted',
      page.url().endsWith(`/rate?server=${w7.serverId}`) && st.restored && st.comment === COMMENT && ratingsBy(g) === '0', { url: page.url(), st })
  }
  await setConfirm(false)

  // 5. Google sign-up path: return hint and draft are in place before leaving for Google
  const w4 = await worker('w4')
  {
    const page = await fresh()
    await draftRating(page, w4)
    await page.check('[data-testid="legal-consent"] input[type="checkbox"]')
    await page.click('button:has-text("Continue with Google")'); await page.waitForTimeout(1500)
    const cookies = await page.context().cookies(APP)
    const hint = cookies.find(c => c.name === 'slate_oauth_next')
    await go(page, '/terms') // back on the app's origin to read its storage
    const draft = await page.evaluate(id => localStorage.getItem('slate_rating_draft:' + id), w4.serverId)
    check('D13 Google sign-up: return path to this worker\'s rating page set, draft saved on the device',
      hint && decodeURIComponent(hint.value) === `/rate?server=${w4.serverId}` && draft && JSON.parse(draft).comment === COMMENT, { hint, draft })
  }

  // 6. Interrupted / abandoned authentication
  const w5 = await worker('w5'); const w6 = await worker('w6')
  {
    const page = await fresh()
    await draftRating(page, w5)
    await page.goBack({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
    const st = await formState(page)
    check('D14 guest backs out of sign-up → draft still restored on the rating page', page.url().includes(`/rate?server=${w5.serverId}`) && st.restored && st.comment === COMMENT, st)
    await page.click('[data-testid="draft-restored"] button:has-text("Discard")'); await page.waitForTimeout(300)
    check('D15 "Discard it" clears the form and the saved draft',
      (await page.inputValue('textarea')) === '' && await page.evaluate(id => localStorage.getItem('slate_rating_draft:' + id), w5.serverId) === null)
    await draftRating(page, w5)
    await go(page, `/rate?server=${w6.serverId}`); await page.waitForTimeout(1200)
    check('D16 a draft for one worker never appears on another worker\'s page', !(await page.isVisible('[data-testid="draft-restored"]')) && (await page.inputValue('textarea')) === '')
    await page.evaluate(id => { const k = 'slate_rating_draft:' + id; const d = JSON.parse(localStorage.getItem(k)); d.savedAt = Date.now() - 2 * 3600 * 1000; localStorage.setItem(k, JSON.stringify(d)) }, w5.serverId)
    await go(page, `/rate?server=${w5.serverId}`); await page.waitForTimeout(1200)
    check('D17 drafts older than one hour are dropped', !(await page.isVisible('[data-testid="draft-restored"]'))
      && await page.evaluate(id => localStorage.getItem('slate_rating_draft:' + id), w5.serverId) === null)
  }

  // 7. Drafts never in URLs or server logs
  const leakedUrl = urls.filter(u => u.includes(encodeURIComponent(COMMENT)) || u.includes(COMMENT) || /Secret/.test(decodeURIComponent(u)))
  const log = APP_LOG ? fs.readFileSync(APP_LOG, 'utf8') : ''
  check('D18 the draft text never appears in any URL visited', leakedUrl.length === 0, leakedUrl)
  check('D19 the draft text never appears in the app server log', APP_LOG ? !log.includes('Secret draft note') : true)

  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
