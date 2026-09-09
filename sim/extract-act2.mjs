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
  ACT2_SITES_NEEDED, ACT2_FILING_LEAD, ACT2_LAST_FILING_TURN, ACT2_BASE_ACTIONS, ACT2_STAMINA_POOL, filingGates, act2Winnability,
  ACT2_BALLOT_PIVOT, ACT2_BALLOT_SPAN, ACT2_BALLOT_SPREAD, ACT2_FEAR_TURNOUT,
  act2Standings, act2YesChance, act2TurnoutChance, act2Ballot, act2Projection, act2WinChance, act2CastBallot,
  CONTRACT_PROVES, PROVEN_BONUS, provenDemands, CONTRACT_HEADSTART, contractHeadstart, ACT2_SURVEY_COST, SURVEY_STRONG, SURVEY_WEAK, surveyResponse,
  SURVEY_TRUE_GAIN, SURVEY_MORALE_GAIN, SURVEY_DEAD_MORALE,
  ACT2_FILING_VISIBILITY, ACT2_CAMPAIGN_RETALIATION, ACT2_CAMPAIGN_CRACKDOWN_CAP, ACT2_CAMPAIGN_HIT_SCALE, ACT2_RETALIATION_FEAR, ACT2_DOCUMENT_SHIELD, ACT2_DOCUMENT_DETERRENCE,
  ACT2_MAX_PLEDGES,
  ACT2_ROSTER_ROLES, ACT2_ROSTER_SPREAD, ACT2_BLOC_TILT, ACT2_DEFECTED_TILT, ACT2_ROSTER_BAND,
  makeAct2Rosters, act2Standing, act2Read,
  ACT2_ONE_ON_ONES_PER_TURN, ACT2_SITDOWN_COST, ACT2_LEADER_PULL, ACT2_SITDOWN_LIFT, ACT2_REFERRALS,
  rollPull, metLeaders, committeeWeight, ACT2_SITDOWN_MORALE, ACT2_SITDOWN_SUPPORT };
`;
fs.writeFileSync(new URL('core2.mjs', import.meta.url), out);
console.log('core2.mjs written,', out.split('\n').length, 'lines');
