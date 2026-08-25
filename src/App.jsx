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
const START_LOCATIONS = [
  { id: "downtown", name: "CORE STUDIO", workers: 12, manager: "hostile", morale: 40, trueSupport: 32, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
  { id: "suburban", name: "QA DIVISION", workers: 10, manager: "sympathetic", morale: 40, trueSupport: 34, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
  { id: "airport", name: "PUBLISHING WING", workers: 9, manager: "neutral", morale: 40, trueSupport: 33, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
  { id: "university", name: "REMOTE TEAM", workers: 8, manager: "neutral", morale: 40, trueSupport: 33, visibility: 5, recruited: 0, legalRisk: 0, fear: 0, status: "organizing", abandonedTurns: 0, electionTurn: null, grievance: null, antiUnion: { active: false, turnsLeft: 0 }, buyOff: { active: false, turnsLeft: 0 }, committee: { active: false, strikes: 0 } },
];

const COMMITTEE_COST = 3;
const COMMITTEE_MORALE_REQ = 55;
const COMMITTEE_RECRUIT_PCT_REQ = 0.4;

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
  { units: 0, label: "Hold back this week", cost: 0, desc: "Let this site rest — no organizer time spent here. Counts toward recovering stamina." },
  { units: 1, label: "Check in briefly", cost: 1, desc: "A quick pulse-check with a few workers." },
  { units: 2, label: "Have real conversations", cost: 2, desc: "Deeper one-on-ones, building trust and momentum." },
  { units: 4, label: "Run a full organizing push", cost: 4, desc: "A serious block of organizer time here this week." },
  { units: 6, label: "Go all-in here", cost: 6, desc: "Everything the organizer can give to this site this week." },
];

const ACT2_CAMPAIGN_TIERS = [
  { units: 0, label: "Hold back this week", cost: 0, desc: "Skip it — fear creeps up and morale slips on its own." },
  { units: 1, label: "Light presence", cost: 1, desc: "A quick show of support against the employer's counter-campaign." },
  { units: 2, label: "Active campaigning", cost: 2, desc: "Real pushback against management's messaging." },
  { units: 4, label: "Full doorknock push", cost: 4, desc: "A serious week of countering the counter-campaign." },
  { units: 6, label: "All-in for the vote", cost: 6, desc: "Everything the organizer has, fighting for this election." },
];

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const rand = (n) => Math.floor(Math.random() * n);

// ---------- BLOCS AND THE DEMAND PLATFORM ----------
// You cannot make everyone happy. Winning recognition is a unifying fight \u2014 everybody
// wants A union. Deciding what the union will ASK FOR is where a shop fractures, because
// bargaining capital is finite and every demand you win trades against one you didn't.
//
// The blocs deliberately CROSS-CUT the org chart. If they were just departments the
// problem would be one-dimensional and solvable with arithmetic. Because status and
// tenure run at right angles to each other, a platform that splits salaried from
// contract may unite QA across tenure \u2014 and navigating that is the actual game.
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

// The pool. Two pairs are genuinely opposed \u2014 there is no compromise between them that
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
// enthusiasm \u2014 you promised them next time, and they have heard that before.
function blocSatisfaction(blocId, platform, priorities) {
  const pr = priorities[blocId] || { intensity: 2, top: null, pledged: false };
  let score = 50;
  platform.forEach(id => {
    const d = DEMAND_BY_ID[id];
    if (d) score += (d.effect[blocId] || 0) * 6;
  });
  const served = pr.top && platform.includes(pr.top);
  if (served) score += pr.intensity * 8;
  else score -= pr.intensity * 6 * (pr.pledged ? 0.45 : 1);
  if (pr.heard) score += Math.min(8, pr.heard * 5); // being listened to counts for something
  return clamp(Math.round(score));
}

// How the platform lands at one specific shop, given who works there. A defected bloc
// contributes nothing and drags: they aren't neutral, they're campaigning against you.
function locBlocFactor(loc, platform, priorities) {
  const comp = LOC_COMPOSITION[loc.id];
  if (!comp || !platform.length) return 1;
  let total = 0, weight = 0;
  BLOCS.forEach(b => {
    const share = comp[b.id] || 0;
    if (share <= 0) return;
    const pr = priorities[b.id];
    const sat = pr?.defected ? 0 : blocSatisfaction(b.id, platform, priorities);
    // 0 satisfaction -> 0.70x turnout, 50 -> 1.00x, 100 -> 1.30x. Deliberately gentle:
    // the platform should tilt an election, not decide it on its own.
    total += share * (0.7 + 0.6 * (sat / 100));
    weight += share;
  });
  return clamp(weight ? total / weight : 1, 0.55, 1.3);
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

function ActTwoGame({ recruitedLeaders = [], onFullRestart }) {
  const teamStaminaBonus = recruitedLeaders.length * 15;
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
  const [locations, setLocations] = useState(START_LOCATIONS.map(l => ({ ...l })));
  const [allocations, setAllocations] = useState({ downtown: 0, suburban: 0, airport: 0, university: 0 });
  const [responses, setResponses] = useState({ downtown: {}, suburban: {}, airport: {}, university: {} });
  const [organizer, setOrganizer] = useState({ stamina: 100 + teamStaminaBonus, breaksTaken: 0, onBreak: 0 });
  // The demand platform is set once, company-wide, the first time you file. Bloc
  // priorities are rolled at the start and stay hidden until somebody listens.
  const [platform, setPlatform] = useState([]);
  const [blocPriorities, setBlocPriorities] = useState(() => rollBlocPriorities());
  const [pendingFileLoc, setPendingFileLoc] = useState(null);
  const [moraleClimate, setMoraleClimate] = useState({ tone: "neutral", turnsLeft: 0 });
  const [legalClimate, setLegalClimate] = useState({ tone: "neutral", turnsLeft: 0 });
  const [employerSophistication, setEmployerSophistication] = useState(0); // 0-3, rises when firing fails to crush a location
  const [employerEmboldened, setEmployerEmboldened] = useState(false);
  const [escalationTarget, setEscalationTarget] = useState(null);
  // Last site the escalation prompt showed — lets it round-robin through every ready
  // site turn to turn instead of always re-picking the first one in array order.
  const [lastEscalationId, setLastEscalationId] = useState(null);
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
    if (r.formCommittee) cost += COMMITTEE_COST;
    if (r.bargain) cost += 2;
    return cost;
  }

  const totalResponseCost = locations.reduce((sum, l) => sum + responseCostFor(l, responses[l.id]), 0);
  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0) + totalResponseCost;

  function updateAlloc(id, val) {
    val = Math.max(0, Math.min(10, val));
    setAllocations(prev => ({ ...prev, [id]: val }));
  }

  function toggleResponse(id, key) {
    setResponses(prev => ({ ...prev, [id]: { ...prev[id], [key]: !prev[id]?.[key] } }));
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
      steps.push({ label: "NATIONAL NEWS", sub: "Something outside the studio is shaping the week.", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: [firedEvent.headline] });
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

      if (l.status === "campaign") {
        // Election campaign turn: employer counter-campaign automatically fires
        const employerHit = 3 + rand(3); // -3 to -5
        const committeeDefense = l.committee?.active ? 2 : 0;
        const defense = Math.min(employerHit, Math.floor(units * 1.2) + committeeDefense);
        let moraleDelta = -(employerHit - defense);
        let fearDelta = 8 - Math.floor(units * 1.5) - (l.committee?.active ? 2 : 0);
        fearDelta = Math.max(-8, fearDelta);
        if (moraleClimateNext.tone === "positive") { moraleDelta += 2; fearDelta -= 2; }
        else if (moraleClimateNext.tone === "negative") { moraleDelta -= 2; fearDelta += 2; }
        else if (moraleClimateNext.tone === "volatile") { fearDelta += 1; }
        if (firedEvent && firedEvent.immediateCampaignFear) fearDelta += firedEvent.immediateCampaignFear;
        if (firedEvent && firedEvent.immediateOrganizingMorale) moraleDelta += Math.round(firedEvent.immediateOrganizingMorale / 2);
        const newMorale = clamp(l.morale + moraleDelta);
        const newFear = clamp(l.fear + fearDelta);
        const trueSupportDelta = Math.round(moraleDelta * 0.5) + (l.committee?.active ? 1 : 0);
        const newTrueSupport = clamp((l.trueSupport ?? l.morale) + trueSupportDelta);
        const turnsLeft = l.electionTurn - turn;
        return { ...l, morale: newMorale, trueSupport: newTrueSupport, fear: newFear, _campaignNote: `Employer pressure this week: ${moraleDelta >= 0 ? "+" : ""}${moraleDelta} morale. ${turnsLeft <= 0 ? "Election is today." : `${turnsLeft} turn(s) until the vote.`}` };
      }

      // Normal organizing location
      const r = responses[l.id] || {};
      const feedbackLines = [];

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
      const committeeEligible = !newCommittee.active && l.morale >= COMMITTEE_MORALE_REQ && recruitedPctNow >= COMMITTEE_RECRUIT_PCT_REQ;
      if (r.formCommittee && committeeEligible) {
        newCommittee = { active: true, strikes: 0 };
        feedbackLines.push(`${l.name}: Workers form a shop committee. Organizing here no longer depends entirely on the outside organizer.`);
      }
      const committeeMoraleBonus = newCommittee.active ? (locHasTrait(l.id, "committee") ? 5 : 3) : 0;
      const committeeSupportBonus = newCommittee.active ? (locHasTrait(l.id, "committee") ? 4 : 2) : 0;
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

      let moraleGain = gain + recruitedBonus - momentumPenalty + grievanceBonus - antiUnionPenalty + antiUnionCounterBonus + climateGain + eventMoraleBurst + committeeMoraleBonus;
      let newMorale = clamp(l.morale + moraleGain);

      // Recruitment growth (computed here so true support can reference it below)
      let recruitGain = units > 0 ? Math.round(units * 0.35) : 0;
      let newRecruited = Math.min(l.workers, l.recruited + recruitGain + grievanceRecruitBonus);

      // --- True support: the hidden number that actually decides elections. Moves slower and more skeptically than morale. ---
      // "Soft" organizing (conversation, mood, national mood swings) only partially converts into durable commitment.
      const softPortion = gain + climateGain + eventMoraleBurst;
      let trueSupportGain = Math.round(softPortion * 0.35)
        + recruitGain * 1.4
        + grievanceSupportBonus
        - antiUnionPenalty * 1.3
        - momentumPenalty
        + committeeSupportBonus
        - (buyOffWasActive && !r.reframe ? 3 : 0);
      let newTrueSupport = clamp(l.trueSupport + trueSupportGain);

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
    const feedbackLines = workingLocs.filter(l => l.status === "organizing").flatMap(l => l._feedbackLines || []);
    steps.push({ label: "MORALE & VISIBILITY", sub: "Resolving organizing activity across sites...", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: [...allocLines, ...feedbackLines] });

    // Retaliation checks — an employer that's learned from past failures reaches for subtler tools
    let retaliationLines = [];
    let sophisticationGain = 0;
    workingLocs = workingLocs.map(l => {
      if (l.status !== "organizing") return l;

      // Did a past firing here fail to actually stop organizing? If so, the employer takes note.
      let updated = { ...l };
      if (l._watchRecovery && l.morale >= l._watchFloor) {
        sophisticationGain = 1;
        retaliationLines.push(`Corporate notices firing didn't shut ${l.name} down. Expect subtler tactics company-wide from here.`);
        updated._watchRecovery = false;
      }

      if (l.visibility >= 60) {
        const forceRetaliate = l.visibility >= 90;
        const roll = roll100();
        const retaliateThreshold = legalClimateNext.tone === "hostile" ? 65 : legalClimateNext.tone === "favorable" ? 35 : 50;
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
              ? `${l.name}: Management targets a known committee member. They're moved off the flagship project and put on a PIP the same week.`
              : `${l.name}: A suspected organizer is put on a performance improvement plan. No one in the room thinks it's about performance.`;
          } else if (typeRoll < buyOffChance + fireChance + 30) {
            moraleHit = 10; visHit = 0; legalHit = 5;
            note = `${l.name}: A town hall is scheduled to talk about 'direct feedback channels' and 'working better together.' Attendance is not optional.`;
          } else {
            moraleHit = 5; visHit = -10; legalHit = 8;
            note = `${l.name}: Calendar invites to key planning meetings stop going to suspected organizers. Repo access quietly changes.`;
          }

          retaliationLines.push(note);
          updated.morale = clamp(updated.morale - moraleHit);
          updated.trueSupport = clamp((updated.trueSupport ?? updated.morale) - Math.round(moraleHit * 0.8));
          updated.visibility = clamp(updated.visibility + visHit);
          updated.legalRisk = clamp(updated.legalRisk + legalHit);
          updated._retaliatedLastTurn = true;

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
          if (moraleHit >= 20 && !targetCommittee) {
            // ordinary firing: start watching whether organizing recovers anyway
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
        solidarityLines.push(`Momentum from ${turnSolidarityScore >= 4 ? "several strong sites" : "elsewhere in the company"} gives every active site a lift this week (+${moraleTrickle} morale, +${supportTrickle} true support).`);
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

    let staminaNote = isBreakTurn ? "Organizer is resting." : `Organizer stamina change this week.`;
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
      if (onBreak === 0) orgStamina = 80;
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
    if (bargainLines.length) steps.push({ label: "OPEN BARGAINING", sub: "You cannot write a platform for people you have not asked.", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: bargainLines });

    // --- THE SIDE OFFER ---
    // He reads your platform and goes straight to whoever you left out. Whether they
    // take it depends on their hidden intensity, which you can only have learned by
    // listening \u2014 and on whether that bloc has a shop committee anywhere it is thick,
    // because a bloc with representation has somewhere to take the offer and argue.
    const blocLines = [];
    if (platform.length >= PLATFORM_SLOTS) {
      const unserved = BLOCS
        .map(b => ({ b, sat: blocSatisfaction(b.id, platform, prioritiesNext), pr: prioritiesNext[b.id] }))
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
        // The platform decides who actually turns out. A shop full of a bloc you
        // ignored votes at a fraction of its paper strength.
        const factor = locBlocFactor(l, platform, blocPriorities);
        const support = clamp(Math.round(raw * factor));
        const winChance = (support / 100) * 0.6 + ((100 - l.fear) / 100) * 0.4;
        const roll = Math.random();
        const gapWarning = l.morale - support >= 15 ? " Turnout looked stronger on paper than it was in the room." : "";
        if (roll <= winChance) {
          electionLines.push(`${l.name}: ELECTION WON. Workers vote to unionize. (True win probability was ${Math.round(winChance * 100)}%; the platform moved turnout ${factor >= 1 ? "+" : ""}${Math.round((factor - 1) * 100)}%, ${raw} \u2192 ${support} effective support.)${gapWarning}`);
          return { ...l, status: "won", morale: 95, trueSupport: 95, legalRisk: 0 };
        } else {
          electionLines.push(`${l.name}: ELECTION LOST. The vote came back NO. (True win probability was ${Math.round(winChance * 100)}%; the platform moved turnout ${factor >= 1 ? "+" : ""}${Math.round((factor - 1) * 100)}%, ${raw} \u2192 ${support} effective support.)${factor < 0.92 ? " The people you didn't write into the platform stayed home." : ""}${gapWarning}`);
          return { ...l, status: "lost", morale: 20, trueSupport: 20, fear: 90, abandonedTurns: 99 };
        }
      }
      return l;
    });

    if (electionLines.length) {
      // A loss is still an immediate gut-punch; a win's ongoing upside now comes from the
      // solidarity network above, which keeps paying out every week instead of a single jolt.
      const lost = workingLocs.some(l => l.status === "lost" && electionLines.some(s => s.startsWith(l.name)));
      if (lost) {
        workingLocs = workingLocs.map(l => {
          if (l.status !== "organizing") return l;
          return { ...l, morale: clamp(l.morale - 15), trueSupport: clamp((l.trueSupport ?? l.morale) - 8) };
        });
        setEmployerEmboldened(true);
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
    // Don't make anyone play out a campaign that arithmetic has already decided.
    const winnable = act2Winnability(workingLocs, turn);
    if (!winnable.alive) {
      setDeadReason(winnable.reason);
      setPhase("gameover-loss");
      return;
    }

    // Round-robin through every ready site instead of always re-picking the first one
    // in array order — advance past whichever site was shown last time.
    const readyLocs = workingLocs.filter(l => l.status === "organizing" && l.morale >= 70);
    let escalationReady = null;
    if (readyLocs.length) {
      const lastIdx = readyLocs.findIndex(l => l.id === lastEscalationId);
      escalationReady = readyLocs[(lastIdx + 1) % readyLocs.length];
    }
    setTurn(t => t + 1);
    if (escalationReady) {
      setEscalationTarget(escalationReady.id);
      setLastEscalationId(escalationReady.id);
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
      setPhase("platform");
      return;
    }
    commitFiling(locId);
  }
  function commitFiling(locId) {
    setLocations(prev => prev.map(l => {
      if (l.id !== locId) return l;
      const recruitedPct = l.recruited / l.workers;
      const eligible = l.morale >= 70 && recruitedPct >= 0.3 && l.legalRisk < 75;
      if (!eligible) return l; // guarded in UI, shouldn't happen
      return { ...l, status: "campaign", electionTurn: turn + 5, fear: 35 + rand(15) };
    }));
    setEscalationTarget(null);
    setPendingFileLoc(null);
    setPhase("allocate");
  }
  function adoptPlatform(chosen) {
    setPlatform(chosen);
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
    setLocations(START_LOCATIONS.map(l => ({ ...l })));
    setAllocations({ downtown: 0, suburban: 0, airport: 0, university: 0 });
    setResponses({ downtown: {}, suburban: {}, airport: {}, university: {} });
    setOrganizer({ stamina: 100 + teamStaminaBonus, breaksTaken: 0, onBreak: 0 });
    setMoraleClimate({ tone: "neutral", turnsLeft: 0 });
    setLegalClimate({ tone: "neutral", turnsLeft: 0 });
    setEmployerSophistication(0);
    setEmployerEmboldened(false);
    setEscalationTarget(null);
    setLastEscalationId(null);
    setLeaderDeployment({});
    setArmedLeader(null);
    setPhase("allocate");
  }

  const remaining = 10 - totalAllocated;
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
              <div className="text-stone-500 text-xs">WEEK</div>
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
              Win union elections at <span className="text-teal-400 font-bold">{ACT2_SITES_NEEDED} of {locations.length}</span> shops within {TOTAL_TURNS} weeks.
            </span>
            <span className="text-stone-400">
              <span className="text-stone-500">A SHOP VOTES YES ON</span>{" "}
              true support — not morale. Above <span className="text-teal-400 font-bold">70</span> is comfortable; below <span className="text-amber-400 font-bold">50</span> is a coin flip that fear decides.
            </span>
            <span className={win.alive ? "text-stone-400" : "text-red-400 font-bold"}>
              <span className="text-stone-500">WEEKS LEFT</span>{" "}
              <span className="font-bold">{Math.max(0, TOTAL_TURNS - turn)}</span>
              {atVote.length > 0 && <span className="text-amber-400"> — {atVote.length} shop{atVote.length === 1 ? "" : "s"} already at the vote</span>}
            </span>
            {!win.alive && <span className="text-red-400 font-bold">NO LONGER WINNABLE</span>}
          </div>
        );
      })()}

      {phase === "platform" && (
        <PlatformModal
          priorities={blocPriorities}
          locations={locations}
          onPledge={(blocId) => setBlocPriorities(pr => ({ ...pr, [blocId]: { ...pr[blocId], pledged: true } }))}
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
            const v = pr.defected ? 0 : blocSatisfaction(b.id, platform, blocPriorities);
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
          beats={act2IntroBeats(recruitedLeaders)}
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
          {moraleClimate.turnsLeft > 0 && (
            <div className={`mb-4 flex items-center gap-2 text-sm border px-3 py-2 ${moraleClimate.tone === "positive" ? "text-teal-400 border-teal-900 bg-teal-950/30" : moraleClimate.tone === "negative" ? "text-red-400 border-red-900 bg-red-950/40" : "text-amber-400 border-amber-900 bg-amber-950/30"}`}>
              <Radio size={14} /> National mood {moraleClimate.tone === "positive" ? "is energizing organizing everywhere" : moraleClimate.tone === "negative" ? "has knocked morale down everywhere" : "has workers both angrier and more anxious"} ({moraleClimate.turnsLeft} week{moraleClimate.turnsLeft === 1 ? "" : "s"} left).
            </div>
          )}
          {legalClimate.turnsLeft > 0 && (
            <div className={`mb-4 flex items-center gap-2 text-sm border px-3 py-2 ${legalClimate.tone === "favorable" ? "text-teal-400 border-teal-900 bg-teal-950/30" : "text-red-400 border-red-900 bg-red-950/40"}`}>
              <Scale size={14} /> Legal climate is currently {legalClimate.tone} — {legalClimate.tone === "favorable" ? "unfair labor practices are easier to prove and retaliation is less likely" : "employers are emboldened and retaliation is more likely"} ({legalClimate.turnsLeft} week{legalClimate.turnsLeft === 1 ? "" : "s"} left).
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
            onSelect={(loc) => { if (armedLeader != null) { deployArmedTo(loc.id); return; } setSelectedLoc(loc); }}
          />

          <div className="border-2 border-stone-800 bg-stone-900 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="font-stencil text-lg tracking-wide text-stone-200">ALLOCATE ORGANIZER TIME</div>
              <div className="flex items-center gap-2 flex-wrap">
                <HourPie
                  left={Math.max(0, remaining)}
                  total={10}
                  hex={remaining < 0 ? "#f87171" : remaining === 0 ? "#2dd4bf" : "#fbbf24"}
                  size={22}
                  label={`${Math.max(0, remaining)} of 10 actions left this week`}
                />
                <span className={`text-xs font-bold ${remaining < 0 ? "text-red-500" : remaining === 0 ? "text-teal-400" : "text-stone-500"}`}>
                  {remaining < 0 ? `${Math.abs(remaining)} OVER` : remaining === 0 ? "ALL SPENT" : `${remaining} LEFT`}
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-500 mb-3">Click a location above to choose what the organizer does there this week. Tap it again to change the plan. Unassigned actions count as rest — they help the organizer recover stamina but do nothing for the campaign.</p>
            <button
              onClick={resolveTurn}
              disabled={totalAllocated > 10}
              className={`w-full font-stencil text-lg py-2.5 tracking-wide transition-colors ${totalAllocated > 10 ? "bg-stone-800 text-stone-600 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-400 text-stone-950"}`}
            >
              {totalAllocated > 10 ? "OVER BUDGET — REDUCE ALLOCATION" : `RESOLVE WEEK ${turn}`}
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
          onFile={() => fileForElection(escLoc.id)}
          onConsolidate={consolidate}
          onPivot={() => pivotAway(escLoc.id)}
        />
      )}

      {/* GAME OVER */}
      {(phase === "gameover-win" || phase === "gameover-loss") && (
        <div className="max-w-xl mx-auto px-6 py-20 text-center anim-rise">
          <div className={`font-stencil text-5xl mb-4 ${phase === "gameover-win" ? "text-teal-400" : "text-red-500"}`}>
            {phase === "gameover-win" ? "CONTRACT WON" : "CAMPAIGN OVER"}
          </div>
          <p className="text-stone-400 mb-6 leading-relaxed">
            {phase === "gameover-win"
              ? `Two or more studios voted to unionize. Workers have a contract to negotiate — and leverage they didn't have twelve weeks ago.`
              : organizer.breaksTaken >= 2
                ? `The organizer burned out for a second time and left the campaign. There was no one left to carry it forward.`
                : deadReason
                  ? deadReason
                  : `Twelve weeks came and went without enough studios reaching a contract. The campaign didn't build the power it needed in time.`}
          </p>
          {phase === "gameover-loss" && deadReason && turn < TOTAL_TURNS && (
            <p className="text-red-400/80 text-sm mb-6 leading-relaxed border border-red-900/60 bg-red-950/20 px-4 py-3">
              Called at week {turn} of {TOTAL_TURNS}. There were weeks left on the clock, but not enough shops left to reach {ACT2_SITES_NEEDED}
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
          onSetUnits={(units) => updateAlloc(selectedLoc.id, units)}
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
const ELECTION_LEAD_TURNS = 2; // filing, then the vote
function act2Winnability(locations, turn) {
  const won = locations.filter(l => l.status === "won").length;
  const needed = ACT2_SITES_NEEDED - won;
  if (needed <= 0) return { alive: true, won, needed: 0, salvageable: [], reason: null };
  const turnsLeft = TOTAL_TURNS - turn;
  // A site can still deliver if it's already at the vote, or has room to file and vote.
  const salvageable = locations.filter(l => {
    if (l.status === "won" || l.status === "lost") return false;
    if (l.status === "campaign") return l.electionTurn <= TOTAL_TURNS;
    return turnsLeft >= ELECTION_LEAD_TURNS;
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
        ? `${blockedByClock} shop${blockedByClock === 1 ? " is" : "s are"} still organizing, but none can file and reach a vote before week ${TOTAL_TURNS}. You needed ${needed} more.`
        : `${dead} election${dead === 1 ? " has" : "s have"} already come back NO. There aren't enough shops left standing to reach ${ACT2_SITES_NEEDED}.`,
    };
  }
  return { alive: true, won, needed, salvageable, reason: null };
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
  const inCrackdownBand = loc.visibility >= 40 && loc.visibility < 60;
  const recruitedPct = loc.recruited / loc.workers;
  const committeeEligible = !loc.committee?.active && loc.morale >= COMMITTEE_MORALE_REQ && recruitedPct >= COMMITTEE_RECRUIT_PCT_REQ;
  const bargainable = priorities && BLOCS.some(b => (LOC_COMPOSITION[loc.id]?.[b.id] || 0) >= 0.5 && !priorities[b.id]?.known);
  const hasAny = loc.grievance || inCrackdownBand || loc.antiUnion?.active || loc.buyOff?.active || committeeEligible || bargainable;
  if (!hasAny) return null;

  return (
    <div className="mt-2 space-y-1.5 border-t border-stone-800 pt-2">
      {loc.grievance && (() => {
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
          <span className="flex-1"><span className="font-bold">Management is watching closer.</span> Document it</span><CostPips hours={1} />
        </label>
      )}
      {loc.antiUnion?.active && (
        <label className="flex items-center gap-2 text-xs border border-red-800 text-red-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.counter} onChange={() => onToggle("counter")} className="accent-amber-500" />
          <Megaphone size={12} />
          <span className="flex-1"><span className="font-bold">Anti-union talk is spreading.</span> Counter-message</span><CostPips hours={1} />
        </label>
      )}
      {loc.buyOff?.active && (
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
              Sit down and hear them out \u2014 reveals what they actually want and how hard
            </span>
            <CostPips hours={2} />
          </label>
        );
      })()}
      {committeeEligible && (
        <label className="flex items-center gap-2 text-xs border border-amber-600 text-amber-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.formCommittee} onChange={() => onToggle("formCommittee")} className="accent-amber-500" />
          <UsersRound size={12} />
          <span className="flex-1"><span className="font-bold">Ready for a shop committee.</span> Help workers form one \u2014 unlocks the true-support read here</span><CostPips hours={COMMITTEE_COST} />
        </label>
      )}
    </div>
  );
}

function Act2NetworkMap({ locations, allocations = {}, onSelect, edgePulses = [], stepKey = 0, highlights = null, deployedLeaders = {}, notes = null }) {
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
          const dotCount = Math.min(9, Math.max(3, Math.round(loc.workers / 2)));
          const dots = Array.from({ length: dotCount }, (_, i) => {
            const ang = (2 * Math.PI * i) / dotCount;
            const rr = r * 0.55;
            return { x: Math.cos(ang) * rr, y: Math.sin(ang) * rr };
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
                const known = loc.committee?.active;
                const realShare = known ? (loc.trueSupport ?? loc.morale) / 100 : null;
                const solidUpTo = realShare == null ? dots.length : Math.round(dots.length * realShare / Math.max(0.01, loc.morale / 100));
                return dots.map((d, i) => {
                  const solid = realShare == null || i < solidUpTo;
                  return (
                    <circle
                      key={i} cx={d.x} cy={d.y} r="1.1"
                      fill={solid ? moraleHex(loc) : "none"}
                      stroke={moraleHex(loc)} strokeWidth={solid ? 0 : 0.4} strokeOpacity="0.7"
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
            Every site shares the same company — anti-union talk and organizing momentum both travel along these lines. Hover a site for details, click to plan.
          </div>
        )}
      </div>
    </div>
  );
}

function LocationActionModal({ loc, turn, allocation, response, priorities = null, remaining = 99, onSetUnits, onToggleResponse, onClose }) {
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

        <div className="text-xs text-stone-500 space-y-1 font-mono mb-4">
          <div>
            Manager: <span className="text-stone-200">{loc.manager}</span>{" "}
            <span className={loc.manager === "hostile" ? "text-red-400" : loc.manager === "sympathetic" ? "text-teal-400" : "text-stone-600"}>
              {loc.manager === "hostile"
                ? "(+4 visibility every week you organize here, and they can retaliate below the usual threshold)"
                : loc.manager === "sympathetic"
                ? "(+3 morale per active week, \u22122 visibility)"
                : "(no modifier)"}
            </span>
          </div>
          <div>Recruited: <span className="text-stone-200">{loc.recruited}/{loc.workers}</span> ({Math.round((loc.recruited / loc.workers) * 100)}%)</div>
          {isCampaign && <div>Election in <span className="text-stone-200">{Math.max(0, loc.electionTurn - turn)} week{Math.max(0, loc.electionTurn - turn) === 1 ? "" : "s"}</span> — actions here fight the employer's counter-campaign directly.</div>}
          {loc.antiUnion?.active && <div className="text-red-400">Anti-union talk is circulating ({loc.antiUnion.turnsLeft} week{loc.antiUnion.turnsLeft === 1 ? "" : "s"} left)</div>}
          {loc.buyOff?.active && <div className="text-teal-400">Workers just got a surprise raise ({loc.buyOff.turnsLeft} week{loc.buyOff.turnsLeft === 1 ? "" : "s"} of dampened organizing left)</div>}
          {loc.committee?.active && <div className="text-teal-400">Shop committee active{loc.committee.strikes > 0 ? ` (${loc.committee.strikes} strike${loc.committee.strikes === 1 ? "" : "s"} taken)` : ""}</div>}
        </div>

        {canAct ? (
          <>
            <div className="text-xs text-stone-500 font-bold mb-1 tracking-wide">WHAT SHOULD THE ORGANIZER DO HERE THIS WEEK?</div>
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
            {isOrganizing && (
              <FeedbackControls loc={loc} response={response} priorities={priorities} onToggle={onToggleResponse} />
            )}
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
function PlatformModal({ priorities, locations, onAdopt, onPledge }) {
  const [chosen, setChosen] = useState([]);
  const full = chosen.length >= PLATFORM_SLOTS;
  const toggle = (id) => setChosen(c => c.includes(id) ? c.filter(x => x !== id) : (c.length < PLATFORM_SLOTS ? [...c, id] : c));

  const sat = Object.fromEntries(BLOCS.map(b => [b.id, blocSatisfaction(b.id, chosen, priorities)]));
  const anyDefecting = BLOCS.filter(b => chosen.length && sat[b.id] < DEFECT_THRESHOLD);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto px-4 py-6">
      <div className="bg-stone-900 border-2 border-amber-500 max-w-2xl w-full mx-auto p-5 anim-rise">
        <div className="font-stencil text-2xl text-amber-400 tracking-wide mb-1">WHAT ARE WE ASKING FOR?</div>
        <p className="text-sm text-stone-400 mb-4">
          Everybody wanted a union. Nobody agreed what it was for. Pick <span className="text-amber-400 font-bold">{PLATFORM_SLOTS}</span> demands
          {" "}— bargaining capital is finite, and every one you take is one you didn't.
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
            A bloc below {DEFECT_THRESHOLD} stops counting and starts campaigning against you. You can spend a slot's goodwill
            instead: pledge them next.
            <div className="flex gap-2 mt-2 flex-wrap">
              {anyDefecting.map(b => (
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
          {full ? "ADOPT THIS PLATFORM" : `PICK ${PLATFORM_SLOTS - chosen.length} MORE`}
        </button>
      </div>
    </div>
  );
}

function EscalationModal({ loc, onFile, onConsolidate, onPivot }) {
  const recruitedPct = loc.recruited / loc.workers;
  const eligible = loc.morale >= 70 && recruitedPct >= 0.3 && loc.legalRisk < 75;
  const gap = loc.morale - (loc.trueSupport ?? loc.morale);
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 px-4">
      <div className="bg-stone-900 border-2 border-amber-500 max-w-lg w-full p-5 anim-rise">
        <div className="flex items-center gap-2 mb-1">
          <Vote size={18} className="text-amber-400" />
          <div className="font-stencil text-xl text-amber-400 tracking-wide">ESCALATION DECISION: {loc.name}</div>
        </div>
        <p className="text-sm text-stone-400 mb-4">Morale has crossed 70. Workers are ready to move — the question is whether you are.</p>

        {/* Three gates. Each one passes or it doesn't \u2014 no interpreting a number. */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          {[
            { label: "MORALE", val: loc.morale, pass: loc.morale >= 70, req: "\u2265 70" },
            { label: "RECRUITED", val: `${Math.round(recruitedPct * 100)}%`, pass: recruitedPct >= 0.3, req: "\u2265 30%" },
            { label: "LEGAL RISK", val: loc.legalRisk, pass: loc.legalRisk < 75, req: "< 75" },
          ].map(g => (
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
            Vote lands in <span className="text-stone-200 font-bold">5 weeks</span>. Win chance is
            {" "}<span className="text-stone-200 font-bold">60% of true support + 40% of whatever fear isn't</span>.
            {loc.committee?.active
              ? <> At {loc.trueSupport} true support and {loc.fear} fear, that reads
                  {" "}<span className={`font-bold ${((loc.trueSupport / 100) * 0.6 + ((100 - loc.fear) / 100) * 0.4) >= 0.6 ? "text-teal-400" : "text-amber-400"}`}>
                    {Math.round(((loc.trueSupport / 100) * 0.6 + ((100 - loc.fear) / 100) * 0.4) * 100)}%
                  </span> right now.</>
              : <> You cannot compute it: true support here is unknown.</>}
          </div>
        </div>

        {loc.committee?.active ? (
          <div className="mb-4 text-xs border border-teal-800 bg-teal-950/30 text-teal-300 px-3 py-2">
            The shop committee gives you an honest read: true support sits at <span className="font-bold">{loc.trueSupport}</span>, not the {loc.morale} morale number.
          </div>
        ) : gap >= 12 ? (
          <div className="mb-4 text-xs border border-amber-800 bg-amber-950/30 text-amber-300 px-3 py-2">
            No shop committee here, so true support is hidden and the election odds above cannot be calculated. Morale reads {loc.morale}; the number the vote uses could be {Math.max(0, loc.morale - 25)}.
          </div>
        ) : null}

        <div className="space-y-2">
          <button
            onClick={onFile}
            disabled={!eligible}
            className={`w-full text-left border-2 p-3 transition-colors ${eligible ? "border-teal-600 hover:bg-teal-950/40" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
          >
            <div className="font-stencil text-base text-teal-400">FILE FOR UNION ELECTION</div>
            <div className="text-xs text-stone-400">Go for the win now. Triggers a 5-week NLRB and campaign period, during which the employer campaigns against you every week. {!eligible && "Blocked: one of the three gates above is red."}</div>
          </button>
          <button onClick={onConsolidate} className="w-full text-left border-2 border-amber-700 hover:bg-amber-950/40 p-3 transition-colors">
            <div className="font-stencil text-base text-amber-400">CONSOLIDATE & KEEP ORGANIZING</div>
            <div className="text-xs text-stone-400">Hold here, build strength at other sites, escalate multiple locations together. Morale here will decay slowly if neglected.</div>
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
// 1. Cards go stale. This is real NLRB practice \u2014 old authorization cards get
//    challenged as unreliable evidence of CURRENT support \u2014 and it is the right shape
//    here because it isn't a timer, it's decay. A stale card drops that worker back
//    down the ladder and takes true support with it. It never touches a fast run: your
//    first card lands around week 6, so a 3-star campaign never loses one. A grind
//    watches its early signatures rot off faster than it can replace them.
const CARD_LIFESPAN = 14;
const CARD_STALE_WARNING = 3; // weeks of notice on the worker card

// 2. The studio ships. The most honest death available in this setting: the window
//    closes because the business cycle does not wait for the campaign. Visible from
//    week one \u2014 a cap you discover is a cheap shot, a cap you plan against is strategy.
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
// map the floor to know who works where. They bias who ends up carrying weight with whom.
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
  support: "How much this person backs the idea of a union. Support is not action: people who say they're behind it still hesitate when a card is actually in front of them. Ask someone who isn't ready and you lose ground with them.",
  trueSupport: "What this person would actually do with a card in front of them. Always lower than what they say, and cheap actions widen the gap: watching a coworker wear a button makes people talk warmer without making them any more willing to sign. Only a real conversation moves it.",
  influence: "Influence is relationship-specific. There is no single number for how persuasive someone is — Camille might carry real weight with one coworker and none at all with the next. The map shows who moves whom, and by how much. Every conversation and every public action lands in proportion to the influence between those two people.",
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

  const beat = beats[step];
  const accent = beat.tone === "red" ? "text-red-400" : "text-amber-400";
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 min-h-[70vh] flex flex-col">
      <div key={step} className="flex-1 flex flex-col justify-center anim-rise">
        <div className={`text-base tracking-[0.22em] mb-4 ${beat.tone === "red" ? "text-red-500" : "text-stone-500"}`}>{beat.kicker}</div>
        {beat.title && <div className={`font-stencil text-3xl sm:text-4xl leading-tight mb-4 ${accent}`}>{beat.title}</div>}
        {beat.lines.map((line, i) => (
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
function act2IntroBeats(leaders) {
  const beats = [
    {
      kicker: "AFTER THE VOTE",
      title: "WORD TRAVELS",
      lines: ["You won one shop. The other studios under the same parent heard about it inside a week."],
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
    {
      kicker: "YOUR JOB CHANGED",
      title: "YOU'RE NOT IN THE ROOM ANYMORE",
      lines: [
        "You're one organizer with four sites and one calendar.",
        "Every week you decide where your ten actions of time go — and where they don't.",
      ],
    },
  ];
  if (leaders.length) {
    beats.push({
      kicker: "YOU DIDN'T COME ALONE",
      title: "THE SHOP FLOOR CAME WITH YOU",
      lines: [
        `${["Nobody", "One person", "Two people", "Three people", "Four people"][leaders.length] || `${leaders.length} people`} who proved themselves in the first campaign came with you.`,
        "Station each of them at a site — their strength only helps where you post them.",
      ],
      visual: "roster",
    });
  }
  beats.push({
    kicker: "THE GOAL",
    title: "TWELVE WEEKS. TWO WINS.",
    lines: [
      "Unionize two of the four sites and the campaign carries.",
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
// context later — mapping, public actions, recruiting, how filing works — is deliberately
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
    text: `After launch the contractors roll off, the cuts land, and this shop stops existing in this shape. Cards also go stale after ${CARD_LIFESPAN} weeks \u2014 a signature is evidence of what somebody thought the day they signed it, not a permanent fact. Move fast, or watch your early wins rot off the count.`,
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

// Turnout: people with strong feelings in either direction show up. Fence-sitters are the
// ones who stay at their desks, and a fence-sitter who doesn't vote is a vote you lost.
function turnoutChance(w) {
  const conviction = Math.abs(w.support - 50) / 50;
  return Math.min(0.96, 0.62 + 0.28 * conviction + (w.signed ? 0.06 : 0));
}
// A secret ballot is secret. Even someone who signed can vote no in the booth, and at the
// top end there is always a little slippage that no amount of organizing removes.
function yesChance(w) {
  const base = (w.support - 32) / 48;
  return Math.min(0.93, Math.max(0.02, base + (w.signed ? 0.05 : 0)));
}
// Expected-value projection, shown to the player during the campaign. It is an estimate,
// not a promise — and it does not know what the next four weeks of pressure will do.
function voteProjection(workers) {
  let yes = 0, no = 0, out = 0;
  workers.forEach(w => {
    const t = turnoutChance(w);
    const y = yesChance(w);
    yes += t * y;
    no += t * (1 - y);
    out += 1 - t;
  });
  return { yes: Math.round(yes), no: Math.round(no), out: Math.round(out) };
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
// enough to show him \u2014 which makes your own visibility the thing that teaches him.
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
// point of mapping the floor is that team is a hint, not the answer.
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
    // Stated support is what they SAY. True support is what they'd actually do with a
    // card in front of them, and it starts lower for everyone but your own people.
    support: clamp(w.support + rand(9) - 4),
    trueSupport: w.organizer ? clamp(w.support) : clamp(w.support - 6 - rand(14)),
    trueKnown: !!w.organizer,
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
    blurb: "Wants to see it work before committing. Needs 12 more points of true support to sign, and rarely draws management's eye." },
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

// ---------- AFFINITY TRAITS ----------
// Tier two of the trait system. These do not make anyone a better organizer — they
// decide WHO can reach WHOM. Hidden until a conversation surfaces them, which is the
// whole reason the quick chat exists as an action.
// Each one also names the perk the company can buy it with. A perk is not a bribe
// aimed at a person — it is aimed at a THING PEOPLE HAVE IN COMMON, which is the
// thing the campaign was using to reach them.
const AFFINITY_POOL = [
  { id: "dogs", label: "Dog person", glyph: "\u25CF",
    perk: "Dog-Friendly Fridays", barb: "A photo wall goes up by reception within a week." },
  { id: "parent", label: "Has small kids", glyph: "\u25B2",
    perk: "backup childcare stipend", barb: "Capped, reimbursed quarterly, and worth less than the raise it replaced." },
  { id: "commute", label: "Long commute", glyph: "\u25AC",
    perk: "transit subsidy", barb: "Ninety dollars a month, and a reminder of who pays it, every month." },
  { id: "ttrpg", label: "Runs a tabletop game", glyph: "\u25C6",
    perk: "games room, bookable after hours", barb: "The company now hosts the thing they did to get away from the company." },
  { id: "veg", label: "Vegetarian", glyph: "\u25CB",
    perk: "catered lunch with a real plant-based menu", barb: "Thursdays. Attendance is noted, warmly." },
  { id: "gym", label: "Lifts before shift", glyph: "\u25A0",
    perk: "gym reimbursement", barb: "Submitted through the same portal as the performance review." },
  { id: "transplant", label: "Moved here for the job", glyph: "\u2726",
    perk: "relocation top-up, paid late", barb: "Money they were owed, arriving now, framed as generosity." },
  { id: "debt", label: "Carrying student debt", glyph: "\u25BC",
    perk: "student loan matching", barb: "Vests over four years. Nobody says the word \u2018vests\u2019 out loud." },
  { id: "modder", label: "Came up through modding", glyph: "\u2756",
    perk: "company game jam, on the clock", barb: "The one weekend a year the work feels like it used to." },
  { id: "secondjob", label: "Works a second job", glyph: "\u25AA",
    perk: "shift-flexibility pilot", barb: "A pilot. Reviewed in six months, by the people running it." },
  { id: "caretaker", label: "Cares for a parent", glyph: "\u2733",
    perk: "eldercare leave", barb: "Unpaid, but approved quickly, and everyone hears whose was approved." },
  { id: "smoker", label: "Takes the loading-dock break", glyph: "\u25AD",
    perk: "covered patio with heaters", barb: "The dock was where people talked without a manager in earshot." },
  { id: "church", label: "Church every Sunday", glyph: "\u2732",
    perk: "Sunday shifts made voluntary", barb: "Voluntary, and the schedule still gets written by someone." },
  { id: "vet", label: "Served", glyph: "\u2691",
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
// 0 shared -> 0.70, 1 -> 1.05, 2 -> 1.40, 3+ -> 1.75. A matched pairing is worth
// roughly two and a half times a cold one, which is what makes scouting pay.
function affinityMult(a, b) {
  return 0.7 + 0.35 * Math.min(3, sharedAffinities(a, b).length);
}
function affinityLabel(a, b) {
  const seen = visibleShared(a, b).length;
  const unknownLeft = affList(a).some(t => !knownAff(a).includes(t)) || affList(b).some(t => !knownAff(b).includes(t));
  if (seen >= 3) return "they have real common ground";
  if (seen === 2) return "they've got things in common";
  if (seen === 1) return "there's one thing they share";
  return unknownLeft ? "you don't know what these two have in common yet" : "nothing in common you can work with";
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
// worked yet. That's what mapping buys, and it's what tells you who's worth recruiting.
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
function convoGain(actor, target, weight) {
  const scale = (0.45 + 0.85 * (weight / 100)) * affinityMult(actor, target) * senderMult(actor) * recvMult(target);
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
function signChance(actor, target, weight) {
  if (target.signed) return 0;
  // Deliberately concave: a worker at 70 support is nowhere near twice as likely to sign
  // as one at 55. Saying you're for it and putting your name on paper are different acts.
  // Rolls against TRUE support, not the number the player has been watching. The gap
  // between the two is the whole lesson: a floor that says yes can still not sign.
  const real = target.trueSupport ?? target.support;
  // CAUTIOUS needs to see it working first; HOTHEAD signs before they have thought it through.
  const bar = 45 + (infTrait(target).signShift || 0);
  const readiness = Math.pow(Math.max(0, Math.min(1, (real - bar) / 50)), 1.3);
  const trustPart = 0.55 + 0.45 * (weight / 100);
  const recent = target.askedRecently > 0 ? 0.6 : 1;
  const guard = target.guarded > 0 ? 0.65 : 1;
  return Math.min(0.93, readiness * trustPart * affinityMult(actor, target) * recent * guard * complacencyMult(target) * senderMult(actor));
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
function publicGain(actor, target, weight, tier, uses = 0) {
  const t = infTrait(actor);
  const cross = infTrait(actor).crossTeam && actor.team !== target.team ? t.crossTeam : 1;
  return Math.round(
    PUBLIC_TIERS[tier].base * (weight / 100) * affinityMult(actor, target) * publicFatigue(uses)
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
  map: { label: "Map the floor", hours: 2, short: "mapping" },
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
function LadderBadge({ worker, showLabel = true }) {
  const r = ladderOf(worker);
  return (
    <span className="inline-flex items-center gap-1.5" title={r.blurb}>
      <Pips filled={r.pips} total={4} hex={r.hex} size={7} gap={2.5} dim={worker.burned} />
      {showLabel && <span className="text-[11px] font-bold tracking-wide" style={{ color: r.hex }}>{r.label}</span>}
    </span>
  );
}

// Affinity as glyphs. A trait both people share lights up — that is the entire
// "who do I send" decision, rendered without a sentence.
function AffinityChips({ worker, actor = null, max = 6 }) {
  const known = knownAff(worker);
  const hiddenCount = affList(worker).length - known.length;
  if (!known.length && !hiddenCount) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {known.slice(0, max).map(id => {
        const a = AFF_BY_ID[id];
        const match = actor && affList(actor).includes(id) && knownAff(actor).includes(id);
        return (
          <span
            key={id}
            title={a.label + (match ? " — shared with " + actor.name : "")}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] border"
            style={{
              borderColor: match ? "#2dd4bf" : "#44403c",
              color: match ? "#5eead4" : "#a8a29e",
              backgroundColor: match ? "rgba(45,212,191,0.10)" : "transparent",
            }}
          >
            <span style={{ fontSize: 9 }}>{a.glyph}</span>{a.label}
          </span>
        );
      })}
      {Array.from({ length: hiddenCount }).map((_, i) => (
        <span key={"h" + i} title="Not surfaced yet — a conversation would reveal it"
          className="inline-flex items-center px-1.5 py-0.5 text-[11px] border border-dashed border-stone-700 text-stone-600">?</span>
      ))}
    </span>
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
const EDGE_MIN_DRAW = 20;
const ORG_CARD_W = 42;
const ORG_CARD_H = 22;
const ORG_COL_GAP = 3;
const ORG_ROW_GAP = 4.5;
const ORG_TEAM_GAP = 13;
const ORG_MARGIN = 6;
const ORG_TEAM_COLS = 2;
const ORG_ROOT_H = 12;
const ORG_HEADER_H = 11;
const EDGE_SAME_TEAM = "#6b625c";
const EDGE_CROSS_TEAM = "#e7e5e4";

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
const FLOOR_LABELS = { organizerLegend: "YOURS TO DIRECT", signedLegend: "SIGNED A CARD" };
function Act1FloorMap({ workers, influence, staleWeek = null, layout = ORG_LAYOUT, planEntries = [], onSelect, highlights = null, edgePulses = [], stepKey = 0, notes = null, focusId = null, labels = FLOOR_LABELS, hoursLeft = null, planLabel = (e) => ACT1_ACTION[e.type]?.short ?? e.type }) {
  const [hoverId, setHoverId] = useState(null);
  const anyRevealed = workers.some(w => w.revealed && !w.organizer);
  const active = hoverId != null ? hoverId : focusId;

  // An influence line is visible once either end is known to you — you can see your own
  // people's reach from day one, and mapping the floor reveals everyone else's.
  const edges = [];
  workers.forEach(a => {
    outgoingTies(influence, a.id).forEach(t => {
      const b = workers.find(x => x.id === t.id);
      if (!b || t.weight < EDGE_MIN_DRAW) return;
      if (!influenceKnown(a, b)) return;
      edges.push({ from: a, to: b, weight: t.weight, crossTeam: a.team !== b.team });
    });
  });
  const crossCount = edges.filter(e => e.crossTeam).length;
  // A long arrow that passes over an intervening box used to disappear behind it. The
  // hovered person's lines are pulled out here and re-drawn above the cards, so you can
  // always follow exactly where someone's influence lands.
  const touchesActive = (e) => active != null && (e.from.id === active || e.to.id === active);
  const restEdges = edges.filter(e => !touchesActive(e));
  const hotEdges = edges.filter(touchesActive);
  const edgeGeom = (e, endPad = 1.8) => {
    const a = layout.cards[e.from.id];
    const b = layout.cards[e.to.id];
    if (!a || !b) return null;
    const dx = b.cx - a.cx, dy = b.cy - a.cy;
    return { p1: cardEdgePoint(a, dx, dy, 0.4), p2: cardEdgePoint(b, -dx, -dy, endPad) };
  };

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

  const connectedToActive = (id) =>
    active != null && (id === active || edges.some(e => (e.from.id === active && e.to.id === id) || (e.to.id === active && e.from.id === id)));

  return (
    <div className="border-2 border-stone-800 bg-stone-900 card-perf mb-6">
      <div className="flex items-center justify-between px-3 pt-2 flex-wrap gap-y-1">
        <div className="font-stencil text-lg tracking-wide text-stone-200">THE FLOOR</div>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-stone-500 flex-wrap px-3 pb-1">
        <span className="flex items-center gap-1">
          <span className="inline-block" style={{ width: 12, height: 2, backgroundColor: EDGE_SAME_TEAM }} />
          INFLUENCE WITHIN A TEAM
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block" style={{ width: 12, height: 2, backgroundColor: EDGE_CROSS_TEAM }} />
          INFLUENCE ACROSS TEAMS
        </span>
      </div>

      {/* THE LADDER. Left to right is the whole campaign. */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] mb-2 px-0.5">
        {[...LADDER].reverse().map((r, i) => (
          <span key={r.id} className="flex items-center gap-1.5" title={r.blurb}>
            {i > 0 && <span className="text-stone-700 mr-1">{"\u203a"}</span>}
            <Pips filled={r.pips} total={4} hex={r.hex} size={5} gap={1.5} />
            <span style={{ color: r.hex }}>{r.label}</span>
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="w-full block select-none">
        <defs>
          <marker id="org-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill={EDGE_SAME_TEAM} />
          </marker>
          <marker id="org-arrow-cross" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill={EDGE_CROSS_TEAM} />
          </marker>
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

        {/* ---- the real structure, drawn on top of the official one ---- */}
        {restEdges.map((e, i) => {
          const g = edgeGeom(e);
          if (!g) return null;
          return (
            <line
              key={i}
              x1={g.p1.x} y1={g.p1.y} x2={g.p2.x} y2={g.p2.y}
              stroke={e.crossTeam ? EDGE_CROSS_TEAM : EDGE_SAME_TEAM}
              strokeWidth={(e.crossTeam ? 0.44 : 0.28) + (e.weight / 100) * 0.7}
              strokeOpacity={active != null ? 0.14 : e.crossTeam ? 1 : 0.6}
              markerEnd={e.crossTeam ? "url(#org-arrow-cross)" : "url(#org-arrow)"}
            />
          );
        })}

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
              onClick={() => !w.burned && onSelect(w)}
              onMouseEnter={() => setHoverId(w.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="1.2" fill="#1c1917" stroke={border} strokeWidth={w.organizer || w.signed ? 0.75 : 0.5} />
              <rect x={c.x} y={c.y} width="1.6" height={c.h} rx="0.4" fill={TEAM_HEX[w.team]} fillOpacity={w.burned ? 0.3 : 0.9} />
              {planLabels && !w.burned && (
                <rect x={c.x - 1.3} y={c.y - 1.3} width={c.w + 2.6} height={c.h + 2.6} rx="1.6" fill="none" stroke="#f59e0b" strokeWidth="0.45" strokeDasharray="1.6 1.2" />
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

              <text x={c.x + 3.6} y={c.y + 6.8} fontSize="4.3" fill={w.burned ? "#57534e" : "#e7e5e4"} fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.12">{w.name.toUpperCase()}</text>
              <text x={c.x + c.w - 2.6} y={c.y + 7.8} textAnchor="end" fontSize="6" fontWeight="bold" fill={w.burned ? "#57534e" : tier.hex} fontFamily="'Courier New', monospace">{w.burned ? "—" : w.support}</text>

              {/* Influence trait, as a coloured corner tick. Visible from week one. */}
              <rect x={c.x + c.w - 3.2} y={c.y + 0.9} width="2.3" height="2.3" rx="0.4"
                fill={infTrait(w).hex} fillOpacity={w.burned ? 0.25 : 0.9} />

              {/* Commitment ladder, four pips. The one thing you should be able to read
                  across twenty cards without stopping to parse a word. */}
              {(() => {
                const rung = ladderOf(w);
                return (
                  <g opacity={w.burned ? 0.3 : 1}>
                    {[0, 1, 2, 3].map(i => (
                      <circle
                        key={i}
                        cx={c.x + 4.6 + i * 3.6}
                        cy={c.y + 11.3}
                        r="1.25"
                        fill={i < rung.pips ? rung.hex : "none"}
                        stroke={i < rung.pips ? rung.hex : "#57534e"}
                        strokeWidth="0.35"
                      />
                    ))}
                    {/* Common ground, on the board. A glyph you have surfaced is drawn;
                        one you haven't is a hollow tick, so the card shows how much of
                        this person you still don't know. The player doesn't need to
                        decode a glyph to use it — matching two cards is the whole read,
                        and hovering spells the names out underneath. */}
                    {affList(w).slice(0, 5).map((t, i) => {
                      const seen = knownAff(w).includes(t);
                      const bought = isPoisoned(w, t);
                      return (
                        <text
                          key={t}
                          x={c.x + 19.4 + i * 3.1}
                          y={c.y + 12.4}
                          fontSize={seen ? "3" : "2.8"}
                          fill={seen ? (bought ? "#f87171" : "#a8a29e") : "#57534e"}
                          fillOpacity={seen && bought ? 0.75 : 1}
                          fontFamily="'Courier New', monospace"
                        >{seen ? AFF_BY_ID[t]?.glyph ?? "\u25CF" : "\u00b7"}</text>
                      );
                    })}
                    {w.guarded > 0 && <text x={c.x + c.w - 3} y={c.y + 12.3} fontSize="2.8" fill="#f87171" textAnchor="end" fontFamily="'Courier New', monospace">!</text>}
                    {staleWeek != null && cardStaleSoon(w, staleWeek) && (
                      <text x={c.x + c.w - 3} y={c.y + 8.4} fontSize="2.2" fill="#fbbf24" textAnchor="end" fontFamily="'Courier New', monospace">
                        EXP WK{cardExpiresOn(w)}
                      </text>
                    )}
                  </g>
                );
              })()}

              {planLabels ? (
                <text x={c.x + 3.6} y={c.y + 18} fontSize="2.9" fill="#fbbf24" fontFamily="'Courier New', monospace">{truncateNote(planLabels.join(" + "), budget != null ? 17 : 21)}</text>
              ) : null}
              {w.burned && (
                <text x={c.x + c.w - 2.6} y={c.y + 18} textAnchor="end" fontSize="2.6" fill="#78716c" fontFamily="'Courier New', monospace">OUT OF PLAY</text>
              )}
              {/* The hours budget lives on the card so the player can see it without
                  leaving the board. On someone the company is working on it goes red,
                  which is also the week their budget is cut — one token, both facts. */}
              {budget != null && (() => {
                const total = Math.max(budget, committeeHours(w));
                const hex = budget < 0 || w.underPressure > 0 ? "#f87171" : budget === 0 ? "#2dd4bf" : "#f59e0b";
                return (
                  <g>
                    <HourPieShapes
                      cx={c.x + c.w - 4.4} cy={c.y + 17.1} r="2.9"
                      left={budget} total={total} hex={hex} sw="0.3" bg="#1c1917"
                    />
                    {budget < 0 && <text x={c.x + c.w - 2.6} y={c.y + 18.2} textAnchor="end" fontSize="2.9" fontWeight="bold" fill="#f87171" fontFamily="'Courier New', monospace">OVER</text>}
                  </g>
                );
              })()}
              {budget == null && !w.burned && !hl && w.underPressure > 0 && (
                <text x={c.x + c.w - 2.6} y={c.y + 18} textAnchor="end" fontSize="2.6" fill="#f87171" fontFamily="'Courier New', monospace">WORKED ON</text>
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

        {/* Drawn last so it sits above the boxes: a dark halo keeps the line readable
            where it crosses a card, then the line itself. */}
        {hotEdges.map((e, i) => {
          const g = edgeGeom(e, 2.2);
          if (!g) return null;
          const w = 0.6 + (e.weight / 100) * 0.7;
          return (
            <g key={`hot-${i}`}>
              <line x1={g.p1.x} y1={g.p1.y} x2={g.p2.x} y2={g.p2.y} stroke="#0c0a09" strokeWidth={w + 0.9} strokeOpacity="0.9" strokeLinecap="round" />
              <line
                x1={g.p1.x} y1={g.p1.y} x2={g.p2.x} y2={g.p2.y}
                stroke="#fbbf24" strokeWidth={w} strokeOpacity="1"
                markerEnd="url(#org-arrow-hot)"
              />
            </g>
          );
        })}
      </svg>

      <div className="border-t border-stone-800 px-3 py-2 min-h-[3.6rem]">
        {hovered ? (
          <div className="text-xs text-stone-400 leading-snug">
            <span className={`font-bold ${supportTier(hovered.support).text}`}>{hovered.name}{hovered.burned ? " (OUT OF PLAY)" : ""}</span>
            <span className="text-stone-500"> ({TEAM_LABEL[hovered.team]}) — support <span className="text-stone-300 font-bold">{hovered.support}</span> · {fulfillmentLabel(hovered.fulfillment).toLowerCase()} ({hovered.fulfillment}){hovered.signed ? " · SIGNED" : ""}</span>
            <span className="text-stone-500"> — {hovered.hook}</span>
            <div className="mt-0.5">
              <span className="text-stone-500">Common ground: </span>
              {knownAff(hovered).length ? (
                <span>
                  {knownAff(hovered).map((t, i) => (
                    <span key={t} className={isPoisoned(hovered, t) ? "text-red-400" : "text-stone-300"}>
                      {i > 0 ? "  ·  " : ""}{AFF_BY_ID[t]?.glyph ?? ""} {AFF_BY_ID[t]?.label ?? t}
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
                ? "The boxes are the company's chart. The arrows are who actually moves whom — they don't line up. Click anyone to plan."
                : "The boxes are the company's chart. You can see who your own two people reach; the rest of the floor's influence is invisible until you map it. Click anyone to plan."}
            </div>
            {edges.length > 0 && (
              <div className="text-stone-500 not-italic mt-0.5">
                Of the {edges.length} influence {edges.length === 1 ? "line" : "lines"} you've mapped, <span className="text-stone-200 font-bold">{crossCount}</span> cross team boundaries.
                {crossCount > 0 && " The org chart is not the map you organize on."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActOneGame({ onGraduate, onPrototype }) {
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
  // Target-first still works \u2014 both entry points reach the same panel.
  const [focusActorId, setFocusActorId] = useState(null);
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
  const unlockMapping = week >= 2;
  const unlockPublic = week >= ACT1_PUBLIC_UNLOCK_WEEK;
  const anyRevealedBeyondStart = workers.some(w => w.revealed && !w.organizer);
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
    // Stated support and true support are separate numbers. Anything that doesn't ask
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

    // --- MAPPING (resolves first: everything after is easier to read once it's known) ---
    const mapCount = planEntries.filter(e => e.type === "map").length;
    if (mapCount > 0) {
      const mapLines = [];
      for (let i = 0; i < mapCount; i++) {
        const hidden = w.filter(x => !x.revealed && !x.burned);
        if (!hidden.length) { mapLines.push("Everyone worth mapping is already mapped."); break; }
        const picked = [...hidden].sort(() => Math.random() - 0.5).slice(0, 3);
        picked.forEach(x => { x.revealed = true; });
        mapLines.push(`Quiet weeks of listening pay off — you now know who actually moves ${picked.map(x => x.name).join(", ")}.`);
      }
      steps.push({ label: "MAPPING THE FLOOR", sub: "Finding out who listens to whom, and how much.", workers: w.map(x => ({ ...x })), lines: mapLines });
    }

    // --- CONVERSATIONS ---
    const convoLines = [];
    const convoPulses = [];
    const convoNotes = {};
    planEntries.filter(e => e.type === "quick" || e.type === "deep").forEach(e => {
      const actor = byId(e.actorId);
      const target = byId(e.targetId);
      if (!actor || !target || actor.burned || target.burned) return;
      const weight = infOn(influence, actor.id, target.id);
      const g = convoGain(actor, target, weight);
      const before = target.support;
      target.revealed = true; // you learn who they listen to by sitting down with them

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
      if (e.type === "deep") target.trueKnown = true;
      gainXp(actor, e.type === "deep" ? XP_PER_ACTION : Math.round(XP_PER_ACTION * 0.6));
      const trueGain = e.type === "deep" ? g.deepTrue : g.quickTrue;
      bump(target, e.type === "deep" ? g.deep : g.quick, trueGain);
      if (target.guarded > 0 && e.type === "deep" && visibleShared(actor, target).length) target.guarded = 0;
      convoPulses.push({ from: actor.id, to: target.id, tone: "up" });
      const shared = sharedAffinities(actor, target).length;
      const flavor = shared >= 2
        ? `they find real common ground fast`
        : shared === 1
          ? `${actor.name} finds a way in`
          : weight >= 55
            ? `${actor.name} has standing, but nothing to build on`
            : `${actor.name} can't find a thread to pull`;
      convoNotes[target.id] = shared >= 2 ? `${actor.name} connects` : shared === 1 ? `${actor.name} gets heard` : `${actor.name} bounces off`;
      convoLines.push(`${target.name}: ${e.type === "deep" ? "a long, honest conversation" : "a quick word"} with ${actor.name} — ${flavor}. Stated support ${before} → ${target.support}.${foundNames.length ? ` You learn: ${foundNames.join(", ")}.` : ""}`);
      target.history.push(`Week ${week}: ${ACT1_ACTION[e.type].label.toLowerCase()} with ${actor.name} (+${target.support - before} stated).`);
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
      const reached = outgoingTies(influence, actor.id).filter(t => {
        const target = byId(t.id);
        return target && !target.burned && t.weight >= EDGE_MIN_DRAW;
      });
      let moved = 0;
      reached.forEach(t => {
        const target = byId(t.id);
        const gain = publicGain(actor, target, t.weight, e.type, uses);
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
      const weight = infOn(influence, actor.id, target.id);
      const chance = signChance(actor, target, weight);
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
      outgoingTies(influence, newMember.id).filter(t => t.weight >= 40).forEach(t => {
        const target = byId(t.id);
        if (target) target.trueKnown = true;
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
        const gain = Math.max(1, Math.round((t.weight / 100) * 2 * affinityMult(signer, target) * (infTrait(signer).passive || 1) * recvMult(target)));
        bump(target, gain);
        passivePulses.push({ from: signer.id, to: t.id, tone: "up" });
      });
    });
    // Committee neglect. Two weeks of grace, then their hours start shrinking, then
    // they step back off entirely. Nothing here resets \u2014 re-recruiting costs the full
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
        staleLines.push(`${x.name} signed ${CARD_LIFESPAN} weeks ago and has been organizing on that card ever since. It's too old to count now. They re-sign without being asked \u2014 but something goes out of them. \u221210 true support.`);
        x.signed = true;
        x.signedWeek = week;
      } else {
        staleLines.push(`${x.name}'s card is ${CARD_LIFESPAN} weeks old. The board won't accept it as evidence of what they think today, and honestly, neither should you. \u22126 stated, \u221210 true, and the second ask is harder than the first was.`);
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
          `DANIELS WORKS THE FLOOR \u2014 ${moved} people: +${moved ? Math.round(stated / moved) : 0} STATED support each, \u22122 TRUE. ` +
          `He is warm, he is specific, and he means it. Nobody changes their mind about the union. Everybody sounds friendlier about the company, which is worse: the morale number is now further from the vote than it has ever been.`
        );
      }

      // VANTAGE PARTNERS. Ownership does not persuade. It threatens the whole studio,
      // which raises fulfillment-as-risk across the board \u2014 everyone has more to lose.
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
          `VANTAGE PARTNERS REVIEWS ${TEAM_LABEL[t]} \u2014 ${n} people: +6 what-they'd-be-risking, \u22124 true support. ` +
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
          `THE PODCAST WEIGHS IN \u2014 ${hit} people: \u22123 stated. ${backfired} people: +6 stated, +5 TRUE. +9 heat. ` +
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
          `CAPTIVE-AUDIENCE MEETING \u2014 ${TEAM_LABEL[meetTeam]} \u2014 ${hitCount} hit, average \u2212${hitCount ? Math.round(hitTotal / hitCount) : 0} stated support.` +
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
      consultantLines.push(`WHAT HE DOES: two one-on-ones a week, aimed at the highest-support person who isn't already surrounded by signed coworkers. Each costs that person up to \u22128 stated support and 60% of that in true support. Every ${CONSULTANT_SETPIECE_GAP} weeks he runs one set piece \u2014 a raise offered to a waverer, or a job threat aimed at your most isolated committee member \u2014 ${CONSULTANT_MAX_EACH} of each, all campaign.`);
      consultantLines.push(`WHAT BLUNTS HIM: signed coworkers who carry weight with the target. Every 30 points of that backing takes 1 off the blow, to a floor of 1. Below ${KIRKMAN_SIGHT} heat he can't see your map and picks names off the org chart instead, which lands at 55% strength. Your own visibility is what teaches him where to aim.`);
    } else if (consultantNext.active) {
      // One-on-ones: he works the people closest to signing, minus whoever is already
      // surrounded by organizers. Density is the defence.
      // Once a petition is filed he stops being a side project and works the floor full
      // time — this is the stretch where campaigns are actually lost.
      const inCampaign = stage === "campaign";
      // Below the sight threshold he is picking names off an org chart: whoever looks
      // wobbly on paper, by department. Above it, the campaign has been loud enough
      // that he can see who is actually isolated \u2014 and that is when he gets dangerous.
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
          consultantLines.push(`NO MOVEMENT \u2014 ${t.name}: 0 stated, 0 true. STUBBORN ignores everything ${CONSULTANT_NAME} does, permanently. It cuts both ways \u2014 they were hard to bring over, and now they're impossible to take back.`);
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
          `${seesNetwork ? "TARGETED 1:1" : "ORG-CHART 1:1"} \u2014 ${t.name}: \u2212${before - t.support} stated, \u2212${Math.round((before - t.support) * 0.6)} true. ` +
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
          `CAPTIVE-AUDIENCE MEETING \u2014 all ${meetingCount} workers, \u2212${meetingTotal} stated support between them, up to \u2212${meetingWorst} each. ` +
          `Base 4, less 1 for anyone who has signed and 1 more per 70 points of signed backing behind them. ` +
          `True support is untouched \u2014 a mandatory meeting changes what people will say out loud, not what they'd do in a booth. ` +
          `Paid time, catered, and nobody from the union side is allowed to answer back. It runs again every week until the ballot.`
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
            consultantNotes[x.id] = `${aff.glyph} BOUGHT`;
            x.history.push(`Week ${week}: the company bought ${aff.label.toLowerCase()} (-${trueHit} true support).`);
          });
          heatNext = clamp(heatNext - 4);
          consultantPerks.push({ id: aff.id, until: week + PERK_WEEKS });
          consultantLines.push(
            `PERK LANDS \u2014 ${aff.perk.toUpperCase()}. Everyone on the floor who shares \u201C${aff.label}\u201D ` +
            `(${holders.length} ${holders.length === 1 ? "worker" : "workers"}, whether or not you had found them): ` +
            `\u2212${trueTotal} true support between them, +${fullTotal} fulfilment, \u22124 heat. ` +
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
            consultantLines.push(`JOB THREAT LANDS \u2014 ${mark.name} steps off the committee: \u221225 support, and everyone they carry loses up to 5. They had ${Math.round(markBacking(mark))} signed backing, so this was a ${Math.round(foldChance * 100)}% chance of folding. ${mark.name} is walked into a room with ${CONSULTANT_NAME} and their manager and asked, carefully, whether they've thought about how this looks on a performance file. Nothing actionable is said. He picks the most isolated person on your committee, because that is the only kind this works on.`);
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
            consultantLines.push(`JOB THREAT BACKFIRES \u2014 ${mark.name} holds: +5 support to them, +8 heat, and everyone they carry gains up to 6. With ${Math.round(markBacking(mark))} signed backing they only had a ${Math.round(foldChance * 100)}% chance of folding \u2014 every 3 points of backing takes 1% off it. ${CONSULTANT_NAME} asks how this will look on their performance file. ${mark.name} writes down the date, the time, and who was in the room, and tells everyone. Threatening someone's job over a union is illegal, and now it's documented.`);
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
            consultantLines.push(`BUY-OFF LANDS \u2014 ${mark.name}: \u221235 support${wasSigned ? ", card withdrawn" : ""}, and \u22125 heat, because a quiet raise draws no attention. He offers it to whoever on your side is cheapest to buy: at ${before35} support that was a ${Math.round(takeChance * 100)}% chance of being taken. They're offered a title bump and a number that solves a real problem at home. They take it.${wasSigned ? " Their card comes off the table." : ""} Nobody in the room blames them, which is the worst part.`);
            mark.history.push(`Week ${week}: took the raise${wasSigned ? " and withdrew their card" : ""}.`);
          } else {
            mark.support = clamp(mark.support + 8);
            heatNext = clamp(heatNext + 6);
            consultantNotes[mark.id] = "TURNS IT DOWN";
            consultantLines.push(`BUY-OFF REFUSED \u2014 ${mark.name}: +8 support, +6 heat, and everyone they carry gains up to 6. At ${before35} support it was a ${Math.round(takeChance * 100)}% chance of landing \u2014 the more convinced somebody already is, the less a raise is worth. They're offered a title bump and a raise, quietly, a week after signing on. They turn it down and repeat the offer out loud in the kitchen. Buying one person is cheap; getting caught at it is not.`);
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

  function graduate(persist = true) {
    const committee = workers
      .filter(w => w.organizer && !w.burned)
      .slice(0, 4)
      .map(w => ({ name: w.name, trait: w.trait }));
    onGraduate(committee, persist);
  }

  const cardShare = signedCount / ACT1_TOTAL_WORKERS;
  const canFile = stage === "drive" && signedCount >= ACT1_CARDS_NEEDED;
  const projection = voteProjection(workers);
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
          {unlockMapping && !anyRevealedBeyondStart && (
            <div className="mb-4 flex items-start gap-2 text-amber-300 text-sm border border-amber-700 bg-amber-950/30 px-3 py-2">
              <Radio size={14} className="shrink-0 mt-0.5" />
              <span><span className="font-bold text-amber-400">NEW — MAP THE FLOOR.</span> Influence is relationship-specific, and most of it is invisible. Spend 2 hours mapping to find out who actually moves whom — including relationships your own people don't have.</span>
            </div>
          )}
          {unlockPublic && !anyPublicDone && (
            <div className="mb-4 flex items-start gap-2 text-teal-300 text-sm border border-teal-700 bg-teal-950/30 px-3 py-2">
              <Megaphone size={14} className="shrink-0 mt-0.5" />
              <span><span className="font-bold text-teal-400">NEW — PUBLIC ACTIONS.</span> Instead of one conversation, have one of your people do something visible. It moves everyone they carry weight with at once, in proportion to that weight. The bigger the action, the bigger the ripple — and the bigger the chance management pulls them out of play.</span>
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
              <div className="text-xs text-stone-400 leading-relaxed">
                It takes a majority of the ballots actually cast — <span className="text-stone-200 font-bold">{projection.yes > projection.no ? "you are ahead on today's numbers" : "you are behind on today's numbers"}</span>.
                This is an estimate, not a promise: the booth is secret, people who signed still vote no, and every week between now and the ballot is a week the employer campaigns and you lose ground. A one-vote projection is a loss waiting to happen.
              </div>
            </div>
          )}

          {canFile && (
            <div className="mb-4 border-2 border-teal-700 bg-teal-950/20 px-3 py-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[16rem]">
                  <div className="font-stencil text-lg tracking-wide text-teal-400">YOU CAN FILE TODAY</div>
                  <div className="text-xs text-stone-400 leading-relaxed mt-1">
                    {signedCount} of {ACT1_TOTAL_WORKERS} cards is {cardPct}% — past the 30% the NLRB requires to petition for an election.
                    Filing starts a {ELECTION_WEEKS}-week clock you cannot stop, and the vote needs a majority of ballots cast, not 30%.
                    On today's support that ballot projects <span className="text-teal-400 font-bold">{projection.yes} yes</span> to <span className="text-red-400 font-bold">{projection.no} no</span>, with {projection.out} not voting.
                    Organizers almost never file at the minimum — they build a cushion first, because the four weeks after filing belong to the employer.
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
                  {stage === "campaign" ? "4" : "2"} one-on-ones a week at up to <span className="font-bold">−8 stated</span>{" "}
                  and <span className="font-bold">−5 true</span> each, aimed at your highest-support person who isn't already covered.
                  {stage === "campaign"
                    ? " Plus a mandatory all-hands every week: −1 to −4 stated on every worker on the floor."
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
                      return `${AFF_BY_ID[pk.id]?.glyph ?? ""} ${AFF_BY_ID[pk.id]?.label ?? pk.id} (${when})`;
                    }).join(" · ")}
                    <span className="text-stone-400"> — these stop counting as common ground in any conversation until the perk lapses.</span>
                  </span>
                )}
              </span>
            </div>
          )}
          <Act1FloorMap
            workers={workers}
            influence={influence}
            layout={ORG_LAYOUT}
            planEntries={planEntries}
            hoursLeft={organizerHours}
            onSelect={(w) => setSelectedWorker(w)}
            focusId={focusActorId}
            staleWeek={week}
          />

          <div className="border-2 border-stone-800 bg-stone-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-stencil text-lg tracking-wide text-stone-200">PLAN WEEK {week}</div>
              <div className={`text-base font-bold ${overBudget ? "text-red-500" : totalUsed === totalHours ? "text-teal-400" : "text-amber-400"}`}>
                {totalUsed} / {totalHours} HOURS
              </div>
            </div>
            <p className="text-xs text-stone-500 mb-3">
              {focusActorId
                ? "Now click anyone on the floor \u2014 they'll do it. Click the row again to clear the selection."
                : "Click a committee member's row below to pick who acts, then choose a target on the floor. Or click straight to someone on the floor and choose who goes to them."}
            </p>
            <div className="space-y-2 mb-3">
              {organizers.map(o => {
                const mine = planEntries.filter(e => e.actorId === o.id);
                const left = hoursLeftFor(o);
                return (
                  <div
                    key={o.id}
                    className={`border px-3 py-2 transition-colors cursor-pointer ${
                      focusActorId === o.id ? "border-amber-400 bg-amber-950/25"
                      : left < 0 ? "border-red-700 bg-red-950/20"
                      : (o.weeksIdle || 0) > IDLE_GRACE ? "border-amber-900/70 bg-amber-950/10"
                      : "border-stone-700 hover:border-stone-500"}`}
                    onClick={() => setFocusActorId(focusActorId === o.id ? null : o.id)}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="flex items-center gap-2">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setSelectedWorker(o); }}
                          className="text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors underline decoration-dotted underline-offset-2"
                        >
                          {o.name}
                        </button>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 border"
                          style={{ borderColor: orgTier(o).hex, color: orgTier(o).hex }}
                          title={orgTier(o).blurb}>
                          {orgTier(o).label}
                        </span>
                        {focusActorId === o.id && <span className="text-[10px] text-amber-300 font-bold">{"\u25B8"} PICK A TARGET</span>}
                      </span>
                      <span className="flex items-center gap-2">
                        <HourPie left={Math.max(0, left)} total={Math.max(hoursFor(o), left)} hex={left < 0 ? "#f87171" : left === 0 ? "#2dd4bf" : "#fbbf24"} size={17}
                          label={`${left} of ${hoursFor(o)} hours left this week`} />
                        {left < 0 && <span className="text-[11px] font-bold text-red-400">{Math.abs(left)} OVER</span>}
                        {o.shaken > 0 && <span className="text-[10px] text-red-400 font-bold">UNDER WATCH</span>}
                      </span>
                    </div>

                    {/* Experience toward the next tier \u2014 growth you can watch. */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="h-1 flex-1 bg-stone-800">
                        <div className="h-1 transition-all duration-500" style={{ width: `${o.experience || 0}%`, backgroundColor: orgTier(o).hex }} />
                      </div>
                      <span className="text-[10px] text-stone-600 whitespace-nowrap">
                        {(o.experience || 0) >= 75 ? "MAXED" : `${(o.experience || 0) >= 40 ? 75 - (o.experience || 0) : 40 - (o.experience || 0)} xp to next`}
                      </span>
                    </div>

                    {(o.weeksIdle || 0) > 0 && (
                      <div className={`text-[11px] mt-1 ${(o.weeksIdle || 0) > IDLE_GRACE ? "text-amber-400 font-bold" : "text-stone-600"}`}>
                        {(o.weeksIdle || 0) >= IDLE_QUIT - 1
                          ? `${o.name} walks next week if nobody uses them or checks in.`
                          : (o.weeksIdle || 0) > IDLE_GRACE
                            ? `Idle ${o.weeksIdle} weeks \u2014 down an hour. Leaves at ${IDLE_QUIT}.`
                            : `Idle ${o.weeksIdle} week${o.weeksIdle === 1 ? "" : "s"}.`}
                      </div>
                    )}
                    {mine.length === 0 ? (
                      <div className="text-xs text-stone-600 italic mt-1">Idle this week.</div>
                    ) : (
                      <div className="mt-1 space-y-0.5">
                        {mine.map(e => (
                          <div key={e.key} className="flex items-center justify-between text-xs text-stone-300">
                            <span>▸ {ACT1_ACTION[e.type].label}{e.targetId ? ` — ${workers.find(x => x.id === e.targetId)?.name}` : ""} <CostPips hours={ACT1_ACTION[e.type].hours} /></span>
                            <button onClick={() => removePlan(e.key)} className="text-stone-600 hover:text-red-400 transition-colors">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={resolveWeek}
              disabled={!canResolve}
              className={`w-full font-stencil text-lg py-2.5 tracking-wide transition-colors ${!canResolve ? "bg-stone-800 text-stone-600 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-400 text-stone-950"}`}
            >
              {overBudget ? "OVER BUDGET — REMOVE SOMETHING" : planEntries.length === 0 ? "PLAN SOMETHING FIRST" : `RESOLVE WEEK ${week}`}
            </button>
          </div>
        </div>
      )}

      {resStep && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          <Act1FloorMap
            workers={resStep.workers}
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
            <button onClick={() => graduate(true)} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">GET CALLED UP</button>
            <button onClick={startOver} className="font-stencil text-xl border-2 border-stone-700 hover:border-stone-500 text-stone-300 px-8 py-3 tracking-wide transition-colors">RUN IT FASTER</button>
          </>}
        />
      )}

      {showFilePrompt && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={() => setShowFilePrompt(false)}>
          <div className="bg-stone-900 border-2 border-teal-800 max-w-lg w-full p-5 my-auto" onClick={e => e.stopPropagation()}>
            <div className="font-stencil text-2xl text-teal-400 mb-1">FILE THE PETITION?</div>
            <p className="text-sm text-stone-400 leading-relaxed mb-3">
              You have {signedCount} cards out of {ACT1_TOTAL_WORKERS} — {cardPct}% of the unit. Thirty percent is all the labor board
              needs to schedule an election. It is not what wins one.
            </p>
            <div className="border border-stone-700 bg-stone-950/60 p-3 mb-3 space-y-2 text-[13px] text-stone-400 leading-relaxed">
              <div>
                <span className="text-stone-200 font-bold">What filing does.</span> You demand recognition and petition the NLRB the same day.
                If the count is lopsided enough the company may recognize you outright and skip the vote — that is rare, and rarer still
                once they're paying a consultant to tell them not to.
              </div>
              <div>
                <span className="text-stone-200 font-bold">Otherwise, a secret ballot in {ELECTION_WEEKS} weeks.</span> Every worker in the unit gets one.
                It is decided by a majority of the ballots actually cast, so someone who stays at their desk is a vote you didn't get.
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
            <button onClick={() => graduate(true)} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">GET CALLED UP</button>
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
          unlockPublic={unlockPublic}
          unlockMapping={unlockMapping}
          consultantActive={consultant.active}
          onPlan={(actorId, type, targetId) => { addPlan(actorId, type, targetId); setSelectedWorker(null); }}
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
            title="Jumps to Act Two for testing without saving over your real Act One progress."
            className="text-xs text-stone-600 hover:text-stone-400 underline transition-colors"
          >
            Skip to Phase 2 (playtest — doesn't save)
          </button>
          {onPrototype && (
            <button
              onClick={onPrototype}
              title="A vertical slice of the proposed first-contract act. Doesn't save."
              className="text-xs text-stone-600 hover:text-amber-400 underline transition-colors ml-3"
            >
              First Contract prototype
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Act1WorkerModal({ worker, allWorkers, influence, week = 1, organizers, hoursLeftFor, hoursFor, preferActorId = null, unlockPublic, unlockMapping, consultantActive = false, onPlan, onClose }) {
  const others = organizers.filter(o => o.id !== worker.id);
  const [actorId, setActorId] = useState(() => {
    if (worker.organizer) return worker.id;
    // If the player picked the actor off the shelf first, honour that choice.
    if (preferActorId && preferActorId !== worker.id && others.some(o => o.id === preferActorId)) return preferActorId;
    // Default to whoever carries the most weight with this person — but skip anyone
    // whose week is already spent, so the panel doesn't open fully greyed out.
    const ranked = [...others].sort((a, b) => infOn(influence, b.id, worker.id) - infOn(influence, a.id, worker.id));
    return (ranked.find(o => hoursLeftFor(o) >= 1) || ranked[0])?.id ?? null;
  });
  const actor = allWorkers.find(w => w.id === actorId);
  const isSelfPanel = worker.organizer;

  const out = outgoingTies(influence, worker.id).filter(t => influenceKnown(worker, allWorkers.find(w => w.id === t.id)));
  const inc = worker.revealed ? incomingTies(influence, worker.id) : [];
  const nameOf = (id) => allWorkers.find(w => w.id === id)?.name || "?";
  const pctOf = (c) => Math.round(c * 20) * 5;

  const weight = actor && !isSelfPanel ? shownInfluence(influence, actor, worker) : 0;
  const weightKnown = influenceKnown(actor, worker);
  const gains = actor && !isSelfPanel ? convoGain(actor, worker, weight) : null;
  const chance = actor && !isSelfPanel ? signChance(actor, worker, weight) : 0;

  const canAfford = (type) => actor && hoursLeftFor(actor) >= ACT1_ACTION[type].hours;

  const publicPreview = (tier) => {
    const uses = worker.publicUses?.[tier] || 0;
    const reached = outgoingTies(influence, worker.id).filter(t => {
      const target = allWorkers.find(x => x.id === t.id);
      return target && !target.burned && t.weight >= EDGE_MIN_DRAW;
    });
    const known = reached.filter(t => influenceKnown(worker, allWorkers.find(x => x.id === t.id)));
    const total = known.reduce((s, t) => {
      const target = allWorkers.find(x => x.id === t.id);
      return s + publicGain(worker, target, t.weight, tier, uses);
    }, 0);
    return { count: reached.length, knownCount: known.length, total, uses };
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-stone-900 border-2 border-stone-700 max-w-lg w-full p-5 my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-stencil text-2xl text-amber-400">{worker.name}</div>
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

        {/* COMMON GROUND — promoted to the top, because it is the decision */}
        <div className="border border-stone-800 bg-stone-950/50 px-3 py-2 mb-3">
          <div className="text-[11px] text-stone-500 font-bold tracking-wide mb-1.5">
            HOW THEY MOVE PEOPLE
          </div>
          <div className="text-xs text-stone-400 leading-snug mb-2">{infTrait(worker).blurb}</div>
          <div className="text-[11px] text-stone-500 font-bold tracking-wide mb-1.5">COMMON GROUND</div>
          <AffinityChips worker={worker} actor={isSelfPanel ? null : actor} />
          {!knownAff(worker).length && (
            <div className="text-xs text-stone-600 italic mt-1">Nothing surfaced yet. A quick chat is the cheapest way to find out.</div>
          )}
        </div>

        <div className="border border-stone-800 bg-stone-950/50 p-3 mb-4">
          <StatRow
            label="STATED SUPPORT (what they say)"
            value={worker.support}
            hex={supportTier(worker.support).hex}
            info={STAT_INFO.support}
            align="left"
            sub={worker.signed ? "Already signed a card." : worker.support >= 80 ? "Sounds ready." : worker.support >= 55 ? "With you in principle. Not yet a signature." : "Not close to putting their name on anything."}
          />
          {worker.trueKnown ? (
            <StatRow
              label="TRUE SUPPORT (what they'd do)"
              value={worker.trueSupport}
              hex={supportTier(worker.trueSupport).hex}
              info={STAT_INFO.trueSupport}
              align="left"
              sub={worker.trueSupport < worker.support - 12
                ? `They talk warmer than they are. The card ask rolls against ${worker.trueSupport}, not ${worker.support}.`
                : "Their words and their commitment line up."}
            />
          ) : (
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs text-stone-500 tracking-wide">
                <span className="flex items-center">TRUE SUPPORT (what they'd do)<InfoDot align="left">{STAT_INFO.trueSupport}</InfoDot></span>
                <span className="font-bold text-stone-600">UNKNOWN</span>
              </div>
              <div className="text-xs text-stone-600 italic mt-1 leading-snug">
                Only visible once somebody on the committee actually knows them. The card ask rolls against this number, not the one above.
              </div>
            </div>
          )}
          <StatRow
            label="WHAT THEY'D BE RISKING"
            value={worker.fulfillment}
            hex={FULFILL_HEX}
            info={STAT_INFO.fulfillment}
            align="left"
            sub={`${fulfillmentLabel(worker.fulfillment)} — card ask lands at ${Math.round(complacencyMult(worker) * 100)}% strength. The better the job feels, the more there is to lose.`}
          />
          <div className="mb-1">
            <div className="flex items-center justify-between text-xs text-stone-500 tracking-wide">
              <span className="flex items-center">INFLUENCE<InfoDot align="left">{STAT_INFO.influence}</InfoDot></span>
              <span className="font-bold text-stone-200">{out.length ? `${out.length} mapped relationship${out.length === 1 ? "" : "s"}` : "none mapped"}</span>
            </div>
            <div className="text-xs text-stone-400 mt-1 leading-relaxed">
              {out.length > 0 ? (
                <span>Moves <span className="text-amber-400">{out.map(t => `${nameOf(t.id)} (${t.weight})`).join(", ")}</span>.</span>
              ) : (
                <span className="text-stone-600 italic">No mapped influence on anyone yet.</span>
              )}
              <br />
              {worker.revealed ? (
                <span>Moved by <span className="text-stone-300">{inc.length ? inc.map(t => `${nameOf(t.id)} (${t.weight})`).join(", ") : "nobody in particular — they make up their own mind"}</span>.</span>
              ) : (
                <span className="text-stone-600 italic">Who moves them is unmapped — every number below is an estimate until you find out.</span>
              )}
            </div>
            {consultantActive && !worker.signed && !worker.burned && (() => {
              // What actually protects someone from the consultant: signed coworkers who
              // carry weight with them. Show it where the player is choosing who to work on.
              const backing = signedBacking(influence, allWorkers, worker.id);
              const shield = backing >= 90 ? "well covered" : backing >= 45 ? "partly covered" : "exposed";
              return (
                <div className={`text-xs mt-1.5 border-t border-stone-800 pt-1.5 ${backing >= 45 ? "text-stone-400" : "text-red-400"}`}>
                  Against {CONSULTANT_NAME}: <span className="font-bold">{shield}</span> — {backing} points of influence on them comes from people who've already signed.
                  {worker.pressuredCount > 0 && ` ${CONSULTANT_NAME} has worked on them ${worker.pressuredCount === 1 ? "once" : `${worker.pressuredCount} times`} so far.`}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="mb-3 border-t border-stone-800 pt-3">
          <div className="text-[11px] text-stone-600 font-bold mb-1 tracking-wide">WHO THEY ARE</div>
          <p className="text-sm text-stone-400">{worker.hook}</p>
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
            {unlockMapping && (
              <button
                disabled={hoursLeftFor(worker) < ACT1_ACTION.map.hours}
                onClick={() => onPlan(worker.id, "map")}
                className={`w-full text-left border-2 px-3 py-2 transition-colors ${hoursLeftFor(worker) >= ACT1_ACTION.map.hours ? "border-stone-700 hover:bg-stone-800/60" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
              >
                <div className="text-sm text-stone-100 flex justify-between"><span>{ACT1_ACTION.map.label}</span><CostPips hours={ACT1_ACTION.map.hours} affordable={hoursLeftFor(worker) >= ACT1_ACTION.map.hours} /></div>
                <div className="text-xs text-stone-400 leading-snug mt-0.5">Spend the week listening instead of talking. Reveals who moves three more people — and by how much.</div>
              </button>
            )}
          </div>
        ) : others.length === 0 ? (
          <div className="text-sm text-stone-500">Nobody on the committee is free to work on {worker.name} right now.</div>
        ) : (
          <div>
            <div className="text-xs text-stone-500 font-bold mb-1 tracking-wide">WHO DOES IT</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
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
                {weightKnown ? (
                  <>
                    <span className="text-stone-300 font-bold">{actor.name} → {worker.name}: influence {weight}.</span>{" "}
                    {weight >= 55 ? "Real standing — this is who should be doing it." : weight >= 25 ? "Some standing. It'll land, but not hard." : "Almost none. Whatever they say bounces off."}
                  </>
                ) : (
                  <><span className="text-stone-300 font-bold">Influence unmapped.</span> Numbers below assume an average relationship — map {worker.name} to see the real ones.</>
                )}
                <br />
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-stone-500">COMMON GROUND</span>
                  <Pips filled={visibleShared(actor, worker).length} total={3} hex="#2dd4bf" size={7} gap={2.5} />
                  <span className="font-bold" style={{ color: visibleShared(actor, worker).length ? "#5eead4" : "#a8a29e" }}>
                    {Math.round(affinityMult(actor, worker) * 100)}% strength
                  </span>
                </div>
                <span className="text-stone-500">{affinityLabel(actor, worker)}.</span>
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
                    {weightKnown ? "+" : "\u2248+"}{gains[type]} stated / <span className="text-teal-400">+{type === "deep" ? gains.deepTrue : gains.quickTrue} true</span> support.
                    {type === "deep"
                      ? " Moves what they'd actually do. Surfaces 3-4 things about them."
                      : " Cheap. Mostly moves what they say. Surfaces 1-3 things about them."}
                  </div>
                  {type === "deep" && misfireChance(actor, worker) > 0 && (
                    <div className="text-xs text-red-400 leading-snug mt-0.5">
                      {Math.round(misfireChance(actor, worker) * 100)}% it misfires — you don't know a single thing {actor.name} and {worker.name} share, so the sit-down lands as a pitch. Quick chat first.
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
                          ? "Nowhere near ready underneath. Asking now would be worse than not asking."
                          : "They don't sound ready — and you can't see the number that actually decides it.")
                      : `${weightKnown ? "~" : "≈"}${pctOf(chance)}% they sign, from ${actor.name}.`}
                    {worker.askedRecently > 0 && " They were asked recently — it's a harder sell right now."}
                  </div>
                  <div className="text-xs text-stone-500 leading-snug mt-0.5">
                    Odds are read off their support before this week's conversations land — talk to them first and the ask gets easier.
                  </div>
                  <div className="text-xs text-red-400 leading-snug mt-0.5">If they say no: −5 support, and the next ask is harder.</div>
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
                      ? `Needs ${ACT1_RECRUIT_REQ} TRUE support to take this on — they're at ${worker.trueSupport}, whatever the ${worker.support} says.`
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
    floor: 32, span: 55, threshold: 0.6, payout: 24,
    blurb: "One day, everyone wears it. Management counts stickers walking down the hall.",
  },
  {
    key: "march", rank: 3, label: "March on the boss", hours: 3,
    floor: 48, span: 52, threshold: 0.5, payout: 42,
    blurb: "A delegation walks into the studio head's office, unannounced, with a demand.",
  },
  {
    key: "worktorule", rank: 4, label: "No voluntary overtime", hours: 4,
    floor: 58, span: 48, threshold: 0.5, payout: 64,
    blurb: "Nobody stays past their hours. Three weeks from a milestone, that is a loaded gun.",
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

function makeContractWorkers() {
  // They just voted the union in, so nobody is hostile — but voting yes once and
  // showing up for something are different things, which is the whole level.
  return ACT1_WORKERS_SEED.map((w, i) => ({
    ...w,
    commitment: clamp(38 + rand(38) + (w.organizer ? 22 : 0)),
    fulfillment: clamp(w.fulfillment + rand(9) - 4),
    cat: !!w.organizer,
    participated: false,
    revealed: true,
    history: [],
  }));
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
  return Math.max(0, Math.min(0.97, ready * (1 - drag) + pull));
}

function projectedTurnout(workers, influence, tier) {
  if (!tier) return 0;
  return workers.reduce((n, w) => n + participationChance(w, tier, catBacking(influence, workers, w.id)), 0);
}

const contractTierSum = (issues) => issues.reduce((n, i) => n + i.tier, 0);

// Ratification: they vote on what you actually brought back, not on how hard you tried.
function ratifyYesChance(w, issues) {
  const won = contractTierSum(issues) / CONTRACT_MAX_TIERS;
  return Math.max(0.02, Math.min(0.96, 0.12 + won * 0.62 + (w.commitment - 45) / 190));
}

// After the certification year, the question stops being what's in the contract and
// becomes whether there's still a union at all. Nothing to show for a year of bargaining
// is exactly how a unit gets decertified.
function keepUnionChance(w, issues) {
  const won = contractTierSum(issues) / CONTRACT_MAX_TIERS;
  return Math.max(0.03, Math.min(0.97, 0.26 + won * 0.36 + (w.commitment - 45) / 165));
}

function ContractPrototype({ onExit }) {
  const [influence] = useState(() => generateInfluence(ACT1_WORKERS_SEED));
  const [workers, setWorkers] = useState(makeContractWorkers);
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState("plan"); // plan, result, ratify
  const [leverage, setLeverage] = useState(0);
  const [issues, setIssues] = useState(CONTRACT_ISSUES.map(i => ({ id: i.id, tier: 0 })));
  const [planEntries, setPlanEntries] = useState([]);
  const [actionPlan, setActionPlan] = useState(null); // { tierKey, leadId }
  const [result, setResult] = useState(null);
  const [ratification, setRatification] = useState(null);
  const [decert, setDecert] = useState(null);
  const [selected, setSelected] = useState(null);
  const planKey = useRef(0);

  const cat = workers.filter(w => w.cat);
  // One-on-ones and recruiting come out of one person's three hours. A collective action
  // is prepped by the whole team, so it draws on the pool — otherwise the four-hour rung
  // could never be chosen by anybody, which is exactly the lock this replaced.
  const hoursUsed = (id) =>
    planEntries.filter(e => e.actorId === id).reduce((n, e) => n + (e.type === "oneOnOne" ? 2 : 3), 0);
  const hoursLeft = (w) => CAT_HOURS - hoursUsed(w.id);
  const totalHours = cat.length * CAT_HOURS;
  const actionHours = actionPlan ? ACTION_LADDER.find(t => t.key === actionPlan.tierKey).hours : 0;
  const totalUsed = cat.reduce((n, o) => n + hoursUsed(o.id), 0) + actionHours;

  const tier = actionPlan ? ACTION_LADDER.find(t => t.key === actionPlan.tierKey) : null;
  const projection = tier ? projectedTurnout(workers, influence, tier) : 0;
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
    const cost = issueDef(id).costs[cur.tier + 1];
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

    planEntries.filter(e => e.type === "oneOnOne").forEach(e => {
      const a = byId(e.actorId), t = byId(e.targetId);
      if (!a || !t) return;
      const weight = infOn(influence, a.id, t.id);
      const gain = Math.max(1, Math.round(11 * (0.45 + 0.85 * (weight / 100)) * affinityMult(a, t)));
      const before = t.commitment;
      t.commitment = clamp(t.commitment + gain);
      notes[t.id] = `${a.name} +${t.commitment - before}`;
      lines.push(`${a.name} sits down with ${t.name}. Commitment ${before} → ${t.commitment}.`);
    });

    planEntries.filter(e => e.type === "recruit").forEach(e => {
      const t = byId(e.targetId);
      if (!t || t.cat || t.commitment < CAT_JOIN_REQ) return;
      t.cat = true;
      notes[t.id] = "JOINS THE CAT";
      lines.push(`${t.name} joins the contract action team — ${CAT_HOURS} more hours a week, and everyone they can turn out.`);
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
      const payout = strong
        ? Math.round(tier.payout * Math.min(1.35, share / tier.threshold))
        : Math.round(tier.payout * 0.25 * (share / tier.threshold));
      gained = payout;
      // No note per participant — the card already rings teal and says TURNED OUT.
      // Sixteen floating labels at once buries the board they're drawn on.
      if (strong) {
        showed.forEach(x => { x.commitment = clamp(x.commitment + 4); });
        lines.push(`${showed.length} of ${w.length} took part. The company's negotiator noticed, and the room changed. +${payout} leverage.`);
      } else {
        w.forEach(x => { x.commitment = clamp(x.commitment - 3); });
        lines.push(`Only ${showed.length} of ${w.length} took part. A thin turnout is worse than none — it shows them exactly how little you can move. +${payout} leverage.`);
      }
      actionResult = { tier, showed: showed.length, sat: sat.length, total: w.length, share, strong, payout, names: showed.map(x => x.name) };
    } else {
      // A quiet month is not neutral. This is how units die.
      w.forEach(x => { if (!x.cat) x.commitment = clamp(x.commitment - 3); });
      lines.push("No action this month. Bargaining happened in a room nobody saw, and the floor drifted.");
    }

    setWorkers(w);
    setLeverage(l => l + gained);
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
    setLeverage(l => Math.floor(l * LEVERAGE_COOLING));
    setTurn(t => t + 1);
    setPhase("plan");
  }

  const boardWorkers = workers.map(w => ({ ...w, support: w.commitment, organizer: w.cat, signed: w.participated }));
  const labels = { organizerLegend: "ON THE ACTION TEAM", signedLegend: "TURNED OUT LAST TIME" };
  const canResolve = planEntries.length > 0 || actionPlan;
  const overBudget = cat.some(o => hoursLeft(o) < 0) || totalUsed > totalHours;
  const poolLeft = totalHours - totalUsed;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-mono">
      <GlobalStyle />
      <div className="border-b-2 border-stone-800 bg-stone-900 px-4 py-3 sm:px-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-stencil text-2xl sm:text-3xl tracking-wide text-amber-400">THE FIRST CONTRACT</div>
          <div className="text-xs sm:text-sm tracking-[0.2em] text-stone-500">PROTOTYPE SLICE — NOT A FINISHED ACT</div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
          <div className="text-center">
            <div className="text-stone-500 text-xs">MONTH</div>
            <div className="text-lg font-bold text-stone-100">{Math.min(turn, CONTRACT_MONTHS)} / {CONTRACT_MONTHS}</div>
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
            <button onClick={onExit} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">BACK TO THE GAME</button>
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
          actions={<button onClick={onExit} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">BACK TO THE GAME</button>}
        />
      )}

      {(phase === "plan" || phase === "result") && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          {turn === 1 && phase === "plan" && (
            <div className="mb-4 flex items-start gap-2 text-stone-300 text-sm border border-stone-700 bg-stone-900/60 px-3 py-2">
              <Megaphone size={14} className="shrink-0 mt-0.5" />
              <span>You won the election. Now the company has to bargain — but not to agree. The number on each card is <span className="text-stone-100 font-bold">commitment</span>: whether they'll actually do something, not whether they support the union. Run an action, and whatever turnout you get is the only argument the company answers to.</span>
            </div>
          )}

          {/* THE TABLE */}
          <div className="border-2 border-stone-800 bg-stone-900 p-4 mb-6">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="font-stencil text-lg tracking-wide text-stone-200">AT THE TABLE</div>
              <div className="text-sm text-stone-400">Spend leverage to move an issue. You will not be able to afford everything — and it cools 20% a month if you sit on it.</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {CONTRACT_ISSUES.map(def => {
                const cur = issues.find(i => i.id === def.id);
                const maxed = cur.tier >= 2;
                const cost = maxed ? null : def.costs[cur.tier + 1];
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
                        PUSH IT — {cost} LEVERAGE
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
            influence={influence}
            planEntries={planEntries}
            planLabel={(e) => (e.type === "oneOnOne" ? "1:1" : "recruit")}
            onSelect={(w) => phase === "plan" && setSelected(w)}
            notes={phase === "result" ? result?.notes : null}
            stepKey={turn}
            labels={labels}
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
                <p className="text-xs text-stone-500 mb-3">One per month. Pick who leads it — the people they carry weight with are likelier to show.</p>
                <div className="grid gap-2 sm:grid-cols-2 mb-3">
                  {ACTION_LADDER.map(t => {
                    const chosen = actionPlan?.tierKey === t.key;
                    const proj = projectedTurnout(workers, influence, t);
                    const lands = proj / workers.length >= t.threshold;
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
                        <div className={`text-xs mt-1 ${lands ? "text-teal-400" : "text-red-400"}`}>
                          Projected ~{Math.round(proj)} of {workers.length} · needs {Math.round(t.threshold * workers.length)} to land
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
                      Projected turnout with this lead: ~{Math.round(projection)} of {workers.length}.
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
                          <span className={`text-xs font-bold ${left < 0 ? "text-red-400" : left === 0 ? "text-teal-400" : "text-stone-400"}`}>{left} of {CAT_HOURS} hrs left</span>
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
              <StatRow label="COMMITMENT" value={w.commitment} hex={supportTier(w.commitment).hex} align="left"
                info="Whether this person will actually do something — not whether they support the union. They already voted yes. Commitment is what turns that into showing up." />
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
                    {t.label}: <span className="text-stone-200 font-bold">{Math.round(participationChance(w, t, backing) * 100)}%</span>
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
        <button onClick={onExit} className="text-xs text-stone-600 hover:text-stone-400 underline transition-colors">Leave the prototype</button>
      </div>
    </div>
  );
}

// =====================================================================================
// TOP-LEVEL WRAPPER — Act 1 (one shop) graduates into Act 2 (the citywide campaign)
// =====================================================================================

const ACT1_SAVE_KEY = "act1-progress";

export default function PermadeathOrganizing() {
  const [act, setAct] = useState("loading"); // loading, choice, shop, citywide
  const [recruitedLeaders, setRecruitedLeaders] = useState([]);
  const [savedRun, setSavedRun] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACT1_SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.leaders)) {
          setSavedRun(parsed);
          setAct("choice");
          return;
        }
      }
    } catch (e) {
      // no prior save, or storage unavailable — just start fresh
    }
    setAct("shop");
  }, []);

  function saveAct1Win(leaders) {
    try {
      localStorage.setItem(ACT1_SAVE_KEY, JSON.stringify({ leaders }));
    } catch (e) {
      // if storage fails, the run still proceeds — persistence is a convenience, not a requirement
    }
  }

  function handleGraduate(leaders, persist = true) {
    setRecruitedLeaders(leaders);
    if (persist) saveAct1Win(leaders);
    setAct("citywide");
  }

  function handleFullRestart() {
    setRecruitedLeaders([]);
    try { localStorage.removeItem(ACT1_SAVE_KEY); } catch (e) { /* nothing saved, or storage unavailable */ }
    setSavedRun(null);
    setAct("shop");
  }

  let content;
  if (act === "loading") {
    content = <div className="min-h-screen bg-stone-950" />;
  } else if (act === "choice") {
    content = (
      <div className="min-h-screen bg-stone-950 text-stone-200 font-mono flex items-center justify-center px-6">
        <GlobalStyle />
        <div className="max-w-md text-center anim-rise">
          <div className="font-stencil text-4xl text-amber-400 mb-4">WELCOME BACK</div>
          <p className="text-stone-400 text-base leading-relaxed mb-6">
            You've already organized this shop, with {savedRun.leaders.length} leader{savedRun.leaders.length === 1 ? "" : "s"} who stepped up: {savedRun.leaders.map(l => l.name).join(", ")}.
          </p>
          <button
            onClick={() => { setRecruitedLeaders(savedRun.leaders); setAct("citywide"); }}
            className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors block w-full mb-3"
          >
            SKIP TO THE CITYWIDE CAMPAIGN
          </button>
          <button
            onClick={handleFullRestart}
            className="text-sm text-stone-500 hover:text-stone-300 underline"
          >
            Replay One Shop from the start instead
          </button>
        </div>
      </div>
    );
  } else if (act === "contract") {
    content = <ContractPrototype onExit={() => setAct("shop")} />;
  } else if (act === "shop") {
    content = <ActOneGame onGraduate={handleGraduate} onPrototype={() => setAct("contract")} />;
  } else {
    content = <ActTwoGame recruitedLeaders={recruitedLeaders} onFullRestart={handleFullRestart} />;
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
