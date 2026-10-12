// Employment verification (local only, synthetic documents only).
// See docs/EMPLOYMENT_VERIFICATION.md. Needs: storage-schema.sql + migration 45 on the local
// database (applied here if missing), the gateway with its storage stand-in, and the app
// started with SLATE_VERIFICATION_LOCAL_TEST=1 and a local CRON_SECRET_KEY.
// usage: NODE_PATH=$(npm root -g) node verification.test.js <appUrl> <keys.json> <appDir> <appLogFile> <cronSecret>
// The test starts two extra app instances from <appDir> to prove the guard (Preview, and no setting).
const { chromium } = require('playwright')
const { execFileSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const sharp = require(path.join(__dirname, '../../node_modules/sharp'))
const [APP, KEYS, APP_DIR, APP_LOG, CRON] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const { anon: ANON } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))
const PSQL = ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB]
const sql = q => execFileSync('psql', [...PSQL, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
const sqlTry = q => { try { return { ok: true, out: sql(q) } } catch (e) { return { ok: false, out: String(e.stderr || e.message) } } }
const sqlFile = f => execFileSync('psql', [...PSQL, '-v', 'ON_ERROR_STOP=1', '-q', '-f', f], { encoding: 'utf8', stdio: 'pipe' })
const SEC = path.join(__dirname, '../../supabase-sql/security')
const run = `ver${Date.now()}`
let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 500)) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const issued = { secrets: [], urls: [], paths: [] } // everything that must never appear in logs

async function post(base, p, body, token) {
  const once = () => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body ?? {}) })
  // One retry on a network-level failure (e.g. a stale keep-alive socket after a long synchronous step).
  const r = await once().catch(async e => { console.log('note: retrying after', String(e.cause?.code || e.cause?.message || e.message).slice(0, 60)); await sleep(500); return once() })
  const buf = Buffer.from(await r.arrayBuffer())
  let json = null; try { json = JSON.parse(buf.toString()) } catch {}
  return { status: r.status, json, buf, type: r.headers.get('content-type'), cache: r.headers.get('cache-control') }
}
const api = (p, body, token) => post(APP, p, body, token)
async function account(tag) {
  const e = `${run}-${tag}@example.com`
  const s = await (await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: e, password: 'pass123456' }) })).json()
  return { email: e, id: s.user.id, token: s.access_token }
}
async function rest(method, p, token, body) {
  const r = await fetch(GW + '/rest/v1/' + p, { method, headers: { apikey: ANON, authorization: `Bearer ${token || ANON}`, 'content-type': 'application/json', prefer: 'return=representation' }, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: r.status, text: await r.text() }
}
const rec = id => JSON.parse(sql(`select row_to_json(v) from employment_verifications v where id = '${id}'`) || 'null')
const objExists = name => sql(`select count(*) from storage.objects where bucket_id = 'employment-verification' and name = '${name}'`) === '1'
const fileExists = name => !!name && fs.existsSync(path.join(process.env.STORAGE_DIR || '/var/tmp/slate-storage', 'employment-verification', name))
const gwConfig = c => fetch(GW + '/__config', { method: 'POST', body: JSON.stringify(c) })
const CONSENT_VERSION = fs.readFileSync(path.join(__dirname, '../../lib/verification-copy.ts'), 'utf8').match(/VERIFICATION_CONSENT_VERSION = '([^']+)'/)[1]

// Synthetic documents only: fake names, fake venue, fake content.
function pngWithText(png, text) {
  const data = Buffer.from(`Comment\0${text}`, 'latin1')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const type = Buffer.from('tEXt')
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([type, data])) >>> 0)
  return Buffer.concat([png.subarray(0, 33), len, type, data, crc, png.subarray(33)])
}
function jpegWithExif(jpg, text) {
  const tiff = Buffer.concat([Buffer.from('II*\0', 'latin1'), Buffer.from([8, 0, 0, 0, 0, 0]), Buffer.from(text, 'latin1')])
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff])
  const hdr = Buffer.from([0xff, 0xe1, 0, 0]); hdr.writeUInt16BE(payload.length + 2, 2)
  return Buffer.concat([jpg.subarray(0, 2), hdr, payload, jpg.subarray(2)])
}

async function invite(V) {
  const r = await api('/api/internal/verification/invite', {}, V.token)
  if (r.json?.secret) issued.secrets.push(r.json.secret)
  return r.json
}
async function uploadUrl(secret, type = 'image/png', size = 1000, extra = {}) {
  const r = await api('/api/verification/upload-url', { secret, consent: true, consentVersion: CONSENT_VERSION, redactionAck: true, contentType: type, size, ...extra })
  if (r.json?.receipt) issued.secrets.push(r.json.receipt)
  if (r.json?.uploadUrl) { issued.urls.push(r.json.uploadUrl); issued.paths.push(new URL(r.json.uploadUrl).pathname.split('/').pop()) }
  return r
}
const put = (url, buf, type) => fetch(url, { method: 'PUT', body: buf, headers: { 'content-type': type, 'x-upsert': 'false' } })
async function submittedRecord(V, buf, type = 'image/png') {
  const inv = await invite(V)
  const u = await uploadUrl(inv.secret, type, buf.length)
  await put(u.json.uploadUrl, buf, type)
  const filePath = rec(inv.id).object_path
  const s = await api('/api/verification/submitted', { secret: u.json.receipt })
  return { id: inv.id, receipt: u.json.receipt, path: filePath, submitted: s }
}

function startApp(port, env) {
  const merged = { ...process.env, ...env }
  for (const [k, v] of Object.entries(env)) if (v === null) delete merged[k] // null = truly unset
  const p = spawn('npx', ['next', 'start', '-p', String(port)], { cwd: APP_DIR, env: merged, stdio: 'ignore', detached: true })
  return p
}
// A static file, so waiting for the instance makes no database or storage call.
async function waitUp(base) { for (let i = 0; i < 60; i++) { try { await fetch(base + '/favicon.ico'); return true } catch { await sleep(500) } } return false }
const gwCounts = async () => (await fetch(GW + '/__counts')).json()
const allowDelete = q => sql(`begin; set local storage.allow_delete_query = 'true'; ${q}; commit`)
const STORE = process.env.STORAGE_DIR || '/var/tmp/slate-storage'
function makeOrphan(name, bytes) {
  fs.mkdirSync(path.join(STORE, 'employment-verification'), { recursive: true })
  fs.writeFileSync(path.join(STORE, 'employment-verification', name), bytes)
  sql(`insert into storage.objects (bucket_id, name, metadata, created_at) values ('employment-verification', '${name}', '{"size":${bytes.length},"mimetype":"image/png"}', now() - interval '4 hours')`)
}

