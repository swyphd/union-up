// A headless Act One. The week is resolved by the game's own resolveWeek, imported from
// src/engine/act1 — not a port of it. What this file adds is the shape the drivers and
// policies expect: a game object with a running tally, advanced one week at a time.
import * as C from '../src/engine/act1/index.js';

export function newGame() {
  // Same order as ActOneGame: the map is rolled from the seed, then the floor.
  const social = C.generateSocial(C.ACT1_WORKERS_SEED);
  const workers = C.makeAct1Workers(social);
  return {
    workers, influence: social.influence, social, week: 1, heat: 0, stage: 'drive',
    consultant: { active: false, arrivedWeek: null, lastSetPiece: 0, raises: 0, threats: 0, perks: 0 },
    perks: [], outsiders: [], filedWeek: null, electionWeek: null, ballot: null,
    tally: { convoGain: 0, publicGain: 0, passiveGain: 0, misfires: 0, asks: 0, signs: 0, burns: 0, tipped: 0, leaksJoined: 0, leaksDropped: 0, fallouts: 0, falloutsSeen: 0, rumors: 0, repairs: 0 },
  };
}

// One week of plans resolved. `plan` is a list of {actorId, type, targetId}.
export function resolveWeek(G, plan) {
  const { pending, stats } = C.resolveWeek(G, plan);
  const tally = { ...G.tally };
  for (const k of Object.keys(stats)) tally[k] = (tally[k] || 0) + stats[k];
  return {
    ...G,
    workers: pending.workers, heat: pending.heat, consultant: pending.consultant,
    social: pending.social, influence: pending.social.influence,
    perks: pending.perksNext, outsiders: pending.outsidersNext,
    ballot: pending.ballot, week: G.week + 1, tally,
  };
}

export { C };
