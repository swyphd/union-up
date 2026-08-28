// Does worker-to-worker influence -- neither end an organizer -- do any work?
// Zero it out and see what the game does. Everything organizer-outgoing is left alone.
import * as E from './engine.mjs';
import * as C from './core.mjs';
import { planWeek } from './policy.mjs';

function play(opts, strip) {
  let G = E.newGame();
  if (strip) {
    // keep only ties whose SENDER is one of the two starting organizers
    const orgIds = new Set(G.workers.filter(w => w.organizer).map(w => w.id));
    for (const a of Object.keys(G.influence))
      for (const b of Object.keys(G.influence[a]))
        if (!orgIds.has(Number(a))) delete G.influence[a][b];
  }
  for (let i = 0; i < 40; i++) {
    const signed = G.workers.filter(x => x.signed).length;
    if (G.stage === 'drive' && signed >= C.ACT1_CARDS_NEEDED + 1)
      G = { ...G, stage: 'campaign', filedWeek: G.week, electionWeek: G.week + C.ELECTION_WEEKS };
    G = E.resolveWeek(G, planWeek(G, { askBar: 74, pubPhase: 'campaign', ...opts }));
    if (G.ballot) return G;
  }
  return G;
}
const N = 800, pad = (s, n) => String(s).padEnd(n);
console.log(`n=${N} per cell\n`);
console.log(pad('influence graph', 26) + pad('careful won%', 14) + pad('sloppy won%', 13) + 'passive spread/game');
for (const [label, strip] of [['full (ships today)', false], ['organizer-outgoing only', true]]) {
  const out = {};
  for (const [pn, po] of [['careful', {}], ['sloppy', { blindDeep: true }]]) {
    let won = 0, pas = 0;
    for (let i = 0; i < N; i++) { const G = play(po, strip); if (G.ballot?.won) won++; pas += G.tally.passiveGain; }
    out[pn] = { won: 100 * won / N, pas: pas / N };
  }
  console.log(pad(label, 26) + pad(out.careful.won.toFixed(1), 14) + pad(out.sloppy.won.toFixed(1), 13) + out.careful.pas.toFixed(0));
}
