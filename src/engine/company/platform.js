// Blocs, the demand platform, the survey, and what a signed contract proves.
import { clamp, rand } from "../rng.js";


// ---------- BLOCS AND THE DEMAND PLATFORM ----------
// You cannot make everyone happy. Winning recognition is a unifying fight — everybody
// wants A union. Deciding what the union will ASK FOR is where a shop fractures, because
// bargaining capital is finite and every demand you win trades against one you didn't.
//
// The blocs deliberately CROSS-CUT the org chart. If they were just departments the
// problem would be one-dimensional and solvable with arithmetic. Because status and
// tenure run at right angles to each other, a platform that splits salaried from
// contract may unite QA across tenure — and navigating that is the actual game.
const BLOCS = [
  { id: "salaried", axis: "status", label: "SALARIED", hex: "#38bdf8", blurb: "On staff, on payroll, on the org chart." },
  { id: "contract", axis: "status", label: "CONTRACT", hex: "#fb7185", blurb: "Renewed every six months. The industry's actual two-tier." },
  { id: "veteran",  axis: "tenure", label: "VETERANS", hex: "#fbbf24", blurb: "Been here through two acquisitions. Remember what was lost." },
  { id: "new",      axis: "tenure", label: "NEW HIRES", hex: "#a3e635", blurb: "Under two years. Cheapest to cut, least to fall back on." },
];
const BLOC_BY_ID = Object.fromEntries(BLOCS.map(b => [b.id, b]));

// Every shop is a different mix, so the same platform lands differently across the map.
const LOC_COMPOSITION = {
  downtown:   { salaried: 0.85, contract: 0.15, veteran: 0.60, new: 0.40 },
  suburban:   { salaried: 0.25, contract: 0.75, veteran: 0.30, new: 0.70 },
  airport:    { salaried: 0.70, contract: 0.30, veteran: 0.55, new: 0.45 },
  university: { salaried: 0.45, contract: 0.55, veteran: 0.35, new: 0.65 },
};

// The pool. Two pairs are genuinely opposed — there is no compromise between them that
// isn't itself a position. The universals are safe and cheap and win you nothing.
const DEMANDS = [
  { id: "flatraise", label: "FLAT-DOLLAR RAISE", kind: "contested",
    desc: "The same number of dollars for everybody. Worth far more to the people earning least.",
    effect: { salaried: -1, contract: 4, veteran: -2, new: 3 }, opposes: "pctraise" },
  { id: "pctraise", label: "PERCENTAGE RAISE", kind: "contested",
    desc: "The same percentage for everybody. Worth far more to the people earning most.",
    effect: { salaried: 3, contract: -2, veteran: 4, new: -2 }, opposes: "flatraise" },
  { id: "conversion", label: "CONTRACTOR CONVERSION", kind: "contested",
    desc: "A path from contract to staff after eighteen months. Enormous for QA. Veterans read it as eating the raise pool.",
    effect: { salaried: -1, contract: 5, veteran: -2, new: 2 }, opposes: "seniority" },
  { id: "seniority", label: "SENIORITY IN LAYOFFS", kind: "contested",
    desc: "Last in, first out. The oldest protection in the book, and it is paid for by the newest people.",
    effect: { salaried: 1, contract: -2, veteran: 4, new: -3 }, opposes: "conversion" },
  { id: "crunchcap", label: "CRUNCH LIMITS + PAID OT", kind: "broad",
    desc: "Hard caps on mandatory overtime, and money when it happens anyway.",
    effect: { salaried: 1, contract: 3, veteran: 0, new: 3 } },
  { id: "aiclause", label: "PLAY-EYE LANGUAGE", kind: "broad",
    desc: "No automated override of credited work without notice and a human review.",
    effect: { salaried: 3, contract: 0, veteran: 2, new: 0 } },
  { id: "justcause", label: "JUST CAUSE", kind: "universal",
    desc: "No firing without a reason a human being has to say out loud. Nobody objects. Nobody is thrilled.",
    effect: { salaried: 1, contract: 1, veteran: 1, new: 1 } },
  { id: "grievance", label: "GRIEVANCE PROCEDURE", kind: "universal",
    desc: "A written process for complaints. Costs the company almost nothing, which is why it's cheap to win.",
    effect: { salaried: 1, contract: 1, veteran: 1, new: 1 } },
];
const DEMAND_BY_ID = Object.fromEntries(DEMANDS.map(d => [d.id, d]));
const PLATFORM_SLOTS = 3;

