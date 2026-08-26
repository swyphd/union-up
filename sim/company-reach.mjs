// Now that the ballot runs on commitment, a move that only touches stated support cannot
// change the result — it can only corrupt the player's read. Worth knowing which is which.
import fs from 'fs';
const src = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const MOVES = {
  'Kirkman 1:1':                 'TARGETED 1:1',
  'Kirkman captive-audience':    'CAPTIVE-AUDIENCE MEETING — all',
  'Kirkman perk (affinity buy)': 'PERK LANDS',
  'Kirkman job threat':          'JOB THREAT LANDS',
  'Kirkman buy-off':             'BUY-OFF LANDS',
  'Mgmt captive-audience':       'CAPTIVE-AUDIENCE MEETING \\u2014 ${TEAM_LABEL[meetTeam]}',
  'Mgmt buys a department':      'BUYS A DEPARTMENT',
  'Daniels works the floor':     'DANIELS WORKS THE FLOOR',
  'Vantage review':              'VANTAGE PARTNERS REVIEWS',
  'The podcast':                 'THE PODCAST WEIGHS IN',
};
console.log('move'.padEnd(30) + 'touches commitment?  reaches the ballot?');
for (const [name, marker] of Object.entries(MOVES)) {
  const i = src.indexOf(marker);
  if (i < 0) { console.log(name.padEnd(30) + 'MARKER NOT FOUND'); continue; }
  // look back over the block that produced this line for a trueSupport write
  const from = Math.max(0, i - 1800);
  const block = src.slice(from, i);
  const hitsTrue = /\.trueSupport = clamp\(/.test(block);
  const hitsFulfil = /\.fulfillment = clamp\(/.test(block);
  console.log(name.padEnd(30) + (hitsTrue ? 'yes' : 'no ').padEnd(21)
    + (hitsTrue ? 'yes' : hitsFulfil ? 'indirectly (fulfilment)' : 'NO — read only'));
}
