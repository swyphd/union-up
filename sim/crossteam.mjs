// Two ways a floor can be connected across team lines. Influence is generated
// team-clustered on purpose; affinities are drawn from one shared pool with no regard
// for team at all. So which system actually carries the cross-team story?
import * as C from './core.mjs';
const N = 300;
let infTot = 0, infCross = 0;
let pairsSame = 0, pairsCross = 0, shareSame = 0, shareCross = 0;
let orgCross = 0, orgCrossShared = 0;
for (let g = 0; g < N; g++) {
  const ws = C.makeAct1Workers(); const inf = C.generateInfluence(ws);
  for (const a of ws) for (const t of C.outgoingTies(inf, a.id)) {
    const b = ws.find(x => x.id === t.id); if (!b) continue;
    infTot++; if (a.team !== b.team) infCross++;
  }
  for (const a of ws) for (const b of ws) {
    if (a.id >= b.id) continue;
    const shares = C.sharedAffinities(a, b).length > 0;
    if (a.team === b.team) { pairsSame++; if (shares) shareSame++; }
    else { pairsCross++; if (shares) shareCross++; }
  }
  // and the one that matters for play: an organizer reaching across the line
  for (const o of ws.filter(x => x.organizer)) for (const b of ws) {
    if (b.id === o.id || b.team === o.team) continue;
    orgCross++;
    if (C.sharedAffinities(o, b).length > 0) orgCrossShared++;
  }
}
const pc = (a, b) => (100 * a / b).toFixed(0) + '%';
console.log(`Averaged over ${N} fresh floors\n`);
console.log('INFLUENCE  is generated team-clustered:');
console.log(`  ${pc(infCross, infTot)} of all influence ties cross a team line\n`);
console.log('AFFINITY   is drawn from one pool, blind to team:');
console.log(`  ${pc(shareSame, pairsSame)} of same-team pairs share something`);
console.log(`  ${pc(shareCross, pairsCross)} of cross-team pairs share something  <- same rate, by construction\n`);
console.log('WHAT A PLAYER CAN USE:');
console.log(`  ${pc(orgCrossShared, orgCross)} of organizer-to-other-team pairs have common ground to open on`);
