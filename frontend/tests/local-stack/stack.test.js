// Signup security tests against a REAL local database (Postgres + PostgREST with
// production's grants/RLS) and the app's real /api/signup-server.
// Prereqs: see README.md in this folder.  usage: node stack.test.js <appUrl> <keys.json>
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const SQL_DIR = path.join(__dirname, '../../supabase-sql/signup')
const { anon: ANON } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))

const psqlArgs = ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-v', 'ON_ERROR_STOP=1', '-qAt']
const sql = q => execFileSync('psql', [...psqlArgs, '-c', q], { encoding: 'utf8' }).trim()
const sqlFile = f => execFileSync('psql', [...psqlArgs, '-f', f], { encoding: 'utf8' })
let n = 0
const email = tag => `t${Date.now()}-${++n}-${tag}@example.com`

async function signup(addr, meta = {}) {
  const r = await fetch(GW + '/auth/v1/signup', { method: 'POST', headers: { 'content-type': 'application/json', apikey: ANON }, body: JSON.stringify({ email: addr, password: 'pw123456', data: meta }) })
  return r.json()
}
async function googleUser(addr) {
  const r = await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: addr, provider: 'google' }) })
  return r.json()
}
async function rest(method, p, token, body, extra = {}) {
  const r = await fetch(GW + '/rest/v1' + p, { method, headers: { apikey: ANON, authorization: `Bearer ${token || ANON}`, 'content-type': 'application/json', prefer: 'return=representation', ...extra }, body: body ? JSON.stringify(body) : undefined })
  let j = null; try { j = await r.json() } catch {}
  return { status: r.status, json: j }
}
async function api(token, body) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  const r = await fetch(APP + '/api/signup-server', { method: 'POST', headers, body: JSON.stringify(body) })
  return { status: r.status, json: await r.json() }
}
const base = { name: 'Stack Tester', role: 'Server', restaurant: 'Stack Test Venue', city: 'New York' }
const owned = uid => Number(sql(`select count(*) from servers where wallet_address = '${uid}'`))

let pass = 0, fail = 0
const results = []
function check(name, ok, detail) {
  results.push({ name, ok }); ok ? pass++ : fail++
  console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300))
}
const info = msg => console.log('INFO', msg)

