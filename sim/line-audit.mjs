// The board draws every tie it knows about. But the player's weekly decision is only
// ever "which of my committee talks to whom" -- so how many of those lines are actually
// about a choice they can make?
import * as C from './core.mjs';
let actionable = 0, total = 0, games = 0;
let passiveOnly = 0, unreachable = 0;
for (let g = 0; g < 200; g++) {
  const ws = C.makeAct1Workers(); const inf = C.generateInfluence(ws);
  if (process.argv[2] === 'mapped') ws.forEach(x => {
    x.revealed = true; x.knownAffinities = [...C.affList(x)];
  });
  games++;
  for (const a of ws) for (const t of C.outgoingTies(inf, a.id)) {
    const b = ws.find(x => x.id === t.id); if (!b) continue;
    const tie = C.tieFrom(t.weight, a, b);
    if (tie < C.EDGE_MIN_DRAW) continue;
    if (!C.influenceKnown(a, b)) continue;   // only what the board actually draws
    total++;
    if (a.organizer) actionable++;
    else if (a.signed) passiveOnly++;
    else unreachable++;
  }
}
const pc = (n) => (100 * n / total).toFixed(0) + '%';
console.log(`Lines drawn on the board, averaged over ${games} fresh games: ${(total/games).toFixed(1)} per board\n`);
console.log(`  from a committee member  ${pc(actionable)}   you can act on this one this week`);
console.log(`  from someone who signed  ${pc(passiveOnly)}   spreads on its own, you cannot direct it`);
console.log(`  from everyone else       ${pc(unreachable)}   not a lever at all right now`);
