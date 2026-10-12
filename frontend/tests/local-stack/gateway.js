// Local Supabase-shaped gateway for testing against a REAL database:
//   /rest/v1/*  → PostgREST (real Postgres, real grants + RLS from supabase-sql/)
//   /auth/v1/*  → simulated auth that issues real HS256 JWTs PostgREST verifies,
//                 and records each account in auth.users like Supabase does.
// Email confirmation is OFF here, matching production (accounts are usable at once).
// usage: node gateway.js <port> <postgrestPort> <jwtSecret> <keysOutFile>
const http = require('http')
const crypto = require('crypto')
const fs = require('fs')
const { execFileSync } = require('child_process')
const [PORT, PGRST, SECRET, KEYS_OUT] = process.argv.slice(2)
const DB = process.env.STACK_DB || 'slate_stack'

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
function sign(claims) {
  const h = b64({ alg: 'HS256', typ: 'JWT' }), p = b64(claims)
  return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`
}
function verify(tok) {
  const [h, p, s] = (tok || '').split('.')
  if (!s) return null
  const good = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null
  const c = JSON.parse(Buffer.from(p, 'base64url').toString())
  return c.exp && c.exp < Date.now() / 1000 ? null : c
}
const far = Math.floor(Date.now() / 1000) + 10 * 365 * 86400
const ANON = sign({ role: 'anon', iss: 'local', exp: far })
const SERVICE = sign({ role: 'service_role', iss: 'local', exp: far })
fs.writeFileSync(KEYS_OUT, JSON.stringify({ anon: ANON, service: SERVICE }))

const users = {} // email -> {id,email,password,user_metadata,app_metadata,created_at,confirmed_at}
// Email confirmation simulation: POST /__config {confirm:true|false}. Sent emails are
// recorded (token_hash links) and readable via GET /__last_email?email=…
// autoParticipant (default true): new accounts start with the early-test guest and worker
// participant agreements on file (a fixture for suites about other features);
// participant.test.js turns it off to exercise the real agreement flow.
const config = { confirm: false, autoParticipant: true, storageDeleteMode: 'ok' }
const counts = { rest: 0, storage: 0, auth: 0 } // GET /__counts: requests seen per API
const PARTICIPANT_VERSION = (() => { try { return fs.readFileSync(require('path').join(__dirname, '../../lib/participant-documents.ts'), 'utf8').match(/PARTICIPANT_VERSION = '([^']+)'/)[1] } catch { return null } })()
const outbox = {} // email -> { type, token_hash }
const tokens_ = {} // token_hash -> { email, type }
const codes_ = {} // PKCE auth code -> { email, challenge, method }
function mail(email, type) {
  const token_hash = crypto.randomBytes(16).toString('hex')
  tokens_[token_hash] = { email: email.toLowerCase(), type }
  outbox[email.toLowerCase()] = { type, token_hash }
}
const sentEmails = [] // emails sent through the Resend stand-in
const refreshTokens = {} // refresh token -> email
let resendMode = 'ok'
function psql(sql, vars) {
  const args = ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-qAt']
  for (const [k, v] of Object.entries(vars)) args.push('-v', `${k}=${v}`)
  // stdin (not -c), so psql substitutes :'var' safely
  return execFileSync('psql', args, { input: sql + ';\n', encoding: 'utf8' })
}
// Supabase reads account metadata from auth.users; database functions may change it
// (record_participant_event), so re-read raw_app_meta_data before answering.
function syncMeta(u) {
  try {
    const out = psql("select coalesce(raw_app_meta_data::text, '') from auth.users where id = :'id'", { id: u.id }).trim()
    if (out) u.app_metadata = JSON.parse(out)
  } catch {}
  return u
}
function userObj(u) {
  syncMeta(u)
  const now = new Date().toISOString()
  return { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: u.confirmed_at || null, confirmed_at: u.confirmed_at || null,
    user_metadata: u.user_metadata, app_metadata: u.app_metadata, identities: [], created_at: u.created_at || now, updated_at: now }
}
function session(u) {
  syncMeta(u)
  const exp = Math.floor(Date.now() / 1000) + 3600
  const at = sign({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp,
    app_metadata: u.app_metadata, user_metadata: u.user_metadata })
  const rt = crypto.randomUUID()
  refreshTokens[rt] = u.email.toLowerCase()
  return { access_token: at, refresh_token: rt, token_type: 'bearer', expires_in: 3600, expires_at: exp, user: userObj(u) }
}
function createUser(email, password, meta, provider = 'email', createdAt, confirmed = true) {
  const created = createdAt || new Date().toISOString()
  // Auto-confirmed accounts are confirmed the moment they are created, like Supabase.
  const app = { provider, providers: [provider] }
  if (config.autoParticipant && PARTICIPANT_VERSION) {
    Object.assign(app, { participant_guest_version: PARTICIPANT_VERSION, participant_guest_at: created,
      participant_worker_version: PARTICIPANT_VERSION, participant_worker_at: created })
  }
  const u = { id: crypto.randomUUID(), email, password, user_metadata: meta || {}, app_metadata: app,
    created_at: created, confirmed_at: confirmed ? created : null }
  users[email.toLowerCase()] = u
  // psql variables are quoted by psql itself (:'x'), so values cannot inject SQL.
  execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-q',
    '-v', `id=${u.id}`, '-v', `email=${email}`, '-v', `created=${created}`, '-v', `confirmed=${u.confirmed_at || ''}`,
    '-v', `umeta=${JSON.stringify(u.user_metadata || {})}`, '-v', `ameta=${JSON.stringify(u.app_metadata)}`],
    { input: "insert into auth.users (id, email, created_at, email_confirmed_at, raw_user_meta_data, raw_app_meta_data) values (:'id', :'email', :'created', nullif(:'confirmed','')::timestamptz, (:'umeta')::jsonb, (:'ameta')::jsonb);\n" })
  return u
}
function confirmUser(u) {
  if (u.confirmed_at) return
  u.confirmed_at = new Date().toISOString()
  execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-q', '-v', `id=${u.id}`],
    { input: "update auth.users set email_confirmed_at = now() where id = :'id';\n" })
}

http.createServer((req, res) => {
  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => {
    const body = Buffer.concat(chunks)
    const url = new URL(req.url, 'http://x')
    const cors = {
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,PUT,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || '*',
      'Access-Control-Expose-Headers': 'Content-Range, X-Total-Count',
    }
    const send = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json', ...cors })
      res.end(obj === undefined ? '' : JSON.stringify(obj))
    }
    if (req.method === 'OPTIONS') return send(200)
    if (url.pathname === '/__counts') return send(200, counts)
    for (const k of ['rest', 'storage', 'auth']) if (url.pathname.startsWith(`/${k}/v1/`)) counts[k]++
    let json = null
    try { json = body.length ? JSON.parse(body) : null } catch {}

    // test hook: create an account directly (e.g. a Google-verified one)
    // Stand-in for the Resend API (app started with RESEND_BASE_URL=<this gateway>).
    // POST /__resend {mode} simulates provider outcomes for the next sends:
    //   ok | reject (422) | error500 | drop (connection cut, no reply) | noid (200 without id)
    if (url.pathname === '/__resend') { resendMode = json?.mode || 'ok'; return send(200, { mode: resendMode }) }
    if (url.pathname === '/emails' && req.method === 'POST') {
      const record = { to: json?.to, subject: json?.subject, idempotencyKey: req.headers['idempotency-key'] || null, mode: resendMode, at: Date.now() }
      sentEmails.push(record)
      if (resendMode === 'reject') return send(422, { statusCode: 422, name: 'validation_error', message: 'simulated rejection' })
      if (resendMode === 'error500') return send(500, { statusCode: 500, name: 'internal_server_error', message: 'simulated provider error' })
      if (resendMode === 'drop') { req.socket.destroy(); return }
      if (resendMode === 'noid') return send(200, {})
      record.delivered = true
      return send(200, { id: crypto.randomUUID() })
    }
    if (url.pathname === '/__emails') {
      const to = url.searchParams.get('to')
      return send(200, sentEmails.filter(m => (!to || [].concat(m.to).includes(to)) && (url.searchParams.get('all') || m.delivered)))
    }
    if (url.pathname === '/__create_user') {
      // created_at lets tests simulate an older account
      const u = createUser(json.email, json.password || 'x', json.data, json.provider || 'email', json.created_at)
      return send(200, session(u))
    }
    if (url.pathname === '/__config') { Object.assign(config, json || {}); return send(200, config) }
    if (url.pathname === '/__last_email') return send(200, outbox[(url.searchParams.get('email') || '').toLowerCase()] || null)

    if (url.pathname === '/auth/v1/signup' && req.method === 'POST') {
      if (users[(json.email || '').toLowerCase()]) return send(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' })
      const u = createUser(json.email, json.password, json.data, 'email', undefined, !config.confirm)
      if (config.confirm) { mail(u.email, 'signup'); return send(200, userObj(u)) } // no session until confirmed
      return send(200, session(u))
    }
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const u = users[(json?.email || '').toLowerCase()]
      if (!u || u.password !== json.password) return send(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
      if (!u.confirmed_at) return send(400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' })
      return send(200, session(u))
    }
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
      const owner = refreshTokens[json?.refresh_token]
      const u = owner && users[owner]
      if (!u) return send(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' })
      delete refreshTokens[json.refresh_token]
      return send(200, session(u)) // carries the current app_metadata, like Supabase
    }
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'pkce') {
      // PKCE code exchange: succeeds only with the verifier stored by the browser that asked.
      const c = codes_[json?.auth_code]
      const v = json?.code_verifier || ''
      const ok = c && (c.method === 'plain' ? v === c.challenge : crypto.createHash('sha256').update(v).digest('base64url') === c.challenge)
      if (ok) { delete codes_[json.auth_code]; const u = users[c.email]; confirmUser(u); return send(200, session(u)) }
    }
    if (url.pathname === '/auth/v1/token') {
      // Unknown code or wrong browser (no matching verifier), like a link opened on another device.
      return send(400, { code: 400, error_code: 'bad_code_verifier', msg: 'code challenge does not match previously saved code verifier' })
    }
    if (url.pathname === '/auth/v1/verify' && req.method === 'POST') {
      const t = tokens_[json?.token_hash]
      if (!t || (t.type !== json.type && !(t.type === 'signup' && json.type === 'email'))) return send(403, { code: 403, error_code: 'otp_expired', msg: 'Email link is invalid or has expired' })
      delete tokens_[json.token_hash]
      const u = users[t.email]
      if (!u) return send(403, { code: 403, error_code: 'otp_expired', msg: 'Email link is invalid or has expired' })
      confirmUser(u)
      return send(200, session(u))
    }
    if (url.pathname === '/auth/v1/recover' && req.method === 'POST') {
      if (users[(json?.email || '').toLowerCase()]) {
        mail(json.email, 'recovery')
        // Default (PKCE) reset link: also record an auth code tied to the requester's challenge.
        if (json.code_challenge) {
          const code = crypto.randomUUID()
          codes_[code] = { email: json.email.toLowerCase(), challenge: json.code_challenge, method: (json.code_challenge_method || 's256').toLowerCase() }
          outbox[json.email.toLowerCase()].code = code
        }
      }
      return send(200, {})
    }
    if (url.pathname === '/auth/v1/resend' && req.method === 'POST') {
      const u = users[(json?.email || '').toLowerCase()]
      if (u && !u.confirmed_at) mail(u.email, 'signup')
      return send(200, {})
    }
    if (url.pathname === '/auth/v1/user' && req.method === 'PUT') {
      const c = verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''))
      const u = c && Object.values(users).find(x => x.id === c.sub)
      if (!u) return send(401, { code: 401, msg: 'invalid JWT' })
      if (typeof json?.password === 'string') {
        if (json.password.length < 6) return send(422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 6 characters.' })
        u.password = json.password
      }
      return send(200, userObj(u))
    }
    if (url.pathname === '/auth/v1/user' && req.method === 'GET') {
      const c = verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''))
      const u = c && c.sub && Object.values(users).find(x => x.id === c.sub)
      return u ? send(200, userObj(u)) : send(401, { code: 401, msg: 'invalid JWT' })
    }
    if (url.pathname === '/auth/v1/logout') return send(204)
    // Admin user update (service role only): merges app_metadata like Supabase does.
    const adminMatch = url.pathname.match(/^\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/)
    if (adminMatch && req.method === 'GET') {
      const c = verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''))
      if (!c || c.role !== 'service_role') return send(403, { code: 403, msg: 'not admin' })
      const u = Object.values(users).find(x => x.id === adminMatch[1])
      return u ? send(200, userObj(u)) : send(404, { code: 404, msg: 'User not found' })
    }
    if (adminMatch && req.method === 'PUT') {
      const c = verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''))
      if (!c || c.role !== 'service_role') return send(403, { code: 403, msg: 'not admin' })
      const u = Object.values(users).find(x => x.id === adminMatch[1])
      if (!u) return send(404, { code: 404, msg: 'User not found' })
      syncMeta(u)
      if (json?.app_metadata) u.app_metadata = { ...u.app_metadata, ...json.app_metadata }
      // Mirror into auth.users like Supabase (raw_app_meta_data), for database triggers.
      execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-q',
        '-v', `id=${u.id}`, '-v', `meta=${JSON.stringify(u.app_metadata)}`],
        { input: "update auth.users set raw_app_meta_data = (:'meta')::jsonb where id = :'id';\n" })
      return send(200, userObj(u))
    }

    // ── Storage stand-in (subset of the Supabase Storage API used by Slate) ────
    // Files live under STORAGE_DIR; storage.buckets / storage.objects rows are kept in the
    // local database like Supabase does, and bucket size / type limits are enforced.
    // Only the service role may sign uploads, read, check or delete (no storage policies
    // exist for app users on private buckets). __config {storageDeleteMode} simulates a
    // delete that errors ('error') or silently keeps the file ('silent').
    if (url.pathname.startsWith('/storage/v1/')) return storage(req, res, url, body, json, send, cors)

    if (url.pathname.startsWith('/rest/v1/')) {
      const headers = { ...req.headers, host: `localhost:${PGRST}` }
      delete headers.origin
      // Supabase sends the anon key as a Bearer token when no user is signed in.
      if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`
      const up = http.request({ host: '127.0.0.1', port: PGRST, method: req.method, path: url.pathname.slice('/rest/v1'.length) + url.search, headers }, r => {
        const h = { ...r.headers, ...cors }
        res.writeHead(r.statusCode, h)
        r.pipe(res)
      })
      up.on('error', e => send(502, { message: e.message }))
      up.end(body)
      return
    }
    return send(404, { message: 'gateway: not found' })
  })
}).listen(Number(PORT), () => console.log('gateway ready', PORT))

