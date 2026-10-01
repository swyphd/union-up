// M4: how often friendships give way, and how wrong the map goes when you stop looking.
//
// "Map error" at the end of a game counts the things the board would show wrongly: a
// friend count you believe that is no longer true, a crowd you saw somebody in that they
// have left. Both only come from falling outs you did not see.
import './seed.mjs';
import * as C from '../src/engine/act1/index.js';
import { playGame } from './run.mjs';
const N = Number(process.argv[2] || 600);
const mapError = (r) => {
  let slots = 0, crowd = 0;
  r.workers.forEach(w => {
    if (C.believedSlots(w, r.social) !== C.friendsOf(r.social, w.id).length) slots++;
    if (w.circleKnown && C.seenCircle(w, r.social) !== (r.social.circleOf[w.id] ?? null)) crowd++;
  });
  return { slots, crowd };
};
const run = (label, opts) => {
  let f = 0, seen = 0, rum = 0, rep = 0, fDrive = 0, won = 0, slots = 0, crowd = 0, wrongGames = 0;
  for (let i = 0; i < N; i++) {
    const r = playGame({ askBar: 74, pubPhase: 'campaign', mapper: true, ...opts });
    f += r.fallouts; seen += r.falloutsSeen; rum += r.rumors; rep += r.repairs; won += r.won;
    const e = mapError(r); slots += e.slots; crowd += e.crowd; if (e.slots + e.crowd > 0) wrongGames++;
  }
  console.log(label.padEnd(30), `falling outs ${(f / N).toFixed(2)} (seen ${(seen / N).toFixed(2)}), rumors ${(rum / N).toFixed(2)}, repaired ${(rep / N).toFixed(2)}`,
    `| map wrong in ${(100 * wrongGames / N).toFixed(0)}% of games: ${(slots / N).toFixed(2)} friend counts, ${(crowd / N).toFixed(2)} crowds | won ${(100 * won / N).toFixed(1)}%`);
};
run('mapper, keeps mapping', {});
run('mapper, stops at week 8', { stopMappingAt: 8 });
const keep = { ...C.FALLOUT_TUNING }; C.FALLOUT_TUNING.driveChance = 0; C.FALLOUT_TUNING.campaignChance = 0;
run('no falling outs (rumors only)', { stopMappingAt: 8 });
Object.assign(C.FALLOUT_TUNING, keep);
