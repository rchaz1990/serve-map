// One publication date for the Terms/Privacy version AND the early-test participant
// agreements (guest and worker), in the app and in the database migrations.
//   node scripts/legal-version.mjs check            every place agrees (exit 1 if not)
//   node scripts/legal-version.mjs check --release  …and the date is a real publication date (YYYY-MM-DD)
//   node scripts/legal-version.mjs set YYYY-MM-DD   set every place, immediately before deployment
// The date is the day the documents are published; do not set it earlier.
//
// Places (the latest migration defining each database function is authoritative; earlier
// migrations, e.g. 39 = 2026-10-10, are history and are not rewritten):
//   lib/legal.ts                      LEGAL_VERSION
//   lib/participant-documents.ts      PARTICIPANT_VERSION and the "**Version:**" line of both sheets
//   44b_participant_enforcement.sql   current_legal_version()
//   44_participant_agreements.sql     current_participant_version()
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const sec = f => path.join(root, 'supabase-sql/security', f)
const PLACES = [
  { name: 'app LEGAL_VERSION', file: path.join(root, 'lib/legal.ts'), re: /export const LEGAL_VERSION = '([^']+)'/g, put: v => `export const LEGAL_VERSION = '${v}'` },
  { name: 'app PARTICIPANT_VERSION', file: path.join(root, 'lib/participant-documents.ts'), re: /export const PARTICIPANT_VERSION = '([^']+)'/g, put: v => `export const PARTICIPANT_VERSION = '${v}'` },
  { name: 'sheet version lines', file: path.join(root, 'lib/participant-documents.ts'), re: /\*\*Version:\*\* ([0-9A-Za-z-]+)/g, put: v => `**Version:** ${v}`, count: 2 },
  { name: 'migration 44b current_legal_version()', file: sec('44b_participant_enforcement.sql'), re: /function public\.current_legal_version\(\)\nreturns text\nlanguage sql\nimmutable\nas \$\$ select '([^']+)'::text \$\$;/g, put: v => `function public.current_legal_version()\nreturns text\nlanguage sql\nimmutable\nas $$ select '${v}'::text $$;` },
  { name: 'migration 44 current_participant_version()', file: sec('44_participant_agreements.sql'), re: /function public\.current_participant_version\(\)\nreturns text\nlanguage sql\nimmutable\nas \$\$ select '([^']+)'::text \$\$;/g, put: v => `function public.current_participant_version()\nreturns text\nlanguage sql\nimmutable\nas $$ select '${v}'::text $$;` },
]
const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v
const found = p => [...fs.readFileSync(p.file, 'utf8').matchAll(p.re)].map(m => m[1])

const [cmd, arg] = process.argv.slice(2)
if (cmd === 'set') {
  if (!isDate(arg)) { console.error('Give the publication date as YYYY-MM-DD.'); process.exit(1) }
  for (const p of PLACES) {
    // Function replacers: a replacement string would treat "$$" as an escaped "$".
    fs.writeFileSync(p.file, fs.readFileSync(p.file, 'utf8').replace(p.re, () => p.put(arg)))
  }
}
const values = []
for (const p of PLACES) {
  const v = found(p)
  if (v.length !== (p.count ?? 1)) { console.error(`Could not find ${p.name} (${p.count ?? 1} expected, ${v.length} found) in ${p.file}`); process.exit(1) }
  values.push(...v.map(x => [p.name, x]))
}
const distinct = [...new Set(values.map(([, v]) => v))]
if (distinct.length !== 1) { console.error('MISMATCH:\n' + values.map(([n, v]) => `  ${n}: ${v}`).join('\n')); process.exit(1) }
const v = distinct[0]
if ((cmd === 'check' && arg === '--release') && !isDate(v)) {
  console.error(`NOT READY: version ${v} is not a publication date (YYYY-MM-DD). Run "set" immediately before deployment.`); process.exit(1)
}
console.log(`OK: Terms/Privacy and both participant agreements are all ${v} (app and migrations 44/44b)`)
