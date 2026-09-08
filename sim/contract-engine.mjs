// A headless first-contract act. Port of ContractPrototype.resolveTurn with the
// narration stripped; the numbers come from core3.mjs, generated out of App.jsx.
// Accepts the same `carry` the shipped game hands it: Act One's own floor and map.
//
// The simulated player decides on what the UI actually shows — the turnout BAND, never
// the exact chance — so this measures the rules rather than a cheat.
import * as C from './core.mjs';
import * as K from './core3.mjs';
const { clamp, rand, infOn, tieOn, generateInfluence, outgoingTies, orgTier, ACT1_WORKERS_SEED } = C;
const { CONTRACT_MONTHS, LEVERAGE_COOLING, CAT_HOURS, CAT_JOIN_REQ, ACTION_LADDER, CONTRACT_ISSUES,
  CONTRACT_MAX_TIERS, makeContractWorkers, catBacking, participationChance, contractTierSum,
  ratifyYesChance, keepUnionChance, rungFatigue, stalledCost, timingMult, STALL_MAX,
  CAT_IDLE_QUIT, contractRead, projectedTurnoutBand } = K;
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

export function playContract(opts = {}) {
  const carry = opts.carry || null;
  const influence = carry?.influence ?? generateInfluence(ACT1_WORKERS_SEED);
  let w = makeContractWorkers(carry?.workers ?? null);
  let leverage = 0, stall = 0, dead = false;
  const rungUses = {};
  const issues = CONTRACT_ISSUES.map(i => ({ id: i.id, tier: 0 }));
  const log = { landed: 0, thin: 0, quiet: 0, rungs: [], bought: 0, disciplined: 0, quit: 0,
    startCommit: mean(w.map(x => x.commitment)), startCat: w.filter(x => x.cat).length, peakStall: 0, months: 0 };
  const issueDef = (id) => CONTRACT_ISSUES.find(i => i.id === id);
  const catHours = (x) => CAT_HOURS + (orgTier(x).bonusHours || 0);
  const spend = () => {
    for (;;) {
      const options = issues.filter(i => i.tier < 2)
        .map(i => ({ i, cost: stalledCost(issueDef(i.id).costs[i.tier + 1], stall) }))
        .filter(o => o.cost <= leverage);
      if (!options.length) return;
      options.sort((a, b) => opts.spend === 'wages' ? (a.i.id === 'wages' ? -1 : 1) : a.cost - b.cost);
      leverage -= options[0].cost; options[0].i.tier += 1;
    }
  };

  let month = 1;
  for (; month <= CONTRACT_MONTHS; month++) {
    log.months = month;
    w = w.map(x => ({ ...x, participated: false }));
    const cat = w.filter(x => x.cat);
    if (!cat.length) { dead = true; break; }
    const pool = cat.reduce((n, o) => n + catHours(o), 0);

    // --- pick a rung, off the band the screen shows ---
    let tier = null;
    const rank = (t) => {
      const need = t.threshold * w.length;
      const b = projectedTurnoutBand(w, influence, t, month);
      return { t, need, ...b };
    };
    const options = ACTION_LADDER.filter(t => t.hours <= pool).map(rank);
    if (opts.rung === 'escalate') tier = [...options].reverse().find(o => o.lo >= o.need)?.t || null;
    else if (opts.rung === 'gamble') tier = [...options].reverse().find(o => o.hi >= o.need)?.t || null;
    else if (opts.rung === 'letter') tier = ACTION_LADDER[0].hours <= pool ? ACTION_LADDER[0] : null;
    else if (opts.rung === 'reckless') tier = [...ACTION_LADDER].reverse().find(t => t.hours <= pool) || null;
    else if (opts.rung === 'timed') {
      // Climb, but save the rungs that withhold labour for a milestone month.
      const ok = [...options].reverse().filter(o => o.lo >= o.need);
      tier = (ok.find(o => o.t.rank < 4) && timingMult({ rank: 4 }, month) < 1)
        ? ok.find(o => o.t.rank < 4).t
        : (ok[0]?.t || null);
    }
    let left = pool - (tier ? tier.hours : 0);
    const used = {}; const u = (id) => used[id] || 0;

    // --- recruit anyone the team can vouch for ---
    w.filter(x => !x.cat && x.commitment >= CAT_JOIN_REQ).forEach(t => {
      const a = cat.find(o => catHours(o) - u(o.id) >= 3);
      if (!a || left < 3) return;
      used[a.id] = u(a.id) + 3; left -= 3; t.cat = true; t.monthsIdle = 0;
    });

    // --- one-on-ones: either on the coldest, or on whoever you can no longer read ---
    const targets = w.filter(x => !x.cat).map(t => {
      const a = cat.filter(o => catHours(o) - u(o.id) >= 2)
        .sort((p, q) => tieOn(influence, q, t) - tieOn(influence, p, t))[0];
      if (!a) return null;
      const r = contractRead(t, month);
      const score = opts.scout ? (r.hi - r.lo) * 10 + tieOn(influence, a, t)
        : tieOn(influence, a, t) * (100 - t.commitment);
      return { t, a, score };
    }).filter(Boolean).sort((p, q) => q.score - p.score);
    for (const { t, a } of targets) {
      if (left < 2 || catHours(a) - u(a.id) < 2) continue;
      used[a.id] = u(a.id) + 2; left -= 2;
      const tie = tieOn(influence, a, t);
      const drag = 1 - 0.35 * (t.fulfillment / 100);
      t.commitment = clamp(t.commitment + Math.max(1, Math.round(11 * (0.45 + 0.85 * (tie / 100)) * drag)));
      t.spokenMonth = month;
    }

    // --- the action ---
    let acted = null;
    if (tier) {
      const lead = [...cat].sort((p, q) =>
        outgoingTies(influence, q.id).reduce((n, x) => n + x.weight, 0)
        - outgoingTies(influence, p.id).reduce((n, x) => n + x.weight, 0))[0];
      const showed = [];
      w.forEach(x => {
        const b = catBacking(influence, w, x.id) + infOn(influence, lead.id, x.id) * 0.5;
        if (Math.random() < participationChance(x, tier, b)) { x.participated = true; showed.push(x); }
      });
      const share = showed.length / w.length, strong = share >= tier.threshold;
      const uses = rungUses[tier.key] || 0;
      const fatigue = rungFatigue(uses), timing = timingMult(tier, month);
      rungUses[tier.key] = uses + 1;
      const raw = strong ? tier.payout * Math.min(1.35, share / tier.threshold)
        : tier.payout * 0.25 * (share / tier.threshold);
      leverage += Math.round(raw * fatigue * timing);
      showed.forEach(x => { x.spokenMonth = month; });
      if (strong) {
        const bump = 4;
        showed.forEach(x => { x.commitment = clamp(x.commitment + bump); x.thinRuns = 0; });
        stall = Math.max(0, stall - 1); log.landed++;
      } else {
        w.forEach(x => { x.commitment = clamp(x.commitment - 3); if (x.cat) x.thinRuns = (x.thinRuns || 0) + 1; });
        stall = Math.min(STALL_MAX, stall + 1); log.thin++;
      }
      log.rungs.push(tier.rank);
      acted = { rank: tier.rank, showed: showed.length };
    } else {
      w.forEach(x => { if (!x.cat) x.commitment = clamp(x.commitment - 3); });
      stall = Math.min(STALL_MAX, stall + 1); log.quiet++; log.rungs.push(0);
    }
    log.peakStall = Math.max(log.peakStall, stall);

    // --- the other side of the table ---
    const buyable = w.filter(x => !x.cat && (x.bought || 0) <= 0 && x.commitment >= 20)
      .sort((a, b) => a.commitment - b.commitment);
    if (buyable.length && Math.random() < 0.3) {
      const mark = buyable[0];
      const take = Math.min(0.75, Math.max(0.1, (100 - mark.commitment) / 90));
      if (Math.random() < take) { mark.commitment = clamp(mark.commitment - 26); mark.bought = 3; log.bought++; }
      else { mark.commitment = clamp(mark.commitment + 6); mark.spokenMonth = month; }
    }
    if (acted && acted.rank >= 3 && acted.showed > 0 && Math.random() < 0.35) {
      const pool2 = w.filter(x => x.participated && x.cat);
      const mark = pool2.length
        ? [...pool2].sort((a, b) => catBacking(influence, w, a.id) - catBacking(influence, w, b.id))[0] : null;
      if (mark) {
        mark.cat = false; mark.commitment = clamp(mark.commitment - 18);
        w.forEach(x => { if (x.id !== mark.id) x.commitment = clamp(x.commitment - 3); });
        log.disciplined++;
      }
    }

    // --- a team is a set of people who are asked to do things ---
    w.forEach(x => {
      if (!x.cat) { x.monthsIdle = 0; return; }
      const usedThis = used[x.id] > 0 || x.participated;
      x.monthsIdle = usedThis ? 0 : (x.monthsIdle || 0) + 1;
      if (x.monthsIdle >= CAT_IDLE_QUIT) { x.cat = false; x.monthsIdle = 0; x.commitment = clamp(x.commitment - 8); log.quit++; }
      else if ((x.thinRuns || 0) >= 2) { x.cat = false; x.thinRuns = 0; x.commitment = clamp(x.commitment - 6); log.quit++; }
    });
    w.forEach(x => { if ((x.bought || 0) > 0) x.bought -= 1; });

    spend();
    if (month < CONTRACT_MONTHS) leverage = Math.floor(leverage * LEVERAGE_COOLING);
  }

  const tiers = contractTierSum(issues);
  if (dead) return { dead: true, tiers, ratified: false, survives: false, cat: 0, commitment: mean(w.map(x => x.commitment)), ...log };
  const yes = w.filter(x => Math.random() < ratifyYesChance(x, issues)).length;
  const keep = w.filter(x => Math.random() < keepUnionChance(x, issues)).length;
  return { dead: false, tiers, ratified: yes > w.length - yes, survives: keep > w.length - keep,
    cat: w.filter(x => x.cat).length, commitment: mean(w.map(x => x.commitment)), ...log };
}
