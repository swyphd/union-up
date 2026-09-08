// A headless first-contract act. Port of ContractPrototype.resolveTurn, narration
// stripped. Accepts a `carry` of Act One's own floor and influence map, which is what
// the shipped game now hands it.
import * as C from './core.mjs';
import * as K from './core3.mjs';
const { clamp, infOn, tieOn, generateInfluence, outgoingTies, orgTier, ACT1_WORKERS_SEED } = C;
const { CONTRACT_MONTHS, LEVERAGE_COOLING, CAT_HOURS, CAT_JOIN_REQ, ACTION_LADDER, CONTRACT_ISSUES,
  CONTRACT_MAX_TIERS, makeContractWorkers, catBacking, participationChance, projectedTurnout,
  contractTierSum, ratifyYesChance, keepUnionChance } = K;
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

export function playContract(opts = {}) {
  const carry = opts.carry || null;
  const influence = carry?.influence ?? generateInfluence(ACT1_WORKERS_SEED);
  let w = makeContractWorkers(carry?.workers ?? null);
  let leverage = 0, issues = CONTRACT_ISSUES.map(i => ({ id: i.id, tier: 0 }));
  const log = { landed: 0, thin: 0, quiet: 0, cooled: 0, rungs: [], startCommit: mean(w.map(x => x.commitment)), startCat: w.filter(x => x.cat).length };
  const issueDef = (id) => CONTRACT_ISSUES.find(i => i.id === id);
  const catHours = (x) => CAT_HOURS + (orgTier(x).bonusHours || 0);
  const spend = () => {
    for (;;) {
      const options = issues.filter(i => i.tier < 2)
        .map(i => ({ i, cost: issueDef(i.id).costs[i.tier + 1] })).filter(o => o.cost <= leverage);
      if (!options.length) return;
      options.sort((a, b) => opts.spend === 'wages' ? (a.i.id === 'wages' ? -1 : 1) : a.cost - b.cost);
      leverage -= options[0].cost; options[0].i.tier += 1;
    }
  };
  for (let turn = 1; turn <= CONTRACT_MONTHS; turn++) {
    w = w.map(x => ({ ...x, participated: false }));
    const cat = w.filter(x => x.cat);
    const pool = cat.reduce((n, o) => n + catHours(o), 0);
    let tier = null;
    const lands = ACTION_LADDER.filter(t => projectedTurnout(w, influence, t) / w.length >= t.threshold && t.hours <= pool);
    if (opts.rung === 'escalate') tier = lands[lands.length - 1] || null;
    else if (opts.rung === 'letter') tier = ACTION_LADDER[0];
    else if (opts.rung === 'reckless') tier = [...ACTION_LADDER].reverse().find(t => t.hours <= pool) || null;
    else if (opts.rung === 'reach') {
      const top = lands[lands.length - 1];
      tier = top ? (ACTION_LADDER[top.rank] && ACTION_LADDER[top.rank].hours <= pool ? ACTION_LADDER[top.rank] : top) : null;
    }
    let left = pool - (tier ? tier.hours : 0);
    const used = {}; const u = (id) => used[id] || 0;
    w.filter(x => !x.cat && x.commitment >= CAT_JOIN_REQ).forEach(t => {
      const a = cat.find(o => catHours(o) - u(o.id) >= 3);
      if (!a || left < 3) return;
      used[a.id] = u(a.id) + 3; left -= 3; t.cat = true;
    });
    const targets = w.filter(x => !x.cat).map(t => {
      const a = cat.filter(o => catHours(o) - u(o.id) >= 2)
        .sort((p, q) => tieOn(influence, q, t) - tieOn(influence, p, t))[0];
      return a ? { t, a, score: tieOn(influence, a, t) * (100 - t.commitment) } : null;
    }).filter(Boolean).sort((p, q) => q.score - p.score);
    for (const { t, a } of targets) {
      if (left < 2 || catHours(a) - u(a.id) < 2) continue;
      used[a.id] = u(a.id) + 2; left -= 2;
      const tie = tieOn(influence, a, t);
      t.commitment = clamp(t.commitment + Math.max(1, Math.round(11 * (0.45 + 0.85 * (tie / 100)))));
    }
    if (tier) {
      const lead = [...cat].sort((p, q) =>
        outgoingTies(influence, q.id).reduce((n, x) => n + x.weight, 0) - outgoingTies(influence, p.id).reduce((n, x) => n + x.weight, 0))[0];
      let showed = 0;
      w.forEach(x => {
        const b = catBacking(influence, w, x.id) + infOn(influence, lead.id, x.id) * 0.5;
        if (Math.random() < participationChance(x, tier, b)) { x.participated = true; showed++; }
      });
      const share = showed / w.length, strong = share >= tier.threshold;
      const payout = strong ? Math.round(tier.payout * Math.min(1.35, share / tier.threshold))
        : Math.round(tier.payout * 0.25 * (share / tier.threshold));
      if (strong) { w.forEach(x => { if (x.participated) x.commitment = clamp(x.commitment + 4); }); log.landed++; }
      else { w.forEach(x => { x.commitment = clamp(x.commitment - 3); }); log.thin++; }
      leverage += payout; log.rungs.push(tier.rank);
    } else { w.forEach(x => { if (!x.cat) x.commitment = clamp(x.commitment - 3); }); log.quiet++; log.rungs.push(0); }
    spend();
    if (turn < CONTRACT_MONTHS) { const b = leverage; leverage = Math.floor(leverage * LEVERAGE_COOLING); log.cooled += b - leverage; }
  }
  const tiers = contractTierSum(issues);
  const yes = w.filter(x => Math.random() < ratifyYesChance(x, issues)).length;
  const keep = w.filter(x => Math.random() < keepUnionChance(x, issues)).length;
  return { tiers, ratified: yes > w.length - yes, survives: keep > w.length - keep,
    cat: w.filter(x => x.cat).length, commitment: mean(w.map(x => x.commitment)), ...log };
}
