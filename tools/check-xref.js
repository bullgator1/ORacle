#!/usr/bin/env node
/* ORacle cross-link integrity checker.
 *
 * Parses the REG registry + PEDS_CARDS in xref.js and confirms every anchor it
 * references still exists in the corresponding app file. Run this before deploying
 * after any content edit — a renamed step key or procedure id silently kills a
 * cross-link otherwise.
 *
 *   node tools/check-xref.js
 *
 * Exit code 0 = all good, 1 = at least one dangling anchor.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const xref = read('xref.js');
const files = {
  preop: read('preop/index.html'),
  proc:  read('procedures/index.html'),
  peds:  read('peds/index.html'),
};

// An anchor "exists" if it appears as a quoted token in the app file.
// - step apps register keys via registerStep('key', ...)  -> 'key'
// - procedures stores ids via  id: "proc-id"              -> "proc-id"
function anchorExists(app, anchor) {
  const f = files[app];
  return f.includes("'" + anchor + "'") || f.includes('"' + anchor + '"');
}

const problems = [];
let checked = 0;

// ---- REG rows: lines containing {t: ... preop/proc/peds: '...'} ----
const regStart = xref.indexOf('var REG');
const regEnd = xref.indexOf('var PEDS_CARDS');
const regBlock = xref.slice(regStart, regEnd === -1 ? undefined : regEnd);
regBlock.split('\n').filter(l => l.includes('{t:')).forEach(line => {
  const t = (line.match(/t:\s*'([^']+)'/) || [])[1] || '(unknown topic)';
  ['preop', 'proc', 'peds'].forEach(app => {
    const m = line.match(new RegExp(app + ":\\s*'([^']+)'"));
    if (m) {
      checked++;
      if (!anchorExists(app, m[1])) problems.push({ topic: t, app, anchor: m[1] });
    }
  });
});

// ---- PEDS_CARDS: one-way "Peds dosing" affordance on procedures pediatric cards ----
const pcStart = xref.indexOf('PEDS_CARDS');
if (pcStart !== -1) {
  const pcBlock = xref.slice(pcStart, xref.indexOf('];', pcStart) + 1);
  (pcBlock.match(/'([^']+)'/g) || []).map(s => s.replace(/'/g, '')).forEach(id => {
    checked++;
    if (!anchorExists('proc', id)) problems.push({ topic: '(PEDS_CARDS affordance)', app: 'proc', anchor: id });
  });
}

console.log(`ORacle xref check — ${checked} anchors verified across preop / proc / peds`);
if (problems.length === 0) {
  console.log('✓ All cross-link targets resolve.');
  process.exit(0);
} else {
  console.log(`\n✗ ${problems.length} dangling cross-link anchor(s):\n`);
  problems.forEach(p => console.log(`  [${p.app}] "${p.anchor}"  — topic: ${p.topic}`));
  console.log('\nFix: update the anchor in xref.js REG, or restore the id in the app file.');
  process.exit(1);
}