// ---------- HIDDEN INTENSITY ----------
// You know QA wants conversion. You do not know how hard they will fight for it, and
// that is what decides whether ignoring them costs you a grumble or the whole bloc.
// Exposable the same way affinities are: spend time listening.
const DEFECT_THRESHOLD = 35;

// ---------- A DEMAND YOU HAVE ALREADY WON ----------
// The company campaign's intro promises that a contract is a document other people can
// point at. This is where that stops being a line and starts being arithmetic. Language
// you got signed at the first shop is not a promise any more — there is a contract with
// it in, and the people at the next shop can read it. Only a RATIFIED contract counts: a
// year of bargaining with nothing signed proves nothing, which is the whole of Act Two.
const CONTRACT_PROVES = {
  wages: ["flatraise", "pctraise"],
  justcause: ["justcause"],
  ai: ["aiclause"],
};
// Worth about one point of a bloc's intensity. A campaign that skipped the contract act,
// or bargained a year and signed nothing, gets none of this — which is the difference
// between having a union and having won something with it.
const PROVEN_BONUS = 8;
// And the contract is worth something before anybody writes a platform at all. Four
// studios under the same parent read the thing the week it was posted, and they started
// this campaign from a different place than they would have. Only a signed one: a year
// of bargaining with nothing to show for it is what the other shops are afraid of.
const CONTRACT_HEADSTART = 1.5;
function contractHeadstart(contract) {
  return contract && contract.ratified ? Math.round(CONTRACT_HEADSTART * (contract.tiers || 0)) : 0;
}
function provenDemands(contract) {
  if (!contract || !contract.ratified || !Array.isArray(contract.issues)) return [];
  return contract.issues.filter(i => i.tier >= 1).flatMap(i => CONTRACT_PROVES[i.id] || []);
}

// ---------- THE BARGAINING SURVEY ----------
// McAlevey's survey is not a questionnaire, it is a structure test: the response rate is
// the measurement, and it measures whether there is anybody to hand the thing to. A shop
// with a committee has somebody who will put it in your hand and wait. A shop without one
// has a link in an email from a stranger.
const ACT2_SURVEY_COST = 3;
const SURVEY_STRONG = 0.6;
const SURVEY_WEAK = 0.35;
// A survey is not a questionnaire, it is an excuse to have a conversation with every
// worker in the company in the same fortnight. When it lands, that is what it is worth;
// when it dies, everybody was still asked, and nothing came of it.
const SURVEY_TRUE_GAIN = 4;
const SURVEY_MORALE_GAIN = 3;
const SURVEY_DEAD_MORALE = 3;
function surveyResponse(locations) {
  const live = locations.filter(l => l.status === "organizing" || l.status === "campaign");
  let returned = 0, total = 0;
  live.forEach(l => {
    const ts = l.trueSupport ?? l.morale;
    const share = (l.committee?.active ? clamp(50 + 0.44 * ts, 0, 92) : clamp(12 + 0.30 * ts, 0, 92)) / 100;
    returned += l.workers * share;
    total += l.workers;
  });
  return { returned: Math.round(returned), total, rate: total ? returned / total : 0 };
}
// "We'll get you next time" is worth something said to one group and nothing said to
// four. One pledge a campaign, so it stays a choice about who you are willing to owe
// rather than a button that dissolves the whole trade-off.
const ACT2_MAX_PLEDGES = 1;
function rollBlocPriorities() {
  const pools = {
    salaried: ["aiclause", "pctraise", "justcause"],
    contract: ["conversion", "flatraise", "crunchcap"],
    veteran: ["seniority", "pctraise", "aiclause"],
    new: ["crunchcap", "flatraise", "conversion"],
  };
  const out = {};
  BLOCS.forEach(b => {
    const pool = pools[b.id];
    out[b.id] = { top: pool[rand(pool.length)], intensity: 1 + rand(3), known: false, pledged: false, defected: false, heard: 0 };
  });
  return out;
}

