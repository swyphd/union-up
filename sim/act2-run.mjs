import * as E from './act2-engine.mjs';
import * as C from './core2.mjs';
import { planTurn, decideFiling, choosePlatform } from './act2-policy.mjs';

export function playAct2(opts = {}) {
  let G = E.newGame(opts.leaders || []);
  // Station leaders on the preferred sites, in order.
  const order = ['suburban', 'airport', 'university', 'downtown'];
  G.leaders.forEach((l, i) => { G.deployment[i] = order[i % order.length]; });
  const filedOn = {};
  for (let guard = 0; guard < 40; guard++) {
    // escalation phase
    for (const id of decideFiling(G, opts)) {
      if (G.platform.length < C.PLATFORM_SLOTS) G = { ...G, platform: choosePlatform(G.priorities, opts.platformMode || 'optimize') };
      G = E.file(G, id); filedOn[id] = G.turn;
    }
    const { alloc, resp } = planTurn(G, opts);
    G = E.resolveTurn(G, alloc, resp);
    if (G.over) break;
  }
  const L = G.log;
  return {
    won: G.over === 'win', over: G.over, turns: G.turn, filedOn, platform: G.platform,
    elections: L.elections, defections: L.defections, sideOffers: L.sideOffers, retaliations: L.retaliations, firings: L.firings,
    buyOffs: L.buyOffs, breaks: L.breaks, falseAlive: L.falseAlive, committees: L.committees, grievanceWins: L.grievanceWins,
    bargains: L.bargains, minStamina: G.organizer.stamina,
    sats: C.BLOCS.map(b => G.priorities[b.id].defected ? 0 : C.blocSatisfaction(b.id, G.platform, G.priorities)),
  };
}
