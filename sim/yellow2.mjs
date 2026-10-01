// Following the lines is good for WHO. The question is whether it is safe for WHAT:
// a deep conversation into somebody you share nothing with misfires and guards them.
import './seed.mjs';
import * as C from '../src/engine/act1/index.js';
const N = 400;
let n = 0, misfireRisk = 0, safe = 0, sumRisk = 0;
for (let g = 0; g < N; g++) {
  const soc = C.generateSocial(); const ws = C.makeAct1Workers(soc); const inf = soc.influence;
  ws.forEach(x => { x.revealed = true; if (C.random() < 0.6) x.knownAffinities = [...C.affList(x)]; });
  for (const a of ws.filter(x => x.organizer)) {
    for (const t of C.outgoingTies(inf, a.id)) {
      const b = ws.find(x => x.id === t.id);
      if (!b || b.burned || b.signed) continue;
      if (C.tieFrom(t.weight, a, b) < C.EDGE_MIN_DRAW) continue;   // only the drawn ones
      n++;
      const m = C.misfireChance(a, b);
      sumRisk += m;
      if (m > 0) misfireRisk++; else safe++;
    }
  }
}
console.log(`Of the yellow lines an organizer is shown (${n} sampled):\n`);
console.log(`  safe to sit down with   ${(100*safe/n).toFixed(0)}%   (something found in common)`);
console.log(`  would misfire           ${(100*misfireRisk/n).toFixed(0)}%   average risk ${(100*sumRisk/n).toFixed(0)}%`);
console.log(`\nSo the line tells you who to reach. It does not tell you whether the long`);
console.log(`version is safe -- and on ${(100*misfireRisk/n).toFixed(0)}% of the lines it is not.`);
