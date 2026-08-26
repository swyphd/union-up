import * as E from './engine.mjs';
import * as C from './core.mjs';
import { planWeek } from './policy.mjs';

const MAX_WEEKS = 40;
export function playGame(opts = {}) {
  let G = E.newGame();
  let filedOn = null, thresholdOn = null;
  for (let i = 0; i < MAX_WEEKS; i++) {
    const signed = G.workers.filter(x => x.signed).length;
    if (thresholdOn == null && signed >= C.ACT1_CARDS_NEEDED) thresholdOn = G.week;
    // A decent player files once they clear the bar with a little cushion.
    if (G.stage === 'drive' && signed >= C.ACT1_CARDS_NEEDED + (opts.cushion ?? 1)) {
      G = { ...G, stage: 'campaign', filedWeek: G.week, electionWeek: G.week + C.ELECTION_WEEKS };
      filedOn = G.week;
    }
    G = E.resolveWeek(G, planWeek(G, opts));
    if (G.ballot) {
      // What the campaign believed on the eve of the vote, minus what happened.
      const proj = C.voteProjection(G.workers);
      G.projError = proj.yes - G.ballot.yes;
      break;
    }
  }
  const w = G.workers;
  return {
    won: G.ballot?.won ?? false, ballot: G.ballot, weeks: G.week - 1, projError: G.projError ?? 0,
    thresholdOn, filedOn,
    signed: w.filter(x => x.signed).length,
    committee: w.filter(x => x.organizer && !x.burned).length,
    heat: G.heat, burns: G.tally.burns, misfires: G.tally.misfires,
    asks: G.tally.asks, signs: G.tally.signs,
    convoGain: G.tally.convoGain, publicGain: G.tally.publicGain, passiveGain: G.tally.passiveGain,
    trueMean: Math.round(w.reduce((s, x) => s + (x.trueSupport ?? x.support), 0) / w.length),
    statedMean: Math.round(w.reduce((s, x) => s + x.support, 0) / w.length),
  };
}
