// Which features lib/early-test.ts pauses. Suites skip (and print) their checks for paused
// features instead of failing; when a feature is re-enabled the checks run again unchanged.
const fs = require('fs')
const path = require('path')
const src = fs.readFileSync(path.join(__dirname, '../../lib/early-test.ts'), 'utf8')
const PAUSED = {}
for (const k of ['follows', 'shiftEmails', 'vibeReports', 'venueComments', 'qrScanTracking']) {
  PAUSED[k] = new RegExp(`\\b${k}:\\s*true\\b`).test(src)
}
let skipped = 0
function skip(name, feature) { skipped++; console.log('SKIP', name, `(paused for the early test: ${feature})`) }
const skippedCount = () => skipped
module.exports = { PAUSED, skip, skippedCount }
