// Pull Act Two's pure math out of App.jsx into core2.mjs, the same way extract.mjs does
// for Act One, so the headless Act Two cannot drift from the shipped numbers.
import fs from 'fs';
const src = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

function block(marker, until) {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('missing: ' + marker);
  const j = src.indexOf(until, i);
  if (j < 0) throw new Error('missing end for: ' + marker + ' -> ' + until);
  return src.slice(i, j);
}

let out = [
  block('const TOTAL_TURNS = ', '// Act Two\'s network map board'),
  block('function computeSolidarityScore', 'const statusMeta = {'),
  block('const ACT2_SITES_NEEDED', '// ---------- SUBCOMPONENTS'),
].join('\n\n');

// GRIEVANCE_META carries lucide icon components; the sim has no use for them.
out = out.replace(/icon: [A-Za-z]+, /g, '');

out += `
export { TOTAL_TURNS, START_LOCATIONS, COMMITTEE_COST, COMMITTEE_MORALE_REQ, COMMITTEE_RECRUIT_PCT_REQ,
  COMMITTEE_COST_CAMPAIGN, ACT2_LOSS_MORALE, ACT2_LOSS_TRUE, ACT2_LOSS_FEAR, ACT2_LOSS_STAMINA,
  ACT2_EMBOLDENED_RETALIATION, ACT2_CAMPAIGN_UPKEEP,
  GRIEVANCE_META, EXTERNAL_EVENTS, ACT2_EFFORT_TIERS, ACT2_CAMPAIGN_TIERS, clamp, rand,
  BLOCS, BLOC_BY_ID, LOC_COMPOSITION, DEMANDS, DEMAND_BY_ID, PLATFORM_SLOTS, DEFECT_THRESHOLD,
  rollBlocPriorities, blocSatisfaction, locBlocFactor, computeSolidarityScore, baseGain, baseVis,
  ACT2_SITES_NEEDED, ACT2_FILING_LEAD, ACT2_LAST_FILING_TURN, ACT2_BASE_ACTIONS, filingGates, act2Winnability,
  ACT2_BALLOT_PIVOT, ACT2_BALLOT_SPAN, ACT2_BALLOT_SPREAD, ACT2_FEAR_TURNOUT,
  act2Standings, act2YesChance, act2TurnoutChance, act2Ballot, act2Projection, act2WinChance, act2CastBallot };
`;
fs.writeFileSync(new URL('core2.mjs', import.meta.url), out);
console.log('core2.mjs written,', out.split('\n').length, 'lines');
