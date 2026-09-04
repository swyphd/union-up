// What an Act Two election is actually made of at the moment of the roll.
import { playAct2 } from './act2-run.mjs';
const N = Number(process.argv[2] || 2000);
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(q * (s.length - 1))]; };
for (const [name, opts] of Object.entries({ 'file now': { focus: 2 }, 'wait for committee': { focus: 2, fileMode: 'committee' } })) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(playAct2(opts));
  const els = rs.flatMap(r => r.elections);
  console.log(`\n${name}: ${els.length} elections`);
  console.log('  true support at vote  mean', mean(els.map(e => e.raw)).toFixed(0), ' p10', pct(els.map(e => e.raw), 0.1), ' p90', pct(els.map(e => e.raw), 0.9));
  console.log('  fear at vote          mean', mean(els.map(e => e.fear)).toFixed(0), ' p10', pct(els.map(e => e.fear), 0.1), ' p90', pct(els.map(e => e.fear), 0.9));
  console.log('  platform factor       mean', mean(els.map(e => e.factor)).toFixed(2), ' min', Math.min(...els.map(e => e.factor)).toFixed(2), ' max', Math.max(...els.map(e => e.factor)).toFixed(2));
  console.log('  support term (0.6*s)  mean', mean(els.map(e => 0.6 * e.support / 100)).toFixed(2), '   fear term (0.4*(1-f)) mean', mean(els.map(e => 0.4 * (100 - e.fear) / 100)).toFixed(2));
  console.log('  p(win) p10/p50/p90   ', pct(els.map(e => e.winChance), 0.1).toFixed(2), pct(els.map(e => e.winChance), 0.5).toFixed(2), pct(els.map(e => e.winChance), 0.9).toFixed(2));
  console.log('  morale - true gap     mean', mean(els.map(e => e.morale - e.raw)).toFixed(0));
  console.log('  retaliations/game', mean(rs.map(r => r.retaliations)).toFixed(2), ' grievance wins/game', mean(rs.map(r => r.grievanceWins)).toFixed(2), ' side offers/game', mean(rs.map(r => r.sideOffers)).toFixed(2), ' min stamina', pct(rs.map(r => r.minStamina), 0.1));
  // Would the result have been different if the outcome were a 10-worker ballot instead of one roll?
  // Model each worker voting yes with p = winChance: P(majority) for n workers.
  const binomMaj = (p, n) => { let s = 0; for (let k = Math.floor(n / 2) + 1; k <= n; k++) { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); s += c * Math.pow(p, k) * Math.pow(1 - p, n - k); } return s; };
  console.log('  same p(win) as a 10-vote ballot instead of one roll: mean P(majority) =', mean(els.map(e => binomMaj(e.winChance, 10))).toFixed(2));
}