const STORAGE_DIR = process.env.STORAGE_DIR || '/var/tmp/slate-storage'
function storageRole(req) {
  const c = verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''))
  return c ? c.role : null
}
function bucketRow(id) {
  const out = psql("select row_to_json(b) from storage.buckets b where id = :'id'", { id }).trim()
  return out ? JSON.parse(out) : null
}
function objectFile(bucket, name) {
  if (!/^[A-Za-z0-9_-]+$/.test(bucket) || !/^[A-Za-z0-9._/-]+$/.test(name) || name.includes('..')) return null
  return require('path').join(STORAGE_DIR, bucket, name)
}
function storage(req, res, url, body, json, send, cors) {
  const p = decodeURIComponent(url.pathname.slice('/storage/v1'.length))
  const role = storageRole(req)
  // POST /object/upload/sign/<bucket>/<name>  → signed upload URL (service role only)
  let m = p.match(/^\/object\/upload\/sign\/([^/]+)\/(.+)$/)
  if (m && req.method === 'POST') {
    if (role !== 'service_role') return send(403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' })
    if (!bucketRow(m[1])) return send(404, { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' })
    const token = sign({ bucket: m[1], name: m[2], exp: Math.floor(Date.now() / 1000) + 7200, upsert: req.headers['x-upsert'] === 'true' })
    return send(200, { url: `/object/upload/sign/${m[1]}/${m[2]}?token=${token}` })
  }
  // PUT /object/upload/sign/<bucket>/<name>?token=…  → upload with the signed token
  if (m && req.method === 'PUT') {
    const t = verify(url.searchParams.get('token'))
    if (!t || t.bucket !== m[1] || t.name !== m[2]) return send(400, { statusCode: '400', error: 'InvalidSignature', message: 'invalid signature' })
    const b = bucketRow(m[1]); const file = objectFile(m[1], m[2])
    if (!b || !file) return send(400, { statusCode: '400', error: 'InvalidKey', message: 'invalid key' })
    const type = String(req.headers['content-type'] || '').split(';')[0].trim()
    if (type.startsWith('multipart/')) return send(400, { statusCode: '400', error: 'unsupported', message: 'gateway: send the raw body' })
    if (b.allowed_mime_types && !b.allowed_mime_types.includes(type)) return send(415, { statusCode: '415', error: 'invalid_mime_type', message: `mime type ${type} is not supported` })
    if (b.file_size_limit && body.length > b.file_size_limit) return send(413, { statusCode: '413', error: 'Payload too large', message: 'The object exceeded the maximum allowed size' })
    const exists = psql("select count(*) from storage.objects where bucket_id = :'b' and name = :'n'", { b: m[1], n: m[2] }).trim() !== '0'
    if (exists && !t.upsert) return send(409, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' })
    fs.mkdirSync(require('path').dirname(file), { recursive: true })
    fs.writeFileSync(file, body)
    psql("insert into storage.objects (bucket_id, name, metadata) values (:'b', :'n', (:'meta')::jsonb) on conflict (bucket_id, name) do update set metadata = excluded.metadata",
      { b: m[1], n: m[2], meta: JSON.stringify({ size: body.length, mimetype: type }) })
    return send(200, { Key: `${m[1]}/${m[2]}` })
  }
  // POST / PUT /object/<bucket>/<name>  → upload / overwrite by the service role
  m = p.match(/^\/object\/(?!upload\/|info\/)([^/]+)\/(.+)$/)
  if (m && (req.method === 'POST' || req.method === 'PUT')) {
    if (role !== 'service_role') return send(403, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' })
    const b = bucketRow(m[1]); const file = objectFile(m[1], m[2])
    if (!b || !file) return send(400, { statusCode: '400', error: 'InvalidKey', message: 'invalid key' })
    const type = String(req.headers['content-type'] || '').split(';')[0].trim()
    if (type.startsWith('multipart/')) return send(400, { statusCode: '400', error: 'unsupported', message: 'gateway: send the raw body' })
    if (b.allowed_mime_types && !b.allowed_mime_types.includes(type)) return send(415, { statusCode: '415', error: 'invalid_mime_type', message: `mime type ${type} is not supported` })
    if (b.file_size_limit && body.length > b.file_size_limit) return send(413, { statusCode: '413', error: 'Payload too large', message: 'The object exceeded the maximum allowed size' })
    const exists = psql("select count(*) from storage.objects where bucket_id = :'b' and name = :'n'", { b: m[1], n: m[2] }).trim() !== '0'
    const upsert = req.method === 'PUT' || req.headers['x-upsert'] === 'true'
    if (exists && !upsert) return send(409, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' })
    fs.mkdirSync(require('path').dirname(file), { recursive: true })
    fs.writeFileSync(file, body)
    psql("insert into storage.objects (bucket_id, name, metadata) values (:'b', :'n', (:'meta')::jsonb) on conflict (bucket_id, name) do update set metadata = excluded.metadata",
      { b: m[1], n: m[2], meta: JSON.stringify({ size: body.length, mimetype: type }) })
    return send(200, { Key: `${m[1]}/${m[2]}` })
  }
  // GET / HEAD /object/<bucket>/<name>  → download / exists (service role only: private bucket)
  m = p.match(/^\/object\/(?!upload\/|info\/)([^/]+)\/(.+)$/)
  if (m && (req.method === 'GET' || req.method === 'HEAD')) {
    const b = bucketRow(m[1]); const file = objectFile(m[1], m[2])
    if (!b || !file) return send(400, { statusCode: '404', error: 'not_found', message: 'Object not found' })
    if (!b.public && role !== 'service_role') return send(400, { statusCode: '404', error: 'not_found', message: 'Object not found' })
    if (!fs.existsSync(file)) return send(400, { statusCode: '404', error: 'not_found', message: 'Object not found' })
    const meta = JSON.parse(psql("select coalesce(metadata,'{}')::text from storage.objects where bucket_id = :'b' and name = :'n'", { b: m[1], n: m[2] }).trim() || '{}')
    res.writeHead(200, { 'Content-Type': meta.mimetype || 'application/octet-stream', ...cors })
    return res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file))
  }
  // DELETE /object/<bucket>  {prefixes:[…]}  → remove (service role only)
  m = p.match(/^\/object\/([^/]+)$/)
  if (m && req.method === 'DELETE') {
    if (role !== 'service_role') return send(200, [])
    if (config.storageDeleteMode === 'error') return send(500, { statusCode: '500', error: 'internal', message: 'simulated storage failure' })
    const removed = []
    for (const name of (json?.prefixes || [])) {
      const file = objectFile(m[1], name)
      if (!file || !fs.existsSync(file)) continue
      if (config.storageDeleteMode !== 'silent') {
        fs.rmSync(file)
        // Like Supabase's storage server: allowed past the protect_delete triggers.
        psql("begin; set local storage.allow_delete_query = 'true'; delete from storage.objects where bucket_id = :'b' and name = :'n'; commit", { b: m[1], n: name })
      }
      removed.push({ bucket_id: m[1], name })
    }
    return send(200, removed)
  }
  return send(404, { message: 'gateway storage: not found' })
}

void psql
