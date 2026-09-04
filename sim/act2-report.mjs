// Act Two: win rate and what actually decides it, by player policy.
import { playAct2 } from './act2-run.mjs';
const N = Number(process.argv[2] || 2000);
const pad = (s, n) => String(s).padEnd(n);
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const L4 = [{ name: 'A', trait: 'committee' }, { name: 'B', trait: 'legal' }, { name: 'C', trait: 'morale' }, { name: 'D', trait: 'antiunion' }];
const POLICIES = {
  'focus 2, file now':            { focus: 2, fileMode: 'now' },
  'focus 2, wait for committee':  { focus: 2, fileMode: 'committee' },
  'focus 1 then next':            { focus: 1, fileMode: 'now' },
  'spread 4':                     { focus: 4, fileMode: 'now' },
  'focus 2 + 4 leaders':          { focus: 2, fileMode: 'now', leaders: L4 },
  'focus 2, safe platform':       { focus: 2, fileMode: 'now', platformMode: 'safe' },
  'focus 2, listen first (bargain)': { focus: 2, fileMode: 'now', bargain: true },
  'focus 2, omniscient platform': { focus: 2, fileMode: 'now', platformMode: 'cheat' },
};
console.log(`n=${N} per row. Act Two, ported engine.\n`);
console.log(pad('policy', 34) + pad('won%', 7) + pad('elections', 11) + pad('elec win%', 11) + pad('mean p(win)', 13)
  + pad('p<.6', 7) + pad('filed t', 9) + pad('committees', 12) + pad('defect%', 9) + pad('fired', 7) + pad('breaks', 8) + pad('falseAlive', 12) + 'loss reasons');
for (const [name, opts] of Object.entries(POLICIES)) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(playAct2(opts));
  const els = rs.flatMap(r => r.elections);
  const reasons = {};
  rs.filter(r => !r.won).forEach(r => { reasons[r.over] = (reasons[r.over] || 0) + 1; });
  console.log(pad(name, 34) + pad((100 * rs.filter(r => r.won).length / N).toFixed(1), 7)
    + pad(mean(rs.map(r => r.elections.length)).toFixed(2), 11)
    + pad((100 * els.filter(e => e.won).length / Math.max(1, els.length)).toFixed(0) + '%', 11)
    + pad(mean(els.map(e => e.winChance)).toFixed(2), 13)
    + pad((100 * els.filter(e => e.winChance < 0.6).length / Math.max(1, els.length)).toFixed(0) + '%', 7)
    + pad(mean(rs.flatMap(r => Object.values(r.filedOn))).toFixed(1), 9)
    + pad(mean(rs.map(r => r.committees)).toFixed(2), 12)
    + pad((100 * rs.filter(r => r.defections > 0).length / N).toFixed(0) + '%', 9)
    + pad(mean(rs.map(r => r.firings)).toFixed(2), 7)
    + pad(mean(rs.map(r => r.breaks)).toFixed(3), 8)
    + pad((100 * rs.filter(r => r.falseAlive > 0).length / N).toFixed(0) + '%', 12)
    + Object.entries(reasons).map(([k, v]) => `${k} ${(100 * v / N).toFixed(0)}%`).join(', '));
}
