// Runs the real engine against the real shipped ballot functions — no shim.
import { playGame } from './run.mjs';
import { applyRules } from './rules.mjs';
applyRules('current');
const N = Number(process.argv[2] || 3000);
const pad = (s, n) => String(s).padEnd(n);
const PLAYERS = { careful: {}, sloppy: { blindDeep: true }, careless: { blindDeep: true, askBar: 58 } };
console.log(`n=${N} per cell, live App.jsx ballot\n`);
console.log(pad('player', 12) + pad('won%', 9) + pad('filed%', 9) + pad('margin', 9)
  + pad('close', 8) + pad('blowout', 10) + 'proj error');
for (const [name, opts] of Object.entries(PLAYERS)) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(playGame({ askBar: 74, pubPhase: 'campaign', ...opts }));
  const v = rs.filter(r => r.ballot);
  const m = v.map(r => Math.abs(r.ballot.yes - r.ballot.no)).sort((a, b) => a - b);
  console.log(pad(name, 12) + pad((100 * rs.filter(r => r.won).length / N).toFixed(1), 9)
    + pad((100 * v.length / N).toFixed(0) + '%', 9) + pad(m[Math.floor(m.length / 2)] ?? '-', 9)
    + pad((100 * m.filter(x => x <= 2).length / m.length).toFixed(0) + '%', 8)
    + pad((100 * m.filter(x => x >= 8).length / m.length).toFixed(0) + '%', 10)
    + '+' + (v.reduce((s, r) => s + r.projError, 0) / v.length).toFixed(1) + ' yes votes');
}
