// The yellow lines an armed organizer shows are their drawn ties. But every worker on
// the floor is a legal conversation target. So: how often is the BEST person for this
// organizer to sit down with someone the yellow lines never pointed at?
import * as C from './core.mjs';

const MISFIRE_COST = 4;
function evDeep(inf, a, t) {
  const tie = C.tieOn(inf, a, t);
  const m = C.misfireChance(a, t);
  return (1 - m) * C.convoGain(a, t, tie).deepTrue - m * MISFIRE_COST;
}
const N = 400;
let bestHadLine = 0, bestNoLine = 0, totalOrg = 0;
let evBestLine = 0, evBestAny = 0;
let linesShown = 0;
for (let g = 0; g < N; g++) {
  const ws = C.makeAct1Workers(); const inf = C.generateInfluence(ws);
  // mid-game: floor mapped, a couple of rounds of scouting done
  ws.forEach(x => { x.revealed = true; if (Math.random() < 0.6) x.knownAffinities = [...C.affList(x)]; });
  for (const a of ws.filter(x => x.organizer)) {
    const targets = ws.filter(x => x.id !== a.id && !x.burned && !x.signed);
    if (!targets.length) continue;
    totalOrg++;
    const drawn = new Set(C.outgoingTies(inf, a.id)
      .filter(t => C.tieFrom(t.weight, a, ws.find(x => x.id === t.id) || {}) >= C.EDGE_MIN_DRAW)
      .map(t => t.id));
    linesShown += drawn.size;
    const scored = targets.map(t => ({ t, ev: evDeep(inf, a, t) })).sort((x, y) => y.ev - x.ev);
    const best = scored[0];
    const bestDrawn = scored.find(s => drawn.has(s.t.id));
    if (drawn.has(best.t.id)) bestHadLine++; else bestNoLine++;
    evBestAny += best.ev;
    evBestLine += bestDrawn ? bestDrawn.ev : 0;
  }
}
const pc = (n) => (100 * n / totalOrg).toFixed(0) + '%';
console.log(`${totalOrg} organizer-weeks, mid-game floor\n`);
console.log(`  yellow lines shown per organizer: ${(linesShown / totalOrg).toFixed(1)} of ~17 possible targets\n`);
console.log(`  best deep-talk target HAD a yellow line   ${pc(bestHadLine)}`);
console.log(`  best deep-talk target had NO yellow line  ${pc(bestNoLine)}`);
console.log(`\n  following the lines gets you ${(100 * evBestLine / evBestAny).toFixed(0)}% of the best available conversation.`);
