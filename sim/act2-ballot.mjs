// The Act Two ballot, in isolation: what a shop's numbers are actually worth at the
// count, and how much the margin moves. Run after changing any ballot constant.
import * as C from './core2.mjs';
const { act2WinChance, act2Projection, act2Ballot, START_LOCATIONS } = C;
const shop = (workers, trueSupport, fear, recruited, committee = true) =>
  ({ workers, trueSupport, morale: trueSupport, fear, recruited, committee: { active: committee } });
const pad = (s, n) => String(s).padEnd(n);

console.log('p(win) for a 10-worker shop, 40% recruited, platform factor 1.0\n');
console.log(pad('true support', 14) + [25, 40, 55, 70].map(f => pad('fear ' + f, 10)).join(''));
for (const ts of [50, 60, 70, 80, 90, 100]) {
  console.log(pad(ts, 14) + [25, 40, 55, 70].map(f =>
    pad((100 * act2WinChance(shop(10, ts, f, 4), 1)).toFixed(0) + '%', 10)).join(''));
}

console.log('\nWhat the shop looks like at the count (10 workers, 40% recruited, fear 45):');
console.log(pad('true support', 14) + pad('projected', 20) + pad('p(win)', 9) + 'the floor, coldest to warmest');
for (const ts of [55, 70, 85, 98]) {
  const l = shop(10, ts, 45, 4);
  const p = act2Projection(l, 1);
  console.log(pad(ts, 14) + pad(`${p.yes} yes / ${p.no} no / ${p.out} out`, 20)
    + pad((100 * act2WinChance(l, 1)).toFixed(0) + '%', 9)
    + act2Ballot(l, 1).map(v => v.standing).join(' '));
}

console.log('\nWhat each input is worth, from a 10-worker shop at 78 true support, fear 50, 40% recruited:');
const base = shop(10, 78, 50, 4);
const at = (o) => (100 * act2WinChance({ ...base, ...o }, o.factor ?? 1)).toFixed(0) + '%';
console.log('  baseline                    ', at({}));
console.log('  +10 true support            ', at({ trueSupport: 88 }));
console.log('  -15 fear                    ', at({ fear: 35 }));
console.log('  +20pp recruited (4 -> 6)    ', at({ recruited: 6 }));
console.log('  platform factor 1.20        ', at({ factor: 1.2 }));
console.log('  platform factor 0.85        ', at({ factor: 0.85 }));

console.log('\nShop size matters — the same numbers, different unit (78 true support, fear 50, 40% recruited):');
START_LOCATIONS.forEach(l => {
  const s = shop(l.workers, 78, 50, Math.round(l.workers * 0.4));
  console.log('  ' + pad(l.name, 17) + pad(l.workers + ' workers', 12) + (100 * act2WinChance(s, 1)).toFixed(0) + '%');
});
