// Run: node frontend/tests/signup-server.test.js frontend   (no network, no database)
// Non-production test of app/api/signup-server/route.ts.
// Transpiles the real route, swaps Supabase for an in-memory database that
// mirrors the production tables used, and drives the real POST handler.
const path = require('path')
const fs = require('fs')
const Module = require('module')
const FRONTEND = process.argv[2]
const ts = require(path.join(FRONTEND, 'node_modules/typescript'))

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'

// ── in-memory database ───────────────────────────────────────────────────────
const db = { servers: [], server_restaurants: [], restaurant_managers: [] }
// hooks.uniqueOwner: emulate a unique index on servers.wallet_address.
// hooks.beforeServerInsert(n): async hook per servers insert (n = 1, 2, …) returning optional created_at.
const hooks = { uniqueOwner: false, beforeServerInsert: null, inserts: 0 }
const authUsers = {} // token -> { id, email }
let clock = 0, seq = 0
const tick = () => new Promise(r => setImmediate(r)) // every DB call yields, so requests interleave
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`

function query(table) {
  const st = { filters: [], order: [], limit: null, op: 'select', rows: null, single: false }
  const q = {
    select() { return q },
    eq(c, v) { st.filters.push([c, v]); return q },
    order(c, o) { st.order.push([c, o?.ascending !== false]); return q },
    limit(n) { st.limit = n; return q },
    single() { st.single = true; return q },
    insert(rows) { st.op = 'insert'; st.rows = Array.isArray(rows) ? rows : [rows]; return q },
    delete() { st.op = 'delete'; return q },
    then(res, rej) { return run().then(res, rej) },
  }
  async function run() {
    await tick()
    const t = db[table]
    if (st.op === 'insert') {
      let createdAt = null
      if (table === 'servers' && hooks.beforeServerInsert) createdAt = await hooks.beforeServerInsert(++hooks.inserts)
      if (table === 'servers' && hooks.uniqueOwner && st.rows.some(r => r.wallet_address && t.some(x => x.wallet_address === r.wallet_address))) {
        return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
      }
      const made = st.rows.map(r => ({ id: uuid(), created_at: createdAt ?? ++clock, ...r }))
      t.push(...made)
      return { data: st.single ? made[0] : made, error: null }
    }
    const match = r => st.filters.every(([c, v]) => r[c] === v)
    if (st.op === 'delete') {
      db[table] = t.filter(r => !match(r))
      return { data: null, error: null }
    }
    let out = t.filter(match)
    for (const [c, asc] of [...st.order].reverse()) out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1))
    if (st.limit != null) out = out.slice(0, st.limit)
    return { data: st.single ? out[0] ?? null : out.map(r => ({ ...r })), error: null }
  }
  return q
}

// link_my_server, same rules as frontend/supabase-sql/hardening/10_additive.sql
async function linkMyServer(token) {
  await tick()
  const u = authUsers[token]
  if (!u) return { data: [], error: null }
  let row = db.servers.find(s => s.wallet_address === u.id)
  if (!row && u.email) {
    const known = new Set(Object.values(authUsers).map(x => x.id))
    row = db.servers.filter(s => (s.email || '').toLowerCase() === u.email.toLowerCase()
      && (s.wallet_address == null || !known.has(s.wallet_address)))
      .sort((a, b) => a.created_at - b.created_at)[0]
    if (row) row.wallet_address = u.id
  }
  return { data: row ? [{ id: row.id, name: row.name }] : [], error: null }
}

const supabaseMock = {
  createClient(url, key, opts) {
    const token = opts?.global?.headers?.Authorization?.replace('Bearer ', '')
    return {
      from: t => query(t),
      rpc: async name => {
        if (name !== 'link_my_server') throw new Error('unexpected rpc ' + name)
        if (key !== 'anon' || !token) throw new Error('link_my_server must run as the user')
        return linkMyServer(token)
      },
    }
  },
}
const serverAuthMock = {
  supabaseAdmin: () => ({ from: t => query(t) }),
  getRequestUser: async req => {
    const t = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    return t && authUsers[t] ? { id: authUsers[t].id, email: authUsers[t].email } : null
  },
}

// ── load the real route ──────────────────────────────────────────────────────
const src = fs.readFileSync(path.join(FRONTEND, 'app/api/signup-server/route.ts'), 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const origLoad = Module._load
Module._load = function (req, parent, isMain) {
  if (req === '@supabase/supabase-js') return supabaseMock
  if (req === '@/lib/server-auth') return serverAuthMock
  return origLoad.call(this, req, parent, isMain)
}
const ROUTE_JS = path.join(FRONTEND, 'app/api/signup-server/route.js')
const m = new Module(ROUTE_JS)
m.filename = ROUTE_JS
m.paths = Module._nodeModulePaths(FRONTEND)
m._compile(js, m.filename)
const { POST } = m.exports
const { NextRequest } = require(path.join(FRONTEND, 'node_modules/next/server'))

async function call(token, body) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  const res = await POST(new NextRequest('https://slate.test/api/signup-server', { method: 'POST', headers, body: JSON.stringify(body) }))
  return { status: res.status, json: await res.json() }
}

// ── tests ────────────────────────────────────────────────────────────────────
let pass = 0, fail = 0
function check(name, ok, detail) {
  if (ok) { pass++; console.log('PASS', name) } else { fail++; console.log('FAIL', name, detail ?? '') }
}
const reset = () => { hooks.uniqueOwner = false; hooks.beforeServerInsert = null; hooks.inserts = 0; db.servers = []; db.server_restaurants = []; db.restaurant_managers = []; for (const k in authUsers) delete authUsers[k] }
const base = { name: 'Hazel Test', role: 'Server', restaurant: 'Slate Dry Run Test Venue', city: 'New York', specialties: ['Wine'] }
const mine = uid => db.servers.filter(s => s.wallet_address === uid)

;(async () => {
  // 1. no token
  reset()
  let r = await call(null, { ...base, userId: 'victim', email: 'victim@x.com' })
  check('no sign-in → 401, nothing written', r.status === 401 && db.servers.length === 0, r)

  // 2. bad token
  r = await call('forged', base)
  check('invalid token → 401, nothing written', r.status === 401 && db.servers.length === 0, r)

  // 3. body cannot choose owner or email
  reset(); authUsers.tA = { id: 'uid-A', email: 'a@x.com' }; authUsers.tV = { id: 'uid-V', email: 'victim@x.com' }
  r = await call('tA', { ...base, userId: 'uid-V', email: 'victim@x.com' })
  const rowA = db.servers[0]
  check('owner and email come from the token, not the body',
    r.status === 200 && r.json.created === true && rowA.wallet_address === 'uid-A' && rowA.email === 'a@x.com' && mine('uid-V').length === 0, { r, rowA })
  check('primary restaurant saved once', db.server_restaurants.filter(x => x.server_id === rowA.id).length === 1)
  check('no founding bonus / points column written', !('slate_points' in rowA) && !('serve_balance' in rowA), rowA)

  // 4. repeat call (the recovery path) → same profile, nothing new
  const before = { s: db.servers.length, r: db.server_restaurants.length }
  r = await call('tA', { ...base, name: 'Different Name', restaurant: 'Other Bar' })
  check('second call returns existing profile, created:false',
    r.status === 200 && r.json.created === false && r.json.serverId === rowA.id, r)
  check('second call writes nothing', db.servers.length === before.s && db.server_restaurants.length === before.r)

  // 5. legacy profile with same verified email and a dead owner → linked, not duplicated
  reset(); authUsers.tL = { id: 'uid-L', email: 'legacy@x.com' }
  db.servers.push({ id: 'legacy-1', created_at: ++clock, name: 'Legacy', email: 'legacy@x.com', wallet_address: 'old-wallet' })
  r = await call('tL', base)
  check('legacy email profile is linked and returned, no new row',
    r.status === 200 && r.json.created === false && r.json.serverId === 'legacy-1' && db.servers.length === 1 && db.servers[0].wallet_address === 'uid-L', r)

  // 6. legacy profile owned by a live account is NOT taken over
  reset(); authUsers.tO = { id: 'uid-O', email: 'shared@x.com' }; authUsers.tN = { id: 'uid-N', email: 'shared@x.com' }
  db.servers.push({ id: 'owned-1', created_at: ++clock, name: 'Owned', email: 'shared@x.com', wallet_address: 'uid-O' })
  r = await call('tN', base)
  check('profile owned by another live account is untouched',
    r.status === 200 && r.json.created === true && db.servers.find(s => s.id === 'owned-1').wallet_address === 'uid-O', r)

  // 7. manager account refused
  reset(); authUsers.tM = { id: 'uid-M', email: 'm@x.com' }
  db.restaurant_managers.push({ id: 'mgr-1', auth_id: 'uid-M' })
  r = await call('tM', base)
  check('manager account → 409, nothing written', r.status === 409 && db.servers.length === 0, r)

  // 8. photo restrictions
  reset(); authUsers.tP = { id: 'uid-P', email: 'p@x.com' }; authUsers.tQ = { id: 'uid-Q', email: 'q@x.com' }
  await call('tP', { ...base, photoUrl: 'https://evil.example/pixel.gif' })
  check('external photo URL dropped', db.servers[0].photo_url === null, db.servers[0])
  const own = 'https://proj.supabase.co/storage/v1/object/public/Avatars/uid-Q-123.jpg'
  await call('tQ', { ...base, photoUrl: own })
  check('own uploaded photo kept', mine('uid-Q')[0].photo_url === own)
  authUsers.tR = { id: 'uid-R', email: 'r@x.com' }
  await call('tR', { ...base, photoUrl: 'https://proj.supabase.co/storage/v1/object/public/Avatars/uid-Q-123.jpg' })
  check("someone else's photo dropped", mine('uid-R')[0].photo_url === null)

  // 9. validation
  reset(); authUsers.tV2 = { id: 'uid-V2', email: 'v2@x.com' }
  r = await call('tV2', { ...base, name: '  ' })
  check('blank name → 400', r.status === 400 && db.servers.length === 0, r)
  r = await call('tV2', { ...base, restaurant: '' })
  check('blank restaurant → 400', r.status === 400 && db.servers.length === 0, r)
  r = await call('tV2', { ...base, name: 'x'.repeat(500), specialties: Array(50).fill('a'), isTest: 'true' })
  const v = db.servers[0]
  check('long name capped, specialties capped, isTest must be boolean true',
    v.name.length === 80 && v.specialties.length === 12 && v.is_test === false, v)

  // 10. double tap: concurrent requests → exactly one profile, both answers agree
  for (let i = 0; i < 20; i++) {
    reset(); authUsers.tC = { id: 'uid-C', email: 'c@x.com' }
    const [a, b, c] = await Promise.all([call('tC', base), call('tC', base), call('tC', base)])
    const rows = mine('uid-C')
    const ok = rows.length === 1 && [a, b, c].every(x => x.status === 200 && x.json.serverId === rows[0].id)
      && [a, b, c].filter(x => x.json.created).length === 1
      && db.server_restaurants.length === 1
    if (!ok) { check(`concurrent run ${i}`, false, { rows, a, b, c, rest: db.server_restaurants }); break }
    if (i === 19) check('3 concurrent requests × 20 runs → one profile, one restaurant row, one "created"', true)
  }

  // 12. adversarial timing WITHOUT a database unique index: request B starts its
  //     transaction first (earlier created_at) but commits after A has already
  //     checked. The app-level guard cannot see this; documents the residual gap.
  async function adversarialRace(unique) {
    reset(); hooks.uniqueOwner = unique; authUsers.tX = { id: 'uid-X', email: 'x@x.com' }
    let releaseB; const gateB = new Promise(r => (releaseB = r))
    hooks.beforeServerInsert = async n => {
      if (n === 2) { await gateB; return 0 }  // B: delayed commit, earliest timestamp
      setTimeout(releaseB, 0); return 100        // A: release B only after A's insert
    }
    // Hold A's post-insert check until B has inserted, by delaying A slightly.
    const [a, b] = await Promise.all([call('tX', base), call('tX', base)])
    return { a, b, rows: mine('uid-X').length, rests: db.server_restaurants.length }
  }
  const noIdx = await adversarialRace(false)
  console.log(`INFO  without unique index, adversarial timing → ${noIdx.rows} profile(s), ${noIdx.rests} restaurant row(s)  ${noIdx.rows > 1 ? '(KNOWN GAP — needs the DB index)' : ''}`)
  const withIdx = await adversarialRace(true)
  check('with unique index, adversarial timing → one profile, both answers agree',
    withIdx.rows === 1 && withIdx.a.json.serverId === withIdx.b.json.serverId && [withIdx.a, withIdx.b].filter(x => x.json.created).length === 1, withIdx)

  // 13. guest converting to worker never takes a profile owned by a live account,
  //     even when emails match case-insensitively
  reset(); authUsers.tG = { id: 'uid-G', email: 'Guest@X.com' }; authUsers.tH = { id: 'uid-H', email: 'guest@x.com' }
  db.servers.push({ id: 'h-1', created_at: ++clock, name: 'H', email: 'guest@x.com', wallet_address: 'uid-H' })
  r = await call('tG', base)
  check('guest conversion creates own profile; live-owned profile untouched',
    r.json.created === true && db.servers.find(s => s.id === 'h-1').wallet_address === 'uid-H' && mine('uid-G').length === 1, r)

  // 14. a body cannot set server-controlled fields
  reset(); authUsers.tF = { id: 'uid-F', email: 'f@x.com' }
  await call('tF', { ...base, is_founding_member: false, serve_balance: 999, average_rating: 5, wallet_address: 'uid-V', id: 'chosen-id' })
  const f = mine('uid-F')[0]
  check('body cannot set balance, rating, id or owner',
    f && f.id !== 'chosen-id' && f.serve_balance === undefined && f.average_rating === undefined && db.servers.length === 1, f)

  // 11. errors do not leak details
  reset(); authUsers.tE = { id: 'uid-E', email: 'e@x.com' }
  const saved = db.servers; Object.defineProperty(db, 'servers', { get() { throw Object.assign(new Error('relation secret_internal'), { code: 'XX' }) }, configurable: true })
  r = await call('tE', base)
  Object.defineProperty(db, 'servers', { value: saved, writable: true, configurable: true })
  check('database error → 500 with generic message only', r.status === 500 && !JSON.stringify(r.json).includes('secret_internal') && !('details' in r.json), r)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
