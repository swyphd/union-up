// Does the organizer's method actually beat the intuitive one?
//
// Every mode below plays the same game with the same budget and picks its sit-down
// SITES identically. The only thing that varies is who, inside a site, the organizer
// chooses to sit down with — and each mode decides on what the UI actually shows,
// never on the hidden pull value.
//
//   referral    ask who else to talk to, then go talk to them
//   enthusiasm  sit down with whoever reads warmest (the intuitive pick)
//   random      no method at all
//   none        never sit down with anybody
//
// Usage: node sim/act2-oneonone.mjs [modes] [n]
import * as E from './act2-engine.mjs';
import * as P from './act2-policy.mjs';
import * as C from './core2.mjs';

function play(opts) {
  let G = E.newGame(opts.leaders || [], null);
  let firstCommittee = null;
  for (let t = 1; t <= C.TOTAL_TURNS; t++) {
    if (G.done) break;
    const plan = P.planTurn(G, opts);
    G = E.resolveTurn(G, plan.alloc, plan.resp, plan.wantSurvey);
    if (firstCommittee == null && G.locations.some(l => l.committee?.active)) firstCommittee = t;
    for (const id of P.decideFiling(G, opts)) G = E.file(G, id);
    if (G.platform.length === 0 && G.platformOpen) G = { ...G, platform: P.choosePlatform(G.priorities, opts.platformMode) };
  }
  const won = G.locations.filter(l => l.status === 'won').length;
  return { won: won >= C.ACT2_SITES_NEEDED, sits: G.log.sitDowns, leaders: G.log.leadersFound,
    committees: G.log.committees, firstCommittee };
}

const MODES = (process.argv[2] || 'referral,enthusiasm,random,none').split(',');
const N = +(process.argv[3] || 1200);
console.log(`n=${N} per row. Focus 3, file on committee, optimizing platform.\n`);
console.log('method       won%   sit-downs  leaders  hit rate  committees  1st committee');
for (const mode of MODES) {
  let w = 0, s = 0, l = 0, c = 0, fc = 0, fcn = 0;
  for (let i = 0; i < N; i++) {
    const r = play({ focus: 3, fileMode: 'committee', platformMode: 'optimize', sitDown: mode });
    w += r.won; s += r.sits; l += r.leaders; c += r.committees;
    if (r.firstCommittee) { fc += r.firstCommittee; fcn++; }
  }
  console.log(
    mode.padEnd(12) +
    ((100 * w / N).toFixed(1) + '%').padEnd(7) +
    (s / N).toFixed(1).padEnd(11) +
    (l / N).toFixed(2).padEnd(9) +
    ((s ? (100 * l / s).toFixed(0) : 0) + '%').padEnd(10) +
    (c / N).toFixed(2).padEnd(12) +
    (fcn ? `month ${(fc / fcn).toFixed(1)} (${(100 * fcn / N).toFixed(0)}% of games)` : 'never'));
}
