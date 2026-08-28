// What actually decides how a one-on-one lands: the line, or what the two of them share?
// Expected value of a deep conversation, including the misfire, across the real ranges.
import * as C from './core.mjs';

const mk = (affs, known) => ({ affinities: affs, knownAffinities: known, poisoned: [], influenceTrait: 'quiet', organizer: false, support: 40, trueSupport: 35, fulfillment: 50 });
const A = (n) => mk(['a','b','c','d'], ['a','b','c','d']);
// target sharing `n` marks with the actor, all surfaced (so misfire is only about overlap)
const T = (n) => mk(['a','b','c'].slice(0, n).concat(['x','y']), ['a','b','c'].slice(0, n).concat(['x','y']));

// A misfire costs the gain AND guards them for three weeks; price it at roughly two
// wasted conversations plus the 4 points of true support it takes off.
const MISFIRE_COST = 4;
function ev(base, n) {
  const a = A(), t = T(n);
  const tie = C.tieFrom(base, a, t);
  const m = C.misfireChance(a, t);
  return (1 - m) * C.convoGain(a, t, tie).deepTrue - m * MISFIRE_COST;
}
const pad = (s, w) => String(s).padStart(w);
console.log('Expected true-support gain from one deep conversation\n');
console.log('  line      shared 0   1     2     3      how much sharing is worth');
for (const base of [0, 20, 40, 60, 80, 95]) {
  const row = [0,1,2,3].map(n => ev(base, n));
  console.log('  ' + pad(base, 3) + '       ' + row.map(v => pad(v.toFixed(1), 5)).join(' ')
    + '      ' + (row[0] > 0 ? (row[3] / row[0]).toFixed(1) + 'x' : '∞ (from negative)'));
}
console.log('\n  shared    line 0   20    40    60    80    95     how much the line is worth');
for (const n of [0, 1, 2, 3]) {
  const row = [0,20,40,60,80,95].map(b => ev(b, n));
  console.log('  ' + pad(n, 3) + '       ' + row.map(v => pad(v.toFixed(1), 5)).join(' ')
    + '   ' + (row[0] > 0 ? (row[5] / row[0]).toFixed(1) + 'x' : '∞ (from negative)'));
}
console.log('\nmisfire chance is', (C.misfireChance(A(), T(0)) * 100).toFixed(0) + '% at 0 shared and',
  (C.misfireChance(A(), T(1)) * 100).toFixed(0) + '% at 1 — it does not read the line at all.');
