/* eslint-disable @typescript-eslint/no-require-imports */
// Run: node frontend/tests/cleanup-shifts.test.js frontend   (no network, no database)
// Tests app/api/cleanup-shifts/route.ts by transpiling the real route,
// replacing Supabase with a recorder, and calling the real GET handler.
// Every secret below is a made-up test value.
const path = require('path')
const fs = require('fs')
const Module = require('module')
const assert = require('assert')
const FRONTEND = path.resolve(process.argv[2] || path.join(__dirname, '..'))
const DEPS = path.resolve(process.env.DEPS_DIR || FRONTEND) // folder whose node_modules to use
const ts = require(path.join(DEPS, 'node_modules/typescript'))

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'

// Supabase recorder: counts update calls and can be told to fail.
const calls = []
let failNext = false
const fakeSupabase = {
  createClient: () => ({
    from(table) {
      const call = { table, update: null, filters: [] }
      calls.push(call)
      const q = {
        update(v) { call.update = v; return q },
        eq(c, v) { call.filters.push(['eq', c, v]); return q },
        lt(c, v) {
          call.filters.push(['lt', c, v])
          const err = failNext ? { message: 'boom' } : null
          failNext = false
          return Promise.resolve({ error: err })
        },
      }
      return q
    },
  }),
}

const ROUTE = path.join(FRONTEND, 'app/api/cleanup-shifts/route.ts')
const js = ts.transpileModule(fs.readFileSync(ROUTE, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const origLoad = Module._load
Module._load = function (req, parent, isMain) {
  if (req === '@supabase/supabase-js') return fakeSupabase
  return origLoad.call(this, req, parent, isMain)
}
const m = new Module(ROUTE)
m.filename = ROUTE
m.paths = Module._nodeModulePaths(DEPS)
m._compile(js, ROUTE)
const { GET } = m.exports

const GOOD = 'a'.repeat(20) + 'test-secret-only-0123456789abcdef' // 53 chars, test value
const WRONG_SAME_LEN = 'b'.repeat(GOOD.length)

async function call({ query, auth } = {}) {
  const url = 'https://slate.test/api/cleanup-shifts' + (query === undefined ? '' : `?key=${encodeURIComponent(query)}`)
  const headers = auth === undefined ? {} : { authorization: auth }
  const before = calls.length
  const res = await GET(new Request(url, { headers }))
  return { status: res.status, body: await res.json(), dbCalls: calls.length - before }
}

function setSecret(v) {
  if (v === undefined) delete process.env.CRON_SECRET_KEY
  else process.env.CRON_SECRET_KEY = v
}

const results = []
async function t(name, fn) {
  try { await fn(); results.push(['PASS', name]) } catch (e) { results.push(['FAIL', name + ' :: ' + e.message]) }
}
const rejected = r => { assert.strictEqual(r.status, 401); assert.strictEqual(r.dbCalls, 0) }

;(async () => {
  // Secret missing
  await t('missing secret: no credential -> 401', async () => { setSecret(undefined); rejected(await call()) })
  await t('missing secret: empty ?key= -> 401', async () => { setSecret(undefined); rejected(await call({ query: '' })) })
  await t('missing secret: any ?key= -> 401', async () => { setSecret(undefined); rejected(await call({ query: GOOD })) })
  await t('missing secret: bearer header -> 401', async () => { setSecret(undefined); rejected(await call({ auth: `Bearer ${GOOD}` })) })

  // Secret empty (the empty-query bypass in the old code)
  await t('empty secret: empty ?key= bypass -> 401', async () => { setSecret(''); rejected(await call({ query: '' })) })
  await t('empty secret: "Bearer " header -> 401', async () => { setSecret(''); rejected(await call({ auth: 'Bearer ' })) })
  await t('empty secret: no credential -> 401', async () => { setSecret(''); rejected(await call()) })

  // Secret too short, even with an exact match
  const SHORT = 'x'.repeat(31)
  await t('31-char secret: exact ?key= match -> 401', async () => { setSecret(SHORT); rejected(await call({ query: SHORT })) })
  await t('31-char secret: exact bearer match -> 401', async () => { setSecret(SHORT); rejected(await call({ auth: `Bearer ${SHORT}` })) })

  // Valid secret, wrong or malformed credentials
  await t('valid secret: no credential -> 401', async () => { setSecret(GOOD); rejected(await call()) })
  await t('valid secret: empty ?key= -> 401', async () => { setSecret(GOOD); rejected(await call({ query: '' })) })
  await t('valid secret: wrong key, same length -> 401', async () => { setSecret(GOOD); rejected(await call({ query: WRONG_SAME_LEN })) })
  await t('valid secret: wrong key, other length -> 401', async () => { setSecret(GOOD); rejected(await call({ query: GOOD + 'x' })) })
  await t('valid secret: wrong bearer -> 401', async () => { setSecret(GOOD); rejected(await call({ auth: `Bearer ${WRONG_SAME_LEN}` })) })
  await t('valid secret: "Basic" scheme -> 401', async () => { setSecret(GOOD); rejected(await call({ auth: `Basic ${GOOD}` })) })
  await t('valid secret: empty Authorization -> 401', async () => { setSecret(GOOD); rejected(await call({ auth: '' })) })
  await t('header preferred: wrong bearer + correct ?key= -> 401', async () => { setSecret(GOOD); rejected(await call({ auth: `Bearer ${WRONG_SAME_LEN}`, query: GOOD })) })

  // Valid secret, correct credentials
  await t('correct bearer -> 200 and one cleanup update', async () => {
    setSecret(GOOD)
    const r = await call({ auth: `Bearer ${GOOD}` })
    assert.strictEqual(r.status, 200); assert.strictEqual(r.body.success, true); assert.strictEqual(r.dbCalls, 1)
    const c = calls[calls.length - 1]
    assert.strictEqual(c.table, 'shifts')
    assert.strictEqual(c.update.is_active, false)
    assert.deepStrictEqual(c.filters[0], ['eq', 'is_active', true])
    assert.strictEqual(c.filters[1][0], 'lt'); assert.strictEqual(c.filters[1][1], 'started_at')
    const cutoffHours = (Date.now() - Date.parse(c.filters[1][2])) / 3600000
    assert.ok(cutoffHours > 11.99 && cutoffHours < 12.01, 'cutoff is 12 hours ago')
  })
  await t('correct legacy ?key= -> 200 (temporary compatibility)', async () => {
    setSecret(GOOD); const r = await call({ query: GOOD }); assert.strictEqual(r.status, 200); assert.strictEqual(r.dbCalls, 1)
  })
  await t('correct bearer, database error -> 500', async () => {
    setSecret(GOOD); failNext = true; const r = await call({ auth: `Bearer ${GOOD}` })
    assert.strictEqual(r.status, 500); assert.strictEqual(r.body.success, false)
  })

  for (const [s, n] of results) console.log(s, n)
  const failed = results.filter(r => r[0] === 'FAIL').length
  console.log(`\n${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
})()
