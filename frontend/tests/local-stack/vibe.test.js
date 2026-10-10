// /api/verify-vibe against a REAL local database (production grants/RLS + migration 33)
// and the app's real route. usage: node vibe.test.js <appUrl> <keys.json>
// Prereqs: README.md in this folder; migration 33 applied to the local database.
const { execFileSync } = require('child_process')
const fs = require('fs')
const { PAUSED } = require('./early-test')
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
  // Early test: vibe reports are paused (lib/early-test.ts). This suite runs again when they are re-enabled.
  if (PAUSED.vibeReports) { console.log('SKIP whole suite (vibe reports: paused for the early test)'); console.log('\n0 passed, 0 failed, suite skipped (paused feature)'); process.exit(0) }
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

  // ── daily reward cap: 3 rewarded reports (15 $SERVE) per UTC day ──
  // Earlier rewarded reports are back-dated by more than an hour (same UTC day) so
  // the "3+ in the last hour" flag doesn't mask the cap.
  const earlier = () => {
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0)
    return new Date(Math.max(dayStart.getTime() + 60_000, Date.now() - 90 * 60_000)).toISOString()
  }
  const seedRewarded = (e, count) => {
    for (let i = 0; i < count; i++) {
      sql(`insert into vibe_reports (restaurant_name, vibe, reported_by, gps_verified, serve_reward, created_at)
           values ('Seed ${i}', 'LIVE', '${e.toLowerCase()}', true, 5, '${earlier()}')`)
    }
  }
  const rewardedToday = e => Number(sql(`select count(*) from vibe_reports where lower(reported_by) = lower('${e}')
    and serve_reward > 0 and created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'`))

  const capped = await account('capped')
  seedRewarded(capped.user.email, 3)
  r = await vibe(capped.access_token, { ...base('Fourth Bar'), ...VENUE, ...AT_VENUE })
  const fourth = sql(`select serve_reward || '|' || gps_verified || '|' || is_flagged from vibe_reports
    where lower(reported_by) = lower('${capped.user.email}') and restaurant_name = 'Fourth Bar'`)
  check('4th eligible report of the day → saved (verified, not flagged) with 0 reward',
    r.status === 200 && r.json.serveReward === 0 && fourth === '0|true|false' && points(capped.user.email) === 0
      && /maximum/.test(r.json.message), { r, fourth })

  const third = await account('third')
  seedRewarded(third.user.email, 2)
  r = await vibe(third.access_token, { ...base('Third Bar'), ...VENUE, ...AT_VENUE })
  check('3rd eligible report of the day → still rewarded 5', r.status === 200 && r.json.serveReward === 5 && rewardedToday(third.user.email) === 3, r)

  const racer = await account('racer')
  seedRewarded(racer.user.email, 2)
  const cap = await Promise.all(Array.from({ length: 6 }, (_, i) => vibe(racer.access_token, { ...base(`Cap Race ${i}`), ...VENUE, ...AT_VENUE })))
  const paid = cap.filter(x => x.json.serveReward > 0).length
  check('6 simultaneous eligible reports with 2 already rewarded → exactly 1 more rewarded, all 6 saved',
    paid === 1 && rewardedToday(racer.user.email) === 3 && points(racer.user.email) === 5 && reports(racer.user.email) === 8
      && cap.every(x => x.status === 200), { statuses: cap.map(x => x.status), paid, rewarded: rewardedToday(racer.user.email), pts: points(racer.user.email) })

  const fresh3 = await account('fresh3')
  const all = await Promise.all(Array.from({ length: 12 }, (_, i) => vibe(fresh3.access_token, { ...base(`Burst ${i}`), ...VENUE, ...AT_VENUE })))
  check('12 simultaneous eligible reports on a clean day → never more than 15 $SERVE',
    points(fresh3.user.email) <= 15 && rewardedToday(fresh3.user.email) <= 3 && reports(fresh3.user.email) === 12,
    { pts: points(fresh3.user.email), rewarded: rewardedToday(fresh3.user.email), saved: reports(fresh3.user.email), st: all.map(x => x.status) })

  const yesterday = await account('yesterday')
  sql(`insert into vibe_reports (restaurant_name, vibe, reported_by, gps_verified, serve_reward, created_at)
       select 'Old ' || g, 'LIVE', lower('${yesterday.user.email}'), true, 5,
              (date_trunc('day', now() at time zone 'UTC') at time zone 'UTC') - interval '2 hours'
       from generate_series(1, 3) g`)
  r = await vibe(yesterday.access_token, { ...base('New Day Bar'), ...VENUE, ...AT_VENUE })
  check("yesterday's rewarded reports don't count toward today's cap", r.status === 200 && r.json.serveReward === 5, r)

  // ── database permissions ──
  const acl = sql(`select has_function_privilege('anon', 'public.submit_vibe_report(text,text,text,text,text,numeric,numeric,integer,boolean,boolean)', 'execute') || '|' || has_function_privilege('authenticated', 'public.submit_vibe_report(text,text,text,text,text,numeric,numeric,integer,boolean,boolean)', 'execute')`)
  check('browser roles cannot call submit_vibe_report directly', acl === 'false|false', acl)
  r = await fetch(GW + '/rest/v1/rpc/submit_vibe_report', { method: 'POST', headers: { apikey: ANON, authorization: `Bearer ${guest.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_email: 'x@example.com', p_restaurant_name: 'X', p_vibe: 'LIVE', p_bar_seats: null, p_wait_time: null, p_user_lat: null, p_user_lng: null, p_distance_meters: null, p_location_consistent: true, p_new_account: false }) })
  check('signed-in user calling the function through the API → refused', r.status === 401 || r.status === 403 || r.status === 404, r.status)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error('ERROR', e); process.exit(1) })
