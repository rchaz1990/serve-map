// Returning guest on a worker's QR page: a guest who already rated the worker can follow
// without another rating attempt; the 24-hour rating limit and all follow protections stay.
// Local stack only. usage: NODE_PATH=$(npm root -g) node returning-guest.test.js <appUrl> <keys.json>
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const LEGAL_VERSION = fs.readFileSync(path.join(__dirname, '../../lib/legal.ts'), 'utf8').match(/LEGAL_VERSION = '([^']+)'/)[1]
const sql = q => execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
const run = `rg${Date.now()}`
let n = 0
const email = tag => `${run}-${++n}-${tag}@example.com`
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300)) }

async function account(tag, { tester = false } = {}) {
  const e = email(tag)
  if (tester) sql(`insert into test_accounts (email) values ('${e}')`)
  const s = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: e, password: 'pass123456' }) })).json()
  return { email: e, id: s.user.id, token: s.access_token }
}
async function api(p, token, body) {
  const r = await fetch(APP + p, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  let json = null; try { json = await r.json() } catch {}
  return { status: r.status, json }
}
async function worker(tag, { approval = 'automatic', agree = true, tester = false } = {}) {
  const a = await account(tag, { tester })
  const id = sql(`insert into servers (name, email, wallet_address, follow_approval) values ('Rhea ${tag}', '${a.email}', '${a.id}', '${approval}') returning id`).split('\n')[0]
  sql(`insert into server_restaurants (server_id, restaurant_name, restaurant_address) values ('${id}', 'Return Bar ${run}', '1 Return St')`)
  if (agree) await api('/api/legal/accept', a.token, { version: LEGAL_VERSION, context: 'worker' })
  return { ...a, serverId: id }
}
const rate = (g, w) => api('/api/submit-rating', g.token, { serverId: w.serverId, score: 5, legalAccepted: LEGAL_VERSION })
const relationship = async (w, token) => { const r = await fetch(APP + '/api/rating-relationship?server=' + w.serverId, { headers: token ? { authorization: `Bearer ${token}` } : {} }); return { status: r.status, json: await r.json().catch(() => null) } }
const followRow = (g, w) => sql(`select coalesce(status,'') || '|' || notify_email || '|' || (email_opt_in_at is not null) from follows where follower_id = '${g.id}' and server_id = '${w.serverId}'`)

;(async () => {
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
  const scan = async (p, w) => { await p.goto(APP + `/scan/${w.serverId}`, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2000) }
  const ui = async p => ({
    rateBtn: await p.isVisible('button:has-text("Rate ")'),
    recent: await p.isVisible('[data-testid="rated-recently"]'),
    follow: await p.isVisible('[data-testid="returning-follow"]'),
    following: /You follow|Follow request sent/.test((await p.textContent('body')) || ''),
  })

  const W = await worker('auto')
  const G = await account('guest')

  // Logged out and not-yet-rated: unchanged ("Rate" only)
  {
    const p = await page(null); await scan(p, W)
    const s = await ui(p)
    check('R1 logged-out visitor: QR page unchanged — Rate only, no Follow', s.rateBtn && !s.follow && !s.recent, s)
    await p.context().close()
    const p2 = await page(G); await scan(p2, W)
    const s2 = await ui(p2)
    check('R2 signed-in guest who has not rated: Rate only, no Follow (rate-before-follow kept)', s2.rateBtn && !s2.follow && !s2.recent, s2)
    await p2.context().close()
  }

  // Returning after a rating (inside the 24-hour cooldown)
  const r = await rate(G, W)
  check('R3 setup: guest rates the worker', r.status === 200, r)
  {
    const p = await page(G); await scan(p, W)
    const s = await ui(p)
    check('R4 returning guest inside 24h: told they rated recently, no Rate button (no failed attempt needed), Follow offered', !s.rateBtn && s.recent && s.follow && !s.following, s)
    await p.click('[data-testid="returning-follow"]'); await p.waitForTimeout(800)
    const consent = await p.isVisible('[data-testid="follow-consent"]')
    const before = followRow(G, W)
    check('R5 Follow opens the existing consent panel first; nothing is saved until confirmed', consent && before === '', { consent, before })
    await p.click('button:has-text("Follow and email me")'); await p.waitForTimeout(2000)
    const after = await ui(p)
    check('R6 "Follow and email me": follow saved (approved), shift-email opt-in recorded by the database; page shows "You follow"',
      followRow(G, W) === 'approved|true|true' && after.following && !after.follow && sql(`select follower_count from servers where id = '${W.serverId}'`) === '1', { row: followRow(G, W), after })
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2000)
    const again = await ui(p)
    check('R7 already following: no Follow button on return, "You follow" shown; still no Rate button inside 24h', again.following && !again.follow && !again.rateBtn, again)
    await p.context().close()
  }
  const second = await rate(G, W)
  check('R8 24-hour rating limit unchanged (second rating refused, still one rating)', second.status === 429 && sql(`select count(*) from ratings where server_id = '${W.serverId}'`) === '1', second)

  // Approval-required worker → follow request pending
  {
    const W2 = await worker('approval', { approval: 'approval' })
    const G2 = await account('guest2'); await rate(G2, W2)
    const p = await page(G2); await scan(p, W2)
    await p.click('[data-testid="returning-follow"]'); await p.waitForTimeout(800)
    await p.click('button:has-text("Follow and email me")'); await p.waitForTimeout(2000)
    check('R9 worker with follow approval: request saved as pending; page says "Follow request sent"',
      followRow(G2, W2) === 'pending|true|true' && /Follow request sent/.test((await p.textContent('body')) || ''), followRow(G2, W2))
    await p.context().close()
  }

  // Worker who no longer accepts new follows (not on the current agreement) → refused by the database
  {
    const W3 = await worker('closed', { agree: false })
    const G3 = await account('guest3'); await api('/api/legal/accept', G3.token, { version: LEGAL_VERSION })
    sql(`insert into ratings (server_id, score, guest_email, guest_id) values ('${W3.serverId}', 5, '${G3.email}', '${G3.id}')`)
    const p = await page(G3); await scan(p, W3)
    await p.click('[data-testid="returning-follow"]'); await p.waitForTimeout(800)
    await p.click('button:has-text("Follow and email me")'); await p.waitForTimeout(2000)
    check('R10 database protections still apply: a worker who has not accepted cannot be followed; message shown, nothing saved',
      followRow(G3, W3) === '' && /isn.t accepting new followers/.test((await p.textContent('body')) || ''))
    await p.context().close()
  }

  // Rated more than 24h ago: can rate again, and can follow without rating again
  {
    const W4 = await worker('older')
    const G4 = await account('guest4'); await rate(G4, W4)
    sql(`update ratings set created_at = now() - interval '25 hours' where server_id = '${W4.serverId}'`)
    const p = await page(G4); await scan(p, W4)
    const s = await ui(p)
    check('R11 rated more than 24h ago: Rate available again, Follow also offered (already rated)', s.rateBtn && !s.recent && s.follow, s)
    await p.context().close()
  }

  // The relationship check
  {
    const other = await account('other')
    const a = await relationship(W, null), b = await relationship(W, other.token), c = await relationship(W, G.token)
    check('R12 rating-relationship: sign-in required; answers only about the caller\'s own ratings (yes/no)',
      a.status === 401 && b.status === 200 && b.json?.rated === false && c.json?.rated === true && c.json?.inCooldown === true && Object.keys(c.json).sort().join() === 'inCooldown,rated', { a, b, c })
    if (sql(`select count(*) from pg_class where relname = 'test_accounts'`) === '1') {
      const T = await worker('testworker', { tester: true })
      const real = await relationship(T, other.token)
      check('R13 test profiles: the relationship check answers "not found" to non-test accounts', real.status === 404, real)
    }
  }

  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
