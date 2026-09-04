// A headless first-contract prototype. Port of ContractPrototype.resolveTurn.
import * as C from './core.mjs';
import * as K from './core3.mjs';
const { clamp, infOn, tieOn, generateInfluence, ACT1_WORKERS_SEED } = C;
const { CONTRACT_MONTHS, LEVERAGE_COOLING, CAT_HOURS, CAT_JOIN_REQ, ACTION_LADDER, CONTRACT_ISSUES, CONTRACT_MAX_TIERS,
  makeContractWorkers, catBacking, participationChance, projectedTurnout, contractTierSum, ratifyYesChance, keepUnionChance } = K;
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;

function play(opts = {}) {
  const influence = generateInfluence(ACT1_WORKERS_SEED);
  let w = makeContractWorkers();
  let leverage = 0, issues = CONTRACT_ISSUES.map(i => ({ id: i.id, tier: 0 }));
  const log = { landed: 0, thin: 0, quiet: 0, cooled: 0, rungs: [], ratifiedOn: null };
  const issueDef = (id) => CONTRACT_ISSUES.find(i => i.id === id);
  const spend = () => {
    // greedy: cheapest next tier first (or wages-first)
    for (;;) {
      const options = issues.filter(i => i.tier < 2).map(i => ({ i, cost: issueDef(i.id).costs[i.tier + 1] })).filter(o => o.cost <= leverage);
      if (!options.length) return;
      options.sort((a, b) => opts.spend === 'wages' ? (a.i.id === 'wages' ? -1 : 1) : a.cost - b.cost);
      leverage -= options[0].cost; options[0].i.tier += 1;
    }
  };
  for (let turn = 1; turn <= CONTRACT_MONTHS; turn++) {
    w = w.map(x => ({ ...x, participated: false }));
    const cat = w.filter(x => x.cat);
    const pool = cat.length * CAT_HOURS;
    // pick the rung
    let tier = null;
    const lands = ACTION_LADDER.filter(t => projectedTurnout(w, influence, t) / w.length >= t.threshold && t.hours <= pool);
    if (opts.rung === 'escalate') tier = lands[lands.length - 1] || null;
    else if (opts.rung === 'letter') tier = ACTION_LADDER[0];
    else if (opts.rung === 'reckless') tier = [...ACTION_LADDER].reverse().find(t => t.hours <= pool) || null;
    else if (opts.rung === 'reach') { // one rung above what lands, if anything lands
      const top = lands[lands.length - 1]; tier = top ? (ACTION_LADDER[top.rank] && ACTION_LADDER[top.rank].hours <= pool ? ACTION_LADDER[top.rank] : top) : null; }
    let left = pool - (tier ? tier.hours : 0);
    const hoursUsed = {};
    const used = (id) => hoursUsed[id] || 0;
    // recruits
    w.filter(x => !x.cat && x.commitment >= CAT_JOIN_REQ).forEach(t => {
      const a = cat.find(o => CAT_HOURS - used(o.id) >= 3); if (!a || left < 3) return;
      hoursUsed[a.id] = used(a.id) + 3; left -= 3; t.cat = true; t._joined = turn;
    });
    // one-on-ones: best tie × room to grow
    const targets = w.filter(x => !x.cat).map(t => {
      const a = cat.filter(o => CAT_HOURS - used(o.id) >= 2).sort((p, q) => tieOn(influence, q, t) - tieOn(influence, p, t))[0];
      return a ? { t, a, score: tieOn(influence, a, t) * (100 - t.commitment) } : null;
    }).filter(Boolean).sort((p, q) => q.score - p.score);
    for (const { t, a } of targets) {
      if (left < 2 || CAT_HOURS - used(a.id) < 2) continue;
      hoursUsed[a.id] = used(a.id) + 2; left -= 2;
      const tie = tieOn(influence, a, t);
      t.commitment = clamp(t.commitment + Math.max(1, Math.round(11 * (0.45 + 0.85 * (tie / 100)))));
    }
    // the action
    if (tier) {
      const lead = [...cat].sort((p, q) => C.outgoingTies(influence, q.id).reduce((s, x) => s + x.weight, 0) - C.outgoingTies(influence, p.id).reduce((s, x) => s + x.weight, 0))[0];
      let showed = 0;
      w.forEach(x => { const b = catBacking(influence, w, x.id) + infOn(influence, lead.id, x.id) * 0.5; if (Math.random() < participationChance(x, tier, b)) { x.participated = true; showed++; } });
      const share = showed / w.length, strong = share >= tier.threshold;
      const payout = strong ? Math.round(tier.payout * Math.min(1.35, share / tier.threshold)) : Math.round(tier.payout * 0.25 * (share / tier.threshold));
      if (strong) { w.forEach(x => { if (x.participated) x.commitment = clamp(x.commitment + 4); }); log.landed++; }
      else { w.forEach(x => { x.commitment = clamp(x.commitment - 3); }); log.thin++; }
      leverage += payout; log.rungs.push(tier.rank);
    } else { w.forEach(x => { if (!x.cat) x.commitment = clamp(x.commitment - 3); }); log.quiet++; log.rungs.push(0); }
    spend();
    // ratify early?
    if (opts.ratifyEarly && turn >= 2 && contractTierSum(issues) >= (opts.ratifyAt ?? 4)) {
      const proj = w.reduce((n, x) => n + ratifyYesChance(x, issues), 0);
      if (proj / w.length >= 0.6) { log.ratifiedOn = turn; break; }
    }
    if (turn < CONTRACT_MONTHS) { const before = leverage; leverage = Math.floor(leverage * LEVERAGE_COOLING); log.cooled += before - leverage; }
  }
  const tiers = contractTierSum(issues);
  const yes = w.filter(x => Math.random() < ratifyYesChance(x, issues)).length;
  const keep = w.filter(x => Math.random() < keepUnionChance(x, issues)).length;
  return { tiers, ratified: yes > w.length - yes, survives: keep > w.length - keep, cat: w.filter(x => x.cat).length,
    commitment: mean(w.map(x => x.commitment)), ...log, leftover: leverage };
}