// Satisfaction is what the platform does TO a bloc, plus whether you served the thing
// they actually cared about most. A solidarity pledge softens the miss without buying
// enthusiasm — you promised them next time, and they have heard that before.
// The starting point is deliberately BELOW the 50 line where the company can come to a
// bloc with a side offer. A platform is not a gift you hand out; it is bargaining capital
// you are spending, and a shop you have said nothing to is a shop somebody else can talk
// to. Three universals that offend nobody used to keep all four blocs safe in every
// single priority roll, which made the whole screen a formality — the safe pick was
// always available and always right, so there was no trade to make.
//
// At 42, with the served/unserved swing at 10 points per point of intensity, a platform
// that keeps everybody out of side-offer range exists in about two thirds of rolls, and
// finding it usually means knowing what somebody actually wants. That is the listening.
function blocSatisfaction(blocId, platform, priorities, proven = []) {
  const pr = priorities[blocId] || { intensity: 2, top: null, pledged: false };
  let score = 42;
  platform.forEach(id => {
    const d = DEMAND_BY_ID[id];
    if (d) score += (d.effect[blocId] || 0) * 6;
    // Somebody else already has this in writing. That is worth more than the asking.
    if (proven.includes(id)) score += PROVEN_BONUS;
  });
  const served = pr.top && platform.includes(pr.top);
  if (served) score += pr.intensity * 10;
  else score -= pr.intensity * 10 * (pr.pledged ? 0.45 : 1);
  if (pr.heard) score += Math.min(8, pr.heard * 5); // being listened to counts for something
  return clamp(Math.round(score));
}

// How the platform lands at one specific shop, given who works there. A defected bloc
// contributes nothing and drags: they aren't neutral, they're campaigning against you.
function locBlocFactor(loc, platform, priorities, proven = []) {
  const comp = LOC_COMPOSITION[loc.id];
  if (!comp || !platform.length) return 1;
  let total = 0, weight = 0;
  BLOCS.forEach(b => {
    const share = comp[b.id] || 0;
    if (share <= 0) return;
    const pr = priorities[b.id];
    const sat = pr?.defected ? 0 : blocSatisfaction(b.id, platform, priorities, proven);
    // 0 satisfaction -> 0.70x turnout, 50 -> 1.00x, 100 -> 1.30x. Deliberately gentle:
    // the platform should tilt an election, not decide it on its own.
    total += share * (0.7 + 0.6 * (sat / 100));
    weight += share;
  });
  return clamp(weight ? total / weight : 1, 0.55, 1.3);
}

export { BLOCS, BLOC_BY_ID, LOC_COMPOSITION, DEMANDS, DEMAND_BY_ID, PLATFORM_SLOTS, DEFECT_THRESHOLD, CONTRACT_PROVES, PROVEN_BONUS, CONTRACT_HEADSTART, contractHeadstart, provenDemands, ACT2_SURVEY_COST, SURVEY_STRONG, SURVEY_WEAK, SURVEY_TRUE_GAIN, SURVEY_MORALE_GAIN, SURVEY_DEAD_MORALE, surveyResponse, ACT2_MAX_PLEDGES, rollBlocPriorities, blocSatisfaction, locBlocFactor };