;(async () => {
  console.log('── Phase A: production database state (hardening applied, no new migrations)')

  // A1 authentication
  let r = await api(null, base)
  check('A1 no sign-in → 401', r.status === 401, r)
  const forged = (await signup(email('forge'))).access_token.replace(/\.[^.]+$/, '.AAAA')
  r = await api(forged, base)
  check('A1 forged token → 401', r.status === 401, r)
  r = await api(ANON, base)
  check('A1 anon key as token → 401', r.status === 401, r)

  // A2/A3 owner from token; idempotent
  const vAddr = email('victim'); const victim = await signup(vAddr)
  const aAddr = email('attacker'); const attacker = await signup(aAddr)
  r = await api(attacker.access_token, { ...base, userId: victim.user.id, email: vAddr })
  const row = sql(`select wallet_address || '|' || email from servers where id = '${r.json.serverId}'`)
  check('A2 owner and email come from the token, not the body', r.json.created === true && row === `${attacker.user.id}|${aAddr}` && owned(victim.user.id) === 0, { r, row })
  check('A2 one restaurant row', sql(`select count(*) from server_restaurants where server_id = '${r.json.serverId}'`) === '1')
  r = await api(attacker.access_token, { ...base, name: 'Other' })
  check('A3 repeat call → existing profile, nothing new', r.json.created === false && owned(attacker.user.id) === 1, r)

  // A4/A5 the browser cannot go around the API
  r = await rest('POST', '/servers', attacker.access_token, { name: 'direct', wallet_address: victim.user.id })
  check('A4 browser cannot insert a profile directly', r.status === 401 || r.status === 403, r)
  const vProfile = (await api(victim.access_token, base)).json.serverId
  const minimal = { prefer: 'return=minimal' }
  r = await rest('PATCH', `/servers?id=eq.${vProfile}`, attacker.access_token, { bio: 'hacked' }, minimal)
  check("A5 browser cannot edit someone else's profile", sql(`select coalesce(bio,'') from servers where id='${vProfile}'`) === '', r)
  r = await rest('PATCH', `/servers?id=eq.${vProfile}`, victim.access_token, { wallet_address: attacker.user.id }, minimal)
  check('A5 owner cannot reassign ownership', (r.status === 401 || r.status === 403) && owned(victim.user.id) === 1, r)
  r = await rest('PATCH', `/servers?id=eq.${vProfile}`, victim.access_token, { photo_url: 'https://elsewhere.example/x.png' }, minimal)
  info(`A5 owner can set photo_url to any URL directly: ${sql(`select photo_url from servers where id='${vProfile}'`) === 'https://elsewhere.example/x.png' ? 'yes (known, pre-existing)' : 'no'}`)

  // A6 manager accounts refused
  const mAddr = email('mgr'); const mgr = await signup(mAddr)
  sql(`insert into restaurant_managers (email, name, restaurant_name, auth_id, role) values ('${mAddr}', 'M', 'Mgr Venue', '${mgr.user.id}', 'owner')`)
  r = await api(mgr.access_token, base)
  check('A6 manager account → 409, nothing created', r.status === 409 && owned(mgr.user.id) === 0, r)

  // A7 concurrency without a unique index
  async function burst(label) {
    let dupAccounts = 0, rows = 0, created = 0
    for (let i = 0; i < 10; i++) {
      const u = await signup(email('burst'))
      const rs = await Promise.all(Array.from({ length: 5 }, () => api(u.access_token, base)))
      const c = owned(u.user.id); rows += c; if (c > 1) dupAccounts++
      created += rs.filter(x => x.json.created).length
      if (rs.some(x => x.status !== 200)) info(`${label}: non-200 ${JSON.stringify(rs.map(x => x.status))}`)
    }
    return { dupAccounts, rows, created }
  }
  const before = await burst('A7')
  info(`A7 without index: 10 accounts × 5 simultaneous requests → ${before.rows} profiles, ${before.dupAccounts} accounts with duplicates, ${before.created} "created" answers`)

  // A8 legacy worker profile takeover (current link_my_server)
  const legacyAddr = email('legacyworker')
  const legacyId = sql(`insert into servers (name, email, wallet_address) values ('Real Legacy Worker', '${legacyAddr}', 'LegacyWallet111') returning id`).split('\n')[0]
  sql(`insert into server_restaurants (server_id, restaurant_name, is_primary, currently_working) values ('${legacyId}', 'Legacy Venue', true, true)`)
  const thief = await signup(legacyAddr) // no inbox needed — confirmation is off
  r = await rest('POST', '/rpc/link_my_server', thief.access_token, {})
  const takenBy = sql(`select wallet_address from servers where id = '${legacyId}'`)
  check('A8 [VULN on current DB] unconfirmed sign-up with a legacy email takes the worker profile', takenBy === thief.user.id, { takenBy, r })

  // A9 restaurant waitlist takeover (current link_my_manager)
  const bizAddr = email('biz')
  r = await rest('POST', '/restaurant_managers', null, { email: bizAddr, name: 'Owner', restaurant_name: 'Waitlist Bistro', role: 'owner' }, { prefer: 'return=minimal' })
  check('A9 setup: anonymous waitlist row created', r.status === 201, r)
  const bizThief = await signup(bizAddr)
  r = await rest('POST', '/rpc/link_my_manager', bizThief.access_token, {})
  check('A9 [VULN on current DB] unconfirmed sign-up with a waitlist email takes the manager row', Array.isArray(r.json) && r.json.length === 1, r)

  const fnOriginal = sql(`select md5(string_agg(prosrc, '|' order by proname)) from pg_proc where proname in ('link_my_server','link_my_manager')`)
  console.log('── Phase B: apply proposed migrations 30 (index) and 31 (linking)')
  sqlFile(path.join(SQL_DIR, '30_one_profile_per_account.sql'))
  sqlFile(path.join(SQL_DIR, '31_link_by_owner_or_verified_email.sql'))
  check('B0 index builds over existing data', sql(`select count(*) from pg_indexes where indexname = 'servers_one_profile_per_account'`) === '1')

  const after = await burst('B1')
  check('B1 with index: 10 accounts × 5 simultaneous requests → one profile each, one "created" each',
    after.dupAccounts === 0 && after.rows === 10 && after.created === 10, after)

  const legacy2Addr = email('legacyworker2')
  const legacy2 = sql(`insert into servers (name, email, wallet_address) values ('Real Legacy Worker 2', '${legacy2Addr}', 'LegacyWallet222') returning id`).split('\n')[0]
  const thief2 = await signup(legacy2Addr)
  r = await rest('POST', '/rpc/link_my_server', thief2.access_token, {})
  const r2 = await api(thief2.access_token, base)
  check('B2 unconfirmed sign-up with a legacy email no longer gets that profile',
    Array.isArray(r.json) && r.json.length === 0 && sql(`select wallet_address from servers where id='${legacy2}'`) === 'LegacyWallet222' && r2.json.serverId !== legacy2, { r, r2 })

  const biz2 = email('biz2')
  await rest('POST', '/restaurant_managers', null, { email: biz2, name: 'Owner', restaurant_name: 'Waitlist Bistro 2', role: 'owner' }, { prefer: 'return=minimal' })
  const biz2Thief = await signup(biz2)
  r = await rest('POST', '/rpc/link_my_manager', biz2Thief.access_token, {})
  check('B3 password sign-up with a waitlist email is not linked', Array.isArray(r.json) && r.json.length === 0, r)
  // a separate address claimed through Google (verified by the provider)
  const biz3 = email('biz3')
  await rest('POST', '/restaurant_managers', null, { email: biz3, name: 'Owner', restaurant_name: 'Waitlist Bistro 3', role: 'owner' }, { prefer: 'return=minimal' })
  const g = await googleUser(biz3)
  r = await rest('POST', '/rpc/link_my_manager', g.access_token, {})
  check('B3 Google-verified owner still claims their waitlist row', Array.isArray(r.json) && r.json.length === 1 && r.json[0].restaurant_name === 'Waitlist Bistro 3', r)

  r = await rest('POST', '/rpc/link_my_server', victim.access_token, {})
  check('B4 existing worker still resolves to their own profile', Array.isArray(r.json) && r.json[0]?.id === vProfile, r)
  r = await rest('POST', '/rpc/link_my_manager', mgr.access_token, {})
  check('B4 existing manager still resolves', Array.isArray(r.json) && r.json[0]?.restaurant_name === 'Mgr Venue', r)
  r = await api(victim.access_token, base)
  check('B4 existing worker calling signup again → existing profile, nothing new', r.json.created === false && r.json.serverId === vProfile && owned(victim.user.id) === 1, r)
  const fresh = await signup(email('fresh'))
  r = await api(fresh.access_token, base)
  check('B4 ordinary new signup still works', r.status === 200 && r.json.created === true && owned(fresh.user.id) === 1, r)

  console.log('── Phase C: rollbacks')
  sqlFile(path.join(SQL_DIR, '31_rollback_link_by_owner_or_verified_email.sql'))
  sqlFile(path.join(SQL_DIR, '30_rollback_one_profile_per_account.sql'))
  const fnAfter = sql(`select md5(string_agg(prosrc, '|' order by proname)) from pg_proc where proname in ('link_my_server','link_my_manager')`)
  const acl = sql(`select string_agg(proname || ':' || array_to_string(proacl::text[], ','), ' ' order by proname) from pg_proc where proname in ('link_my_server','link_my_manager')`)
  check('C1 rollback restores the original functions and removes the index',
    fnAfter === fnOriginal && sql(`select count(*) from pg_indexes where indexname = 'servers_one_profile_per_account'`) === '0', { fnAfter, fnOriginal })
  check('C1 function permissions unchanged throughout (no anon execute)', !/anon=X/.test(acl), acl)
  sqlFile(path.join(SQL_DIR, '31_link_by_owner_or_verified_email.sql'))
  sqlFile(path.join(SQL_DIR, '30_one_profile_per_account.sql'))
  check('C2 migrations re-apply cleanly after rollback', sql(`select count(*) from pg_indexes where indexname = 'servers_one_profile_per_account'`) === '1')

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
