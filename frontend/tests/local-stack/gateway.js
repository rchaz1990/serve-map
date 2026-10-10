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

const users = {} // email -> {id,email,password,user_metadata,app_metadata}
const sentEmails = [] // emails sent through the Resend stand-in
const refreshTokens = {} // refresh token -> email
let resendMode = 'ok'
function psql(sql, vars) {
  const args = ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-qAt']
  for (const [k, v] of Object.entries(vars)) args.push('-v', `${k}=${v}`)
  return execFileSync('psql', [...args, '-c', sql], { encoding: 'utf8' })
}
function userObj(u) {
  const now = new Date().toISOString()
  return { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: now, confirmed_at: now,
    user_metadata: u.user_metadata, app_metadata: u.app_metadata, identities: [], created_at: u.created_at || now, updated_at: now }
}
function session(u) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const at = sign({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp,
    app_metadata: u.app_metadata, user_metadata: u.user_metadata })
  const rt = crypto.randomUUID()
  refreshTokens[rt] = u.email.toLowerCase()
  return { access_token: at, refresh_token: rt, token_type: 'bearer', expires_in: 3600, expires_at: exp, user: userObj(u) }
}
function createUser(email, password, meta, provider = 'email', createdAt) {
  const u = { id: crypto.randomUUID(), email, password, user_metadata: meta || {}, app_metadata: { provider, providers: [provider] }, created_at: createdAt }
  users[email.toLowerCase()] = u
  // psql variables are quoted by psql itself (:'x'), so values cannot inject SQL.
  execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-q',
    '-v', `id=${u.id}`, '-v', `email=${email}`, '-v', `umeta=${JSON.stringify(u.user_metadata || {})}`],
    { input: "insert into auth.users (id, email, raw_user_meta_data) values (:'id', :'email', (:'umeta')::jsonb);\n" })
  return u
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

    if (url.pathname === '/auth/v1/signup' && req.method === 'POST') {
      if (users[(json.email || '').toLowerCase()]) return send(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' })
      return send(200, session(createUser(json.email, json.password, json.data)))
    }
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const u = users[(json?.email || '').toLowerCase()]
      if (!u || u.password !== json.password) return send(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' })
      return send(200, session(u))
    }
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
      const owner = refreshTokens[json?.refresh_token]
      const u = owner && users[owner]
      if (!u) return send(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' })
      delete refreshTokens[json.refresh_token]
      return send(200, session(u)) // carries the current app_metadata, like Supabase
    }
    if (url.pathname === '/auth/v1/user' && req.method === 'GET') {
      const c = verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''))
      const u = c && c.sub && Object.values(users).find(x => x.id === c.sub)
      return u ? send(200, userObj(u)) : send(401, { code: 401, msg: 'invalid JWT' })
    }
    if (url.pathname === '/auth/v1/logout') return send(204)
    // Admin user update (service role only): merges app_metadata like Supabase does.
    const adminMatch = url.pathname.match(/^\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/)
    if (adminMatch && req.method === 'PUT') {
      const c = verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''))
      if (!c || c.role !== 'service_role') return send(403, { code: 403, msg: 'not admin' })
      const u = Object.values(users).find(x => x.id === adminMatch[1])
      if (!u) return send(404, { code: 404, msg: 'User not found' })
      if (json?.app_metadata) u.app_metadata = { ...u.app_metadata, ...json.app_metadata }
      // Mirror into auth.users like Supabase (raw_app_meta_data), for database triggers.
      execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-q',
        '-v', `id=${u.id}`, '-v', `meta=${JSON.stringify(u.app_metadata)}`],
        { input: "update auth.users set raw_app_meta_data = (:'meta')::jsonb where id = :'id';\n" })
      return send(200, userObj(u))
    }

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

void psql
