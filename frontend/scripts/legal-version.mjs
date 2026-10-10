// One Terms/Privacy version for the app and migration 39.
//   node scripts/legal-version.mjs check            app and migration 39 agree (exit 1 if not)
//   node scripts/legal-version.mjs check --release  …and the version is a real publication date (YYYY-MM-DD)
//   node scripts/legal-version.mjs set YYYY-MM-DD   set both, immediately before deployment
// The date is the day the Terms/Privacy are published; do not set it earlier.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const APP = path.join(root, 'lib/legal.ts')
const M39 = path.join(root, 'supabase-sql/security/39_participant_data_policy.sql')
const APP_RE = /export const LEGAL_VERSION = '([^']+)'/
const M39_RE = /as \$\$ select '([^']+)'::text \$\$;/

const read = () => ({ app: fs.readFileSync(APP, 'utf8').match(APP_RE)?.[1], m39: fs.readFileSync(M39, 'utf8').match(M39_RE)?.[1] })
const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v

const [cmd, arg] = process.argv.slice(2)
if (cmd === 'set') {
  if (!isDate(arg)) { console.error('Give the publication date as YYYY-MM-DD.'); process.exit(1) }
  fs.writeFileSync(APP, fs.readFileSync(APP, 'utf8').replace(APP_RE, `export const LEGAL_VERSION = '${arg}'`))
  fs.writeFileSync(M39, fs.readFileSync(M39, 'utf8').replace(M39_RE, `as $$ select '${arg}'::text $$;`))
}
const v = read()
if (!v.app || !v.m39) { console.error('Could not find the version in', !v.app ? APP : M39); process.exit(1) }
if (v.app !== v.m39) { console.error(`MISMATCH: app ${v.app} vs migration 39 ${v.m39}`); process.exit(1) }
if ((cmd === 'check' && arg === '--release') && !isDate(v.app)) {
  console.error(`NOT READY: version ${v.app} is not a publication date (YYYY-MM-DD). Run "set" immediately before deployment.`); process.exit(1)
}
console.log(`OK: app and migration 39 both ${v.app}`)
