// Isolated stand-in for Supabase (auth + PostgREST subset) — no network, in memory.
// Logs every request to stdout as JSON lines so tests can assert on traffic.
const http = require('http')
const crypto = require('crypto')
const PORT = Number(process.argv[2] || 54400)

const db = { servers: [], server_restaurants: [], restaurant_managers: [], notifications: [], follows: [], page_views: [] }
const users = {} // id -> {id,email,user_metadata}
const tokens = {} // token -> id
let seq = 0
const now = () => new Date().toISOString()
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')

function makeSession(u) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const at = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp })}.sig${++seq}`
  tokens[at] = u.id
  return { access_token: at, refresh_token: 'r' + seq, token_type: 'bearer', expires_in: 3600, expires_at: exp, user: userObj(u) }
}
function userObj(u) {
  return { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: now(), confirmed_at: now(),
    user_metadata: u.user_metadata || {}, app_metadata: { provider: 'email', providers: ['email'] }, identities: [], created_at: now(), updated_at: now() }
}
const bearer = req => (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
const userFor = req => users[tokens[bearer(req)]] || null

function filterRows(rows, params) {
  let out = rows
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'].includes(k)) continue
    const m = /^(eq|ilike|is|neq)\.(.*)$/.exec(v)
    if (!m) continue
    const [, op, raw] = m
    const val = raw === 'null' ? null : raw
    out = out.filter(r => {
      const x = r[k] == null ? null : String(r[k])
      if (op === 'eq') return x === val
      if (op === 'neq') return x !== val
      if (op === 'is') return x === val
      if (op === 'ilike') return x != null && x.toLowerCase() === String(val).replace(/%/g, '').toLowerCase()
      return true
    })
  }
  const order = params.get('order')
  if (order) {
    const [col, dir] = order.split(',')[0].split('.')
    out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1))
  }
  const limit = params.get('limit')
  if (limit) out = out.slice(0, Number(limit))
  return out
}

function linkMyServer(u) {
  if (!u) return []
  let row = db.servers.find(s => s.wallet_address === u.id)
  if (!row && u.email) {
    row = db.servers.filter(s => (s.email || '').toLowerCase() === u.email.toLowerCase() && (!s.wallet_address || !users[s.wallet_address]))
      .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))[0]
    if (row) row.wallet_address = u.id
  }
  return row ? [{ id: row.id, name: row.name }] : []
}

const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', c => (body += c))
  req.on('end', () => setTimeout(() => {
    const url = new URL(req.url, 'http://x')
    const origin = req.headers.origin
    const cors = {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,PUT,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || '*',
      'Access-Control-Expose-Headers': 'Content-Range, X-Total-Count',
    }
    const send = (status, obj, extra = {}) => {
      console.log(JSON.stringify({ t: now(), m: req.method, p: url.pathname, q: url.search.slice(0, 120), s: status, auth: req.headers.authorization ? (tokens[bearer(req)] ? 'user' : bearer(req).slice(0, 8)) : 'none' }))
      res.writeHead(status, { 'Content-Type': 'application/json', ...cors, ...extra })
      res.end(obj === undefined ? '' : JSON.stringify(obj))
    }
    if (req.method === 'OPTIONS') return send(200)
    let json = null
    try { json = body ? JSON.parse(body) : null } catch {}

    // test hooks
    if (url.pathname === '/__state') return send(200, { db, users: Object.values(users) })
    if (url.pathname === '/__reset') { for (const k in db) db[k] = []; for (const k in users) delete users[k]; return send(200, {}) }

    // ── auth ──
    if (url.pathname === '/auth/v1/signup' && req.method === 'POST') {
      if (Object.values(users).some(u => u.email === json.email)) return send(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' })
      const u = { id: crypto.randomUUID(), email: json.email, user_metadata: json.data || {} }
      users[u.id] = u
      return send(200, makeSession(u))
    }
    if (url.pathname === '/auth/v1/token' && req.method === 'POST') {
      const u = Object.values(users).find(x => x.email === json?.email)
      if (url.searchParams.get('grant_type') === 'password' && u) return send(200, makeSession(u))
      return send(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' })
    }
    if (url.pathname === '/auth/v1/user' && req.method === 'GET') {
      const u = userFor(req)
      return u ? send(200, userObj(u)) : send(401, { code: 401, msg: 'invalid JWT' })
    }
    if (url.pathname === '/auth/v1/logout') return send(204)

    // ── rest ──
    const m = /^\/rest\/v1\/(rpc\/)?([a-z_]+)$/.exec(url.pathname)
    if (m && m[1]) {
      if (m[2] === 'link_my_server') return send(200, linkMyServer(userFor(req)))
      return send(200, [])
    }
    if (m) {
      const table = m[2]
      db[table] = db[table] || []
      const single = (req.headers.accept || '').includes('vnd.pgrst.object')
      const wantRep = (req.headers.prefer || '').includes('return=representation')
      if (req.method === 'GET' || req.method === 'HEAD') {
        const rows = filterRows(db[table], url.searchParams)
        if (single) return rows.length === 1 ? send(200, rows[0]) : send(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows` })
        return send(200, req.method === 'HEAD' ? undefined : rows, { 'Content-Range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` })
      }
      if (req.method === 'POST') {
        const rows = (Array.isArray(json) ? json : [json]).map(r => ({ id: crypto.randomUUID(), created_at: new Date(Date.now() + ++seq).toISOString(), ...r }))
        db[table].push(...rows)
        if (!wantRep) return send(201)
        return send(201, single ? rows[0] : rows)
      }
      if (req.method === 'DELETE') {
        const del = new Set(filterRows(db[table], url.searchParams))
        db[table] = db[table].filter(r => !del.has(r))
        return send(204)
      }
      if (req.method === 'PATCH') {
        for (const r of filterRows(db[table], url.searchParams)) Object.assign(r, json)
        return send(204)
      }
    }
    return send(404, { message: 'mock: not found' })
  }, Number(process.env.DELAY || 0)))
})
server.listen(PORT, () => console.log(JSON.stringify({ t: now(), ready: PORT })))
