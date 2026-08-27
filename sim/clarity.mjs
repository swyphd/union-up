// Does the read model actually track how much organizing has been done? Play real games
// and watch what the player can see, against what is true.
import * as E from './engine.mjs';
import * as C from './core.mjs';
import { planWeek } from './policy.mjs';
import { applyRules } from './rules.mjs';
applyRules('current');

const PLAYERS = { careful: {}, sloppy: { blindDeep: true }, careless: { blindDeep: true, askBar: 58 } };
const N = Number(process.argv[2] || 300);
const pad = (s, n) => String(s).padEnd(n);

console.log(`n=${N} per player. "clarity" = how narrow the reads are, floor-wide.\n`);
console.log(pad('player', 11) + pad('wk4', 8) + pad('wk8', 8) + pad('wk12', 8) + pad('at ballot', 11)
  + pad('read properly', 15) + 'proj error');
for (const [name, opts] of Object.entries(PLAYERS)) {
  const at = { 4: [], 8: [], 12: [] }, endC = [], endRead = [], projErr = [];
  for (let g = 0; g < N; g++) {
    let G = E.newGame();
    for (let i = 0; i < 40; i++) {
      const signed = G.workers.filter(x => x.signed).length;
      if (G.stage === 'drive' && signed >= C.ACT1_CARDS_NEEDED + 1)
        G = { ...G, stage: 'campaign', filedWeek: G.week, electionWeek: G.week + C.ELECTION_WEEKS };
      if (at[G.week]) at[G.week].push(C.floorClarity(G.workers, G.week));
      G = E.resolveWeek(G, planWeek(G, { askBar: 74, pubPhase: 'campaign', ...opts }));
      if (G.ballot) {
        const live = G.workers.filter(x => !x.burned);
        endC.push(C.floorClarity(G.workers, G.week));
        endRead.push(100 * live.filter(x => C.readOf(x, G.week).exact).length / live.length);
        projErr.push(C.voteProjection(G.workers).yes - G.ballot.yes);
        break;
      }
    }
  }
  const m = (a) => a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(0) : '-';
  console.log(pad(name, 11) + pad(m(at[4]) + '%', 8) + pad(m(at[8]) + '%', 8) + pad(m(at[12]) + '%', 8)
    + pad(m(endC) + '%', 11) + pad(m(endRead) + '%', 15) + '+' + m(projErr));
}