const N = Number(process.argv[2] || 1500);
const pad = (s, n) => String(s).padEnd(n);
console.log(`n=${N}. First-contract prototype, 12 months, ratification called at month 12.\n`);
console.log(pad('policy', 30) + pad('tiers/6', 9) + pad('6/6%', 7) + pad('>=4%', 7) + pad('ratify%', 9) + pad('survive%', 10) + pad('landed', 8) + pad('thin', 6) + pad('quiet', 7) + pad('CAT', 5) + pad('commit', 8) + pad('cooled', 8) + 'rung path (mean by month)');
for (const [name, opts] of Object.entries({
  'escalate (highest that lands)': { rung: 'escalate' },
  'letters only':                 { rung: 'letter' },
  'reach one rung higher':        { rung: 'reach' },
  'reckless (highest affordable)':{ rung: 'reckless' },
  'escalate, wages first':        { rung: 'escalate', spend: 'wages' },
  'escalate, ratify at 4 tiers':  { rung: 'escalate', ratifyEarly: true, ratifyAt: 4 },
})) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(play(opts));
  const path = Array.from({ length: CONTRACT_MONTHS }, (_, m) => mean(rs.map(r => r.rungs[m] ?? 0)).toFixed(1)).join(' ');
  console.log(pad(name, 30) + pad(mean(rs.map(r => r.tiers)).toFixed(2), 9) + pad((100 * rs.filter(r => r.tiers === 6).length / N).toFixed(0), 7)
    + pad((100 * rs.filter(r => r.tiers >= 4).length / N).toFixed(0), 7) + pad((100 * rs.filter(r => r.ratified).length / N).toFixed(0), 9)
    + pad((100 * rs.filter(r => r.survives).length / N).toFixed(0), 10) + pad(mean(rs.map(r => r.landed)).toFixed(1), 8) + pad(mean(rs.map(r => r.thin)).toFixed(1), 6)
    + pad(mean(rs.map(r => r.quiet)).toFixed(1), 7) + pad(mean(rs.map(r => r.cat)).toFixed(1), 5) + pad(mean(rs.map(r => r.commitment)).toFixed(0), 8)
    + pad(mean(rs.map(r => r.cooled)).toFixed(0), 8) + path);
}
// The per-rung turnout curve for a fresh floor: what does each rung project on month 1?
const inf = generateInfluence(ACT1_WORKERS_SEED), w0 = makeContractWorkers();
console.log('\nMonth-1 projected turnout by rung (fresh floor, 2-person CAT):', ACTION_LADDER.map(t => `${t.key} ${(projectedTurnout(w0, inf, t)).toFixed(1)}/${w0.length} (needs ${Math.round(t.threshold * w0.length)})`).join(' | '));
