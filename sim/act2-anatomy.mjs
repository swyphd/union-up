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
  console.log('  recruited at vote     mean', (100 * mean(els.map(e => e.recruited / e.workers))).toFixed(0) + '% of the unit');
  console.log('  p(win) p10/p50/p90   ', pct(els.map(e => e.winChance), 0.1).toFixed(2), pct(els.map(e => e.winChance), 0.5).toFixed(2), pct(els.map(e => e.winChance), 0.9).toFixed(2));
  console.log('  morale - true gap     mean', mean(els.map(e => e.morale - e.raw)).toFixed(0));
  console.log('  retaliations/game', mean(rs.map(r => r.retaliations)).toFixed(2), ' grievance wins/game', mean(rs.map(r => r.grievanceWins)).toFixed(2), ' side offers/game', mean(rs.map(r => r.sideOffers)).toFixed(2), ' min stamina', pct(rs.map(r => r.minStamina), 0.1));
  const m = els.map(e => Math.abs(e.margin)).sort((a, b) => a - b);
  console.log('  ballot margin |yes-no|  median', m[Math.floor(m.length / 2)], ' close (<=1)', (100 * m.filter(x => x <= 1).length / m.length).toFixed(0) + '%', ' blowout (>=6)', (100 * m.filter(x => x >= 6).length / m.length).toFixed(0) + '%');
  console.log('  didn\'t vote          mean', mean(els.map(e => e.out)).toFixed(1), 'of', mean(els.map(e => e.workers)).toFixed(1), 'workers');
}
