// Is the platform a real trade-off? Enumerate all 56 platforms against (a) nothing known
// and (b) the real rolled priorities, and count how many keep every bloc out of side-offer
// range (sat >= 50) and out of walking range (sat >= 35).
import * as C from './core2.mjs';
const { BLOCS, DEMANDS, blocSatisfaction, rollBlocPriorities } = C;
const ids = DEMANDS.map(d => d.id);
const platforms = [];
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = j + 1; k < ids.length; k++) platforms.push([ids[i], ids[j], ids[k]]);
const unknown = Object.fromEntries(BLOCS.map(b => [b.id, { top: null, intensity: 2 }]));
const minSat = (p, pr) => Math.min(...BLOCS.map(b => blocSatisfaction(b.id, p, pr)));
console.log('56 platforms, priorities unknown (what the player can compute from the screen):');
const rows = platforms.map(p => ({ p, min: minSat(p, unknown), sats: BLOCS.map(b => blocSatisfaction(b.id, p, unknown)) })).sort((a, b) => b.min - a.min);
console.log('  no side offer possible (min>=50):', rows.filter(r => r.min >= 50).length, ' nobody can walk (min>=35):', rows.filter(r => r.min >= 35).length);
console.log('  top 6:'); rows.slice(0, 6).forEach(r => console.log('   ', r.p.join(' + ').padEnd(40), 'min', r.min, ' [', r.sats.join(' '), ']'));
console.log('  any contested demand in a min>=50 platform?', rows.filter(r => r.min >= 50 && r.p.some(id => C.DEMAND_BY_ID[id].kind === 'contested')).length, 'of', rows.filter(r => r.min >= 50).length);

const N = 3000;
let safeOk = 0, bestOk = 0, anyOk = 0, bestIsBland = 0;
const bland = ['crunchcap', 'aiclause', 'justcause'];
for (let n = 0; n < N; n++) {
  const pr = rollBlocPriorities();
  const scored = platforms.map(p => ({ p, min: minSat(p, pr) })).sort((a, b) => b.min - a.min);
  if (minSat(bland, pr) >= 50) safeOk++;
  if (scored[0].min >= 50) anyOk++;
  if (scored.filter(r => r.min >= 50).every(r => !r.p.some(id => C.DEMAND_BY_ID[id].kind === 'contested'))) bestIsBland++;
}
console.log(`\nAgainst ${N} real priority rolls:`);
console.log('  crunchcap+aiclause+justcause keeps every bloc >=50 in', (100 * safeOk / N).toFixed(0) + '% of rolls');
console.log('  some platform keeps every bloc >=50 in', (100 * anyOk / N).toFixed(0) + '% of rolls');
console.log('  every >=50 platform is contested-free in', (100 * bestIsBland / N).toFixed(0) + '% of rolls');
// How much does the platform move the vote? factor range across platforms at one shop.
const { locBlocFactor, START_LOCATIONS } = C;
const pr = rollBlocPriorities();
START_LOCATIONS.forEach(l => {
  const fs = platforms.map(p => locBlocFactor(l, p, pr));
  console.log(`  ${l.name.padEnd(16)} turnout factor across all platforms: ${Math.min(...fs).toFixed(2)} .. ${Math.max(...fs).toFixed(2)}  (bland: ${locBlocFactor(l, bland, pr).toFixed(2)})`);
});
