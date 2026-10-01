// M5's acceptance test. Phase 2 is the weeks between the petition and the ballot, and it is
// its own game: a player who answers management's calendar has to beat one who just keeps
// having sit-downs, and the committee's coverage at filing has to predict the margin.
//   node sim/phase2.mjs [n] [electionWeeks]
import { playGame } from './run.mjs';
const N = Number(process.argv[2] || 1000);
const WEEKS = process.argv[3] ? Number(process.argv[3]) : undefined;
const pad = (s, n) => String(s).padEnd(n);
const PLAYERS = {
  counter: { mapper: true, phase2: 'counter' },
  talker: { mapper: true, phase2: 'talker' },
  'counter, no actions': { mapper: true, phase2: 'counter', actionEvery: 0 },
  'counter, every week': { mapper: true, phase2: 'counter', actionEvery: 1, actionPhase: 0 },
};
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
function corr(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  let n = 0, dx = 0, dy = 0;
  xs.forEach((x, i) => { n += (x - mx) * (ys[i] - my); dx += (x - mx) ** 2; dy += (ys[i] - my) ** 2; });
  return n / Math.sqrt(dx * dy || 1);
}
console.log(`n=${N} per player, ${WEEKS ?? 'default'} weeks to the ballot\n`);
console.log(pad('player', 22) + pad('won%', 8) + pad('margin', 8) + pad('fear', 7) + pad('actions held', 14) + 'coverage→margin r');
const results = {};
for (const [name, opts] of Object.entries(PLAYERS)) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(playGame({ askBar: 74, electionWeeks: WEEKS, ...opts }));
  results[name] = rs;
  const v = rs.filter(r => r.ballot && r.coverageAtFiling);
  const margin = v.map(r => r.ballot.yes - r.ballot.no);
  const acts = v.reduce((s, r) => s + (r.tally.actions || 0), 0), held = v.reduce((s, r) => s + (r.tally.actionsHeld || 0), 0);
  console.log(pad(name, 22) + pad((100 * rs.filter(r => r.won).length / N).toFixed(1), 8)
    + pad(mean(margin).toFixed(1), 8) + pad(mean(v.map(r => r.fearAtBallot)).toFixed(1), 7)
    + pad(acts ? `${held}/${acts}` : '-', 14)
    + corr(v.map(r => r.coverageAtFiling.score), margin).toFixed(2));
}
// Coverage at filing against the margin, for the counter player: the table the claim rests on.
const v = results.counter.filter(r => r.ballot && r.coverageAtFiling);
console.log('\ncounter: crowds + teams covered at filing → mean margin, won%');
const by = {};
v.forEach(r => { const k = r.coverageAtFiling.score; (by[k] = by[k] || []).push(r); });
Object.keys(by).sort((a, b) => a - b).forEach(k => {
  const g = by[k];
  console.log(`  ${pad(k, 3)} n=${pad(g.length, 5)} margin ${pad(mean(g.map(r => r.ballot.yes - r.ballot.no)).toFixed(1), 6)} won ${(100 * g.filter(r => r.won).length / g.length).toFixed(0)}%`);
});
