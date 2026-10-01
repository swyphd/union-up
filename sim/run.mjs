import './seed.mjs';
import * as E from './engine.mjs';
import * as C from '../src/engine/act1/index.js';
import { planWeek, planWeekMapper, planWeekPhase2 } from './policy.mjs';

// How much of the floor the committee is inside: crowds (true membership) and teams with
// somebody on the committee, out of all of them. What Phase 2 is scored against.
export function coverage(G) {
  const orgs = G.workers.filter(x => x.organizer && !x.burned);
  const circles = new Set(orgs.map(o => G.social.circleOf[o.id]).filter(Boolean));
  const teams = new Set(orgs.map(o => o.team));
  return { circles: circles.size, teams: teams.size, score: circles.size + teams.size, size: orgs.length };
}

const MAX_WEEKS = 40;
export function playGame(opts = {}) {
  let G = E.newGame();
  let filedOn = null, thresholdOn = null, coverageAtFiling = null;
  for (let i = 0; i < MAX_WEEKS; i++) {
    const signed = G.workers.filter(x => x.signed).length;
    if (thresholdOn == null && signed >= C.ACT1_CARDS_NEEDED) thresholdOn = G.week;
    // A decent player files once they clear the bar with a little cushion.
    if (G.stage === 'drive' && signed >= C.ACT1_CARDS_NEEDED + (opts.cushion ?? 1)) {
      G = E.file(G, opts.electionWeeks ?? C.ELECTION_WEEKS);
      filedOn = G.week;
      coverageAtFiling = coverage(G);
    }
    const policy = G.stage === 'campaign' && opts.phase2 ? planWeekPhase2 : opts.mapper ? planWeekMapper : planWeek;
    G = E.resolveWeek(G, policy(G, opts));
    if (G.ballot) {
      // What the campaign believed on the eve of the vote, minus what happened.
      const proj = C.voteProjection(G.workers);
      G.projError = proj.yes - G.ballot.yes;
      break;
    }
  }
  const w = G.workers;
  return {
    // The floor and the map, so the next act can be run on what this one actually built
    // rather than on a fresh roll — which is what the shipped game now does.
    workers: w, influence: G.influence, social: G.social,
    won: G.ballot?.won ?? false, ballot: G.ballot, weeks: G.week - 1, projError: G.projError ?? 0,
    thresholdOn, filedOn,
    signed: w.filter(x => x.signed).length,
    committee: w.filter(x => x.organizer && !x.burned).length,
    heat: G.heat, burns: G.tally.burns, tipped: G.tally.tipped, leaksJoined: G.tally.leaksJoined, leaksDropped: G.tally.leaksDropped, fallouts: G.tally.fallouts, falloutsSeen: G.tally.falloutsSeen, rumors: G.tally.rumors, repairs: G.tally.repairs, filedWeek: G.filedWeek, misfires: G.tally.misfires,
    asks: G.tally.asks, signs: G.tally.signs,
    convoGain: G.tally.convoGain, passiveGain: G.tally.passiveGain, coverageAtFiling, tally: G.tally,
    fearAtBallot: w.reduce((s, x) => s + (x.fear || 0), 0),
    trueMean: Math.round(w.reduce((s, x) => s + (x.trueSupport ?? x.support), 0) / w.length),
    statedMean: Math.round(w.reduce((s, x) => s + x.support, 0) / w.length),
  };
}
