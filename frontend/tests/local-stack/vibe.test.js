// /api/verify-vibe against a REAL local database (production grants/RLS + migration 33)
// and the app's real route. usage: node vibe.test.js <appUrl> <keys.json>
// Prereqs: README.md in this folder; migration 33 applied to the local database.
const { execFileSync } = require('child_process')
const fs = require('fs')
const [APP, KEYS] = process.argv.slice(2)
const GW = 'http://localhost:54400'
const DB = process.env.STACK_DB || 'slate_stack'
const { anon: ANON } = JSON.parse(fs.readFileSync(KEYS, 'utf8'))
const sql = q => execFileSync('psql', ['-h', '/tmp', '-p', '54329', '-U', 'postgres', '-d', DB, '-qAt', '-c', q], { encoding: 'utf8' }).trim()
let n = 0
const email = tag => `v${Date.now()}-${++n}-${tag}@example.com`
const OLD = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()

async function account(tag, old = true) {
  const r = await fetch(GW + '/__create_user', { method: 'POST', body: JSON.stringify({ email: email(tag), created_at: old ? OLD : undefined }) })
  return r.json()
}
async function vibe(token, body) {
  const headers = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  const r = await fetch(APP + '/api/verify-vibe', { method: 'POST', headers, body: JSON.stringify(body) })
  return { status: r.status, json: await r.json() }
}
const VENUE = { restaurantLat: 40.7411, restaurantLng: -73.9897 }
const AT_VENUE = { userLat: 40.7413, userLng: -73.9895 }       // ~30 m away
const FAR = { userLat: 40.6782, userLng: -73.9442 }            // Brooklyn, ~9 km
const base = (venue = 'Vibe Test Bar') => ({ restaurantName: venue, vibe: 'LIVE', barSeats: 'A few', waitTime: 'No wait' })
const reports = e => Number(sql(`select count(*) from vibe_reports where lower(reported_by) = lower('${e}')`))
const points = e => Number(sql(`select coalesce(sum(slate_points),0) from guest_rewards where lower(email) = lower('${e}')`))

let pass = 0, fail = 0
function check(name, ok, detail) { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(detail ?? '').slice(0, 300)) }