;(async () => {
  // ── Setup (local database only) ───────────────────────────────────────────
  sqlFile(path.join(__dirname, 'storage-schema.sql')) // idempotent; includes the protect_delete stand-in
  if (sql(`select to_regclass('public.employment_verifications') is not null`) !== 't') sqlFile(path.join(SEC, '45_employment_verification.sql'))
  // Start from an empty local verification state (local test data only).
  allowDelete(`delete from storage.objects where bucket_id = 'employment-verification'`)
  fs.rmSync(path.join(STORE, 'employment-verification'), { recursive: true, force: true })
  sql(`delete from employment_verifications`)
  {
    // S4: the local stand-in protects storage tables like hosted Supabase
    const blocked = sqlTry(`delete from storage.buckets where id = 'no-such-bucket'`)
    // rollback refuses while a file is stored
    sql(`insert into storage.objects (bucket_id, name) values ('employment-verification', 'rollback-probe.png')`)
    let refused = false; try { sqlFile(path.join(SEC, '45_rollback_employment_verification.sql')) } catch (e) { refused = /still stored/.test(String(e.stderr)) }
    const stillApplied = sql(`select to_regclass('public.employment_verifications') is not null`) === 't' && sql(`select count(*) from storage.buckets where id = 'employment-verification'`) === '1'
    allowDelete(`delete from storage.objects where name = 'rollback-probe.png'`)
    // empty bucket: rollback succeeds under the protection, then re-apply
    let rolledBack = false; try { sqlFile(path.join(SEC, '45_rollback_employment_verification.sql')); rolledBack = true } catch (e) { rolledBack = String(e.stderr).slice(0, 120) }
    const gone = sql(`select to_regclass('public.employment_verifications') is null`) === 't' && sql(`select count(*) from storage.buckets where id = 'employment-verification'`) === '0'
    sqlFile(path.join(SEC, '45_employment_verification.sql'))
    check('M1/S4 migration 45: private bucket (4 MB, JPEG/PNG); storage tables protected like hosted Supabase; rollback refuses while any file exists; with the bucket empty it succeeds (opting past protect_delete); re-apply works',
      !blocked.ok && /Direct deletion from storage tables is not allowed/.test(blocked.out) && refused && stillApplied && rolledBack === true && gone
        && sql(`select public || '|' || file_size_limit || '|' || array_to_string(allowed_mime_types, ',') from storage.buckets where id = 'employment-verification'`) === 'false|4194304|image/jpeg,image/png',
      { blocked: blocked.out.slice(0, 80), refused, stillApplied, rolledBack, gone })
  }
  execFileSync('sleep', ['1'])

  const V = await account('verifier'), N = await account('normal')
  sql(`update auth.users set raw_app_meta_data = raw_app_meta_data || '{"slate_verifier": true}' where id = '${V.id}'`)
  const baseline = { users: sql(`select count(*) from auth.users`), consent: sql(`select count(*) from participant_consent_events`),
    meta: sql(`select md5(string_agg(id::text || coalesce(raw_app_meta_data::text,''), ',' order by id)) from auth.users where id <> '${V.id}'`) }

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-proxy-server'] })
  const page = async () => { const ctx = await browser.newContext(); await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort()); return ctx.newPage() }
  let synthPng, synthJpg
  {
    const p = await page()
    await p.setContent(`<div style="font:16px sans-serif;padding:20px;width:500px;background:#fff">SYNTHETIC TEST DOCUMENT — NOT REAL<br>Fake Bistro (fictional) · Week of Jan 1<br>Jane Testperson — Server<br>Mon 5pm–11pm · Wed 5pm–11pm</div>`)
    synthPng = pngWithText(await p.screenshot({ type: 'png' }), 'SYNTHETIC-META-MARKER')
    synthJpg = jpegWithExif(await p.screenshot({ type: 'jpeg', quality: 90 }), 'GPSTESTMARK-40.7128N-74.0060W')
    await p.context().close()
  }

  // ── G: production guard ───────────────────────────────────────────────────
  {
    const routes = ['/api/verification/start', '/api/verification/upload-url', '/api/verification/submitted', '/api/verification/withdraw',
      '/api/verification/age', '/api/internal/verification/invite', '/api/internal/verification/list', '/api/internal/verification/file',
      '/api/internal/verification/decision', '/api/verification-sweep']
    const inv = await invite(V)
    const before = sql(`select count(*) from employment_verifications`)
    const objsBefore = sql(`select count(*) from storage.objects where bucket_id = 'employment-verification'`)
    const refusedCases = [
      ['G1a preview (VERCEL=1, VERCEL_ENV=preview, local setting ON)', 3105, { VERCEL: '1', VERCEL_ENV: 'preview', SLATE_VERIFICATION_LOCAL_TEST: '1' }],
      ['G1b development on Vercel (local setting ON)', 3106, { VERCEL: '1', VERCEL_ENV: 'development', SLATE_VERIFICATION_LOCAL_TEST: '1' }],
      ['G1c local without the setting', 3107, { SLATE_VERIFICATION_LOCAL_TEST: '' }],
      ['G3 not on Vercel, local setting ON, NODE_ENV=production, NON-LOCAL Supabase URL', 3108,
        { VERCEL: null, VERCEL_ENV: null, SLATE_VERIFICATION_LOCAL_TEST: '1', NODE_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: 'https://example-project.supabase.co' }],
      ['G4a production, SLATE_VERIFICATION_ENABLED missing', 3109, { VERCEL: '1', VERCEL_ENV: 'production', SLATE_VERIFICATION_LOCAL_TEST: '1' }],
      ['G4b production, SLATE_VERIFICATION_ENABLED=0', 3110, { VERCEL: '1', VERCEL_ENV: 'production', SLATE_VERIFICATION_ENABLED: '0', SLATE_VERIFICATION_LOCAL_TEST: '1' }],
    ]
    const results = {}
    for (const [label, port, env] of refusedCases) {
      const proc = startApp(port, { CRON_SECRET_KEY: CRON, SLATE_VERIFICATION_ENABLED: '', ...env })
      const base = `http://localhost:${port}`
      await waitUp(base)
      const c0 = await gwCounts()
      const codes = []
      for (const r of routes) {
        const tok = r.includes('internal') ? V.token : r.includes('sweep') ? CRON : undefined
        codes.push((await post(base, r, { secret: inv.secret, id: inv.id, consent: true, consentVersion: CONSENT_VERSION, redactionAck: true, contentType: 'image/png', size: 10 }, tok)).status)
      }
      const c1 = await gwCounts()
      results[label] = { codes, dbCalls: c1.rest - c0.rest, storageCalls: c1.storage - c0.storage, authCalls: c1.auth - c0.auth }
      try { process.kill(-proc.pid) } catch {}
    }
    const unchanged = sql(`select count(*) from employment_verifications`) === before && rec(inv.id).status === 'invited'
      && sql(`select count(*) from storage.objects where bucket_id = 'employment-verification'`) === objsBefore
    const ok = (k) => results[k].codes.every(s => s === 503) && results[k].dbCalls === 0 && results[k].storageCalls === 0 && results[k].authCalls === 0
    check('G1 every verification route (candidate, internal, sweep) returns 503 with no database/storage/auth call on Preview, on Vercel development, and locally without the setting',
      ['G1a preview (VERCEL=1, VERCEL_ENV=preview, local setting ON)', 'G1b development on Vercel (local setting ON)', 'G1c local without the setting'].every(ok) && unchanged, results)
    check('G3 local setting ON but a non-local Supabase URL (VERCEL/VERCEL_ENV unset, NODE_ENV=production): every route 503, no calls, nothing changed',
      ok('G3 not on Vercel, local setting ON, NODE_ENV=production, NON-LOCAL Supabase URL') && unchanged, results['G3 not on Vercel, local setting ON, NODE_ENV=production, NON-LOCAL Supabase URL'])
    check('G4 production kill switch: SLATE_VERIFICATION_ENABLED missing or 0 → every route (incl. sweep) 503, no calls, nothing changed',
      ok('G4a production, SLATE_VERIFICATION_ENABLED missing') && ok('G4b production, SLATE_VERIFICATION_ENABLED=0') && unchanged,
      { a: results['G4a production, SLATE_VERIFICATION_ENABLED missing'], b: results['G4b production, SLATE_VERIFICATION_ENABLED=0'] })
    {
      const proc = startApp(3111, { CRON_SECRET_KEY: CRON, VERCEL: '1', VERCEL_ENV: 'production', SLATE_VERIFICATION_ENABLED: '1', SLATE_VERIFICATION_LOCAL_TEST: '' })
      const base = 'http://localhost:3111'
      await waitUp(base)
      const st = await post(base, '/api/verification/start', { secret: inv.secret })
      const ls = await post(base, '/api/internal/verification/list', {}, V.token)
      const sw = await post(base, '/api/verification-sweep', { dryRun: true }, CRON)
      try { process.kill(-proc.pid) } catch {}
      check('G5 production with SLATE_VERIFICATION_ENABLED=1 → normal behaviour (start, verifier list, sweep dry run)',
        st.status === 200 && st.json?.state === 'consent' && ls.status === 200 && Array.isArray(ls.json?.rows) && sw.status === 200 && sw.json?.dryRun === true, { st: st.json, ls: ls.status, sw: sw.json })
    }
    const okLocal = await api('/api/verification/start', { secret: inv.secret })
    check('G2 the localhost test instance still works (setting ON, not on Vercel, local Supabase URL)', okLocal.status === 200 && okLocal.json?.state === 'consent', okLocal)
  }

  // ── P: permissions ────────────────────────────────────────────────────────
  {
    const r1 = await rest('GET', 'employment_verifications?select=*', null)
    const r2 = await rest('GET', 'employment_verifications?select=*', N.token)
    const r3 = await rest('POST', 'employment_verifications', N.token, { status: 'verified' })
    const r4 = await rest('PATCH', 'employment_verifications?id=not.is.null', N.token, { status: 'withdrawn' })
    const r5 = await rest('POST', 'rpc/verification_object_exists', N.token, { p_name: 'x' })
    const r6 = await rest('POST', 'rpc/verification_unreferenced_objects', ANON, { p_older_than: '0' })
    check('P1 signed-out and signed-in users cannot read, insert, update the records or call the helper functions',
      [r1, r2, r3, r4, r5, r6].every(r => r.status >= 400), [r1, r2, r3, r4, r5, r6].map(r => r.status))
    const s = await submittedRecord(V, synthPng)
    const g = n => fetch(`${GW}/storage/v1/object/employment-verification/${s.path}`, { headers: { apikey: ANON, authorization: `Bearer ${n}` } })
    const a1 = await g(ANON), a2 = await g(N.token)
    const sign = await fetch(`${GW}/storage/v1/object/upload/sign/employment-verification/evil.png`, { method: 'POST', headers: { authorization: `Bearer ${N.token}` } })
    const other = await put(issued.urls[issued.urls.length - 1].replace(/[0-9a-f-]+\.png\?/, 'other.png?'), synthPng, 'image/png')
    check('P2 storage: signed-out and signed-in users cannot download a file or sign uploads; an upload link works only for its own file name',
      a1.status >= 400 && a2.status >= 400 && sign.status === 403 && other.status === 400, { a1: a1.status, a2: a2.status, sign: sign.status, other: other.status })
    const n1 = await api('/api/internal/verification/invite', {}, N.token), n2 = await api('/api/internal/verification/list', {}, N.token)
    const n3 = await api('/api/internal/verification/file', { id: s.id }, N.token), n4 = await api('/api/internal/verification/decision', { id: s.id, decision: 'verified' }, N.token)
    const n5 = await api('/api/internal/verification/file', { id: s.id })
    check('P3 non-verifier (signed in) and signed-out callers get 403 on every internal route; the file is still unread',
      [n1, n2, n3, n4, n5].every(r => r.status === 403) && rec(s.id).status === 'submitted', [n1, n2, n3, n4, n5].map(r => r.status))
    const f = await api('/api/internal/verification/file', { id: s.id }, V.token)
    check('P4 a verifier can view a submitted image through the route only: correct type, no-store, inline, no file name',
      f.status === 200 && f.type === 'image/png' && /no-store/.test(f.cache || '') && f.buf.subarray(0, 4).toString('hex') === '89504e47', { status: f.status, type: f.type, cache: f.cache })
    const dec = await api('/api/internal/verification/decision', { id: s.id, decision: 'not_verified', rejection_reason: 'unreadable' }, V.token)
    check('P5 (cleanup) decision deletes that file', dec.json?.deletion === 'deleted' && !objExists(s.path) && !fileExists(s.path), dec.json)
  }

  // ── C / T: consent, token expiry and single use ───────────────────────────
  {
    const inv = await invite(V)
    const noConsent = await api('/api/verification/upload-url', { secret: inv.secret, consentVersion: CONSENT_VERSION, redactionAck: true, contentType: 'image/png', size: 10 })
    const badVersion = await api('/api/verification/upload-url', { secret: inv.secret, consent: true, consentVersion: 'old', redactionAck: true, contentType: 'image/png', size: 10 })
    const noAck = await api('/api/verification/upload-url', { secret: inv.secret, consent: true, consentVersion: CONSENT_VERSION, contentType: 'image/png', size: 10 })
    const r = rec(inv.id)
    check('C1 no upload link without the separate verification consent (current version) and the redaction acknowledgement; nothing recorded',
      noConsent.json?.error === 'consent_required' && badVersion.json?.error === 'consent_required' && noAck.json?.error === 'redaction_ack_required'
        && r.status === 'invited' && !r.consent_at && !r.object_path, { noConsent: noConsent.json, badVersion: badVersion.json, noAck: noAck.json })
    const ok = await uploadUrl(inv.secret)
    const r2 = rec(inv.id)
    const reuse = await uploadUrl(inv.secret), restart = await api('/api/verification/start', { secret: inv.secret })
    check('C2/T2 consent is recorded with its version when the link is issued; the invite secret is single use (second use and start are refused)',
      ok.status === 200 && r2.status === 'uploading' && !!r2.consent_at && r2.consent_version === CONSENT_VERSION && reuse.status === 400 && restart.json?.state === 'invalid', { reuse: reuse.json, restart: restart.json })
    const inv2 = await invite(V)
    sql(`update employment_verifications set secret_expires_at = now() - interval '1 minute' where id = '${inv2.id}'`)
    const st = await api('/api/verification/start', { secret: inv2.secret }), up = await uploadUrl(inv2.secret)
    check('T1 an expired invite shows "expired" and cannot issue an upload link', st.json?.state === 'expired' && up.status === 400 && rec(inv2.id).status === 'invited', { st: st.json, up: up.json })
    const bogus = await api('/api/verification/start', { secret: 'x'.repeat(43) }), shape = await api('/api/verification/start', { secret: '../etc' })
    check('T3 unknown or malformed secrets are invalid', bogus.json?.state === 'invalid' && shape.json?.state === 'invalid')
    await api('/api/verification/withdraw', { secret: ok.json.receipt })
  }

  // ── U: candidate UI end to end (synthetic PNG with a metadata marker) ─────
  {
    const inv = await invite(V)
    const p = await page()
    await p.goto(`${APP}/verify#${inv.secret}`, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(1000)
    const fileBefore = await p.isVisible('[data-testid="file-input"]')
    const text = (await p.textContent('[data-testid="verify-form"]')) || ''
    await p.check('[data-testid="consent-checkbox"]'); await p.waitForTimeout(300)
    await p.setInputFiles('[data-testid="file-input"]', { name: 'fake_schedule_jane.png', mimeType: 'image/png', buffer: synthPng })
    await p.waitForSelector('[data-testid="preview"]', { timeout: 10000 })
    const sendDisabled = await p.isDisabled('[data-testid="send"]')
    await p.check('[data-testid="redacted-checkbox"]'); await p.click('[data-testid="send"]')
    await p.waitForSelector('[data-testid="verify-submitted"]', { timeout: 20000 }).catch(() => {})
    const submitted = await p.isVisible('[data-testid="verify-submitted"]')
    const r = rec(inv.id)
    check('U1 UI: consent first (no file picker before it), full redaction list shown, preview shown, Send disabled until the redaction box is ticked, then submitted',
      !fileBefore && /Social Security number/.test(text) && /bank information/.test(text) && /date of birth/.test(text) && sendDisabled && submitted && r.status === 'submitted' && !!r.consent_at,
      { fileBefore, sendDisabled, submitted, status: r.status })
    const f = await api('/api/internal/verification/file', { id: inv.id }, V.token)
    check('U2 the stored image was re-encoded in the browser: PNG, metadata text chunk (SYNTHETIC-META-MARKER) gone; the original file name is stored nowhere',
      f.status === 200 && f.type === 'image/png' && !f.buf.includes('SYNTHETIC-META-MARKER') && !f.buf.includes('tEXt')
        && !JSON.stringify(rec(inv.id)).includes('fake_schedule') && /^[0-9a-f-]{36}\.png$/.test(r.object_path), { type: f.type, path: r.object_path })
    issued.paths.push(r.object_path)
    await p.context().close()
    // JPEG with an EXIF block (synthetic GPS text)
    const inv2 = await invite(V)
    const q = await page()
    await q.goto(`${APP}/verify#${inv2.secret}`, { waitUntil: 'networkidle', timeout: 120000 }); await q.waitForTimeout(800)
    await q.check('[data-testid="consent-checkbox"]'); await q.waitForTimeout(300)
    await q.setInputFiles('[data-testid="file-input"]', { name: 'IMG_0001_fake.jpg', mimeType: 'image/jpeg', buffer: synthJpg })
    await q.waitForSelector('[data-testid="preview"]', { timeout: 10000 })
    await q.check('[data-testid="redacted-checkbox"]'); await q.click('[data-testid="send"]')
    await q.waitForSelector('[data-testid="verify-submitted"]', { timeout: 20000 }).catch(() => {})
    const f2 = await api('/api/internal/verification/file', { id: inv2.id }, V.token)
    issued.paths.push(rec(inv2.id).object_path)
    check('U3 a JPEG with EXIF (synthetic GPS) is re-encoded: still JPEG, no Exif block, no GPS text',
      f2.status === 200 && f2.type === 'image/jpeg' && !f2.buf.includes('Exif') && !f2.buf.includes('GPSTESTMARK'), { status: f2.status, type: f2.type })
    await q.context().close()
    // verifier page
    const vp = await page()
    await vp.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 120000 })
    await vp.fill('input[placeholder="Email address"]', V.email); await vp.fill('input[placeholder="Password"]', 'pass123456')
    await vp.click('button:has-text("Sign in")'); await vp.waitForTimeout(2500)
    await vp.goto(APP + '/internal/verification', { waitUntil: 'load', timeout: 120000 }); await vp.waitForTimeout(4000)
    const listed = ((await vp.textContent('[data-testid="verifier-page"]').catch(() => '')) || '').includes(inv.id.slice(0, 8))
    const np = await page()
    await np.goto(APP + '/login', { waitUntil: 'networkidle', timeout: 120000 })
    await np.fill('input[placeholder="Email address"]', N.email); await np.fill('input[placeholder="Password"]', 'pass123456')
    await np.click('button:has-text("Sign in")'); await np.waitForTimeout(2500)
    await np.goto(APP + '/internal/verification', { waitUntil: 'load', timeout: 120000 }); await np.waitForTimeout(4000)
    const denied = /not available for this account/.test((await np.textContent('body')) || '')
    check('U4 verifier page lists the submission for the verifier; a normal signed-in account sees "not available"', listed && denied, { listed, denied })
    await vp.context().close(); await np.context().close()
    for (const id of [inv.id, inv2.id]) await api('/api/internal/verification/decision', { id, decision: 'not_verified', rejection_reason: 'other' }, V.token)
  }

  // ── F: file type / signature / size ───────────────────────────────────────
  {
    const pdf = Buffer.from('%PDF-1.4\n% synthetic, not a real document\n')
    const s = await submittedRecord(V, pdf, 'image/png')
    const r = rec(s.id)
    check('F1 a PDF disguised as PNG passes the bucket but is caught by the content check: automatically not_verified/unsupported and deleted at once',
      s.submitted.json?.state === 'rejected_file' && r.status === 'not_verified' && r.rejection_reason === 'unsupported' && !r.reviewer_id
        && !!r.deleted_at && !r.object_path && !objExists(s.path) && !fileExists(s.path), { submitted: s.submitted.json, r })
    const inv = await invite(V)
    const u = await uploadUrl(inv.secret)
    const wrongType = await put(u.json.uploadUrl, pdf, 'application/pdf')
    const tooBig = await put(u.json.uploadUrl, Buffer.concat([synthPng, Buffer.alloc(4 * 1024 * 1024)]), 'image/png')
    const urlTooBig = await uploadUrl((await invite(V)).secret, 'image/png', 5 * 1024 * 1024)
    const urlPdf = await uploadUrl((await invite(V)).secret, 'application/pdf', 100)
    check('F2 the bucket refuses other types (415) and files over 4 MB (413); the server refuses to issue links for them',
      wrongType.status === 415 && tooBig.status === 413 && urlTooBig.json?.error === 'too_large' && urlPdf.json?.error === 'unsupported_type', { wrongType: wrongType.status, tooBig: tooBig.status })
    const early = await api('/api/verification/submitted', { secret: u.json.receipt })
    check('F3 "submitted" before any file arrived is refused (not_uploaded); the record stays uploading', early.status === 409 && rec(inv.id).status === 'uploading', early.json)
    const retry = await uploadUrl(u.json.receipt)
    check('F4 after a failed upload the receipt can re-issue a link for the same file name only', retry.status === 200 && new URL(retry.json.uploadUrl).pathname.endsWith(rec(inv.id).object_path) && retry.json.receipt === null, retry.json)
    await put(retry.json.uploadUrl, synthPng, 'image/png')
    const again = await uploadUrl(u.json.receipt)
    check('F5 once a file has arrived, no further upload link is issued (no overwrite)', again.status === 409, again.json)
    await api('/api/verification/withdraw', { secret: u.json.receipt })
  }

  // ── Z: server-side sanitising (browser bypassed: direct upload to the signed URL) ──
  {
    const base = await sharp({ create: { width: 320, height: 120, channels: 3, background: '#d0d0d0' } })
    // JPEG with EXIF + XMP + ICC (from sharp) and a COM segment, all carrying synthetic GPS markers
    let jpg = await base.clone().jpeg({ quality: 90 })
      .withExif({ IFD0: { ImageDescription: 'GPSTESTMARK-EXIF 40.7128N 74.0060W' } })
      .withIccProfile('p3')
      .withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description>GPSTESTMARK-XMP</rdf:Description></rdf:RDF></x:xmpmeta>')
      .toBuffer()
    const com = Buffer.from('GPSTESTMARK-COM', 'latin1'); const comHdr = Buffer.from([0xff, 0xfe, 0, 0]); comHdr.writeUInt16BE(com.length + 2, 2)
    jpg = Buffer.concat([jpg.subarray(0, 2), comHdr, com, jpg.subarray(2)])
    const inMeta = await sharp(jpg).metadata()
    const a = await submittedRecord(V, jpg, 'image/jpeg')
    const fa = await api('/api/internal/verification/file', { id: a.id }, V.token)
    const outMeta = fa.status === 200 ? await sharp(fa.buf).metadata() : {}
    check('Z1 JPEG uploaded directly with EXIF + XMP + ICC + COM (synthetic GPS): accepted; stored copy has no EXIF/XMP/ICC/COM and no marker',
      !!inMeta.exif && !!inMeta.icc && !!inMeta.xmp && jpg.includes('GPSTESTMARK-COM') && a.submitted.json?.state === 'submitted' && fa.type === 'image/jpeg'
        && !outMeta.exif && !outMeta.icc && !outMeta.xmp && !(outMeta.comments && outMeta.comments.length) && !fa.buf.includes('GPSTESTMARK') && !fa.buf.includes('Exif')
        && !fa.buf.includes('ICC_PROFILE') && !fa.buf.includes('ns.adobe.com') && !fa.buf.includes(Buffer.from([0xff, 0xfe])),
      { in: { exif: !!inMeta.exif, icc: !!inMeta.icc, xmp: !!inMeta.xmp }, out: { exif: !!outMeta.exif, icc: !!outMeta.icc, xmp: !!outMeta.xmp, comments: outMeta.comments }, submitted: a.submitted.json })
    // PNG with tEXt + iTXt
    const pngBase = await base.clone().png().toBuffer()
    const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, data])) >>> 0); return Buffer.concat([len, t, data, crc]) }
    const png = Buffer.concat([pngBase.subarray(0, 33), chunk('tEXt', Buffer.from('Comment\0PNGTEXTMARK', 'latin1')),
      chunk('iTXt', Buffer.from('Description\0\0\0en\0\0PNGITXTMARK', 'latin1')), pngBase.subarray(33)])
    const b = await submittedRecord(V, png, 'image/png')
    const fb = await api('/api/internal/verification/file', { id: b.id }, V.token)
    check('Z2 PNG uploaded directly with tEXt + iTXt: stored copy has no text chunks and no markers',
      png.includes('PNGTEXTMARK') && png.includes('PNGITXTMARK') && b.submitted.json?.state === 'submitted' && fb.type === 'image/png'
        && !fb.buf.includes('tEXt') && !fb.buf.includes('iTXt') && !fb.buf.includes('zTXt') && !fb.buf.includes('PNGTEXTMARK') && !fb.buf.includes('PNGITXTMARK'), b.submitted.json)
    // JPEG with trailing data after the end-of-image marker
    const plain = await base.clone().jpeg({ quality: 85 }).toBuffer()
    const trailing = Buffer.concat([plain, Buffer.from('TRAILINGMARKER-hidden-data', 'latin1')])
    const c = await submittedRecord(V, trailing, 'image/jpeg')
    const fc = await api('/api/internal/verification/file', { id: c.id }, V.token)
    check('Z3 JPEG with appended trailing data: stored copy ends at the end-of-image marker; trailing bytes gone',
      c.submitted.json?.state === 'submitted' && !fc.buf.includes('TRAILINGMARKER') && fc.buf.subarray(-2).toString('hex') === 'ffd9', c.submitted.json)
    // undecodable: JPEG signature, garbage body
    const junk = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('not really an image '.repeat(40))])
    const d = await submittedRecord(V, junk, 'image/jpeg')
    const rd = rec(d.id)
    check('Z4 undecodable file (JPEG signature, garbage body): rejected (unreadable) and deleted, deletion confirmed',
      d.submitted.json?.state === 'rejected_file' && d.submitted.json?.deletion === 'deleted' && rd.status === 'not_verified' && rd.rejection_reason === 'unreadable'
        && !!rd.deleted_at && !rd.object_path && !objExists(d.path) && !fileExists(d.path), { submitted: d.submitted.json, rd })
    // oversized dimensions (small file, 4000 × 200 px)
    const wide = await sharp({ create: { width: 4000, height: 200, channels: 3, background: '#ffffff' } }).png().toBuffer()
    const e = await submittedRecord(V, wide, 'image/png')
    const re = rec(e.id)
    check('Z5 oversized image (4000 px wide; limit 3000) is rejected (unsupported) and deleted, deletion confirmed',
      wide.length < 4 * 1024 * 1024 && e.submitted.json?.state === 'rejected_file' && e.submitted.json?.deletion === 'deleted' && re.rejection_reason === 'unsupported'
        && !!re.deleted_at && !objExists(e.path) && !fileExists(e.path), { submitted: e.submitted.json, re })
    for (const id of [a.id, b.id, c.id]) await api('/api/internal/verification/decision', { id, decision: 'not_verified', rejection_reason: 'other' }, V.token)
  }

  // ── D: decisions, immediate deletion, fields kept ─────────────────────────
  let continueSecret = null, verifiedId = null
  {
    const s = await submittedRecord(V, synthPng)
    const missing = await api('/api/internal/verification/decision', { id: s.id, decision: 'verified', role_category: 'server' }, V.token)
    const d = await api('/api/internal/verification/decision', { id: s.id, decision: 'verified', role_category: 'server', venue: 'Fake Bistro (fictional)', borough: 'manhattan', evidence_type: 'schedule', notes: 'should be ignored' }, V.token)
    const r = rec(s.id)
    continueSecret = d.json?.continueSecret; verifiedId = s.id
    if (continueSecret) issued.secrets.push(continueSecret)
    check('D1 verified: missing fields refused; then saved with role, venue, borough, evidence type, time and reviewer; image deleted at once and confirmed',
      missing.status === 400 && d.status === 200 && d.json.deletion === 'deleted' && r.status === 'verified' && r.role_category === 'server' && r.borough === 'manhattan'
        && r.evidence_type === 'schedule' && r.reviewer_id === V.id && !!r.decided_at && !!r.deleted_at && !r.object_path && !objExists(s.path) && !fileExists(s.path), { d: d.json, r })
    const cols = sql(`select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_name = 'employment_verifications'`)
    check('D2 the record has no place for names, contacts, documents, hashes of documents, extracted text or notes',
      !/name|email|phone|note|text|hash_doc|document|ocr|dob|birth/.test(cols.replace('rejection_reason', '')) && !JSON.stringify(r).includes('should be ignored'), cols)
    const s2 = await submittedRecord(V, synthPng)
    const d2 = await api('/api/internal/verification/decision', { id: s2.id, decision: 'not_verified', rejection_reason: 'unredacted_sensitive' }, V.token)
    const r2 = rec(s2.id)
    check('D3 sensitive-data rejection: not_verified with only the reason code, image deleted at once, no continuation link',
      d2.json?.deletion === 'deleted' && r2.status === 'not_verified' && r2.rejection_reason === 'unredacted_sensitive' && !r2.role_category && !r2.venue
        && !!r2.deleted_at && !objExists(s2.path) && !d2.json.continueSecret, { d2: d2.json, r2 })
    const twice = await api('/api/internal/verification/decision', { id: s.id, decision: 'not_verified', rejection_reason: 'other' }, V.token)
    const t1 = sqlTry(`update employment_verifications set venue = 'Changed' where id = '${s.id}'`)
    const t2 = sqlTry(`update employment_verifications set status = 'submitted' where id = '${s.id}'`)
    const t3 = sqlTry(`update employment_verifications set age_attested_at = now() where id = '${s2.id}'`)
    check('D4 decisions are final: a second decision is refused; the database refuses edits, status regression, and an age attestation on a non-verified record',
      twice.status === 409 && !t1.ok && /decision is final/.test(t1.out) && !t2.ok && /not allowed/.test(t2.out) && !t3.ok, { twice: twice.status, t1: t1.out.slice(0, 80), t2: t2.out.slice(0, 80), t3: t3.out.slice(0, 80) })
  }

  // ── W: withdrawal ─────────────────────────────────────────────────────────
  {
    const inv = await invite(V)
    const w1 = await api('/api/verification/withdraw', { secret: inv.secret })
    const s = await submittedRecord(V, synthPng)
    const w2 = await api('/api/verification/withdraw', { secret: s.receipt })
    const r = rec(s.id)
    const w3 = await api('/api/verification/withdraw', { secret: s.receipt })
    check('W1 withdrawal before upload and after submission; the submitted image is deleted at once; a second withdrawal is refused',
      w1.json?.state === 'withdrawn' && rec(inv.id).status === 'withdrawn' && w2.json?.deletion === 'deleted' && r.status === 'withdrawn' && !!r.deleted_at && !objExists(s.path) && w3.status === 400, { w1: w1.json, w2: w2.json })
    const s2 = await submittedRecord(V, synthPng)
    const dv = await api('/api/internal/verification/decision', { id: s2.id, decision: 'withdrawn' }, V.token)
    check('W2 a verifier can record a withdrawal the candidate asked for by email; image deleted', dv.json?.status === 'withdrawn' && !objExists(s2.path), dv.json)
  }

  // ── A: separate 18+ attestation, downstream of verification ───────────────
  {
    const st = await api('/api/verification/start', { secret: continueSecret })
    const p = await page()
    await p.goto(`${APP}/verify#${continueSecret}`, { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(800)
    const ageText = (await p.textContent('[data-testid="verify-age"]').catch(() => '')) || ''
    const noTick = await api('/api/verification/age', { secret: continueSecret })
    const disabled = await p.isDisabled('button:has-text("Continue")')
    await p.check('[data-testid="age-checkbox"]'); await p.click('button:has-text("Continue")')
    await p.waitForSelector('[data-testid="verify-done"]', { timeout: 10000 }).catch(() => {})
    const done = await p.isVisible('[data-testid="verify-done"]')
    const link = await p.getAttribute('a[href="/early-test"]', 'href').catch(() => null)
    const r = rec(verifiedId)
    const again = await api('/api/verification/age', { secret: continueSecret, attest: true })
    const exact = 'I confirm that I am 18 years of age or older. I am providing this information truthfully, and I understand that I cannot participate if I cannot make this confirmation.'
    check('A1 after a verified decision only: separate unticked 18+ checkbox with Vera\'s exact wording; refused unless ticked; then recorded as a time only; link is single use; next step is the early-test agreement',
      st.json?.state === 'age' && ageText.includes(exact) && noTick.json?.error === 'attestation_required' && disabled && done && link === '/early-test'
        && !!r.age_attested_at && again.status === 400, { st: st.json, disabled, done, link })
    await p.context().close()
    const pending = await submittedRecord(V, synthPng)
    const early = sqlTry(`update employment_verifications set age_attested_at = now() where id = '${pending.id}'`)
    check('A2 no age attestation is possible before verification (database constraint)', !early.ok, early.out.slice(0, 80))
    await api('/api/internal/verification/decision', { id: pending.id, decision: 'not_verified', rejection_reason: 'other' }, V.token)
  }

  // ── DF: deletion failure and retry ────────────────────────────────────────
  {
    const s = await submittedRecord(V, synthPng)
    await gwConfig({ storageDeleteMode: 'silent' })
    const d = await api('/api/internal/verification/decision', { id: s.id, decision: 'not_verified', rejection_reason: 'role_unclear' }, V.token)
    const r1 = rec(s.id)
    const list = await api('/api/internal/verification/list', {}, V.token)
    const row = list.json?.rows?.find(x => x.id === s.id)
    await gwConfig({ storageDeleteMode: 'error' })
    const sw1 = await api('/api/verification-sweep', {}, CRON)
    const r2 = rec(s.id)
    await gwConfig({ storageDeleteMode: 'ok' })
    const sw2 = await api('/api/verification-sweep', {}, CRON)
    const r3 = rec(s.id)
    check('DF1 a delete that silently fails is detected (file still there): decision saved, deletion PENDING, path kept, shown as pending; sweep retries (error → still pending; recovered → deleted and confirmed)',
      d.json?.deletion === 'pending' && r1.status === 'not_verified' && r1.object_path === s.path && !r1.deleted_at && row?.deletion_pending === true
        && sw1.json?.pending >= 1 && r2.object_path === s.path && !r2.deleted_at && sw2.json?.deleted >= 1 && !r3.object_path && !!r3.deleted_at && !objExists(s.path) && !fileExists(s.path),
      { d: d.json, sw1: sw1.json, sw2: sw2.json })
  }

  // ── S: stale-upload cleanup ───────────────────────────────────────────────
  {
    const noAuth = await api('/api/verification-sweep', {})
    const lower = await fetch(APP + '/api/verification-sweep', { method: 'POST', headers: { authorization: `bearer ${CRON}` } })
    check('S0 sweep needs the cron secret with an exact "Bearer " header', noAuth.status === 401 && lower.status === 401)
    const inv = await invite(V)
    sql(`update employment_verifications set secret_expires_at = now() - interval '1 minute' where id = '${inv.id}'`)
    const s = await submittedRecord(V, synthPng)
    sql(`update employment_verifications set secret_expires_at = now() - interval '1 minute' where id = '${s.id}'`)
    // orphan: withdraw before the upload, then upload with the still-valid link
    const inv3 = await invite(V)
    const u = await uploadUrl(inv3.secret)
    await api('/api/verification/withdraw', { secret: u.json.receipt })
    const late = await put(u.json.uploadUrl, synthPng, 'image/png')
    const orphan = new URL(u.json.uploadUrl).pathname.split('/').pop()
    const tooNew = await api('/api/verification-sweep', {}, CRON)
    const stillThere = objExists(orphan)
    sql(`update storage.objects set created_at = now() - interval '4 hours' where name = '${orphan}'`)
    const sw = await api('/api/verification-sweep', {}, CRON)
    const r1 = rec(inv.id), r2 = rec(s.id)
    check('S1 sweep: expired invite → expired; unreviewed submission past its deadline → expired and image deleted; a late upload after withdrawal is left alone while recent, then deleted as unreferenced',
      r1.status === 'expired' && !r1.secret_hash && r2.status === 'expired' && !!r2.deleted_at && !objExists(s.path) && late.status === 200 && stillThere
        && sw.json?.orphans >= 1 && !objExists(orphan) && !fileExists(orphan), { tooNew: tooNew.json, sw: sw.json })
    const reviewLate = await api('/api/internal/verification/decision', { id: s.id, decision: 'verified', role_category: 'server', venue: 'Fake Bistro', borough: 'queens', evidence_type: 'schedule' }, V.token)
    check('S2 a reviewer can no longer act on an expired submission', reviewLate.status === 409, reviewLate.json)
  }

  // ── O: orphan cleanup (confirmed deletions, batch cap, dry run); POST + Bearer only ──
  {
    const getRes = await fetch(APP + '/api/verification-sweep', { headers: { authorization: `Bearer ${CRON}` } })
    const keyRes = await fetch(APP + `/api/verification-sweep?key=${encodeURIComponent(CRON)}`, { method: 'POST' })
    check('O0 sweep is POST-only (GET → 405) and Authorization: Bearer only (?key= → 401)', getRes.status === 405 && keyRes.status === 401, { get: getRes.status, key: keyRes.status })
    const orphanCount = () => Number(sql(`select count(*) from storage.objects where bucket_id = 'employment-verification' and name like 'orph-%'`))
    const small = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).png().toBuffer()
    for (let i = 0; i < 3; i++) makeOrphan(`orph-dry-${run}-${i}.png`, small)
    const dry = await api('/api/verification-sweep', { dryRun: true }, CRON)
    check('O1 dry run reports the orphans it would remove and deletes nothing', dry.json?.dryRun === true && dry.json?.wouldRemoveOrphans === 3 && orphanCount() === 3, dry.json)
    await gwConfig({ storageDeleteMode: 'silent' })
    const silent = await api('/api/verification-sweep', {}, CRON)
    const afterSilent = orphanCount()
    await gwConfig({ storageDeleteMode: 'ok' })
    const recovered = await api('/api/verification-sweep', {}, CRON)
    check('O2 a remove that silently fails is not counted (orphans 0, unconfirmed 3) and the orphans are still there for the next run, which removes them',
      silent.json?.orphans === 0 && silent.json?.orphansPending === 3 && afterSilent === 3 && recovered.json?.orphans === 3 && orphanCount() === 0, { silent: silent.json, recovered: recovered.json })
    for (let i = 0; i < 150; i++) makeOrphan(`orph-batch-${run}-${String(i).padStart(3, '0')}.png`, small)
    const first = await api('/api/verification-sweep', {}, CRON)
    const left = orphanCount()
    const second = await api('/api/verification-sweep', {}, CRON)
    check('O3 batch cap: 150 orphans → first run removes 100 (confirmed), second run 50; none left',
      first.json?.orphans === 100 && left === 50 && second.json?.orphans === 50 && orphanCount() === 0, { first: first.json, left, second: second.json })
  }

  // ── L / downstream: privacy of logs and data; participant agreement untouched ──
  {
    await sleep(500)
    const log = fs.readFileSync(APP_LOG, 'utf8')
    const leaks = []
    for (const s of issued.secrets) if (s && log.includes(s)) leaks.push('secret')
    for (const u of issued.urls) if (u && log.includes(new URL(u).searchParams.get('token') || '~')) leaks.push('upload-token')
    for (const p of issued.paths) if (p && log.includes(p)) leaks.push('path')
    for (const m of ['fake_schedule', 'IMG_0001', 'SYNTHETIC', 'GPSTESTMARK', 'Jane Testperson', 'Fake Bistro']) if (log.includes(m)) leaks.push(m)
    const verLines = log.split('\n').filter(l => l.includes('[verification]'))
    const shapeOk = verLines.every(l => /^\s*\[verification\] [a-z_]+( [0-9a-f-]{36})?\s*$/.test(l))
    check('L1 the app log contains no secrets, upload tokens, storage paths, file names or document text; verification log lines are only "<code> <record id>"',
      leaks.length === 0 && shapeOk, { leaks, sample: verLines.slice(0, 3) })
    const dump = sql(`select coalesce(string_agg(row_to_json(v)::text, ''), '') from employment_verifications v`)
    const views = sql(`select count(*) from page_views where path like '/verify%'`)
    const secretsInDb = issued.secrets.some(s => dump.includes(s))
    check('L2 the database holds no secrets (hashes only), file names or document text; no /verify page views are recorded',
      !secretsInDb && !/fake_schedule|IMG_0001|SYNTHETIC|GPSTESTMARK|Jane Testperson/.test(dump) && views === '0', { views })
    const after = { users: sql(`select count(*) from auth.users`), consent: sql(`select count(*) from participant_consent_events`),
      meta: sql(`select md5(string_agg(id::text || coalesce(raw_app_meta_data::text,''), ',' order by id)) from auth.users where id <> '${V.id}'`) }
    check('X1 participant agreement stays downstream: the whole verification flow created no accounts, no participant agreements and no participant metadata',
      after.users === baseline.users && after.consent === baseline.consent && after.meta === baseline.meta, { baseline, after })
    const leftover = sql(`select count(*) from storage.objects where bucket_id = 'employment-verification' and name not in (select object_path from employment_verifications where object_path is not null)`)
    check('X2 no unreferenced verification files remain', leftover === '0', leftover)
  }

  await browser.close()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
