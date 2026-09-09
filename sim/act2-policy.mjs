// A competent Act Two player. Decides only on what the UI shows.
import * as C from './core2.mjs';
import { responseCostFor, fileEligible } from './act2-engine.mjs';
const { BLOCS, DEMANDS, DEMAND_BY_ID, LOC_COMPOSITION, PLATFORM_SLOTS, DEFECT_THRESHOLD, blocSatisfaction,
  COMMITTEE_MORALE_REQ, COMMITTEE_RECRUIT_PCT_REQ, TOTAL_TURNS } = C;

const TIERS = [6, 4, 2, 1, 0];

// Site preference: sympathetic manager first, hostile last, bigger units break ties.
export function rankSites(locs) {
  const score = (l) => (l.manager === 'sympathetic' ? 2 : l.manager === 'neutral' ? 1 : 0) * 100 + l.workers;
  return [...locs].sort((a, b) => score(b) - score(a));
}

// Choose a platform on what the player can see: known priorities count, unknown ones
// are assumed at the function's own fallback (no top, intensity 2).
export function choosePlatform(priorities, mode = 'optimize', proven = [], keepWithinOneOf = null) {
  if (mode === 'safe') return ['justcause', 'grievance', 'crunchcap'];
  const belief = Object.fromEntries(BLOCS.map(b => {
    const pr = priorities[b.id];
    return [b.id, pr.known ? pr : { top: null, intensity: 2, pledged: pr.pledged, heard: pr.heard }];
  }));
  if (mode === 'cheat') Object.assign(belief, priorities);
  const ids = DEMANDS.map(d => d.id);
  let best = null, bestScore = -Infinity;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = j + 1; k < ids.length; k++) {
    const p = [ids[i], ids[j], ids[k]];
    // A revision bought by a survey is worth exactly one change of mind.
    if (keepWithinOneOf && p.filter(x => !keepWithinOneOf.includes(x)).length > 1) continue;
    const sats = BLOCS.map(b => blocSatisfaction(b.id, p, belief, proven));
    const min = Math.min(...sats), sum = sats.reduce((a, b) => a + b, 0);
    const score = min * 10 + sum;   // lexicographic-ish: lift the floor first
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best;
}

// opts: focus (how many sites to work at once), fileMode ('now' | 'committee'),
// platformMode, bargain (spend 2 to listen before filing), leaders
export function planTurn(G, opts = {}) {
  const focus = opts.focus ?? 2;
  const organizing = G.locations.filter(l => l.status === 'organizing');
  const campaigns = G.locations.filter(l => l.status === 'campaign');
  const ranked = rankSites(organizing);
  const resp = {}, alloc = {};
  // Shops at the vote take their upkeep before anything is planned, and so does a survey.
  const wantSurvey = !!opts.survey && !G.surveyDone && G.turn >= (opts.surveyTurn ?? 3);
  let left = G.budget - campaigns.length * C.ACT2_CAMPAIGN_UPKEEP - (wantSurvey ? C.ACT2_SURVEY_COST : 0);

  // 1. Responses at every organizing site, most valuable first.
  organizing.forEach(l => {
    const r = {};
    const cost = (rr) => responseCostFor(l, rr);
    const tryAdd = (key) => { const trial = { ...r, [key]: true }; if (cost(trial) <= left) Object.assign(r, trial); };
    if (l.grievance && l.grievance.type !== 'noise' && !(l.committee?.active && l.grievance.type !== 'legal')) tryAdd('grievance');
    if (l.antiUnion?.active) tryAdd('counter');
    if (l.buyOff?.active) tryAdd('reframe');
    const committeeEligible = !l.committee?.active && l.morale >= COMMITTEE_MORALE_REQ && l.recruited / l.workers >= COMMITTEE_RECRUIT_PCT_REQ;
    if (committeeEligible && !opts.noCommittee) tryAdd('formCommittee');
    if (opts.bargain) {
      const comp = LOC_COMPOSITION[l.id] || {};
      const thick = BLOCS.find(b => (comp[b.id] || 0) >= 0.5 && !G.priorities[b.id]?.known);
      if (thick && G.platform.length === 0) tryAdd('bargain');
    }
    if (l.visibility >= 40 && l.visibility < 60 && opts.document) tryAdd('document');
    resp[l.id] = r;
    left -= cost(r);
  });

  // 2. A campaign site with no committee builds one first: it is the only response that
  //    still means anything once the petition is in, and it is what makes the count real.
  campaigns.forEach(l => {
    const r = {};
    const eligible = !l.committee?.active && l.morale >= COMMITTEE_MORALE_REQ && l.recruited / l.workers >= COMMITTEE_RECRUIT_PCT_REQ;
    if (eligible && !opts.noCommittee && responseCostFor(l, { formCommittee: true }) <= left) {
      r.formCommittee = true; left -= responseCostFor(l, r);
    }
    // Keeping the paper trail while the ballot is pending: one action, and it more than
    // halves what a crackdown costs you in fear.
    if (opts.document && !l.documented && left >= 1) { r.document = true; left -= 1; }
    resp[l.id] = r;
  });

  // 3. Campaign sites get worked hard: they're the only thing that can still win.
  campaigns.forEach(l => {
    const want = campaigns.length === 1 ? 6 : 4;
    const u = TIERS.find(t => t <= Math.min(want, left)) ?? 0;
    alloc[l.id] = u; left -= u;
  });

  // 4. Focus sites, in preference order.
  const targets = ranked.slice(0, focus);
  targets.forEach((l, i) => {
    const share = Math.floor(left / (targets.length - i));
    const u = TIERS.find(t => t <= share) ?? 0;
    alloc[l.id] = u; left -= u;
  });
  // 5. Anything left trickles to the next site so momentum doesn't rot there.
  ranked.slice(focus).forEach(l => { const u = TIERS.find(t => t <= left) ?? 0; alloc[l.id] = u; left -= u; });
  return { alloc, resp, wantSurvey };
}

// Between turns: which sites to file, and what platform to adopt.
export function decideFiling(G, opts = {}) {
  const lastFileTurn = C.ACT2_LAST_FILING_TURN;
  const eligible = G.locations.filter(l => fileEligible(l, G.turn));
  const wantsCommittee = (opts.fileMode ?? 'now') === 'committee';
  return eligible.filter(l => !wantsCommittee || l.committee?.active || G.turn >= lastFileTurn - (opts.committeeSlack ?? 1)).map(l => l.id);
}