;(async () => {
  // ── malicious ──
  const victim = await account('victim')
  let r = await vibe(null, { ...base(), ...VENUE, ...AT_VENUE, reporterEmail: victim.user.email, userId: victim.user.id, gpsVerified: true })
  check('no sign-in → 401, nothing written', r.status === 401 && reports(victim.user.email) === 0 && points(victim.user.email) === 0, r)

  r = await vibe(ANON, { ...base(), reporterEmail: victim.user.email })
  check('anon key as token → 401', r.status === 401, r)

  const attacker = await account('attacker')
  r = await vibe(attacker.access_token, { ...base(), ...VENUE, ...AT_VENUE, reporterEmail: victim.user.email, userId: victim.user.id })
  check("body email/userId ignored: report and points go to the signed-in account, not the victim",
    r.status === 200 && reports(victim.user.email) === 0 && points(victim.user.email) === 0 && reports(attacker.user.email) === 1, r)

  const liar = await account('liar')
  r = await vibe(liar.access_token, { ...base(), gpsVerified: true, distanceMeters: 1, qrCode: 'anything' })
  const row = sql(`select gps_verified || '|' || qr_verified || '|' || serve_reward from vibe_reports where lower(reported_by) = lower('${liar.user.email}')`)
  check('client "gpsVerified"/"qrCode" flags ignored → not verified, no reward', r.status === 200 && row === 'false|false|0' && points(liar.user.email) === 0, { r, row })

  const far = await account('far')
  r = await vibe(far.access_token, { ...base(), ...VENUE, ...FAR })
  check('far from venue → saved, not location-consistent, no reward', r.status === 200 && r.json.gpsVerified === false && r.json.serveReward === 0 && r.json.distance > 5000, r)

  const fresh = await account('fresh', false)
  r = await vibe(fresh.access_token, { ...base(), ...VENUE, ...AT_VENUE })
  check('account under 24 h → saved, no reward', r.status === 200 && r.json.serveReward === 0 && points(fresh.user.email) === 0, r)

  const junk = await account('junk')
  for (const [name, body] of [['bad vibe', { ...base(), vibe: 'DROP TABLE' }], ['no venue', { ...base(), restaurantName: '  ' }], ['coords out of range', { ...base(), userLat: 999, userLng: 0, ...VENUE }]]) {
    r = await vibe(junk.access_token, body)
    if (name === 'coords out of range') check('out-of-range coordinates ignored (not verified)', r.status === 200 && r.json.gpsVerified === false, r)
    else check(`rejects ${name} → 400`, r.status === 400, r)
  }
  r = await vibe(junk.access_token, { ...base('Seat Test'), barSeats: 'free beer', waitTime: '<script>' })
  const stored = sql(`select coalesce(bar_seats,'null') || '|' || coalesce(wait_time,'null') from vibe_reports where restaurant_name = 'Seat Test' and lower(reported_by) = lower('${junk.user.email}')`)
  check('unknown seat/wait values stored as empty', stored === 'null|null', stored)

  // ── legitimate ──
  const guest = await account('guest')
  r = await vibe(guest.access_token, { ...base('Legit Bar'), ...VENUE, ...AT_VENUE })
  check('signed-in, 3-day-old account at the venue → saved, 5 $SERVE', r.status === 200 && r.json.serveReward === 5 && r.json.gpsVerified === true && points(guest.user.email) === 5, r)
  r = await vibe(guest.access_token, { ...base('Legit Bar'), ...VENUE, ...AT_VENUE })
  check('same venue again within 2 h → 429, nothing written', r.status === 429 && reports(guest.user.email) === 1 && points(guest.user.email) === 5, r)
  r = await vibe(guest.access_token, { ...base('Other Bar'), ...VENUE, ...AT_VENUE })
  check('different venue → allowed, rewarded', r.status === 200 && r.json.serveReward === 5 && points(guest.user.email) === 10, r)

  // existing mixed-case rewards row is credited, not duplicated
  const mixed = await account('mixed')
  sql(`insert into guest_rewards (email, slate_points) values ('${mixed.user.email.toUpperCase()}', 7)`)
  r = await vibe(mixed.access_token, { ...base('Case Bar'), ...VENUE, ...AT_VENUE })
  check('existing rewards row (different letter case) credited once', points(mixed.user.email) === 12 && Number(sql(`select count(*) from guest_rewards where lower(email) = lower('${mixed.user.email}')`)) === 1, r)

  // ── farming ──
  const farmer = await account('farmer')
  const burst = await Promise.all(Array.from({ length: 10 }, () => vibe(farmer.access_token, { ...base('Race Bar'), ...VENUE, ...AT_VENUE })))
  check('10 simultaneous reports for one venue → exactly 1 saved, 5 points',
    reports(farmer.user.email) === 1 && points(farmer.user.email) === 5 && burst.filter(x => x.status === 200).length === 1, burst.map(x => x.status))

  const spammer = await account('spammer')
  const results = []
  for (let i = 0; i < 22; i++) results.push((await vibe(spammer.access_token, { ...base(`Spam ${i}`), ...VENUE, ...AT_VENUE })).status)
  check('22 venues in one day → 20 saved, then 429', reports(spammer.user.email) === 20 && results.slice(20).every(s => s === 429), results)
  check('reports 3+ in an hour are flagged and earn nothing (only first 3 rewarded)', points(spammer.user.email) === 15, points(spammer.user.email))

  const para = await account('para')
  await Promise.all(Array.from({ length: 25 }, (_, i) => vibe(para.access_token, { ...base(`Par ${i}`), ...VENUE, ...AT_VENUE })))
  check('25 simultaneous reports to different venues → never more than 20 saved', reports(para.user.email) === 20, reports(para.user.email))

  // ── database permissions ──
  const acl = sql(`select has_function_privilege('anon', 'public.submit_vibe_report(text,text,text,text,text,numeric,numeric,integer,boolean,boolean)', 'execute') || '|' || has_function_privilege('authenticated', 'public.submit_vibe_report(text,text,text,text,text,numeric,numeric,integer,boolean,boolean)', 'execute')`)
  check('browser roles cannot call submit_vibe_report directly', acl === 'false|false', acl)
  r = await fetch(GW + '/rest/v1/rpc/submit_vibe_report', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${guest.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_email: 'x@example.com', p_restaurant_name: 'X', p_vibe: 'LIVE', p_bar_seats: null, p_wait_time: null, p_user_lat: null, p_user_lng: null, p_distance_meters: null, p_location_consistent: true, p_new_account: false }) })
  check('signed-in user calling the function through the API → refused', r.status === 401 || r.status === 403 || r.status === 404, r.status)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
