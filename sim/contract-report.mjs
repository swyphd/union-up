// The first-contract act, by policy, on the floor a real Act One actually hands it.
import { playContract } from './contract-engine.mjs';
import { playGame } from './run.mjs';
import * as K from './core3.mjs';

const N = Number(process.argv[2] || 800);
const pad = (s, n) => String(s).padEnd(n);
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const pct = (rs, f) => (100 * rs.filter(f).length / rs.length).toFixed(0);

// Collect real Act One wins to hand forward.
const wins = [];
for (let i = 0; i < N * 12 && wins.length < 120; i++) {
  const r = playGame({ askBar: 74, pubPhase: 'campaign' });
  if (r.won) wins.push({ workers: r.workers, influence: r.influence });
}
console.log(`n=${N} per row, on ${wins.length} real Act One wins.\n`);
console.log(pad('policy', 30) + pad('tiers/6', 9) + pad('4+ tiers', 10) + pad('6/6', 6) + pad('ratify%', 9)
  + pad('survive%', 10) + pad('dead%', 7) + pad('landed', 8) + pad('thin', 6) + pad('team', 6)
  + pad('bought', 8) + pad('fired', 7) + pad('quit', 6) + 'rung path');

const POLICIES = {
  'escalate (read the band)':   { rung: 'escalate' },
  'escalate + scout the cold':  { rung: 'escalate', scout: true },
  'time the milestones':        { rung: 'timed', scout: true },
  'gamble on the optimistic end': { rung: 'gamble' },
  'letters only, every month':  { rung: 'letter' },
  'reckless (top rung always)': { rung: 'reckless' },
};
for (const [name, opts] of Object.entries(POLICIES)) {
  const rs = [];
  for (let i = 0; i < N; i++) rs.push(playContract({ ...opts, carry: wins[i % wins.length] }));
  const path = Array.from({ length: K.CONTRACT_MONTHS }, (_, m) => mean(rs.map(r => r.rungs[m] ?? 0)).toFixed(1)).join(' ');
  console.log(pad(name, 30) + pad(mean(rs.map(r => r.tiers)).toFixed(2), 9)
    + pad(pct(rs, r => r.tiers >= 4) + '%', 10) + pad(pct(rs, r => r.tiers === 6) + '%', 6)
    + pad(pct(rs, r => r.ratified) + '%', 9) + pad(pct(rs, r => r.survives) + '%', 10)
    + pad(pct(rs, r => r.dead) + '%', 7)
    + pad(mean(rs.map(r => r.landed)).toFixed(1), 8) + pad(mean(rs.map(r => r.thin)).toFixed(1), 6)
    + pad(mean(rs.map(r => r.cat)).toFixed(1), 6) + pad(mean(rs.map(r => r.bought)).toFixed(1), 8)
    + pad(mean(rs.map(r => r.disciplined)).toFixed(1), 7) + pad(mean(rs.map(r => r.quit)).toFixed(1), 6) + path);
}
