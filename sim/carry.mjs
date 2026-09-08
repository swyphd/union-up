// Does Act One actually carry? Play a real Act One to a won ballot, hand its floor and
// its influence map to the first-contract act the way the shipped game does, and compare
// against the rolled floor the prototype used to invent.
import { playGame } from './run.mjs';
import { playContract } from './contract-engine.mjs';
import * as C from './core.mjs';

const N = Number(process.argv[2] || 400);
const pad = (s, n) => String(s).padEnd(n);
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

// Act One wins we can actually hand forward, by player skill.
const PLAYERS = { careful: {}, sloppy: { blindDeep: true } };
const wins = {};
for (const [name, opts] of Object.entries(PLAYERS)) {
  wins[name] = [];
  let tries = 0;
  while (wins[name].length < N && tries < N * 12) {
    tries++;
    const r = playGame({ askBar: 74, pubPhase: 'campaign', ...opts });
    if (r.won) wins[name].push(r);
  }
}
console.log(`Act One wins collected: ${Object.entries(wins).map(([k, v]) => `${k} ${v.length}`).join(', ')}\n`);

console.log('What the contract act starts from:');
console.log(pad('floor', 24) + pad('commitment', 12) + pad('team', 7) + pad('>=70 (can join)', 17) + 'was burned in Act One');
const rolledStart = [];
for (let i = 0; i < N; i++) rolledStart.push(playContract({ rung: 'letter' }));
console.log(pad('rolled (old prototype)', 24) + pad(mean(rolledStart.map(r => r.startCommit)).toFixed(0), 12)
  + pad(mean(rolledStart.map(r => r.startCat)).toFixed(1), 7) + pad('-', 17) + '-');
for (const [name, rs] of Object.entries(wins)) {
  const carried = rs.map(r => playContract({ rung: 'letter', carry: { workers: r.workers, influence: r.influence } }));
  const burned = mean(rs.map(r => r.workers.filter(x => x.burned).length));
  const ready = mean(rs.map(r => {
    const st = r.workers.map(x => Math.round((x.trueSupport ?? x.support) * 0.85) + (x.organizer && !x.burned ? 10 : 0) - (x.burned ? 18 : 0));
    return st.filter(v => v >= 70).length;
  }));
  console.log(pad(`carried (${name} Act One)`, 24) + pad(mean(carried.map(r => r.startCommit)).toFixed(0), 12)
    + pad(mean(carried.map(r => r.startCat)).toFixed(1), 7) + pad(ready.toFixed(1) + ' of 20', 17) + burned.toFixed(2) + ' people');
}

console.log('\nAnd what it does to the act (ratification called at month 12):');
console.log(pad('floor', 24) + pad('policy', 16) + pad('tiers/6', 9) + pad('6/6%', 7) + pad('ratify%', 9) + pad('survive%', 10) + pad('landed', 8) + pad('thin', 6) + 'team at end');
const rows = [['rolled (old prototype)', null]];
for (const name of Object.keys(wins)) rows.push([`carried (${name} Act One)`, name]);
for (const [label, who] of rows) {
  for (const rung of ['escalate', 'letter', 'reckless']) {
    const rs = [];
    for (let i = 0; i < N; i++) {
      const carry = who ? (() => { const r = wins[who][i % wins[who].length]; return { workers: r.workers, influence: r.influence }; })() : null;
      rs.push(playContract({ rung, carry }));
    }
    console.log(pad(label, 24) + pad(rung, 16) + pad(mean(rs.map(r => r.tiers)).toFixed(2), 9)
      + pad((100 * rs.filter(r => r.tiers === 6).length / rs.length).toFixed(0), 7)
      + pad((100 * rs.filter(r => r.ratified).length / rs.length).toFixed(0), 9)
      + pad((100 * rs.filter(r => r.survives).length / rs.length).toFixed(0), 10)
      + pad(mean(rs.map(r => r.landed)).toFixed(1), 8) + pad(mean(rs.map(r => r.thin)).toFixed(1), 6)
      + mean(rs.map(r => r.cat)).toFixed(1));
  }
}
