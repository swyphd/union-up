import * as E from './act2-engine.mjs';
import * as C from './core2.mjs';
import { planTurn, decideFiling, choosePlatform } from './act2-policy.mjs';

export function playAct2(opts = {}) {
  let G = E.newGame(opts.leaders || [], opts.contract || null);
  // Station leaders on the preferred sites, in order.
  const order = ['suburban', 'airport', 'university', 'downtown'];
  G.leaders.forEach((l, i) => { G.deployment[i] = order[i % order.length]; });
  const filedOn = {};
  for (let guard = 0; guard < 40; guard++) {
    // escalation phase
    for (const id of decideFiling(G, opts)) {
      if (G.platform.length < C.PLATFORM_SLOTS) G = { ...G, platform: choosePlatform(G.priorities, opts.platformMode || 'optimize', G.proven) };
      G = E.file(G, id); filedOn[id] = G.turn;
    }
    // A survey that landed buys one change of mind. Take it if it lifts the worst-off bloc.
    if (G.platformOpen && G.platform.length >= C.PLATFORM_SLOTS) {
      const revised = choosePlatform(G.priorities, opts.platformMode || 'optimize', G.proven, G.platform);
      const worst = (p) => Math.min(...C.BLOCS.map(b => C.blocSatisfaction(b.id, p, G.priorities, G.proven)));
      if (worst(revised) > worst(G.platform)) { G = { ...G, platform: revised }; G.log.revisions++; }
      G = { ...G, platformOpen: false };
    }
    const { alloc, resp, wantSurvey } = planTurn(G, opts);
    G = E.resolveTurn(G, alloc, resp, wantSurvey);
    if (G.over) break;
  }
  const L = G.log;
  return {
    won: G.over === 'win', over: G.over, turns: G.turn, filedOn, platform: G.platform,
    elections: L.elections, defections: L.defections, sideOffers: L.sideOffers, retaliations: L.retaliations, firings: L.firings,
    buyOffs: L.buyOffs, breaks: L.breaks, falseAlive: L.falseAlive, committees: L.committees, grievanceWins: L.grievanceWins,
    bargains: L.bargains, minStamina: G.organizer.stamina,
    sats: C.BLOCS.map(b => G.priorities[b.id].defected ? 0 : C.blocSatisfaction(b.id, G.platform, G.priorities, G.proven)),
    surveyRate: L.surveyRate, surveyTier: L.surveyTier, revisions: L.revisions, proven: G.proven,
  };
}
