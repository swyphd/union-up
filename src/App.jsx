import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, Eye, Zap, Scale, Vote, X, CheckCircle2, FileWarning, Wrench, MessageCircle, Radio, Megaphone, HandCoins, UsersRound, Brain } from "lucide-react";

// ---------- FONTS / GLOBAL STYLE ----------
const GlobalStyle = () => (
  <style>{`
    .font-stencil { font-family: Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif; letter-spacing: 0.02em; }
    .font-mono { font-family: 'Courier New', ui-monospace, Menlo, Consolas, monospace; }
    .card-perf {
      background-image: radial-gradient(circle, rgba(237,232,220,0.05) 1px, transparent 1px);
      background-size: 14px 14px;
      background-position: 0 0;
    }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .anim-rise { animation: rise 0.35s ease-out; }
    @keyframes deltafloat { 0% { opacity: 0; transform: translateY(2.5px); } 35% { opacity: 1; } 100% { opacity: 1; transform: translateY(0); } }
    .delta-float { animation: deltafloat 0.9s ease-out forwards; }
    @keyframes ringflash { 0% { opacity: 0; stroke-width: 0.2; } 40% { opacity: 1; stroke-width: 1.6; } 100% { opacity: 0.55; stroke-width: 0.6; } }
    .ring-flash { animation: ringflash 1.1s ease-out forwards; }
    @keyframes edgepulse { 0% { stroke-dashoffset: 20; opacity: 0; } 25% { opacity: 1; } 85% { opacity: 0.9; } 100% { stroke-dashoffset: 0; opacity: 0.25; } }
    .edge-pulse { stroke-dasharray: 20; animation: edgepulse 1.3s ease-out forwards; }
    @keyframes leaderpulse { 0%, 100% { stroke-opacity: 0.25; } 50% { stroke-opacity: 0.9; } }
    .leader-pulse { animation: leaderpulse 2.4s ease-in-out infinite; }
    @keyframes notefloat { 0% { opacity: 0; transform: translateY(2px); } 14% { opacity: 1; transform: translateY(0); } 78% { opacity: 1; } 100% { opacity: 0; } }
    .note-float { animation: notefloat 2.6s ease-in-out forwards; }
  `}</style>
);

// ---------- CONSTANTS ----------
const TOTAL_TURNS = 12;
// Filing at turn T puts the vote at T + ACT2_FILING_LEAD. One constant for the filing
// itself, the unwinnable check and the copy, so they cannot drift apart again.
// Act Three runs on MONTHS, not weeks. Four studios from cold to certified inside twelve
// weeks was never credible, and the other two acts are already honest about their
// calendars — twenty-six weeks for one shop, a twelve-month certification year.
//
// The five-month lead stays. Cutting it to two, as first planned, reads better on paper
// and plays much worse: it turns the stretch between the petition and the ballot from a
// phase you fight — driving fear down, answering the captive-audience meetings, getting
// a committee built under pressure — into a formality you file into and hope. Measured,
// it took election odds from 53-82% down to 33-47% and made a single shop the dominant
// strategy. Five months is also the truer number: a contested petition means hearings,
// unit-scope challenges and an employer with every reason to take its time.
const ACT2_FILING_LEAD = 5;
const ACT2_LAST_FILING_TURN = TOTAL_TURNS - ACT2_FILING_LEAD;
// The organizer's week. Every leader who came up from Act One adds one action to it.
const ACT2_BASE_ACTIONS = 10;
// The organizer's own reserve. It only ever moved for a player carrying three or four
// shops at once, so a focused campaign never saw the meter do anything; this is set low
// enough that a heavy week costs something whatever the shape of the campaign.
const ACT2_STAMINA_POOL = 100;
const START_LOCATIONS = [
  { id: "downtown", name: "CORE STUDIO", workers: 12, manager: "hostile", morale: 40, trueSupport: 32, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
  { id: "suburban", name: "QA DIVISION", workers: 10, manager: "sympathetic", morale: 40, trueSupport: 34, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
  { id: "airport", name: "PUBLISHING WING", workers: 9, manager: "neutral", morale: 40, trueSupport: 33, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
  { id: "university", name: "REMOTE TEAM", workers: 8, manager: "neutral", morale: 40, trueSupport: 33, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
];

const COMMITTEE_COST = 2;
// Building one after the petition is filed, under the employer's campaign and a clock,
// costs nearly twice as much. You would always rather have done it first.
const COMMITTEE_COST_CAMPAIGN = 5;
const COMMITTEE_MORALE_REQ = 55;
// Lined up with the petition's own recruitment gate. A shop that has recruited enough
// people to file has recruited enough people to have a committee, so the committee is
// never the thing that is arithmetically out of reach.
const COMMITTEE_RECRUIT_PCT_REQ = 0.3;

// ---------- WHAT A LOST ELECTION COSTS ----------
// Bronfenbrenner's finding, as arithmetic: a defeat is not a local event. Every shop
// still organizing watches it, and what they learn is that the company can win. Under
// the NLRB's election bar the unit that lost cannot vote again for a year, which in
// this campaign's calendar means never — so the shop is simply gone.
const ACT2_LOSS_MORALE = 20;
const ACT2_LOSS_TRUE = 16;
// The one that bites, now that fear decides turnout: people who watched a shop lose
// are markedly less willing to be seen voting.
const ACT2_LOSS_FEAR = 16;
// And it lands on the organizer. This is the first thing in the act that ever spends
// real stamina, and it spends more of it the more shops you had in the air.
const ACT2_LOSS_STAMINA = 22;
// A company that has beaten you once reaches for the same tools sooner everywhere else.
const ACT2_EMBOLDENED_RETALIATION = 15;

// ---------- A PETITION IS NOT FREE ----------
// The weeks between filing and the ballot are not weeks off. There are hearings, a unit
// to argue over, an Excelsior list to check, and a mandatory meeting every week that
// somebody has to answer. That comes off the top of the organizer's week whether they
// like it or not, which is the real reason you cannot run four elections at once:
// spreading thin is not punished by a rule, it is punished by the calendar.
// What binds is the MONTHLY budget: two petitions at once has to be a stretch rather
// than the whole calendar.
const ACT2_CAMPAIGN_UPKEEP = 2;

// ---------- A PETITION IS A PUBLIC DOCUMENT WITH YOUR NAME ON IT ----------
// Filing does not lower your profile, it raises it, and the weeks between the petition
// and the ballot are exactly when an employer's lawyers earn their fee. Before this,
// retaliation could not touch a shop at the vote at all — which meant the single most
// dangerous stretch of a real campaign was the safest stretch of this one.
const ACT2_FILING_VISIBILITY = 62;
// An employer's campaign has two or three sharp moments in it, not a firing a week, so
// a shop at the vote is exposed but not hunted: a much lower roll than an organizing
// shop that has drawn attention, and a hard cap on how often they will go this far.
const ACT2_CAMPAIGN_RETALIATION = 14;
const ACT2_CAMPAIGN_CRACKDOWN_CAP = 2;
// What a crackdown does at the vote is frighten people, not argue with them. The
// weekly counter-campaign is already eating support; this is the thing that decides who
// walks past the ballot box, so most of it lands on fear and only a third on the count.
const ACT2_CAMPAIGN_HIT_SCALE = 0.35;
// And what a crackdown costs a shop at the vote is fear, which is the thing that decides
// who turns out. Documenting it does not stop it happening; it stops it working, because
// a floor that can see the union writing it all down is a floor that is less frightened.
const ACT2_RETALIATION_FEAR = 0.6;
const ACT2_DOCUMENT_SHIELD = 0.35;
// A paper trail deters as well as softens. Lawyers who can see that every date, name and
// room is being written down price the next move differently, so a documented shop gets
// moved on half as often — which is what makes the action worth an hour even in the
// months when nothing happens.
const ACT2_DOCUMENT_DETERRENCE = 0.5;

const GRIEVANCE_META = {
  legal: { label: "Misclassification", action: "File an exempt-status complaint", cost: 2, icon: FileWarning, tone: "text-red-400 border-red-800", desc: "PerfAxis flags after-hours Slack activity as 'low engagement' — but those are unpaid hours on an exempt salary. Clear-cut FLSA violation. Legal will stall, but it's on record." },
  material: { label: "Unrenewed licenses", action: "Escalate to management", cost: 1, icon: Wrench, tone: "text-amber-400 border-amber-800", desc: "Key software licenses weren't renewed after the last round of cuts. Workers are expected to do the same job with fewer tools." },
  noise: { label: "Difficult stakeholders", action: "Hear them out", cost: 1, icon: MessageCircle, tone: "text-stone-400 border-stone-700", desc: "Product is pushing for scope creep with no timeline adjustment. Real frustration, but venting about it doesn't build power." },
};

const EXTERNAL_EVENTS = [
  {
    id: "solidarity_wave",
    tone: "positive",
    headline: "NATIONAL NEWS: Workers at a major game studio vote to unionize in a closely watched campaign. Developers everywhere are talking about it.",
    moraleClimate: { tone: "positive", turnsLeft: 2 },
    immediateOrganizingMorale: 6,
    immediateCampaignFear: -10,
  },
  {
    id: "setback_news",
    tone: "negative",
    headline: "NATIONAL NEWS: A high-profile organizing drive at a tech company collapses when the company announces it's shifting work to contractors. The story is everywhere.",
    moraleClimate: { tone: "negative", turnsLeft: 2 },
    immediateOrganizingMorale: -6,
    immediateCampaignFear: 10,
  },
  {
    id: "cost_of_living",
    tone: "mixed",
    headline: "NATIONAL NEWS: A new report on rents and grocery prices dominates the news. Workers are angrier — and more anxious about their paychecks.",
    moraleClimate: { tone: "volatile", turnsLeft: 2 },
    immediateOrganizingMorale: 8,
    immediateCampaignFear: 5,
  },
  {
    id: "pr_blitz",
    tone: "negative",
    headline: "NATIONAL NEWS: The studio's parent company publishes a blog post on 'employee ownership culture' and the risks of 'third-party representation.' It's being forwarded around Slack.",
    seedAntiUnion: true,
    immediateCampaignFear: 8,
  },
  {
    id: "algo_exposed",
    tone: "positive",
    headline: "NATIONAL NEWS: An exposé on AI stack-ranking tools used in tech layoffs goes viral — workers everywhere recognize their own performance reviews in the screenshots.",
    moraleClimate: { tone: "positive", turnsLeft: 2 },
    immediateOrganizingMorale: 7,
    immediateCampaignFear: -8,
  },
  {
    id: "reg_favorable",
    tone: "positive",
    headline: "NATIONAL NEWS: A new pro-labor ruling makes it easier to prove unfair labor practices nationwide.",
    legalClimate: { tone: "favorable", turnsLeft: 3 },
    immediateLegalRiskAll: -15,
  },
  {
    id: "reg_hostile",
    tone: "negative",
    headline: "NATIONAL NEWS: A rollback of federal labor protections emboldens employers to push back harder on organizing.",
    legalClimate: { tone: "hostile", turnsLeft: 3 },
    immediateLegalRiskAll: 10,
  },
];

const ACT2_EFFORT_TIERS = [
  { units: 0, label: "Hold back this month", cost: 0, desc: "Let this site rest — no organizer time spent here. Counts toward recovering stamina." },
  { units: 1, label: "Check in briefly", cost: 1, desc: "A quick pulse-check with a few workers." },
  { units: 2, label: "Have real conversations", cost: 2, desc: "Time on the floor with whoever is around, building trust and momentum." },
  { units: 4, label: "Run a full organizing push", cost: 4, desc: "A serious block of organizer time here this month." },
  { units: 6, label: "Go all-in here", cost: 6, desc: "Everything the organizer can give to this site this month." },
];

const ACT2_CAMPAIGN_TIERS = [
  { units: 0, label: "Hold back this month", cost: 0, desc: "Skip it — fear creeps up and morale slips on its own." },
  { units: 1, label: "Light presence", cost: 1, desc: "A quick show of support against the employer's counter-campaign." },
  { units: 2, label: "Active campaigning", cost: 2, desc: "Real pushback against management's messaging." },
  { units: 4, label: "Full doorknock push", cost: 4, desc: "A serious month of countering the counter-campaign." },
  { units: 6, label: "All-in for the vote", cost: 6, desc: "Everything the organizer has, fighting for this election." },
];

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const rand = (n) => Math.floor(Math.random() * n);

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

// ---------- THE ROSTER ----------
// Act Three's shops stop being a headcount with a mood attached. Every ballot the game
// rolls is a named person with a status and a tenure, and that is where the bloc layer
// finally lives: not a composition table applied to an average, but Dario on the QA
// floor, on contract, eighteen months in, whom your platform says nothing to.
//
// They are a floor you READ, not a floor you work one at a time. That is the whole
// difference between this act and Act One, and it is this act's own premise — you are
// not in the room any more. What organizing moves here is the shop; who it lands on,
// and who turns up on the day, is these people.
const ACT2_NAMES = [
  "Yusuf", "Nadia", "Bea", "Cormac", "Imani", "Rafa", "Sunny", "Teodora", "Kwame", "Lila",
  "Anders", "Petra", "Hoang", "Marguerite", "Dario", "Elke", "Nnamdi", "Saoirse", "Vikram", "Odile",
  "Bram", "Chiara", "Tobias", "Amara", "Jonty", "Ilse", "Rasheed", "Freya", "Milo", "Zainab",
  "Costas", "Winnie", "Halvard", "Perpetua", "Sami", "Greta", "Obi", "Lourdes", "Ewan", "Ingrid",
  "Kofi", "Solveig", "Bastien", "Neve",
];
const ACT2_ROSTER_ROLES = {
  downtown: ["gameplay engineer", "environment artist", "level designer", "producer", "technical artist",
    "animator", "systems designer", "build engineer", "UI artist", "narrative designer", "combat designer", "engine programmer"],
  suburban: ["QA analyst", "test lead", "automation engineer", "compliance tester", "localisation QA",
    "release tester", "bug triage", "playtest coordinator", "certification tester", "QA analyst"],
  airport: ["community manager", "copywriter", "brand designer", "video editor", "marketing analyst",
    "social lead", "PR coordinator", "storefront producer", "trailer editor"],
  university: ["remote gameplay engineer", "contract animator", "remote QA", "concept artist",
    "audio designer", "tools engineer", "remote producer", "technical writer"],
};
// How far apart the people in one shop are. The same spread the synthesised ballot used,
// only now it belongs to somebody instead of to an index.
const ACT2_ROSTER_SPREAD = 18;
// And how much of a bloc's satisfaction each of its members carries personally. Kept
// small on purpose: the platform already decides turnout at the site level, so this is
// here to make the trade VISIBLE on a person rather than to charge for it twice.
const ACT2_BLOC_TILT = 0.2;
const ACT2_DEFECTED_TILT = -20;
// Without a shop committee nobody is counting honestly, so a person is a range rather
// than a number — the same rule the site's own true support already follows, made
// concrete on the people it is actually about.
const ACT2_ROSTER_BAND = 20;

// ---------- ONE-ON-ONES ----------
// The organizer has four sites and one calendar, so a one-on-one is not how you work
// the floor here — there are 39 people and twelve months. It is how you find the two or
// three people the floor already follows, so that THEY can work the floor. That is the
// whole argument for a committee, and it is why the cap is campaign-wide and brutal.
const ACT2_ONE_ON_ONES_PER_TURN = 2;
const ACT2_SITDOWN_COST = 1;
// Social weight: how many people take their cue from this person. Deliberately drawn
// INDEPENDENTLY of how warm they are. The loudest supporter is very often not the
// leader, and a player who picks by visible enthusiasm is picking on the wrong axis.
const ACT2_LEADER_PULL = 55;
// Most people carry almost nobody; two or three in any shop carry everybody. Tuned so
// about a quarter of a floor can anchor a committee — rarer than that and twelve months
// is not enough calendar to find anyone, which stops being a lesson and starts being a
// wall.
function rollPull() {
  const r = Math.random();
  if (r < 0.52) return 10 + rand(26);   // most of the floor
  if (r < 0.74) return 36 + rand(19);   // well-liked, not followed
  return 55 + rand(41);                 // an organic leader
}
// Sitting down with somebody moves them, and moves the shop a little: an hour across a
// table is the highest-quality organizing conversation there is, and pretending it buys
// only information would be its own kind of lie. It is still small — one person out of
// twelve. The reason to do it is who it lets you find.
const ACT2_SITDOWN_LIFT = 6;
const ACT2_SITDOWN_MORALE = 2;
const ACT2_SITDOWN_SUPPORT = 2;
// How many names a person gives you when you ask the only question that matters:
// "who else should I be talking to?" Weighted by pull, so the network reports itself.
const ACT2_REFERRALS = 3;
function act2Read(loc, w, ctx = null) {
  const mid = act2Standing(loc, w, ctx);
  // A committee reports the whole floor honestly. Short of that, you know exactly the
  // people you have personally sat down with, and nobody else.
  if (loc.committee?.active || w.met) return { lo: mid, hi: mid, mid, exact: true };
  return { lo: clamp(mid - ACT2_ROSTER_BAND), hi: clamp(mid + ACT2_ROSTER_BAND), mid, exact: false };
}

// The people at this site you have sat down with who turned out to carry the floor.
// These are what a committee is made of; without them there is nobody to form one.
function metLeaders(loc) {
  return (loc.roster || []).filter(w => w.met && w.pull >= ACT2_LEADER_PULL);
}
// How much weight the committee actually has. A committee of the two people everybody
// follows is a different object from a committee of whoever put their hand up, and the
// game should not price them the same.
function committeeWeight(loc) {
  const led = metLeaders(loc);
  if (!led.length) return 0;
  return led.reduce((t, w) => t + w.pull, 0) / 100;
}

const shuffled = (a) => a.map(v => ({ v, k: Math.random() })).sort((x, y) => x.k - y.k).map(x => x.v);

function makeAct2Rosters() {
  const names = shuffled(ACT2_NAMES);
  let cursor = 0;
  const out = {};
  START_LOCATIONS.forEach(loc => {
    const comp = LOC_COMPOSITION[loc.id] || {};
    const roles = ACT2_ROSTER_ROLES[loc.id] || [];
    const n = loc.workers;
    const nContract = Math.round(n * (comp.contract || 0));
    const nNew = Math.round(n * (comp.new || 0));
    // Status and tenure are drawn independently so they cross-cut, which is the whole
    // reason the blocs are interesting: a shop can be three-quarters contract and still
    // split down the middle on how long people have been there.
    const statuses = shuffled(Array.from({ length: n }, (_, i) => (i < nContract ? "contract" : "salaried")));
    const tenures = shuffled(Array.from({ length: n }, (_, i) => (i < nNew ? "new" : "veteran")));
    const jitters = shuffled(Array.from({ length: n }, (_, i) =>
      Math.round(ACT2_ROSTER_SPREAD * (n === 1 ? 0 : (2 * i) / (n - 1) - 1))));
    const people = Array.from({ length: n }, (_, i) => ({
      id: `${loc.id}-${i}`,
      name: names[cursor++ % names.length],
      role: roles[i % roles.length],
      status: statuses[i],
      tenure: tenures[i],
      jitter: jitters[i],
      pull: rollPull(),
      met: false,
    }));
    // Who each person names when you ask who else to talk to. Drawn by pull, so
    // following referrals walks you up the social network and picking by enthusiasm
    // does not. This is the only view of the network the player ever gets.
    people.forEach(w => {
      const others = people.filter(o => o.id !== w.id);
      const picked = [];
      // Squared, not linear. Asking "who should I talk to?" is a question people answer
      // with the names that carry weight — that is what the question is FOR. A referral
      // is a leader about half the time; a cold pick, about one time in seven.
      const pool = others.map(o => ({ o, weight: (o.pull + 8) * (o.pull + 8) }));
      for (let k = 0; k < Math.min(ACT2_REFERRALS, pool.length); k++) {
        let total = pool.reduce((t, x) => t + (picked.includes(x.o.id) ? 0 : x.weight), 0);
        let roll = Math.random() * total;
        for (const x of pool) {
          if (picked.includes(x.o.id)) continue;
          roll -= x.weight;
          if (roll <= 0) { picked.push(x.o.id); break; }
        }
      }
      w.points = picked;
    });
    out[loc.id] = people;
  });
  return out;
}

// Where one person stands: the shop's number, their own distance from it, and what the
// platform says to the two blocs they happen to belong to.
function act2Standing(loc, w, ctx = null) {
  const base = loc.trueSupport ?? loc.morale;
  let tilt = 0;
  if (ctx && ctx.platform && ctx.platform.length >= PLATFORM_SLOTS && ctx.priorities) {
    const pr = ctx.priorities;
    if (pr[w.status]?.defected || pr[w.tenure]?.defected) tilt = ACT2_DEFECTED_TILT;
    else {
      const a = blocSatisfaction(w.status, ctx.platform, pr, ctx.proven || []);
      const b = blocSatisfaction(w.tenure, ctx.platform, pr, ctx.proven || []);
      tilt = ((a + b) / 2 - 50) * ACT2_BLOC_TILT;
    }
  }
  return clamp(Math.round(base + w.jitter + tilt));
}

// Act Two's network map board. Act One's floor uses its own, larger board.
const MAP_W = 160;
const MAP_H = 100;

const roll100 = () => rand(100) + 1;

// Resolution narrative lines almost always lead with "Name: ..." or "Name did X" —
// split them into notes that can float next to the person/site they're about, and a
// small leftover pile (national news, stamina, momentum) that isn't about anyone specific.
function splitLinesByEntity(lines, entities) {
  const noteById = {};
  const banner = [];
  (lines || []).forEach(line => {
    const match = entities.find(e => e.name && (line.startsWith(e.name + ":") || line.startsWith(e.name + " ") || line.startsWith(e.name + "'")));
    if (match) {
      const rest = line.slice(match.name.length).replace(/^:\s*/, "").trim();
      if (!noteById[match.id]) noteById[match.id] = rest;
    } else {
      banner.push(line);
    }
  });
  return { noteById, banner };
}
function truncateNote(str, n = 42) {
  if (!str) return str;
  return str.length > n ? str.slice(0, n - 1).trimEnd() + "…" : str;
}

function computeSolidarityScore(locs) {
  return locs.reduce((sum, l) => {
    if (l.status === "won") return sum + 2;
    if (l.status === "lost" || l.status === "abandoned") return sum;
    let pts = 0;
    if (l.morale >= 70) pts += 1;
    if (l.committee?.active) pts += 1;
    return sum + pts;
  }, 0);
}

function baseGain(units) {
  if (units <= 0) return -2;
  if (units === 1) return 4;
  if (units === 2) return 7;
  if (units === 3) return 10;
  if (units === 4) return 13;
  if (units === 5) return 15;
  return 17;
}
function baseVis(units) {
  if (units <= 0) return -2;
  if (units === 1) return 2;
  if (units === 2) return 4;
  if (units === 3) return 6;
  if (units === 4) return 8;
  if (units === 5) return 10;
  return 13;
}

const statusMeta = {
  organizing: { label: "ORGANIZING", color: "text-stone-300" },
  campaign: { label: "ELECTION CAMPAIGN", color: "text-red-400" },
  won: { label: "UNIONIZED", color: "text-teal-400" },
  lost: { label: "ELECTION LOST", color: "text-red-500" },
  abandoned: { label: "DEPRIORITIZED", color: "text-stone-500" },
};
const ACT2_STATUS_HEX = {
  organizing: "#d6d3d1",
  campaign: "#f87171",
  won: "#2dd4bf",
  lost: "#ef4444",
  abandoned: "#57534e",
};
// Fixed positions on the same 160x100 board Act One uses — same visual grammar, different zoom level.
const ACT2_LAYOUT = {
  downtown: { x: 44, y: 28 },
  suburban: { x: 116, y: 28 },
  airport: { x: 44, y: 74 },
  university: { x: 116, y: 74 },
};

function ActTwoGame({ recruitedLeaders = [], contract = null, onFullRestart }) {
  // Each leader who came up from Act One is another pair of hands: one more action a
  // week. (The old +15 stamina per leader was clamped back to 100 on the first decay.)
  const weeklyBudget = ACT2_BASE_ACTIONS + recruitedLeaders.length;
  // Deployment: where each leader (by index into recruitedLeaders) is stationed.
  // Their trait bonus only applies at that specific site now, not company-wide.
  const [leaderDeployment, setLeaderDeployment] = useState({});
  const [armedLeader, setArmedLeader] = useState(null);
  const deployedTraitsAt = (locId) => recruitedLeaders.filter((l, i) => leaderDeployment[i] === locId).map(l => l.trait);
  const locHasTrait = (locId, t) => deployedTraitsAt(locId).includes(t);
  const deployedLeaderAt = (locId) => {
    const i = recruitedLeaders.findIndex((l, idx) => leaderDeployment[idx] === locId);
    return i >= 0 ? recruitedLeaders[i] : null;
  };
  const deployedLeadersByLoc = Object.fromEntries(
    START_LOCATIONS.map(l => [l.id, deployedLeaderAt(l.id)]).filter(([, v]) => v)
  );
  function armLeader(idx) {
    setArmedLeader(a => (a === idx ? null : idx));
  }
  function deployArmedTo(locId) {
    if (armedLeader == null) return;
    setLeaderDeployment(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (next[k] === locId) delete next[k]; }); // one leader per site
      next[armedLeader] = locId;
      return next;
    });
    setArmedLeader(null);
  }
  function recallLeader(idx) {
    setLeaderDeployment(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    if (armedLeader === idx) setArmedLeader(null);
  }
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState("intro"); // intro, allocate, resolving, escalation, gameover-win, gameover-loss
  const headstart = contractHeadstart(contract);
  const [rosters] = useState(makeAct2Rosters);
  const [locations, setLocations] = useState(() => START_LOCATIONS.map(l => ({
    ...l,
    roster: rosters[l.id],
    trueSupport: clamp(l.trueSupport + headstart),
    morale: clamp(l.morale + Math.round(headstart / 2)),
  })));
  const [allocations, setAllocations] = useState({ downtown: 0, suburban: 0, airport: 0, university: 0 });
  const [responses, setResponses] = useState({ downtown: {}, suburban: {}, airport: {}, university: {} });
  const [organizer, setOrganizer] = useState({ stamina: ACT2_STAMINA_POOL, breaksTaken: 0, onBreak: 0 });
  // The demand platform is set once, company-wide, the first time you file. Bloc
  // priorities are rolled at the start and stay hidden until somebody listens.
  const [platform, setPlatform] = useState([]);
  // Language already signed at the first shop. Not a promise — a document.
  const proven = provenDemands(contract);
  // The bargaining survey: one a campaign, and it re-opens a slot if it lands.
  const [surveyPlanned, setSurveyPlanned] = useState(false);
  const [surveyDone, setSurveyDone] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [blocPriorities, setBlocPriorities] = useState(() => rollBlocPriorities());
  const [pendingFileLoc, setPendingFileLoc] = useState(null);
  const [moraleClimate, setMoraleClimate] = useState({ tone: "neutral", turnsLeft: 0 });
  const [legalClimate, setLegalClimate] = useState({ tone: "neutral", turnsLeft: 0 });
  const [employerSophistication, setEmployerSophistication] = useState(0); // 0-3, rises when firing fails to crush a location
  const [employerEmboldened, setEmployerEmboldened] = useState(false);
  const [escalationTarget, setEscalationTarget] = useState(null);
  // Sites that have already had the escalation prompt. It shows once, the first turn a
  // site is ready; after that the FILE control lives on the site's own panel and in the
  // banner above the map, so nobody is asked the same question every week.
  const [escalationSeen, setEscalationSeen] = useState([]);
  const [resolutionSteps, setResolutionSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const pendingRef = useRef(null);

  const unionizedCount = locations.filter(l => l.status === "won").length;
  const [deadReason, setDeadReason] = useState(null);
  const solidarityScore = computeSolidarityScore(locations);

  function responseCostFor(loc, r) {
    if (!r) return 0;
    let cost = 0;
    if (r.grievance && loc.grievance) cost += GRIEVANCE_META[loc.grievance.type].cost;
    if (r.document) cost += 1;
    if (r.counter) cost += 1;
    if (r.reframe && loc.buyOff?.active) cost += 1;
    if (r.formCommittee) cost += (loc.status === "campaign" ? COMMITTEE_COST_CAMPAIGN : COMMITTEE_COST);
    if (r.bargain) cost += 2;
    cost += (r.sitDown?.length || 0) * ACT2_SITDOWN_COST;
    return cost;
  }

  const totalResponseCost = locations.reduce((sum, l) => sum + responseCostFor(l, responses[l.id]), 0);
  // Every shop at the vote takes its upkeep off the top, before anything is allocated.
  const campaignCount = locations.filter(l => l.status === "campaign").length;
  const campaignUpkeep = campaignCount * ACT2_CAMPAIGN_UPKEEP;
  const surveyCost = surveyPlanned ? ACT2_SURVEY_COST : 0;
  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0) + totalResponseCost + campaignUpkeep + surveyCost;

  function updateAlloc(id, val) {
    val = Math.max(0, Math.min(weeklyBudget, val));
    setAllocations(prev => ({ ...prev, [id]: val }));
  }

  function toggleResponse(id, key) {
    setResponses(prev => ({ ...prev, [id]: { ...prev[id], [key]: !prev[id]?.[key] } }));
  }

  // How many sit-downs are booked anywhere this month. The cap is campaign-wide on
  // purpose: the scarce thing in this act is the organizer's calendar, not any one site.
  const sitDownsBooked = locations.reduce((n, l) => n + (responses[l.id]?.sitDown?.length || 0), 0);
  function toggleSitDown(locId, workerId) {
    setResponses(prev => {
      const cur = prev[locId]?.sitDown || [];
      const has = cur.includes(workerId);
      const booked = Object.values(prev).reduce((n, r) => n + (r?.sitDown?.length || 0), 0);
      if (!has && booked >= ACT2_ONE_ON_ONES_PER_TURN) return prev;
      return { ...prev, [locId]: { ...prev[locId], sitDown: has ? cur.filter(x => x !== workerId) : [...cur, workerId] } };
    });
  }

  // ---------- TURN RESOLUTION ----------
  function resolveTurn() {
    const steps = [];
    let orgStamina = organizer.stamina;
    let breaksTaken = organizer.breaksTaken;
    let onBreak = organizer.onBreak;

    // If organizer is on break, this turn is auto-skipped for allocation
    const isBreakTurn = onBreak > 0;

    let workingLocs = locations.map(l => ({ ...l }));

    // ---------- EXTERNAL / NATIONAL EVENTS ----------
    let moraleClimateNext = moraleClimate.turnsLeft > 0 ? { ...moraleClimate, turnsLeft: moraleClimate.turnsLeft - 1 } : { tone: "neutral", turnsLeft: 0 };
    let legalClimateNext = legalClimate.turnsLeft > 0 ? { ...legalClimate, turnsLeft: legalClimate.turnsLeft - 1 } : { tone: "neutral", turnsLeft: 0 };
    let firedEvent = null;
    if (!isBreakTurn && Math.random() < 0.18) {
      firedEvent = EXTERNAL_EVENTS[rand(EXTERNAL_EVENTS.length)];
      if (firedEvent.moraleClimate) moraleClimateNext = { ...firedEvent.moraleClimate };
      if (firedEvent.legalClimate) legalClimateNext = { ...firedEvent.legalClimate };
    }

    // snapshot 0: before anything
    steps.push({ label: "TURN START", sub: isBreakTurn ? "Organizer is on mandatory rest." : "Allocating organizer time...", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: isBreakTurn ? [`Organizer remains on break (${onBreak} turn(s) left).`] : [] });

    if (firedEvent) {
      steps.push({ label: "NATIONAL NEWS", sub: "Something outside the studio is shaping the month.", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: [firedEvent.headline] });
    }

    let activeLocationCount = 0;

    workingLocs = workingLocs.map(l => {
      if (l.status === "won" || l.status === "lost") return l;
      if (l.status === "abandoned") {
        // Nobody's left to counter anti-union talk here — it festers uncontested and can seed on its own.
        let au = l.antiUnion || { active: false, turnsLeft: 0 };
        if (au.active) au = { active: true, turnsLeft: au.turnsLeft };
        else if (Math.random() < 0.12) au = { active: true, turnsLeft: 2 };
        return { ...l, antiUnion: au };
      }

      const units = isBreakTurn ? 0 : (allocations[l.id] || 0);
      if (units > 0) activeLocationCount++;

      // --- One-on-ones: whoever the organizer sat down with this month ---
      // They happen at any site the organizer can reach, campaign or not. The
      // conversation moves the person a little; what it is actually FOR is the two
      // things you cannot buy any other way — an honest read on them, and their answer
      // to "who else should I be talking to?"
      let newRoster = l.roster;
      const sitDownLines = [];
      {
        const ids = (responses[l.id] || {}).sitDown || [];
        const satWith = ids.filter(id => (l.roster || []).some(w => w.id === id && !w.met));
        if (satWith.length) {
          newRoster = l.roster.map(w => (satWith.includes(w.id) ? { ...w, met: true, jitter: w.jitter + ACT2_SITDOWN_LIFT } : w));
          satWith.forEach(id => {
            const w = newRoster.find(x => x.id === id);
            const names = (w.points || []).map(pid => newRoster.find(x => x.id === pid)?.name).filter(Boolean);
            const leader = w.pull >= ACT2_LEADER_PULL;
            sitDownLines.push(`${l.name}: the organizer sits down with ${w.name}, ${w.role}. ${leader
              ? `People here take their cue from ${w.name} — that is somebody a committee can be built around.`
              : `${w.name} is with you, but the floor does not follow ${w.name} anywhere.`}${names.length
              ? ` Asked who else to talk to: ${names.join(", ")}.` : ""}`);
          });
        }
      }
      const workingLoc = { ...l, roster: newRoster };

      if (l.status === "campaign") {
        // A committee can still be built after the petition — it is the only response
        // that means anything once the clock is running, and it costs more up here.
        const rc = responses[l.id] || {};
        let campCommittee = l.committee || { active: false, strikes: 0 };
        let campCommitteeNote = "";
        if (rc.formCommittee && !campCommittee.active && metLeaders(workingLoc).length > 0
            && l.morale >= COMMITTEE_MORALE_REQ && l.recruited / l.workers >= COMMITTEE_RECRUIT_PCT_REQ) {
          campCommittee = { active: true, strikes: 0 };
          campCommitteeNote = ` ${l.name}: workers form a shop committee in the middle of the campaign. Somebody is finally counting honestly.`;
        }
        // Election campaign turn: employer counter-campaign automatically fires
        const employerHit = 3 + rand(3); // -3 to -5
        const committeeDefense = campCommittee.active ? 2 : 0;
        const defense = Math.min(employerHit, Math.floor(units * 1.2) + committeeDefense);
        let moraleDelta = -(employerHit - defense);
        let fearDelta = 8 - Math.floor(units * 1.5) - (campCommittee.active ? 2 : 0);
        fearDelta = Math.max(-8, fearDelta);
        if (moraleClimateNext.tone === "positive") { moraleDelta += 2; fearDelta -= 2; }
        else if (moraleClimateNext.tone === "negative") { moraleDelta -= 2; fearDelta += 2; }
        else if (moraleClimateNext.tone === "volatile") { fearDelta += 1; }
        if (firedEvent && firedEvent.immediateCampaignFear) fearDelta += firedEvent.immediateCampaignFear;
        if (firedEvent && firedEvent.immediateOrganizingMorale) moraleDelta += Math.round(firedEvent.immediateOrganizingMorale / 2);
        const newMorale = clamp(l.morale + moraleDelta);
        const newFear = clamp(l.fear + fearDelta);
        const trueSupportDelta = Math.round(moraleDelta * 0.5) + (campCommittee.active ? 1 : 0);
        const newTrueSupport = clamp((l.trueSupport ?? l.morale) + trueSupportDelta);
        const turnsLeft = l.electionTurn - turn;
        const campLegal = clamp(l.legalRisk - (rc.document ? 8 : 0) - 2, 0, 100);
        // A paper trail is a practice you start, not a chore you repeat. One action sets
        // it up and it stands for the rest of the campaign.
        const campDocumented = l.documented || !!rc.document;
        return { ...l, roster: newRoster, morale: newMorale, trueSupport: newTrueSupport, fear: newFear, committee: campCommittee,
          legalRisk: campLegal, documented: campDocumented,
          _feedbackLines: [...sitDownLines, ...(campCommitteeNote ? [campCommitteeNote.trim()] : [])],
          _campaignNote: `Employer pressure this month: ${moraleDelta >= 0 ? "+" : ""}${moraleDelta} morale. ${turnsLeft <= 0 ? "Election is today." : `${turnsLeft} turn(s) until the vote.`}` };
      }

      // Normal organizing location
      const r = responses[l.id] || {};
      const feedbackLines = [...sitDownLines];

      let gain = baseGain(units) + (locHasTrait(l.id, "morale") && units > 0 ? 2 : 0);
      let recruitedBonus = Math.floor(l.recruited * 2 * (units > 0 ? 1 : 0.3));
      if (l.manager === "sympathetic" && units > 0) gain += 3;
      if (orgStamina >= 85 && units > 0) gain += 2;
      if (orgStamina < 40 && units > 0) gain -= 3;
      if (l.visibility >= 80 && units > 0) gain -= 5;
      if (l._retaliatedLastTurn) gain -= 8;

      // --- Quiet buy-off: dampens general organizing "vibes" but not concrete wins ---
      let newBuyOff = l.buyOff || { active: false, turnsLeft: 0 };
      let buyOffWasActive = newBuyOff.active;
      if (newBuyOff.active) {
        if (r.reframe) {
          gain += 5; // successfully spun as proof the union already works
          feedbackLines.push(`${l.name}: Organizer reframes the retention bonus as proof collective pressure already works. (buy-off neutralized)`);
          newBuyOff = { active: false, turnsLeft: 0 };
        } else {
          gain = Math.round(gain * 0.6);
          const turnsLeft = newBuyOff.turnsLeft - 1;
          if (turnsLeft <= 0) {
            newBuyOff = { active: false, turnsLeft: 0 };
            feedbackLines.push(`${l.name}: The glow from the retention bonus is finally wearing off.`);
          } else {
            feedbackLines.push(`${l.name}: Workers are still a little complacent after the retention bonus. Organizing lands softer than usual.`);
            newBuyOff = { active: true, turnsLeft };
          }
        }
      }

      let momentumPenalty = 0;
      const newAbandonedTurns = units === 0 ? l.abandonedTurns + 1 : 0;
      if (newAbandonedTurns >= 3) momentumPenalty = 10;

      // --- Shop committee: forming one, and its ongoing effects ---
      let newCommittee = l.committee || { active: false, strikes: 0 };
      const recruitedPctNow = l.recruited / l.workers;
      // You do not form a committee by clearing a morale threshold. You form it out of
      // the people the floor already follows, which means you have to have found them.
      const leadersHere = metLeaders(workingLoc);
      const committeeEligible = !newCommittee.active && leadersHere.length > 0
        && l.morale >= COMMITTEE_MORALE_REQ && recruitedPctNow >= COMMITTEE_RECRUIT_PCT_REQ;
      if (r.formCommittee && committeeEligible) {
        newCommittee = { active: true, strikes: 0 };
        feedbackLines.push(`${l.name}: ${leadersHere.map(w => w.name).join(" and ")} ${leadersHere.length > 1 ? "pull" : "pulls"} a shop committee together. Organizing here no longer depends entirely on the outside organizer.`);
      }
      // A committee made of people the floor actually follows carries more than one made
      // of whoever was willing. committeeWeight is the summed pull of its leaders.
      const cw = newCommittee.active ? Math.max(1, committeeWeight(workingLoc)) : 0;
      const committeeMoraleBonus = newCommittee.active ? Math.round((locHasTrait(l.id, "committee") ? 5 : 3) * cw) : 0;
      const committeeSupportBonus = newCommittee.active ? Math.round((locHasTrait(l.id, "committee") ? 4 : 2) * cw) : 0;
      const committeeVisDrift = newCommittee.active ? 3 : 0;

      // --- Grievance resolution (a committee handles material/noise complaints on its own) ---
      let newGrievance = l.grievance;
      let grievanceBonus = 0;
      let grievanceRecruitBonus = 0;
      let grievanceSupportBonus = 0;
      if (l.grievance) {
        const meta = GRIEVANCE_META[l.grievance.type];
        const committeeHandlesIt = newCommittee.active && l.grievance.type !== "legal";
        const responded = r.grievance || committeeHandlesIt;
        if (responded) {
          if (l.grievance.type === "legal") {
            if (Math.random() < (locHasTrait(l.id, "legal") ? 0.97 : 0.9)) {
              grievanceBonus = 20;
              grievanceRecruitBonus = 2;
              grievanceSupportBonus = 18; // a real, provable win — this is what true support is built on
              feedbackLines.push(`${l.name}: Wage claim wins back overtime pay. Workers see the union deliver a real result. (+20 morale)`);
              newGrievance = null;
            } else {
              feedbackLines.push(`${l.name}: Wage claim filed but stalled in review — no result yet.`);
              newGrievance = { ...l.grievance, turnsActive: l.grievance.turnsActive + 1 };
            }
          } else if (l.grievance.type === "material") {
            grievanceBonus = 15;
            grievanceSupportBonus = 8;
            feedbackLines.push(`${l.name}: ${meta.action.toLowerCase()} — equipment fixed.${committeeHandlesIt ? " The committee handled it without the organizer." : ""} (+15 morale)`);
            newGrievance = null;
          } else {
            grievanceBonus = 3;
            grievanceSupportBonus = 0; // feels good, builds no durable commitment
            feedbackLines.push(`${l.name}: ${committeeHandlesIt ? "The committee hears out" : "Organizer hears out"} complaints about customers. Appreciated, but nothing structural changes. (+3 morale)`);
            newGrievance = null;
          }
        } else {
          const nextTurnsActive = l.grievance.turnsActive + 1;
          if (l.grievance.type === "legal" && nextTurnsActive >= 3) {
            grievanceBonus = -5;
            grievanceSupportBonus = -6;
            feedbackLines.push(`${l.name}: The wage claim never got filed. Workers notice the union let a clear win sit on the table. (-5 morale)`);
            newGrievance = null;
          } else if (l.grievance.type !== "legal" && nextTurnsActive >= 3) {
            newGrievance = null;
          } else {
            newGrievance = { ...l.grievance, turnsActive: nextTurnsActive };
          }
        }
      } else {
        const roll = Math.random();
        if (l.morale >= 50 && roll < 0.12) newGrievance = { type: "legal", turnsActive: 0 };
        else if (roll < 0.27) newGrievance = { type: "material", turnsActive: 0 };
        else if (roll < 0.52) newGrievance = { type: "noise", turnsActive: 0 };
      }

      // --- Crackdown signal (derived, no persistent state) — documenting spends a unit proactively ---
      const inCrackdownBand = l.visibility >= 40 && l.visibility < 60;
      let legalRiskAdjust = 0;
      if (inCrackdownBand && r.document) {
        legalRiskAdjust = -8;
        feedbackLines.push(`${l.name}: Organizer documents management's increased scrutiny — builds a paper trail before anything happens. (-8 legal risk)`);
      }

      // --- Anti-union signal ---
      let newAntiUnion = l.antiUnion || { active: false, turnsLeft: 0 };
      let antiUnionPenalty = 0;
      let antiUnionCounterBonus = 0;
      if (newAntiUnion.active) {
        if (r.counter) {
          feedbackLines.push(`${l.name}: Organizer knocks down anti-union talk before it spreads.${locHasTrait(l.id, "antiunion") ? " (a team member who's been through this before makes it land harder)" : ""}`);
          newAntiUnion = { active: false, turnsLeft: 0 };
          if (locHasTrait(l.id, "antiunion")) antiUnionCounterBonus = 3;
        } else {
          antiUnionPenalty = 2;
          const turnsLeft = newAntiUnion.turnsLeft - 1;
          if (turnsLeft <= 0) {
            newAntiUnion = { active: false, turnsLeft: 0 };
          } else {
            feedbackLines.push(`${l.name}: Anti-union talk keeps circulating, quietly dragging on morale.`);
            newAntiUnion = { active: true, turnsLeft };
          }
        }
      } else {
        const eligible = l.visibility >= 50 || l.manager === "hostile";
        if (firedEvent && firedEvent.seedAntiUnion) {
          newAntiUnion = { active: true, turnsLeft: 2 };
          feedbackLines.push(`${l.name}: The national PR blitz reaches workers here directly.`);
        } else if (eligible && Math.random() < 0.22) {
          newAntiUnion = { active: true, turnsLeft: 2 };
          feedbackLines.push(`${l.name}: Word comes back that management's been talking down the union informally.`);
        }
      }

      let climateGain = 0;
      if (moraleClimateNext.tone === "positive") climateGain = 2;
      else if (moraleClimateNext.tone === "negative") climateGain = -2;
      else if (moraleClimateNext.tone === "volatile") climateGain = 1;
      const eventMoraleBurst = firedEvent && firedEvent.immediateOrganizingMorale ? firedEvent.immediateOrganizingMorale : 0;

      const sitDownMorale = sitDownLines.length * ACT2_SITDOWN_MORALE;
      let moraleGain = gain + sitDownMorale + recruitedBonus - momentumPenalty + grievanceBonus - antiUnionPenalty + antiUnionCounterBonus + climateGain + eventMoraleBurst + committeeMoraleBonus;
      let newMorale = clamp(l.morale + moraleGain);

      // Recruitment growth (computed here so true support can reference it below)
      let recruitGain = units > 0 ? Math.round(units * 0.35) : 0;
      let newRecruited = Math.min(l.workers, l.recruited + recruitGain + grievanceRecruitBonus);

      // --- True support: the hidden number that actually decides elections. Moves slower and more skeptically than morale. ---
      // "Soft" organizing (conversation, mood, national mood swings) only partially converts into durable commitment.
      // What the platform is doing HERE, this week. A shop that is three-quarters
      // contract workers, under a platform that says nothing to contract workers,
      // organizes worse every week — not only on election day. Without this the player
      // adopts a platform and then gets no feedback on it until the ballot, which is
      // much too late for it to have been a decision.
      const platformPull = platform.length >= PLATFORM_SLOTS ? locBlocFactor(l, platform, blocPriorities, proven) : 1;
      const softPortion = gain + climateGain + eventMoraleBurst;
      let trueSupportGain = Math.round(softPortion * 0.35)
        + sitDownLines.length * ACT2_SITDOWN_SUPPORT
        + recruitGain * 1.4
        + grievanceSupportBonus
        - antiUnionPenalty * 1.3
        - momentumPenalty
        + committeeSupportBonus
        - (buyOffWasActive && !r.reframe ? 3 : 0);
      // Only on the way up: a platform that speaks to this shop makes the work land, one
      // that ignores it makes the work land softer. It does not deepen a loss.
      // Rounded before it is scaled as well as after, so the line quotes two whole
      // numbers that actually differ rather than "+2.8 became +3".
      if (platformPull !== 1 && Math.round(trueSupportGain) > 0) {
        const before = Math.round(trueSupportGain);
        trueSupportGain = Math.round(before * platformPull);
        if (units > 0 && before !== trueSupportGain && Math.abs(platformPull - 1) >= 0.06) {
          const worst = BLOCS
            .filter(b => (LOC_COMPOSITION[l.id]?.[b.id] || 0) >= 0.5)
            .sort((a, b) => blocSatisfaction(a.id, platform, blocPriorities, proven) - blocSatisfaction(b.id, platform, blocPriorities, proven))[0];
          feedbackLines.push(platformPull < 1
            ? `${l.name}: the platform lands badly here. ${worst
                ? `${worst.label} are ${Math.round(LOC_COMPOSITION[l.id][worst.id] * 100)}% of this shop and the platform gives them ${blocSatisfaction(worst.id, platform, blocPriorities, proven)}.`
                : "This shop is not really in it."} Organizing converts at ${Math.round(platformPull * 100)}% here: +${before} became +${trueSupportGain} true support.`
            : `${l.name}: the platform is doing work here on its own — organizing converts at ${Math.round(platformPull * 100)}%, so +${before} became +${trueSupportGain} true support.`);
        }
      }
      // Rounded: recruitment contributes a fractional term, and an unrounded number
      // ends up quoted at the ballot as "91.39999999999999 true support".
      let newTrueSupport = Math.round(clamp(l.trueSupport + trueSupportGain));

      // Visibility
      let visGain = baseVis(units);
      if (units > 0) visGain += Math.floor(l.recruited * 0.6);
      if (orgStamina < 30 && units > 0) visGain += 3;
      if (l.manager === "hostile" && units > 0) visGain += 4;
      if (l._retaliatedLastTurn) visGain += 5;
      if (l.manager === "sympathetic") visGain -= 2;
      visGain += committeeVisDrift;
      let newVisibility = clamp(l.visibility + visGain);

      // Legal risk passive decay if no retaliation, plus proactive documentation, national legal climate, and any national event
      let legalClimateDrift = legalClimateNext.tone === "favorable" ? -2 : legalClimateNext.tone === "hostile" ? 2 : 0;
      let eventLegalBurst = firedEvent && firedEvent.immediateLegalRiskAll ? firedEvent.immediateLegalRiskAll : 0;
      let newLegalRisk = clamp(l.legalRisk - (l._retaliatedLastTurn ? 0 : 3) + legalRiskAdjust + legalClimateDrift + eventLegalBurst, 0, 100);

      return {
        ...l,
        roster: newRoster,
        morale: newMorale,
        trueSupport: newTrueSupport,
        visibility: newVisibility,
        recruited: newRecruited,
        legalRisk: newLegalRisk,
        abandonedTurns: newAbandonedTurns,
        grievance: newGrievance,
        antiUnion: newAntiUnion,
        buyOff: newBuyOff,
        committee: newCommittee,
        _retaliatedLastTurn: false,
        _lastGain: moraleGain,
        _feedbackLines: feedbackLines,
      };
    });

    const allocLines = workingLocs.filter(l => l.status === "organizing").map(l => `${l.name}: allocated ${allocations[l.id] || 0} action(s) → morale ${l._lastGain >= 0 ? "+" : ""}${l._lastGain ?? 0}`);
    const feedbackLines = workingLocs.filter(l => l.status === "organizing" || l.status === "campaign").flatMap(l => l._feedbackLines || []);
    steps.push({ label: "MORALE & VISIBILITY", sub: "Resolving organizing activity across sites...", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: [...allocLines, ...feedbackLines] });

    // Retaliation checks — an employer that's learned from past failures reaches for subtler tools
    let retaliationLines = [];
    let sophisticationGain = 0;
    workingLocs = workingLocs.map(l => {
      if (l.status !== "organizing" && l.status !== "campaign") return l;
      const atVote = l.status === "campaign";
      const documented = !!l.documented || !!responses[l.id]?.document;

      // Did a past firing here fail to actually stop organizing? If so, the employer takes note.
      let updated = { ...l };
      if (l._watchRecovery && l.morale >= l._watchFloor) {
        sophisticationGain = 1;
        retaliationLines.push(`Corporate notices firing didn't shut ${l.name} down. Expect subtler tactics company-wide from here.`);
        updated._watchRecovery = false;
      }

      const spent = (l.crackdowns || 0) >= ACT2_CAMPAIGN_CRACKDOWN_CAP;
      if (l.visibility >= 60 && !(atVote && spent)) {
        const forceRetaliate = !atVote && l.visibility >= 90;
        const roll = roll100();
        const base = atVote
          ? Math.round(ACT2_CAMPAIGN_RETALIATION * (documented ? ACT2_DOCUMENT_DETERRENCE : 1))
          : (legalClimateNext.tone === "hostile" ? 65 : legalClimateNext.tone === "favorable" ? 35 : 50);
        const retaliateThreshold = base + (employerEmboldened ? ACT2_EMBOLDENED_RETALIATION : 0);
        if (forceRetaliate || roll <= retaliateThreshold) {
          const typeRoll = rand(100);
          // Weight shifts toward the quiet buy-off as the employer gets more sophisticated (unlocked at sophistication >= 1)
          const buyOffChance = employerSophistication >= 1 ? 15 + employerSophistication * 8 : 0;
          const fireChance = Math.max(15, 50 - employerSophistication * 10);
          let moraleHit = 0, visHit = 0, legalHit = 0, note = "";
          let setBuyOff = false, targetCommittee = false;

          if (typeRoll < buyOffChance) {
            setBuyOff = true;
            visHit = -5;
            note = `${l.name}: Corporate announces a surprise retention bonus and a new 'culture champion' Slack badge. No confrontation — just a chill settling over the channel.`;
          } else if (typeRoll < buyOffChance + fireChance) {
            targetCommittee = updated.committee?.active;
            moraleHit = targetCommittee ? 35 : 25;
            visHit = -20;
            legalHit = 15;
            note = targetCommittee
              ? `${l.name}: Management targets a known committee member. They're moved off the flagship project and put on a PIP inside the fortnight.`
              : `${l.name}: A suspected organizer is put on a performance improvement plan. No one in the room thinks it's about performance.`;
          } else if (typeRoll < buyOffChance + fireChance + 30) {
            moraleHit = 10; visHit = 0; legalHit = 5;
            note = `${l.name}: A town hall is scheduled to talk about 'direct feedback channels' and 'working better together.' Attendance is not optional.`;
          } else {
            moraleHit = 5; visHit = -10; legalHit = 8;
            note = `${l.name}: Calendar invites to key planning meetings stop going to suspected organizers. Repo access quietly changes.`;
          }

          retaliationLines.push(note);
          const hit = atVote ? Math.round(moraleHit * ACT2_CAMPAIGN_HIT_SCALE) : moraleHit;
          updated.morale = clamp(updated.morale - hit);
          updated.trueSupport = clamp((updated.trueSupport ?? updated.morale) - Math.round(hit * 0.8));
          updated.visibility = clamp(updated.visibility + visHit);
          updated.legalRisk = clamp(updated.legalRisk + legalHit);
          updated._retaliatedLastTurn = true;
          // At the vote, what a crackdown really costs you is turnout. Documenting it
          // is the difference between a frightened floor and an angry one.
          if (atVote) updated.crackdowns = (updated.crackdowns || 0) + 1;
          if (atVote && moraleHit > 0) {
            const raw = Math.round(moraleHit * ACT2_RETALIATION_FEAR);  // off the full blow, not the scaled one
            const fearHit = documented ? Math.round(raw * ACT2_DOCUMENT_SHIELD) : raw;
            updated.fear = clamp(updated.fear + fearHit);
            retaliationLines.push(documented
              ? `${l.name}: the union had the dates, the names and who was in the room, and it goes in as a charge the same week. +${fearHit} fear instead of +${raw} — people are angry rather than frightened, and only the frightened stay home.`
              : `${l.name}: +${fearHit} fear, weeks from a ballot, and nobody wrote any of it down. Fear does not change a vote; it just keeps the people who would have cast one at their desks.`);
          }

          if (setBuyOff) {
            updated.buyOff = { active: true, turnsLeft: 3 };
          }
          if (targetCommittee) {
            const strikes = (updated.committee.strikes || 0) + 1;
            if (strikes >= 2) {
              updated.committee = { active: false, strikes: 0 };
              updated.morale = clamp(updated.morale - 15);
              retaliationLines.push(`${l.name}: The committee can't absorb a second targeting like that. It dissolves.`);
            } else {
              updated.committee = { ...updated.committee, strikes };
            }
          }
          // Did the firing actually work? Watch, and if the shop is still standing next
          // month, corporate learns that firing people does not shut this place down and
          // starts reaching for the quiet things instead.
          //
          // This used to be gated on `!targetCommittee`, which made it unreachable the
          // moment a committee became the price of a petition: every shop has one now, so
          // every firing targeted one, so the watch never started and neither
          // sophistication nor the quiet buy-off ever existed. What matters is not who
          // they picked but whether it held.
          const committeeHeld = !targetCommittee || !!updated.committee?.active;
          if (moraleHit >= 20 && committeeHeld) {
            updated._watchRecovery = true;
            updated._watchFloor = 55;
          }
        }
      }
      return updated;
    });

    if (sophisticationGain > 0) {
      setEmployerSophistication(s => Math.min(3, s + sophisticationGain));
    }

    if (retaliationLines.length) {
      steps.push({ label: "EMPLOYER RESPONSE", sub: "Management notices organizing activity.", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: retaliationLines });
    }

    // ---------- SOLIDARITY NETWORK ----------
    // Wins and strong shops elsewhere are a standing counter-force: they make the anti-union
    // narrative land softer everywhere, can shake an existing campaign loose on their own, and
    // keep paying dividends every week rather than a one-time jolt at the moment of victory.
    const turnSolidarityScore = computeSolidarityScore(workingLocs);

    let solidarityLines = [];
    const solidarityPulses = [];
    // "Strong" sites are the actual source of the network effect — pulse from each of
    // them to whoever benefits, instead of leaving the trickle as an untraceable average.
    const strongSites = workingLocs.filter(l => l.status === "won" || l.morale >= 70 || l.committee?.active);
    if (turnSolidarityScore > 0) {
      const cureChance = Math.min(0.5, turnSolidarityScore * 0.07);
      workingLocs = workingLocs.map(l => {
        if (!l.antiUnion?.active || l.status === "won" || l.status === "lost") return l;
        if (Math.random() >= cureChance) return l;
        solidarityLines.push(`${l.name}: Word of what's happening elsewhere makes the anti-union talk here feel small. It fizzles out on its own.`);
        strongSites.filter(s => s.id !== l.id).forEach(s => solidarityPulses.push({ from: s.id, to: l.id, tone: "up" }));
        return { ...l, antiUnion: { active: false, turnsLeft: 0 }, morale: clamp(l.morale + 3) };
      });

      const moraleTrickle = Math.min(6, turnSolidarityScore * 2);
      const supportTrickle = Math.min(3, turnSolidarityScore);
      workingLocs = workingLocs.map(l => {
        if (l.status !== "organizing" && l.status !== "campaign") return l;
        return { ...l, morale: clamp(l.morale + moraleTrickle), trueSupport: clamp((l.trueSupport ?? l.morale) + supportTrickle) };
      });
      if (moraleTrickle > 0) {
        solidarityLines.push(`Momentum from ${turnSolidarityScore >= 4 ? "several strong sites" : "elsewhere in the company"} gives every active site a lift this month (+${moraleTrickle} morale, +${supportTrickle} true support).`);
        strongSites.forEach(s => {
          workingLocs.filter(l => (l.status === "organizing" || l.status === "campaign") && l.id !== s.id)
            .forEach(l => solidarityPulses.push({ from: s.id, to: l.id, tone: "up" }));
        });
      }
    }
    if (solidarityLines.length) {
      steps.push({ label: "SOLIDARITY NETWORK", sub: "Momentum isn't only bad news that travels.", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: solidarityLines, edgePulses: solidarityPulses });
    }

    // ---------- ANTI-UNION CONTAGION ----------
    // An anti-union narrative that nobody pushes back on doesn't stay contained to one site —
    // it travels through cross-site Slack channels, shared managers, and friend groups.
    let contagionLines = [];
    const contagionPulses = [];
    const contagionSources = workingLocs.filter(l => {
      if (!l.antiUnion?.active) return false;
      if (l.status === "abandoned") return true; // always uncontested
      if (l.status !== "organizing") return false;
      return !responses[l.id]?.counter; // unaddressed this turn
    });
    if (contagionSources.length) {
      workingLocs = workingLocs.map(l => {
        if (l.status === "won" || l.status === "lost" || l.antiUnion?.active) return l;
        const availableSources = contagionSources.filter(s => s.id !== l.id);
        if (!availableSources.length) return l;
        const spreadChance = Math.max(0.02, 0.12 + employerSophistication * 0.05 + (employerEmboldened ? 0.05 : 0) - turnSolidarityScore * 0.04);
        if (Math.random() >= spreadChance) return l;
        const source = availableSources[rand(availableSources.length)];
        contagionPulses.push({ from: source.id, to: l.id, tone: "down" });
        if (l.status === "campaign") {
          const fearBump = 8;
          contagionLines.push(`${l.name}: Anti-union messaging spreading out of ${source.name} reaches workers here too. (+${fearBump} fear)`);
          return { ...l, fear: clamp(l.fear + fearBump) };
        }
        contagionLines.push(`${l.name}: Anti-union talk from ${source.name} spreads here through shared Slack channels and cross-site friend groups.`);
        return { ...l, antiUnion: { active: true, turnsLeft: 2 } };
      });
    }
    if (contagionLines.length) {
      steps.push({ label: "ANTI-UNION CONTAGION", sub: "An unanswered narrative doesn't stay in one place.", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: contagionLines, edgePulses: contagionPulses });
    }

    // Stamina decay
    if (!isBreakTurn) {
      let decay = totalAllocated >= 6 ? 5 : (totalAllocated <= 2 ? 1 : 2);
      if (activeLocationCount >= 3) decay += 2;
      if (totalAllocated <= 1) decay = -2; // rest recovers
      if (retaliationLines.length > 0) decay += 3; // retaliation still costs fatigue on a rest week
      orgStamina = clamp(orgStamina - decay, 0, 100);
    }

    let staminaNote = isBreakTurn ? "Organizer is resting." : `Organizer stamina change this month.`;
    steps.push({ label: "ORGANIZER STAMINA", sub: staminaNote, locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: [`Stamina is now ${orgStamina}.`] });

    // Handle break trigger
    let justBroke = false;
    if (orgStamina <= 0 && onBreak === 0) {
      onBreak = 2;
      breaksTaken += 1;
      justBroke = true;
    }
    if (onBreak > 0 && !justBroke) {
      onBreak -= 1;
      if (onBreak === 0) orgStamina = Math.round(ACT2_STAMINA_POOL * 0.8);
    }



    let prioritiesNext = { ...blocPriorities };

    // --- OPEN BARGAINING ---
    // Two actions spent listening instead of pushing. Reveals a bloc's real priority
    // and how hard they hold it, and lowers their odds of taking a side deal.
    const bargainLines = [];
    workingLocs.forEach(l => {
      if (!responses[l.id]?.bargain) return;
      const comp = LOC_COMPOSITION[l.id] || {};
      const target = BLOCS.find(b => (comp[b.id] || 0) >= 0.5 && !prioritiesNext[b.id]?.known);
      if (!target) return;
      const pr = prioritiesNext[target.id];
      prioritiesNext = { ...prioritiesNext, [target.id]: { ...pr, known: true, heard: (pr.heard || 0) + 1 } };
      bargainLines.push(
        `${target.label} HEARD \u2014 what they actually want is ${DEMAND_BY_ID[pr.top]?.label}, and they hold it ${"\u25CF".repeat(pr.intensity)} hard. ` +
        `Two hours in a room at ${l.name} with nobody presenting anything. They are markedly harder to buy off now, whatever you end up putting in the platform.`
      );
    });
    // --- THE BARGAINING SURVEY ---
    // The response rate is the measurement. A strong one tells you what the whole company
    // wants and buys you the right to change your mind once; a thin one tells the company
    // that nobody is listening to you, which is worse than not having asked.
    const surveyLines = [];
    if (surveyPlanned && !surveyDone) {
      const sr = surveyResponse(workingLocs);
      setSurveyDone(true);
      const pctBack = Math.round(sr.rate * 100);
      const unknown = BLOCS.filter(b => !prioritiesNext[b.id]?.known && !prioritiesNext[b.id]?.defected);
      if (sr.rate >= SURVEY_STRONG) {
        unknown.forEach(b => {
          const pr = prioritiesNext[b.id];
          prioritiesNext = { ...prioritiesNext, [b.id]: { ...pr, known: true, heard: (pr.heard || 0) + 1 } };
        });
        BLOCS.filter(b => prioritiesNext[b.id].known).forEach(b => {
          const pr = prioritiesNext[b.id];
          prioritiesNext = { ...prioritiesNext, [b.id]: { ...pr, heard: (pr.heard || 0) + 1 } };
        });
        setPlatformOpen(true);
        workingLocs = workingLocs.map(l => (l.status !== "organizing" && l.status !== "campaign") ? l : {
          ...l,
          morale: clamp(l.morale + SURVEY_MORALE_GAIN),
          trueSupport: clamp((l.trueSupport ?? l.morale) + SURVEY_TRUE_GAIN),
        });
        surveyLines.push(
          `THE SURVEY LANDS \u2014 ${sr.returned} of ${sr.total} workers filled it in and handed it back. ${pctBack}%, against the ${Math.round(SURVEY_STRONG * 100)}% this needed. ` +
          `+${SURVEY_TRUE_GAIN} true support and +${SURVEY_MORALE_GAIN} morale everywhere, because a survey is not a questionnaire \u2014 it is an excuse to talk to every worker in the company inside a fortnight, and somebody just did. ` +
          `${unknown.length ? `Every bloc's real priority is now on the table: ${unknown.map(b => `${b.label} want ${DEMAND_BY_ID[prioritiesNext[b.id].top]?.label}`).join("; ")}. ` : "Nothing was left to learn, and they told you again anyway. "}` +
          `A response rate like that is not a questionnaire, it is a headcount \u2014 and it is one the company can also count. You may change one demand.`
        );
      } else if (sr.rate >= SURVEY_WEAK) {
        const b = unknown[0];
        if (b) {
          const pr = prioritiesNext[b.id];
          prioritiesNext = { ...prioritiesNext, [b.id]: { ...pr, known: true, heard: (pr.heard || 0) + 1 } };
        }
        setPlatformOpen(true);
        surveyLines.push(
          `THE SURVEY COMES BACK THIN \u2014 ${sr.returned} of ${sr.total}, ${pctBack}%, short of the ${Math.round(SURVEY_STRONG * 100)}% that would have carried the whole company. ` +
          `${b ? `You learn one thing: ${b.label} want ${DEMAND_BY_ID[prioritiesNext[b.id].top]?.label}. ` : ""}` +
          `Enough to justify reopening one demand, not enough to walk into a room with. The shops with a committee answered; the ones without mostly did not, which is the finding.`
        );
      } else {
        BLOCS.forEach(b => {
          const pr = prioritiesNext[b.id];
          prioritiesNext = { ...prioritiesNext, [b.id]: { ...pr, heard: Math.max(0, (pr.heard || 0) - 1) } };
        });
        workingLocs = workingLocs.map(l => (l.status !== "organizing" && l.status !== "campaign") ? l
          : { ...l, morale: clamp(l.morale - SURVEY_DEAD_MORALE) });
        surveyLines.push(
          `THE SURVEY DIES \u2014 ${sr.returned} of ${sr.total} came back. ${pctBack}%, against the ${Math.round(SURVEY_WEAK * 100)}% that would have told you anything. ` +
          `\u2212${SURVEY_DEAD_MORALE} morale everywhere. ` +
          `You learn nothing, you get no revision, and everybody who did not fill it in now knows they were asked. ` +
          `Asking a floor you have not organized is not listening to it \u2014 it is proving, to them and to the company, that there is nobody here to answer.`
        );
      }
    }
    if (surveyLines.length) steps.push({ label: "THE BARGAINING SURVEY", sub: "The response rate is the measurement.", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: surveyLines });

    if (bargainLines.length) steps.push({ label: "OPEN BARGAINING", sub: "You cannot write a platform for people you have not asked.", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: bargainLines });

    // --- THE SIDE OFFER ---
    // He reads your platform and goes straight to whoever you left out. Whether they
    // take it depends on their hidden intensity, which you can only have learned by
    // listening — and on whether that bloc has a shop committee anywhere it is thick,
    // because a bloc with representation has somewhere to take the offer and argue.
    const blocLines = [];
    if (platform.length >= PLATFORM_SLOTS) {
      const unserved = BLOCS
        .map(b => ({ b, sat: blocSatisfaction(b.id, platform, prioritiesNext, proven), pr: prioritiesNext[b.id] }))
        .filter(x => !x.pr.defected && x.sat < 50)
        .sort((x, y) => x.sat - y.sat);

      if (unserved.length && Math.random() < 0.45) {
        const { b, sat, pr } = unserved[0];
        // Representation: is this bloc thick anywhere that has an active committee?
        const represented = workingLocs.some(l =>
          l.committee?.active && (LOC_COMPOSITION[l.id]?.[b.id] || 0) >= 0.5 && l.status !== "lost");
        const takeChance = clamp(
          (DEFECT_THRESHOLD + 25 - sat) / 100 + pr.intensity * 0.08 - (represented ? 0.35 : 0) - (pr.pledged ? 0.12 : 0),
          0, 0.85) ;
        if (Math.random() < takeChance) {
          prioritiesNext = { ...prioritiesNext, [b.id]: { ...pr, defected: true } };
          blocLines.push(
            `${b.label} WALK \u2014 the company offers them ${DEMAND_BY_ID[pr.top]?.label || "a side deal"} directly, outside the union. ` +
            `Satisfaction was ${sat}, below the ${DEFECT_THRESHOLD} line, and nobody had made them a better promise. ` +
            `They stop counting toward any election and start arguing the other way in every shop they're thick in.` +
            (represented ? "" : " Nobody on a shop committee spoke for them.")
          );
        } else {
          blocLines.push(
            `${b.label} TURN DOWN A SIDE DEAL \u2014 the company offers them ${DEMAND_BY_ID[pr.top]?.label || "a side deal"} outside the union and they bring it to the committee instead. ` +
            (represented ? "Having somebody in the room who speaks for them is what made the difference. " : "") +
            `Satisfaction ${sat} \u2192 ${clamp(sat + 8)}.`
          );
          prioritiesNext = { ...prioritiesNext, [b.id]: { ...pr, heard: (pr.heard || 0) + 1 } };
        }
      }
    }
    if (blocLines.length) steps.push({ label: "THE BLOCS", sub: "The company reads your platform too, and goes to whoever you left out.", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: blocLines });

    // Election resolution check
    let electionLines = [];
    workingLocs = workingLocs.map(l => {
      if (l.status === "campaign" && turn >= l.electionTurn) {
        const raw = l.trueSupport ?? l.morale;
        // The platform decides who actually turns out — so it multiplies turnout, which
        // is what it has always claimed to do. Read against THIS turn's priorities: a
        // bloc that walked an hour ago does not get to vote.
        const factor = locBlocFactor(l, platform, prioritiesNext, proven);
        const ctx = { platform, priorities: prioritiesNext, proven };
        const odds = act2WinChance(l, factor, ctx);
        const b = act2CastBallot(l, factor, ctx);
        const margin = `${b.yes}\u2013${b.no}`;
        const named = b.stayed.slice(0, 3).map(w => w.name).join(", ");
        const turnoutLine = `${b.cast} of ${l.workers} cast a ballot${b.out
          ? `, ${b.out} didn't vote${named ? ` — ${named}${b.out > 3 ? " and others" : ""}` : ""}` : ""}`;
        const oddsLine = `The odds going in were ${Math.round(odds * 100)}%, on ${raw} true support and ${l.fear} fear; the platform moved turnout ${factor >= 1 ? "+" : ""}${Math.round((factor - 1) * 100)}%.`;
        const gapWarning = l.morale - raw >= 15 ? ` Morale read ${l.morale}. The room was ${l.morale - raw} points warmer than the vote.` : "";
        if (b.won) {
          electionLines.push(`${l.name}: ELECTION WON, ${margin}. ${turnoutLine}. ${oddsLine}${gapWarning}`);
          return { ...l, status: "won", morale: 95, trueSupport: 95, legalRisk: 0, ballot: b };
        }
        const stayedHome = b.out > b.yes
          ? ` More people stayed at their desks than voted yes. Every one of them was a vote you could have had.`
          : factor < 0.98 ? ` The people you didn't write into the platform stayed home.` : "";
        electionLines.push(`${l.name}: ELECTION LOST, ${b.yes} yes to ${b.no} no. ${turnoutLine}. ${oddsLine}${stayedHome}${gapWarning}`);
        return { ...l, status: "lost", morale: 20, trueSupport: 20, fear: 90, abandonedTurns: 99, ballot: b };
      }
      return l;
    });

    if (electionLines.length) {
      // A win's ongoing upside comes from the solidarity network above, which pays out
      // every week. A loss is the mirror of it, and it has to be the heavier of the two:
      // spreading yourself over four shops means more elections, and if losing them is
      // cheap then four weak petitions beat two strong ones, which is the opposite of
      // what organizing a company actually takes.
      const lostNow = workingLocs.filter(l => l.status === "lost"
        && electionLines.some(s => s.startsWith(l.name) && s.includes("ELECTION LOST")));
      if (lostNow.length) {
        const n = lostNow.length;
        let hit = 0;
        workingLocs = workingLocs.map(l => {
          if (l.status !== "organizing" && l.status !== "campaign") return l;
          hit += 1;
          return {
            ...l,
            morale: clamp(l.morale - ACT2_LOSS_MORALE * n),
            trueSupport: clamp((l.trueSupport ?? l.morale) - ACT2_LOSS_TRUE * n),
            fear: clamp(l.fear + ACT2_LOSS_FEAR * n),
          };
        });
        const staminaCost = ACT2_LOSS_STAMINA * n;
        orgStamina = clamp(orgStamina - staminaCost, 0, 100);
        // The stamina check has already run this turn, so re-run it: a defeat is exactly
        // the week an organizer goes under, and it should not be held over to the next.
        if (orgStamina <= 0 && onBreak === 0) { onBreak = 2; breaksTaken += 1; justBroke = true; }
        setEmployerEmboldened(true);
        electionLines.push(
          `A DEFEAT IS NOT A LOCAL EVENT \u2014 ${hit} shop${hit === 1 ? "" : "s"} still in play: \u2212${ACT2_LOSS_MORALE * n} morale, ` +
          `\u2212${ACT2_LOSS_TRUE * n} true support, +${ACT2_LOSS_FEAR * n} fear. The organizer loses ${staminaCost} stamina. ` +
          `Everybody who was watching just learned that the company can win one, and the people you have left are the ones who have to be asked to go next. ` +
          `Management across the company reaches for the same tools sooner now.` +
          (justBroke ? " That is what puts the organizer on a mandatory break." : "")
        );
        if (lostNow.length) {
          electionLines.push(
            `THE ELECTION BAR \u2014 ${lostNow.map(l => l.name).join(" and ")} cannot petition again for a year. ` +
            `In a twelve-month campaign that is not a setback you organize back from. That shop is gone.`
          );
        }
      }
      steps.push({ label: "ELECTION DAY", sub: "The votes are in.", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: electionLines });
    }

    steps.push({ label: "END OF TURN", sub: `Turn ${turn} complete.`, locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina, breaksTaken, onBreak }, lines: justBroke ? ["Organizer has hit zero stamina and must take a 2-turn break."] : [] });

    setResolutionSteps(steps);
    setStepIndex(0);
    setPhase("resolving");

    // stash final computed state to commit once animation finishes
    pendingRef.current = { workingLocs, orgStamina, breaksTaken, onBreak, justBroke, moraleClimateNext, legalClimateNext, prioritiesNext };
  }

  function commitResolution() {
    const { workingLocs, orgStamina, breaksTaken, onBreak, moraleClimateNext, legalClimateNext, prioritiesNext } = pendingRef.current;
    setLocations(workingLocs);
    setOrganizer({ stamina: orgStamina, breaksTaken, onBreak });
    setBlocPriorities(prioritiesNext);
    setMoraleClimate(moraleClimateNext);
    setLegalClimate(legalClimateNext);
    setAllocations({ downtown: 0, suburban: 0, airport: 0, university: 0 });
    setResponses({ downtown: {}, suburban: {}, airport: {}, university: {} });
    setSurveyPlanned(false);

    if (breaksTaken >= 2) {
      setPhase("gameover-loss");
      return;
    }
    const wonCount = workingLocs.filter(l => l.status === "won").length;
    if (wonCount >= 2) {
      setPhase("gameover-win");
      return;
    }
    if (turn >= TOTAL_TURNS) {
      // wonCount >= 2 already returned above, so reaching the turn cap always means a loss.
      setPhase("gameover-loss");
      return;
    }
    // Don't make anyone play out a campaign that arithmetic has already decided. The
    // next turn the player can act on is turn + 1, and that is what the check reads.
    const winnable = act2Winnability(workingLocs, turn + 1);
    if (!winnable.alive) {
      setDeadReason(winnable.reason);
      setPhase("gameover-loss");
      return;
    }

    const escalationReady = workingLocs.find(l => l.status === "organizing" && l.morale >= 70 && !escalationSeen.includes(l.id)) || null;
    setTurn(t => t + 1);
    if (escalationReady) {
      setEscalationTarget(escalationReady.id);
      setEscalationSeen(seen => [...seen, escalationReady.id]);
      setPhase("escalation");
    } else {
      setPhase("allocate");
    }
  }

  function fileForElection(locId) {
    // First petition is the moment the campaign stops being about whether to have a
    // union and starts being about what it will ask for. That is where shops fracture.
    if (platform.length < PLATFORM_SLOTS) {
      setPendingFileLoc(locId);
      setEscalationTarget(null);
      setSelectedLoc(null); // the site panel would otherwise sit on top of the platform screen
      setPhase("platform");
      return;
    }
    commitFiling(locId);
  }
  function commitFiling(locId) {
    setLocations(prev => prev.map(l => {
      if (l.id !== locId) return l;
      if (!filingGates(l, turn).every(g => g.pass)) return l; // guarded in UI, shouldn't happen
      return { ...l, status: "campaign", electionTurn: turn + ACT2_FILING_LEAD, fear: 35 + rand(15),
        visibility: Math.max(l.visibility, ACT2_FILING_VISIBILITY) };
    }));
    setEscalationTarget(null);
    setPendingFileLoc(null);
    setSelectedLoc(null);
    setPhase("allocate");
  }
  function adoptPlatform(chosen) {
    setPlatform(chosen);
    setPlatformOpen(false);
    if (pendingFileLoc) commitFiling(pendingFileLoc);
    else { setPendingFileLoc(null); setPhase("allocate"); }
  }
  function consolidate() {
    setEscalationTarget(null);
    setPhase("allocate");
  }
  function pivotAway(locId) {
    setLocations(prev => prev.map(l => l.id === locId ? { ...l, status: "abandoned" } : l));
    setEscalationTarget(null);
    setPhase("allocate");
  }

  function restartGame() {
    setTurn(1);
    setLocations(START_LOCATIONS.map(l => ({
      ...l,
      roster: rosters[l.id],
      trueSupport: clamp(l.trueSupport + headstart),
      morale: clamp(l.morale + Math.round(headstart / 2)),
    })));
    setAllocations({ downtown: 0, suburban: 0, airport: 0, university: 0 });
    setResponses({ downtown: {}, suburban: {}, airport: {}, university: {} });
    setOrganizer({ stamina: ACT2_STAMINA_POOL, breaksTaken: 0, onBreak: 0 });
    setMoraleClimate({ tone: "neutral", turnsLeft: 0 });
    setLegalClimate({ tone: "neutral", turnsLeft: 0 });
    setEmployerSophistication(0);
    setEmployerEmboldened(false);
    setEscalationTarget(null);
    setEscalationSeen([]);
    setPlatform([]);
    setBlocPriorities(rollBlocPriorities());
    setPendingFileLoc(null);
    setDeadReason(null);
    setSelectedLoc(null);
    setSurveyPlanned(false);
    setSurveyDone(false);
    setPlatformOpen(false);
    setLeaderDeployment({});
    setArmedLeader(null);
    setPhase("allocate");
  }

  const remaining = weeklyBudget - totalAllocated;
  // What this week will cost the organizer, worked out the same way the resolution does
  // it. The meter only ever moved for somebody carrying three or four shops at once, and
  // a number that changes for reasons you cannot see is not a meter, it is decoration.
  const staminaForecast = (() => {
    const active = locations.filter(l => l.status === "organizing" && (allocations[l.id] || 0) > 0).length;
    if (totalAllocated <= 1) return { decay: -2, why: ["a month off"] };
    let decay = totalAllocated >= 6 ? 5 : (totalAllocated <= 2 ? 1 : 2);
    const why = [totalAllocated >= 6 ? "a heavy month" : totalAllocated <= 2 ? "a light month" : "a normal month"];
    if (active >= 3) { decay += 2; why.push(`${active} shops in one calendar`); }
    return { decay, why };
  })();
  // Before a platform exists there is nothing to suppress turnout, so it is a flat 1.
  const turnoutFactorFor = (loc) => (platform.length ? locBlocFactor(loc, platform, blocPriorities, proven) : 1);
  // What every read of the ballot needs to know about the platform, in one place.
  const ballotCtx = { platform, priorities: blocPriorities, proven };
  const locByStatus = (s) => locations.filter(l => l.status === s);
  const escLoc = locations.find(l => l.id === escalationTarget);

  // In-place resolution: diff each step's snapshot against the previous one so the
  // network map can show what just changed instead of routing it through a modal.
  const resStep = phase === "resolving" && resolutionSteps.length > 0 ? resolutionSteps[stepIndex] : null;
  const resHighlights = {};
  if (resStep) {
    const prevSnapshot = stepIndex > 0 ? resolutionSteps[stepIndex - 1].locs : locations;
    resStep.locs.forEach(cl => {
      const pl = prevSnapshot.find(x => x.id === cl.id);
      if (!pl) return;
      const moraleDelta = cl.morale - pl.morale;
      const statusChanged = cl.status !== pl.status;
      if (moraleDelta !== 0 || statusChanged) resHighlights[cl.id] = { moraleDelta, statusChanged };
    });
  }
  const resLogRef = useRef(null);
  useEffect(() => {
    if (resLogRef.current) resLogRef.current.scrollTop = resLogRef.current.scrollHeight;
  }, [stepIndex, phase]);

  // Play the resolution automatically instead of making the player click through every
  // step — each step's narrative lines float as notes on the map, then the sequence
  // advances on its own. Skipping just jumps straight to the already-computed outcome.
  useEffect(() => {
    if (phase !== "resolving" || resolutionSteps.length === 0) return;
    const step = resolutionSteps[stepIndex];
    const lineCount = step.lines?.length || 0;
    const duration = lineCount === 0 ? 200 : Math.min(2600, 900 + lineCount * 250);
    const t = setTimeout(() => {
      if (stepIndex < resolutionSteps.length - 1) setStepIndex(i => i + 1);
      else commitResolution();
    }, duration);
    return () => clearTimeout(t);
  }, [phase, stepIndex, resolutionSteps]);

  const { noteById: resNotes, banner: resBanner } = resStep
    ? splitLinesByEntity(resStep.lines, resStep.locs.map(l => ({ id: l.id, name: l.name })))
    : { noteById: {}, banner: [] };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-mono">
      <GlobalStyle />

      {/* HEADER */}
      <div className="border-b-2 border-stone-800 bg-stone-900 px-4 py-3 sm:px-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-stencil text-2xl sm:text-3xl tracking-wide text-amber-400">UNION UP</div>
          <div className="text-xs sm:text-sm tracking-[0.2em] text-stone-500">ORGANIZING SIMULATION — GAME STUDIO CAMPAIGN</div>
        </div>
        {phase !== "intro" && (
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
            <div className="text-center">
              <div className="text-stone-500 text-xs">MONTH</div>
              <div className="text-lg font-bold text-stone-100">{Math.min(turn, TOTAL_TURNS)} / {TOTAL_TURNS}</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-xs flex items-center gap-1"><Zap size={11}/> STAMINA</div>
              <div className={`text-lg font-bold ${organizer.stamina < 30 ? "text-red-500" : organizer.stamina < 60 ? "text-amber-400" : "text-teal-400"}`}>{organizer.stamina}</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-xs">SHOPS WON</div>
              <div className="flex items-center gap-1.5 justify-center mt-1">
                <Pips filled={unionizedCount} total={ACT2_SITES_NEEDED} hex="#2dd4bf" size={11} gap={4} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* THE OBJECTIVE, ALWAYS ON SCREEN */}
      {phase !== "intro" && (() => {
        const win = act2Winnability(locations, turn);
        const atVote = locations.filter(l => l.status === "campaign");
        return (
          <div className={`px-4 sm:px-6 py-2 border-b text-xs flex items-center gap-x-5 gap-y-1 flex-wrap ${win.alive ? "border-stone-800 bg-stone-900/60" : "border-red-900 bg-red-950/40"}`}>
            <span className="text-stone-400">
              <span className="text-stone-500">OBJECTIVE</span>{" "}
              Win union elections at <span className="text-teal-400 font-bold">{ACT2_SITES_NEEDED} of {locations.length}</span> shops within {TOTAL_TURNS} months.
            </span>
            <span className="text-stone-400">
              <span className="text-stone-500">A SHOP VOTES YES ON</span>{" "}
              true support — not morale. Above <span className="text-teal-400 font-bold">70</span> is comfortable; below <span className="text-amber-400 font-bold">50</span> is a coin flip that fear decides.
            </span>
            <span className={win.alive ? "text-stone-400" : "text-red-400 font-bold"}>
              <span className="text-stone-500">MONTHS LEFT</span>{" "}
              <span className="font-bold">{Math.max(0, TOTAL_TURNS - turn)}</span>
              {atVote.length > 0 && <span className="text-amber-400"> — {atVote.length} shop{atVote.length === 1 ? "" : "s"} already at the vote</span>}
            </span>
            <span className={turn > ACT2_LAST_FILING_TURN ? "text-red-400" : turn === ACT2_LAST_FILING_TURN ? "text-amber-400 font-bold" : "text-stone-400"}>
              <span className="text-stone-500">LAST MONTH TO FILE</span>{" "}
              <span className="font-bold">{ACT2_LAST_FILING_TURN}</span>
              <span className="text-stone-500"> — a vote lands {ACT2_FILING_LEAD} months after the petition</span>
            </span>
            {!win.alive && <span className="text-red-400 font-bold">NO LONGER WINNABLE</span>}
          </div>
        );
      })()}

      {phase === "platform" && (
        <PlatformModal
          priorities={blocPriorities}
          locations={locations}
          proven={proven}
          initial={platform}
          onPledge={(blocId) => setBlocPriorities(pr => (
            BLOCS.filter(b => pr[b.id]?.pledged).length >= ACT2_MAX_PLEDGES
              ? pr
              : { ...pr, [blocId]: { ...pr[blocId], pledged: true } }))}
          onAdopt={adoptPlatform}
        />
      )}

      {/* THE BLOCS, ALWAYS ON SCREEN ONCE THERE IS A PLATFORM */}
      {phase !== "intro" && platform.length > 0 && (
        <div className="px-4 sm:px-6 py-2 border-b border-stone-800 bg-stone-900/40 flex items-center gap-x-4 gap-y-1 flex-wrap text-xs">
          <span className="text-stone-500">PLATFORM</span>
          {platform.map(id => (
            <span key={id} className="text-amber-400 font-bold">{DEMAND_BY_ID[id]?.label}</span>
          ))}
          <span className="text-stone-700">|</span>
          {BLOCS.map(b => {
            const pr = blocPriorities[b.id] || {};
            const v = pr.defected ? 0 : blocSatisfaction(b.id, platform, blocPriorities, proven);
            return (
              <span key={b.id} className="flex items-center gap-1.5" title={pr.defected ? `${b.label} have walked` : b.blurb}>
                <span className="w-2 h-2" style={{ backgroundColor: pr.defected ? "#44403c" : b.hex }} />
                <span className={pr.defected ? "text-stone-600 line-through" : "text-stone-400"}>{b.label}</span>
                <span className={`font-bold ${pr.defected ? "text-red-500" : v < DEFECT_THRESHOLD ? "text-red-400" : v >= 65 ? "text-teal-400" : "text-stone-300"}`}>
                  {pr.defected ? "WALKED" : v}
                </span>
                {!pr.known && !pr.defected && <span className="text-stone-600" title="priority not yet heard">?</span>}
              </span>
            );
          })}
        </div>
      )}

      {/* INTRO */}
      {phase === "intro" && (
        <IntroSequence
          beats={act2IntroBeats(recruitedLeaders, contract)}
          visuals={{ roster: <IntroRosterVisual leaders={recruitedLeaders} /> }}
          doneLabel="BEGIN CAMPAIGN"
          onDone={() => setPhase("allocate")}
        />
      )}

      {/* ALLOCATE PHASE */}
      {phase === "allocate" && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          {employerEmboldened && (
            <div className="mb-4 flex items-center gap-2 text-red-400 text-sm border border-red-900 bg-red-950/40 px-3 py-2">
              <AlertTriangle size={14} /> Management across the company is on high alert after a lost election elsewhere. Retaliation is more likely everywhere.
            </div>
          )}
          {locations.some(l => l.status === "campaign") && unionizedCount < 2 && (
            <div className="mb-4 flex items-center gap-2 text-teal-400 text-sm border border-teal-900 bg-teal-950/20 px-3 py-2">
              <Vote size={14} /> You need 2 locations won, not 1 — keep organizing your other sites while this election plays out.
            </div>
          )}
          {(() => {
            const ready = locations.filter(l => l.status === "organizing" && filingGates(l, turn).every(g => g.pass));
            if (!ready.length) return null;
            return (
              <div className="mb-4 border-2 border-teal-700 bg-teal-950/20 px-3 py-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[16rem]">
                    <div className="font-stencil text-lg tracking-wide text-teal-400">
                      {ready.length === 1 ? `${ready[0].name} CAN FILE TODAY` : `${ready.length} SHOPS CAN FILE TODAY`}
                    </div>
                    <div className="text-xs text-stone-400 leading-relaxed mt-1">
                      Every gate is green, committee included. Filing starts a {ACT2_FILING_LEAD}-month clock you cannot stop, and the vote
                      rolls on true support, not morale. The last month to file is {ACT2_LAST_FILING_TURN}.
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {ready.map(l => (
                      <button key={l.id} onClick={() => fileForElection(l.id)}
                        className="font-stencil text-base bg-teal-600 hover:bg-teal-500 text-stone-950 px-5 py-2 tracking-wide transition-colors">
                        FILE — {l.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
          {moraleClimate.turnsLeft > 0 && (
            <div className={`mb-4 flex items-center gap-2 text-sm border px-3 py-2 ${moraleClimate.tone === "positive" ? "text-teal-400 border-teal-900 bg-teal-950/30" : moraleClimate.tone === "negative" ? "text-red-400 border-red-900 bg-red-950/40" : "text-amber-400 border-amber-900 bg-amber-950/30"}`}>
              <Radio size={14} /> National mood {moraleClimate.tone === "positive" ? "is energizing organizing everywhere" : moraleClimate.tone === "negative" ? "has knocked morale down everywhere" : "has workers both angrier and more anxious"} ({moraleClimate.turnsLeft} month{moraleClimate.turnsLeft === 1 ? "" : "s"} left).
            </div>
          )}
          {legalClimate.turnsLeft > 0 && (
            <div className={`mb-4 flex items-center gap-2 text-sm border px-3 py-2 ${legalClimate.tone === "favorable" ? "text-teal-400 border-teal-900 bg-teal-950/30" : "text-red-400 border-red-900 bg-red-950/40"}`}>
              <Scale size={14} /> Legal climate is currently {legalClimate.tone} — {legalClimate.tone === "favorable" ? "unfair labor practices are easier to prove and retaliation is less likely" : "employers are emboldened and retaliation is more likely"} ({legalClimate.turnsLeft} month{legalClimate.turnsLeft === 1 ? "" : "s"} left).
            </div>
          )}
          {employerSophistication > 0 && (
            <div className="mb-4 flex items-center gap-2 text-sm border border-purple-900 bg-purple-950/30 text-purple-300 px-3 py-2">
              <Brain size={14} /> Corporate has learned from past firings (level {employerSophistication}/3) — expect quiet buy-offs alongside the usual crackdowns.
            </div>
          )}
          {solidarityScore > 0 && (
            <div className="mb-4 flex items-center gap-2 text-sm border border-teal-900 bg-teal-950/30 text-teal-300 px-3 py-2">
              <UsersRound size={14} /> Solidarity network strength: {solidarityScore} — active sites get a steady morale lift and anti-union talk has a harder time catching or spreading.
            </div>
          )}

          {recruitedLeaders.length > 0 && (
            <div className="mb-4 border border-stone-800 bg-stone-900 p-3">
              <div className="text-xs text-stone-400 font-bold mb-2 tracking-wide">YOUR TEAM — click a leader, then click a site to station them there</div>
              <div className="flex flex-wrap gap-2">
                {recruitedLeaders.map((l, i) => {
                  const at = leaderDeployment[i] ? START_LOCATIONS.find(s => s.id === leaderDeployment[i])?.name : null;
                  const armed = armedLeader === i;
                  return (
                    <div key={i} className={`flex items-center gap-1.5 text-sm border px-2 py-1 ${armed ? "border-amber-500 bg-amber-950/30" : "border-stone-700"}`}>
                      <button onClick={() => armLeader(i)} className={`font-bold ${armed ? "text-amber-400" : "text-stone-200 hover:text-amber-300"}`}>
                        {l.name}
                      </button>
                      <span className="text-stone-500">{TRAIT_LABEL[l.trait]}</span>
                      {at ? (
                        <span className="text-teal-400">— at {at}</span>
                      ) : (
                        <span className="text-stone-600 italic">— on the bench</span>
                      )}
                      {leaderDeployment[i] !== undefined && (
                        <button onClick={() => recallLeader(i)} className="text-stone-500 hover:text-red-400"><X size={11} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
              {armedLeader != null && (
                <div className="mt-2 text-xs text-amber-400">Click a site on the map below to station {recruitedLeaders[armedLeader].name} there. Click their name again to cancel.</div>
              )}
            </div>
          )}

          <Act2NetworkMap
            locations={locations}
            allocations={allocations}
            deployedLeaders={deployedLeadersByLoc}
            ballotCtx={ballotCtx}
            onSelect={(loc) => { if (armedLeader != null) { deployArmedTo(loc.id); return; } setSelectedLoc(loc); }}
          />

          <div className="border-2 border-stone-800 bg-stone-900 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="font-stencil text-lg tracking-wide text-stone-200">ALLOCATE ORGANIZER TIME</div>
              <div className="flex items-center gap-2 flex-wrap">
                <HourPie
                  left={Math.max(0, remaining)}
                  total={weeklyBudget}
                  hex={remaining < 0 ? "#f87171" : remaining === 0 ? "#2dd4bf" : "#fbbf24"}
                  size={22}
                  label={`${Math.max(0, remaining)} of ${weeklyBudget} actions left this month`}
                />
                <span className={`text-xs font-bold ${remaining < 0 ? "text-red-500" : remaining === 0 ? "text-teal-400" : "text-stone-500"}`}>
                  {remaining < 0 ? `${Math.abs(remaining)} OVER` : remaining === 0 ? "ALL SPENT" : `${remaining} LEFT`}
                </span>
              </div>
            </div>
            {(!surveyDone || (platformOpen && platform.length >= PLATFORM_SLOTS)) && (
              <div className="mb-2 space-y-1.5">
                {!surveyDone && (
                  <label className={`flex items-start gap-2 text-xs border px-2 py-1.5 cursor-pointer ${surveyPlanned ? "border-sky-600 bg-sky-950/30 text-sky-200" : "border-sky-900 text-sky-300"}`}>
                    <input type="checkbox" checked={surveyPlanned} onChange={() => setSurveyPlanned(v => !v)} className="accent-amber-500 mt-0.5" />
                    <UsersRound size={12} className="shrink-0 mt-0.5" />
                    <span className="flex-1">
                      <span className="font-bold">Run a bargaining survey.</span> One a campaign, company-wide. Ask every worker what the union should be
                      asking for — and count how many hand it back. Above {Math.round(SURVEY_STRONG * 100)}% you learn what every bloc actually wants and you may
                      change one demand; above {Math.round(SURVEY_WEAK * 100)}% you learn one thing and still get the change; below that you learn nothing and
                      everybody finds out how few of them answered. Shops with a committee answer; shops without one mostly don't.
                    </span>
                    <CostPips hours={ACT2_SURVEY_COST} affordable={ACT2_SURVEY_COST <= remaining + surveyCost} />
                  </label>
                )}
                {platformOpen && platform.length >= PLATFORM_SLOTS && (
                  <button
                    onClick={() => setPhase("platform")}
                    className="w-full text-left border-2 border-amber-600 bg-amber-950/25 px-2 py-1.5 hover:bg-amber-950/50 transition-colors"
                  >
                    <div className="text-xs font-bold text-amber-300">THE SURVEY BOUGHT YOU ONE CHANGE — REVISE THE PLATFORM</div>
                    <div className="text-[11px] text-stone-400">Swap a single demand. You asked and they answered; this is what that answer is worth if you use it.</div>
                  </button>
                )}
              </div>
            )}
            {campaignUpkeep > 0 && (
              <div className="text-xs text-amber-400 border border-amber-900 bg-amber-950/20 px-2 py-1.5 mb-2">
                {campaignCount} shop{campaignCount === 1 ? " is" : "s are"} at the vote, which takes <span className="font-bold">{campaignUpkeep}</span> of
                this month off the top — hearings, the voter list, and a mandatory meeting somebody has to answer. That is spent before you allocate anything.
              </div>
            )}
            <div className={`text-xs mb-2 px-2 py-1.5 border ${organizer.stamina - staminaForecast.decay <= 25 ? "border-red-800 bg-red-950/25 text-red-300" : "border-stone-800 text-stone-400"}`}>
              <span className="text-stone-500">STAMINA</span>{" "}
              <span className="font-bold text-stone-200">{organizer.stamina}</span>
              {" → "}
              <span className={`font-bold ${staminaForecast.decay > 0 ? "text-amber-400" : "text-teal-400"}`}>
                {clamp(organizer.stamina - staminaForecast.decay, 0, ACT2_STAMINA_POOL)}
              </span>{" "}
              <span className="text-stone-500">
                after this month — {staminaForecast.why.join(", ")}. A crackdown anywhere costs 3 more.
                At zero the organizer is off for two months, and the second time that happens the campaign is over.
              </span>
            </div>
            {/* "Unassigned counts as rest" is already the first entry in every site's
                effort list and is already priced in the stamina forecast above. */}
            <p className="text-xs text-stone-500 mb-3">Click a site above to plan its month.</p>
            <button
              onClick={resolveTurn}
              disabled={totalAllocated > weeklyBudget}
              className={`w-full font-stencil text-lg py-2.5 tracking-wide transition-colors ${totalAllocated > weeklyBudget ? "bg-stone-800 text-stone-600 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-400 text-stone-950"}`}
            >
              {totalAllocated > weeklyBudget ? "OVER BUDGET — REDUCE ALLOCATION" : `RESOLVE MONTH ${turn}`}
            </button>
          </div>
        </div>
      )}

      {/* RESOLUTION — plays automatically on the network map, no click-through */}
      {resStep && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          <Act2NetworkMap
            locations={resStep.locs}
            deployedLeaders={deployedLeadersByLoc}
            ballotCtx={ballotCtx}
            onSelect={() => {}}
            highlights={resHighlights}
            edgePulses={resStep.edgePulses || []}
            stepKey={stepIndex}
            notes={resNotes}
          />
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex-1 min-h-[1.5rem] text-sm text-stone-400 font-mono">
              {resBanner.map((line, i) => <div key={`${stepIndex}-${i}`}>▸ {line}</div>)}
            </div>
            <button onClick={commitResolution} className="shrink-0 text-xs text-stone-500 hover:text-amber-400 underline transition-colors">
              SKIP ▸▸
            </button>
          </div>
          {resolutionSteps.slice(0, stepIndex + 1).some(s => s.lines.length > 0) && (
            <div ref={resLogRef} className="bg-stone-950/60 border border-stone-800 p-2 space-y-0.5 max-h-24 overflow-y-auto">
              {resolutionSteps.slice(0, stepIndex + 1).map((s, si) =>
                s.lines.map((line, li) => (
                  <div key={`${si}-${li}`} className={`text-xs font-mono ${si === stepIndex ? "text-stone-400" : "text-stone-600"}`}>▸ {line}</div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ESCALATION DECISION */}
      {phase === "escalation" && escLoc && (
        <EscalationModal
          loc={escLoc}
          turn={turn}
          factor={turnoutFactorFor(escLoc)}
          ballotCtx={ballotCtx}
          onFile={() => fileForElection(escLoc.id)}
          onConsolidate={consolidate}
          onPivot={() => pivotAway(escLoc.id)}
        />
      )}

      {/* GAME OVER */}
      {(phase === "gameover-win" || phase === "gameover-loss") && (
        <div className="max-w-xl mx-auto px-6 py-20 text-center anim-rise">
          <div className={`font-stencil text-5xl mb-4 ${phase === "gameover-win" ? "text-teal-400" : "text-red-500"}`}>
            {phase === "gameover-win" ? "TWO SHOPS CERTIFIED" : "CAMPAIGN OVER"}
          </div>
          <p className="text-stone-400 mb-6 leading-relaxed">
            {phase === "gameover-win"
              ? `Two studios voted to unionize, and the labor board certifies both. Certification obliges the company to bargain, not to agree — the first contract is the next fight, and the committees you built are what win it.`
              : organizer.breaksTaken >= 2
                ? `The organizer burned out for a second time and left the campaign. There was no one left to carry it forward.`
                : deadReason
                  ? deadReason
                  : `Twelve months came and went without enough studios reaching a certified vote. The campaign didn't build the power it needed in time.`}
          </p>
          {phase === "gameover-loss" && deadReason && turn < TOTAL_TURNS && (
            <p className="text-red-400/80 text-sm mb-6 leading-relaxed border border-red-900/60 bg-red-950/20 px-4 py-3">
              Called at month {turn} of {TOTAL_TURNS}. There were months left on the clock, but not enough shops left to reach {ACT2_SITES_NEEDED}
              — so the rest of the calendar wouldn't have changed the ending. Nothing here resets.
            </p>
          )}
          <div className="grid grid-cols-4 gap-2 mb-8 text-sm">
            {locations.map(l => (
              <div key={l.id} className="border border-stone-800 p-2">
                <div className="text-stone-500 mb-1">{l.name}</div>
                <div className={statusMeta[l.status].color}>{statusMeta[l.status].label}</div>
              </div>
            ))}
          </div>
          <button onClick={restartGame} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
            RUN IT BACK
          </button>
          {onFullRestart && (
            <button onClick={onFullRestart} className="block mx-auto mt-3 text-sm text-stone-500 hover:text-stone-300 underline">
              Start over from the shop floor
            </button>
          )}
        </div>
      )}

      {/* LOCATION ACTION PANEL */}
      {selectedLoc && (
        <LocationActionModal
          loc={locations.find(l => l.id === selectedLoc.id) || selectedLoc}
          turn={turn}
          allocation={allocations[selectedLoc.id] || 0}
          response={responses[selectedLoc.id] || {}}
          priorities={blocPriorities}
          remaining={remaining}
          factor={turnoutFactorFor(locations.find(l => l.id === selectedLoc.id) || selectedLoc)}
          platform={platform}
          proven={proven}
          ballotCtx={ballotCtx}
          onFile={() => fileForElection(selectedLoc.id)}
          onSetUnits={(units) => updateAlloc(selectedLoc.id, units)}
          sitDownsLeft={Math.max(0, ACT2_ONE_ON_ONES_PER_TURN - sitDownsBooked)}
          onSitDown={(wid) => toggleSitDown(selectedLoc.id, wid)}
          onToggleResponse={(key) => toggleResponse(selectedLoc.id, key)}
          onClose={() => setSelectedLoc(null)}
        />
      )}
    </div>
  );
}

// ---------- CAN THIS STILL BE WON? ----------
// Permadeath means the game owes you the truth the moment it stops being winnable,
// and it owes you the specific reason. No quietly playing out a dead campaign.
const ACT2_SITES_NEEDED = 2;
// The four gates on a petition. Each one passes or it doesn't — the escalation prompt,
// the site panel, the banner and the filing itself all read this one list.
function filingGates(loc, turn) {
  const recruitedPct = loc.recruited / loc.workers;
  return [
    { id: "morale", label: "MORALE", val: loc.morale, pass: loc.morale >= 70, req: "\u2265 70" },
    { id: "recruited", label: "RECRUITED", val: `${Math.round(recruitedPct * 100)}%`, pass: recruitedPct >= 0.3, req: "\u2265 30%" },
    { id: "legal", label: "LEGAL RISK", val: loc.legalRisk, pass: loc.legalRisk < 75, req: "< 75" },
    { id: "clock", label: "WEEK", val: turn, pass: turn <= ACT2_LAST_FILING_TURN, req: `\u2264 ${ACT2_LAST_FILING_TURN}` },
    // The gate the campaign research is loudest about. A representative committee of
    // the workers themselves, before the petition, is the strongest single predictor of
    // winning the vote — and mechanically it is the only thing that lets anyone in this
    // shop count honestly, so filing without one is filing blind.
    { id: "committee", label: "COMMITTEE", val: loc.committee?.active ? "yes" : "no", pass: !!loc.committee?.active, req: "built" },
  ];
}
// `turn` is the next turn the player can act on: a site still organizing can only
// deliver if a petition filed that turn reaches its vote by the end of the calendar.
function act2Winnability(locations, turn) {
  const won = locations.filter(l => l.status === "won").length;
  const needed = ACT2_SITES_NEEDED - won;
  if (needed <= 0) return { alive: true, won, needed: 0, salvageable: [], reason: null };
  // A site can still deliver if it's already at the vote, or has room to file and vote.
  const salvageable = locations.filter(l => {
    if (l.status === "won" || l.status === "lost") return false;
    if (l.status === "campaign") return l.electionTurn <= TOTAL_TURNS;
    return turn <= ACT2_LAST_FILING_TURN;
  });
  if (salvageable.length < needed) {
    const dead = locations.filter(l => l.status === "lost").length;
    // Name the actual cause: shops you lost, or a clock that ran out on the ones left.
    const blockedByClock = locations.filter(
      l => l.status !== "won" && l.status !== "lost" && !salvageable.includes(l)
    ).length;
    return {
      alive: false, won, needed, salvageable,
      reason: blockedByClock > 0
        ? `${blockedByClock} shop${blockedByClock === 1 ? " is" : "s are"} still organizing, but none can file and reach a vote before month ${TOTAL_TURNS} — the last month to file was ${ACT2_LAST_FILING_TURN}. You needed ${needed} more.`
        : `${dead} election${dead === 1 ? " has" : "s have"} already come back NO. There aren't enough shops left standing to reach ${ACT2_SITES_NEEDED}.`,
    };
  }
  return { alive: true, won, needed, salvageable, reason: null };
}

// ---------- THE BALLOT ----------
// A shop's election is decided the way Act One's is: one ballot per worker, each with
// their own odds, counted up. Not one Math.random() against an aggregate probability —
// that made a well-run campaign lose a quarter of the time for no reason the player
// could see, and it meant the margin said nothing about the work.
//
// The curve is NOT Act One's. There, `trueSupport` is what one named person would do
// with a card in front of them and it runs in the 40s. Here it is a whole shop's
// aggregate standing and it runs in the 70s and 80s, so this needs its own pivot and
// span. A shop sitting at PIVOT + SPAN/2 is the coin flip.
const ACT2_BALLOT_PIVOT = 12;
const ACT2_BALLOT_SPAN = 100;
// No shop is uniform. A shop at 70 is carrying people at 52 and people at 88, and the
// ones at both ends are the ones who reliably turn up. Spread is deterministic in
// shape — the site's own number decides the distribution, and only voting is random.
const ACT2_BALLOT_SPREAD = 18;
// Fear works on the ballot twice, and both of them land on YOUR half of the room.
// Nobody stays home out of fear of voting no, and nobody is frightened into voting for
// a union — so both terms are weighted by how much of a worker is on your side.
//
// It empties the room: a frightened yes stays at their desk. On its own this is a much
// weaker weapon than it looks, because thinning both piles in proportion changes the
// turnout and not the result — which is why the second term has to exist.
const ACT2_FEAR_TURNOUT = 0.45;
// And it moves the marginal vote. A worker who believes the company will find out and
// remember votes the safe way. This is the term that lets a fear campaign actually take
// a close shop off you, and it is worth about 20 points of win chance across the range
// the employer's counter-campaign can reach.
const ACT2_FEAR_YES = 0.18;

function act2Standings(trueSupport, n) {
  return Array.from({ length: n }, (_, i) =>
    clamp(Math.round(trueSupport + ACT2_BALLOT_SPREAD * (n === 1 ? 0 : (2 * i) / (n - 1) - 1))));
}
function act2YesChance(standing, recruited, fear = 0) {
  return Math.min(0.93, Math.max(0.02,
    (standing - ACT2_BALLOT_PIVOT) / ACT2_BALLOT_SPAN
    - ACT2_FEAR_YES * (fear / 100)
    + (recruited ? 0.08 : 0)));
}
// People with strong feelings in either direction vote. The torn stay at their desks,
// fear keeps more of them there, and the platform decides whose turnout it suppresses —
// which is what "the people you didn't write into the platform stayed home" means.
function act2TurnoutChance(yes, fear, factor, recruited) {
  const conviction = Math.abs(yes - 0.5) * 2;
  const base = 0.55 + 0.30 * conviction + (recruited ? 0.06 : 0);
  // Both the employer's fear campaign and your own platform act on your voters, not on
  // theirs. `yes` is how much of this person is on your side of the ballot.
  const mobilization = 1 - ACT2_FEAR_TURNOUT * (fear / 100) * yes + (factor - 1) * yes;
  return Math.min(0.96, Math.max(0.05, base * mobilization));
}
// The shop as a list of voters. The recruited are the most convinced end of the floor,
// which is what finally gives the recruitment number a job at the ballot box instead of
// only being a gate on the petition.
function act2Ballot(loc, factor = 1, ctx = null) {
  const n = loc.workers;
  const signedUp = Math.min(n, loc.recruited || 0);
  // The roster if the shop has one, and the old synthesised spread if it does not, so
  // nothing downstream has to care which.
  const people = loc.roster && loc.roster.length
    ? loc.roster.map(w => ({ w, standing: act2Standing(loc, w, ctx) }))
    : act2Standings(loc.trueSupport ?? loc.morale, n).map(standing => ({ w: null, standing }));
  // The recruited are the most convinced end of the floor, whoever they turn out to be.
  const order = [...people].sort((a, b) => a.standing - b.standing);
  const recruitedSet = new Set(order.slice(order.length - signedUp).map(x => x.w?.id ?? x.standing));
  return people.map(({ w, standing }) => {
    const recruited = recruitedSet.has(w?.id ?? standing);
    const yes = act2YesChance(standing, recruited, loc.fear);
    return { worker: w, standing, recruited, yes, turnout: act2TurnoutChance(yes, loc.fear, factor, recruited) };
  });
}
function act2Projection(loc, factor = 1, ctx = null) {
  let yes = 0, no = 0, out = 0;
  act2Ballot(loc, factor, ctx).forEach(v => {
    yes += v.turnout * v.yes; no += v.turnout * (1 - v.yes); out += 1 - v.turnout;
  });
  return { yes: Math.round(yes), no: Math.round(no), out: Math.round(out) };
}
// The exact odds, by walking the distribution of (yes - no) over the whole shop. It is
// a dozen workers, so this is cheap — and it means the percentage the player is quoted
// before filing is the percentage the ballot actually rolls, rather than a formula that
// approximates it.
function act2WinChance(loc, factor = 1, ctx = null) {
  let dist = new Map([[0, 1]]);
  act2Ballot(loc, factor, ctx).forEach(v => {
    const next = new Map();
    const add = (k, p) => { if (p > 0) next.set(k, (next.get(k) || 0) + p); };
    dist.forEach((p, k) => {
      add(k + 1, p * v.turnout * v.yes);
      add(k - 1, p * v.turnout * (1 - v.yes));
      add(k, p * (1 - v.turnout));
    });
    dist = next;
  });
  let win = 0;
  dist.forEach((p, k) => { if (k > 0) win += p; }); // a tie is not a majority
  return win;
}
// Cast it. Every worker decides whether to show up, then how to vote.
function act2CastBallot(loc, factor = 1, ctx = null) {
  let yes = 0, no = 0, out = 0;
  const stayed = [];
  act2Ballot(loc, factor, ctx).forEach(v => {
    if (Math.random() >= v.turnout) { out += 1; if (v.worker) stayed.push(v.worker); return; }
    if (Math.random() < v.yes) yes += 1; else no += 1;
  });
  return { yes, no, out, cast: yes + no, won: yes > no, stayed };
}

// ---------- SUBCOMPONENTS ----------

// A bar with the cliff drawn on it. Knowing a number is 54 is useless without knowing
// that 60 is where management starts firing people.
function Meter({ label, value, icon, colorClass = "bg-amber-500", danger = false, thresholds = [], ghost = null, ghostLabel = null, delta = null }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-stone-500 mb-0.5">
        <span className="flex items-center gap-1">{icon}{label}</span>
        <span className="flex items-center gap-2">
          {delta != null && delta !== 0 && (
            <span className={`font-bold ${delta > 0 ? "text-teal-400" : "text-red-400"}`}>{delta > 0 ? "+" : ""}{delta}</span>
          )}
          <span className={`font-bold ${danger ? "text-red-400" : "text-stone-300"}`}>{value}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-stone-800 relative">
        <div className={`h-2 ${danger ? "bg-red-600" : colorClass} transition-all duration-500`} style={{ width: `${value}%` }} />
        {ghost != null && (
          <div
            className="absolute top-0 h-2 border-r-2 border-dashed border-stone-300/70"
            style={{ width: `${ghost}%` }}
            title={ghostLabel || "true support"}
          />
        )}
        {thresholds.map(t => (
          <div
            key={t.at}
            className="absolute top-[-2px] h-3 w-px"
            style={{ left: `${t.at}%`, backgroundColor: t.hex || "#78716c" }}
            title={t.label}
          />
        ))}
      </div>
      {thresholds.length > 0 && (
        <div className="relative h-3 mt-0.5">
          {thresholds.map(t => (
            <span key={t.at} className="absolute text-[9px] whitespace-nowrap"
              style={{ left: `${t.at}%`, transform: "translateX(-50%)", color: t.hex || "#78716c" }}>{t.tick || t.at}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackControls({ loc, response, priorities = null, onToggle }) {
  // Once the petition is in, nothing on this list still applies except the one thing
  // that decides the vote — so the campaign gets the committee row and nothing else.
  const campaign = loc.status === "campaign";
  // Organizing: documenting is for the band where management has started watching but
  // has not moved yet. At the vote there is no band — you are already the loudest thing
  // in the building — so it is on offer every week.
  const inCrackdownBand = campaign ? !loc.documented : (loc.visibility >= 40 && loc.visibility < 60);
  const recruitedPct = loc.recruited / loc.workers;
  const leadersFound = metLeaders(loc);
  const numbersReady = !loc.committee?.active && loc.morale >= COMMITTEE_MORALE_REQ && recruitedPct >= COMMITTEE_RECRUIT_PCT_REQ;
  const committeeEligible = numbersReady && leadersFound.length > 0;
  const bargainable = !campaign && priorities && BLOCS.some(b => (LOC_COMPOSITION[loc.id]?.[b.id] || 0) >= 0.5 && !priorities[b.id]?.known);
  const hasAny = campaign
    ? (committeeEligible || inCrackdownBand)
    : (loc.grievance || inCrackdownBand || loc.antiUnion?.active || loc.buyOff?.active || committeeEligible || bargainable);
  if (!hasAny) return null;

  return (
    <div className="mt-2 space-y-1.5 border-t border-stone-800 pt-2">
      {!campaign && loc.grievance && (() => {
        const meta = GRIEVANCE_META[loc.grievance.type];
        const Icon = meta.icon;
        const autoHandled = loc.committee?.active && loc.grievance.type !== "legal";
        if (autoHandled) {
          return (
            <div className={`flex items-center gap-2 text-xs border px-2 py-1 ${meta.tone} opacity-70`}>
              <Icon size={12} />
              <span className="flex-1"><span className="font-bold">{meta.label}.</span> The shop committee is handling this one — no organizer time needed.</span>
            </div>
          );
        }
        return (
          <label className={`flex items-center gap-2 text-xs border px-2 py-1 cursor-pointer ${meta.tone} ${response.grievance ? "bg-stone-800" : ""}`}>
            <input type="checkbox" checked={!!response.grievance} onChange={() => onToggle("grievance")} className="accent-amber-500" />
            <Icon size={12} />
            <span className="flex-1"><span className="font-bold">{meta.label}.</span> {meta.action}</span><CostPips hours={meta.cost} />
          </label>
        );
      })()}
      {inCrackdownBand && (
        <label className="flex items-center gap-2 text-xs border border-stone-600 text-stone-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.document} onChange={() => onToggle("document")} className="accent-amber-500" />
          <Radio size={12} />
          <span className="flex-1">
            <span className="font-bold">{campaign ? "They will move on somebody before the ballot." : "Management is watching closer."}</span>{" "}
            {campaign
              ? "Keep the dates, the names and who was in the room — a crackdown you can file a charge over costs less than half the fear"
              : "Document it"}
          </span><CostPips hours={1} />
        </label>
      )}
      {!campaign && loc.antiUnion?.active && (
        <label className="flex items-center gap-2 text-xs border border-red-800 text-red-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.counter} onChange={() => onToggle("counter")} className="accent-amber-500" />
          <Megaphone size={12} />
          <span className="flex-1"><span className="font-bold">Anti-union talk is spreading.</span> Counter-message</span><CostPips hours={1} />
        </label>
      )}
      {!campaign && loc.buyOff?.active && (
        <label className="flex items-center gap-2 text-xs border border-teal-800 text-teal-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.reframe} onChange={() => onToggle("reframe")} className="accent-amber-500" />
          <HandCoins size={12} />
          <span className="flex-1"><span className="font-bold">Management just announced a retention bonus.</span> Reframe it as a union win</span><CostPips hours={1} />
        </label>
      )}
      {(() => {
        // Listening to a bloc is an action like any other. It reveals what they
        // actually want and how hard, and buys goodwill just for having asked.
        const comp = LOC_COMPOSITION[loc.id] || {};
        const thick = BLOCS.filter(b => (comp[b.id] || 0) >= 0.5);
        const target = thick.find(b => !(priorities?.[b.id]?.known)) || null;
        if (!target || !priorities) return null;
        return (
          <label className="flex items-center gap-2 text-xs border border-sky-800 text-sky-300 px-2 py-1 cursor-pointer">
            <input type="checkbox" checked={!!response.bargain} onChange={() => onToggle("bargain")} className="accent-amber-500" />
            <UsersRound size={12} />
            <span className="flex-1">
              <span className="font-bold">{target.label} are {Math.round((comp[target.id] || 0) * 100)}% of this shop.</span>{" "}
              Sit down and hear them out — reveals what they actually want and how hard
            </span>
            <CostPips hours={2} />
          </label>
        );
      })()}
      {committeeEligible && (
        <label className="flex items-center gap-2 text-xs border border-amber-600 text-amber-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.formCommittee} onChange={() => onToggle("formCommittee")} className="accent-amber-500" />
          <UsersRound size={12} />
          <span className="flex-1">
            <span className="font-bold">{campaign ? "Still no shop committee, and the vote is coming." : `${leadersFound.map(w => w.name).join(" and ")} can carry a committee.`}</span>{" "}
            {campaign
              ? "Build one now — it is the only thing left that changes the count, and it costs more under a running clock"
              : "Build it around them — the petition needs it, and it is what lets anyone here count honestly"}
          </span><CostPips hours={campaign ? COMMITTEE_COST_CAMPAIGN : COMMITTEE_COST} />
        </label>
      )}
      {numbersReady && !leadersFound.length && (
        <div className="flex items-center gap-2 text-xs border border-stone-700 text-stone-500 px-2 py-1">
          <UsersRound size={12} />
          <span className="flex-1">
            <span className="font-bold text-stone-400">The numbers here are ready for a committee. You have not found anyone to build it around.</span>{" "}
            A committee is the people the floor already follows. Sit down with them and find out who those are.
          </span>
        </div>
      )}
    </div>
  );
}

function Act2NetworkMap({ locations, allocations = {}, onSelect, edgePulses = [], stepKey = 0, highlights = null, deployedLeaders = {}, notes = null, ballotCtx = null }) {
  const [hoverId, setHoverId] = useState(null);
  const hovered = locations.find(l => l.id === hoverId);
  const clusterRadius = (loc) => 8 + Math.min(5, Math.round(loc.workers / 3));
  const moraleHex = (loc) => (loc.morale >= 70 ? "#2dd4bf" : loc.morale >= 30 ? "#a8a29e" : "#f87171");

  // Static faint edges — the shared channels and cross-site friend groups the flavor text
  // describes are drawn once, always visible, so pulses have a network to travel along.
  const pairs = [];
  const ids = locations.map(l => l.id);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);

  return (
    <div className="border-2 border-stone-800 bg-stone-900 card-perf mb-6">
      <div className="flex items-center justify-between px-3 pt-2">
        <div className="font-stencil text-lg tracking-wide text-stone-200">THE COMPANY</div>
        <div className="flex items-center gap-3 text-[11px] text-stone-500">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-teal-400" /> MORALE 70+</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-stone-400" /> MID</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-400" /> LOW</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block rounded-full bg-stone-500" style={{ width: 5, height: 5 }} />
            <span className="inline-block rounded-full bg-stone-500" style={{ width: 10, height: 10 }} />
            SIZE = WORKFORCE
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block rounded-full border border-stone-400" style={{ width: 7, height: 7 }} />
            HOLLOW = TALK, NOT VOTES
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full block select-none">
        <defs>
          <marker id="site-arrow-hot-up" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#2dd4bf" />
          </marker>
          <marker id="site-arrow-hot-down" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#f87171" />
          </marker>
        </defs>

        {pairs.map(([a, b], i) => {
          const pa = ACT2_LAYOUT[a], pb = ACT2_LAYOUT[b];
          if (!pa || !pb) return null;
          return <line key={`edge-${i}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#57534e" strokeWidth="0.3" strokeOpacity="0.35" strokeDasharray="1.5 1.5" />;
        })}

        {edgePulses.map((ev, i) => {
          const a = ACT2_LAYOUT[ev.from], b = ACT2_LAYOUT[ev.to];
          if (!a || !b) return null;
          const hot = ev.tone === "down" ? "#f87171" : "#2dd4bf";
          return (
            <line
              key={`pulse-${stepKey}-${i}`}
              className="edge-pulse"
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              pathLength="20"
              stroke={hot}
              strokeWidth="1"
              markerEnd={ev.tone === "down" ? "url(#site-arrow-hot-down)" : "url(#site-arrow-hot-up)"}
            />
          );
        })}

        {locations.map(loc => {
          const p = ACT2_LAYOUT[loc.id];
          if (!p) return null;
          const r = clusterRadius(loc);
          const dim = loc.status === "won" || loc.status === "lost" || loc.status === "abandoned";
          const escalationReady = loc.status === "organizing" && loc.morale >= 70;
          const needsResponse = loc.grievance || loc.antiUnion?.active || loc.buyOff?.active || (loc.visibility >= 40 && loc.visibility < 60);
          const allocation = allocations[loc.id];
          const hl = highlights ? highlights[loc.id] : null;
          const leader = deployedLeaders[loc.id];
          // One dot per actual person on the roster, so the circle is the shop rather
          // than a decoration sized like it.
          const people = loc.roster && loc.roster.length ? loc.roster : null;
          const dotCount = people ? people.length : Math.min(9, Math.max(3, Math.round(loc.workers / 2)));
          const dots = Array.from({ length: dotCount }, (_, i) => {
            const ang = (2 * Math.PI * i) / dotCount - Math.PI / 2;
            const rr = r * (dotCount > 9 ? 0.62 : 0.55);
            return { x: Math.cos(ang) * rr, y: Math.sin(ang) * rr, w: people ? people[i] : null };
          });
          return (
            <g
              key={loc.id}
              transform={`translate(${p.x} ${p.y})`}
              opacity={dim ? 0.4 : 1}
              className="cursor-pointer"
              onClick={() => onSelect(loc)}
              onMouseEnter={() => setHoverId(loc.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              {escalationReady && (
                <circle r={r + 2.5} fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1.4 1" />
              )}
              {loc.committee?.active && (
                <circle className="leader-pulse" r={r + 1.6} fill="none" stroke="#2dd4bf" strokeWidth="0.4" strokeOpacity="0.6" />
              )}
              {hl && hl.statusChanged && (
                <circle
                  key={`flash-${stepKey}-${loc.id}`}
                  className="ring-flash"
                  r={r + 2.8}
                  fill="none"
                  stroke={loc.status === "won" ? "#2dd4bf" : loc.status === "lost" ? "#f87171" : "#fbbf24"}
                />
              )}
              <circle r={r} fill="#1c1917" stroke={ACT2_STATUS_HEX[loc.status]} strokeWidth="0.9" />
              {/* Each dot is a worker. Filled = morale; the hollow ones past the true-support
                  share are the people who talk warmer than they'd vote. */}
              {(() => {
                const known = !!loc.committee?.active;
                // Without a committee you only see the warm surface: every dot filled.
                // With one you see each person, and the hollow dots are the specific
                // people who talk warmer than they would vote.
                if (!known) {
                  return dots.map((d, i) => (
                    <circle key={i} cx={d.x} cy={d.y} r="1.1" fill={moraleHex(loc)} strokeOpacity="0.7" />
                  ));
                }
                if (!people) {
                  const realShare = (loc.trueSupport ?? loc.morale) / 100;
                  const solidUpTo = Math.round(dots.length * realShare / Math.max(0.01, loc.morale / 100));
                  return dots.map((d, i) => {
                    const solid = i < solidUpTo;
                    return (
                      <circle
                        key={i} cx={d.x} cy={d.y} r="1.1"
                        fill={solid ? moraleHex(loc) : "none"}
                        stroke={moraleHex(loc)} strokeWidth={solid ? 0 : 0.4} strokeOpacity="0.7"
                      />
                    );
                  });
                }
                return dots.map((d, i) => {
                  const pr = ballotCtx?.priorities;
                  const walked = !!(pr?.[d.w.status]?.defected || pr?.[d.w.tenure]?.defected);
                  const solid = !walked && act2Standing(loc, d.w, ballotCtx) >= 50;
                  return (
                    <circle
                      key={i} cx={d.x} cy={d.y} r="1.1"
                      fill={solid ? moraleHex(loc) : "none"}
                      stroke={walked ? "#57534e" : moraleHex(loc)} strokeWidth={solid ? 0 : 0.4} strokeOpacity="0.7"
                    />
                  );
                });
              })()}
              {hl && hl.moraleDelta !== 0 && (
                <text
                  key={`delta-${stepKey}-${loc.id}`}
                  className="delta-float"
                  textAnchor="middle"
                  y={-(r + 3)}
                  fontSize="3.6"
                  fontWeight="bold"
                  fill={hl.moraleDelta > 0 ? "#2dd4bf" : "#f87171"}
                  fontFamily="'Courier New', monospace"
                >{hl.moraleDelta > 0 ? "+" : ""}{hl.moraleDelta}</text>
              )}
              <text textAnchor="middle" y={r + 5} fontSize="3.6" fill="#e7e5e4" fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.1">{loc.name}</text>
              <text textAnchor="middle" y={r + 9} fontSize="2.6" fill={ACT2_STATUS_HEX[loc.status]} fontFamily="'Courier New', monospace">{statusMeta[loc.status].label}</text>
              {allocation > 0 && (
                <g>
                  {Array.from({ length: allocation }).map((_, i) => (
                    <circle key={i} cx={(i - (allocation - 1) / 2) * 2.6} cy={r + 12} r="0.95" fill="#fbbf24" />
                  ))}
                </g>
              )}
              {needsResponse && !dim && (
                <circle cx={r * 0.75} cy={-r * 0.75} r="1.6" fill="#f87171" />
              )}
              {leader && (
                <g transform={`translate(${-r * 0.8} ${-r * 0.8})`}>
                  <circle r="2.1" fill="#1c1917" stroke="#fbbf24" strokeWidth="0.6" />
                  <text textAnchor="middle" dominantBaseline="central" fontSize="2.6" fill="#fbbf24" fontFamily="Impact, 'Arial Black', sans-serif">{leader.name[0]}</text>
                </g>
              )}
              {notes && notes[loc.id] && (
                <g key={`note-${stepKey}-${loc.id}`} className="note-float">
                  <rect x={-24} y={-(r + 17)} width={48} height={8.5} rx={1.2} fill="#1c1917" stroke="#57534e" strokeWidth="0.3" />
                  <text x={0} y={-(r + 12.3)} textAnchor="middle" fontSize="2.5" fill="#e7e5e4" fontFamily="'Courier New', monospace">{truncateNote(notes[loc.id], 46)}</text>
                </g>
              )}
            </g>
          );
        })}

      </svg>
      <div className="border-t border-stone-800 px-3 py-2 min-h-[3.25rem]">
        {hovered ? (
          <div className="text-xs text-stone-400 leading-snug">
            <span className={`font-bold ${statusMeta[hovered.status].color}`}>{hovered.name}</span>
            <span className="text-stone-500"> — {statusMeta[hovered.status].label}. Morale {hovered.morale}, visibility {hovered.visibility}, {hovered.recruited}/{hovered.workers} recruited.</span>
            {hovered.committee?.active && <span className="text-teal-400"> Shop committee active — organizing here no longer depends entirely on you.</span>}
            {hovered.antiUnion?.active && <span className="text-red-400"> Anti-union talk circulating — can spread to other sites if unanswered.</span>}
            {deployedLeaders[hovered.id] && <span className="text-amber-400"> {deployedLeaders[hovered.id].name} is stationed here — strong on {TRAIT_LABEL[deployedLeaders[hovered.id].trait]}.</span>}
          </div>
        ) : (
          <div className="text-xs text-stone-600 italic">
            Anti-union talk and momentum both travel these lines. Hover a site for details, click to plan.
          </div>
        )}
      </div>
    </div>
  );
}

function LocationActionModal({ loc, turn, allocation, response, priorities = null, remaining = 99, factor = 1, platform = [], proven = [], ballotCtx = null, sitDownsLeft = 0, onSitDown = null, onFile = null, onSetUnits, onToggleResponse, onClose }) {
  const booking = response?.sitDown || [];
  const canSitDown = !!onSitDown && (sitDownsLeft > 0 || booking.length > 0) && remaining >= ACT2_SITDOWN_COST;
  const meta = statusMeta[loc.status];
  const isCampaign = loc.status === "campaign";
  const isOrganizing = loc.status === "organizing";
  const tiers = isCampaign ? ACT2_CAMPAIGN_TIERS : ACT2_EFFORT_TIERS;
  const canAct = isCampaign || isOrganizing;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-stone-900 border-2 border-stone-700 max-w-md w-full p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-stencil text-2xl text-amber-400">{loc.name}</div>
          <button onClick={onClose}><X size={18} className="text-stone-500 hover:text-stone-200" /></button>
        </div>
        <div className={`text-sm font-bold mb-4 ${meta.color}`}>{meta.label}</div>

        <div className="space-y-4 mb-4">
          <Meter
            label="MORALE (what the floor says)"
            value={loc.morale}
            icon={<CheckCircle2 size={11} />}
            colorClass="bg-teal-500"
            ghost={loc.committee?.active ? loc.trueSupport : null}
            ghostLabel="true support, as the committee reports it"
            thresholds={[{ at: 70, hex: "#2dd4bf", tick: "70 file" }]}
          />
          {loc.committee?.active ? (
            <div className="text-xs -mt-2.5">
              <span className="text-stone-500">TRUE SUPPORT</span>{" "}
              <span className="font-bold text-amber-400">{loc.trueSupport}</span>
              <span className="text-stone-500"> — the dashed line. The vote rolls against this, not morale.</span>
              {loc.morale - loc.trueSupport >= 12 && (
                <span className="text-red-400 font-bold"> {loc.morale - loc.trueSupport} points of it is talk.</span>
              )}
            </div>
          ) : (
            <div className="text-xs -mt-2.5 text-stone-600 italic">
              True support unknown — no shop committee here to report honestly. The vote rolls against a number you cannot see.
            </div>
          )}
          <Meter
            label="VISIBILITY"
            value={loc.visibility}
            icon={<Eye size={11} />}
            danger={loc.visibility >= 60}
            thresholds={[{ at: 40, hex: "#fbbf24", tick: "40 watched" }, { at: 60, hex: "#f87171", tick: "60 retaliation" }]}
          />
          <Meter
            label="LEGAL RISK"
            value={loc.legalRisk}
            icon={<Scale size={11} />}
            danger={loc.legalRisk >= 60}
            thresholds={[{ at: 75, hex: "#f87171", tick: "75 cannot file" }]}
          />
          {isCampaign && (
            <Meter
              label="WORKER FEAR"
              value={loc.fear}
              icon={<AlertTriangle size={11} />}
              danger={loc.fear >= 60}
              thresholds={[{ at: 60, hex: "#f87171", tick: "60 turnout collapses" }]}
            />
          )}
        </div>

        {/* The count, as it stands today. This is the number the campaign is actually
            fighting over, so it belongs where the player decides what to spend here. */}
        {isCampaign && (
          loc.committee?.active ? (() => {
            const odds = act2WinChance(loc, factor, ballotCtx);
            const p = act2Projection(loc, factor, ballotCtx);
            return (
              <div className="border border-stone-700 bg-stone-950/60 px-3 py-2 mb-4">
                <div className="text-xs text-stone-500 tracking-wide mb-1">THE COUNT, ON TODAY'S NUMBERS</div>
                <div className="flex items-center gap-4 text-base">
                  <span className="text-teal-400 font-bold">{p.yes} YES</span>
                  <span className="text-red-400 font-bold">{p.no} NO</span>
                  <span className="text-stone-500">{p.out} won't vote</span>
                  <span className={`ml-auto font-bold ${odds >= 0.7 ? "text-teal-400" : odds >= 0.5 ? "text-amber-400" : "text-red-400"}`}>
                    {Math.round(odds * 100)}%
                  </span>
                </div>
                {/* The escalation prompt states the ballot rule at the moment you file,
                    and the yes/no projection above shows it. What is left here is the part
                    no number on this panel explains: what fear actually does. */}
                <div className="text-xs text-stone-500 mt-1 leading-snug">
                  Fear keeps your people at their desks rather than changing their vote, and every month of the employer's campaign is a month it goes up.
                </div>
              </div>
            );
          })() : (
            <div className="border border-amber-800 bg-amber-950/20 text-amber-300 px-3 py-2 mb-4 text-xs leading-snug">
              No shop committee here, so nobody is counting honestly. You are running a campaign without knowing the count.
            </div>
          )
        )}

        <div className="text-xs text-stone-500 space-y-1 font-mono mb-4">
          <div>
            Manager: <span className="text-stone-200">{loc.manager}</span>{" "}
            <span className={loc.manager === "hostile" ? "text-red-400" : loc.manager === "sympathetic" ? "text-teal-400" : "text-stone-600"}>
              {loc.manager === "hostile"
                ? "(+4 visibility every month you organize here, and they can retaliate below the usual threshold)"
                : loc.manager === "sympathetic"
                ? "(+3 morale per active month, \u22122 visibility)"
                : "(no modifier)"}
            </span>
          </div>
          <div>Recruited: <span className="text-stone-200">{loc.recruited}/{loc.workers}</span> ({Math.round((loc.recruited / loc.workers) * 100)}%)</div>
          {platform.length >= PLATFORM_SLOTS && priorities && (() => {
            // The platform read through the people who actually work here. Same number
            // the vote uses, shown every week instead of once at the count.
            const comp = LOC_COMPOSITION[loc.id] || {};
            const thick = BLOCS.filter(b => (comp[b.id] || 0) >= 0.5)
              .map(b => ({ b, sat: priorities[b.id]?.defected ? 0 : blocSatisfaction(b.id, platform, priorities, proven) }))
              .sort((x, y) => x.sat - y.sat);
            return (
              <div className={factor < 0.95 ? "text-red-400" : factor > 1.05 ? "text-teal-400" : "text-stone-400"}>
                Platform here: <span className="font-bold">{Math.round(factor * 100)}%</span>
                <span className="text-stone-500">
                  {" — "}
                  {thick.length
                    ? thick.map(({ b, sat }) => `${b.label} are ${Math.round((comp[b.id] || 0) * 100)}% of this shop, satisfied ${sat}`).join("; ")
                    : "no bloc is thick enough here to swing it"}
                  . Organizing and turnout both land at that rate.
                </span>
              </div>
            );
          })()}
          {isCampaign && <div>Election in <span className="text-stone-200">{Math.max(0, loc.electionTurn - turn)} month{Math.max(0, loc.electionTurn - turn) === 1 ? "" : "s"}</span> — actions here fight the employer's counter-campaign directly.</div>}
          {loc.antiUnion?.active && <div className="text-red-400">Anti-union talk is circulating ({loc.antiUnion.turnsLeft} month{loc.antiUnion.turnsLeft === 1 ? "" : "s"} left)</div>}
          {loc.buyOff?.active && <div className="text-teal-400">Workers just got a surprise raise ({loc.buyOff.turnsLeft} month{loc.buyOff.turnsLeft === 1 ? "" : "s"} of dampened organizing left)</div>}
          {loc.committee?.active && <div className="text-teal-400">Shop committee active{loc.committee.strikes > 0 ? ` (${loc.committee.strikes} strike${loc.committee.strikes === 1 ? "" : "s"} taken)` : ""}</div>}
        </div>

        {loc.roster && loc.roster.length > 0 && (
          <div className="border border-stone-800 bg-stone-950/60 px-3 py-2 mb-4">
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="text-xs text-stone-500 tracking-wide">THE FLOOR</div>
              <div className="text-[11px] text-stone-600">
                {loc.committee?.active
                  ? "The committee reports honestly, so these are numbers."
                  : "No committee here, so every one of these is an estimate."}
              </div>
            </div>
            <div className="text-[11px] leading-snug mb-1.5">
              {sitDownsLeft > 0 || booking.length > 0 ? (
                <span className="text-amber-400">
                  Click a name to sit down with them this month — 1 action each, {sitDownsLeft} left on the calendar.
                  You get an honest read on them, and the names they give you when you ask who else to talk to.
                </span>
              ) : (
                <span className="text-stone-600">
                  No one-on-ones left this month. You get {ACT2_ONE_ON_ONES_PER_TURN} across the whole campaign — four sites, one calendar.
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-y-0.5">
              {loc.roster.map(w => {
                const r = act2Read(loc, w, ballotCtx);
                const sb = BLOC_BY_ID[w.status], tb = BLOC_BY_ID[w.tenure];
                const gone = priorities?.[w.status]?.defected || priorities?.[w.tenure]?.defected;
                const hex = r.mid >= 62 ? "#2dd4bf" : r.mid >= 45 ? "#fbbf24" : "#f87171";
                const booked = booking.includes(w.id);
                const canBook = canSitDown && !w.met && !gone;
                // Who has already named this person. The only view of the network there is.
                const namedBy = loc.roster.filter(o => o.met && (o.points || []).includes(w.id)).map(o => o.name);
                const leader = w.met && w.pull >= ACT2_LEADER_PULL;
                return (
                  <div key={w.id}>
                    <div
                      className={`flex items-center gap-1.5 text-[11px] leading-tight px-1 -mx-1 ${canBook ? "cursor-pointer hover:bg-stone-900" : ""} ${booked ? "bg-amber-950/40" : ""}`}
                      onClick={canBook ? () => onSitDown(w.id) : undefined}
                      title={canBook ? `Sit down with ${w.name} this month (1 action)` : w.met ? `You have sat down with ${w.name}.` : undefined}
                    >
                      <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: sb?.hex }} title={sb?.label} />
                      <span className="w-1.5 h-1.5 shrink-0 rounded-full" style={{ backgroundColor: tb?.hex }} title={tb?.label} />
                      <span className={`font-bold shrink-0 ${gone ? "text-stone-600 line-through" : leader ? "text-amber-400" : "text-stone-200"}`}>{w.name}</span>
                      {leader && <span className="shrink-0 text-[9px] text-amber-500 tracking-wide">CARRIES {w.pull}</span>}
                      {w.met && !leader && <span className="shrink-0 text-[9px] text-stone-600 tracking-wide">carries {w.pull}</span>}
                      {!w.met && namedBy.length > 0 && (
                        <span className="shrink-0 text-[9px] text-teal-500 tracking-wide" title={`Named by ${namedBy.join(", ")}`}>
                          {"\u25b8"} NAMED BY {namedBy.join(", ").toUpperCase()}
                        </span>
                      )}
                      <span className="text-stone-600 truncate flex-1">{w.role}</span>
                      {booked && <span className="shrink-0 text-[9px] text-amber-400 tracking-wide">BOOKED</span>}
                      <span className="font-mono shrink-0" style={{ color: gone ? "#57534e" : hex }}>
                        {gone ? "walked" : r.exact ? r.mid : `${r.lo}\u2013${r.hi}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-stone-600 mt-1.5 leading-snug">
              Square is status, circle is tenure — {BLOCS.map(b => b.label.toLowerCase()).join(", ")}. Both cut across this shop,
              and the platform speaks to a person through whichever two they happen to be.
              {" "}CARRIES is how many people take their cue from someone. You cannot see it until you have sat down with them,
              and it has nothing to do with how warm they are.
            </div>
          </div>
        )}

        {canAct ? (
          <>
            <div className="text-xs text-stone-500 font-bold mb-1 tracking-wide">WHAT SHOULD THE ORGANIZER DO HERE THIS MONTH?</div>
            <div className="space-y-2 mb-2">
              {tiers.map(t => (
                <button
                  key={t.units}
                  onClick={() => onSetUnits(t.units)}
                  className={`w-full text-left border-2 px-3 py-2 text-sm transition-colors ${allocation === t.units ? "border-amber-500 bg-amber-950/30" : "border-stone-700 hover:bg-stone-800/60"}`}
                >
                  <div className="font-stencil text-base tracking-wide text-stone-100 flex items-center justify-between gap-2">
                    <span>{t.label}</span>
                    {t.cost > 0 ? <CostPips hours={t.cost} affordable={t.cost <= remaining + allocation} /> : <span className="text-xs text-stone-600">FREE</span>}
                  </div>
                  <div className="text-xs text-stone-400">{t.desc}</div>
                  <div className="text-xs mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className={baseGain(t.units) >= 0 ? "text-teal-400" : "text-red-400"}>
                      {baseGain(t.units) >= 0 ? "+" : ""}{baseGain(t.units)} morale
                    </span>
                    <span className={baseVis(t.units) > 0 ? "text-amber-400" : "text-stone-500"}>
                      {baseVis(t.units) >= 0 ? "+" : ""}{baseVis(t.units)} visibility
                    </span>
                    {t.units > 0 && (
                      <span className="text-stone-500">
                        {"\u2248+"}{Math.max(0, Math.round(baseGain(t.units) * 0.35))} true support
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {(isOrganizing || isCampaign) && (
              <FeedbackControls loc={loc} response={response} priorities={priorities} onToggle={onToggleResponse} />
            )}
            {isOrganizing && onFile && loc.morale >= 70 && (() => {
              // The standing FILE control. The escalation prompt asks once; this is where
              // the answer lives every week after that.
              const gates = filingGates(loc, turn);
              const blocked = gates.filter(g => !g.pass);
              return (
                <button
                  onClick={onFile}
                  disabled={blocked.length > 0}
                  className={`mt-3 w-full text-left border-2 px-3 py-2 transition-colors ${blocked.length ? "border-stone-800 opacity-50 cursor-not-allowed" : "border-teal-600 hover:bg-teal-950/40"}`}
                >
                  <div className="font-stencil text-base text-teal-400">FILE FOR UNION ELECTION</div>
                  <div className="text-xs text-stone-400">
                    {blocked.length
                      ? `Blocked: ${blocked.map(g => `${g.label.toLowerCase()} ${g.val} (needs ${g.req})`).join(", ")}.`
                      : `Vote lands in ${ACT2_FILING_LEAD} weeks. The employer campaigns against you every week of it.`}
                  </div>
                </button>
              );
            })()}
          </>
        ) : (
          <div className="text-sm text-stone-500 italic">This site is no longer active — nothing left to organize here.</div>
        )}

        <button onClick={onClose} className="mt-4 w-full font-stencil text-lg bg-amber-500 hover:bg-amber-400 text-stone-950 py-2 tracking-wide">
          DONE
        </button>
      </div>
    </div>
  );
}


// ---------- THE PLATFORM SCREEN ----------
// Three slots, eight demands, and no combination that pleases everyone. The screen's
// whole job is to make the trade visible while you are making it, not afterwards.
function PlatformModal({ priorities, locations, proven = [], initial = [], onAdopt, onPledge }) {
  const pledgesUsed = BLOCS.filter(b => priorities[b.id]?.pledged).length;
  const pledgesLeft = ACT2_MAX_PLEDGES - pledgesUsed;
  // Reopened by a survey rather than written from scratch: the platform is already
  // adopted, and what the survey bought is exactly one change of mind.
  const revising = initial.length >= PLATFORM_SLOTS;
  const [chosen, setChosen] = useState(() => (revising ? [...initial] : []));
  const changes = chosen.filter(id => !initial.includes(id)).length;
  const full = chosen.length >= PLATFORM_SLOTS && (!revising || changes <= 1);
  const toggle = (id) => setChosen(c => c.includes(id) ? c.filter(x => x !== id) : (c.length < PLATFORM_SLOTS ? [...c, id] : c));

  const sat = Object.fromEntries(BLOCS.map(b => [b.id, blocSatisfaction(b.id, chosen, priorities, proven)]));
  const anyDefecting = BLOCS.filter(b => chosen.length && sat[b.id] < DEFECT_THRESHOLD);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto px-4 py-6">
      <div className="bg-stone-900 border-2 border-amber-500 max-w-2xl w-full mx-auto p-5 anim-rise">
        <div className="font-stencil text-2xl text-amber-400 tracking-wide mb-1">
          {revising ? "WHAT ARE WE ASKING FOR NOW?" : "WHAT ARE WE ASKING FOR?"}
        </div>
        <p className="text-sm text-stone-400 mb-4">
          {revising
            ? <>You asked the whole company and they answered. That buys <span className="text-amber-400 font-bold">one</span> change — swap a single
              demand for a single demand. Changing your mind twice on the strength of one survey is not listening, it is drift.</>
            : <>Everybody wanted a union. Nobody agreed what it was for. Pick <span className="text-amber-400 font-bold">{PLATFORM_SLOTS}</span> demands
              {" "}— bargaining capital is finite, and every one you take is one you didn't.</>}
          {proven.length > 0 && <> You already have <span className="text-teal-400 font-bold">{proven.length === 1 ? "one of these" : `${proven.length} of these`}</span> signed
            at the first shop, and a demand somebody has already won is worth {PROVEN_BONUS} more to everybody than one you are only asking for.</>}
        </p>

        {/* The blocs, live, as you choose. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {BLOCS.map(b => {
            const pr = priorities[b.id] || {};
            const v = sat[b.id];
            const dead = chosen.length > 0 && v < DEFECT_THRESHOLD;
            return (
              <div key={b.id} className={`border p-2 ${dead ? "border-red-600 bg-red-950/30" : "border-stone-800"}`} title={b.blurb}>
                <div className="text-[11px] font-bold" style={{ color: b.hex }}>{b.label}</div>
                <div className="h-1.5 w-full bg-stone-800 my-1 relative">
                  <div className="h-1.5 transition-all duration-300" style={{ width: `${v}%`, backgroundColor: dead ? "#ef4444" : b.hex }} />
                  <div className="absolute top-[-2px] h-2.5 w-px bg-red-500" style={{ left: `${DEFECT_THRESHOLD}%` }} title="below this they walk" />
                </div>
                <div className={`text-[11px] font-bold ${dead ? "text-red-400" : "text-stone-400"}`}>{v}{dead ? " WALKS" : ""}</div>
                <div className="text-[10px] mt-1">
                  {pr.known
                    ? <span className="text-stone-400">wants <span className="font-bold" style={{ color: b.hex }}>{DEMAND_BY_ID[pr.top]?.label}</span>{" "}
                        <span className="text-stone-500">({"\u25CF".repeat(pr.intensity)})</span></span>
                    : <span className="text-stone-600 italic">priority unknown</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5 mb-4">
          {DEMANDS.map(d => {
            const on = chosen.includes(d.id);
            const blocked = !on && full;
            const conflict = d.opposes && chosen.includes(d.opposes);
            return (
              <button
                key={d.id}
                disabled={blocked}
                onClick={() => toggle(d.id)}
                className={`w-full text-left border-2 px-3 py-2 transition-colors ${
                  on ? "border-amber-500 bg-amber-950/30" : blocked ? "border-stone-800 opacity-35 cursor-not-allowed" : "border-stone-700 hover:bg-stone-800/60"}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-stencil text-base tracking-wide text-stone-100">{d.label}</span>
                  <span className="flex items-center gap-1.5">
                    {proven.includes(d.id) && (
                      <span className="text-[10px] font-bold px-1 border border-teal-600 text-teal-400" title={`Won in the first contract. +${PROVEN_BONUS} with every bloc, because it exists in writing.`}>
                        IN WRITING +{PROVEN_BONUS}
                      </span>
                    )}
                    {BLOCS.map(b => {
                      const e = d.effect[b.id] || 0;
                      if (e === 0) return null;
                      return (
                        <span key={b.id} className="text-[10px] font-bold px-1 border"
                          style={{ borderColor: b.hex, color: e > 0 ? b.hex : "#f87171" }}
                          title={`${b.label} ${e > 0 ? "+" : ""}${e}`}>
                          {b.label[0]}{e > 0 ? "+" : ""}{e}
                        </span>
                      );
                    })}
                  </span>
                </div>
                <div className="text-xs text-stone-400 leading-snug mt-0.5">{d.desc}</div>
                {conflict && (
                  <div className="text-xs text-amber-400 leading-snug mt-0.5">
                    Directly against {DEMAND_BY_ID[d.opposes].label}. Taking both spends two slots to cancel yourself out.
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {anyDefecting.length > 0 && (
          <div className="border border-red-800 bg-red-950/30 px-3 py-2 mb-3 text-xs text-red-300">
            <span className="font-bold">{anyDefecting.map(b => b.label).join(" and ")} will walk.</span>{" "}
            A bloc below {DEFECT_THRESHOLD} stops counting and starts campaigning against you.{" "}
            {pledgesLeft > 0
              ? <>You can promise one group they are next, which softens the miss without buying any enthusiasm. Only one — a promise made to everybody is a promise to nobody.</>
              : <>You have already promised {BLOCS.find(b => priorities[b.id]?.pledged)?.label} they are next. There is nobody left to say it to who would believe it.</>}
            <div className="flex gap-2 mt-2 flex-wrap">
              {pledgesLeft > 0 && anyDefecting.map(b => (
                <button key={b.id} onClick={() => onPledge(b.id)}
                  className="border border-amber-700 text-amber-300 px-2 py-1 hover:bg-amber-950/40 transition-colors">
                  Pledge {b.label} next
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          disabled={!full}
          onClick={() => onAdopt(chosen)}
          className={`w-full font-stencil text-lg py-2.5 tracking-wide transition-colors ${
            full ? "bg-amber-500 hover:bg-amber-400 text-stone-950" : "bg-stone-800 text-stone-600 cursor-not-allowed"}`}
        >
          {revising
            ? (chosen.length < PLATFORM_SLOTS ? `PICK ${PLATFORM_SLOTS - chosen.length} MORE`
               : changes > 1 ? "THE SURVEY BOUGHT ONE CHANGE, NOT TWO"
               : changes === 0 ? "KEEP IT AS IT IS" : "ADOPT THE REVISION")
            : (full ? "ADOPT THIS PLATFORM" : `PICK ${PLATFORM_SLOTS - chosen.length} MORE`)}
        </button>
      </div>
    </div>
  );
}

function EscalationModal({ loc, turn, factor = 1, ballotCtx = null, onFile, onConsolidate, onPivot }) {
  const gates = filingGates(loc, turn);
  const eligible = gates.every(g => g.pass);
  const gap = loc.morale - (loc.trueSupport ?? loc.morale);
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 px-4">
      <div className="bg-stone-900 border-2 border-amber-500 max-w-lg w-full p-5 anim-rise">
        <div className="flex items-center gap-2 mb-1">
          <Vote size={18} className="text-amber-400" />
          <div className="font-stencil text-xl text-amber-400 tracking-wide">ESCALATION DECISION: {loc.name}</div>
        </div>
        <p className="text-sm text-stone-400 mb-4">Morale has crossed 70. Workers are ready to move — the question is whether you are. You will only be asked this once; after today the FILE control lives on the shop's own panel.</p>

        {/* The gates. Each one passes or it doesn't \u2014 no interpreting a number. */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3 text-xs">
          {gates.map(g => (
            <div key={g.label} className={`border p-2 text-center ${g.pass ? "border-teal-800 bg-teal-950/20" : "border-red-900 bg-red-950/20"}`}>
              <div className="text-stone-500">{g.label}</div>
              <div className={`font-bold text-base ${g.pass ? "text-teal-400" : "text-red-400"}`}>
                {g.pass ? "\u2713" : "\u2715"} {g.val}
              </div>
              <div className="text-[10px] text-stone-600">needs {g.req}</div>
            </div>
          ))}
        </div>

        {/* What filing actually buys, in numbers. */}
        <div className="mb-3 text-xs border border-stone-800 bg-stone-950/50 px-3 py-2">
          <div className="text-stone-500 font-bold tracking-wide mb-1">IF YOU FILE TODAY</div>
          <div className="text-stone-400 leading-relaxed">
            Vote lands in <span className="text-stone-200 font-bold">{ACT2_FILING_LEAD} months</span>, and every one of them
            costs <span className="text-amber-400 font-bold">{ACT2_CAMPAIGN_UPKEEP} actions a month</span> off the top just to keep the process
            running. Every worker in the unit gets one secret ballot, and it takes a majority of the ones actually cast.
            {loc.committee?.active
              ? (() => {
                  const odds = act2WinChance(loc, factor, ballotCtx);
                  const p = act2Projection(loc, factor, ballotCtx);
                  return <> At {loc.trueSupport} true support and {loc.fear} fear that projects
                    {" "}<span className="text-teal-400 font-bold">{p.yes} yes</span> to <span className="text-red-400 font-bold">{p.no} no</span>
                    {p.out > 0 && <span className="text-stone-500"> with {p.out} not voting</span>}, which carries
                    {" "}<span className={`font-bold ${odds >= 0.7 ? "text-teal-400" : odds >= 0.5 ? "text-amber-400" : "text-red-400"}`}>
                      {Math.round(odds * 100)}%
                    </span> of the time.</>;
                })()
              : <> You cannot project it: true support here is unknown, and the ballot rolls against that, not morale.</>}
          </div>
        </div>

        {/* The block above already quotes true support, fear and the odds. Restating them
            here was the same sentence twice. Only the no-committee case says anything the
            projection cannot: that there is no projection. */}
        {!loc.committee?.active && gap >= 12 ? (
          <div className="mb-4 text-xs border border-amber-800 bg-amber-950/30 text-amber-300 px-3 py-2">
            {/* The line above already says it cannot be projected. This adds the one
                thing it does not: how big the hole is. */}
            Morale reads {loc.morale}. The number the vote actually uses could be as low as {Math.max(0, loc.morale - 25)}.
          </div>
        ) : null}

        <div className="space-y-2">
          <button
            onClick={onFile}
            disabled={!eligible}
            className={`w-full text-left border-2 p-3 transition-colors ${eligible ? "border-teal-600 hover:bg-teal-950/40" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
          >
            <div className="font-stencil text-base text-teal-400">FILE FOR UNION ELECTION</div>
            <div className="text-xs text-stone-400">Go for the win now. Triggers a {ACT2_FILING_LEAD}-month NLRB and campaign period, during which the employer campaigns against you every month. {!eligible && "Blocked: one of the gates above is red."}</div>
          </button>
          <button onClick={onConsolidate} className="w-full text-left border-2 border-amber-700 hover:bg-amber-950/40 p-3 transition-colors">
            <div className="font-stencil text-base text-amber-400">CONSOLIDATE & KEEP ORGANIZING</div>
            <div className="text-xs text-stone-400">Hold here, build strength at other sites, escalate multiple locations together. Morale here will decay slowly if neglected. You can file from the shop's panel any later week.</div>
          </button>
          <button onClick={onPivot} className="w-full text-left border-2 border-stone-700 hover:bg-stone-800/60 p-3 transition-colors">
            <div className="font-stencil text-base text-stone-300">PIVOT AWAY</div>
            <div className="text-xs text-stone-400">Deprioritize this site for now and refocus the organizer elsewhere.</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================================
// ACT ONE — ONE SHOP. Three stats per worker, a weighted influence map, and one goal:
// get 30% of the floor to sign a union card. Scored on how few weeks it took.
// =====================================================================================

const ACT1_CARD_THRESHOLD = 0.30;
const ACT1_HOURS_PER_ORGANIZER = 3;
// The level is scored on speed: beat it in this many weeks or fewer.
const ACT1_STAR_WEEKS = { three: 16, two: 21 };

// ---------- THE WINDOW CLOSES ----------
// Two deadlines, neither of them a bare countdown.
//
// 1. Cards go stale. This is real NLRB practice — old authorization cards get
//    challenged as unreliable evidence of CURRENT support — and it is the right shape
//    here because it isn't a timer, it's decay. A stale card drops that worker back
//    down the ladder and takes true support with it. It never touches a fast run: your
//    first card lands around week 6, so a 3-star campaign never loses one. A grind
//    watches its early signatures rot off faster than it can replace them.
const CARD_LIFESPAN = 14;
const CARD_STALE_WARNING = 3; // weeks of notice on the worker card

// 2. The studio ships. The most honest death available in this setting: the window
//    closes because the business cycle does not wait for the campaign. Visible from
//    week one — a cap you discover is a cheap shot, a cap you plan against is strategy.
const ACT1_SHIP_WEEK = 26;
const ACT1_CRUNCH_WEEKS = 4; // flagged off by default; see ACT1_CRUNCH_ENABLED
const ACT1_CRUNCH_ENABLED = false;

function cardAge(w, week) {
  return w.signedWeek == null ? 0 : week - w.signedWeek;
}
function cardExpiresOn(w) {
  return w.signedWeek == null ? null : w.signedWeek + CARD_LIFESPAN;
}
function cardStaleSoon(w, week) {
  const exp = cardExpiresOn(w);
  return exp != null && exp - week <= CARD_STALE_WARNING && exp - week > 0;
}
const ACT1_PUBLIC_UNLOCK_WEEK = 4; // three weeks of conversations first
const ACT1_RECRUIT_REQ = 85;
function act1Stars(week) {
  if (week <= ACT1_STAR_WEEKS.three) return 3;
  if (week <= ACT1_STAR_WEEKS.two) return 2;
  return 1;
}

const TRAIT_LABEL = { legal: "legal grievances", antiunion: "countering anti-union pressure", committee: "building shop committees", morale: "keeping morale up" };
// Teams are public knowledge from day one — unlike the influence map, you don't need to
// know who works where without being told. They bias who carries weight with whom.
const TEAM_LABEL = { engineering: "ENGINEERING", qa: "QA", production: "PRODUCTION" };
const TEAM_HEX = { engineering: "#38bdf8", qa: "#a78bfa", production: "#fb7185" };

// ---------- THE THREE STATS ----------
// Support tiers are only a readable band on the 0-100 support number.
const SUPPORT_TIERS = [
  { min: 78, label: "READY", hex: "#2dd4bf", text: "text-teal-400" },
  { min: 55, label: "WARM", hex: "#fbbf24", text: "text-amber-400" },
  { min: 30, label: "UNSURE", hex: "#a8a29e", text: "text-stone-400" },
  { min: 0, label: "COLD", hex: "#f87171", text: "text-red-400" },
];
const supportTier = (s) => SUPPORT_TIERS.find(t => s >= t.min) || SUPPORT_TIERS[SUPPORT_TIERS.length - 1];
const fulfillmentLabel = (f) => (f >= 70 ? "FULFILLED" : f >= 40 ? "MIXED" : "BURNED OUT");
const FULFILL_HEX = "#7dd3fc";

const STAT_INFO = {
  support: "There is one number: what this person would actually do with a card in front of them. You do not get to see it. What you get is a read, and the band is how wide your uncertainty is. Warm words set the top of that band and nothing else \u2014 everyone who talks a good game looks identical from outside, and cheap actions make more of them: watching a coworker wear a button makes people talk warmer without making anyone likelier to sign. Only sitting down with somebody turns the band into a number, and it blurs again over the following weeks. The card ask, the committee, and the ballot all roll against the real figure, never against your read of it.",
  trueSupport: "There is one number: what this person would actually do with a card in front of them. You do not get to see it. What you get is a read, and the band is how wide your uncertainty is. Only sitting down with somebody turns that band into a number.",
  influence: "A tie is relationship-specific. There is no single number for how persuasive somebody is — Camille might carry real weight with one coworker and none at all with the next — and it runs one way, so Camille moving Dante says nothing about Dante moving Camille. What a tie is worth is standing plus whatever common ground you have surfaced between those two people: find something they share and the line thickens and turns teal; let the company buy it and the line goes thin and grey again. Common ground you have not found yet counts for nothing, and anything the company has bought counts for nothing either. Every conversation, card ask and public action lands in proportion to the tie.",
  fulfillment: "How much this person likes the job — which is to say, how much they feel they would be risking. It says nothing about their politics. What it changes is the ask: a worker who loves it here hesitates longer over the card. This is the lever the company buys with offsites and new hardware, one department at a time.",
  _legacyFulfillment: "How fulfilled this person is by the work itself. Fulfilled and burned-out workers both sign union cards — fulfillment does not predict support. What it predicts is who they'll listen to: people are moved much harder by an organizer whose relationship to the job resembles their own.",
};

const BURN_NARRATIVES = [
  (name) => `${name} is in a meeting with HR and a skip-level by 9am. No accusation — just a new weekly check-in and a manager on every calendar invite from now on.`,
  (name) => `Somebody in the room repeats what ${name} said, to the wrong person. By Friday ${name} is quietly off the flagship project.`,
  (name) => `${name} gets the "we love your passion, but" conversation. It comes with a performance plan attached.`,
  (name) => `A screenshot of ${name} makes it into a manager's DMs. The temperature around them drops overnight.`,
];

// support / fulfillment are deliberately uncorrelated — the whole point of stat 3 is that
// you cannot read someone's politics off how much they love the job.
const ACT1_WORKERS_SEED = [
  { id: 1, name: "Marisol", team: "engineering", trait: "committee", support: 38, fulfillment: 62, hook: "Was coded as a senior engineer for six years. After coming back from parental leave, she got her first-ever 'needs improvement' review — same work, different score." },
  { id: 2, name: "Dante", team: "production", trait: "morale", support: 16, fulfillment: 85, hook: "New hire, six months in. Just happy to be here making games. Doesn't realize yet that being new makes him easy to cut first." },
  { id: 3, name: "Priya", team: "engineering", trait: "legal", support: 46, fulfillment: 35, hook: "Works crunch every launch cycle. Her health is suffering but she's afraid saying no will tank her stack ranking." },
  { id: 4, name: "Wendell", team: "production", trait: "legal", support: 85, fulfillment: 30, organizer: true, hook: "Was here before the PE acquisition. Remembers when there was profit-sharing, real raises, and you could push back on a deadline." },
  { id: 5, name: "Ashanti", team: "production", trait: "antiunion", support: 48, fulfillment: 55, hook: "Posts about everything. First to call out problems publicly, first to get quietly 'counseled' about her tone." },
  { id: 6, name: "Miguel", team: "engineering", trait: "committee", support: 34, fulfillment: 25, hook: "The load-bearing engineer. Everyone routes their hardest problems to him. He does the work of two people and it shows on his face." },
  { id: 7, name: "Brianna", team: "qa", trait: "morale", support: 20, fulfillment: 60, hook: "Transferred in from the studio they acquired last year. Still learning how this one works." },
  { id: 8, name: "Tyrell", team: "qa", trait: "antiunion", support: 40, fulfillment: 30, hook: "His PerfAxis score dropped 12 points last quarter. He still doesn't know why. There's no one to ask." },
  { id: 9, name: "Sofia", team: "production", trait: "committee", support: 30, fulfillment: 70, hook: "Unofficial team mom. The first to notice when people are struggling before anyone else does." },
  { id: 10, name: "Jake", team: "engineering", trait: "morale", support: 36, fulfillment: 45, hook: "His hours are technically 40 but the Slack pings don't stop until midnight. He's been tracking it. Nobody's compensating him for it." },
  { id: 11, name: "Camille", team: "qa", trait: "legal", support: 88, fulfillment: 50, organizer: true, hook: "Was in a union at her last studio. Doesn't advertise it — but she knows exactly how this is supposed to go." },
  { id: 12, name: "Roz", team: "engineering", trait: "legal", support: 26, fulfillment: 78, hook: "Principal engineer. Genuinely loves this codebase — she wrote half of it. Which is exactly why watching Play-Eye overwrite her systems is unbearable." },
  { id: 13, name: "Omar", team: "qa", trait: "antiunion", support: 18, fulfillment: 40, hook: "Keeps his head down and his numbers up. He's been told he's 'on the list' for a lead role two years running." },
  { id: 14, name: "Fen", team: "production", trait: "morale", support: 44, fulfillment: 82, hook: "Concept artist. Loves this game more than anyone in the building, and can't stand what the building does to the people making it." },
  { id: 15, name: "Gus", team: "engineering", trait: "committee", support: 14, fulfillment: 65, hook: "Twenty-two years in games, four studios. Was around for one union drive that fell apart badly. Doesn't intend to live through a second." },
  { id: 16, name: "Naledi", team: "qa", trait: "legal", support: 52, fulfillment: 22, hook: "Runs the entire QA pipeline on a coordinator's title and a coordinator's pay. Hasn't taken a full weekend since March." },
  { id: 17, name: "Theo", team: "production", trait: "morale", support: 28, fulfillment: 48, hook: "Audio, contract-to-hire for the third contract running. His renewal is up in eleven weeks and he knows exactly who signs it." },
  { id: 18, name: "Iris", team: "engineering", trait: "antiunion", support: 37, fulfillment: 20, hook: "Built the internal tools team's best work. Play-Eye replaced it in a single sprint and nobody told her before the all-hands." },
  { id: 19, name: "Marcus", team: "qa", trait: "committee", support: 42, fulfillment: 66, hook: "Ran the studio's mentorship program until it got cut for 'focus.' Still mentors people anyway, on his own time." },
  { id: 20, name: "Delphine", team: "production", trait: "antiunion", support: 22, fulfillment: 88, hook: "Narrative lead, four years inside this world. Thinks a union fight will slow the ship down right when the game finally needs to land." },
];

// Shared by both acts: one beat per click, never more than two lines, with a progress
// bar, back-navigation, a skip for replays, and keyboard control. State lives here, so
// leaving the intro phase unmounts it and a replay starts from the top on its own.
function IntroSequence({ beats, visuals = {}, doneLabel, onDone }) {
  const [step, setStep] = useState(0);
  const last = step === beats.length - 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (last) onDone(); else setStep(i => i + 1);
      } else if (e.key === "ArrowLeft") {
        setStep(i => Math.max(0, i - 1));
      } else if (e.key === "Escape") {
        onDone();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onDone]);

  const beat = beats[Math.min(step, beats.length - 1)] || {};
  // A mistyped key in a beat table should not be able to white-screen the game, so
  // accept `text` as well as `lines` and tolerate a beat that has neither.
  const beatLines = beat.lines ?? (beat.text ? [beat.text] : []);
  const accent = beat.tone === "red" ? "text-red-400" : "text-amber-400";
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 min-h-[70vh] flex flex-col">
      <div key={step} className="flex-1 flex flex-col justify-center anim-rise">
        <div className={`text-base tracking-[0.22em] mb-4 ${beat.tone === "red" ? "text-red-500" : "text-stone-500"}`}>{beat.kicker}</div>
        {beat.title && <div className={`font-stencil text-3xl sm:text-4xl leading-tight mb-4 ${accent}`}>{beat.title}</div>}
        {beatLines.map((line, i) => (
          // A beat with no headline leads on its first line instead, so it still has a
          // visual anchor rather than opening on body copy.
          <p key={i} className={!beat.title && i === 0
            ? `text-2xl sm:text-3xl leading-snug mb-4 ${accent}`
            : "text-stone-300 text-lg leading-relaxed mb-3"}>{line}</p>
        ))}
        {beat.visual && visuals[beat.visual] && <div className="mt-6">{visuals[beat.visual]}</div>}
      </div>

      <div className="mt-10">
        <div className="flex items-center gap-1.5 mb-4">
          {beats.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
              className={`h-1 flex-1 transition-colors ${i === step ? "bg-amber-400" : i < step ? "bg-stone-600" : "bg-stone-800"}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(i => Math.max(0, i - 1))}
            disabled={step === 0}
            className={`text-sm tracking-wide transition-colors ${step === 0 ? "text-stone-800 cursor-not-allowed" : "text-stone-500 hover:text-stone-300"}`}
          >
            ◂ BACK
          </button>
          <button
            onClick={() => (last ? onDone() : setStep(i => i + 1))}
            className="font-stencil text-lg sm:text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-2.5 tracking-wide transition-colors"
          >
            {last ? doneLabel : "NEXT ▸"}
          </button>
          <button onClick={onDone} className="text-sm tracking-wide text-stone-600 hover:text-stone-400 transition-colors">
            SKIP
          </button>
        </div>
      </div>
    </div>
  );
}

// Endings are not intros. The result is the payoff, so the headline, tally and stars are
// never gated behind a click — they land the moment the screen opens. What gets paced is
// the part underneath: what it means, what it doesn't mean, and who got you there. The
// actions live on the last beat, and SKIP jumps straight to them rather than leaving.
function OutcomeTally({ tally }) {
  return (
    <div className="flex items-center justify-center gap-7 font-mono">
      <div><div className="text-xs text-stone-500 tracking-wide">YES</div><div className="text-3xl font-bold text-teal-400">{tally.yes}</div></div>
      <div><div className="text-xs text-stone-500 tracking-wide">NO</div><div className="text-3xl font-bold text-red-400">{tally.no}</div></div>
      {tally.out != null && (
        <div><div className="text-xs text-stone-500 tracking-wide">DIDN'T VOTE</div><div className="text-3xl font-bold text-stone-500">{tally.out}</div></div>
      )}
    </div>
  );
}

function StarThresholdLine({ week }) {
  const earned = act1Stars(week);
  const cell = (n, label) => (
    <span className={n === earned ? "text-amber-400 font-bold" : "text-stone-600"}>{"★".repeat(n)} {label}</span>
  );
  return (
    <div className="flex items-center justify-center gap-4 text-xs tracking-wide mt-2 flex-wrap">
      {cell(3, `≤${ACT1_STAR_WEEKS.three} wks`)}
      {cell(2, `≤${ACT1_STAR_WEEKS.two} wks`)}
      {cell(1, "finished")}
    </div>
  );
}

function OutcomeScreen({ tone = "win", title, stars, tally, meta, beats, visuals = {}, actions }) {
  const [step, setStep] = useState(0);
  const last = step === beats.length - 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        if (!last) { e.preventDefault(); setStep(i => i + 1); }
      } else if (e.key === "ArrowLeft") {
        setStep(i => Math.max(0, i - 1));
      } else if (e.key === "Escape") {
        setStep(beats.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, beats.length]);

  const beat = beats[step];
  return (
    <div className="max-w-2xl mx-auto px-6 py-14 anim-rise">
      <div className="text-center">
        <div className={`font-stencil text-4xl sm:text-5xl leading-tight mb-2 ${tone === "loss" ? "text-red-500" : "text-teal-400"}`}>{title}</div>
        {stars != null && (
          <>
            <div className="flex justify-center"><Stars count={stars} /></div>
            {meta?.week != null && <StarThresholdLine week={meta.week} />}
          </>
        )}
        {tally && <div className="mt-4"><OutcomeTally tally={tally} /></div>}
        {meta?.line && <p className="text-amber-400 text-lg mt-4">{meta.line}</p>}
      </div>

      <div className="border-t border-stone-800 mt-6 pt-5 min-h-[8.5rem]">
        <div key={step} className="anim-rise">
          {beat.lines.map((line, i) => (
            <p key={i} className={`leading-relaxed mb-3 ${beat.quiet ? "text-stone-500 text-base italic" : "text-stone-300 text-lg"}`}>{line}</p>
          ))}
          {beat.visual && visuals[beat.visual] && <div className="mt-4">{visuals[beat.visual]}</div>}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-1.5 mb-4">
          {beats.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
              className={`h-1 flex-1 transition-colors ${i === step ? "bg-amber-400" : i < step ? "bg-stone-600" : "bg-stone-800"}`}
            />
          ))}
        </div>
        {last ? (
          <div className="flex flex-col sm:flex-row gap-2 justify-center">{actions}</div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setStep(i => Math.max(0, i - 1))}
              disabled={step === 0}
              className={`text-sm tracking-wide transition-colors ${step === 0 ? "text-stone-800 cursor-not-allowed" : "text-stone-500 hover:text-stone-300"}`}
            >
              ◂ BACK
            </button>
            <button
              onClick={() => setStep(i => i + 1)}
              className="font-stencil text-lg bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-2.5 tracking-wide transition-colors"
            >
              NEXT ▸
            </button>
            <button onClick={() => setStep(beats.length - 1)} className="text-sm tracking-wide text-stone-600 hover:text-stone-400 transition-colors">
              SKIP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function OutcomeRoster({ workers }) {
  return (
    <div className="border border-teal-900 bg-teal-950/20 p-3 text-left">
      <div className="text-xs text-teal-400 font-bold mb-2 tracking-wide">THE COMMITTEE THAT GOT IT THERE:</div>
      {workers.map(w => (
        <div key={w.id} className="text-sm text-stone-300 mb-1">
          <span className="font-bold text-stone-100">{w.name}</span> — {w.hook}
        </div>
      ))}
    </div>
  );
}

// Act Two's beats depend on who survived Act One, so they're built rather than declared.
function act2IntroBeats(leaders, contract = null) {
  // What an intro is for is the things the board cannot hold: the bridge from the last
  // act, and the premise of this one. Everything else was cut because it is already on
  // screen permanently — the objective bar states the goal in the same words, the hour
  // pie counts the actions, and the team panel explains stationing a leader.
  const beats = [
    {
      kicker: "AFTER THE CONTRACT",
      title: "WORD TRAVELS",
      lines: [
        contract
          ? (contract.ratified
              ? `You won one shop, then won it a contract — ${contract.tiers} of ${contract.max} tiers, signed. The other studios under the same parent read it the week it was posted.`
              : "You won one shop and held it through a year of bargaining with nothing signed. The other studios heard about that too.")
          : "You won one shop. The other studios under the same parent heard about it inside a week.",
        contract && contract.ratified
          ? `Every shop here opens ${contractHeadstart(contract)} points further along because of it.`
          : "What they heard is how long the company is willing to wait. None of that is in writing, so none of it is worth anything at the table here.",
      ],
    },
    {
      kicker: "THE PARENT COMPANY",
      title: "FOUR MORE STUDIOS",
      lines: [
        "PerfAxis runs all four the way it ran yours — same stack ranking, same nobody to appeal to.",
        "What worked once wasn't a fluke. It was a system, and systems can be organized at scale.",
      ],
      tone: "red",
    },
  ];
  if (leaders.length) {
    beats.push({
      kicker: "YOU DIDN'T COME ALONE",
      title: "THE SHOP FLOOR CAME WITH YOU",
      lines: [
        `${["Nobody", "One person", "Two people", "Three people", "Four people"][leaders.length] || `${leaders.length} people`} who ran the first shop${contract ? " and bargained its contract" : ""} came with you.`,
      ],
      visual: "roster",
    });
  }
  // Last, so the premise is the thing still on screen when the button is pressed.
  beats.push({
    kicker: "YOUR JOB CHANGED",
    title: "YOU'RE NOT IN THE ROOM ANYMORE",
    lines: [
      "You're one organizer with four sites and one calendar.",
      "Visibility brings retaliation, people lose their nerve, and none of it resets.",
    ],
  });
  return beats;
}

function IntroRosterVisual({ leaders }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {leaders.map((l, i) => (
        <div key={i} className="border border-teal-800 bg-teal-950/20 px-3 py-1.5 text-sm">
          <span className="font-bold text-stone-100">{l.name}</span>
          <span className="text-stone-500"> — strong on {TRAIT_LABEL[l.trait]}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- THE OPENING ----------
// One beat per click, never more than two lines. Everything that the game teaches in
// context later — public actions, recruiting, how filing works — is deliberately
// not here. The intro carries the situation and exactly one rule: you direct your people.
const ACT1_INTRO_BEATS = [
  {
    kicker: "Our Studio",
    title: "We spent years building our name",
    lines: ["It used to feel like something worth building. Now it belongs to a private equity firm."],
  },
  {
    kicker: "Six months ago",
    title: "They rolled out Play-Eye",
    lines: [
      "An AI that makes design calls for the game we've spent four years on. It overrides our designers and contradicts our playtesters.",
      "Play-Eye insists micro-transactions instill pride and a sense of accomplishment.",
    ],
    tone: "red",
  },
  {
    kicker: "We've tried everything",
    title: "There's nobody to appeal to",
    lines: ["The hedge fund doesn't listen, the AI doesn't care. We can't fix a system that isn't listening just by asking nicer. We have to unionize."],
    tone: "red",
  },
  {
    kicker: "Where we're at",
    lines: [
      "Wendell was here before the acquisition. I'm Camille, and I was in a union at my last studio.",
      "We are ready to take back control, but we need your help.",
    ],
    visual: "committee",
  },
  {
    kicker: "Your role",
    lines: [
      "You're a seasoned worker advocate. You know you can't parachute in and fix our problems.",
      "But you can help us build the structure needed to reclaim control of our studio.",
    ],
  },
  {
    kicker: "Gameplay",
    title: "Influence runs person to person",
    lines: [
      "The same conversation is more powerful when there's an existing relationship there.",
      "Guide Wendell and Camille to have the right conversations with the right people.",
    ],
    visual: "influence",
  },
  {
    kicker: "The goal",
    title: "30% support for unionizing forces an election",
    lines: ["No guarantee of a win, just opens the door for a majority vote on whether the studio should be controlled by Play-Eye or the workers who actually love the game."],
  },
  {
    kicker: "The Brief",
    title: `You have until the game ships in week ${ACT1_SHIP_WEEK}`,
    lines: [
      "After launch the contractors roll off, the cuts land, and this shop stops existing in this shape.",
      `Cards go stale after ${CARD_LIFESPAN} weeks too \u2014 a signature is evidence of what somebody thought the day they signed it, not a permanent fact.`,
      "Move fast, or watch your early wins rot off the count.",
    ],
  },
];

// The two beats that get a picture instead of another sentence: the people you actually
// have, drawn as the cards they'll be on the board, and the influence idea in one arrow.
function IntroCommitteeVisual() {
  const people = [
    { name: "CAMILLE", team: "qa", support: 88, fulfillment: 50 },
    { name: "WENDELL", team: "production", support: 85, fulfillment: 30 },
  ];
  return (
    <div className="flex gap-4 flex-wrap">
      {people.map(p => (
        <div key={p.name} className="relative border-2 border-amber-500 bg-stone-950 w-44 px-3 py-2 text-left">
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: TEAM_HEX[p.team] }} />
          <div className="flex items-baseline justify-between pl-1.5">
            <span className="font-stencil text-base tracking-wide text-stone-100">{p.name}</span>
            <span className="font-mono text-xl font-bold text-teal-400">{p.support}</span>
          </div>
          <div className="h-1.5 bg-stone-800 mt-1.5 ml-1.5">
            <div className="h-full" style={{ width: `${p.fulfillment}%`, backgroundColor: FULFILL_HEX }} />
          </div>
          <div className="text-[11px] text-amber-500 font-mono mt-1.5 ml-1.5 tracking-wide">ON COMMITTEE</div>
        </div>
      ))}
    </div>
  );
}

function IntroInfluenceVisual() {
  return (
    <svg viewBox="0 0 220 46" className="w-full max-w-md block">
      <defs>
        <marker id="intro-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#fbbf24" />
        </marker>
      </defs>
      <rect x="4" y="14" width="62" height="26" rx="2" fill="#1c1917" stroke="#f59e0b" strokeWidth="1" />
      <text x="35" y="31" textAnchor="middle" fontSize="9" fill="#e7e5e4" fontFamily="Impact, 'Arial Black', sans-serif">CAMILLE</text>
      <line x1="70" y1="27" x2="140" y2="27" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#intro-arrow)" />
      <text x="106" y="20" textAnchor="middle" fontSize="8" fill="#fbbf24" fontFamily="'Courier New', monospace">influence 71</text>
      <rect x="148" y="14" width="62" height="26" rx="2" fill="#1c1917" stroke="#44403c" strokeWidth="1" />
      <text x="179" y="31" textAnchor="middle" fontSize="9" fill="#a8a29e" fontFamily="Impact, 'Arial Black', sans-serif">NALEDI</text>
    </svg>
  );
}

// ---------- THE ELECTION ----------
// 30% of the unit on cards is the legal minimum to petition — it is not the number you
// win on. Filing starts a clock: the employer campaigns hard for four weeks, and then a
// secret ballot decides it on a majority of votes actually cast. The whole point of this
// stage is the third loss in the chain the game has been teaching: support isn't a
// signature, and a signature isn't a vote.
const ELECTION_WEEKS = 4;
const VOLUNTARY_RECOGNITION_FLOOR = 0.5;

// A secret ballot is decided by what somebody would actually do, not by what they have
// been telling the organizer who keeps stopping by their desk. Every other number in the
// game is a read on this one — which is why the company spends its whole budget attacking
// the read and can barely touch this.
const ballotStanding = (w) => w.trueSupport ?? w.support;
// Where the yes-curve sits. True support runs about 25 points below stated support, so
// these are not the numbers a stated-support ballot would use. Tuned in sim/: a careful
// campaign carries the unit about two thirds of the time, a sloppy one is a coin flip,
// and the median result is decided by three votes.
// ---------- WHAT YOU ACTUALLY KNOW ----------
// There is one real number per worker: what they would do. The player never sees it.
// What the board shows is a READ, and the width of that read is the honest measure of
// how much organizing has been done on that person.
//
// Warm words are a ceiling, not an estimate. Somebody who says all the right things
// might be exactly where they sound or twenty points below it and being polite; what
// they cannot be is further along than they claim. So a read built only on what
// somebody says hangs DOWN from their words instead of sitting around them, and the
// only thing that moves it off the ceiling and onto a number is a conversation.
const READ_COLD_DROP = 45;   // never spoken to: they could be anywhere under their words
const READ_WARM_DROP = 28;   // you've talked, but never the long version
const READ_FRESH_HALF = 4;   // the week you sit down with them
const READ_BLUR_RATE = 1;    // and it blurs again at this rate afterwards
// A read never decays to worse than a quick chat's ceiling band: having sat down with
// somebody once is permanently worth something, it just stops being worth a number.
const READ_BLUR_CAP = 9;
// Wide enough to still be worth printing a figure for. Buys a deep conversation about
// three weeks of a hard number before it goes back to being a range.
const READ_NUMBER_MAX = 6;

function readOf(w, week = 1) {
  const commitment = w.trueSupport ?? w.support;
  // A signature is not a report, it is an act. You know what it was worth.
  if (w.signed) return { lo: commitment, hi: commitment, mid: commitment, exact: true, kind: "signed" };
  if (w.trueKnown) {
    const age = Math.max(0, week - (w.trueKnownWeek ?? week));
    const half = Math.min(READ_BLUR_CAP, READ_FRESH_HALF + age * READ_BLUR_RATE);
    return {
      lo: clamp(commitment - half), hi: clamp(commitment + half), mid: commitment,
      exact: half <= READ_NUMBER_MAX, kind: age <= 1 ? "fresh" : "fading", age,
    };
  }
  // Mapping tells you who listens to whom. It tells you nothing about where somebody
  // stands, so only an actual conversation narrows this.
  const drop = w.spokenTo ? READ_WARM_DROP : READ_COLD_DROP;
  return {
    lo: clamp(w.support - drop), hi: clamp(w.support), mid: clamp(w.support - drop / 2),
    exact: false, kind: w.spokenTo ? "warm" : "cold",
  };
}
// How much of the floor you can actually see. The one number worth putting on the HUD.
function floorClarity(workers, week) {
  const live = workers.filter(x => !x.burned);
  if (!live.length) return 0;
  const width = live.reduce((n, x) => { const r = readOf(x, week); return n + (r.hi - r.lo); }, 0) / live.length;
  return Math.round(100 * (1 - width / READ_COLD_DROP));
}

const BALLOT_PIVOT = 20;
const BALLOT_SPAN = 35;

// Turnout: people with strong feelings in either direction show up. Fence-sitters are the
// ones who stay at their desks, and a fence-sitter who doesn't vote is a vote you lost.
function turnoutChance(w) {
  const conviction = Math.abs(ballotStanding(w) - 50) / 50;
  return Math.min(0.96, 0.62 + 0.28 * conviction + (w.signed ? 0.06 : 0));
}
// Even someone who signed can vote no in the booth, and at the top end there is always a
// little slippage that no amount of organizing removes.
function yesChance(w) {
  const base = (ballotStanding(w) - BALLOT_PIVOT) / BALLOT_SPAN;
  return Math.min(0.93, Math.max(0.02, base + (w.signed ? 0.05 : 0)));
}
// The projection is a read, not an oracle. It can only use the true number for people the
// campaign has actually sat down with; everywhere else it has to go on what they have been
// saying. So it is wrong in exactly the places the player hasn't done the work — and it is
// wrong in the flattering direction, which is the whole lesson.
function voteProjection(workers) {
  let yes = 0, no = 0, out = 0;
  workers.forEach(w => {
    const believed = { ...w, trueSupport: w.trueKnown ? ballotStanding(w) : w.support };
    const t = turnoutChance(believed);
    const y = yesChance(believed);
    yes += t * y;
    no += t * (1 - y);
    out += 1 - t;
  });
  return { yes: Math.round(yes), no: Math.round(no), out: Math.round(out) };
}
// The same projection with its uncertainty left in, the way the contract act's turnout
// band already does it. Every worker is a read rather than a number, so the yes count is a
// range as wide as the reads behind it — and the width IS the warning. Somebody looking at
// "9-15 yes" does not need to be told in prose that the booth is secret and the number is
// soft. Somebody looking at "12 yes" does, and will not believe it anyway.
function voteProjectionBand(workers, week = 1) {
  let lo = 0, hi = 0, exact = true;
  workers.forEach(w => {
    const r = readOf(w, week);
    if (!r.exact) exact = false;
    const at = (v) => {
      const believed = { ...w, support: v, trueSupport: v, trueKnown: true };
      return turnoutChance(believed) * yesChance(believed);
    };
    lo += at(r.lo); hi += at(r.hi);
  });
  return { lo: Math.round(lo), hi: Math.round(hi), exact };
}
// Employers voluntarily recognize when the count is so lopsided that fighting it looks
// worse than losing. A union-avoidance consultant on the payroll is there to argue the
// opposite, so having hired one makes it much less likely.
function recognitionChance(cardShare, consultantActive, heat) {
  if (cardShare < VOLUNTARY_RECOGNITION_FLOOR) return 0;
  let c = Math.min(0.55, (cardShare - VOLUNTARY_RECOGNITION_FLOOR) * 1.4);
  if (consultantActive) c *= 0.55;
  if (heat > 60) c *= 0.7;
  return c;
}

// ---------- THE UNION-AVOIDANCE CONSULTANT ----------
// Management's real counter-campaign isn't a poster: it's a paid professional running the
// same playbook the player runs — one-on-ones with the people closest to signing, plus the
// two set pieces every organizer has seen. Gated behind a committee that's clearly working,
// because the early game is hard enough without it.
const CONSULTANT_NAME = "Kirkman";
const CONSULTANT_FIRM = "Meridian Workplace Strategies";
const CONSULTANT_TRIGGER_COMMITTEE = 4;
const CONSULTANT_SETPIECE_GAP = 3;
const CONSULTANT_MAX_EACH = 2;

const CONSULTANT_ONE_ON_ONES = [
  (n) => `${CONSULTANT_NAME} books ${n} for a "listening session." Twenty minutes, no witnesses, and a lot of concern about what dues would cost them.`,
  (n) => `${CONSULTANT_NAME} catches ${n} alone and walks them through a slide deck about "what you give up when a third party speaks for you."`,
  (n) => `${CONSULTANT_NAME} asks ${n} whether they've actually read what they'd be signing. They haven't. He has a copy ready.`,
  (n) => `${CONSULTANT_NAME} tells ${n} he's heard great things about them, and that people who are going places usually keep their heads down right now.`,
];

const CONSULTANT_NAME_UC = CONSULTANT_NAME.toUpperCase();

// How much backing a worker has from people who've already signed. Somebody surrounded by
// organizers has been inoculated — they've heard all of this before, from someone they
// trust more. Somebody isolated is who the consultant peels off.
// STUBBORN workers do not move back once they are with you. Everything Kirkman does
// to them washes off, which is the flip side of how hard they were to move at all.
function holdsFast(w) { return !!infTrait(w).holdsFast; }
function signedBacking(influence, workers, id) {
  return incomingTies(influence, id)
    .filter(t => {
      const s = workers.find(x => x.id === t.id);
      return s && s.signed && !s.burned;
    })
    .reduce((sum, t) => sum + t.weight, 0);
}

const ACT1_TOTAL_WORKERS = ACT1_WORKERS_SEED.length;
const ACT1_CARDS_NEEDED = Math.ceil(ACT1_TOTAL_WORKERS * ACT1_CARD_THRESHOLD);

// ---------- ORG CHART VS SOCIAL NETWORK ----------
// The central argument, as a mechanic instead of a tooltip. The company can only see
// the org chart: teams, reporting lines, mandatory meetings. That is a real weapon and
// it is a blunt one, because a department is not a set of relationships. Density of
// signed coworkers a person actually trusts is what blunts it.
//
// The player works the opposite map. Kirkman only finds it when the campaign gets loud
// enough to show him — which makes your own visibility the thing that teaches him.
const KIRKMAN_SIGHT = 55; // heat above which he stops guessing from the org chart

// An org-chart hit is absorbed in proportion to how much signed influence surrounds
// someone. Fully covered workers take roughly a fifth of the blow.
function orgChartResistance(backing) {
  return Math.max(0.2, 1 - Math.min(1, backing / 110) * 0.8);
}

// ---------- THE OUTSIDER LADDER ----------
// Kirkman is not the whole company. The better the campaign does, the further up the
// chain it gets escalated, and each rung fights differently. Rungs never un-arrive.
const OUTSIDERS = [
  {
    id: "consultant", name: "KIRKMAN", role: "union-avoidance consultant",
    arrival: (c) => c.committee >= CONSULTANT_TRIGGER_COMMITTEE || c.signed >= ACT1_CARDS_NEEDED - 2,
    intro: (n) => `A consultant from ${CONSULTANT_FIRM} is on site by Wednesday. ${n} has a badge, a corner office nobody was using, and a list of names.`,
  },
  {
    id: "boss", name: "DANIELS", role: "studio head",
    arrival: (c) => c.signed >= ACT1_CARDS_NEEDED || c.stage !== "drive",
    intro: () => `The studio head starts walking the floor. Sleeves up, first names, remembering your kid's name. Everybody likes Daniels. That is the problem.`,
  },
  {
    id: "corporate", name: "VANTAGE PARTNERS", role: "the owners",
    arrival: (c) => c.stage !== "drive" && c.heat >= 55,
    intro: () => `Someone from the ownership group flies in for a "portfolio review." No names on the calendar invite, no minutes taken.`,
  },
  {
    id: "celebrity", name: "THE PODCAST", role: "an outside voice",
    arrival: (c) => c.heat >= 72,
    intro: () => `A podcaster with four million subscribers does eleven minutes on your campaign without ever having set foot in the building.`,
  },
];


// ---------- CAN ACT ONE STILL BE WON? ----------
// Same promise as Act Two: the game owes you the truth the moment the arithmetic dies,
// and it owes you the specific reason. Burning people out of the campaign is the way
// you kill a drive here — there are only twenty of them, and you need six signatures.
function act1Winnability(workers, stage, week = 1) {
  if (stage !== "drive") return { alive: true, reason: null };
  if (week > ACT1_SHIP_WEEK) {
    return {
      alive: false, shipped: true, signed: workers.filter(w => w.signed).length, burned: 0,
      reason: `The game ships. Contract workers roll off, post-launch cuts land, and the shop you spent ${ACT1_SHIP_WEEK} weeks organizing does not exist in that configuration anymore. The window didn't close because you ran out of time. It closed because the business cycle was never going to wait for you.`,
    };
  }
  const signed = workers.filter(w => w.signed).length;
  const live = workers.filter(w => !w.burned && !w.signed).length;
  const burned = workers.filter(w => w.burned).length;
  const organizers = workers.filter(w => w.organizer && !w.burned).length;
  if (signed + live < ACT1_CARDS_NEEDED) {
    return {
      alive: false, signed, burned,
      reason: `${burned} ${burned === 1 ? "person is" : "people are"} out of the campaign for good. With ${signed} card${signed === 1 ? "" : "s"} signed and only ${live} ${live === 1 ? "person" : "people"} left who could still sign, this shop cannot reach the ${ACT1_CARDS_NEEDED} the labor board requires.`,
    };
  }
  if (organizers === 0) {
    return { alive: false, signed, burned, reason: `There is nobody left on the committee. Without an organizer on the floor there is no campaign to run.` };
  }
  return { alive: true, signed, burned, reason: null };
}

// ---------- THE INFLUENCE MAP ----------
// Directed and weighted: influence[a][b] is how much A moves B, which is not the same as
// how much B moves A. Same-team coworkers talk more, so ties cluster there, but the whole
// point is that team is a hint about who talks to whom, not the answer.
function generateInfluence(seed) {
  const inf = {};
  seed.forEach(w => { inf[w.id] = {}; });
  seed.forEach(a => {
    const others = seed.filter(o => o.id !== a.id);
    const ranked = others
      .map(b => ({ b, roll: Math.random() * (b.team === a.team ? 1 : 0.5) }))
      .sort((x, y) => y.roll - x.roll);
    const count = 2 + rand(2); // each person carries real weight with 2-3 coworkers
    ranked.slice(0, count).forEach(({ b }) => {
      const sameTeam = b.team === a.team;
      const weight = clamp(Math.round((sameTeam ? 45 : 28) + Math.random() * 45), 15, 95);
      inf[a.id][b.id] = Math.max(inf[a.id][b.id] || 0, weight);
    });
  });
  // Nobody is unreachable: everyone has at least one person who can move them.
  seed.forEach(b => {
    const hasIncoming = seed.some(a => a.id !== b.id && (inf[a.id][b.id] || 0) > 0);
    if (!hasIncoming) {
      const pool = seed.filter(a => a.id !== b.id && a.team === b.team);
      const a = (pool.length ? pool : seed.filter(x => x.id !== b.id))[rand(pool.length || seed.length - 1)];
      if (a) inf[a.id][b.id] = 35 + rand(25);
    }
  });
  // The two people you start with have to have somewhere to start. Guarantee each of them
  // real weight with at least three coworkers, or week one is a coin flip on the seed.
  seed.filter(w => w.organizer).forEach(o => {
    const strong = Object.values(inf[o.id]).filter(v => v >= 40).length;
    if (strong >= 3) return;
    const pool = seed.filter(b => b.id !== o.id && !b.organizer).sort(() => Math.random() - 0.5);
    let added = strong;
    pool.forEach(b => {
      if (added >= 3) return;
      if ((inf[o.id][b.id] || 0) >= 40) return;
      inf[o.id][b.id] = 45 + rand(30);
      added++;
    });
  });
  return inf;
}

// Authored per worker, not randomised — each one should be readable off their hook.
const INFLUENCE_ASSIGN = {
  1: "leader",    // Marisol — senior engineer, respected, newly burned by the review
  2: "quiet",     // Dante — new, happy, invisible
  3: "cautious",  // Priya — afraid of the stack ranking
  4: "leader",    // Wendell — remembers the old contract, people listen
  5: "hothead",   // Ashanti — posts about everything, first to call it out
  6: "wellliked", // Miguel — everyone routes their hardest problems to him
  7: "quiet",     // Brianna — transferred in, still learning the room
  8: "cautious",  // Tyrell — score dropped, nobody to ask
  9: "wellliked", // Sofia — unofficial team mom
  10: "connector",// Jake — in every Slack channel until midnight
  11: "leader",   // Camille — been in a union before, knows how it goes
  12: "stubborn", // Roz — principal engineer, wrote half the codebase
  13: "quiet",    // Omar — head down, numbers up
  14: "connector",// Fen — concept artist, touches every team
  15: "stubborn", // Gus — lived through a drive that fell apart
  16: "connector",// Naledi — runs the whole QA pipeline
  17: "cautious", // Theo — contract renewal in eleven weeks
  18: "hothead",  // Iris — her tools team got replaced without warning
  19: "wellliked",// Marcus — still mentors people on his own time
  20: "stubborn", // Delphine — narrative lead, thinks this slows the ship
};
function makeAct1Workers() {
  return ACT1_WORKERS_SEED.map(w => ({
    ...w,
    organizer: !!w.organizer,
    signed: !!w.organizer,
    influenceTrait: INFLUENCE_ASSIGN[w.id] || "quiet",
    signedWeek: w.organizer ? 1 : null,
    staleCount: 0,
    experience: w.organizer ? 45 : 0, // your two starters have already done this before
    weeksIdle: 0,
    ...(() => {
      // 3-5 affinities each. Your own two organizers start fully known — you already
      // know what your people talk about.
      const pool = [...AFFINITY_POOL].sort(() => Math.random() - 0.5);
      const affinities = pool.slice(0, 3 + rand(3)).map(a => a.id);
      return { affinities, knownAffinities: w.organizer ? [...affinities] : [], poisoned: [] };
    })(),
    // What they SAY is a signal the player can pick up for free. What they'd DO is the
    // card in front of them, and it starts lower for everyone but your own people.
    support: clamp(w.support + rand(9) - 4),
    trueSupport: w.organizer ? clamp(w.support) : clamp(w.support - 6 - rand(14)),
    trueKnown: !!w.organizer,
    trueKnownWeek: w.organizer ? 1 : null,
    spokenTo: !!w.organizer,
    guarded: 0,
    fulfillment: clamp(w.fulfillment + rand(9) - 4),
    burned: false,
    revealed: !!w.organizer, // you already know who your own two people reach
    shaken: 0,
    underPressure: 0,
    pressuredCount: 0,
    publicUses: { small: 0, medium: 0, large: 0 },
    quietWeeks: 0,
    askedRecently: 0,
    history: [],
  }));
}

const infOn = (influence, aId, bId) => (influence[aId] && influence[aId][bId]) || 0;
function outgoingTies(influence, aId) {
  return Object.entries(influence[aId] || {})
    .map(([id, weight]) => ({ id: Number(id), weight }))
    .sort((x, y) => y.weight - x.weight);
}
function incomingTies(influence, bId) {
  return Object.keys(influence)
    .map(aId => ({ id: Number(aId), weight: infOn(influence, Number(aId), bId) }))
    .filter(t => t.weight > 0)
    .sort((x, y) => y.weight - x.weight);
}
// The node-size number: total weight this person throws, counting only ties you've mapped.
function knownInfluence(influence, workers, aId) {
  const a = workers.find(w => w.id === aId);
  return outgoingTies(influence, aId)
    .filter(t => influenceKnown(a, workers.find(w => w.id === t.id)))
    .reduce((s, t) => s + t.weight, 0);
}

// Job fulfillment doesn't change whether someone signs — it changes who can move them.
// Two people who feel the same way about the work land much harder on each other.
// ---------- THE COMMITTEE DEVELOPS ----------
// The fantasy is building a network that organizes itself. A committee whose members
// are interchangeable hour-tokens cuts directly against that, so they aren't: people
// get better at this by doing it, and they fall away if you stop coming back to them.
const ORG_TIERS = [
  { min: 75, label: "LEAD ORGANIZER", hex: "#fbbf24", send: 1.30, bonusHours: 1,
    blurb: "Runs their own conversations without being told. +30% to everything they do, and an extra hour every week." },
  { min: 40, label: "SEASONED",       hex: "#a3e635", send: 1.15, bonusHours: 0,
    blurb: "Has had enough hard conversations to know how they go. +15% to everything they do." },
  { min: 0,  label: "NEW TO THIS",    hex: "#a8a29e", send: 1.00, bonusHours: 0,
    blurb: "Willing, but green. Gets better every week you actually use them." },
];
const orgTier = (w) => ORG_TIERS.find(t => (w.experience || 0) >= t.min) || ORG_TIERS[ORG_TIERS.length - 1];
const orgMult = (w) => (w?.organizer ? orgTier(w).send : 1);

// Experience comes from the work, not from being named to a list.
const XP_PER_ACTION = 7;
const XP_PER_CARD = 12;

// Neglect. Two weeks of grace, then they start giving you less, then they walk.
const IDLE_GRACE = 2;
const IDLE_QUIT = 5;
function idlePenalty(w) {
  return Math.max(0, (w.weeksIdle || 0) - IDLE_GRACE);
}
function committeeHours(w) {
  if (w.shaken > 0) return 1;
  return Math.max(0, ACT1_HOURS_PER_ORGANIZER + orgTier(w).bonusHours - idlePenalty(w));
}

// ---------- INFLUENCE TRAITS ----------
// Tier one. Unlike affinities these are VISIBLE from week one — you can tell who the
// floor already follows without being told. McAlevey's organic leader is the whole
// point: the person others actually take cues from, who almost never holds a title.
// These change how a worker moves people and how easily they get moved. They are not
// about connection — that is what affinities are for.
const INFLUENCE_TRAITS = [
  { id: "leader",   label: "ORGANIC LEADER", hex: "#fbbf24", send: 1.35, recv: 1.0,  signShift: 0,   burnMult: 1.0, passive: 1.0,
    blurb: "The floor already follows them. Everything they say to anyone lands 35% harder. Worth three hours to recruit." },
  { id: "wellliked",label: "WELL-LIKED",     hex: "#a3e635", send: 1.0,  recv: 1.1,  signShift: 0,   burnMult: 0.8, passive: 2.0,
    blurb: "No agenda, everybody's friend. Once they sign, they move people passively at double rate without spending an hour." },
  { id: "connector",label: "CONNECTOR",      hex: "#38bdf8", send: 1.15, recv: 1.0,  signShift: 0,   burnMult: 1.0, passive: 1.4, crossTeam: 1.6,
    blurb: "Knows people outside their own team. Their reach across department lines is worth 60% more — which is where campaigns are won." },
  { id: "stubborn", label: "STUBBORN",       hex: "#fb7185", send: 1.0,  recv: 0.6,  signShift: 0,   burnMult: 0.9, passive: 1.0, holdsFast: true,
    blurb: "Takes far more work to move. But nothing management does moves them back — once they're with you, they stay." },
  { id: "cautious", label: "CAUTIOUS",       hex: "#a8a29e", send: 0.95, recv: 1.0,  signShift: 12,  burnMult: 0.35, passive: 1.0,
    blurb: "Wants to see it work before committing. Needs 12 more points before they'll sign, and rarely draws management's eye." },
  { id: "hothead",  label: "HOTHEAD",        hex: "#f97316", send: 1.1,  recv: 1.15, signShift: -8,  burnMult: 1.9, passive: 1.0, publicGain: 1.4, publicHeat: 1.6,
    blurb: "Goes first and goes loud. Public actions hit 40% harder and draw 60% more heat — and they are the likeliest person to get walked out." },
  { id: "quiet",    label: "KEEPS THEIR HEAD DOWN", hex: "#78716c", send: 0.7, recv: 0.9, signShift: 6, burnMult: 0.1, passive: 0.6,
    blurb: "Nobody takes cues from them and nobody watches them either. Safe, slow, and easy to write off — which is a mistake at the count." },
];
const INF_BY_ID = Object.fromEntries(INFLUENCE_TRAITS.map(t => [t.id, t]));
const infTrait = (w) => INF_BY_ID[w?.influenceTrait] || INF_BY_ID.quiet;
const senderMult = (a) => infTrait(a).send * orgMult(a);
const recvMult = (b) => infTrait(b).recv;

function InfluenceTraitChip({ worker, size = "text-[11px]" }) {
  const t = infTrait(worker);
  return (
    <span title={t.blurb} className={`inline-flex items-center gap-1 px-1.5 py-0.5 border ${size}`}
      style={{ borderColor: t.hex, color: t.hex, backgroundColor: "rgba(0,0,0,0.2)" }}>
      {t.label}
    </span>
  );
}

// ---------- COMMON GROUND, DRAWN ----------
// Each affinity is a picture of the thing, not an abstract mark you have to be told the
// meaning of. Every icon lives in the same 0-10 box and paints with currentColor, so one
// definition serves the board, the panel and the hover line, and the surfaced / bought
// colour coding still applies.
const AFF_ICON = {
  dogs: (
    <>
      <path d="M5.7 3.6 L7.1 0.3 L8.9 3.8 Z" fill="currentColor" />
      <circle cx="6.4" cy="5.5" r="2.8" fill="currentColor" />
      <rect x="0.9" y="5.1" width="4.9" height="2.3" rx="1.15" fill="currentColor" />
      <circle cx="1.75" cy="5.8" r="0.7" fill="#100e0d" />
      <circle cx="6.7" cy="4.8" r="0.5" fill="#100e0d" />
    </>
  ),
  parent: (
    <>
      <circle cx="5" cy="2.1" r="1.7" fill="currentColor" />
      <path d="M5 3.9 L5 6.9 M2.6 5.1 L7.4 5.1 M5 6.9 L3.3 9.5 M5 6.9 L6.7 9.5"
        stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" fill="none" />
    </>
  ),
  commute: (
    <>
      <path d="M1 6.6 L1.9 4.3 L8.1 4.3 L9 6.6 Z" fill="currentColor" />
      <path d="M2.9 4.3 L3.7 2.4 L6.3 2.4 L7.1 4.3 Z" fill="currentColor" />
      <circle cx="2.9" cy="7.4" r="1.15" fill="currentColor" />
      <circle cx="7.1" cy="7.4" r="1.15" fill="currentColor" />
    </>
  ),
  ttrpg: (
    <>
      <path d="M5 0.7 L9.1 3.1 L9.1 6.9 L5 9.3 L0.9 6.9 L0.9 3.1 Z"
        fill="none" stroke="currentColor" strokeWidth="1.05" strokeLinejoin="round" />
      <path d="M5 2.7 L7.4 6.7 L2.6 6.7 Z" fill="currentColor" />
    </>
  ),
  veg: (
    <>
      {/* leafy tops */}
      <path d="M5 4.1 L5 0.5 M5 4.1 L2.9 1.4 M5 4.1 L7.1 1.4"
        stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* root, tapering to a point */}
      <path d="M3 3.9 L7 3.9 C6.6 6.2 5.9 8.2 5 9.6 C4.1 8.2 3.4 6.2 3 3.9 Z" fill="currentColor" />
      {/* the ridges are what stop it reading as a plain triangle */}
      <path d="M3.85 5.4 L6.15 5.4 M4.3 7 L5.7 7" stroke="#100e0d" strokeWidth="0.55" strokeLinecap="round" />
    </>
  ),
  gym: (
    <>
      <path d="M2.9 5 L7.1 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="0.7" y="2.6" width="1.9" height="4.8" rx="0.5" fill="currentColor" />
      <rect x="7.4" y="2.6" width="1.9" height="4.8" rx="0.5" fill="currentColor" />
    </>
  ),
  transplant: (
    <>
      <path d="M3.8 2.9 L3.8 1.5 L6.2 1.5 L6.2 2.9" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <rect x="1" y="2.9" width="8" height="5.6" rx="0.7" fill="currentColor" />
      <path d="M5 2.9 L5 8.5" stroke="#0c0a09" strokeWidth="0.7" />
    </>
  ),
  debt: (
    <>
      <path d="M5 0.7 L5 9.3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M7.5 2.9 C7.5 1.5 2.5 1.3 2.5 3.7 C2.5 5.8 7.5 4.5 7.5 6.6 C7.5 9 2.5 8.7 2.5 7.1"
        fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
    </>
  ),
  modder: (
    <>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <rect key={a} x="4.3" y="0.4" width="1.4" height="2.4" rx="0.35" fill="currentColor" transform={`rotate(${a} 5 5)`} />
      ))}
      <circle cx="5" cy="5" r="2.85" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="5" r="0.85" fill="currentColor" />
    </>
  ),
  secondjob: (
    <>
      <circle cx="5" cy="5" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.05" />
      <path d="M5 5 L5 2.6 M5 5 L7 6.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  caretaker: (
    <path d="M5 8.9 C0.9 6 0.9 3.3 2.6 2.3 C3.9 1.5 5 2.7 5 3.6 C5 2.7 6.1 1.5 7.4 2.3 C9.1 3.3 9.1 6 5 8.9 Z"
      fill="currentColor" />
  ),
  smoker: (
    <>
      <rect x="1" y="6.1" width="5.6" height="1.7" rx="0.4" fill="currentColor" />
      <rect x="7" y="6.1" width="2" height="1.7" rx="0.4" fill="currentColor" fillOpacity="0.55" />
      <path d="M3.1 4.6 C4.1 3.7 2.6 3.1 3.6 2.1" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </>
  ),
  church: (
    <>
      <path d="M5 0.8 L5 9.2 M2.4 3.7 L7.6 3.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </>
  ),
  vet: (
    <path d="M5 0.6 L6.4 3.7 L9.7 4.1 L7.2 6.3 L7.9 9.5 L5 7.9 L2.1 9.5 L2.8 6.3 L0.3 4.1 L3.6 3.7 Z"
      fill="currentColor" />
  ),
};

// The same drawing in an HTML context — panels, the hover line.
function AffIcon({ id, size = 13, hex = "currentColor", title }) {
  const art = AFF_ICON[id];
  if (!art) return null;
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} style={{ color: hex, display: "inline-block", verticalAlign: "-0.15em" }} aria-hidden="true">
      {title ? <title>{title}</title> : null}
      {art}
    </svg>
  );
}

// ---------- AFFINITY TRAITS ----------
// Tier two of the trait system. These do not make anyone a better organizer — they
// decide WHO can reach WHOM. Hidden until a conversation surfaces them, which is the
// whole reason the quick chat exists as an action.
// Each one also names the perk the company can buy it with. A perk is not a bribe
// aimed at a person — it is aimed at a THING PEOPLE HAVE IN COMMON, which is the
// thing the campaign was using to reach them.
const AFFINITY_POOL = [
  { id: "dogs", label: "Dog person",
    perk: "Dog-Friendly Fridays", barb: "A photo wall goes up by reception within a week." },
  { id: "parent", label: "Has small kids",
    perk: "backup childcare stipend", barb: "Capped, reimbursed quarterly, and worth less than the raise it replaced." },
  { id: "commute", label: "Long commute",
    perk: "transit subsidy", barb: "Ninety dollars a month, and a reminder of who pays it, every month." },
  { id: "ttrpg", label: "Runs a tabletop game",
    perk: "games room, bookable after hours", barb: "The company now hosts the thing they did to get away from the company." },
  { id: "veg", label: "Vegetarian",
    perk: "catered lunch with a real plant-based menu", barb: "Thursdays. Attendance is noted, warmly." },
  { id: "gym", label: "Lifts before shift",
    perk: "gym reimbursement", barb: "Submitted through the same portal as the performance review." },
  { id: "transplant", label: "Moved here for the job",
    perk: "relocation top-up, paid late", barb: "Money they were owed, arriving now, framed as generosity." },
  { id: "debt", label: "Carrying student debt",
    perk: "student loan matching", barb: "Vests over four years. Nobody says the word \u2018vests\u2019 out loud." },
  { id: "modder", label: "Came up through modding",
    perk: "company game jam, on the clock", barb: "The one weekend a year the work feels like it used to." },
  { id: "secondjob", label: "Works a second job",
    perk: "shift-flexibility pilot", barb: "A pilot. Reviewed in six months, by the people running it." },
  { id: "caretaker", label: "Cares for a parent",
    perk: "eldercare leave", barb: "Unpaid, but approved quickly, and everyone hears whose was approved." },
  { id: "smoker", label: "Takes the loading-dock break",
    perk: "covered patio with heaters", barb: "The dock was where people talked without a manager in earshot." },
  { id: "church", label: "Church every Sunday",
    perk: "Sunday shifts made voluntary", barb: "Voluntary, and the schedule still gets written by someone." },
  { id: "vet", label: "Veteran",
    perk: "veterans\u2019 resource group, company-sponsored", barb: "A group for them, chaired by HR, meeting on company time." },
];

// How long a perk keeps an affinity from working as common ground. It wears off —
// people notice the dog day was a one-off — but six weeks is most of a card drive.
const PERK_WEEKS = 6;
const AFF_BY_ID = Object.fromEntries(AFFINITY_POOL.map(a => [a.id, a]));

const affList = (w) => w?.affinities || [];
const knownAff = (w) => w?.knownAffinities || [];
const poisonedAff = (w) => w?.poisoned || [];
const isPoisoned = (w, t) => poisonedAff(w).includes(t);
// What actually exists between two people — minus anything the company has bought.
// A poisoned affinity is still true about both of them. It just stops being yours:
// once the company sponsors the thing they have in common, bringing it up in a
// conversation is bringing up the company.
function sharedAffinities(a, b) {
  return affList(a).filter(t => affList(b).includes(t) && !isPoisoned(a, t) && !isPoisoned(b, t));
}
// What the PLAYER can see — a match only helps you plan if you've surfaced it on both.
function visibleShared(a, b) {
  return sharedAffinities(a, b).filter(t => knownAff(a).includes(t) && knownAff(b).includes(t));
}
// ---------- COMMON GROUND IS WHAT THE MAP IS MADE OF ----------
// Affinity is not a second system running alongside the influence map. It is what the
// map is made of. There is one number for a relationship — the tie — and the symbols
// under somebody's name are the reason the line into them is as thick as it is.
//
// It amplifies the standing two people already had rather than manufacturing standing
// out of nothing: finding out you both have dogs makes a real difference to somebody you
// already talk to, and gets you a foot in the door with somebody you don't. And it
// counts only what you have SURFACED. Common ground nobody has found yet is doing no
// work for anybody, which is the whole argument for scouting the floor.
//
// The multipliers are the old affinity multiplier's own numbers, moved from the gain to
// the relationship, which is where they always belonged. Every formula downstream kept
// its original shape and simply reads the tie where it used to read raw influence.
const TIE_COLD = 0.7;          // a relationship with nothing found in it
const TIE_PER_SHARED = 0.35;   // and what each surfaced thing is worth on top
const TIE_STRANGER_STEP = 3;   // a foot in the door for two people with no standing
const TIE_SHARED_CAP = 3;
function tieBonus(a, b) {
  return Math.min(TIE_SHARED_CAP, visibleShared(a, b).length);
}
function tieFrom(base, a, b) {
  const n = tieBonus(a, b);
  return Math.round(clamp(base * (TIE_COLD + TIE_PER_SHARED * n) + TIE_STRANGER_STEP * n));
}
function tieOn(influence, a, b) {
  return tieFrom(infOn(influence, a.id, b.id), a, b);
}

// ---------- FULFILLMENT AS COMPLACENCY ----------
// Fulfillment no longer decides who persuades whom. It decides how much a person
// feels they'd be risking. Someone who loves this job hesitates longer over the card —
// and that is exactly the lever the company buys with offsites and new hardware.
function complacencyMult(target) {
  return clamp(1 - 0.006 * (target.fulfillment - 45), 0.55, 1.25);
}

// You know the reach of your own people — they can tell you who'd take their call.
// What you can't see is the rest of the floor's web: who moves the people you haven't
// worked yet. That is what a conversation buys, and it is what tells you who is worth recruiting.
const ASSUMED_INFLUENCE = 35;
function influenceKnown(actor, target) {
  return !!(actor?.revealed || target?.revealed);
}
function shownInfluence(influence, actor, target) {
  return influenceKnown(actor, target) ? infOn(influence, actor.id, target.id) : ASSUMED_INFLUENCE;
}

const CONVO_BASE = { quick: 5, deep: 12 };
// A quick chat moves what someone SAYS more than what they'd do — it's a pleasant
// exchange, not an ask. A deep conversation is the only action that reliably moves the
// number underneath, and only when the two of them actually have something in common.
const TRUE_RATIO = { quick: 0.35, deep: 0.9 };
function convoGain(actor, target, tie) {
  const scale = (0.45 + 0.85 * (tie / 100)) * senderMult(actor) * recvMult(target);
  const quick = Math.max(1, Math.round(CONVO_BASE.quick * scale));
  const deep = Math.max(2, Math.round(CONVO_BASE.deep * scale));
  return {
    quick, deep,
    quickTrue: Math.max(0, Math.round(quick * TRUE_RATIO.quick)),
    deepTrue: Math.max(1, Math.round(deep * TRUE_RATIO.deep)),
  };
}

// THE ANSWER TO "why not deep-talk everyone." It isn't the hour cost — it's that a
// structured organizing conversation run on someone you haven't scouted lands as a
// pitch. They get guarded, and a guarded worker is harder to move for weeks.
function misfireChance(actor, target) {
  if (visibleShared(actor, target).length > 0) return 0;
  const blindness = affList(target).filter(t => !knownAff(target).includes(t)).length;
  return Math.min(0.55, 0.16 + 0.09 * blindness);
}
// How many affinities a conversation surfaces. Rapport opens people up, so a sender who
// already shares ground with them learns more.
function revealCount(kind, actor, target) {
  const rapport = sharedAffinities(actor, target).length > 0 ? 1 : 0;
  return kind === "deep" ? 3 + rand(2) : 1 + rand(2) + rapport;
}
function revealAffinities(target, n) {
  const hidden = affList(target).filter(t => !knownAff(target).includes(t));
  const picked = hidden.sort(() => Math.random() - 0.5).slice(0, n);
  target.knownAffinities = [...knownAff(target), ...picked];
  return picked;
}

// Support is not action. Readiness gates everything, but who's asking still matters.
function signChance(actor, target, tie) {
  if (target.signed) return 0;
  // Deliberately concave: a worker at 70 support is nowhere near twice as likely to sign
  // as one at 55. Saying you're for it and putting your name on paper are different acts.
  // Rolls against TRUE support, not the number the player has been watching. The gap
  // between the two is the whole lesson: a floor that says yes can still not sign.
  const real = target.trueSupport ?? target.support;
  // CAUTIOUS needs to see it working first; HOTHEAD signs before they have thought it through.
  const bar = 45 + (infTrait(target).signShift || 0);
  const readiness = Math.pow(Math.max(0, Math.min(1, (real - bar) / 50)), 1.3);
  const trustPart = 0.55 + 0.45 * (tie / 100);
  const recent = target.askedRecently > 0 ? 0.6 : 1;
  const guard = target.guarded > 0 ? 0.65 : 1;
  return Math.min(0.93, readiness * trustPart * recent * guard * complacencyMult(target) * senderMult(actor));
}

const PUBLIC_TIERS = {
  small: { base: 6, heat: 3, burn: 0, selfSupport: 3, blurb: "Wears the button on the floor all week and answers questions about it." },
  medium: { base: 11, heat: 7, burn: 0.06, selfSupport: 5, blurb: "Puts their name at the top of an open letter about the Play-Eye rollout." },
  large: { base: 19, heat: 14, burn: 0.18, selfSupport: 8, blurb: "Stands up at the all-hands and says it out loud, with their name on it." },
};
// The second time someone wears the button it isn't news, and the third time even less.
// Repeating one cheap public action forever should lose to escalating — that's how
// structure tests actually work.
function publicFatigue(uses) {
  return 1 / (1 + 0.6 * uses);
}
function publicGain(actor, target, tie, tier, uses = 0) {
  const t = infTrait(actor);
  const cross = infTrait(actor).crossTeam && actor.team !== target.team ? t.crossTeam : 1;
  return Math.round(
    PUBLIC_TIERS[tier].base * (tie / 100) * publicFatigue(uses)
    * senderMult(actor) * recvMult(target) * (t.publicGain || 1) * cross
  );
}

const ACT1_ACTION = {
  quick: { label: "Quick chat", hours: 1, short: "chat" },
  deep: { label: "Deep conversation", hours: 2, short: "deep talk" },
  ask: { label: "Ask them to sign a card", hours: 2, short: "card ask" },
  recruit: { label: "Bring onto the committee", hours: 3, short: "recruit" },
  small: { label: "Small public action", hours: 1, short: "small action" },
  medium: { label: "Medium public action", hours: 2, short: "medium action" },
  large: { label: "Big public action", hours: 3, short: "big action" },
  checkin: { label: "Check in with them", hours: 1, short: "check-in" },
};

// ---------- SYMBOLS, NOT SENTENCES ----------
// Everything the player has to compare at a glance is a shape. Text is for the things
// that only get read once.

// Cost and budget as filled/empty pips. One pip is one hour.
function Pips({ filled = 0, total = 0, hex = "#fbbf24", size = 7, gap = 3, dim = false }) {
  return (
    <span className="inline-flex items-center" style={{ gap }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: size, height: size, borderRadius: "50%",
            backgroundColor: i < filled ? hex : "transparent",
            border: `1px solid ${i < filled ? hex : "#57534e"}`,
            opacity: dim ? 0.35 : 1,
          }}
        />
      ))}
    </span>
  );
}
// ---------- TIME IS A PIE, NOT PIPS ----------
// Pips mean commitment. Hours are a different resource and get a different shape: a
// week cut into as many slices as the person has hours, filled with what's left. The
// promotion to a fourth hour re-cuts the same circle into quarters instead of thirds,
// which makes the promotion something you can see rather than read.
function pieSlicePath(cx, cy, r, i, n) {
  const a0 = (-90 + (i * 360) / n) * (Math.PI / 180);
  const a1 = (-90 + ((i + 1) * 360) / n) * (Math.PI / 180);
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${360 / n > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
}

// Bare SVG shapes, so the same pie can be drawn inside the floor map's own <svg> and
// inside a standalone one in the panels.
function HourPieShapes({ cx, cy, r, left, total, hex, sw = 0.9, bg = "#1c1917" }) {
  const n = Math.max(1, total);
  const lit = Math.max(0, Math.min(n, left));
  if (n === 1) {
    return <circle cx={cx} cy={cy} r={r} fill={lit >= 1 ? hex : "none"} stroke={hex} strokeWidth={sw} strokeOpacity={lit >= 1 ? 1 : 0.4} />;
  }
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        // A filled wedge is cut from its neighbours in the panel colour, so three hours
        // still read as thirds instead of one solid disc. An empty wedge keeps its own
        // faint outline, so you can count the slices on a week that's fully spent.
        <path
          key={i}
          d={pieSlicePath(cx, cy, r, i, n)}
          fill={i < lit ? hex : "none"}
          stroke={i < lit ? bg : hex}
          strokeWidth={sw}
          strokeOpacity={i < lit ? 1 : 0.35}
          strokeLinejoin="round"
        />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={hex} strokeWidth={sw} strokeOpacity="0.6" />
    </>
  );
}

function HourPie({ left, total, hex = "#fbbf24", size = 15, label }) {
  return (
    <span className="inline-flex items-center shrink-0" title={label ?? `${left} of ${total} hour${total === 1 ? "" : "s"} left`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block overflow-visible">
        <HourPieShapes cx={size / 2} cy={size / 2} r={size / 2 - 1} left={left} total={total} hex={hex} sw={1} />
      </svg>
    </span>
  );
}

// The price tag on every action button. Not a pie: a pie shows time REMAINING, and a
// second pie next to it showing time SPENT would read as the same shape meaning the
// opposite thing.
function CostPips({ hours, affordable = true }) {
  return (
    <span
      className={`text-xs font-bold tabular-nums shrink-0 ${affordable ? "text-amber-400" : "text-stone-600"}`}
      title={`${hours} hour${hours === 1 ? "" : "s"}`}
    >
      {hours}h
    </span>
  );
}

// ---------- THE COMMITMENT LADDER ----------
// The playtest note was right: someone who "supports" the union without doing anything
// isn't a member of anything. So say so. Each rung is a costlier act, and the pip count
// is the whole state of a person on the floor.
const LADDER = [
  { id: "committee", label: "COMMITTEE", pips: 4, hex: "#fbbf24", blurb: "Organizes other people. Their relationships are yours to direct." },
  { id: "signed", label: "SIGNED", pips: 3, hex: "#2dd4bf", blurb: "Put their name on a card. This is the only number the labor board counts." },
  { id: "supporter", label: "SUPPORTER", pips: 2, hex: "#a3e635", blurb: "Says they're for it. Has given the union nothing yet." },
  { id: "contacted", label: "CONTACTED", pips: 1, hex: "#a8a29e", blurb: "You've had a conversation. That's all." },
  { id: "cold", label: "UNTOUCHED", pips: 0, hex: "#57534e", blurb: "Nobody has talked to them." },
];
const LADDER_BY_ID = Object.fromEntries(LADDER.map(r => [r.id, r]));
function ladderOf(w) {
  if (w.organizer) return LADDER_BY_ID.committee;
  if (w.signed) return LADDER_BY_ID.signed;
  if (w.support >= 55) return LADDER_BY_ID.supporter;
  if ((w.history && w.history.length > 0) || w.revealed) return LADDER_BY_ID.contacted;
  return LADDER_BY_ID.cold;
}

// The contract act climbs the same shape, but the rungs are different acts. Signing a
// card is not what is being asked for any more, so SIGNED cannot be the rung that
// matters — turning out is. The board takes these as props the way it takes `labels`.
const CONTRACT_LADDER = [
  { id: "committee", label: "ACTION TEAM", pips: 4, hex: "#fbbf24", blurb: "Runs the actions and brings other people out. Their relationships are yours to direct." },
  { id: "signed", label: "TURNED OUT", pips: 3, hex: "#2dd4bf", blurb: "Showed up at the last action. This is the only thing the company actually counts." },
  { id: "supporter", label: "SAYS YES", pips: 2, hex: "#a3e635", blurb: "Says they're in. Has not shown up to anything yet." },
  { id: "contacted", label: "SPOKEN TO", pips: 1, hex: "#a8a29e", blurb: "Sat down with recently, so you know where they actually are." },
  { id: "cold", label: "OUT OF TOUCH", pips: 0, hex: "#57534e", blurb: "Nobody has been near them lately. Whatever you think you know about them is old." },
];
const CONTRACT_LADDER_BY_ID = Object.fromEntries(CONTRACT_LADDER.map(r => [r.id, r]));
// Everyone carries an Act One history and arrives revealed, so "have you ever spoken to
// them" is true of the whole floor and says nothing. What matters now is whether the
// read is still good, which is the same test the panel and the projection already use.
function contractLadderOf(w, month = 1) {
  if (w.organizer) return CONTRACT_LADDER_BY_ID.committee;
  if (w.signed) return CONTRACT_LADDER_BY_ID.signed;
  if (w.support >= 55) return CONTRACT_LADDER_BY_ID.supporter;
  if (month - (w.spokenMonth ?? -99) <= CONTRACT_READ_FRESH) return CONTRACT_LADDER_BY_ID.contacted;
  return CONTRACT_LADDER_BY_ID.cold;
}

function LadderBadge({ worker, showLabel = true }) {
  const r = ladderOf(worker);
  return (
    <span className="inline-flex items-center gap-1.5" title={r.blurb}>
      <Pips filled={r.pips} total={4} hex={r.hex} size={7} gap={2.5} dim={worker.burned} />
      {showLabel && <span className="text-[11px] font-bold tracking-wide" style={{ color: r.hex }}>{r.label}</span>}
    </span>
  );
}

// Common ground, drawn. A trait both people share lights up — that is the entire
// "who do I send" decision, rendered without a sentence.
// One wording for an affinity nobody has found yet, so the board and the panel say the
// same thing about the same mark.
const AFF_UNKNOWN_LABEL = "Not surfaced yet";
const AFF_UNKNOWN_SUB = "A quick chat is the cheapest way to find out.";

// The tooltip body, shared by both places a mark can be hovered. Positioning is the
// caller's job, because the board places it in percentages over an SVG and the panel
// places it against the mark itself.
function AffTip({ tone, label, sub }) {
  return (
    <div className={`whitespace-nowrap border bg-stone-950 px-2.5 py-1.5 shadow-lg ${tone === "bought" ? "border-red-700" : tone === "unknown" ? "border-stone-700" : "border-stone-600"}`}>
      <div className={`text-sm font-bold leading-tight ${tone === "bought" ? "text-red-400" : tone === "unknown" ? "text-stone-400" : "text-stone-100"}`}>{label}</div>
      <div className="text-xs text-stone-500 leading-tight mt-0.5">{sub}</div>
    </div>
  );
}

// Wraps a mark in the panel so it raises the same tooltip the board does, rather than a
// browser title that looks nothing like it and arrives a second late.
function MarkWithTip({ tone, label, sub, children }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && (
        <span className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 pointer-events-none">
          <AffTip tone={tone} label={label} sub={sub} />
        </span>
      )}
    </span>
  );
}

// An affinity nobody has surfaced, drawn the same way in both places: a dashed slot with
// nothing in it yet.
function AffEmptySlot({ size = 30 }) {
  return (
    <span className="inline-flex items-center justify-center border border-dashed border-stone-700"
      style={{ width: size, height: size }}>
      <span className="rounded-full border border-stone-700" style={{ width: size * 0.27, height: size * 0.27 }} />
    </span>
  );
}

// Symbols, at a size you can actually read, with the name on hover. A mark shared with
// whoever is doing the asking lights up teal, because that is the only thing on this row
// the player is deciding on. An empty ring is something about them nobody has found yet.
function AffinityMarks({ worker, actor = null }) {
  const known = knownAff(worker);
  const hidden = affList(worker).length - known.length;
  if (!known.length && !hidden) return null;
  const shared = actor ? visibleShared(actor, worker) : [];
  return (
    <>
      {known.map(id => {
        const a = AFF_BY_ID[id];
        const match = shared.includes(id);
        const bought = isPoisoned(worker, id);
        return (
          <MarkWithTip
            key={id}
            tone={bought ? "bought" : "known"}
            label={a.label}
            sub={bought ? "The company sponsors this now \u2014 it counts for nothing."
              : match ? `${actor.name} shares this \u2014 a sit-down has something to open on.`
              : "Shared common ground makes a conversation land harder."}
          >
          <span
            className="inline-flex items-center justify-center border"
            style={{
              width: 30, height: 30,
              borderColor: bought ? "#7f1d1d" : match ? "#2dd4bf" : "#44403c",
              color: bought ? "#f87171" : match ? "#5eead4" : "#a8a29e",
              backgroundColor: match ? "rgba(45,212,191,0.12)" : "transparent",
            }}
          >
            <AffIcon id={a.id} size={17} />
          </span>
          </MarkWithTip>
        );
      })}
      {Array.from({ length: hidden }).map((_, i) => (
        <MarkWithTip key={"h" + i} tone="unknown" label={AFF_UNKNOWN_LABEL} sub={AFF_UNKNOWN_SUB}>
          <AffEmptySlot />
        </MarkWithTip>
      ))}
      {shared.length > 0 && (
        <span className="text-xs text-teal-300 ml-1">
          {shared.length} in common with {actor.name}
        </span>
      )}
    </>
  );
}


// ---------- SHARED BITS OF UI ----------
function InfoDot({ children, align = "center" }) {
  const pos = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span className="relative group inline-flex items-center align-middle ml-1">
      <span className="w-3 h-3 rounded-full border border-stone-600 text-stone-500 text-[10px] leading-[10px] text-center cursor-help transition-colors group-hover:border-amber-500 group-hover:text-amber-400 font-mono">i</span>
      <span className={`pointer-events-none absolute ${pos} bottom-full mb-1.5 z-50 hidden group-hover:block w-64 sm:w-72 border border-stone-600 bg-stone-950 px-2.5 py-2 text-xs leading-relaxed text-stone-300 normal-case tracking-normal text-left shadow-xl`}>
        {children}
      </span>
    </span>
  );
}

function StatRow({ label, value, suffix, hex, info, align, sub }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs text-stone-500 tracking-wide">
        <span className="flex items-center">{label}<InfoDot align={align}>{info}</InfoDot></span>
        <span className="font-bold text-stone-200">{value}{suffix}</span>
      </div>
      <div className="h-1.5 bg-stone-800 mt-1">
        <div className="h-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: hex }} />
      </div>
      {sub && <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">{sub}</div>}
    </div>
  );
}

function Stars({ count, size = "text-3xl" }) {
  return (
    <div className={`${size} tracking-widest`}>
      {[1, 2, 3].map(i => (
        <span key={i} className={i <= count ? "text-amber-400" : "text-stone-700"}>★</span>
      ))}
    </div>
  );
}

// ---------- THE ORG CHART (Act One board) ----------
// The chart is the company's own picture of itself: teams, boxes, reporting lines.
// The influence arrows drawn on top of it are the real structure, and the whole point
// is that they don't respect the boxes. Organizing runs on the second map, not the first.
// A tie below this is too weak to draw, and too weak for a public action to carry along.
const EDGE_MIN_DRAW = 20;
const ORG_CARD_W = 42;
const ORG_CARD_H = 25;
const ORG_COL_GAP = 3;
const ORG_ROW_GAP = 4.5;
const ORG_TEAM_GAP = 13;
const ORG_MARGIN = 6;
const ORG_TEAM_COLS = 2;
const ORG_ROOT_H = 12;
const ORG_HEADER_H = 11;
// Common ground you have surfaced, wherever it is marked.
const EDGE_COMMON_GROUND = "#2dd4bf";

// Fixed layout — the org chart never moves, so the player learns one stable picture of
// the floor instead of re-reading a new arrangement every week.
function computeOrgLayout(seed) {
  const teams = Object.keys(TEAM_LABEL);
  const blockW = ORG_TEAM_COLS * ORG_CARD_W + (ORG_TEAM_COLS - 1) * ORG_COL_GAP;
  const width = ORG_MARGIN * 2 + teams.length * blockW + (teams.length - 1) * ORG_TEAM_GAP;
  const rootY = 2;
  const headerY = rootY + ORG_ROOT_H + 11;
  const gridY = headerY + ORG_HEADER_H + 6;

  const cards = {};
  const teamBoxes = {};
  let maxRows = 0;
  teams.forEach((team, ti) => {
    const bx = ORG_MARGIN + ti * (blockW + ORG_TEAM_GAP);
    const members = seed.filter(w => w.team === team);
    const rows = Math.ceil(members.length / ORG_TEAM_COLS);
    maxRows = Math.max(maxRows, rows);
    teamBoxes[team] = {
      x: bx, y: headerY, w: blockW, h: ORG_HEADER_H,
      cx: bx + blockW / 2, cy: headerY + ORG_HEADER_H / 2,
      spineX: bx + blockW / 2,
      spineEndY: gridY + (rows - 1) * (ORG_CARD_H + ORG_ROW_GAP) + ORG_CARD_H / 2,
      count: members.length,
    };
    members.forEach((m, i) => {
      const col = i % ORG_TEAM_COLS;
      const row = Math.floor(i / ORG_TEAM_COLS);
      const x = bx + col * (ORG_CARD_W + ORG_COL_GAP);
      const y = gridY + row * (ORG_CARD_H + ORG_ROW_GAP);
      cards[m.id] = { x, y, w: ORG_CARD_W, h: ORG_CARD_H, cx: x + ORG_CARD_W / 2, cy: y + ORG_CARD_H / 2, team, col };
    });
  });

  const height = gridY + maxRows * ORG_CARD_H + (maxRows - 1) * ORG_ROW_GAP + 3;
  const root = { x: width / 2 - 38, y: rootY, w: 76, h: ORG_ROOT_H, cx: width / 2, cy: rootY + ORG_ROOT_H / 2 };
  return { cards, teamBoxes, root, width, height, headerY, gridY };
}

const ORG_LAYOUT = computeOrgLayout(ACT1_WORKERS_SEED);

// Where a line from a card's centre crosses that card's border, so arrows start and end
// at the box edge instead of disappearing underneath it.
function cardEdgePoint(card, dx, dy, pad = 0) {
  const adx = Math.abs(dx), ady = Math.abs(dy);
  const tx = adx > 1e-6 ? (card.w / 2 + pad) / adx : Infinity;
  const ty = ady > 1e-6 ? (card.h / 2 + pad) / ady : Infinity;
  const t = Math.min(tx, ty);
  return { x: card.cx + dx * t, y: card.cy + dy * t };
}

// labels lets a second act reuse this board with its own vocabulary — the geometry,
// influence arrows and card layout are identical, only the words change.
const FLOOR_LABELS = { organizerLegend: "YOURS TO DIRECT", signedLegend: "SIGNED A CARD", numberLegend: "SUPPORT" };

function Act1FloorMap({ workers, influence, staleWeek = null, weekNow = 1, layout = ORG_LAYOUT, planEntries = [], onSelect, onArm = null, highlights = null, edgePulses = [], stepKey = 0, notes = null, focusId = null, labels = FLOOR_LABELS, ladder = LADDER, rungOf = ladderOf, hoursLeft = null, tierOf = null, planLabel = (e) => ACT1_ACTION[e.type]?.short ?? e.type }) {
  const [hoverId, setHoverId] = useState(null);
  // Which common-ground mark the cursor is on. The tooltip is HTML rather than SVG so
  // its type is real pixels — the SVG version scaled down to about eight of them.
  const [hoverAff, setHoverAff] = useState(null);
  const anyRevealed = workers.some(w => w.revealed && !w.organizer);
  const active = hoverId != null ? hoverId : focusId;
  // The organizer the player has picked to act. Once somebody is armed, every card on
  // the floor lights the marks it has in common with them — which is the whole of the
  // deep-conversation decision, and the biggest cliff in the game: a sit-down with
  // somebody you share nothing with misfires and guards them for three weeks.
  const armed = focusId != null ? workers.find(x => x.id === focusId && x.organizer && !x.burned) : null;

  // An influence line is visible once either end is known to you — you can see your own
  // people's reach from day one, and sitting down with somebody reveals theirs.
  // Kept as a stat rather than a picture: how much of the floor's real structure you have
  // found, and how much of it the org chart would never have told you.
  const mapped = (() => {
    let total = 0, cross = 0;
    workers.forEach(a => {
      outgoingTies(influence, a.id).forEach(t => {
        const b = workers.find(x => x.id === t.id);
        if (!b || !influenceKnown(a, b)) return;
        if (tieFrom(t.weight, a, b) < EDGE_MIN_DRAW) return;
        total++; if (a.team !== b.team) cross++;
      });
    });
    return { total, cross };
  })();

  const plannedByWorker = {};
  planEntries.forEach(e => {
    const key = e.targetId != null ? e.targetId : e.actorId;
    if (!plannedByWorker[key]) plannedByWorker[key] = [];
    plannedByWorker[key].push(planLabel(e));
  });
  const planArrows = planEntries.filter(e => e.targetId != null);

  const hovered = workers.find(w => w.id === active);
  const hoveredOut = hovered ? outgoingTies(influence, hovered.id).filter(t => influenceKnown(hovered, workers.find(w => w.id === t.id))) : [];
  const hoveredIn = hovered && hovered.revealed ? incomingTies(influence, hovered.id) : [];
  const nameOf = (id) => workers.find(w => w.id === id)?.name || "?";
  const teamOf = (id) => workers.find(w => w.id === id)?.team;

  // Who the active person actually reaches, read straight off the influence map now that
  // nothing is drawn between the cards.
  const reaches = (aId, bId) => {
    const a = workers.find(x => x.id === aId), b = workers.find(x => x.id === bId);
    return !!a && !!b && influenceKnown(a, b) && tieFrom(infOn(influence, aId, bId), a, b) >= EDGE_MIN_DRAW;
  };
  const connectedToActive = (id) =>
    active != null && (id === active || reaches(active, id) || reaches(id, active));

  return (
    <div className="border-2 border-stone-800 bg-stone-900 card-perf mb-6">
      <div className="flex items-center justify-between px-3 pt-2 flex-wrap gap-y-1">
        <div className="font-stencil text-lg tracking-wide text-stone-200">THE FLOOR</div>
        {/* What the two card borders mean. The words come from `labels` so a second act
            can reuse this board without describing its own board in Act One's vocabulary. */}
        <div className="flex items-center gap-3 flex-wrap text-[10px]">
          <span className="flex items-center gap-1.5" title="You can spend this person's hours.">
            <span className="w-2.5 h-2 shrink-0 border" style={{ borderColor: "#f59e0b" }} />
            <span className="text-stone-400">{labels.organizerLegend}</span>
          </span>
          <span className="flex items-center gap-1.5" title="They are with you, but their hours are not yours to spend.">
            <span className="w-2.5 h-2 shrink-0 border" style={{ borderColor: "#2dd4bf" }} />
            <span className="text-stone-400">{labels.signedLegend}</span>
          </span>
          <span className="flex items-center gap-1.5" title="Not yet — or no longer.">
            <span className="w-2.5 h-2 shrink-0 border" style={{ borderColor: "#44403c" }} />
            <span className="text-stone-600">NEITHER</span>
          </span>
          {labels.numberLegend && (
            <span className="flex items-center gap-1.5 border-l border-stone-800 pl-3" title="What the big number on each card is measuring.">
              <span className="font-mono text-stone-400 font-bold">42</span>
              <span className="text-stone-500">=</span>
              <span className="text-stone-300 font-bold">{labels.numberLegend}</span>
            </span>
          )}
        </div>
      </div>


      {/* THE LADDER. Left to right is the whole campaign. */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] mb-2 px-0.5">
        {[...ladder].reverse().map((r, i) => (
          <span key={r.id} className="flex items-center gap-1.5" title={r.blurb}>
            {i > 0 && <span className="text-stone-700 mr-1">{"\u203a"}</span>}
            <Pips filled={r.pips} total={4} hex={r.hex} size={5} gap={1.5} />
            <span style={{ color: r.hex }}>{r.label}</span>
          </span>
        ))}
      </div>

      <div className="relative">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="w-full block select-none">
        <defs>
          <marker id="org-arrow-hot" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#fbbf24" />
          </marker>
        </defs>

        {/* ---- the company's own chart: reporting lines, drawn underneath everything ---- */}
        <g stroke="#3a3330" strokeWidth="0.5" fill="none">
          <line x1={layout.root.cx} y1={layout.root.y + layout.root.h} x2={layout.root.cx} y2={layout.headerY - 5.5} />
          <line
            x1={layout.teamBoxes[Object.keys(TEAM_LABEL)[0]].cx}
            y1={layout.headerY - 5.5}
            x2={layout.teamBoxes[Object.keys(TEAM_LABEL)[Object.keys(TEAM_LABEL).length - 1]].cx}
            y2={layout.headerY - 5.5}
          />
          {Object.values(layout.teamBoxes).map((tb, i) => (
            <line key={`drop-${i}`} x1={tb.cx} y1={layout.headerY - 5.5} x2={tb.cx} y2={tb.y} />
          ))}
          {Object.values(layout.teamBoxes).map((tb, i) => (
            <line key={`spine-${i}`} x1={tb.spineX} y1={tb.y + tb.h} x2={tb.spineX} y2={tb.spineEndY} />
          ))}
          {workers.map(w => {
            const c = layout.cards[w.id];
            const tb = layout.teamBoxes[c.team];
            if (!c || !tb) return null;
            const innerX = c.col === 0 ? c.x + c.w : c.x;
            return <line key={`stub-${w.id}`} x1={tb.spineX} y1={c.cy} x2={innerX} y2={c.cy} />;
          })}
        </g>

        <rect x={layout.root.x} y={layout.root.y} width={layout.root.w} height={layout.root.h} rx="1" fill="#1c1917" stroke="#44403c" strokeWidth="0.5" />
        <text x={layout.root.cx} y={layout.root.y + 5} textAnchor="middle" fontSize="4" fill="#a8a29e" fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.3">THE STUDIO</text>
        <text x={layout.root.cx} y={layout.root.y + 9.5} textAnchor="middle" fontSize="2.9" fill="#57534e" fontFamily="'Courier New', monospace">{workers.length} WORKERS · PLAY-EYE RUNS THE FLOOR</text>

        {Object.entries(layout.teamBoxes).map(([team, tb]) => (
          <g key={team}>
            <rect x={tb.x} y={tb.y} width={tb.w} height={tb.h} rx="1" fill="#1c1917" stroke={TEAM_HEX[team]} strokeWidth="0.5" strokeOpacity="0.7" />
            <rect x={tb.x} y={tb.y} width={tb.w} height="1.4" fill={TEAM_HEX[team]} fillOpacity="0.8" />
            <text x={tb.cx} y={tb.y + 7.6} textAnchor="middle" fontSize="4.5" fill="#d6d3d1" fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.25">{TEAM_LABEL[team]}</text>
          </g>
        ))}

        {planArrows.map((e, i) => {
          const a = layout.cards[e.actorId];
          const b = layout.cards[e.targetId];
          if (!a || !b) return null;
          const dx = b.cx - a.cx, dy = b.cy - a.cy;
          const p1 = cardEdgePoint(a, dx, dy, 0.8);
          const p2 = cardEdgePoint(b, -dx, -dy, 2.2);
          return (
            <line
              key={`plan-${i}`}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1.6 1.2" strokeOpacity="0.95"
              markerEnd="url(#org-arrow-hot)"
            />
          );
        })}

        {edgePulses.map((ev, i) => {
          const a = layout.cards[ev.from];
          const b = layout.cards[ev.to];
          if (!a || !b) return null;
          const dx = b.cx - a.cx, dy = b.cy - a.cy;
          const p1 = cardEdgePoint(a, dx, dy, 0.4);
          const p2 = cardEdgePoint(b, -dx, -dy, 1.5);
          return (
            <line
              key={`pulse-${stepKey}-${i}`}
              className="edge-pulse"
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              pathLength="20"
              stroke={ev.tone === "down" ? "#f87171" : "#2dd4bf"}
              strokeWidth="0.9"
            />
          );
        })}

        {/* ---- people ---- */}
        {workers.map(w => {
          const c = layout.cards[w.id];
          if (!c) return null;
          const tier = supportTier(w.support);
          const hl = highlights ? highlights[w.id] : null;
          const planLabels = plannedByWorker[w.id];
          const dim = active != null && !connectedToActive(w.id);
          const border = w.burned ? "#44403c" : w.organizer ? "#f59e0b" : w.signed ? "#2dd4bf" : "#44403c";
          // Only while the player is still spending the week: during a resolution the
          // right-hand slot belongs to the support delta.
          const budget = hoursLeft && !w.burned && !hl && hoursLeft[w.id] != null ? hoursLeft[w.id] : null;
          return (
            <g
              key={w.id}
              opacity={w.burned ? 0.4 : dim ? 0.35 : 1}
              className={w.burned ? "" : "cursor-pointer"}
              onClick={() => {
                if (w.burned) return;
                if (onArm && w.organizer) onArm(w); else onSelect(w);
              }}
              onMouseEnter={() => setHoverId(w.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="1.2" fill="#1c1917" stroke={border} strokeWidth={w.organizer || w.signed ? 0.75 : 0.5} />
              <rect x={c.x} y={c.y} width="1.6" height={c.h} rx="0.4" fill={TEAM_HEX[w.team]} fillOpacity={w.burned ? 0.3 : 0.9} />
              {planLabels && !w.burned && (
                <rect x={c.x - 1.3} y={c.y - 1.3} width={c.w + 2.6} height={c.h + 2.6} rx="1.6" fill="none" stroke="#f59e0b" strokeWidth="0.45" strokeDasharray="1.6 1.2" />
              )}
              {focusId === w.id && !w.burned && (
                // The armed organizer, as a ring rather than a label.
                <rect x={c.x - 2.2} y={c.y - 2.2} width={c.w + 4.4} height={c.h + 4.4} rx="2.2" fill="none" stroke="#fcd34d" strokeWidth="0.7" />
              )}
              {hl && (hl.signed || hl.burned) && (
                <rect
                  key={`flash-${stepKey}-${w.id}`}
                  className="ring-flash"
                  x={c.x - 2} y={c.y - 2} width={c.w + 4} height={c.h + 4} rx="2"
                  fill="none"
                  stroke={hl.burned ? "#f87171" : "#2dd4bf"}
                />
              )}

              <text x={c.x + 3.6} y={c.y + 8.2} fontSize="4.3" fill={w.burned ? "#57534e" : "#e7e5e4"} fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.12">{w.name.toUpperCase()}</text>
              {/* A number here would be a lie on anybody you haven't sat down with, so
                  only a read narrow enough to be worth a number gets one. Everyone else
                  gets the band below and nothing else — not knowing is the information. */}
              {(() => {
                if (w.burned) return <text x={c.x + c.w - 2.6} y={c.y + 9.2} textAnchor="end" fontSize="6" fontWeight="bold" fill="#57534e" fontFamily="'Courier New', monospace">{"\u2014"}</text>;
                const r = readOf(w, weekNow);
                if (!r.exact) return null;
                return (
                  <text x={c.x + c.w - 2.6} y={c.y + 9.2} textAnchor="end" fontSize="6" fontWeight="bold"
                    fill={supportTier(r.mid).hex} fontFamily="'Courier New', monospace">{r.mid}</text>
                );
              })()}

              {/* Commitment ladder in the top-right corner, where the trait tick used to
                  sit. Small, because it is a state you glance at rather than read. */}
              {(() => {
                const rung = rungOf(w);
                return (
                  <g opacity={w.burned ? 0.3 : 1}>
                    {[0, 1, 2, 3].map(i => (
                      <circle
                        key={i}
                        cx={c.x + c.w - 11.1 + i * 2.9}
                        cy={c.y + 2.5}
                        r="1.05"
                        fill={i < rung.pips ? rung.hex : "none"}
                        stroke={i < rung.pips ? rung.hex : "#57534e"}
                        strokeWidth="0.3"
                      />
                    ))}
                  </g>
                );
              })()}

              {/* Common ground, with the whole of its own row now that the pips have moved
                  off it. One you have surfaced is drawn; one you haven't is an empty
                  ring, so the card shows how much of this person you still don't know. */}
              <g opacity={w.burned ? 0.3 : 1}>
                {affList(w).slice(0, 5).map((t, i) => {
                  const seen = knownAff(w).includes(t);
                  const bought = isPoisoned(w, t);
                  const withArmed = !!armed && armed.id !== w.id && seen && !bought
                    && affList(armed).includes(t) && knownAff(armed).includes(t);
                  const hex = withArmed ? EDGE_COMMON_GROUND
                    : seen ? (bought ? "#f87171" : "#a8a29e") : "#57534e";
                  const S = 5.2;                       // icon box, in board units
                  const x = c.x + 3.4 + i * 5.9;
                  const y = c.y + 10.6;
                  return (
                    <g
                      key={t}
                      onMouseEnter={() => setHoverAff({
                        leftPct: ((x + S / 2) / layout.width) * 100,
                        topPct: (y / layout.height) * 100,
                        // Anchor to whichever side keeps the box on the board.
                        align: ((x + S / 2) / layout.width) < 0.2 ? "left"
                          : ((x + S / 2) / layout.width) > 0.8 ? "right" : "center",
                        tone: withArmed ? "known" : seen ? (bought ? "bought" : "known") : "unknown",
                        label: seen ? (AFF_BY_ID[t]?.label ?? t) : AFF_UNKNOWN_LABEL,
                        sub: withArmed
                          ? `${armed.name} shares this \u2014 a sit-down with them has something to open on.`
                          : seen
                            ? (bought
                                ? "The company sponsors this now \u2014 it counts for nothing."
                                : "Shared common ground makes a conversation land harder.")
                            : AFF_UNKNOWN_SUB,
                      })}
                      onMouseLeave={() => setHoverAff(null)}
                    >
                      {/* A drawn icon is a few pixels of ink; the slot is the hover target. */}
                      <rect x={x - 0.4} y={y - 0.5} width={S + 0.8} height={S + 1} fill="transparent" />
                      {withArmed && (
                        <rect x={x - 0.5} y={y - 0.6} width={S + 1} height={S + 1.2} rx="0.6"
                          fill={EDGE_COMMON_GROUND} fillOpacity="0.16"
                          stroke={EDGE_COMMON_GROUND} strokeWidth="0.25" strokeOpacity="0.7" />
                      )}
                      {seen ? (
                        <g transform={`translate(${x} ${y}) scale(${S / 10})`} style={{ color: hex }} opacity={bought ? 0.85 : 1}>
                          {AFF_ICON[t]}
                        </g>
                      ) : (
                        // The same dashed slot the panel draws, in board units: an empty
                        // frame with nothing in it yet.
                        <g>
                          <rect x={x} y={y} width={S} height={S} fill="none"
                            stroke="#57534e" strokeWidth="0.35" strokeDasharray="1.1 0.9" />
                          <circle cx={x + S / 2} cy={y + S / 2} r={S * 0.135}
                            fill="none" stroke="#57534e" strokeWidth="0.3" />
                        </g>
                      )}
                    </g>
                  );
                })}
                {w.guarded > 0 && <text x={c.x + c.w - 3} y={c.y + 15.2} fontSize="3.2" fill="#f87171" textAnchor="end" fontFamily="'Courier New', monospace">!</text>}
                {staleWeek != null && cardStaleSoon(w, staleWeek) && (
                  <text x={c.x + c.w - (w.guarded > 0 ? 6.5 : 3)} y={c.y + 15.2} fontSize="3.6" fill="#fbbf24" textAnchor="end" fontFamily="'Courier New', monospace">
                    {"\u29D6"}
                  </text>
                )}
              </g>

              {/* ---- THE READ ---- One bar per person: how sure you are, drawn to scale.
                   A wide bar hanging off the right-hand end is somebody who has said warm
                   things to nobody in particular. A short bar with a tick is somebody a
                   member of your committee has actually sat down with. The board reads at
                   a glance as how much of this floor you can honestly see. */}
              {!w.burned && (() => {
                const r = readOf(w, weekNow);
                const X0 = c.x + 3.6, W = c.w - 7.2, Y = c.y + 18.9;
                const at = (v) => X0 + (W * clamp(v)) / 100;
                const hex = supportTier(r.mid).hex;
                const bandW = Math.max(0.8, at(r.hi) - at(r.lo));
                return (
                  <g opacity={w.signed ? 1 : 0.95}>
                    <rect x={X0} y={Y} width={W} height="1.5" rx="0.75" fill="#292524" />
                    <rect x={at(r.lo)} y={Y} width={bandW} height="1.5" rx="0.75"
                      fill={hex} fillOpacity={r.exact ? 0.95 : r.kind === "cold" ? 0.22 : 0.4} />
                    {/* The tick is the claim. Only a read worth trusting makes one. */}
                    {r.exact && <rect x={at(r.mid) - 0.3} y={Y - 0.7} width="0.6" height="2.9" fill={hex} />}
                    {/* Cold reads get a nick at the top of the band: that edge is their
                        words, and their words are the only thing you have. */}
                    {!r.exact && <rect x={at(r.hi) - 0.35} y={Y - 0.4} width="0.7" height="2.3" fill={hex} fillOpacity="0.75" />}
                  </g>
                );
              })()}

              {planLabels ? (
                <text x={c.x + 3.6} y={c.y + 17.5} fontSize="2.9" fill="#fbbf24" fontFamily="'Courier New', monospace">{truncateNote(planLabels.join(" + "), budget != null ? 13 : 17)}</text>
              ) : null}
              {w.burned && (
                <text x={c.x + c.w - 3.4} y={c.y + 18.6} textAnchor="end" fontSize="3.6" fill="#78716c" fontFamily="'Courier New', monospace">{"\u2715"}</text>
              )}
              {/* The hours budget lives on the card so the player can see it without
                  leaving the board. On someone the company is working on it goes red,
                  which is also the week their budget is cut — one token, both facts. */}
              {/* ---- ROW FOUR ---- Tier is the colour of the experience bar; trouble is
                   one mark. The hover line underneath says which, in words. */}
              {w.organizer && !w.burned && tierOf && (() => {
                const t = tierOf(w);
                const xp = Math.max(0, Math.min(100, w.experience || 0));
                const idle = w.weeksIdle || 0;
                const flag = w.shaken > 0 ? { mark: "\u25C9", hex: "#f87171" }
                  : idle >= IDLE_QUIT - 1 ? { mark: "\u25B2", hex: "#f87171" }
                  : idle > IDLE_GRACE ? { mark: "\u25B2", hex: "#fbbf24" }
                  : idle > 0 ? { mark: "\u25B3", hex: "#78716c" }
                  : null;
                return (
                  <g>
                    {flag && (
                      <text x={c.x + c.w - 3.4} y={c.y + 21.8} textAnchor="end" fontSize="3.4" fill={flag.hex} fontFamily="'Courier New', monospace">{flag.mark}</text>
                    )}
                    <rect x={c.x + 3.6} y={c.y + 21.2} width={c.w - 7.2} height="0.8" rx="0.4" fill="#292524" />
                    <rect x={c.x + 3.6} y={c.y + 21.2} width={(c.w - 7.2) * (xp / 100)} height="0.8" rx="0.4" fill={t.hex} fillOpacity="0.9" />
                  </g>
                );
              })()}


              {budget != null && (() => {
                const total = Math.max(budget, committeeHours(w));
                const hex = budget < 0 || w.underPressure > 0 ? "#f87171" : budget === 0 ? "#2dd4bf" : "#f59e0b";
                return (
                  <g>
                    <HourPieShapes
                      cx={c.x + c.w - 4.4} cy={c.y + 16.6} r="2.7"
                      left={budget} total={total} hex={hex} sw="0.3" bg="#1c1917"
                    />
                  </g>
                );
              })()}
              {budget == null && !w.burned && !hl && w.underPressure > 0 && (
                <text x={c.x + c.w - 3.4} y={c.y + 18.6} textAnchor="end" fontSize="3.4" fill="#f87171" fontFamily="'Courier New', monospace">{"\u25C9"}</text>
              )}

              {hl && hl.delta !== 0 && !w.burned && (
                // Inside the card, not floating above it: the note box for the same person
                // is drawn later in this group and would paint straight over a floating delta.
                <text
                  key={`delta-${stepKey}-${w.id}`}
                  className="delta-float"
                  x={c.x + c.w - 2.6}
                  y={c.y + 18}
                  textAnchor="end"
                  fontSize="3.7"
                  fontWeight="bold"
                  fill={hl.delta > 0 ? "#2dd4bf" : "#f87171"}
                  fontFamily="'Courier New', monospace"
                >{hl.delta > 0 ? "+" : ""}{hl.delta} support</text>
              )}
              {notes && notes[w.id] && (
                <g key={`note-${stepKey}-${w.id}`} className="note-float">
                  <rect x={c.cx - 20} y={c.y - 8.8} width={40} height={7} rx={1} fill="#0c0a09" stroke="#57534e" strokeWidth="0.3" />
                  <text x={c.cx} y={c.y - 4.2} textAnchor="middle" fontSize="2.8" fill="#e7e5e4" fontFamily="'Courier New', monospace">{truncateNote(notes[w.id], 22)}</text>
                </g>
              )}
            </g>
          );
        })}

        

      </svg>
      {hoverAff && (
        <div
          className={`absolute z-20 pointer-events-none -translate-y-full ${
            hoverAff.align === "left" ? "translate-x-0" : hoverAff.align === "right" ? "-translate-x-full" : "-translate-x-1/2"}`}
          style={{ left: `${hoverAff.leftPct}%`, top: `${hoverAff.topPct}%` }}
        >
          <div className="mb-1.5"><AffTip tone={hoverAff.tone} label={hoverAff.label} sub={hoverAff.sub} /></div>
        </div>
      )}
      </div>

      <div className="border-t border-stone-800 px-3 py-2 min-h-[3.6rem]">
        {hovered ? (
          <div className="text-xs text-stone-400 leading-snug">
            <span className={`font-bold ${supportTier(hovered.support).text}`}>{hovered.name}{hovered.burned ? " (OUT OF PLAY)" : ""}</span>
            <span className="text-stone-500"> ({TEAM_LABEL[hovered.team]}) — {(() => {
              const r = readOf(hovered, weekNow);
              return r.exact
                ? <>stands at <span className="text-stone-300 font-bold">{r.mid}</span></>
                : <>somewhere in <span className="text-stone-300 font-bold">{r.lo}{"\u2013"}{r.hi}</span>{r.kind === "cold" ? " — never spoken to" : r.kind === "fading" ? ` — last read ${r.age} weeks ago` : " — talked to, never sat down with"}</>;
            })()} · {fulfillmentLabel(hovered.fulfillment).toLowerCase()} ({hovered.fulfillment}){hovered.signed ? " · SIGNED" : ""}</span>
            <span style={{ color: infTrait(hovered).hex }} className="font-bold"> · {infTrait(hovered).label}</span>
            <span className="text-stone-500"> — {hovered.hook}</span>
            <div className="mt-0.5">
              <span className="text-stone-500">Common ground: </span>
              {knownAff(hovered).length ? (
                <span>
                  {knownAff(hovered).map((t, i) => (
                    <span key={t} className={isPoisoned(hovered, t) ? "text-red-400" : "text-stone-300"}>
                      {i > 0 ? "  ·  " : ""}<AffIcon id={t} size={12} /> {AFF_BY_ID[t]?.label ?? t}
                      {isPoisoned(hovered, t) ? " (bought)" : ""}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-stone-600 italic">nothing surfaced yet</span>
              )}
              {affList(hovered).length > knownAff(hovered).length && (
                <span className="text-stone-600 italic">
                  {knownAff(hovered).length ? " · " : " · "}{affList(hovered).length - knownAff(hovered).length} still unknown
                </span>
              )}
            </div>
            <div className="mt-0.5">
              {hoveredOut.length > 0 ? (
                <span className="text-stone-500">Moves: <span className="text-amber-400">{hoveredOut.map(t => `${nameOf(t.id)}${teamOf(t.id) !== hovered.team ? " ↗" : ""} (${t.weight})`).join(", ")}</span>. </span>
              ) : (
                <span className="text-stone-600 italic">No mapped influence on anyone yet. </span>
              )}
              {hovered.revealed ? (
                <span className="text-stone-500">Moved by: <span className="text-stone-300">{hoveredIn.length ? hoveredIn.map(t => `${nameOf(t.id)}${teamOf(t.id) !== hovered.team ? " ↗" : ""} (${t.weight})`).join(", ") : "nobody in particular"}</span>.</span>
              ) : (
                <span className="text-stone-600 italic">Who moves them: unmapped.</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-stone-500 leading-snug">
            <div>
              {anyRevealed
                ? "The boxes are the company's chart, and it is not the map you organize on. Pick one of your people: the marks they share light up across the floor, and hovering anyone says who moves them and how hard."
                : "The boxes are the company's chart, and it is not the map you organize on. Pick one of your people: the marks they share light up across the floor. Who moves whom you learn by sitting down with people."}
            </div>
            {mapped.total > 0 && (
              <div className="text-stone-500 not-italic mt-0.5">
                Of the {mapped.total} {mapped.total === 1 ? "relationship" : "relationships"} you've mapped, <span className="text-stone-200 font-bold">{mapped.cross}</span> cross team boundaries.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActOneGame({ onGraduate, onSkipToCompany }) {
  const [week, setWeek] = useState(1);
  const [phase, setPhase] = useState("intro"); // intro, plan, resolving, victory
  const [influence] = useState(() => generateInfluence(ACT1_WORKERS_SEED));
  const [workers, setWorkers] = useState(makeAct1Workers);
  const [planEntries, setPlanEntries] = useState([]); // {key, actorId, type, targetId?}
  const [heat, setHeat] = useState(0);
  const [consultant, setConsultant] = useState({ active: false, arrivedWeek: null, lastSetPiece: 0, raises: 0, threats: 0, perks: 0 });
  const [perks, setPerks] = useState([]); // { id, until } — company perks currently poisoning an affinity
  // Which rungs of the outsider ladder have already arrived. They never leave.
  const [outsiders, setOutsiders] = useState([]);
  const [resolutionSteps, setResolutionSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedWorker, setSelectedWorker] = useState(null);
  // Actor-first selection: pick who acts on the shelf, then pick who they go to.
  // Target-first still works — both entry points reach the same panel.
  const [focusActorId, setFocusActorId] = useState(null);
  // Escape clears the armed organizer, since clicking their card again is now a public
  // action rather than a way out of the selection.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setFocusActorId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [wonOnWeek, setWonOnWeek] = useState(null);
  // "drive" = collecting cards toward the 30% petition threshold. "campaign" = petition
  // filed, clock running to the ballot.
  const [stage, setStage] = useState("drive");
  const [filedWeek, setFiledWeek] = useState(null);
  const [electionWeek, setElectionWeek] = useState(null);
  const [voteResult, setVoteResult] = useState(null);
  const [showFilePrompt, setShowFilePrompt] = useState(false);
  const [sawFilePrompt, setSawFilePrompt] = useState(false);
  const pendingRef = useRef(null);
  const planKeyRef = useRef(0);


  const organizers = workers.filter(w => w.organizer && !w.burned);
  // Burned workers stay counted: they signed, and the petition doesn't un-sign them.
  // A burn already costs an organizer, their reach, and support across everyone they
  // carried — clawing the signature back on top of that made one bad roll unrecoverable.
  const signedCount = workers.filter(w => w.signed).length;
  const cardPct = Math.round((signedCount / ACT1_TOTAL_WORKERS) * 100);
  const hoursFor = (w) => committeeHours(w);
  const hoursUsedBy = (id) => planEntries.filter(e => e.actorId === id).reduce((s, e) => s + ACT1_ACTION[e.type].hours, 0);
  const hoursLeftFor = (w) => hoursFor(w) - hoursUsedBy(w.id);
  const totalHours = organizers.reduce((s, o) => s + hoursFor(o), 0);
  const totalUsed = planEntries.reduce((s, e) => s + ACT1_ACTION[e.type].hours, 0);

  // Progressive unlocks — a mechanic introduces itself the week it first matters.
  // Public actions stay locked for the first three weeks: the opening of a drive is
  // one-on-one work, and handing over the visible options early lets a player skip it.
  const unlockPublic = week >= ACT1_PUBLIC_UNLOCK_WEEK;
  const anyPublicDone = workers.some(w => w.history.some(h => h.includes("public")));
  const anyRecruitable = workers.some(w => w.signed && !w.organizer && !w.burned && w.trueKnown && (w.trueSupport ?? 0) >= ACT1_RECRUIT_REQ);

  const resStep = phase === "resolving" && resolutionSteps.length > 0 ? resolutionSteps[stepIndex] : null;
  const resHighlights = {};
  if (resStep) {
    const prevSnapshot = stepIndex > 0 ? resolutionSteps[stepIndex - 1].workers : workers;
    resStep.workers.forEach(cw => {
      const pw = prevSnapshot.find(x => x.id === cw.id);
      if (!pw) return;
      const delta = cw.support - pw.support;
      const signed = cw.signed && !pw.signed;
      const burned = cw.burned && !pw.burned;
      if (delta !== 0 || signed || burned) resHighlights[cw.id] = { delta, signed, burned };
    });
  }
  const resLogRef = useRef(null);
  useEffect(() => {
    if (resLogRef.current) resLogRef.current.scrollTop = resLogRef.current.scrollHeight;
  }, [stepIndex, phase]);

  useEffect(() => {
    if (phase !== "resolving" || resolutionSteps.length === 0) return;
    const step = resolutionSteps[stepIndex];
    const lineCount = step.lines?.length || 0;
    const duration = lineCount === 0 ? 200 : Math.min(2600, 900 + lineCount * 250);
    const t = setTimeout(() => {
      if (stepIndex < resolutionSteps.length - 1) setStepIndex(i => i + 1);
      else commitWeek();
    }, duration);
    return () => clearTimeout(t);
  }, [phase, stepIndex, resolutionSteps]);

  // Full sentences go in the log; the board gets a short tag per person so the floating
  // notes stay legible instead of overlapping into each other.
  const resNotes = resStep?.notes || {};
  const { banner: resBanner } = resStep
    ? splitLinesByEntity(resStep.lines, resStep.workers.map(w => ({ id: w.id, name: w.name })))
    : { banner: [] };

  function addPlan(actorId, type, targetId = null) {
    setFocusActorId(null);
    planKeyRef.current += 1;
    setPlanEntries(prev => [...prev, { key: planKeyRef.current, actorId, type, targetId }]);
  }
  function removePlan(key) {
    setPlanEntries(prev => prev.filter(e => e.key !== key));
  }

  // ---------- WEEK RESOLUTION ----------
  function resolveWeek() {
    const steps = [];
    let w = workers.map(x => ({ ...x }));
    const byId = (id) => w.find(x => x.id === id);
    let heatNext = heat;
    const touched = new Set();
    // What they say and what they'd do are separate numbers. Anything that doesn't ask
    // a person to DO something moves the first far more than the second — which is how
    // a campaign talks itself into believing it has the votes.
    // Every action an organizer runs makes them better at this. Successes count double.
    const gainXp = (actor, n) => { if (actor?.organizer) actor.experience = clamp((actor.experience || 0) + n, 0, 100); };
    const bump = (worker, amount, trueAmount = null) => {
      worker.support = clamp(worker.support + amount);
      const real = trueAmount === null ? Math.round(amount * 0.3) : trueAmount;
      worker.trueSupport = clamp((worker.trueSupport ?? worker.support) + real);
      touched.add(worker.id);
    };

    steps.push({ label: "WEEK START", sub: `${organizers.length} organizer${organizers.length === 1 ? "" : "s"} on the floor, ${totalUsed} of ${totalHours} hours committed.`, workers: w.map(x => ({ ...x })), lines: [] });

    // --- CONVERSATIONS ---
    const convoLines = [];
    const convoPulses = [];
    const convoNotes = {};
    planEntries.filter(e => e.type === "quick" || e.type === "deep").forEach(e => {
      const actor = byId(e.actorId);
      const target = byId(e.targetId);
      if (!actor || !target || actor.burned || target.burned) return;
      const tie = tieOn(influence, actor, target);
      const g = convoGain(actor, target, tie);
      const before = target.support;
      target.revealed = true; // you learn who they listen to by sitting down with them
      target.spokenTo = true; // and you learn something about where they actually are

      // Surface what they have in common. This is the payload of the quick chat.
      const found = revealAffinities(target, revealCount(e.type, actor, target));
      const foundNames = found.map(t => AFF_BY_ID[t].label.toLowerCase());

      if (e.type === "deep" && Math.random() < misfireChance(actor, target)) {
        // Cold deep talk. They hear a pitch, not a conversation.
        target.guarded = 3;
        gainXp(actor, 3); // you learn something even from a conversation that goes badly
        bump(target, -2, -4);
        convoPulses.push({ from: actor.id, to: target.id, tone: "down" });
        convoNotes[target.id] = `${actor.name} misreads them`;
        convoLines.push(`${target.name}: ${actor.name} sat down for the long version without knowing the first thing about them. It landed like a sales pitch — ${target.name} is guarded now, and will be for a while.${foundNames.length ? ` You did at least learn something: ${foundNames.join(", ")}.` : ""}`);
        target.history.push(`Week ${week}: a cold deep conversation with ${actor.name} backfired.`);
        return;
      }

      // The sit-down is also the only thing that tells you the truth about them.
      if (e.type === "deep") { target.trueKnown = true; target.trueKnownWeek = week; }
      gainXp(actor, e.type === "deep" ? XP_PER_ACTION : Math.round(XP_PER_ACTION * 0.6));
      const trueGain = e.type === "deep" ? g.deepTrue : g.quickTrue;
      bump(target, e.type === "deep" ? g.deep : g.quick, trueGain);
      if (target.guarded > 0 && e.type === "deep" && visibleShared(actor, target).length) target.guarded = 0;
      convoPulses.push({ from: actor.id, to: target.id, tone: "up" });
      // Only common ground you have SURFACED does any work, so only that is worth
      // narrating — otherwise the line would credit a connection the tie never got.
      const shared = tieBonus(actor, target);
      const flavor = shared >= 2
        ? `they find real common ground fast`
        : shared === 1
          ? `${actor.name} finds a way in`
          : tie >= 55
            ? `${actor.name} has standing, but nothing to build on`
            : `${actor.name} can't find a thread to pull`;
      convoNotes[target.id] = shared >= 2 ? `${actor.name} connects` : shared === 1 ? `${actor.name} gets heard` : `${actor.name} bounces off`;
      // A deep conversation's real payload is not the support it moves, it is that you
      // now know something. Lead with that, because that is what the player just bought.
      convoLines.push(
        e.type === "deep"
          ? `${target.name}: a long, honest conversation with ${actor.name} — ${flavor}. You now know where ${target.name} actually stands: ${target.trueSupport}, against the ${target.support} they talk like. That read is good for a few weeks before people move again.${foundNames.length ? ` You also learn: ${foundNames.join(", ")}.` : ""}`
          : `${target.name}: a quick word with ${actor.name} — ${flavor}. They talk warmer, ${before} → ${target.support}, which narrows what they could be without telling you where they are.${foundNames.length ? ` You learn: ${foundNames.join(", ")}.` : ""}`
      );
      target.history.push(`Week ${week}: ${ACT1_ACTION[e.type].label.toLowerCase()} with ${actor.name} (+${target.support - before} to what they'll say).`);
    });
    if (convoLines.length) steps.push({ label: "ONE-ON-ONES", sub: "Influence is relationship-specific — the same conversation lands differently depending on who has it.", workers: w.map(x => ({ ...x })), lines: convoLines, edgePulses: convoPulses, notes: convoNotes });

    // --- PUBLIC ACTIONS ---
    const publicLines = [];
    const publicPulses = [];
    const publicNotes = {};
    planEntries.filter(e => PUBLIC_TIERS[e.type]).forEach(e => {
      const actor = byId(e.actorId);
      if (!actor || actor.burned) return;
      const tier = PUBLIC_TIERS[e.type];
      const uses = actor.publicUses?.[e.type] || 0;
      actor.publicUses = { ...actor.publicUses, [e.type]: uses + 1 };
      actor.support = clamp(actor.support + tier.selfSupport);
      heatNext = clamp(heatNext + Math.round(tier.heat * (infTrait(actor).publicHeat || 1)));
      // Reach is measured on the tie, so common ground you have surfaced can pull a
      // relationship over the line and put somebody inside this person's reach who
      // wasn't there last week.
      const reached = outgoingTies(influence, actor.id).map(t => {
        const target = byId(t.id);
        return target && !target.burned ? { ...t, target, tie: tieFrom(t.weight, actor, target) } : null;
      }).filter(t => t && t.tie >= EDGE_MIN_DRAW);
      let moved = 0;
      reached.forEach(t => {
        const target = t.target;
        const gain = publicGain(actor, target, t.tie, e.type, uses);
        if (gain <= 0) return;
        // Visibility is not commitment. Watching a coworker go public makes people say
        // warmer things; it barely moves what they'd sign.
        bump(target, gain, Math.round(gain * 0.15));
        moved++;
        publicPulses.push({ from: actor.id, to: t.id, tone: "up" });
      });
      publicNotes[actor.id] = e.type === "large" ? "goes public, loudly" : e.type === "medium" ? "puts their name on it" : "wears the button";
      publicLines.push(`${actor.name} ${tier.blurb} ${moved > 0 ? `${moved} coworker${moved === 1 ? "" : "s"} who take cues from ${actor.name} move${uses > 0 ? " — though this isn't news anymore" : ""}.` : "Nobody who takes cues from them notices."}`);
      gainXp(actor, XP_PER_ACTION);
      actor.history.push(`Week ${week}: took a ${e.type} public action.`);

      if (tier.burn > 0) {
        const lastOne = w.filter(x => x.organizer && !x.burned).length <= 1;
        // HOTHEADs are the ones who get walked out. The CAUTIOUS almost never are.
        const risk = tier.burn * (0.6 + heatNext / 100) * (infTrait(actor).burnMult ?? 1);
        if (Math.random() < risk) {
          if (lastOne) {
            heatNext = clamp(heatNext + 8);
            publicLines.push(`${actor.name} gets pulled aside about "tone" the next morning. It's a warning shot — and they're the only organizer left, so they take it and keep going.`);
            actor.shaken = 1;
          } else {
            actor.burned = true;
            actor.organizer = false;
            const narrative = BURN_NARRATIVES[rand(BURN_NARRATIVES.length)](actor.name);
            publicNotes[actor.id] = "pulled out of play";
            publicLines.push(`${narrative} ${actor.name} is out of the campaign — the card they signed still counts, but their hours and their reach don't.`);
            actor.history.push(`Week ${week}: exposed after a big public action — out of play.`);
            outgoingTies(influence, actor.id).forEach(t => {
              const target = byId(t.id);
              if (!target || target.burned) return;
              const hit = Math.round((t.weight / 100) * 9);
              if (hit <= 0) return;
              bump(target, -hit);
              publicPulses.push({ from: actor.id, to: t.id, tone: "down" });
            });
            heatNext = clamp(heatNext + 6);
          }
        }
      }
    });
    if (publicLines.length) steps.push({ label: "PUBLIC ACTIONS", sub: "What your people are seen doing travels down every line they carry.", workers: w.map(x => ({ ...x })), lines: publicLines, edgePulses: publicPulses, notes: publicNotes });

    // --- CARD ASKS ---
    const askLines = [];
    const askPulses = [];
    const askNotes = {};
    planEntries.filter(e => e.type === "ask").forEach(e => {
      const actor = byId(e.actorId);
      const target = byId(e.targetId);
      if (!actor || !target || actor.burned || target.burned || target.signed) return;
      const tie = tieOn(influence, actor, target);
      const chance = signChance(actor, target, tie);
      target.revealed = true;
      touched.add(target.id);
      if (Math.random() < chance) {
        target.signed = true;
        target.signedWeek = week;
        target.support = Math.max(target.support, 78);
        target.trueSupport = clamp(Math.max(target.trueSupport ?? 0, 72));
        gainXp(actor, XP_PER_CARD);
        heatNext = clamp(heatNext + 4);
        askNotes[target.id] = "SIGNS THE CARD";
        askLines.push(`${target.name} signs. ${actor.name} asked, and the answer was yes.`);
        target.history.push(`Week ${week}: signed a union card after ${actor.name} asked.`);
        outgoingTies(influence, target.id).forEach(t => {
          const other = byId(t.id);
          if (!other || other.burned || other.signed) return;
          bump(other, Math.round((t.weight / 100) * 4));
          askPulses.push({ from: target.id, to: t.id, tone: "up" });
        });
      } else {
        gainXp(actor, 4); // a no still teaches you something about the room
        const before = target.support;
        target.support = clamp(target.support - 5);
        target.askedRecently = 2;
        askNotes[target.id] = target.support < 45 ? "not even close" : "not yet";
        askLines.push(
          target.support < 45
            ? `${target.name} isn't there. Being asked before they were ready made it worse (${before} → ${target.support}).`
            : `${target.name} says they're with you — just not ready to put their name on paper yet (${before} → ${target.support}).`
        );
        target.history.push(`Week ${week}: ${actor.name} asked for a card. Not yet.`);
      }
    });
    if (askLines.length) steps.push({ label: "THE ASK", sub: "Support isn't a signature. This is where you find out the difference.", workers: w.map(x => ({ ...x })), lines: askLines, edgePulses: askPulses, notes: askNotes });

    // --- COMMITTEE GROWTH ---
    const recruitLines = [];
    const recruitNotes = {};
    const recruitReveal = (newMember) => {
      // A committee member reports honestly on the people they actually know. This is
      // the Act One version of the shop committee's true-support read in Act Two.
      newMember.trueKnown = true;
      newMember.trueKnownWeek = week;
      outgoingTies(influence, newMember.id).filter(t => t.weight >= 40).forEach(t => {
        const target = byId(t.id);
        if (target) { target.trueKnown = true; target.trueKnownWeek = week; }
      });
    };
    planEntries.filter(e => e.type === "recruit").forEach(e => {
      const actor = byId(e.actorId);
      const target = byId(e.targetId);
      if (!actor || !target || target.burned || target.organizer || !target.signed) return;
      // Gates on what they would actually do, not what they say. You cannot put someone
      // on the committee off the back of a number that button-wearing inflated.
      if (!target.trueKnown || (target.trueSupport ?? 0) < ACT1_RECRUIT_REQ) return;
      target.organizer = true;
      target.revealed = true;
      target.weeksIdle = 0;
      target.signedWeek = week; // joining the committee is itself a fresh commitment
      gainXp(actor, XP_PER_ACTION);
      target.knownAffinities = [...affList(target)]; // your own people hold nothing back
      recruitReveal(target);
      recruitNotes[target.id] = "joins the committee";
      recruitLines.push(`${target.name} joins the organizing committee. That's ${ACT1_HOURS_PER_ORGANIZER} more hours on the floor every week, a whole set of relationships you couldn't reach before — and an honest read on where the people they know actually stand.`);
      target.history.push(`Week ${week}: joined the organizing committee.`);
    });
    if (recruitLines.length) steps.push({ label: "THE COMMITTEE GROWS", sub: "Every person you bring on is more time and more reach.", workers: w.map(x => ({ ...x })), lines: recruitLines, notes: recruitNotes });

    // --- CHECK-INS: organizers looking after each other ---
    // The answer to forgetting the people who already signed. One hour of somebody's
    // week spent on a teammate instead of a target: resets their clock, builds them up,
    // and pulls them out from under a manager's eye.
    const checkinLines = [];
    const checkinNotes = {};
    const checkinPulses = [];
    planEntries.filter(e => e.type === "checkin").forEach(e => {
      const actor = byId(e.actorId);
      const target = byId(e.targetId);
      if (!actor || !target || actor.burned || target.burned || !target.organizer) return;
      const wasIdle = target.weeksIdle || 0;
      const wasShaken = target.shaken > 0;
      target.weeksIdle = 0;
      target.shaken = 0;
      gainXp(target, 10);
      gainXp(actor, 4);
      target.trueSupport = clamp((target.trueSupport ?? target.support) + 3);
      touched.add(target.id);
      checkinPulses.push({ from: actor.id, to: target.id, tone: "up" });
      checkinNotes[target.id] = `${actor.name} checks in`;
      checkinLines.push(
        `${actor.name} spends an hour on ${target.name} instead of a target — coffee, no agenda. ` +
        (wasShaken ? `It gets ${target.name} out from under the manager's eye. ` : "") +
        (wasIdle >= IDLE_GRACE ? `${target.name} had been drifting for ${wasIdle} weeks; they're back in it. ` : "") +
        `+10 experience.`
      );
    });
    if (checkinLines.length) steps.push({ label: "LOOKING AFTER EACH OTHER", sub: "An hour spent on your own people is not an hour wasted.", workers: w.map(x => ({ ...x })), lines: checkinLines, notes: checkinNotes, edgePulses: checkinPulses });

    // --- THE FLOOR TALKS: signed workers keep working on the people they move, for free ---
    const passiveLines = [];
    const passivePulses = [];
    w.filter(x => x.signed && !x.burned).forEach(signer => {
      outgoingTies(influence, signer.id).forEach(t => {
        if (t.weight < 50) return;
        const target = byId(t.id);
        if (!target || target.burned || target.signed) return;
        const gain = Math.max(1, Math.round((tieFrom(t.weight, signer, target) / 100) * 2 * (infTrait(signer).passive || 1) * recvMult(target)));
        bump(target, gain);
        passivePulses.push({ from: signer.id, to: t.id, tone: "up" });
      });
    });
    // Committee neglect. Two weeks of grace, then their hours start shrinking, then
    // they step back off entirely. Nothing here resets — re-recruiting costs the full
    // three hours again, against a person whose commitment has already slipped.
    const quitLines = [];
    const quitNotes = {};
    w.forEach(x => {
      if (!x.organizer || x.burned) return;
      const usedThisWeek = planEntries.some(e => e.actorId === x.id) || planEntries.some(e => e.type === "checkin" && e.targetId === x.id);
      x.weeksIdle = usedThisWeek ? 0 : (x.weeksIdle || 0) + 1;
      if (x.weeksIdle >= IDLE_QUIT) {
        x.organizer = false;
        x.weeksIdle = 0;
        x.experience = Math.round((x.experience || 0) * 0.6);
        x.trueSupport = clamp((x.trueSupport ?? x.support) - 12);
        quitNotes[x.id] = "steps off the committee";
        quitLines.push(`${x.name} stops showing up. Nobody has asked them to do anything in ${IDLE_QUIT} weeks, and they got the message that they weren't needed. Their hours are gone, and getting them back means starting the ask over.`);
      } else if (x.weeksIdle === IDLE_GRACE + 1) {
        quitLines.push(`${x.name} has been sitting idle. They're down to ${committeeHours(x)} hour${committeeHours(x) === 1 ? "" : "s"} a week \u2014 people disengage when the campaign stops needing them.`);
      }
    });
    if (quitLines.length) steps.push({ label: "THE COMMITTEE", sub: "A committee is a set of relationships, not a list of names.", workers: w.map(x => ({ ...x })), lines: quitLines, notes: quitNotes });

    w.forEach(x => {
      if (x.askedRecently > 0) x.askedRecently -= 1;
      if (x.guarded > 0) x.guarded -= 1;
      if (x.shaken > 0) x.shaken -= 1;
      if (x.underPressure > 0) x.underPressure -= 1;
      if (x.signed || x.burned) { x.quietWeeks = 0; return; }
      x.quietWeeks = touched.has(x.id) ? 0 : x.quietWeeks + 1;
      if (x.quietWeeks >= 3 && x.support > 25) {
        x.support = clamp(x.support - 2);
        x.trueSupport = clamp((x.trueSupport ?? x.support) - 3);
        x.quietWeeks = 0;
        passiveLines.push(`${x.name} hasn't heard from anybody in weeks. Whatever was building quietly drains back out.`);
      }
    });
    if (passivePulses.length) {
      passiveLines.unshift("Everyone who's signed keeps working on the people they carry weight with — no hours spent.");
    }
    if (passiveLines.length) steps.push({ label: "THE FLOOR TALKS", sub: "The campaign runs on its own between your hours — in both directions.", workers: w.map(x => ({ ...x })), lines: passiveLines, edgePulses: passivePulses });



    // --- CARDS GO STALE ---
    // Nothing resets. A signature that rots costs you the card, the true support behind
    // it, and makes the re-ask harder than the first ask was.
    const staleLines = [];
    const staleNotes = {};
    w.forEach(x => {
      if (!x.signed || x.burned || x.signedWeek == null) return;
      if (week - x.signedWeek < CARD_LIFESPAN) return;
      x.signed = false;
      x.signedWeek = null;
      x.staleCount = (x.staleCount || 0) + 1;
      x.askedRecently = 2;
      x.support = clamp(x.support - 6);
      x.trueSupport = clamp((x.trueSupport ?? x.support) - 10);
      staleNotes[x.id] = "CARD GOES STALE";
      if (x.organizer) {
        // A committee member's card lapsing is worse: they've been carrying this for
        // over three months with nothing to show anyone.
        x.experience = Math.round((x.experience || 0) * 0.85);
        staleLines.push(`${x.name} signed ${CARD_LIFESPAN} weeks ago and has been organizing on that card ever since. It's too old to count now. They re-sign without being asked \u2014 but something goes out of them, and it comes off where it counts, not off what they say.`);
        x.signed = true;
        x.signedWeek = week;
      } else {
        staleLines.push(`${x.name}'s card is ${CARD_LIFESPAN} weeks old. The board won't accept it as evidence of what they think today, and honestly, neither should you. \u22126 off what they'll say and \u221210 off where they actually are, and the second ask is harder than the first was.`);
      }
      x.history.push(`Week ${week}: card went stale after ${CARD_LIFESPAN} weeks.`);
    });
    if (staleLines.length) steps.push({ label: "CARDS GO STALE", sub: "A signature is evidence of what somebody thought on the day they signed it.", workers: w.map(x => ({ ...x })), lines: staleLines, notes: staleNotes });

    // --- THE OUTSIDER LADDER ---
    // Every rung is a response to the campaign working. None of them un-arrive.
    let outsidersNext = [...outsiders];
    const ladderLines = [];
    const ladderNotes = {};
    {
      const ctx = {
        committee: w.filter(x => x.organizer && !x.burned).length,
        signed: w.filter(x => x.signed).length,
        heat: heatNext,
        stage,
      };
      OUTSIDERS.forEach(o => {
        if (outsidersNext.includes(o.id)) return;
        if (o.id === "consultant") return; // handled by the consultant block itself
        if (!o.arrival(ctx)) return;
        outsidersNext.push(o.id);
        ladderLines.push(`${o.name} ARRIVES \u2014 ${o.role}. ${o.intro(o.name)}`);
      });

      // DANIELS, the studio head. He is genuinely liked, and that is the weapon: he
      // moves what people SAY by a lot and what they'd DO by almost nothing. Playing
      // him well means the morale number lies to you worse than it already did.
      if (outsidersNext.includes("boss") && Math.random() < 0.5) {
        let moved = 0, stated = 0;
        w.forEach(x => {
          if (x.burned || x.organizer) return;
          const up = 4 + rand(4);
          x.support = clamp(x.support + up);
          x.trueSupport = clamp((x.trueSupport ?? x.support) - 2);
          stated += up; moved += 1;
        });
        ladderLines.push(
          `DANIELS WORKS THE FLOOR \u2014 ${moved} people: +${moved ? Math.round(stated / moved) : 0} each to what they'll tell you, \u22122 to where they stand. ` +
          `He is warm, he is specific, and he means it. Nobody changes their mind about the union. Everybody sounds friendlier about the company, which is worse: the morale number is now further from the vote than it has ever been.`
        );
      }

      // VANTAGE PARTNERS. Ownership does not persuade. It threatens the whole studio,
      // which raises fulfillment-as-risk across the board — everyone has more to lose.
      if (outsidersNext.includes("corporate") && Math.random() < 0.45) {
        const teams = ["engineering", "qa", "production"];
        const t = teams[rand(teams.length)];
        let n = 0;
        w.forEach(x => {
          if (x.burned || x.team !== t) return;
          x.fulfillment = clamp(x.fulfillment + 6);
          x.trueSupport = clamp((x.trueSupport ?? x.support) - 4);
          n += 1;
        });
        heatNext = clamp(heatNext + 5);
        ladderLines.push(
          `VANTAGE PARTNERS REVIEWS ${TEAM_LABEL[t]} \u2014 ${n} people: +6 what-they'd-be-risking, \u22124 where they stand. ` +
          `A slide deck nobody was supposed to see puts a question mark next to the department. No threat is made. None needs to be.`
        );
      }

      // THE PODCAST. Fires at everyone, ignores the social map entirely, and lands
      // backwards on the people who resent being told what to think.
      if (outsidersNext.includes("celebrity") && Math.random() < 0.4) {
        let hit = 0, backfired = 0;
        w.forEach(x => {
          if (x.burned) return;
          const t = infTrait(x);
          if (t.holdsFast || t.id === "hothead") {
            x.support = clamp(x.support + 6);
            x.trueSupport = clamp((x.trueSupport ?? x.support) + 5);
            backfired += 1;
          } else {
            x.support = clamp(x.support - 3);
            x.trueSupport = clamp((x.trueSupport ?? x.support) - 2);
            hit += 1;
          }
        });
        heatNext = clamp(heatNext + 9);
        ladderLines.push(
          `THE PODCAST WEIGHS IN \u2014 ${hit} people: \u22123 to what they'll say. ${backfired} people: +6 to that and +5 to where they actually stand. +9 heat. ` +
          `Eleven minutes on your campaign from four million subscribers and a man who has never been in the building. ` +
          `The stubborn and the hotheaded hear an outsider telling them what to think about their own workplace, and sign up harder.`
        );
      }
    }
    if (ladderLines.length) steps.push({ label: "FROM OUTSIDE THE BUILDING", sub: "The better this goes, the further up the company it gets escalated.", workers: w.map(x => ({ ...x })), lines: ladderLines, notes: ladderNotes });

    // --- MANAGEMENT ---
    // The hotter it has been, the more of it cools off over a quiet week — otherwise one
    // aggressive stretch pins heat at 100 and the shop never gets back off the radar.
    heatNext = clamp(heatNext - (5 + Math.floor(heatNext / 12)), 0, 100);
    const mgmtLines = [];
    if (heatNext >= 45 && Math.random() < 0.55) {
      const roll = rand(100);
      if (roll < 45) {
        // ORG-CHART MOVE. He books a department, not a set of relationships, so the
        // blow is absorbed in proportion to how many trusted signed coworkers each
        // person already has around them.
        const teams = ["engineering", "qa", "production"];
        const meetTeam = teams[rand(teams.length)];
        let held = 0, hitTotal = 0, hitCount = 0, shrugged = 0;
        w.forEach(x => {
          if (x.burned || x.signed || x.team !== meetTeam) return;
          if (holdsFast(x)) { held += 1; return; }
          const raw = Math.max(2, Math.round(7 - x.support / 20));
          const resist = orgChartResistance(signedBacking(influence, w, x.id));
          const hit = Math.max(1, Math.round(raw * resist));
          if (resist <= 0.45) shrugged += 1;
          x.support = clamp(x.support - hit);
          x.trueSupport = clamp((x.trueSupport ?? x.support) - Math.round(hit * 0.4));
          hitTotal += hit; hitCount += 1;
        });
        mgmtLines.push(
          `CAPTIVE-AUDIENCE MEETING \u2014 ${TEAM_LABEL[meetTeam]} \u2014 ${hitCount} hit, average \u2212${hitCount ? Math.round(hitTotal / hitCount) : 0} to what they'll say, and about half that off where they stand.` +
          (shrugged ? ` ${shrugged} of them barely moved: they already have people they trust more who've signed.` : "") +
          (held ? ` ${held} stubborn holdout${held === 1 ? "" : "s"} sat through it unmoved.` : "") +
          ` Attendance was mandatory for the department. It is not a mandatory meeting for a friendship.`
        );
        heatNext = clamp(heatNext - 8);
      } else if (roll < 78) {
        // The one org-chart move that DOES work, because it operates on material
        // interest rather than persuasion. A department really can be bought.
        const buyTeams = ["engineering", "qa", "production"];
        const pickTeam = buyTeams[rand(buyTeams.length)];
        const lucky = w.filter(x => !x.burned && x.team === pickTeam);
        lucky.forEach(x => { x.fulfillment = clamp(x.fulfillment + 12); });
        mgmtLines.push(`${CONSULTANT_NAME_UC} BUYS A DEPARTMENT \u2014 ${TEAM_LABEL[pickTeam]}: fulfillment +12 (${lucky.length} people). Higher fulfillment means more to lose: every card ask in ${TEAM_LABEL[pickTeam]} is now harder. New hardware, a hiring-freeze lift, and an offsite, announced to one team and no one else.`);
        heatNext = clamp(heatNext - 6);
      } else {
        const candidates = w.filter(x => x.organizer && !x.burned);
        if (candidates.length > 1) {
          const mark = candidates[rand(candidates.length)];
          mark.shaken = 1;
          mgmtLines.push(`${mark.name} gets a new weekly one-on-one with a skip-level manager. Nothing is said outright. They'll have less room to move next week.`);
        } else if (candidates.length === 1) {
          mgmtLines.push(`Management starts asking around about who's behind this. Nobody gives ${candidates[0].name} up — this time.`);
        }
        heatNext = clamp(heatNext - 4);
      }
    }
    if (mgmtLines.length) steps.push({ label: "MANAGEMENT RESPONDS", sub: "Somebody upstairs is paying attention now.", workers: w.map(x => ({ ...x })), lines: mgmtLines });

    // --- THE CONSULTANT ---
    // Once the committee is clearly working, management stops improvising and hires
    // someone. From then on there is a second organizer on the floor, working the same
    // relationships in the opposite direction.
    let consultantNext = { ...consultant };
    const consultantLines = [];
    const consultantNotes = {};
    const consultantPulses = [];
    const consultantPerks = [];

    // A perk wears off. People work out that the dog day was a one-off, and the thing
    // they have in common goes back to being theirs.
    let perksNext = perks.filter(pk => pk.until > week);
    perks.filter(pk => pk.until <= week).forEach(pk => {
      const aff = AFF_BY_ID[pk.id];
      w.forEach(x => { x.poisoned = poisonedAff(x).filter(t => t !== pk.id); });
      consultantLines.push(
        `PERK WEARS OFF \u2014 ${aff?.perk ?? pk.id}. \u201C${aff?.label ?? pk.id}\u201D counts as common ground again. ` +
        `The budget line was quietly not renewed. Nobody announces that part.`
      );
    });
    const committeeNow = w.filter(x => x.organizer && !x.burned).length;
    const signedForTrigger = w.filter(x => x.signed).length;

    if (!consultantNext.active && (committeeNow >= CONSULTANT_TRIGGER_COMMITTEE || signedForTrigger >= ACT1_CARDS_NEEDED - 2)) {
      consultantNext = { ...consultantNext, active: true, arrivedWeek: week };
      consultantLines.push(`A consultant from ${CONSULTANT_FIRM} is on site by Wednesday. ${CONSULTANT_NAME} has a badge, a corner office nobody was using, and a list of names.`);
      consultantLines.push(`WHAT HE DOES: two one-on-ones a week, aimed at the highest-support person who isn't already surrounded by signed coworkers. Each costs that person up to \u22128 off what they'll say and 60% of that off where they actually stand. Every ${CONSULTANT_SETPIECE_GAP} weeks he runs one set piece \u2014 a raise offered to a waverer, or a job threat aimed at your most isolated committee member \u2014 ${CONSULTANT_MAX_EACH} of each, all campaign.`);
      consultantLines.push(`WHAT BLUNTS HIM: signed coworkers who carry weight with the target. Every 30 points of that backing takes 1 off the blow, to a floor of 1. Below ${KIRKMAN_SIGHT} heat he can't see your map and picks names off the org chart instead, which lands at 55% strength. Your own visibility is what teaches him where to aim.`);
    } else if (consultantNext.active) {
      // One-on-ones: he works the people closest to signing, minus whoever is already
      // surrounded by organizers. Density is the defence.
      // Once a petition is filed he stops being a side project and works the floor full
      // time — this is the stretch where campaigns are actually lost.
      const inCampaign = stage === "campaign";
      // Below the sight threshold he is picking names off an org chart: whoever looks
      // wobbly on paper, by department. Above it, the campaign has been loud enough
      // that he can see who is actually isolated — and that is when he gets dangerous.
      const seesNetwork = heat >= KIRKMAN_SIGHT || inCampaign;
      const marks = w
        .filter(x => !x.burned && x.support >= 30 && (inCampaign || !x.signed))
        .map(x => {
          const backing = seesNetwork ? signedBacking(influence, w, x.id) : 0;
          return { t: x, backing, score: x.support - backing * 0.35 - (x.signed ? 25 : 0) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, inCampaign ? 4 : 2);

      marks.forEach(({ t, backing }) => {
        if (holdsFast(t)) {
          t.pressuredCount = (t.pressuredCount || 0) + 1;
          consultantNotes[t.id] = `${CONSULTANT_NAME_UC} gets nowhere`;
          consultantLines.push(`NO MOVEMENT \u2014 ${t.name}: nothing moves, either way. STUBBORN ignores everything ${CONSULTANT_NAME} does, permanently. It cuts both ways \u2014 they were hard to bring over, and now they're impossible to take back.`);
          return;
        }
        const realBacking = signedBacking(influence, w, t.id);
        const resist = Math.min(5, Math.round(realBacking / 30));
        const blind = seesNetwork ? 1 : 0.55; // guessing from the reporting line costs him
        const hit = Math.max(1, Math.round((8 - resist) * blind));
        const before = t.support;
        t.support = clamp(t.support - hit);
        t.trueSupport = clamp((t.trueSupport ?? t.support) - Math.round(hit * 0.6));
        t.underPressure = 2;
        t.pressuredCount = (t.pressuredCount || 0) + 1;
        consultantNotes[t.id] = `${CONSULTANT_NAME_UC} works on them`;
        consultantLines.push(
          `${seesNetwork ? "TARGETED 1:1" : "ORG-CHART 1:1"} \u2014 ${t.name}: \u2212${before - t.support} to what they'll say, \u2212${Math.round((before - t.support) * 0.6)} to where they stand. ` +
          `Base 8` +
          (resist > 0 ? `, \u2212${resist} from ${Math.round(realBacking)} signed backing` : "") +
          (!seesNetwork ? `, \u00d70.55 because he's guessing off the reporting line` : "") +
          `. ` +
          `${CONSULTANT_ONE_ON_ONES[rand(CONSULTANT_ONE_ON_ONES.length)](t.name)}` +
          (resist >= 3 ? ` It lands soft: ${t.name} has heard all of it already, from people they trust more.` : "") +
          (realBacking < 20 ? ` Nobody who has signed carries any weight with them, so there was nothing in the way.` : "")
        );
        t.history.push(`Week ${week}: ${CONSULTANT_NAME} worked on them (-${before - t.support} support).`);
      });

      if (inCampaign) {
        // The biggest single effect in the whole counter-campaign, and the easiest to
        // miss because it touches everybody at once. So it reports its own total.
        let meetingTotal = 0, meetingCount = 0, meetingWorst = 0;
        w.forEach(x => {
          if (x.burned) return;
          const backing = signedBacking(influence, w, x.id);
          const hit = Math.max(1, Math.round(4 - backing / 70 - (x.signed ? 1 : 0)));
          x.support = clamp(x.support - hit);
          meetingTotal += hit; meetingCount += 1; meetingWorst = Math.max(meetingWorst, hit);
        });
        consultantLines.push(
          `CAPTIVE-AUDIENCE MEETING \u2014 all ${meetingCount} workers. Not one vote moves. ` +
          `A mandatory meeting changes what people are willing to say out loud, not what they'd do behind a curtain, ` +
          `so every number this costs you is a number you were reading, not a number you had. ` +
          `Up to \u2212${meetingWorst} each off what they'll admit to \u2014 least from the ones who have signed, ` +
          `and least of all from the ones with signed coworkers they trust standing behind them.`
        );
        consultantLines.push(
          `WHICH IS THE POINT. He is not trying to change minds in that room; he is trying to make the room unreadable, ` +
          `so that you spend your last weeks reassuring people who were never going to leave and miss the ones who were. ` +
          `The only cure is a conversation: anyone you have actually sat down with still reads true. ` +
          `Paid time, catered, and nobody from the union side allowed to answer back. It runs again every week until the ballot.`
        );
      }

      // Set pieces, spaced out: the raise and the threat.
      const sinceLast = week - (consultantNext.lastSetPiece || 0);
      if (sinceLast >= CONSULTANT_SETPIECE_GAP) {
        const canRaise = consultantNext.raises < CONSULTANT_MAX_EACH;
        const canThreat = consultantNext.threats < CONSULTANT_MAX_EACH;
        const threatPool = w.filter(x => x.organizer && !x.burned);
        const raisePool = w.filter(x => !x.burned && !x.organizer && (x.signed || x.support >= 55));

        // The third set piece: buy a thing people have in common. Not aimed at a person
        // at all — aimed at the common ground the campaign was travelling along.
        const alreadyPoisoned = new Set(w.flatMap(x => poisonedAff(x)));
        const perkCandidates = AFFINITY_POOL.filter(a => !alreadyPoisoned.has(a.id))
          .map(a => {
            const holders = w.filter(x => !x.burned && affList(x).includes(a.id));
            // Blind, he reads a headcount off an HR field: whatever the most people have.
            // Sighted, he can see which shared thing your committee is actually
            // travelling along, and buys that one instead.
            const reach = seesNetwork
              ? w.filter(x => x.organizer && !x.burned).reduce((n, org) => n + (affList(org).includes(a.id)
                  ? w.filter(x => !x.burned && !x.signed && x.id !== org.id && affList(x).includes(a.id)).length
                  : 0), 0)
              : holders.filter(x => !x.signed).length;
            return { a, holders, reach };
          })
          .filter(c => c.holders.length >= 2 && c.reach > 0)
          .sort((x, y) => y.reach - x.reach);
        const canPerk = consultantNext.perks < CONSULTANT_MAX_EACH && perkCandidates.length > 0;

        const options = [];
        if (canThreat && threatPool.length > 1) options.push("threat");
        if (canRaise && raisePool.length) options.push("raise");
        if (canPerk) options.push("perk");
        const chosen = options.length ? options[rand(options.length)] : null;
        const doThreat = chosen === "threat";

        if (chosen === "perk") {
          const { a: aff, holders } = perkCandidates[0];
          consultantNext = { ...consultantNext, perks: (consultantNext.perks || 0) + 1, lastSetPiece: week };
          let trueTotal = 0, fullTotal = 0, held = 0;
          holders.forEach(x => {
            // Poison the tie for everyone who holds it, including people you haven't
            // surfaced yet — you find out it's gone when the conversation lands flat.
            x.poisoned = [...poisonedAff(x), aff.id];
            if (holdsFast(x)) { held += 1; return; }
            const backing = signedBacking(influence, w, x.id);
            const shield = Math.min(6, Math.round(backing / 25));
            const trueHit = Math.max(1, 9 - shield);
            const fullGain = Math.max(2, 12 - shield);
            const beforeTrue = x.trueSupport ?? x.support;
            x.trueSupport = clamp(beforeTrue - trueHit);
            x.support = clamp(x.support - Math.max(1, Math.round(trueHit * 0.4)));
            x.fulfillment = clamp(x.fulfillment + fullGain);
            trueTotal += trueHit; fullTotal += fullGain;
            consultantNotes[x.id] = "BOUGHT";
            x.history.push(`Week ${week}: the company bought ${aff.label.toLowerCase()} (\u2212${trueHit} where they stand).`);
          });
          heatNext = clamp(heatNext - 4);
          consultantPerks.push({ id: aff.id, until: week + PERK_WEEKS });
          consultantLines.push(
            `PERK LANDS \u2014 ${aff.perk.toUpperCase()}. Everyone on the floor who shares \u201C${aff.label}\u201D ` +
            `(${holders.length} ${holders.length === 1 ? "worker" : "workers"}, whether or not you had found them): ` +
            `\u2212${trueTotal} between them off where they actually stand, +${fullTotal} fulfilment, \u22124 heat. ` +
            `${aff.barb}`
          );
          consultantLines.push(
            `AND \u201C${aff.label}\u201D STOPS BEING YOURS for ${PERK_WEEKS} weeks. It no longer counts as common ground in any ` +
            `conversation between two people who share it \u2014 raising it now raises the company. ` +
            `${seesNetwork
              ? `He picked it because it was the thing your committee was actually travelling along.`
              : `He picked it off a headcount in an HR field, not off your map \u2014 he doesn't know yet what it was doing for you.`}` +
            `${held ? ` ${held} STUBBORN ${held === 1 ? "worker takes" : "workers take"} nothing from it, but the tie is poisoned for them too.` : ""}`
          );
        } else if (doThreat) {
          // He goes after the most isolated committee member, not the least convinced —
          // conviction is high on the committee by definition. What decides whether
          // somebody folds under a job threat is whether they're standing alone.
          const markBacking = (x) => signedBacking(influence, w, x.id);
          const mark = [...threatPool].sort((a, b) => markBacking(a) - markBacking(b))[0];
          const foldChance = Math.max(0.1, Math.min(0.5, 0.5 - markBacking(mark) / 300));
          consultantNext = { ...consultantNext, threats: consultantNext.threats + 1, lastSetPiece: week };
          if (Math.random() < foldChance) {
            mark.organizer = false;
            mark.support = clamp(mark.support - 25);
            mark.underPressure = 2;
            consultantNotes[mark.id] = "STEPS BACK";
            consultantLines.push(`JOB THREAT LANDS \u2014 ${mark.name} steps off the committee. That is the damage: their hours are gone, their reach is gone, and everyone who took cues from them loses a little of what they had. They had ${Math.round(markBacking(mark))} signed backing, so this was a ${Math.round(foldChance * 100)}% chance of folding. ${mark.name} is walked into a room with ${CONSULTANT_NAME} and their manager and asked, carefully, whether they've thought about how this looks on a performance file. Nothing actionable is said. They will still vote yes \u2014 nobody talks somebody out of a union by frightening them. They just won't organize anyone else. He picks the most isolated person on your committee, because that is the only kind this works on.`);
            mark.history.push(`Week ${week}: pressured off the committee.`);
            outgoingTies(influence, mark.id).forEach(t => {
              const other = byId(t.id);
              if (!other || other.burned || other.signed) return;
              bump(other, -Math.round((t.weight / 100) * 5));
              consultantPulses.push({ from: mark.id, to: t.id, tone: "down" });
            });
          } else {
            mark.support = clamp(mark.support + 5);
            heatNext = clamp(heatNext + 8);
            consultantNotes[mark.id] = "DOESN'T BLINK";
            consultantLines.push(`JOB THREAT BACKFIRES \u2014 ${mark.name} holds, keeps their seat on the committee, and everyone they carry moves toward you for real. +8 heat. With ${Math.round(markBacking(mark))} signed backing they only had a ${Math.round(foldChance * 100)}% chance of folding \u2014 every 3 points of backing takes 1% off it, which is to say the defence was the people around them, not their nerve. ${CONSULTANT_NAME} asks how this will look on their performance file. ${mark.name} writes down the date, the time, and who was in the room, and tells everyone. Threatening someone's job over a union is illegal, and now it's documented.`);
            mark.history.push(`Week ${week}: threatened, didn't budge, and put it on the record.`);
            outgoingTies(influence, mark.id).forEach(t => {
              const other = byId(t.id);
              if (!other || other.burned || other.signed) return;
              bump(other, Math.round((t.weight / 100) * 6));
              consultantPulses.push({ from: mark.id, to: t.id, tone: "up" });
            });
          }
        } else if (canRaise && raisePool.length) {
          const mark = [...raisePool].sort((a, b) => a.support - b.support)[0];
          const before35 = mark.support;
          const takeChance = Math.min(0.7, Math.max(0.05, (100 - mark.support) / 60));
          consultantNext = { ...consultantNext, raises: consultantNext.raises + 1, lastSetPiece: week };
          if (Math.random() < takeChance) {
            const wasSigned = mark.signed;
            mark.signed = false;
            mark.support = clamp(mark.support - 35);
            mark.underPressure = 2;
            heatNext = clamp(heatNext - 5);
            consultantNotes[mark.id] = wasSigned ? "PULLS THEIR CARD" : "TAKES THE OFFER";
            consultantLines.push(`BUY-OFF LANDS \u2014 ${mark.name}${wasSigned ? " withdraws their card" : " goes quiet"}, and \u22125 heat, because a quiet raise draws no attention. ${wasSigned ? "That card is the damage \u2014 you need thirty percent on paper to file, and it just came off the table. " : ""}He offers it to whoever on your side is cheapest to buy: at ${before35} support that was a ${Math.round(takeChance * 100)}% chance of being taken. They're offered a title bump and a number that solves a real problem at home. They take it. This is the one thing the company does that works on material interest rather than persuasion, which is why it works. Nobody in the room blames them, which is the worst part.`);
            mark.history.push(`Week ${week}: took the raise${wasSigned ? " and withdrew their card" : ""}.`);
          } else {
            mark.support = clamp(mark.support + 8);
            heatNext = clamp(heatNext + 6);
            consultantNotes[mark.id] = "TURNS IT DOWN";
            consultantLines.push(`BUY-OFF REFUSED \u2014 ${mark.name} keeps their card, and everyone they carry moves toward you for real. +6 heat. At ${before35} support it was a ${Math.round(takeChance * 100)}% chance of landing \u2014 the more convinced somebody already is, the less a raise is worth. They're offered a title bump and a raise, quietly, a week after signing on. They turn it down and repeat the offer out loud in the kitchen. Buying one person is cheap; getting caught at it is not.`);
            mark.history.push(`Week ${week}: refused a raise meant to buy them off, and said so publicly.`);
            outgoingTies(influence, mark.id).forEach(t => {
              const other = byId(t.id);
              if (!other || other.burned || other.signed) return;
              bump(other, Math.round((t.weight / 100) * 6));
              consultantPulses.push({ from: mark.id, to: t.id, tone: "up" });
            });
          }
        }
      }
    }
    if (consultantLines.length) {
      steps.push({
        label: consultantNext.arrivedWeek === week ? "A CONSULTANT ARRIVES" : `${CONSULTANT_NAME_UC} WORKS THE FLOOR`,
        sub: consultantNext.arrivedWeek === week
          ? "Management stops improvising and starts paying someone."
          : "The same playbook you're running, pointed the other way.",
        workers: w.map(x => ({ ...x })),
        lines: consultantLines,
        notes: consultantNotes,
        edgePulses: consultantPulses,
      });
    }

    const signedNow = w.filter(x => x.signed).length;

    // --- ELECTION DAY ---
    let ballot = null;
    if (stage === "campaign" && electionWeek != null && week >= electionWeek) {
      let yes = 0, no = 0;
      const nonVoters = [];
      w.forEach(x => {
        if (Math.random() >= turnoutChance(x)) { nonVoters.push(x.name); return; }
        if (Math.random() < yesChance(x)) yes += 1; else no += 1;
      });
      ballot = { yes, no, out: nonVoters.length, cast: yes + no, won: yes > no };
      steps.push({
        label: "THE BALLOT",
        sub: "Every worker in the unit, one secret ballot each. A majority of the votes cast decides it.",
        workers: w.map(x => ({ ...x })),
        lines: [
          `${ballot.cast} of ${ACT1_TOTAL_WORKERS} workers cast a ballot. ${nonVoters.length} didn't vote at all${nonVoters.length ? ` — ${nonVoters.slice(0, 4).join(", ")}${nonVoters.length > 4 ? ", and others" : ""}` : ""}.`,
          `YES ${ballot.yes} — NO ${ballot.no}.`,
        ],
      });
    }

    steps.push({
      label: "END OF WEEK",
      sub: `Week ${week} complete.`,
      workers: w.map(x => ({ ...x })),
      lines: ballot
        ? [ballot.won ? "The union carries the unit." : "The union falls short."]
        : stage === "campaign"
          ? [`${Math.max(0, electionWeek - week)} week(s) until the vote. Projection right now: ${voteProjection(w).yes} yes, ${voteProjection(w).no} no.`]
          : [`${signedNow} of ${ACT1_TOTAL_WORKERS} cards signed — ${Math.round((signedNow / ACT1_TOTAL_WORKERS) * 100)}% of the floor. You need ${Math.round(ACT1_CARD_THRESHOLD * 100)}% to file.`],
    });

    setResolutionSteps(steps);
    setStepIndex(0);
    setPhase("resolving");
    pendingRef.current = {
      workers: w,
      heat: heatNext,
      consultant: consultantNext,
      ballot,
      outsidersNext,
      perksNext: [...perksNext, ...consultantPerks],
      // Reaching 30% no longer ends the game — it unlocks the choice to file.
      reachedThreshold: stage === "drive" && signedNow >= ACT1_CARDS_NEEDED,
    };
  }

  function commitWeek() {
    const { workers: w, heat: h, consultant: c, ballot, outsidersNext, perksNext, reachedThreshold } = pendingRef.current;
    setWorkers(w);
    setHeat(h);
    setConsultant(c);
    setOutsiders(outsidersNext);
    setPerks(perksNext);
    setPlanEntries([]);
    if (ballot) {
      setVoteResult(ballot);
      setWonOnWeek(week);
      setPhase(ballot.won ? "victory" : "defeat");
      return;
    }
    setWeek(wk => wk + 1);
    // The first time the petition threshold is crossed, stop and make the player choose.
    if (reachedThreshold && !sawFilePrompt) {
      setSawFilePrompt(true);
      setShowFilePrompt(true);
    }
    setPhase("plan");
  }

  function startOver() {
    setWeek(1);
    setWorkers(makeAct1Workers());
    setPlanEntries([]);
    setHeat(0);
    setConsultant({ active: false, arrivedWeek: null, lastSetPiece: 0, raises: 0, threats: 0, perks: 0 });
    setPerks([]);
    setStage("drive");
    setFiledWeek(null);
    setElectionWeek(null);
    setVoteResult(null);
    setShowFilePrompt(false);
    setSawFilePrompt(false);
    setResolutionSteps([]);
    setStepIndex(0);
    setSelectedWorker(null);
    setWonOnWeek(null);
    setConfirmStartOver(false);
    setPhase("intro");
  }

  // What Act One hands forward. Not four names and a trait each — the floor itself:
  // who these people are, where they actually stand, what you found out they have in
  // common, and the map of who listens to whom that took twenty weeks to draw. The next
  // act is the same twenty people in the same building; there is no honest reason for
  // any of it to be rolled again.
  function graduate(persist = true) {
    const committee = workers
      .filter(w => w.organizer && !w.burned)
      .slice(0, 4)
      .map(w => ({ name: w.name, trait: w.trait }));
    onGraduate({ leaders: committee, workers, influence, week }, persist);
  }

  const cardShare = signedCount / ACT1_TOTAL_WORKERS;
  const canFile = stage === "drive" && signedCount >= ACT1_CARDS_NEEDED;
  const projection = voteProjection(workers);
  const clarity = floorClarity(workers, week);
  const readCounts = (() => {
    const live = workers.filter(x => !x.burned);
    return { live: live.length, exact: live.filter(x => readOf(x, week).exact).length };
  })();
  const weeksToVote = electionWeek != null ? electionWeek - week : null;

  function fileWithNLRB() {
    setShowFilePrompt(false);
    setStage("campaign");
    setFiledWeek(week);
    setElectionWeek(week + ELECTION_WEEKS);
    // Nobody sits out their own election. If management hadn't hired anyone yet, they do
    // the day the petition lands.
    setConsultant(c => (c.active ? c : { ...c, active: true, arrivedWeek: week }));
    const share = signedCount / ACT1_TOTAL_WORKERS;
    if (Math.random() < recognitionChance(share, consultant.active, heat)) {
      setPhase("recognized");
      setWonOnWeek(week);
    } else {
      setPhase("filed");
    }
  }

  const act1Win = act1Winnability(workers, stage, week);
  const organizerHours = Object.fromEntries(organizers.map(o => [o.id, hoursLeftFor(o)]));
  const canResolve = planEntries.length > 0 && organizers.every(o => hoursLeftFor(o) >= 0);
  const overBudget = organizers.some(o => hoursLeftFor(o) < 0);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-mono">
      <GlobalStyle />
      <div className="border-b-2 border-stone-800 bg-stone-900 px-4 py-3 sm:px-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-stencil text-2xl sm:text-3xl tracking-wide text-amber-400">ONE SHOP</div>
          <div className="text-xs sm:text-sm tracking-[0.2em] text-stone-500">ACT ONE — CARDS ON THE TABLE</div>
        </div>
        {phase !== "intro" && (
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
            <div className="text-center">
              <div className="text-stone-500 text-xs">WEEK / SHIP</div>
              <div className={`text-lg font-bold ${ACT1_SHIP_WEEK - week <= 4 ? "text-red-500" : ACT1_SHIP_WEEK - week <= 8 ? "text-amber-400" : "text-stone-100"}`}>
                {week} <span className="text-stone-600">/</span> {ACT1_SHIP_WEEK}
              </div>
              {(() => {
                const soon = workers.filter(x => x.signed && cardStaleSoon(x, week)).length;
                return soon > 0
                  ? <div className="text-[10px] text-amber-400 font-bold">{soon} card{soon === 1 ? "" : "s"} going stale</div>
                  : <div className="text-[10px] text-stone-600">{ACT1_SHIP_WEEK - week} weeks to launch</div>;
              })()}
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-xs">MARGIN LEFT</div>
              <div className={`text-lg font-bold ${(() => {
                const spare = workers.filter(w => !w.burned && !w.signed).length + workers.filter(w => w.signed).length - ACT1_CARDS_NEEDED;
                return spare <= 1 ? "text-red-500" : spare <= 3 ? "text-amber-400" : "text-stone-100";
              })()}`}>
                +{Math.max(0, workers.filter(w => !w.burned).length - ACT1_CARDS_NEEDED)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-xs">CARDS SIGNED</div>
              <div className={`text-lg font-bold ${signedCount >= ACT1_CARDS_NEEDED ? "text-teal-400" : "text-amber-400"}`}>{signedCount} / {ACT1_CARDS_NEEDED}</div>
              <div className="text-[11px] text-stone-600">{cardPct}% of {ACT1_TOTAL_WORKERS} — need {Math.round(ACT1_CARD_THRESHOLD * 100)}%</div>
            </div>
            {stage === "campaign" && (
              <div className="text-center">
                <div className="text-stone-500 text-xs flex items-center gap-1"><Vote size={11} /> BALLOT IN</div>
                <div className={`text-lg font-bold ${weeksToVote <= 1 ? "text-red-500" : "text-amber-400"}`}>{Math.max(0, weeksToVote)} wk</div>
                <div className="text-[11px] text-stone-600">filed week {filedWeek}</div>
              </div>
            )}
            {/* How much of this floor you can honestly see. Nothing else on the HUD says
                whether the numbers you are steering by are worth anything. */}
            <div className="text-center">
              <div className="text-stone-500 text-xs">YOU CAN SEE</div>
              <div className={`text-lg font-bold ${clarity >= 65 ? "text-teal-400" : clarity >= 35 ? "text-amber-400" : "text-red-400"}`}>{clarity}%</div>
              <div className="text-[11px] text-stone-600">{readCounts.exact} of {readCounts.live} read properly</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-xs">COMMITTEE</div>
              <div className="text-lg font-bold text-stone-100">{organizers.length}</div>
              <div className="text-[11px] text-stone-600">{totalHours} hrs/week</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-xs flex items-center gap-1"><Eye size={11} /> HEAT</div>
              <div className={`text-lg font-bold ${heat >= 60 ? "text-red-500" : heat >= 35 ? "text-amber-400" : "text-teal-400"}`}>{heat}</div>
              {consultant.active && (
                <div className={`text-[10px] ${heat >= KIRKMAN_SIGHT ? "text-red-400 font-bold" : "text-stone-600"}`}>
                  {heat >= KIRKMAN_SIGHT ? "HE SEES THE NETWORK" : `${KIRKMAN_SIGHT - heat} from being seen`}
                </div>
              )}
            </div>
            {(consultant.active || outsiders.length > 0) && (
              <div className="text-center">
                <div className="text-stone-500 text-xs flex items-center gap-1"><AlertTriangle size={11} /> AGAINST YOU</div>
                <div className="flex items-center gap-1.5 justify-center mt-1">
                  {OUTSIDERS.map(o => {
                    const here = o.id === "consultant" ? consultant.active : outsiders.includes(o.id);
                    return (
                      <span
                        key={o.id}
                        title={here ? `${o.name} — ${o.role}` : "not here yet"}
                        className="text-[10px] font-bold px-1 py-0.5 border"
                        style={{
                          borderColor: here ? "#f87171" : "#44403c",
                          color: here ? "#f87171" : "#44403c",
                          backgroundColor: here ? "rgba(248,113,113,0.12)" : "transparent",
                        }}
                      >{o.name[0]}</span>
                    );
                  })}
                </div>
                <div className="text-[10px] text-stone-600 mt-0.5">
                  {(outsiders.length + (consultant.active ? 1 : 0))} of {OUTSIDERS.length} escalations
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {phase === "intro" && (
        <IntroSequence
          beats={ACT1_INTRO_BEATS}
          visuals={{ committee: <IntroCommitteeVisual />, influence: <IntroInfluenceVisual /> }}
          doneLabel="LET'S GO"
          onDone={() => setPhase("plan")}
        />
      )}

      {phase === "plan" && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          {unlockPublic && !anyPublicDone && (
            <div className="mb-4 flex items-start gap-2 text-teal-300 text-sm border border-teal-700 bg-teal-950/30 px-3 py-2">
              <Megaphone size={14} className="shrink-0 mt-0.5" />
              {/* The tier cards in the worker panel already quote the reach, the support
                  it moves, the exposure risk and what repeating one costs — live, per
                  person, per tier. This only has to say the option now exists. */}
              <span><span className="font-bold text-teal-400">NEW — PUBLIC ACTIONS.</span> One of your people can do something visible instead of having one more conversation. Open anyone on the committee to see what it reaches, and what it risks.</span>
            </div>
          )}
          {anyRecruitable && (
            <div className="mb-4 flex items-start gap-2 text-teal-300 text-sm border border-teal-700 bg-teal-950/30 px-3 py-2">
              <UsersRound size={14} className="shrink-0 mt-0.5" />
              <span><span className="font-bold text-teal-400">SOMEONE'S READY TO ORGANIZE.</span> A signer with strong support can join the committee — {ACT1_HOURS_PER_ORGANIZER} more hours a week, and their relationships become yours to use.</span>
            </div>
          )}

          {stage === "campaign" && (
            <div className="mb-4 border-2 border-amber-700 bg-amber-950/20 px-3 py-3">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="font-stencil text-lg tracking-wide text-amber-400">THE BALLOT IS {Math.max(0, weeksToVote)} WEEK{weeksToVote === 1 ? "" : "S"} OUT</div>
                <div className="text-xs text-stone-400">Petition filed week {filedWeek} with {signedCount} cards ({cardPct}%)</div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="border border-teal-800 bg-teal-950/30 p-2 text-center">
                  <div className="text-[11px] text-stone-500 tracking-wide">PROJECTED YES</div>
                  <div className="text-2xl font-bold text-teal-400">{projection.yes}</div>
                </div>
                <div className="border border-red-800 bg-red-950/30 p-2 text-center">
                  <div className="text-[11px] text-stone-500 tracking-wide">PROJECTED NO</div>
                  <div className="text-2xl font-bold text-red-400">{projection.no}</div>
                </div>
                <div className="border border-stone-700 p-2 text-center">
                  <div className="text-[11px] text-stone-500 tracking-wide">WON'T VOTE</div>
                  <div className="text-2xl font-bold text-stone-400">{projection.out}</div>
                </div>
              </div>
              {/* The band above says "estimate, not promise" better than a sentence can,
                  so the sentence is gone. What stays is the one fact no number shows: the
                  employer owns every week left on that clock. */}
              <div className="text-xs text-stone-400 leading-relaxed">
                Majority of ballots cast wins it, and <span className="text-stone-200 font-bold">{projection.yes > projection.no ? "you are ahead" : "you are behind"}</span> on today's read.
                Every week left on the clock is a week the employer campaigns.
              </div>
            </div>
          )}

          {canFile && (
            <div className="mb-4 border-2 border-teal-700 bg-teal-950/20 px-3 py-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[16rem]">
                  <div className="font-stencil text-lg tracking-wide text-teal-400">YOU CAN FILE TODAY</div>
                  {/* A prompt and the live count. What filing costs you is the modal's
                      job — saying it here too just means saying it twice. */}
                  <div className="text-xs text-stone-400 leading-relaxed mt-1">
                    {signedCount} of {ACT1_TOTAL_WORKERS} cards is <span className="text-stone-200 font-bold">{cardPct}%</span> — past the 30% the NLRB needs to schedule an election.
                    {projection.yes > projection.no + 2
                      ? " Organizers file on a cushion, and you have one."
                      : " Organizers almost never file at the minimum."}
                  </div>
                </div>
                <button
                  onClick={() => setShowFilePrompt(true)}
                  className="font-stencil text-base bg-teal-600 hover:bg-teal-500 text-stone-950 px-5 py-2.5 tracking-wide transition-colors shrink-0"
                >
                  FILE WITH THE NLRB
                </button>
              </div>
            </div>
          )}

          {consultant.active && (
            <div className="mb-4 flex items-start gap-2 text-red-300 text-sm border border-red-800 bg-red-950/30 px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {/* A standing readout of his rules, not a mood. It changes when his
                  sight or his tempo does, so the player can see the threat change. */}
              <span>
                <span className="font-bold text-red-400">{CONSULTANT_NAME.toUpperCase()} IS ON SITE.</span>{" "}
                <span className="text-stone-300">
                  {stage === "campaign" ? "4" : "2"} one-on-ones a week, each taking up to <span className="font-bold">−5</span> off
                  where somebody actually stands, aimed at whoever looks strongest and isn't already covered by signed coworkers.
                  {stage === "campaign"
                    ? " Plus a mandatory all-hands every week: −1 to −4 off what every worker on the floor will say — it moves no votes, it just makes the room harder to read."
                    : ""}
                  {" "}{(() => {
                    const left = [
                      [CONSULTANT_MAX_EACH - (consultant.raises || 0), "raise", "raises"],
                      [CONSULTANT_MAX_EACH - (consultant.threats || 0), "job threat", "job threats"],
                      [CONSULTANT_MAX_EACH - (consultant.perks || 0), "company perk", "company perks"],
                    ].filter(([n]) => n > 0);
                    if (!left.length) return "Every set piece is spent — no raise, no job threat, no perk left to run.";
                    return `A set piece every ${CONSULTANT_SETPIECE_GAP} week${CONSULTANT_SETPIECE_GAP === 1 ? "" : "s"}: ${
                      left.map(([n, one, many]) => `${n} ${n === 1 ? one : many}`).join(", ")} left.`;
                  })()}
                </span>{" "}
                <span className={heat >= KIRKMAN_SIGHT || stage === "campaign" ? "text-red-400 font-bold" : "text-teal-400"}>
                  {heat >= KIRKMAN_SIGHT || stage === "campaign"
                    ? "He can see your map."
                    : `He can't see your map yet — at ${heat} heat he's picking names off the org chart, at 55% strength. It changes at ${KIRKMAN_SIGHT}.`}
                </span>{" "}
                <span className="text-stone-400">
                  Signed coworkers who carry weight with a target take 1 off every blow per 30 points of backing. Density is the defence.
                </span>
                {perks.length > 0 && (
                  <span className="block mt-1 text-red-400">
                    THE COMPANY OWNS: {perks.map(pk => {
                      const left = pk.until - week;
                      const when = left <= 0 ? "lapses after this week" : `${left} more week${left === 1 ? "" : "s"}`;
                      return `${AFF_BY_ID[pk.id]?.label ?? pk.id} (${when})`;
                    }).join(" · ")}
                    <span className="text-stone-400"> — these stop counting as common ground in any conversation until the perk lapses.</span>
                  </span>
                )}
              </span>
            </div>
          )}
          <Act1FloorMap
            workers={workers}
            weekNow={week}
            influence={influence}
            layout={ORG_LAYOUT}
            planEntries={planEntries}
            hoursLeft={organizerHours}
            tierOf={orgTier}
            onArm={(w) => {
              // Nobody armed: this organizer takes the week. Already armed and clicked
              // again: that's "what should Wendell do on his own" — public actions.
              if (focusActorId === w.id) setSelectedWorker(w);
              else setFocusActorId(w.id);
            }}
            onSelect={(w) => setSelectedWorker(w)}
            focusId={focusActorId}
            staleWeek={week}
          />

          {/* No shelf. Everything it carried per committee member now lives on that
              member's own card; what's left is the one instruction and the one button. */}
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-stone-500 flex-1 min-w-[16rem]">
              {focusActorId
                ? "Now click who they should work on. Click their own card again for a public action. Esc clears the selection."
                : "Click a committee member to pick who acts this week, then click who they should work on."}
            </p>
            <span className={`text-base font-bold shrink-0 ${overBudget ? "text-red-500" : totalUsed === totalHours ? "text-teal-400" : "text-amber-400"}`}>
              {totalUsed} / {totalHours} HOURS
            </span>
          </div>
          <button
            onClick={resolveWeek}
            disabled={!canResolve}
            className={`w-full font-stencil text-lg py-2.5 mt-2 tracking-wide transition-colors ${!canResolve ? "bg-stone-800 text-stone-600 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-400 text-stone-950"}`}
          >
            {overBudget ? "OVER BUDGET — CANCEL SOMETHING" : planEntries.length === 0 ? "PLAN SOMETHING FIRST" : `RESOLVE WEEK ${week}`}
          </button>
        </div>
      )}

      {resStep && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          <Act1FloorMap
            workers={resStep.workers}
            weekNow={resStep.week ?? week}
            influence={influence}
            layout={ORG_LAYOUT}
            planEntries={[]}
            onSelect={() => {}}
            highlights={resHighlights}
            edgePulses={resStep.edgePulses || []}
            stepKey={stepIndex}
            notes={resNotes}
          />
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex-1 min-h-[1.5rem] text-sm text-stone-400 font-mono">
              <div className="text-xs text-amber-400 tracking-widest">{resStep.label}</div>
              {resBanner.map((line, i) => <div key={`${stepIndex}-${i}`}>▸ {line}</div>)}
            </div>
            <button onClick={commitWeek} className="shrink-0 text-xs text-stone-500 hover:text-amber-400 underline transition-colors">
              SKIP ▸▸
            </button>
          </div>
          {resolutionSteps.slice(0, stepIndex + 1).some(s => s.lines.length > 0) && (
            <div ref={resLogRef} className="bg-stone-950/60 border border-stone-800 p-2 space-y-0.5 max-h-28 overflow-y-auto">
              {resolutionSteps.slice(0, stepIndex + 1).map((s, si) =>
                s.lines.map((line, li) => (
                  <div key={`${si}-${li}`} className={`text-xs font-mono ${si === stepIndex ? "text-stone-400" : "text-stone-600"}`}>▸ {line}</div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {phase === "victory" && (
        <OutcomeScreen
          tone="win"
          title="THE UNION CARRIES IT"
          stars={act1Stars(wonOnWeek)}
          tally={voteResult}
          meta={{ week: wonOnWeek, line: `Won on the ballot in week ${wonOnWeek} — filed week ${filedWeek} with ${signedCount} cards.` }}
          beats={[
            { lines: [
              "A majority of the ballots cast came back yes, and the labor board certifies it.",
              "This floor has a union — a bargaining unit the company is legally required to sit down with.",
            ]},
            { lines: [
              "Winning the election is not the end of the process. Certification obliges them to bargain, not to agree.",
              "A first contract can take years. The committee you built is the thing that gets you one.",
            ], quiet: true },
            { lines: ["These are the people who came through when it counted."], visual: "roster" },
          ]}
          visuals={{ roster: <OutcomeRoster workers={organizers} /> }}
          actions={<>
            <button onClick={() => graduate(true)} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">BARGAIN THE CONTRACT</button>
            <button onClick={startOver} className="font-stencil text-xl border-2 border-stone-700 hover:border-stone-500 text-stone-300 px-8 py-3 tracking-wide transition-colors">RUN IT FASTER</button>
          </>}
        />
      )}

      {showFilePrompt && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={() => setShowFilePrompt(false)}>
          <div className="bg-stone-900 border-2 border-teal-800 max-w-lg w-full p-5 my-auto" onClick={e => e.stopPropagation()}>
            <div className="font-stencil text-2xl text-teal-400 mb-1">FILE THE PETITION?</div>
            {/* The banner you clicked to get here already gave the count and the 30%.
                What it did not say is the part that matters. */}
            <p className="text-sm text-stone-400 leading-relaxed mb-3">
              Thirty percent schedules an election. It is not what wins one.
            </p>
            <div className="border border-stone-700 bg-stone-950/60 p-3 mb-3 space-y-2 text-[13px] text-stone-400 leading-relaxed">
              <div>
                <span className="text-stone-200 font-bold">What filing does.</span> You demand recognition and petition the NLRB the same day.
                A lopsided enough count can win recognition outright — rare, and rarer once they are paying a consultant.
              </div>
              <div>
                <span className="text-stone-200 font-bold">Otherwise, a secret ballot in {ELECTION_WEEKS} weeks.</span> Decided by a majority of the
                ballots actually cast — someone who stays at their desk is a vote you didn't get.
              </div>
              <div>
                <span className="text-stone-200 font-bold">Those {ELECTION_WEEKS} weeks belong to them.</span> Mandatory meetings every week, one-on-ones
                with everyone wavering, and no way to withdraw once you've filed.
              </div>
            </div>
            <div className="border border-stone-700 p-3 mb-4">
              <div className="text-xs text-stone-500 tracking-wide mb-1">TODAY'S PROJECTION, BEFORE ANY OF THAT</div>
              <div className="flex items-center gap-4 text-base">
                <span className="text-teal-400 font-bold">{projection.yes} YES</span>
                <span className="text-red-400 font-bold">{projection.no} NO</span>
                <span className="text-stone-500">{projection.out} not voting</span>
              </div>
              <div className={`text-xs mt-1 ${projection.yes > projection.no + 2 ? "text-teal-400" : "text-red-400"}`}>
                {projection.yes > projection.no + 2
                  ? "A real cushion. This is roughly where organizers actually file."
                  : projection.yes > projection.no
                    ? "Ahead by a hair. Four weeks of their campaign will eat that."
                    : "You would lose this vote today."}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={fileWithNLRB} className="flex-1 font-stencil text-base bg-teal-600 hover:bg-teal-500 text-stone-950 px-4 py-2.5 tracking-wide transition-colors">
                FILE IT
              </button>
              <button onClick={() => setShowFilePrompt(false)} className="flex-1 font-stencil text-base border-2 border-stone-600 hover:border-stone-400 text-stone-300 px-4 py-2.5 tracking-wide transition-colors">
                KEEP ORGANIZING
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "filed" && (
        <div className="max-w-xl mx-auto px-6 py-16 text-center anim-rise">
          <div className="font-stencil text-4xl mb-3 text-amber-400">THE PETITION IS IN</div>
          <p className="text-stone-400 mb-4 leading-relaxed text-base">
            You demanded recognition with {signedCount} cards. The company declined, the way companies almost always do, and the
            matter goes to the labor board. An election is scheduled for <span className="text-stone-100 font-bold">week {electionWeek}</span>.
          </p>
          <p className="text-stone-500 mb-6 leading-relaxed text-sm">
            {CONSULTANT_NAME} is now on the floor full time. There will be a mandatory meeting every week between now and the ballot,
            and he will sit down with everyone who looks like they might waver. You have {ELECTION_WEEKS} weeks and the same hours you always had.
          </p>
          <button onClick={() => setPhase("plan")} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
            GET TO WORK
          </button>
        </div>
      )}

      {phase === "recognized" && (
        <OutcomeScreen
          tone="win"
          title="RECOGNIZED"
          stars={act1Stars(wonOnWeek)}
          meta={{ week: wonOnWeek, line: `${signedCount} of ${ACT1_TOTAL_WORKERS} cards — ${cardPct}% — in ${wonOnWeek} week${wonOnWeek === 1 ? "" : "s"}. No election needed.` }}
          beats={[
            { lines: [
              "The count was lopsided enough that fighting it looked worse than losing it.",
              "The company recognized the union rather than spend three months losing an election everyone could already see coming.",
            ]},
            { lines: [
              "This is the outcome almost nobody gets. The only way to get it is to be overwhelming.",
            ], quiet: true },
            { lines: ["These are the people who came through when it counted."], visual: "roster" },
          ]}
          visuals={{ roster: <OutcomeRoster workers={organizers} /> }}
          actions={<>
            <button onClick={() => graduate(true)} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">BARGAIN THE CONTRACT</button>
            <button onClick={startOver} className="font-stencil text-xl border-2 border-stone-700 hover:border-stone-500 text-stone-300 px-8 py-3 tracking-wide transition-colors">RUN IT AGAIN</button>
          </>}
        />
      )}

      {phase === "defeat" && voteResult && (
        <OutcomeScreen
          tone="loss"
          title="THE VOTE COMES BACK NO"
          tally={voteResult}
          meta={{ line: `Filed week ${filedWeek} with ${signedCount} cards. The ballot was week ${wonOnWeek}.` }}
          beats={[
            { lines: [
              voteResult.out > voteResult.yes
                ? "More people stayed at their desks than voted yes. Every one of them was a vote you could have had."
                : "It came down to the ballots cast, and there weren't enough of them.",
              "Under labor law there's no second attempt for a year. The committee holds, quietly, and waits.",
            ]},
            { lines: [
              "Thirty percent gets you an election. It doesn't win one.",
              "Between the petition and the ballot, the company got four uninterrupted weeks with everyone you hadn't locked down.",
            ]},
            { lines: [
              "A signature on a card was never the same thing as a yes in a booth.",
            ], quiet: true },
          ]}
          actions={<button onClick={startOver} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">START OVER</button>}
        />
      )}

            {selectedWorker && phase === "plan" && (
        <Act1WorkerModal
          worker={workers.find(w => w.id === selectedWorker.id) || selectedWorker}
          allWorkers={workers}
          influence={influence}
          organizers={organizers}
          hoursLeftFor={hoursLeftFor}
          hoursFor={hoursFor}
          week={week}
          preferActorId={focusActorId}
          plannedFor={planEntries.filter(e => e.targetId === selectedWorker.id || (e.actorId === selectedWorker.id && !e.targetId))}
          onCancelPlans={(key) => setPlanEntries(es => es.filter(e => e.key !== key))}
          unlockPublic={unlockPublic}
          consultantActive={consultant.active}
          onPlan={(actorId, type, targetId) => { addPlan(actorId, type, targetId); setSelectedWorker(null); setFocusActorId(actorId); }}
          onClose={() => setSelectedWorker(null)}
        />
      )}

      {phase !== "intro" && (
        <div className="fixed bottom-2 left-2 z-40">
          {confirmStartOver ? (
            <div className="flex items-center gap-2 bg-stone-900 border border-stone-700 px-2 py-1.5 text-xs">
              <span className="text-stone-500">Restart Act One from scratch?</span>
              <button onClick={startOver} className="text-red-400 hover:text-red-300 font-bold">YES</button>
              <button onClick={() => setConfirmStartOver(false)} className="text-stone-500 hover:text-stone-300">CANCEL</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmStartOver(true)}
              className="text-xs text-stone-600 hover:text-stone-400 underline transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      )}

      {phase !== "intro" && !act1Win.alive && (
        <div className="fixed inset-0 bg-stone-950/95 z-50 flex items-center justify-center px-6">
          <div className="max-w-lg text-center anim-rise">
            <div className="font-stencil text-5xl mb-4 text-red-500">{act1Win.shipped ? "THE GAME SHIPPED" : "DRIVE DEAD"}</div>
            <p className="text-stone-400 mb-4 leading-relaxed">{act1Win.reason}</p>
            <p className="text-red-400/80 text-sm mb-6 leading-relaxed border border-red-900/60 bg-red-950/20 px-4 py-3">
              {act1Win.shipped
                ? `You had ${ACT1_SHIP_WEEK} weeks and ${workers.filter(x => x.signed).length} of the ${ACT1_CARDS_NEEDED} cards you needed. There is no next build to organize.`
                : "Called at week " + week + ". There is no clock left to run down \u2014 the count stopped being reachable, so the remaining weeks would not have changed the ending. The people who were walked out are not coming back."}
            </p>
            <button
              onClick={() => { try { localStorage.removeItem(ACT1_SAVE_KEY); } catch (err) { /* private mode */ } window.location.reload(); }}
              className="border-2 border-stone-600 px-6 py-2 text-sm text-stone-200 hover:bg-stone-800 transition-colors"
            >
              START OVER
            </button>
          </div>
        </div>
      )}

      {phase !== "intro" && (
        <div className="fixed bottom-2 right-2 z-40">
          <button
            onClick={() => graduate(false)}
            title="Jumps straight to the first contract without saving over your real Act One progress."
            className="text-xs text-stone-600 hover:text-stone-400 underline transition-colors"
          >
            Skip to the first contract (playtest — doesn't save)
          </button>
          {onSkipToCompany && (
            <button
              onClick={onSkipToCompany}
              title="Jumps past the first contract to the company-wide campaign. Doesn't save."
              className="text-xs text-stone-600 hover:text-amber-400 underline transition-colors ml-3"
            >
              Skip to the company campaign (playtest)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Act1WorkerModal({ worker, allWorkers, influence, week = 1, organizers, hoursLeftFor, hoursFor, preferActorId = null, plannedFor = [], onCancelPlans = null, unlockPublic, consultantActive = false, onPlan, onClose }) {
  const others = organizers.filter(o => o.id !== worker.id);
  const [actorId, setActorId] = useState(() => {
    if (preferActorId && preferActorId !== worker.id && others.some(o => o.id === preferActorId)) return preferActorId;
    if (worker.organizer) return worker.id;
    // If the player picked the actor off the shelf first, honour that choice.
    if (preferActorId && preferActorId !== worker.id && others.some(o => o.id === preferActorId)) return preferActorId;
    // Default to whoever carries the most weight with this person — but skip anyone
    // whose week is already spent, so the panel doesn't open fully greyed out.
    const ranked = [...others].sort((a, b) => infOn(influence, b.id, worker.id) - infOn(influence, a.id, worker.id));
    return (ranked.find(o => hoursLeftFor(o) >= 1) || ranked[0])?.id ?? null;
  });
  const actor = allWorkers.find(w => w.id === actorId);
  const isSelfPanel = worker.organizer && (!preferActorId || preferActorId === worker.id);
  // Armed-actor flow: the pair is already decided, so the panel is an action card for
  // that pair rather than a place to shop for a different organizer.
  const locked = !isSelfPanel;

  const pctOf = (c) => Math.round(c * 20) * 5;

  const weight = actor && !isSelfPanel ? shownInfluence(influence, actor, worker) : 0;
  // What the relationship is actually worth, once the common ground you have surfaced
  // is counted. This is the number every formula below runs on.
  const tie = actor && !isSelfPanel ? tieFrom(weight, actor, worker) : 0;
  const weightKnown = influenceKnown(actor, worker);
  const gains = actor && !isSelfPanel ? convoGain(actor, worker, tie) : null;
  const chance = actor && !isSelfPanel ? signChance(actor, worker, tie) : 0;

  const canAfford = (type) => actor && hoursLeftFor(actor) >= ACT1_ACTION[type].hours;

  const publicPreview = (tier) => {
    const uses = worker.publicUses?.[tier] || 0;
    const reached = outgoingTies(influence, worker.id).map(t => {
      const target = allWorkers.find(x => x.id === t.id);
      return target && !target.burned ? { ...t, target, tie: tieFrom(t.weight, worker, target) } : null;
    }).filter(t => t && t.tie >= EDGE_MIN_DRAW);
    const known = reached.filter(t => influenceKnown(worker, t.target));
    const total = known.reduce((s, t) => s + publicGain(worker, t.target, t.tie, tier, uses), 0);
    return { count: reached.length, knownCount: known.length, total, uses };
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-stone-900 border-2 border-stone-700 max-w-lg w-full p-5 my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-stencil text-2xl text-amber-400">
            {locked && actor ? <>{actor.name} <span className="text-stone-500">{"\u2192"}</span> {worker.name}</> : worker.name}
          </div>
          <button onClick={onClose}><X size={18} className="text-stone-500 hover:text-stone-200" /></button>
        </div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <LadderBadge worker={worker} />
          <InfluenceTraitChip worker={worker} />
          <span className="flex items-center gap-1 text-xs text-stone-500">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: TEAM_HEX[worker.team] }} />
            {TEAM_LABEL[worker.team]}
          </span>
          {worker.guarded > 0 && <span className="text-[11px] font-bold text-red-400 border border-red-900 px-1.5">GUARDED · {worker.guarded}w</span>}
        </div>

        {/* The read, as the same bar that is on their card. This is the panel where the
            player decides whether to ask, so how sure they are has to be in front of
            them at that moment — but it is one bar and a number, not a section. */}
        {!worker.burned && (() => {
          const r = readOf(worker, week);
          const hex = supportTier(r.mid).hex;
          return (
            <div className="flex items-center gap-2 mb-3"
              title={worker.signed ? "They signed — this is not an estimate."
                : r.exact ? "Somebody sat down with them recently, so this is where they actually stand."
                : r.kind === "fading" ? `Last read ${r.age} weeks ago, and people move.`
                : r.kind === "warm" ? "You've talked, never sat down. Their words are the top of this range, not the middle."
                : "Nobody has spoken to them. All you have is what they say to the room, which is a ceiling."}>
              <div className="relative h-1.5 flex-1 bg-stone-800 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 rounded-full" style={{
                  left: `${r.lo}%`, width: `${Math.max(1.5, r.hi - r.lo)}%`,
                  backgroundColor: hex, opacity: r.exact ? 0.95 : r.kind === "cold" ? 0.3 : 0.5,
                }} />
                {r.exact
                  ? <div className="absolute inset-y-0 w-0.5" style={{ left: `${r.mid}%`, backgroundColor: hex }} />
                  : <div className="absolute -inset-y-0.5 w-0.5" style={{ left: `${r.hi}%`, backgroundColor: hex, opacity: 0.8 }} />}
              </div>
              <span className="font-mono text-sm font-bold shrink-0" style={{ color: hex }}>
                {r.exact ? r.mid : `${r.lo}\u2013${r.hi}`}
              </span>
            </div>
          );
        })()}

        {plannedFor.length > 0 && onCancelPlans && (
          // Cancelling lives here, next to what it cancels, rather than as a mark on the
          // board that has to be found before it can be clicked.
          <div className="border border-amber-700 bg-amber-950/25 px-3 py-2 mb-3">
            <div className="text-[11px] text-amber-400 font-bold tracking-wide mb-1">ALREADY PLANNED THIS WEEK</div>
            {plannedFor.map(e => (
              <div key={e.key} className="flex items-center justify-between gap-3 text-sm text-stone-200">
                <span>
                  {allWorkers.find(x => x.id === e.actorId)?.name} {"\u2192"} {ACT1_ACTION[e.type].label.toLowerCase()}
                  <span className="text-stone-500"> ({ACT1_ACTION[e.type].hours}h)</span>
                </span>
                <button
                  onClick={() => onCancelPlans(e.key)}
                  className="text-xs font-bold border border-stone-600 hover:border-red-500 hover:text-red-400 text-stone-300 px-2 py-1 transition-colors"
                >CANCEL</button>
              </div>
            ))}
          </div>
        )}
        {/* Who they are, and what they have in common with whoever is doing the asking.
            Everything else about this person — where they stand, how many hours they have
            left, what the company has bought — is already on their card on the board, and
            saying it twice made this panel longer than the decision it exists to serve. */}
        <p className="text-sm text-stone-400 leading-relaxed mb-3">{worker.hook}</p>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          <AffinityMarks worker={worker} actor={isSelfPanel ? null : actor} />
        </div>

        {worker.history.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-stone-500 font-bold mb-1 tracking-wide">HISTORY</div>
            <div className="bg-stone-950 border border-stone-800 p-2 max-h-28 overflow-y-auto space-y-1">
              {worker.history.map((h, i) => (<div key={i} className="text-xs text-stone-400">▸ {h}</div>))}
            </div>
          </div>
        )}

        {worker.burned ? (
          <div className="text-sm text-red-400">This person is out of play for the rest of the campaign.</div>
        ) : isSelfPanel ? (
          <div className="space-y-2">
            <div className="text-xs text-stone-500 tracking-wide flex items-center gap-2 flex-wrap">
              <span>{worker.name}</span>
              <HourPie left={Math.max(0, hoursLeftFor(worker))} total={hoursFor(worker)} hex="#fbbf24" size={19}
                label={`${hoursLeftFor(worker)} of ${hoursFor(worker)} hours left this week`} />
              {worker.shaken > 0 && <span className="text-red-400"> — under a manager's eye this week</span>}
            </div>
            <div className="border border-stone-800 bg-stone-950/50 px-3 py-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold" style={{ color: orgTier(worker).hex }}>{orgTier(worker).label}</span>
                <span className="text-stone-500">{worker.experience || 0} xp</span>
              </div>
              <div className="h-1 w-full bg-stone-800 mb-1.5">
                <div className="h-1" style={{ width: `${worker.experience || 0}%`, backgroundColor: orgTier(worker).hex }} />
              </div>
              <div className="text-stone-400 leading-snug">{orgTier(worker).blurb}</div>
              {(worker.weeksIdle || 0) > IDLE_GRACE && (
                <div className="text-amber-400 mt-1 font-bold">
                  Idle {worker.weeksIdle} weeks — down to {committeeHours(worker)} hour{committeeHours(worker) === 1 ? "" : "s"}. They leave at {IDLE_QUIT}.
                </div>
              )}
            </div>
            {!unlockPublic && (
              <div className="text-xs text-stone-600 italic border border-stone-800 px-3 py-2">
                Right now {worker.name} can only have conversations. Click someone else on the floor to plan one.
              </div>
            )}
            {unlockPublic && ["small", "medium", "large"].map(tier => {
              const p = publicPreview(tier);
              const t = PUBLIC_TIERS[tier];
              const affordable = hoursLeftFor(worker) >= ACT1_ACTION[tier].hours;
              return (
                <button
                  key={tier}
                  disabled={!affordable}
                  onClick={() => onPlan(worker.id, tier)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${affordable ? "border-stone-700 hover:bg-stone-800/60" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-sm text-stone-100 flex justify-between">
                    <span>{ACT1_ACTION[tier].label}</span>
                    <CostPips hours={ACT1_ACTION[tier].hours} affordable={affordable} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">{t.blurb}</div>
                  <div className="text-xs text-teal-400 leading-snug mt-0.5">
                    Reaches {p.count} coworker{p.count === 1 ? "" : "s"} along their influence{p.knownCount > 0 ? ` — about +${p.total} support in total across the ${p.knownCount} you've mapped` : ", none of them mapped yet"}.
                  </div>
                  {p.uses > 0 && (
                    <div className="text-xs text-amber-500 leading-snug mt-0.5">
                      {worker.name} has already done this {p.uses === 1 ? "once" : `${p.uses} times`} — it isn't news anymore. Escalating lands harder than repeating.
                    </div>
                  )}
                  {t.burn > 0 && (
                    <div className="text-xs text-red-400 leading-snug mt-0.5">
                      Exposure risk: {tier === "large" ? "high" : "some"}. If management moves on them, they're out of the campaign and everyone they carry loses ground.
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : others.length === 0 ? (
          <div className="text-sm text-stone-500">Nobody on the committee is free to work on {worker.name} right now.</div>
        ) : (
          <div>
            <div className={locked ? "hidden" : "text-xs text-stone-500 font-bold mb-1 tracking-wide"}>WHO DOES IT</div>
            <div className={locked ? "hidden" : "flex flex-wrap gap-1.5 mb-2"}>
              {others.map(o => {
                const wgt = infOn(influence, o.id, worker.id);
                const wgtKnown = influenceKnown(o, worker);
                const selected = o.id === actorId;
                return (
                  <button
                    key={o.id}
                    onClick={() => setActorId(o.id)}
                    className={`border px-2 py-1 text-left transition-colors ${selected ? "border-amber-500 bg-amber-950/30" : "border-stone-700 hover:bg-stone-800/60"}`}
                  >
                    <div className="text-[13px] text-stone-100 flex items-center gap-1.5">
                      {o.name}
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: infTrait(o).hex }} title={infTrait(o).label} />
                    </div>
                    <div className="text-[11px] flex items-center gap-1.5">
                      <HourPie left={Math.max(0, hoursLeftFor(o))} total={hoursFor(o)} hex={hoursLeftFor(o) <= 0 ? "#f87171" : "#fbbf24"} size={13}
                        label={`${hoursLeftFor(o)} of ${hoursFor(o)} hours left`} />
                      <span className="text-stone-500">inf {wgtKnown ? wgt : "?"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {actor && (
              <div className="text-xs text-stone-400 border border-stone-800 bg-stone-950/50 px-2.5 py-2 mb-3 leading-relaxed">
                {/* One line: the tie, and how much of it is common ground you surfaced.
                    The symbols above already say WHICH things they share, so this does
                    not repeat them. */}
                {weightKnown ? (
                  <>
                    <span className="text-stone-300 font-bold">{actor.name} {"\u2192"} {worker.name}: {tie}</span>
                    {tieBonus(actor, worker) > 0 && (
                      <span className="text-teal-300"> ({weight} + {tie - weight} from what they share)</span>
                    )}
                    <span className="text-stone-500">
                      {" \u00b7 "}
                      {tie >= 55 ? "this is who should be doing it"
                        : tie >= 25 ? "it'll land, but not hard"
                        : "whatever they say bounces off"}
                    </span>
                  </>
                ) : (
                  <span className="text-stone-500">
                    <span className="text-stone-300 font-bold">Unmapped.</span> Numbers below assume an average relationship.
                  </span>
                )}
                                {hoursLeftFor(actor) <= 0 && (
                  <><br /><span className="text-red-400">{actor.name} has no hours left this week — pick someone else, or free up an hour in the plan below.</span></>
                )}
              </div>
            )}

            <div className="space-y-2">
              {worker.organizer && (
                <button
                  disabled={!canAfford("checkin")}
                  onClick={() => onPlan(actor.id, "checkin", worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford("checkin") ? "border-amber-700 hover:bg-amber-950/30" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-sm text-amber-300 flex justify-between items-center">
                    <span>{ACT1_ACTION.checkin.label}</span>
                    <CostPips hours={ACT1_ACTION.checkin.hours} affordable={canAfford("checkin")} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">
                    An hour of {actor.name}'s week spent on {worker.name} instead of a target. +10 experience, resets their idle clock
                    {worker.shaken > 0 ? ", and gets them out from under the manager's eye this week" : ""}.
                  </div>
                  {(worker.weeksIdle || 0) >= IDLE_QUIT - 1 && (
                    <div className="text-xs text-amber-400 leading-snug mt-0.5 font-bold">
                      {worker.name} walks off the committee next week without this.
                    </div>
                  )}
                </button>
              )}
              {["quick", "deep"].map(type => (
                <button
                  key={type}
                  disabled={!canAfford(type)}
                  onClick={() => onPlan(actor.id, type, worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford(type) ? "border-stone-700 hover:bg-stone-800/60" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-sm text-stone-100 flex justify-between">
                    <span>{ACT1_ACTION[type].label}</span>
                    <CostPips hours={ACT1_ACTION[type].hours} affordable={canAfford(type)} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">
                    {type === "deep"
                      ? <><span className="text-teal-400 font-bold">{weightKnown ? "+" : "\u2248+"}{gains.deepTrue}</span> where they stand, and you learn the number. Surfaces 3-4.</>
                      : <><span className="text-teal-400">{weightKnown ? "+" : "\u2248+"}{gains.quickTrue}</span> where they stand, and your read narrows. Surfaces 1-3.</>}
                  </div>
                  {type === "deep" && misfireChance(actor, worker) > 0 && (
                    <div className="text-xs text-red-400 leading-snug mt-0.5">
                      {Math.round(misfireChance(actor, worker) * 100)}% it misfires — {affList(worker).some(t => !knownAff(worker).includes(t))
                        ? "nothing found in common yet, so it lands as a pitch. Quick chat first."
                        : "these two have nothing to build on, so it lands as a pitch."}
                    </div>
                  )}
                </button>
              ))}

              {!worker.signed && (
                <button
                  disabled={!canAfford("ask")}
                  onClick={() => onPlan(actor.id, "ask", worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford("ask") ? "border-teal-800 hover:bg-teal-950/30" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-sm text-teal-300 flex justify-between">
                    <span>{ACT1_ACTION.ask.label}</span>
                    <CostPips hours={ACT1_ACTION.ask.hours} affordable={canAfford("ask")} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">
                    {(worker.trueKnown ? worker.trueSupport : worker.support) < 46
                      ? (worker.trueKnown
                          ? "Nowhere near ready underneath — asking now is worse than not asking."
                          : "They don't sound ready, and you have no real read on them.")
                      : `${weightKnown ? "~" : "≈"}${pctOf(chance)}% they sign, from ${actor.name}.`}
                    {worker.askedRecently > 0 && " Asked recently — harder right now."}
                    <span className="text-red-400"> A no costs 5 and makes the next ask harder.</span>
                  </div>
                </button>
              )}

              {worker.signed && !worker.organizer && (
                <button
                  disabled={!canAfford("recruit") || !worker.trueKnown || (worker.trueSupport ?? 0) < ACT1_RECRUIT_REQ}
                  onClick={() => onPlan(actor.id, "recruit", worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford("recruit") && worker.trueKnown && (worker.trueSupport ?? 0) >= ACT1_RECRUIT_REQ ? "border-amber-700 hover:bg-amber-950/30" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-sm text-amber-300 flex justify-between">
                    <span>{ACT1_ACTION.recruit.label}</span>
                    <CostPips hours={ACT1_ACTION.recruit.hours} affordable={canAfford("recruit")} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">
                    {!worker.trueKnown
                      ? `You don't actually know where ${worker.name} stands — only what they say. Sit down with them properly before handing them other people's campaigns.`
                      : (worker.trueSupport ?? 0) < ACT1_RECRUIT_REQ
                      ? `Needs ${ACT1_RECRUIT_REQ} to take this on. Your read puts them at ${worker.trueSupport}, which is not close, however they talk.`
                      : `${worker.name} starts organizing too: +${ACT1_HOURS_PER_ORGANIZER} hours every week, their relationships become yours to direct, and they get better at it the more you use them. Leave them idle ${IDLE_QUIT} weeks and they walk.`}
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================================
// PROTOTYPE — THE FIRST CONTRACT
// A vertical slice, not a finished act. It exists to test one question: does
// "run an action → get a real turnout number → spend it at the table" feel good?
//
// Deliberately NOT in the slice: turnover, decertification, ULP charges, the bargaining
// survey, open bargaining, direct dealing, the community campaign. Four ladder rungs,
// three issues, eight turns.
// =====================================================================================

// One turn is a month, and twelve of them is the certification year — the window in
// which the employer must bargain and cannot be challenged. Run it out without a contract
// and the union you won in Act One goes to a decertification vote.
const CONTRACT_MONTHS = 12;
// Leverage is perishable. A sticker day three months ago doesn't frighten anybody today,
// so an unspent stack cools every month. Hoarding it is not a strategy.
const LEVERAGE_COOLING = 0.8;
const CAT_HOURS = 3;
const CAT_JOIN_REQ = 70;

// ---------- REPETITION IS NOT A STRUCTURE TEST ----------
// The second sticker day tells the company nothing the first one didn't. A test only
// tests something the last one left open, so a rung you have already run pays a
// fraction of what it paid — and escalating is the only thing that keeps paying. This is
// the same curve Act One uses on repeated public actions.
const CONTRACT_FATIGUE = 0.6;
function rungFatigue(uses) { return 1 / (1 + CONTRACT_FATIGUE * uses); }

// ---------- SURFACE BARGAINING ----------
// The employer never says no. They say not yet, and they say it for a year. Every month
// you cannot make that expensive, the price of everything you still want goes up — which
// is the actual mechanism by which most first contracts die.
const STALL_STEP = 0.15;
const STALL_MAX = 4;
const stalledCost = (base, stall) => Math.round(base * (1 + STALL_STEP * stall));

// ---------- THE CALENDAR ----------
// Withholding labour three weeks from a ship date is a different act from withholding it
// in a quiet month. Visible from month one, because a cap you plan against is strategy.
const CONTRACT_MILESTONES = { 4: "VERTICAL SLICE DUE", 8: "PUBLISHER MILESTONE", 11: "GOLD MASTER" };
const MILESTONE_MULT = 1.8;
const OFFPEAK_MULT = 0.65;
// Only the rungs that actually withhold something care what month it is.
const timingMult = (tier, month) =>
  tier.rank < 4 ? 1 : (CONTRACT_MILESTONES[month] ? MILESTONE_MULT : OFFPEAK_MULT);

// A team nobody asks to do anything stops being a team.
const CAT_IDLE_QUIT = 4;

// ---------- WHAT YOU KNOW ABOUT YOUR OWN MEMBERS ----------
// Act One's lesson, one act later: commitment is not on the board, it is a read on the
// board. Sitting down with somebody gives you a number for a couple of months. An action
// gives you a number for everybody who TURNED UP — and tells you nothing about the people
// who stayed home, which are exactly the people you needed to know about. That is what a
// structure test is for, and it is why the projection is a range and not an answer.
const CONTRACT_READ_FRESH = 2;
const CONTRACT_READ_STEP = 5;
const CONTRACT_READ_MAX = 24;
function contractRead(w, month) {
  const age = month - (w.spokenMonth ?? -99);
  if (age <= CONTRACT_READ_FRESH) return { lo: w.commitment, hi: w.commitment, mid: w.commitment, exact: true, age };
  const half = Math.min(CONTRACT_READ_MAX, CONTRACT_READ_STEP * (age - CONTRACT_READ_FRESH));
  return { lo: clamp(w.commitment - half), hi: clamp(w.commitment + half), mid: w.commitment, exact: false, age };
}

// The escalation ladder. Each rung is a structure test: it costs prep, it produces a
// measured turnout, and that number is the only thing the company actually responds to.
const ACTION_LADDER = [
  {
    key: "letter", rank: 1, label: "Open letter to management", hours: 1,
    floor: 15, span: 55, threshold: 0.55, payout: 14,
    blurb: "Everyone who signs puts their name on a piece of paper the company has to read.",
  },
  {
    key: "stickers", rank: 2, label: "Sticker day", hours: 2,
    floor: 32, span: 55, threshold: 0.6, payout: 30,
    blurb: "One day, everyone wears it. Management counts stickers walking down the hall.",
  },
  {
    key: "march", rank: 3, label: "March on the boss", hours: 3,
    floor: 48, span: 52, threshold: 0.5, payout: 58,
    blurb: "A delegation walks into the studio head's office, unannounced, with a demand.",
  },
  {
    key: "worktorule", rank: 4, label: "No voluntary overtime", hours: 4,
    floor: 58, span: 48, threshold: 0.5, payout: 90,
    blurb: "Nobody stays past their hours. Three weeks from a milestone, that is a loaded gun.",
  },
  {
    key: "strike", rank: 5, label: "One-day stoppage", hours: 5,
    floor: 70, span: 42, threshold: 0.75, payout: 160,
    blurb: "For one day nobody works. The only thing that costs the company money — and the only thing that costs the floor a day's pay to say.",
  },
];

const CONTRACT_ISSUES = [
  {
    id: "wages", label: "WAGES",
    tiers: ["The company's offer — 1.5%, under inflation", "Keeps pace with inflation", "A real raise, and a floor under QA"],
    costs: [0, 28, 66],
  },
  {
    id: "justcause", label: "JUST CAUSE",
    tiers: ["At-will. A PerfAxis score still decides who goes", "Progressive discipline, on paper", "Just cause, and an appeal that reaches a human"],
    costs: [0, 42, 86],
  },
  {
    id: "ai", label: "PLAY-EYE",
    tiers: ["No language at all", "The company must disclose what it overrides", "No override of credited work. No unit jobs replaced"],
    costs: [0, 38, 92],
  },
];
const CONTRACT_MAX_TIERS = CONTRACT_ISSUES.length * 2;

// Voting yes once and giving up your Friday are different acts, so what somebody would
// have done at the ballot is a ceiling on what they will do now, not a promise.
const CONTRACT_VOTE_TO_ACTION = 0.85;

function makeContractWorkers(act1Workers = null) {
  if (!act1Workers) {
    // The playtest entrance, with no campaign behind it: a plausible floor, rolled.
    return ACT1_WORKERS_SEED.map(w => ({
      ...w,
      commitment: clamp(38 + rand(38) + (w.organizer ? 22 : 0)),
      fulfillment: clamp(w.fulfillment + rand(9) - 4),
      cat: !!w.organizer,
      participated: false,
      revealed: true,
      history: [],
      spokenMonth: w.organizer ? 1 : -99,
      monthsIdle: 0,
      bought: 0,
      thinRuns: 0,
    }));
  }
  // The real entrance. These are the same twenty people a week after the vote, and
  // everything that was true of them at the ballot is still true of them now.
  return act1Workers.map(w => {
    const stood = w.trueSupport ?? w.support;
    const wasBurned = !!w.burned;
    return {
      ...w,
      commitment: clamp(Math.round(stood * CONTRACT_VOTE_TO_ACTION)
        + (w.organizer && !wasBurned ? 10 : 0)   // they have already been doing this
        - (wasBurned ? 18 : 0)),                 // and they have already been punished for it
      // The committee that won the election is the team that bargains the contract.
      cat: !!w.organizer && !wasBurned,
      // Winning is what brings back the people management pulled out of the campaign.
      // They come back, and they come back wary.
      burned: false,
      // The company's perks lapse in the contract fight. What these people have in
      // common is theirs again.
      poisoned: [],
      participated: false,
      revealed: true,
      // A deep conversation in Act One is still a fresh read here; anyone the campaign
      // never actually sat down with arrives as a question mark, same as they were.
      spokenMonth: w.trueKnown ? 1 : -99,
      monthsIdle: 0,
      bought: 0,
      thinRuns: 0,
    };
  });
}

// Who turns people out: the people on the contract action team who carry weight with them.
function catBacking(influence, workers, id) {
  return workers
    .filter(x => x.cat && x.id !== id)
    .reduce((sum, x) => sum + infOn(influence, x.id, id), 0);
}

// Commitment says whether they'd act at all. Fulfillment says how far they'll go:
// somebody who loves this job will sign a letter but won't hold a milestone hostage.
function participationChance(w, tier, backing) {
  const ready = Math.max(0, Math.min(1, (w.commitment - tier.floor) / tier.span));
  const drag = (w.fulfillment / 100) * (tier.rank >= 3 ? 0.42 : 0.10);
  const pull = Math.min(0.22, backing / 420);
  // Somebody the company has just bought does not walk out with you, whatever they said
  // last month. It wears off; the fact that it worked on them does not.
  const bought = (w.bought || 0) > 0 ? 0.3 : 1;
  return Math.max(0, Math.min(0.97, (ready * (1 - drag) + pull) * bought));
}

// The truth, used to resolve an action. The player never sees this one.
function projectedTurnout(workers, influence, tier) {
  if (!tier) return 0;
  return workers.reduce((n, w) => n + participationChance(w, tier, catBacking(influence, workers, w.id)), 0);
}
// What the player can actually work out, which is a range. Wide wherever nobody has
// spoken to anybody in a while.
function projectedTurnoutBand(workers, influence, tier, month) {
  if (!tier) return { lo: 0, hi: 0, exact: true };
  let lo = 0, hi = 0, exact = true;
  workers.forEach(w => {
    const r = contractRead(w, month);
    if (!r.exact) exact = false;
    const backing = catBacking(influence, workers, w.id);
    lo += participationChance({ ...w, commitment: r.lo }, tier, backing);
    hi += participationChance({ ...w, commitment: r.hi }, tier, backing);
  });
  return { lo: Math.round(lo), hi: Math.round(hi), exact };
}

const contractTierSum = (issues) => issues.reduce((n, i) => n + i.tier, 0);

// Ratification: they vote on what you actually brought back, not on how hard you tried.
function ratifyYesChance(w, issues) {
  const won = contractTierSum(issues) / CONTRACT_MAX_TIERS;
  return Math.max(0.02, Math.min(0.96, 0.12 + won * 0.62 + (w.commitment - 45) / 190));
}

// After the certification year, the question stops being what's in the contract and
// becomes whether there's still a union at all. Nothing to show for a year of bargaining
// is exactly how a unit gets decertified — so this leans on what was actually WON, not
// on how warm the floor feels. A year of pleasant meetings and an empty contract is the
// most common way a first unit dies, and it should read that way here.
function keepUnionChance(w, issues) {
  const won = contractTierSum(issues) / CONTRACT_MAX_TIERS;
  return Math.max(0.03, Math.min(0.97, 0.14 + won * 0.55 + (w.commitment - 45) / 220));
}

function ContractPrototype({ carry = null, onComplete = null, onExit }) {
  // The influence map is not regenerated. Who listens to whom did not change because an
  // election happened, and re-rolling it would throw away the one thing the player spent
  // the whole of Act One learning.
  const [influence] = useState(() => carry?.influence ?? generateInfluence(ACT1_WORKERS_SEED));
  const [workers, setWorkers] = useState(() => makeContractWorkers(carry?.workers));
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState("plan"); // plan, result, ratify
  const [leverage, setLeverage] = useState(0);
  const [issues, setIssues] = useState(CONTRACT_ISSUES.map(i => ({ id: i.id, tier: 0 })));
  const [planEntries, setPlanEntries] = useState([]);
  const [actionPlan, setActionPlan] = useState(null); // { tierKey, leadId }
  const [result, setResult] = useState(null);
  const [ratification, setRatification] = useState(null);
  const [decert, setDecert] = useState(null);
  // How many times each rung has been run, so repeating one pays what repeating is worth.
  const [rungUses, setRungUses] = useState({});
  // Months of "not yet" the company has banked, priced into everything you still want.
  const [stall, setStall] = useState(0);
  const [dead, setDead] = useState(null);
  const [selected, setSelected] = useState(null);
  const planKey = useRef(0);

  const cat = workers.filter(w => w.cat);
  // One-on-ones and recruiting come out of one person's three hours. A collective action
  // is prepped by the whole team, so it draws on the pool — otherwise the four-hour rung
  // could never be chosen by anybody, which is exactly the lock this replaced.
  const hoursUsed = (id) =>
    planEntries.filter(e => e.actorId === id).reduce((n, e) => n + (e.type === "oneOnOne" ? 2 : 3), 0);
  // A lead organizer out of Act One is still a lead organizer. Experience carries.
  const catHours = (w) => CAT_HOURS + (orgTier(w).bonusHours || 0);
  const hoursLeft = (w) => catHours(w) - hoursUsed(w.id);
  const totalHours = cat.reduce((n, o) => n + catHours(o), 0);
  const actionHours = actionPlan ? ACTION_LADDER.find(t => t.key === actionPlan.tierKey).hours : 0;
  const totalUsed = cat.reduce((n, o) => n + hoursUsed(o.id), 0) + actionHours;

  const tier = actionPlan ? ACTION_LADDER.find(t => t.key === actionPlan.tierKey) : null;
  // The player gets the range, never the number. The exact one is only ever used to
  // resolve the action itself.
  const projection = tier ? projectedTurnoutBand(workers, influence, tier, turn) : { lo: 0, hi: 0, exact: true };
  const unread = workers.filter(x => !contractRead(x, turn).exact).length;
  const issueDef = (id) => CONTRACT_ISSUES.find(i => i.id === id);
  const ratifyProjection = workers.reduce((n, w) => n + ratifyYesChance(w, issues), 0);
  const cooled = Math.floor(leverage * LEVERAGE_COOLING);
  const monthsLeft = CONTRACT_MONTHS - turn;

  function addPlan(actorId, type, targetId) {
    // One of each per person per month — stacking two recruits on the same worker just
    // burns hours, and it stacks up unreadably on their card.
    if (planEntries.some(e => e.type === type && e.targetId === targetId)) return;
    planKey.current += 1;
    setPlanEntries(p => [...p, { key: planKey.current, actorId, type, targetId }]);
  }
  function advanceIssue(id) {
    const cur = issues.find(i => i.id === id);
    const cost = stalledCost(issueDef(id).costs[cur.tier + 1], stall);
    if (cur.tier >= 2 || leverage < cost) return;
    setLeverage(l => l - cost);
    setIssues(list => list.map(i => (i.id === id ? { ...i, tier: i.tier + 1 } : i)));
  }

  function resolveTurn() {
    let w = workers.map(x => ({ ...x, participated: false }));
    const byId = (id) => w.find(x => x.id === id);
    const lines = [];
    const notes = {};
    let gained = 0;
    let stallNext = stall;
    const usesNext = { ...rungUses };

    planEntries.filter(e => e.type === "oneOnOne").forEach(e => {
      const a = byId(e.actorId), t = byId(e.targetId);
      if (!a || !t) return;
      const tie = tieOn(influence, a, t);
      // Somebody who loves this job is harder to move toward doing something about it.
      const drag = 1 - 0.35 * (t.fulfillment / 100);
      const gain = Math.max(1, Math.round(11 * (0.45 + 0.85 * (tie / 100)) * drag));
      const before = t.commitment;
      t.commitment = clamp(t.commitment + gain);
      t.spokenMonth = turn; // and now you know where they are, for a couple of months
      notes[t.id] = `${a.name} +${t.commitment - before}`;
      lines.push(`${a.name} sits down with ${t.name}. Commitment ${before} \u2192 ${t.commitment}, and it is a number rather than a range for the next ${CONTRACT_READ_FRESH} months.`);
    });

    planEntries.filter(e => e.type === "recruit").forEach(e => {
      const t = byId(e.targetId);
      if (!t || t.cat || t.commitment < CAT_JOIN_REQ) return;
      t.cat = true;
      t.monthsIdle = 0;
      notes[t.id] = "JOINS THE CAT";
      lines.push(`${t.name} joins the contract action team \u2014 ${catHours(t)} more hours a month, and everyone they can turn out.`);
    });

    let actionResult = null;
    if (tier) {
      const lead = byId(actionPlan.leadId);
      const showed = [];
      const sat = [];
      w.forEach(x => {
        const backing = catBacking(influence, w, x.id) + infOn(influence, lead.id, x.id) * 0.5;
        if (Math.random() < participationChance(x, tier, backing)) { x.participated = true; showed.push(x); }
        else sat.push(x);
      });
      const share = showed.length / w.length;
      const strong = share >= tier.threshold;
      const uses = rungUses[tier.key] || 0;
      const fatigue = rungFatigue(uses);
      const timing = timingMult(tier, turn);
      usesNext[tier.key] = uses + 1;
      const raw = strong
        ? tier.payout * Math.min(1.35, share / tier.threshold)
        : tier.payout * 0.25 * (share / tier.threshold);
      const payout = Math.round(raw * fatigue * timing);
      gained = payout;
      // Everyone who turned up, you now know about. The people who stayed home you do
      // not — and they are exactly the people the next month has to be spent on.
      showed.forEach(x => { x.spokenMonth = turn; });
      if (strong) {
        // Fatigue is what the COMPANY stops noticing. It is not what standing next to
        // each other does for the people who turned up, so the floor still builds.
        const bump = 4;
        showed.forEach(x => { x.commitment = clamp(x.commitment + bump); x.thinRuns = 0; });
        stallNext = Math.max(0, stall - 1);
        lines.push(`${showed.length} of ${w.length} took part. The company's negotiator noticed, and the room changed. +${payout} leverage, +${bump} commitment to everyone who turned up, and a month comes off what they have banked.`);
      } else {
        w.forEach(x => { x.commitment = clamp(x.commitment - 3); if (x.cat) x.thinRuns = (x.thinRuns || 0) + 1; });
        stallNext = Math.min(STALL_MAX, stall + 1);
        lines.push(`Only ${showed.length} of ${w.length} took part, against the ${Math.round(tier.threshold * w.length)} this needed. A thin turnout is worse than none \u2014 it shows them exactly how little you can move. +${payout} leverage, \u22123 commitment across the floor.`);
      }
      if (uses > 0) lines.push(`AND THEY HAVE SEEN IT ${uses === 1 ? "ONCE" : `${uses} TIMES`} BEFORE \u2014 this rung pays ${Math.round(fatigue * 100)}% of what it paid the first time. A test only tests what the last one left open. Climbing is the only thing that keeps paying.`);
      if (timing !== 1) lines.push(timing > 1
        ? `AND THE TIMING IS THE WHOLE POINT \u2014 ${CONTRACT_MILESTONES[turn]} this month, so withholding labour is worth ${Math.round(timing * 100)}% of normal. This is the month they cannot afford you.`
        : `AND THE TIMING IS WRONG \u2014 no milestone this month, so withholding labour is worth ${Math.round(timing * 100)}% of normal. Nobody upstairs is counting the hours in a quiet month.`);
      actionResult = { tier, showed: showed.length, sat: sat.length, total: w.length, share, strong, payout, uses, fatigue, timing };
    } else {
      // A quiet month is not neutral. This is how units die.
      w.forEach(x => { if (!x.cat) x.commitment = clamp(x.commitment - 3); });
      stallNext = Math.min(STALL_MAX, stall + 1);
      lines.push("No action this month. Bargaining happened in a room nobody saw, and the floor drifted.");
    }

    // --- THE OTHER SIDE OF THE TABLE ---
    // They never have to agree. They have to outlast you, and they have three ways of
    // going about it. Each states its own numbers, the way every set piece in this game
    // does, because a cost you cannot see teaches nothing.
    if (stallNext > stall) {
      lines.push(
        `SURFACE BARGAINING \u2014 nothing moved them this month, so every tier you have not won gets ${Math.round(STALL_STEP * 100)}% dearer. ` +
        `That is ${stallNext} month${stallNext === 1 ? "" : "s"} of "not yet" now priced in, and the price does not come back down on its own. ` +
        `They are not refusing to bargain. Refusing would be illegal. They are agreeing to meet, at length, forever.`
      );
    }
    const buyable = w.filter(x => !x.cat && (x.bought || 0) <= 0 && x.commitment >= 20)
      .sort((a, b) => a.commitment - b.commitment);
    if (buyable.length && Math.random() < 0.3) {
      const mark = buyable[0];
      const before = mark.commitment;
      const takeChance = Math.min(0.75, Math.max(0.1, (100 - before) / 90));
      if (Math.random() < takeChance) {
        mark.commitment = clamp(before - 26);
        mark.bought = 3;
        notes[mark.id] = "TAKES THE OFFER";
        lines.push(
          `DIRECT DEALING \u2014 ${mark.name} is offered a raise and a title one to one, outside the contract. At ${before} commitment that was a ` +
          `${Math.round(takeChance * 100)}% chance of landing, and it landed: ${before} \u2192 ${mark.commitment}, and they sit out the next 3 actions. ` +
          `Going around the union like this is unlawful. Proving it takes longer than the certification year, which is the point.`
        );
      } else {
        mark.commitment = clamp(before + 6);
        mark.spokenMonth = turn;
        notes[mark.id] = "TURNS IT DOWN";
        lines.push(
          `DIRECT DEALING REFUSED \u2014 ${mark.name} is offered a raise outside the contract and brings the offer to the team instead. ` +
          `+6 commitment, and you know exactly where they stand now, which is worth as much as the six.`
        );
      }
    }
    if (actionResult && tier.rank >= 3 && actionResult.showed > 0 && Math.random() < 0.35) {
      const pool = w.filter(x => x.participated && x.cat);
      const mark = pool.length
        ? [...pool].sort((a, b) => catBacking(influence, w, a.id) - catBacking(influence, w, b.id))[0]
        : null;
      if (mark) {
        mark.cat = false;
        mark.commitment = clamp(mark.commitment - 18);
        w.forEach(x => { if (x.id !== mark.id) x.commitment = clamp(x.commitment - 3); });
        notes[mark.id] = "WRITTEN UP";
        lines.push(
          `DISCIPLINE \u2014 ${BURN_NARRATIVES[rand(BURN_NARRATIVES.length)](mark.name)} ` +
          `${mark.name} comes off the action team, \u221218 commitment, and \u22123 across everybody who watched it happen. ` +
          `They picked the person on your team with the least standing behind them. This is what the top of the ladder costs, and it is why you do not climb it before the floor is with you.`
        );
      }
    }

    // --- A TEAM IS A SET OF PEOPLE WHO ARE ASKED TO DO THINGS ---
    w.forEach(x => {
      if (!x.cat) { x.monthsIdle = 0; return; }
      // Turning out for the action is doing something. Only somebody nobody asked for
      // anything at all — no conversation to run, no action to stand up in — drifts off.
      const used = planEntries.some(e => e.actorId === x.id) || actionPlan?.leadId === x.id || x.participated;
      x.monthsIdle = used ? 0 : (x.monthsIdle || 0) + 1;
      if (x.monthsIdle >= CAT_IDLE_QUIT) {
        x.cat = false;
        x.monthsIdle = 0;
        x.commitment = clamp(x.commitment - 8);
        notes[x.id] = "STEPS OFF THE TEAM";
        lines.push(`${x.name} stops coming to the meetings. Nobody has asked them to do anything in ${CAT_IDLE_QUIT} months, and they got the message.`);
      } else if ((x.thinRuns || 0) >= 2) {
        x.cat = false;
        x.thinRuns = 0;
        x.commitment = clamp(x.commitment - 6);
        notes[x.id] = "HAS HAD ENOUGH";
        lines.push(`${x.name} steps off the action team. Two actions running where they stood there with their name on it and almost nobody came is enough for anybody.`);
      }
    });
    w.forEach(x => { if ((x.bought || 0) > 0) x.bought -= 1; });

    setWorkers(w);
    setLeverage(l => l + gained);
    setRungUses(usesNext);
    setStall(stallNext);
    setResult({ lines, notes, action: actionResult, gained });
    setPhase("result");
  }

  function callRatification() {
    const yes = [];
    const no = [];
    workers.forEach(w => (Math.random() < ratifyYesChance(w, issues) ? yes : no).push(w.name));
    setRatification({ yes: yes.length, no: no.length, passed: yes.length > no.length, month: turn });
    setPhase("ratify");
  }

  function runDecert() {
    const keep = [];
    const drop = [];
    workers.forEach(w => (Math.random() < keepUnionChance(w, issues) ? keep : drop).push(w.name));
    setDecert({ keep: keep.length, drop: drop.length, survived: keep.length > drop.length });
    setPhase("decert");
  }

  // Who walks out of this act and into the company campaign: the action team, best
  // first. Four at most — beyond that the company campaign's week stops making sense.
  function contractLeaders() {
    return workers.filter(w => w.cat)
      .sort((a, b) => b.commitment - a.commitment)
      .slice(0, 4)
      .map(w => ({ name: w.name, trait: w.trait }));
  }
  function finish(outcome) {
    const payload = {
      ...outcome,
      tiers: contractTierSum(issues),
      max: CONTRACT_MAX_TIERS,
      leaders: contractLeaders(),
      issues: issues.map(i => ({ id: i.id, tier: i.tier })),
    };
    if (onComplete) onComplete(payload); else onExit();
  }

  function backToTable() {
    // A deal voted down isn't the end — you go back, with a floor that trusts you less.
    setWorkers(ws => ws.map(w => ({ ...w, commitment: clamp(w.commitment - 6) })));
    setRatification(null);
    setPhase("plan");
  }

  function nextTurn() {
    setPlanEntries([]);
    setActionPlan(null);
    if (turn >= CONTRACT_MONTHS) { runDecert(); return; }
    // Same promise as the other two acts: the moment the arithmetic dies, say so, and
    // say why. Here it dies when there is nobody left willing to put their name on
    // anything, because then there is nothing for the company to answer.
    if (!workers.some(x => x.cat)) {
      setDead(`There is nobody left on the contract action team. The company does not have to agree with an empty room \u2014 it only has to keep booking the meeting.`);
      return;
    }
    setLeverage(l => Math.floor(l * LEVERAGE_COOLING));
    setTurn(t => t + 1);
    setPhase("plan");
  }

  // Past recognition there is no hidden-support game left: these are your members and
  // you know where they stand, so every read on this board is exact.
  const boardWorkers = workers.map(w => ({
    ...w, support: w.commitment, organizer: w.cat, signed: w.participated,
    trueSupport: w.commitment, trueKnown: true, trueKnownWeek: 1,
  }));
  const labels = { organizerLegend: "ON THE ACTION TEAM", signedLegend: "TURNED OUT LAST TIME", numberLegend: "COMMITMENT" };
  const canResolve = planEntries.length > 0 || actionPlan;
  const overBudget = cat.some(o => hoursLeft(o) < 0) || totalUsed > totalHours;
  const poolLeft = totalHours - totalUsed;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-mono">
      <GlobalStyle />
      <div className="border-b-2 border-stone-800 bg-stone-900 px-4 py-3 sm:px-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-stencil text-2xl sm:text-3xl tracking-wide text-amber-400">THE FIRST CONTRACT</div>
          <div className="text-xs sm:text-sm tracking-[0.2em] text-stone-500">
            {carry ? "ACT TWO — CERTIFICATION IS NOT AGREEMENT" : "PROTOTYPE SLICE — NOT A FINISHED ACT"}
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
          <div className="text-center">
            <div className="text-stone-500 text-xs">MONTH</div>
            <div className="text-lg font-bold text-stone-100">{Math.min(turn, CONTRACT_MONTHS)} / {CONTRACT_MONTHS}</div>
          </div>
          <div className="text-center">
            <div className="text-stone-500 text-xs">THE CALENDAR</div>
            <div className={`text-lg font-bold ${CONTRACT_MILESTONES[turn] ? "text-amber-400" : "text-stone-500"}`}>
              {CONTRACT_MILESTONES[turn] ? "MILESTONE" : "quiet"}
            </div>
            <div className="text-[11px] text-stone-600">
              {CONTRACT_MILESTONES[turn] || `next: month ${Object.keys(CONTRACT_MILESTONES).map(Number).find(m => m > turn) ?? "\u2014"}`}
            </div>
          </div>
          <div className="text-center">
            <div className="text-stone-500 text-xs">CERT YEAR</div>
            <div className={`text-lg font-bold ${monthsLeft <= 2 ? "text-red-500" : monthsLeft <= 4 ? "text-amber-400" : "text-teal-400"}`}>{Math.max(0, monthsLeft)} left</div>
          </div>
          <div className="text-center">
            <div className="text-stone-500 text-xs">LEVERAGE</div>
            <div className="text-lg font-bold text-amber-400">{leverage}</div>
            <div className="text-[11px] text-stone-600">cools to {cooled}</div>
          </div>
          <div className="text-center">
            <div className="text-stone-500 text-xs">CONTRACT</div>
            <div className="text-lg font-bold text-teal-400">{contractTierSum(issues)} / {CONTRACT_MAX_TIERS}</div>
          </div>
          <div className="text-center">
            <div className="text-stone-500 text-xs">ACTION TEAM</div>
            <div className="text-lg font-bold text-stone-100">{cat.length}</div>
            <div className="text-[11px] text-stone-600">{totalHours} hrs</div>
          </div>
        </div>
      </div>

      {phase === "ratify" && ratification && (
        <OutcomeScreen
          tone={ratification.passed ? "win" : "loss"}
          title={ratification.passed ? "RATIFIED" : "VOTED DOWN"}
          tally={{ yes: ratification.yes, no: ratification.no }}
          meta={{ line: `${contractTierSum(issues)} of ${CONTRACT_MAX_TIERS} tiers won across three issues.` }}
          beats={[
            { lines: ratification.passed
              ? ["The membership ratifies. This floor has a contract — the first one is always the hardest, and most units never get here."]
              : ["The membership votes it down. You bargained a deal the people who have to live under it wouldn't accept.", turn >= CONTRACT_MONTHS ? "And the certification year is gone." : "You can go back to the table — but the clock doesn't stop, and the floor trusts you a little less."] },
            { lines: [
              `Wages: ${issueDef("wages").tiers[issues.find(i => i.id === "wages").tier]}.`,
              `Just cause: ${issueDef("justcause").tiers[issues.find(i => i.id === "justcause").tier]}.`,
            ]},
            { lines: [`Play-Eye: ${issueDef("ai").tiers[issues.find(i => i.id === "ai").tier]}.`], quiet: true },
          ]}
          actions={ratification.passed || turn >= CONTRACT_MONTHS ? (
            <button onClick={() => finish({ ratified: ratification.passed, survived: true })} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
              {onComplete ? "TAKE IT TO THE OTHER STUDIOS" : "BACK TO THE GAME"}
            </button>
          ) : (
            <>
              <button onClick={backToTable} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">BACK TO THE TABLE</button>
              <button onClick={onExit} className="font-stencil text-xl border-2 border-stone-700 hover:border-stone-500 text-stone-300 px-8 py-3 tracking-wide transition-colors">LEAVE IT</button>
            </>
          )}
        />
      )}

      {phase === "decert" && decert && (
        <OutcomeScreen
          tone={decert.survived ? "win" : "loss"}
          title={decert.survived ? "STILL A UNION" : "DECERTIFIED"}
          tally={{ yes: decert.keep, no: decert.drop }}
          meta={{ line: `The certification year ran out with ${contractTierSum(issues)} of ${CONTRACT_MAX_TIERS} tiers won and no contract.` }}
          beats={[
            { lines: decert.survived
              ? ["A year of bargaining with nothing signed, and the company petitioned to decertify. The floor held anyway — barely.",
                 "You keep the union. You still don't have a contract, and now everyone knows how long the company is willing to wait."]
              : ["A year of bargaining produced nothing anyone could hold, and enough of the floor voted to be rid of it.",
                 "This is how most first contracts actually fail. Not a lost strike — a year of meetings nobody could see."] },
            { lines: ["The employer never has to agree. They only have to outlast you, and twelve months is not a long time to wait."], quiet: true },
          ]}
          actions={decert.survived
            ? <button onClick={() => finish({ ratified: false, survived: true })} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
                {onComplete ? "TAKE IT TO THE OTHER STUDIOS" : "BACK TO THE GAME"}
              </button>
            // Decertified is an ending, not a doorway. The unit you spent two acts
            // building does not exist any more, and nothing carries out of that.
            : <button onClick={onExit} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">START OVER</button>}
        />
      )}

      {dead && (
        <div className="fixed inset-0 bg-stone-950/95 z-50 flex items-center justify-center px-6">
          <div className="max-w-lg text-center anim-rise">
            <div className="font-stencil text-5xl mb-4 text-red-500">NOBODY LEFT TO ASK</div>
            <p className="text-stone-400 mb-4 leading-relaxed">{dead}</p>
            <p className="text-red-400/80 text-sm mb-6 leading-relaxed border border-red-900/60 bg-red-950/20 px-4 py-3">
              Called at month {turn} of {CONTRACT_MONTHS}, with {contractTierSum(issues)} of {CONTRACT_MAX_TIERS} tiers won. There is
              still calendar left, but no campaign to run on it — so the rest of the year would not have changed the ending.
            </p>
            <button onClick={onExit} className="border-2 border-stone-600 px-6 py-2 text-sm text-stone-200 hover:bg-stone-800 transition-colors">
              START OVER
            </button>
          </div>
        </div>
      )}

      {(phase === "plan" || phase === "result") && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          {turn === 1 && phase === "plan" && (
            <div className="mb-4 flex items-start gap-2 text-stone-300 text-sm border border-stone-700 bg-stone-900/60 px-3 py-2">
              <Megaphone size={14} className="shrink-0 mt-0.5" />
              {/* Two lines. Everything this used to explain — what repetition pays, what a
                  milestone month is worth, what the number on a card measures — is now on
                  the board itself, live and numeric, where it is still there in month 9. */}
              <span>
                You won the election. Now the company has to bargain — <span className="text-stone-100 font-bold">but not to agree</span>.
                Run an action; the turnout you get is the only argument they answer to.</span>
            </div>
          )}

          {/* THE TABLE */}
          <div className="border-2 border-stone-800 bg-stone-900 p-4 mb-6">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="font-stencil text-lg tracking-wide text-stone-200">AT THE TABLE</div>
              <div className="text-sm text-stone-400 max-w-md text-right">
                Spend leverage to move an issue. You will not be able to afford everything — and it cools 20% a month if you sit on it.
                {stall > 0 && <span className="text-red-400"> Every price here is {Math.round(STALL_STEP * stall * 100)}% above list: {stall} month{stall === 1 ? "" : "s"} of them agreeing to meet and settling nothing.</span>}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {CONTRACT_ISSUES.map(def => {
                const cur = issues.find(i => i.id === def.id);
                const maxed = cur.tier >= 2;
                const base = maxed ? null : def.costs[cur.tier + 1];
                const cost = maxed ? null : stalledCost(base, stall);
                const afford = !maxed && leverage >= cost;
                return (
                  <div key={def.id} className={`border p-2.5 ${maxed ? "border-teal-800 bg-teal-950/20" : "border-stone-700"}`}>
                    <div className="text-xs tracking-wide text-stone-500 mb-1">{def.label}</div>
                    <div className="text-sm text-stone-200 leading-snug mb-2 min-h-[3rem]">{def.tiers[cur.tier]}</div>
                    <div className="flex items-center gap-1 mb-2">
                      {[0, 1, 2].map(t => (
                        <div key={t} className={`h-1 flex-1 ${t <= cur.tier ? "bg-teal-500" : "bg-stone-800"}`} />
                      ))}
                    </div>
                    {maxed ? (
                      <div className="text-xs text-teal-400 font-bold">WON</div>
                    ) : (
                      <button
                        onClick={() => advanceIssue(def.id)}
                        disabled={!afford}
                        className={`w-full text-sm py-1.5 tracking-wide transition-colors ${afford ? "bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold" : "border border-stone-800 text-stone-600 cursor-not-allowed"}`}
                      >
                        PUSH IT — {cost}{stall > 0 && base !== cost ? ` (was ${base})` : ""} LEVERAGE
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {phase === "plan" && turn >= 2 && (
            <div className={`mb-6 border-2 px-3 py-3 ${monthsLeft <= 3 ? "border-red-700 bg-red-950/20" : "border-teal-800 bg-teal-950/10"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[17rem]">
                  <div className={`font-stencil text-lg tracking-wide ${monthsLeft <= 3 ? "text-red-400" : "text-teal-400"}`}>
                    {monthsLeft <= 3 ? `THE CERTIFICATION YEAR ENDS IN ${Math.max(0, monthsLeft)} MONTH${monthsLeft === 1 ? "" : "S"}` : "YOU CAN TAKE THE DEAL YOU HAVE"}
                  </div>
                  <div className="text-xs text-stone-400 leading-relaxed mt-1">
                    You've won <span className="text-stone-100 font-bold">{contractTierSum(issues)} of {CONTRACT_MAX_TIERS}</span> tiers. Put it to a ratification vote whenever you like — the members vote on what you actually brought back.
                    Today it projects <span className="text-teal-400 font-bold">~{Math.round(ratifyProjection)} yes</span> to <span className="text-red-400 font-bold">~{workers.length - Math.round(ratifyProjection)} no</span>.
                    {monthsLeft <= 3 && " Reach month 12 with no contract and the company petitions to decertify the union."}
                  </div>
                </div>
                <button
                  onClick={callRatification}
                  className={`font-stencil text-base px-5 py-2.5 tracking-wide transition-colors shrink-0 ${monthsLeft <= 3 ? "bg-red-600 hover:bg-red-500 text-stone-950" : "bg-teal-600 hover:bg-teal-500 text-stone-950"}`}
                >
                  PUT IT TO A VOTE
                </button>
              </div>
            </div>
          )}

          <Act1FloorMap
            workers={boardWorkers}
            weekNow={1}
            influence={influence}
            planEntries={planEntries}
            planLabel={(e) => (e.type === "oneOnOne" ? "1:1" : "recruit")}
            onSelect={(w) => phase === "plan" && setSelected(w)}
            notes={phase === "result" ? result?.notes : null}
            stepKey={turn}
            labels={labels}
            ladder={CONTRACT_LADDER}
            rungOf={(w) => contractLadderOf(w, turn)}
            hoursLeft={phase === "plan" ? Object.fromEntries(cat.map(o => [o.id, hoursLeft(o)])) : null}
          />

          {phase === "result" ? (
            <div className="border-2 border-amber-700 bg-stone-900 p-4">
              {result.action ? (
                <>
                  <div className="font-stencil text-xl tracking-wide text-amber-400 mb-1">{result.action.tier.label.toUpperCase()}</div>
                  <div className="flex items-end gap-3 mb-2">
                    <div className={`font-stencil text-5xl ${result.action.strong ? "text-teal-400" : "text-red-400"}`}>{result.action.showed}</div>
                    <div className="text-stone-500 text-lg mb-1">of {result.action.total} took part</div>
                    <div className="ml-auto text-right">
                      <div className="text-xs text-stone-500">LEVERAGE GAINED</div>
                      <div className="text-2xl font-bold text-amber-400">+{result.gained}</div>
                    </div>
                  </div>
                  <div className="h-2 bg-stone-800 mb-1">
                    <div className={result.action.strong ? "h-full bg-teal-500" : "h-full bg-red-500"} style={{ width: `${result.action.share * 100}%` }} />
                    <div className="relative" style={{ marginTop: -8, marginLeft: `${result.action.tier.threshold * 100}%`, width: 2, height: 8, background: "#e7e5e4" }} />
                  </div>
                  <div className="text-xs text-stone-500 mb-3">The white mark is what this action needed to land: {Math.round(result.action.tier.threshold * 100)}%.</div>
                </>
              ) : (
                <div className="font-stencil text-xl tracking-wide text-stone-400 mb-2">A QUIET MONTH</div>
              )}
              <div className="bg-stone-950/60 border border-stone-800 p-2 space-y-0.5 max-h-40 overflow-y-auto mb-3">
                {result.lines.map((l, i) => <div key={i} className="text-xs text-stone-400">▸ {l}</div>)}
              </div>
              <button onClick={nextTurn} className="w-full font-stencil text-lg bg-amber-500 hover:bg-amber-400 text-stone-950 py-2.5 tracking-wide transition-colors">
                {turn >= CONTRACT_MONTHS ? "THE CERTIFICATION YEAR IS UP" : "NEXT MONTH"}
              </button>
            </div>
          ) : (
            <>
              {/* THE ACTION */}
              <div className="border-2 border-stone-800 bg-stone-900 p-4 mb-4">
                <div className="font-stencil text-lg tracking-wide text-stone-200 mb-1">CALL AN ACTION</div>
                <p className="text-xs text-stone-500 mb-3">
                  One per month. Pick who leads it — the people they carry weight with are likelier to show.
                  {unread > 0
                    ? <span className="text-amber-500"> Turnout is a range because {unread} {unread === 1 ? "person hasn't" : "people haven't"} been sat down with
                      or seen at an action lately. Running one is how you find out — but only about the people who turn up.</span>
                    : <span className="text-teal-500"> Every read on this floor is current, so these numbers are as good as they get.</span>}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 mb-3">
                  {ACTION_LADDER.map(t => {
                    const chosen = actionPlan?.tierKey === t.key;
                    const proj = projectedTurnoutBand(workers, influence, t, turn);
                    // Green only when even the pessimistic end of the range clears it.
                    const need = t.threshold * workers.length;
                    const lands = proj.lo >= need;
                    const maybe = !lands && proj.hi >= need;
                    const uses = rungUses[t.key] || 0;
                    const timing = timingMult(t, turn);
                    // Prep comes out of the pool, so a rung the team can't cover this month
                    // shouldn't be selectable — better than letting the plan go over and
                    // then refusing to resolve it.
                    const affordable = chosen || t.hours <= poolLeft + actionHours;
                    return (
                      <button
                        key={t.key}
                        disabled={!affordable}
                        onClick={() => setActionPlan(a => (a?.tierKey === t.key ? null : { tierKey: t.key, leadId: a?.leadId ?? cat[0]?.id }))}
                        className={`text-left border-2 p-2.5 transition-colors ${chosen ? "border-amber-500 bg-amber-950/30" : affordable ? "border-stone-700 hover:bg-stone-800/60" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-stone-100 font-bold">{t.label}</span>
                          <span className="text-xs text-stone-500">{t.hours}h</span>
                        </div>
                        <div className="text-xs text-stone-400 leading-snug mt-0.5">{t.blurb}</div>
                        {(uses > 0 || timing !== 1) && (
                          <div className="text-xs mt-1 text-amber-500 leading-snug">
                            {uses > 0 && <>Run {uses === 1 ? "once" : `${uses} times`} already — pays {Math.round(rungFatigue(uses) * 100)}%. </>}
                            {timing > 1 && <>{CONTRACT_MILESTONES[turn]} this month — worth {Math.round(timing * 100)}%.</>}
                            {timing < 1 && <>No milestone this month — worth {Math.round(timing * 100)}%.</>}
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${lands ? "text-teal-400" : maybe ? "text-amber-400" : "text-red-400"}`}>
                          {proj.lo === proj.hi ? `~${proj.lo}` : `${proj.lo}\u2013${proj.hi}`} of {workers.length} · needs {Math.round(t.threshold * workers.length)} to land
                        </div>
                      </button>
                    );
                  })}
                </div>
                {tier && (
                  <div className="border border-stone-700 bg-stone-950/60 p-2.5">
                    <div className="text-xs text-stone-500 tracking-wide mb-1.5">WHO LEADS IT</div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.map(o => (
                        <button
                          key={o.id}
                          onClick={() => setActionPlan(a => ({ ...a, leadId: o.id }))}
                          className={`border px-2 py-1 text-[13px] transition-colors ${actionPlan.leadId === o.id ? "border-amber-500 bg-amber-950/30 text-stone-100" : "border-stone-700 text-stone-400 hover:bg-stone-800/60"}`}
                        >
                          {o.name}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-amber-400 mt-2">
                      Turnout with this lead: {projection.lo === projection.hi ? `~${projection.lo}` : `${projection.lo}\u2013${projection.hi}`} of {workers.length}.
                      {unread > 0 && <span className="text-stone-500"> The range is that wide because {unread} {unread === 1 ? "person hasn't" : "people haven't"} been
                        sat down with or seen at an action recently. Running it is how you find out.</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* HOURS */}
              <div className="border-2 border-stone-800 bg-stone-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-stencil text-lg tracking-wide text-stone-200">PLAN MONTH {turn}</div>
                  <div className={`text-base font-bold ${overBudget ? "text-red-500" : totalUsed === totalHours ? "text-teal-400" : "text-amber-400"}`}>{totalUsed} / {totalHours} HOURS</div>
                </div>
                <p className="text-xs text-stone-500 mb-3">
                  Click anyone on the board for a one-on-one, or to bring them onto the action team. Each person has {CAT_HOURS} hours of their own;
                  the action's prep comes out of the team's pool{actionHours > 0 ? ` (${actionHours}h this month)` : ""}.
                </p>
                <div className="space-y-2 mb-3">
                  {cat.map(o => {
                    const mine = planEntries.filter(e => e.actorId === o.id);
                    const leading = actionPlan?.leadId === o.id ? ACTION_LADDER.find(t => t.key === actionPlan.tierKey) : null;
                    const left = hoursLeft(o);
                    return (
                      <div key={o.id} className={`border px-3 py-2 ${left < 0 ? "border-red-700 bg-red-950/20" : "border-stone-700"}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-amber-400">{o.name} <span className="text-stone-500 font-normal">({TEAM_LABEL[o.team]})</span></span>
                          <span className={`text-xs font-bold ${left < 0 ? "text-red-400" : left === 0 ? "text-teal-400" : "text-stone-400"}`}>{left} of {catHours(o)} hrs left</span>
                        </div>
                        {leading && <div className="text-xs text-amber-300 mt-1">▸ Leads: {leading.label} <span className="text-stone-600">(team prep, {leading.hours}h from the pool)</span></div>}
                        {mine.map(e => (
                          <div key={e.key} className="flex items-center justify-between text-xs text-stone-300 mt-0.5">
                            <span>▸ {e.type === "oneOnOne" ? "One-on-one" : "Bring onto the action team"} — {workers.find(x => x.id === e.targetId)?.name} <span className="text-stone-600">({e.type === "oneOnOne" ? 2 : 3}h)</span></span>
                            <button onClick={() => setPlanEntries(p => p.filter(x => x.key !== e.key))} className="text-stone-600 hover:text-red-400">✕</button>
                          </div>
                        ))}
                        {!leading && mine.length === 0 && <div className="text-xs text-stone-600 italic mt-1">Idle this month.</div>}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={resolveTurn}
                  disabled={!canResolve || overBudget}
                  className={`w-full font-stencil text-lg py-2.5 tracking-wide transition-colors ${!canResolve || overBudget ? "bg-stone-800 text-stone-600 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-400 text-stone-950"}`}
                >
                  {overBudget ? "OVER BUDGET" : canResolve ? `RESOLVE MONTH ${turn}` : "PLAN SOMETHING FIRST"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {selected && phase === "plan" && (() => {
        const w = workers.find(x => x.id === selected.id);
        const backing = catBacking(influence, workers, w.id);
        const actors = cat.filter(o => o.id !== w.id);
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={() => setSelected(null)}>
            <div className="bg-stone-900 border-2 border-stone-700 max-w-md w-full p-5 my-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-stencil text-2xl text-amber-400">{w.name}</div>
                <button onClick={() => setSelected(null)}><X size={18} className="text-stone-500 hover:text-stone-200" /></button>
              </div>
              <p className="text-sm text-stone-400 mb-3">{w.hook}</p>
              {(() => {
                const r = contractRead(w, turn);
                return (
                  <StatRow label="COMMITMENT" value={r.exact ? r.mid : `${r.lo}\u2013${r.hi}`} hex={supportTier(r.mid).hex} align="left"
                    info="Whether this person will actually do something — not whether they support the union. They already voted yes; commitment is what turns that into showing up. You only get a number for somebody you have sat down with recently, or who turned out at the last action. Everyone else is a range, and it widens."
                    sub={r.exact ? "Read is current." : `Nobody has sat down with them or seen them turn out in ${r.age} months. This is an estimate.`} />
                );
              })()}
              <StatRow label="JOB FULFILLMENT" value={w.fulfillment} hex={FULFILL_HEX} align="left"
                info="Still decides who can move them. It also decides how far they'll go: somebody who loves this job will sign a letter but won't hold a milestone hostage."
                sub={`${fulfillmentLabel(w.fulfillment)} — expect them at the low rungs, not the high ones.`} />
              <div className="text-xs text-stone-400 border-t border-stone-800 pt-2 mb-3">
                {backing} points of influence on them comes from the action team. That's what pulls them out on the day.
              </div>
              <div className="text-xs text-stone-500 tracking-wide mb-1">TURNOUT ODDS</div>
              <div className="grid grid-cols-2 gap-1 mb-3">
                {ACTION_LADDER.map(t => (
                  <div key={t.key} className="text-xs text-stone-400 border border-stone-800 px-2 py-1">
                    {t.label}: <span className="text-stone-200 font-bold">{(() => {
                      const r = contractRead(w, turn);
                      const lo = Math.round(participationChance({ ...w, commitment: r.lo }, t, backing) * 100);
                      const hi = Math.round(participationChance({ ...w, commitment: r.hi }, t, backing) * 100);
                      return lo === hi ? `${lo}%` : `${lo}\u2013${hi}%`;
                    })()}</span>
                  </div>
                ))}
              </div>
              {w.cat ? (
                <div className="text-sm text-amber-400">Already on the contract action team.</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-stone-500 tracking-wide">WHO DOES IT</div>
                  <div className="flex flex-wrap gap-1.5">
                    {actors.map(o => (
                      <button key={o.id} onClick={() => { addPlan(o.id, "oneOnOne", w.id); setSelected(null); }}
                        disabled={hoursLeft(o) < 2 || poolLeft < 2}
                        className={`border px-2 py-1 text-[13px] transition-colors ${hoursLeft(o) < 2 || poolLeft < 2 ? "border-stone-800 text-stone-700 cursor-not-allowed" : "border-stone-700 text-stone-300 hover:bg-stone-800/60"}`}>
                        {o.name} <span className="text-stone-600">· inf {infOn(influence, o.id, w.id)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-stone-500">Click a name to spend 2 of their hours on a one-on-one.</div>
                  <button
                    onClick={() => { const o = actors.find(x => hoursLeft(x) >= 3); if (o) { addPlan(o.id, "recruit", w.id); setSelected(null); } }}
                    disabled={w.commitment < CAT_JOIN_REQ || !actors.some(x => hoursLeft(x) >= 3) || poolLeft < 3}
                    className={`w-full text-left border-2 px-3 py-2 transition-colors ${w.commitment >= CAT_JOIN_REQ && actors.some(x => hoursLeft(x) >= 3) && poolLeft >= 3 ? "border-amber-700 hover:bg-amber-950/30" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                  >
                    <div className="text-sm text-amber-300">Bring onto the contract action team <span className="text-stone-500">3h</span></div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {w.commitment < CAT_JOIN_REQ
                        ? `Needs ${CAT_JOIN_REQ} commitment — they're at ${w.commitment}.`
                        : `+${CAT_HOURS} hours a month, and everyone they can turn out becomes yours.`}
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="fixed bottom-2 right-2 z-40">
        <button onClick={onExit} className="text-xs text-stone-600 hover:text-stone-400 underline transition-colors">
          {carry ? "Start over from the shop floor" : "Leave the prototype"}
        </button>
      </div>
    </div>
  );
}

// =====================================================================================
// TOP-LEVEL WRAPPER — Act 1 (one shop) graduates into Act 2 (the citywide campaign)
// =====================================================================================

const ACT1_SAVE_KEY = "act1-progress";
// v2 saves the whole floor, not four names, because the first-contract act now runs on
// it. A v1 save (leaders only) still loads — it just cannot carry a map that was never
// written down, so it resumes at the company campaign rather than the contract.
const SAVE_VERSION = 2;

export default function PermadeathOrganizing() {
  // One shop, then its first contract, then the rest of the company. Each act hands the
  // next one the state it earned; nothing in the chain is rolled twice.
  const [act, setAct] = useState("loading"); // loading, choice, shop, contract, company
  const [act1, setAct1] = useState(null);       // { leaders, workers, influence, week }
  const [contract, setContract] = useState(null); // { leaders, tiers, max, ratified, survived }
  const [savedRun, setSavedRun] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACT1_SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const run = parsed && parsed.v === SAVE_VERSION
          ? parsed
          // A save from before the acts were reordered: names only, no floor to carry.
          : (parsed && Array.isArray(parsed.leaders) ? { v: 1, act1: { leaders: parsed.leaders }, contract: null } : null);
        if (run && run.act1 && Array.isArray(run.act1.leaders)) {
          setSavedRun(run);
          setAct("choice");
          return;
        }
      }
    } catch (e) {
      // no prior save, or storage unavailable — just start fresh
    }
    setAct("shop");
  }, []);

  function persist(next) {
    try {
      localStorage.setItem(ACT1_SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, ...next }));
    } catch (e) {
      // persistence is a convenience, not a requirement — the run continues either way
    }
  }

  // Act One is done. The floor it built goes straight into the contract fight.
  function handleGraduate(payload, save = true) {
    setAct1(payload);
    setContract(null);
    if (save) persist({ act1: payload, contract: null });
    setAct("contract");
  }

  // The contract fight is done. Whoever is left on the action team goes company-wide.
  function handleContractDone(result) {
    setContract(result);
    if (act1) persist({ act1, contract: result });
    setAct("company");
  }

  function handleFullRestart() {
    setAct1(null);
    setContract(null);
    try { localStorage.removeItem(ACT1_SAVE_KEY); } catch (e) { /* nothing saved, or storage unavailable */ }
    setSavedRun(null);
    setAct("shop");
  }

  // Leaders reaching the company campaign come off the contract action team when there
  // was one, and off the Act One committee when the save predates the contract act.
  const companyLeaders = contract?.leaders?.length ? contract.leaders : (act1?.leaders || []);

  let content;
  if (act === "loading") {
    content = <div className="min-h-screen bg-stone-950" />;
  } else if (act === "choice") {
    const hasContract = !!savedRun.contract;
    const hasFloor = Array.isArray(savedRun.act1?.workers);
    const names = (savedRun.contract?.leaders || savedRun.act1.leaders).map(l => l.name).join(", ");
    content = (
      <div className="min-h-screen bg-stone-950 text-stone-200 font-mono flex items-center justify-center px-6">
        <GlobalStyle />
        <div className="max-w-md text-center anim-rise">
          <div className="font-stencil text-4xl text-amber-400 mb-4">WELCOME BACK</div>
          <p className="text-stone-400 text-base leading-relaxed mb-6">
            {hasContract
              ? <>You organized the shop and bargained its first contract — <span className="text-stone-200 font-bold">{savedRun.contract.tiers} of {savedRun.contract.max}</span> tiers{savedRun.contract.ratified ? ", ratified" : ", never signed"}. {names} came through it with you.</>
              : <>You've already organized this shop, with {savedRun.act1.leaders.length} leader{savedRun.act1.leaders.length === 1 ? "" : "s"} who stepped up: {names}.</>}
          </p>
          <button
            onClick={() => {
              setAct1(savedRun.act1);
              setContract(savedRun.contract || null);
              // A v1 save has no floor to bargain on, so it can only rejoin at the company.
              setAct(hasContract || !hasFloor ? "company" : "contract");
            }}
            className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors block w-full mb-3"
          >
            {hasContract || !hasFloor ? "SKIP TO THE COMPANY CAMPAIGN" : "GO BARGAIN THE CONTRACT"}
          </button>
          {hasContract && hasFloor && (
            <button
              onClick={() => { setAct1(savedRun.act1); setContract(null); setAct("contract"); }}
              className="text-sm text-stone-500 hover:text-stone-300 underline block w-full mb-2"
            >
              Bargain that first contract again instead
            </button>
          )}
          <button onClick={handleFullRestart} className="text-sm text-stone-500 hover:text-stone-300 underline">
            Replay One Shop from the start instead
          </button>
        </div>
      </div>
    );
  } else if (act === "contract") {
    content = (
      <ContractPrototype
        carry={act1 && act1.workers ? { workers: act1.workers, influence: act1.influence } : null}
        onComplete={handleContractDone}
        onExit={handleFullRestart}
      />
    );
  } else if (act === "shop") {
    content = (
      <ActOneGame
        onGraduate={handleGraduate}
        onSkipToCompany={() => { setContract(null); setAct("company"); }}
      />
    );
  } else {
    content = <ActTwoGame recruitedLeaders={companyLeaders} contract={contract} onFullRestart={handleFullRestart} />;
  }

  return (
    <div>
      {content}
      <div className="text-center text-sm text-stone-600 py-4">
        A <a href="https://permadeathmedia.com" target="_blank" rel="noopener noreferrer" className="hover:text-stone-400 transition-colors">Permadeath Studio</a> game
      </div>
    </div>
  );
}
