import React, { useState, useEffect, useMemo, useRef } from "react";
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

// Act Two's network map board. Act One's floor uses its own, larger board.
const MAP_W = 160;
const MAP_H = 100;

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const rand = (n) => Math.floor(Math.random() * n);
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
  const solidarityScore = computeSolidarityScore(locations);

  function responseCostFor(loc, r) {
    if (!r) return 0;
    let cost = 0;
    if (r.grievance && loc.grievance) cost += GRIEVANCE_META[loc.grievance.type].cost;
    if (r.document) cost += 1;
    if (r.counter) cost += 1;
    if (r.reframe && loc.buyOff?.active) cost += 1;
    if (r.formCommittee) cost += COMMITTEE_COST;
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

    // Election resolution check
    let electionLines = [];
    workingLocs = workingLocs.map(l => {
      if (l.status === "campaign" && turn >= l.electionTurn) {
        const support = l.trueSupport ?? l.morale;
        const winChance = (support / 100) * 0.6 + ((100 - l.fear) / 100) * 0.4;
        const roll = Math.random();
        const gapWarning = l.morale - support >= 15 ? " Turnout looked stronger on paper than it was in the room." : "";
        if (roll <= winChance) {
          electionLines.push(`${l.name}: ELECTION WON. Workers vote to unionize. (True win probability was ${Math.round(winChance * 100)}%)${gapWarning}`);
          return { ...l, status: "won", morale: 95, trueSupport: 95, legalRisk: 0 };
        } else {
          electionLines.push(`${l.name}: ELECTION LOST. The vote came back NO. (True win probability was ${Math.round(winChance * 100)}%)${gapWarning}`);
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
    pendingRef.current = { workingLocs, orgStamina, breaksTaken, onBreak, justBroke, moraleClimateNext, legalClimateNext };
  }

  function commitResolution() {
    const { workingLocs, orgStamina, breaksTaken, onBreak, moraleClimateNext, legalClimateNext } = pendingRef.current;
    setLocations(workingLocs);
    setOrganizer({ stamina: orgStamina, breaksTaken, onBreak });
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
    setLocations(prev => prev.map(l => {
      if (l.id !== locId) return l;
      const recruitedPct = l.recruited / l.workers;
      const eligible = l.morale >= 70 && recruitedPct >= 0.3 && l.legalRisk < 75;
      if (!eligible) return l; // guarded in UI, shouldn't happen
      return { ...l, status: "campaign", electionTurn: turn + 5, fear: 35 + rand(15) };
    }));
    setEscalationTarget(null);
    setPhase("allocate");
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
          <div className="text-[10px] sm:text-xs tracking-[0.2em] text-stone-500">ORGANIZING SIMULATION — GAME STUDIO CAMPAIGN</div>
        </div>
        {phase !== "intro" && (
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <div className="text-center">
              <div className="text-stone-500 text-[10px]">WEEK</div>
              <div className="text-lg font-bold text-stone-100">{Math.min(turn, TOTAL_TURNS)} / {TOTAL_TURNS}</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-[10px] flex items-center gap-1"><Zap size={11}/> STAMINA</div>
              <div className={`text-lg font-bold ${organizer.stamina < 30 ? "text-red-500" : organizer.stamina < 60 ? "text-amber-400" : "text-teal-400"}`}>{organizer.stamina}</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-[10px]">UNIONIZED</div>
              <div className="text-lg font-bold text-teal-400">{unionizedCount} / 2</div>
            </div>
          </div>
        )}
      </div>

      {/* INTRO */}
      {phase === "intro" && (
        <div className="max-w-2xl mx-auto px-6 py-16 text-center anim-rise">
          <div className="font-stencil text-4xl text-amber-400 mb-4">THERE'S NO CONTINUE</div>
          <p className="text-stone-400 leading-relaxed mb-2">
            You proved it could be done at one studio. Now four more under the same PE-owned parent, twelve weeks,
            and you're coordinating instead of doing every conversation yourself.
          </p>
          <p className="text-stone-500 text-sm leading-relaxed mb-2">
            PerfAxis runs all four of these studios the same way it ran the first one — same stack-ranking algorithm,
            same engagement scores, same nobody-to-appeal-to. What worked once wasn't a fluke. It's a system, and
            systems can be organized against at scale.
          </p>
          <p className="text-stone-500 text-sm leading-relaxed mb-4">
            Every week you still allocate 10 actions of organizer time across the sites — but with a team behind you, your total stamina reserve runs deeper before anyone needs a break.
            Visibility brings retaliation. Your team can burn out. Workers can lose their nerve.
            None of it resets when you make a mistake.
          </p>
          {recruitedLeaders.length > 0 && (
            <div className="mb-8 text-left border border-teal-900 bg-teal-950/20 p-3">
              <div className="text-[10px] text-teal-400 font-bold mb-2 tracking-wide">YOUR TEAM, FROM THE SHOP FLOOR:</div>
              <div className="space-y-1">
                {recruitedLeaders.map((l, i) => (
                  <div key={i} className="text-xs text-stone-300">
                    <span className="font-bold text-stone-100">{l.name}</span> — strong on {l.trait === "legal" ? "legal grievances" : l.trait === "antiunion" ? "countering anti-union pressure" : l.trait === "committee" ? "building shop committees" : "keeping morale up"}
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => setPhase("allocate")} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
            BEGIN CAMPAIGN
          </button>
        </div>
      )}

      {/* ALLOCATE PHASE */}
      {phase === "allocate" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          {employerEmboldened && (
            <div className="mb-4 flex items-center gap-2 text-red-400 text-xs border border-red-900 bg-red-950/40 px-3 py-2">
              <AlertTriangle size={14} /> Management across the company is on high alert after a lost election elsewhere. Retaliation is more likely everywhere.
            </div>
          )}
          {locations.some(l => l.status === "campaign") && unionizedCount < 2 && (
            <div className="mb-4 flex items-center gap-2 text-teal-400 text-xs border border-teal-900 bg-teal-950/20 px-3 py-2">
              <Vote size={14} /> You need 2 locations won, not 1 — keep organizing your other sites while this election plays out.
            </div>
          )}
          {moraleClimate.turnsLeft > 0 && (
            <div className={`mb-4 flex items-center gap-2 text-xs border px-3 py-2 ${moraleClimate.tone === "positive" ? "text-teal-400 border-teal-900 bg-teal-950/30" : moraleClimate.tone === "negative" ? "text-red-400 border-red-900 bg-red-950/40" : "text-amber-400 border-amber-900 bg-amber-950/30"}`}>
              <Radio size={14} /> National mood {moraleClimate.tone === "positive" ? "is energizing organizing everywhere" : moraleClimate.tone === "negative" ? "has knocked morale down everywhere" : "has workers both angrier and more anxious"} ({moraleClimate.turnsLeft} week{moraleClimate.turnsLeft === 1 ? "" : "s"} left).
            </div>
          )}
          {legalClimate.turnsLeft > 0 && (
            <div className={`mb-4 flex items-center gap-2 text-xs border px-3 py-2 ${legalClimate.tone === "favorable" ? "text-teal-400 border-teal-900 bg-teal-950/30" : "text-red-400 border-red-900 bg-red-950/40"}`}>
              <Scale size={14} /> Legal climate is currently {legalClimate.tone} — {legalClimate.tone === "favorable" ? "unfair labor practices are easier to prove and retaliation is less likely" : "employers are emboldened and retaliation is more likely"} ({legalClimate.turnsLeft} week{legalClimate.turnsLeft === 1 ? "" : "s"} left).
            </div>
          )}
          {employerSophistication > 0 && (
            <div className="mb-4 flex items-center gap-2 text-xs border border-purple-900 bg-purple-950/30 text-purple-300 px-3 py-2">
              <Brain size={14} /> Corporate has learned from past firings (level {employerSophistication}/3) — expect quiet buy-offs alongside the usual crackdowns.
            </div>
          )}
          {solidarityScore > 0 && (
            <div className="mb-4 flex items-center gap-2 text-xs border border-teal-900 bg-teal-950/30 text-teal-300 px-3 py-2">
              <UsersRound size={14} /> Solidarity network strength: {solidarityScore} — active sites get a steady morale lift and anti-union talk has a harder time catching or spreading.
            </div>
          )}

          {recruitedLeaders.length > 0 && (
            <div className="mb-4 border border-stone-800 bg-stone-900 p-3">
              <div className="text-[10px] text-stone-400 font-bold mb-2 tracking-wide">YOUR TEAM — click a leader, then click a site to station them there</div>
              <div className="flex flex-wrap gap-2">
                {recruitedLeaders.map((l, i) => {
                  const at = leaderDeployment[i] ? START_LOCATIONS.find(s => s.id === leaderDeployment[i])?.name : null;
                  const armed = armedLeader === i;
                  return (
                    <div key={i} className={`flex items-center gap-1.5 text-xs border px-2 py-1 ${armed ? "border-amber-500 bg-amber-950/30" : "border-stone-700"}`}>
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
                <div className="mt-2 text-[10px] text-amber-400">Click a site on the map below to station {recruitedLeaders[armedLeader].name} there. Click their name again to cancel.</div>
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
              <div className={`text-sm font-bold ${remaining < 0 ? "text-red-500" : remaining === 0 ? "text-teal-400" : "text-amber-400"}`}>{remaining} ACTION{Math.abs(remaining) === 1 ? "" : "S"} LEFT</div>
            </div>
            <p className="text-[10px] text-stone-500 mb-3">Click a location above to choose what the organizer does there this week. Tap it again to change the plan. Unassigned actions count as rest — they help the organizer recover stamina but do nothing for the campaign.</p>
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 anim-rise">
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
            <div className="flex-1 min-h-[1.5rem] text-xs text-stone-400 font-mono">
              {resBanner.map((line, i) => <div key={`${stepIndex}-${i}`}>▸ {line}</div>)}
            </div>
            <button onClick={commitResolution} className="shrink-0 text-[10px] text-stone-500 hover:text-amber-400 underline transition-colors">
              SKIP ▸▸
            </button>
          </div>
          {resolutionSteps.slice(0, stepIndex + 1).some(s => s.lines.length > 0) && (
            <div ref={resLogRef} className="bg-stone-950/60 border border-stone-800 p-2 space-y-0.5 max-h-20 overflow-y-auto">
              {resolutionSteps.slice(0, stepIndex + 1).map((s, si) =>
                s.lines.map((line, li) => (
                  <div key={`${si}-${li}`} className={`text-[10px] font-mono ${si === stepIndex ? "text-stone-400" : "text-stone-600"}`}>▸ {line}</div>
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
                : `Twelve weeks came and went without enough studios reaching a contract. The campaign didn't build the power it needed in time.`}
          </p>
          <div className="grid grid-cols-4 gap-2 mb-8 text-xs">
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
            <button onClick={onFullRestart} className="block mx-auto mt-3 text-xs text-stone-500 hover:text-stone-300 underline">
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

// ---------- SUBCOMPONENTS ----------

function Meter({ label, value, icon, colorClass = "bg-amber-500", danger = false }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-stone-500 mb-0.5">
        <span className="flex items-center gap-1">{icon}{label}</span>
        <span className={`font-bold ${danger ? "text-red-400" : "text-stone-300"}`}>{value}</span>
      </div>
      <div className="h-1.5 w-full bg-stone-800">
        <div className={`h-1.5 ${danger ? "bg-red-600" : colorClass} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function FeedbackControls({ loc, response, onToggle }) {
  const inCrackdownBand = loc.visibility >= 40 && loc.visibility < 60;
  const recruitedPct = loc.recruited / loc.workers;
  const committeeEligible = !loc.committee?.active && loc.morale >= COMMITTEE_MORALE_REQ && recruitedPct >= COMMITTEE_RECRUIT_PCT_REQ;
  const hasAny = loc.grievance || inCrackdownBand || loc.antiUnion?.active || loc.buyOff?.active || committeeEligible;
  if (!hasAny) return null;

  return (
    <div className="mt-2 space-y-1.5 border-t border-stone-800 pt-2">
      {loc.grievance && (() => {
        const meta = GRIEVANCE_META[loc.grievance.type];
        const Icon = meta.icon;
        const autoHandled = loc.committee?.active && loc.grievance.type !== "legal";
        if (autoHandled) {
          return (
            <div className={`flex items-center gap-2 text-[10px] border px-2 py-1 ${meta.tone} opacity-70`}>
              <Icon size={12} />
              <span className="flex-1"><span className="font-bold">{meta.label}.</span> The shop committee is handling this one — no organizer time needed.</span>
            </div>
          );
        }
        return (
          <label className={`flex items-center gap-2 text-[10px] border px-2 py-1 cursor-pointer ${meta.tone} ${response.grievance ? "bg-stone-800" : ""}`}>
            <input type="checkbox" checked={!!response.grievance} onChange={() => onToggle("grievance")} className="accent-amber-500" />
            <Icon size={12} />
            <span className="flex-1"><span className="font-bold">{meta.label}.</span> {meta.action} ({meta.cost} action{meta.cost > 1 ? "s" : ""})</span>
          </label>
        );
      })()}
      {inCrackdownBand && (
        <label className="flex items-center gap-2 text-[10px] border border-stone-600 text-stone-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.document} onChange={() => onToggle("document")} className="accent-amber-500" />
          <Radio size={12} />
          <span className="flex-1"><span className="font-bold">Management is watching closer.</span> Document it (1 action)</span>
        </label>
      )}
      {loc.antiUnion?.active && (
        <label className="flex items-center gap-2 text-[10px] border border-red-800 text-red-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.counter} onChange={() => onToggle("counter")} className="accent-amber-500" />
          <Megaphone size={12} />
          <span className="flex-1"><span className="font-bold">Anti-union talk is spreading.</span> Counter-message (1 action)</span>
        </label>
      )}
      {loc.buyOff?.active && (
        <label className="flex items-center gap-2 text-[10px] border border-teal-800 text-teal-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.reframe} onChange={() => onToggle("reframe")} className="accent-amber-500" />
          <HandCoins size={12} />
          <span className="flex-1"><span className="font-bold">Management just announced a retention bonus.</span> Reframe it as a union win (1 action)</span>
        </label>
      )}
      {committeeEligible && (
        <label className="flex items-center gap-2 text-[10px] border border-amber-600 text-amber-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.formCommittee} onChange={() => onToggle("formCommittee")} className="accent-amber-500" />
          <UsersRound size={12} />
          <span className="flex-1"><span className="font-bold">Ready for a shop committee.</span> Help workers form one ({COMMITTEE_COST} actions)</span>
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
        <div className="flex items-center gap-3 text-[9px] text-stone-500">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-teal-400" /> MORALE 70+</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-stone-400" /> MID</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-400" /> LOW</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block rounded-full bg-stone-500" style={{ width: 5, height: 5 }} />
            <span className="inline-block rounded-full bg-stone-500" style={{ width: 10, height: 10 }} />
            SIZE = WORKFORCE
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
              {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r="1.1" fill={moraleHex(loc)} />
              ))}
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
                <text textAnchor="middle" y={r + 13} fontSize="2.4" fill="#fbbf24" fontFamily="'Courier New', monospace">PLANNED</text>
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
          <div className="text-[10px] text-stone-400 leading-snug">
            <span className={`font-bold ${statusMeta[hovered.status].color}`}>{hovered.name}</span>
            <span className="text-stone-500"> — {statusMeta[hovered.status].label}. Morale {hovered.morale}, visibility {hovered.visibility}, {hovered.recruited}/{hovered.workers} recruited.</span>
            {hovered.committee?.active && <span className="text-teal-400"> Shop committee active — organizing here no longer depends entirely on you.</span>}
            {hovered.antiUnion?.active && <span className="text-red-400"> Anti-union talk circulating — can spread to other sites if unanswered.</span>}
            {deployedLeaders[hovered.id] && <span className="text-amber-400"> {deployedLeaders[hovered.id].name} is stationed here — strong on {TRAIT_LABEL[deployedLeaders[hovered.id].trait]}.</span>}
          </div>
        ) : (
          <div className="text-[10px] text-stone-600 italic">
            Every site shares the same company — anti-union talk and organizing momentum both travel along these lines. Hover a site for details, click to plan.
          </div>
        )}
      </div>
    </div>
  );
}

function LocationActionModal({ loc, turn, allocation, response, onSetUnits, onToggleResponse, onClose }) {
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
        <div className={`text-xs font-bold mb-4 ${meta.color}`}>{meta.label}</div>

        <div className="space-y-3 mb-4">
          <Meter label="MORALE" value={loc.morale} icon={<CheckCircle2 size={11} />} colorClass="bg-teal-500" />
          {loc.committee?.active && <Meter label="TRUE SUPPORT (committee reported)" value={loc.trueSupport} icon={<UsersRound size={11} />} colorClass="bg-amber-500" />}
          <Meter label="VISIBILITY" value={loc.visibility} icon={<Eye size={11} />} danger={loc.visibility >= 60} />
          <Meter label="LEGAL RISK" value={loc.legalRisk} icon={<Scale size={11} />} danger={loc.legalRisk >= 60} />
          {isCampaign && <Meter label="WORKER FEAR" value={loc.fear} icon={<AlertTriangle size={11} />} danger={loc.fear >= 60} />}
        </div>

        <div className="text-[10px] text-stone-500 space-y-1 font-mono mb-4">
          <div>Manager disposition: <span className="text-stone-200">{loc.manager}</span></div>
          <div>Recruited: <span className="text-stone-200">{loc.recruited}/{loc.workers}</span> ({Math.round((loc.recruited / loc.workers) * 100)}%)</div>
          {isCampaign && <div>Election in <span className="text-stone-200">{Math.max(0, loc.electionTurn - turn)} week{Math.max(0, loc.electionTurn - turn) === 1 ? "" : "s"}</span> — actions here fight the employer's counter-campaign directly.</div>}
          {loc.antiUnion?.active && <div className="text-red-400">Anti-union talk is circulating ({loc.antiUnion.turnsLeft} week{loc.antiUnion.turnsLeft === 1 ? "" : "s"} left)</div>}
          {loc.buyOff?.active && <div className="text-teal-400">Workers just got a surprise raise ({loc.buyOff.turnsLeft} week{loc.buyOff.turnsLeft === 1 ? "" : "s"} of dampened organizing left)</div>}
          {loc.committee?.active && <div className="text-teal-400">Shop committee active{loc.committee.strikes > 0 ? ` (${loc.committee.strikes} strike${loc.committee.strikes === 1 ? "" : "s"} taken)` : ""}</div>}
        </div>

        {canAct ? (
          <>
            <div className="text-[10px] text-stone-500 font-bold mb-1 tracking-wide">WHAT SHOULD THE ORGANIZER DO HERE THIS WEEK?</div>
            <div className="space-y-2 mb-2">
              {tiers.map(t => (
                <button
                  key={t.units}
                  onClick={() => onSetUnits(t.units)}
                  className={`w-full text-left border-2 px-3 py-2 text-xs transition-colors ${allocation === t.units ? "border-amber-500 bg-amber-950/30" : "border-stone-700 hover:bg-stone-800/60"}`}
                >
                  <div className="font-stencil text-sm tracking-wide text-stone-100">{t.label} {t.cost > 0 ? `(${t.cost} action${t.cost > 1 ? "s" : ""})` : ""}</div>
                  <div className="text-[10px] text-stone-400">{t.desc}</div>
                </button>
              ))}
            </div>
            {isOrganizing && (
              <FeedbackControls loc={loc} response={response} onToggle={onToggleResponse} />
            )}
          </>
        ) : (
          <div className="text-xs text-stone-500 italic">This site is no longer active — nothing left to organize here.</div>
        )}

        <button onClick={onClose} className="mt-4 w-full font-stencil text-lg bg-amber-500 hover:bg-amber-400 text-stone-950 py-2 tracking-wide">
          DONE
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
        <p className="text-xs text-stone-400 mb-4">Morale has crossed 70. Workers are ready to move — the question is whether you are.</p>

        <div className="grid grid-cols-3 gap-2 mb-3 text-[10px]">
          <div className="border border-stone-800 p-2 text-center">
            <div className="text-stone-500">MORALE</div>
            <div className="text-teal-400 font-bold text-sm">{loc.morale}</div>
          </div>
          <div className="border border-stone-800 p-2 text-center">
            <div className="text-stone-500">RECRUITED</div>
            <div className={`font-bold text-sm ${recruitedPct >= 0.3 ? "text-teal-400" : "text-red-400"}`}>{Math.round(recruitedPct * 100)}%</div>
          </div>
          <div className="border border-stone-800 p-2 text-center">
            <div className="text-stone-500">LEGAL RISK</div>
            <div className={`font-bold text-sm ${loc.legalRisk < 75 ? "text-teal-400" : "text-red-400"}`}>{loc.legalRisk}</div>
          </div>
        </div>

        {loc.committee?.active ? (
          <div className="mb-4 text-[10px] border border-teal-800 bg-teal-950/30 text-teal-300 px-3 py-2">
            The shop committee gives you an honest read: true support sits at <span className="font-bold">{loc.trueSupport}</span>, not the {loc.morale} morale number.
          </div>
        ) : gap >= 12 ? (
          <div className="mb-4 text-[10px] border border-amber-800 bg-amber-950/30 text-amber-300 px-3 py-2">
            Without a shop committee, the organizer is going on feel alone — and this room may not be as solid as the morale number suggests.
          </div>
        ) : null}

        <div className="space-y-2">
          <button
            onClick={onFile}
            disabled={!eligible}
            className={`w-full text-left border-2 p-3 transition-colors ${eligible ? "border-teal-600 hover:bg-teal-950/40" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
          >
            <div className="font-stencil text-base text-teal-400">FILE FOR UNION ELECTION</div>
            <div className="text-[10px] text-stone-400">Go for the win now. Triggers a 5-week NLRB and campaign period. {!eligible && "(Requirements not met — need 30%+ recruited and legal risk under 75.)"}</div>
          </button>
          <button onClick={onConsolidate} className="w-full text-left border-2 border-amber-700 hover:bg-amber-950/40 p-3 transition-colors">
            <div className="font-stencil text-base text-amber-400">CONSOLIDATE & KEEP ORGANIZING</div>
            <div className="text-[10px] text-stone-400">Hold here, build strength at other sites, escalate multiple locations together. Morale here will decay slowly if neglected.</div>
          </button>
          <button onClick={onPivot} className="w-full text-left border-2 border-stone-700 hover:bg-stone-800/60 p-3 transition-colors">
            <div className="font-stencil text-base text-stone-300">PIVOT AWAY</div>
            <div className="text-[10px] text-stone-400">Deprioritize this site for now and refocus the organizer elsewhere.</div>
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
// There is no deadline. The level is scored on speed: beat it in this many weeks or fewer.
const ACT1_STAR_WEEKS = { three: 7, two: 10 };
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
  influence: "Influence is relationship-specific. There is no single number for how persuasive someone is — Camille might carry real weight with one coworker and none at all with the next. The map shows who moves whom, and by how much. Every conversation and every public action lands in proportion to the influence between those two people.",
  fulfillment: "How fulfilled this person is by the work itself. Fulfilled and burned-out workers both sign union cards — fulfillment does not predict support. What it predicts is who they'll listen to: people are moved much harder by an organizer whose relationship to the job resembles their own.",
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
  { id: 12, name: "Roz", team: "engineering", trait: "legal", support: 26, fulfillment: 78, hook: "Principal engineer. Genuinely loves this codebase — she wrote half of it. Which is exactly why watching PL-A-EYE overwrite her systems is unbearable." },
  { id: 13, name: "Omar", team: "qa", trait: "antiunion", support: 18, fulfillment: 40, hook: "Keeps his head down and his numbers up. He's been told he's 'on the list' for a lead role two years running." },
  { id: 14, name: "Fen", team: "production", trait: "morale", support: 44, fulfillment: 82, hook: "Concept artist. Loves this game more than anyone in the building, and can't stand what the building does to the people making it." },
  { id: 15, name: "Gus", team: "engineering", trait: "committee", support: 14, fulfillment: 65, hook: "Twenty-two years in games, four studios. Was around for one union drive that fell apart badly. Doesn't intend to live through a second." },
  { id: 16, name: "Naledi", team: "qa", trait: "legal", support: 52, fulfillment: 22, hook: "Runs the entire QA pipeline on a coordinator's title and a coordinator's pay. Hasn't taken a full weekend since March." },
  { id: 17, name: "Theo", team: "production", trait: "morale", support: 28, fulfillment: 48, hook: "Audio, contract-to-hire for the third contract running. His renewal is up in eleven weeks and he knows exactly who signs it." },
  { id: 18, name: "Iris", team: "engineering", trait: "antiunion", support: 37, fulfillment: 20, hook: "Built the internal tools team's best work. PL-A-EYE replaced it in a single sprint and nobody told her before the all-hands." },
  { id: 19, name: "Marcus", team: "qa", trait: "committee", support: 42, fulfillment: 66, hook: "Ran the studio's mentorship program until it got cut for 'focus.' Still mentors people anyway, on his own time." },
  { id: 20, name: "Delphine", team: "production", trait: "antiunion", support: 22, fulfillment: 88, hook: "Narrative lead, four years inside this world. Thinks a union fight will slow the ship down right when the game finally needs to land." },
];

const ACT1_TOTAL_WORKERS = ACT1_WORKERS_SEED.length;
const ACT1_CARDS_NEEDED = Math.ceil(ACT1_TOTAL_WORKERS * ACT1_CARD_THRESHOLD);

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

function makeAct1Workers() {
  return ACT1_WORKERS_SEED.map(w => ({
    ...w,
    organizer: !!w.organizer,
    signed: !!w.organizer,
    support: clamp(w.support + rand(9) - 4),
    fulfillment: clamp(w.fulfillment + rand(9) - 4),
    burned: false,
    revealed: !!w.organizer, // you already know who your own two people reach
    shaken: 0,
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
function fulfillmentAffinity(a, b) {
  return Math.max(0, 1 - Math.abs(a.fulfillment - b.fulfillment) / 100);
}
function affinityMult(a, b) {
  return 0.6 + 0.8 * fulfillmentAffinity(a, b);
}
function affinityLabel(a, b) {
  const gap = Math.abs(a.fulfillment - b.fulfillment);
  if (gap <= 12) return "they see the job the same way";
  if (gap <= 30) return "close enough on how the job feels";
  if (gap <= 55) return "they feel differently about the work";
  return "they might as well have different jobs";
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
// Shared math — the resolution rolls against exactly the numbers the player was shown.
function convoGain(actor, target, weight) {
  const raw = CONVO_BASE.quick * (0.45 + 0.85 * (weight / 100)) * affinityMult(actor, target);
  const deep = CONVO_BASE.deep * (0.45 + 0.85 * (weight / 100)) * affinityMult(actor, target);
  return { quick: Math.max(1, Math.round(raw)), deep: Math.max(2, Math.round(deep)) };
}

// Support is not action. Readiness gates everything, but who's asking still matters.
function signChance(actor, target, weight) {
  if (target.signed) return 0;
  // Deliberately concave: a worker at 70 support is nowhere near twice as likely to sign
  // as one at 55. Saying you're for it and putting your name on paper are different acts.
  const readiness = Math.pow(Math.max(0, Math.min(1, (target.support - 45) / 50)), 1.3);
  const trustPart = 0.55 + 0.45 * (weight / 100);
  const recent = target.askedRecently > 0 ? 0.6 : 1;
  return Math.min(0.93, readiness * trustPart * affinityMult(actor, target) * recent);
}

const PUBLIC_TIERS = {
  small: { base: 6, heat: 3, burn: 0, selfSupport: 3, blurb: "Wears the button on the floor all week and answers questions about it." },
  medium: { base: 11, heat: 7, burn: 0.06, selfSupport: 5, blurb: "Puts their name at the top of an open letter about the PL-A-EYE rollout." },
  large: { base: 19, heat: 14, burn: 0.18, selfSupport: 8, blurb: "Stands up at the all-hands and says it out loud, with their name on it." },
};
// The second time someone wears the button it isn't news, and the third time even less.
// Repeating one cheap public action forever should lose to escalating — that's how
// structure tests actually work.
function publicFatigue(uses) {
  return 1 / (1 + 0.6 * uses);
}
function publicGain(actor, target, weight, tier, uses = 0) {
  return Math.round(PUBLIC_TIERS[tier].base * (weight / 100) * affinityMult(actor, target) * publicFatigue(uses));
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
};

// ---------- SHARED BITS OF UI ----------
function InfoDot({ children, align = "center" }) {
  const pos = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span className="relative group inline-flex items-center align-middle ml-1">
      <span className="w-3 h-3 rounded-full border border-stone-600 text-stone-500 text-[8px] leading-[10px] text-center cursor-help transition-colors group-hover:border-amber-500 group-hover:text-amber-400 font-mono">i</span>
      <span className={`pointer-events-none absolute ${pos} bottom-full mb-1.5 z-50 hidden group-hover:block w-64 sm:w-72 border border-stone-600 bg-stone-950 px-2.5 py-2 text-[10px] leading-relaxed text-stone-300 normal-case tracking-normal text-left shadow-xl`}>
        {children}
      </span>
    </span>
  );
}

function StatRow({ label, value, suffix, hex, info, align, sub }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-[10px] text-stone-500 tracking-wide">
        <span className="flex items-center">{label}<InfoDot align={align}>{info}</InfoDot></span>
        <span className="font-bold text-stone-200">{value}{suffix}</span>
      </div>
      <div className="h-1.5 bg-stone-800 mt-1">
        <div className="h-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: hex }} />
      </div>
      {sub && <div className="text-[9px] text-stone-500 mt-0.5 leading-snug">{sub}</div>}
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

// ---------- FLOOR MAP (Act One board) ----------
const ACT1_MAP_W = 200;
const ACT1_MAP_H = 128;
const EDGE_MIN_DRAW = 20;

// Small force-directed layout so people who move each other cluster together. Runs once
// per campaign (the influence map never changes mid-run), so the floor stays put.
function computeFloorLayout(workers, influence) {
  const n = workers.length;
  const pos = workers.map((w, i) => ({
    id: w.id,
    x: ACT1_MAP_W / 2 + 74 * Math.cos((2 * Math.PI * i) / n),
    y: ACT1_MAP_H / 2 + 46 * Math.sin((2 * Math.PI * i) / n),
  }));
  const idx = Object.fromEntries(pos.map((p, i) => [p.id, i]));
  for (let iter = 0; iter < 320; iter++) {
    const fx = new Array(n).fill(0);
    const fy = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const d2 = Math.max(0.01, dx * dx + dy * dy);
        const d = Math.sqrt(d2);
        const rep = 780 / d2;
        fx[i] += (dx / d) * rep; fy[i] += (dy / d) * rep;
        fx[j] -= (dx / d) * rep; fy[j] -= (dy / d) * rep;
      }
    }
    workers.forEach(w => {
      const i = idx[w.id];
      outgoingTies(influence, w.id).forEach(t => {
        const j = idx[t.id];
        if (j === undefined) return;
        const k = 0.008 + 0.022 * (t.weight / 100);
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        fx[i] += dx * k; fy[i] += dy * k;
        fx[j] -= dx * k; fy[j] -= dy * k;
      });
    });
    for (let i = 0; i < n; i++) {
      fx[i] += (ACT1_MAP_W / 2 - pos[i].x) * 0.006;
      fy[i] += (ACT1_MAP_H / 2 - pos[i].y) * 0.011;
      pos[i].x = Math.max(13, Math.min(ACT1_MAP_W - 13, pos[i].x + fx[i] * 0.5));
      pos[i].y = Math.max(11, Math.min(ACT1_MAP_H - 14, pos[i].y + fy[i] * 0.5));
    }
  }
  return Object.fromEntries(pos.map(p => [p.id, { x: p.x, y: p.y }]));
}

function Act1FloorMap({ workers, influence, layout, planEntries = [], onSelect, highlights = null, edgePulses = [], stepKey = 0, notes = null, focusId = null }) {
  const [hoverId, setHoverId] = useState(null);
  const anyRevealed = workers.some(w => w.revealed && !w.organizer);
  const active = hoverId != null ? hoverId : focusId;

  // An influence line is visible once you've mapped the person on the receiving end —
  // mapping the floor is finding out who listens to whom, not who talks.
  const edges = [];
  workers.forEach(a => {
    outgoingTies(influence, a.id).forEach(t => {
      const b = workers.find(x => x.id === t.id);
      if (!b || t.weight < EDGE_MIN_DRAW) return;
      if (!influenceKnown(a, b)) return;
      edges.push({ from: a, to: b, weight: t.weight });
    });
  });

  const nodeRadius = (w) => 4.2 + Math.min(4, knownInfluence(influence, workers, w.id) / 55);
  const plannedTargets = {};
  planEntries.forEach(e => {
    const key = e.targetId != null ? e.targetId : e.actorId;
    if (!plannedTargets[key]) plannedTargets[key] = [];
    plannedTargets[key].push(ACT1_ACTION[e.type].short);
  });
  const planArrows = planEntries.filter(e => e.targetId != null);

  const hovered = workers.find(w => w.id === active);
  const hoveredOut = hovered ? outgoingTies(influence, hovered.id).filter(t => influenceKnown(hovered, workers.find(w => w.id === t.id))) : [];
  const hoveredIn = hovered && hovered.revealed ? incomingTies(influence, hovered.id) : [];
  const nameOf = (id) => workers.find(w => w.id === id)?.name || "?";

  return (
    <div className="border-2 border-stone-800 bg-stone-900 card-perf mb-6">
      <div className="flex items-center justify-between px-3 pt-2 flex-wrap gap-y-1">
        <div className="font-stencil text-lg tracking-wide text-stone-200">THE FLOOR</div>
        <div className="flex items-center gap-3 text-[9px] text-stone-500 flex-wrap justify-end">
          {SUPPORT_TIERS.map(t => (
            <span key={t.label} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: t.hex }} />
              {t.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="inline-block rounded-full bg-stone-500" style={{ width: 5, height: 5 }} />
            <span className="inline-block rounded-full bg-stone-500" style={{ width: 10, height: 10 }} />
            SIZE = MAPPED INFLUENCE
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block" style={{ width: 3, height: 8, backgroundColor: FULFILL_HEX }} />
            BAR = FULFILLMENT
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-[9px] text-stone-500 flex-wrap px-3 pb-1">
        <span className="text-stone-600">TEAM:</span>
        {Object.keys(TEAM_LABEL).map(t => (
          <span key={t} className="flex items-center gap-1">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: TEAM_HEX[t] }} />
            {TEAM_LABEL[t]}
          </span>
        ))}
        <span className="flex items-center gap-1 ml-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-amber-400" />
          YOURS TO DIRECT
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-teal-400" />
          SIGNED A CARD
        </span>
      </div>
      <svg viewBox={`0 0 ${ACT1_MAP_W} ${ACT1_MAP_H}`} className="w-full block select-none">
        <defs>
          <marker id="inf-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#78716c" />
          </marker>
          <marker id="inf-arrow-hot" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#fbbf24" />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const a = layout[e.from.id];
          const b = layout[e.to.id];
          if (!a || !b) return null;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
          const rA = nodeRadius(e.from) + 0.8;
          const rB = nodeRadius(e.to) + 2.4;
          const x1 = a.x + (dx / d) * rA, y1 = a.y + (dy / d) * rA;
          const x2 = b.x - (dx / d) * rB, y2 = b.y - (dy / d) * rB;
          const hot = active != null && (e.from.id === active || e.to.id === active);
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={hot ? "#fbbf24" : "#57534e"}
              strokeWidth={(hot ? 0.35 : 0.18) + (e.weight / 100) * 0.7}
              strokeOpacity={active != null && !hot ? 0.18 : 0.75}
              markerEnd={hot ? "url(#inf-arrow-hot)" : "url(#inf-arrow)"}
            />
          );
        })}

        {planArrows.map((e, i) => {
          const a = layout[e.actorId];
          const b = layout[e.targetId];
          if (!a || !b) return null;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
          return (
            <line
              key={`plan-${i}`}
              x1={a.x + (dx / d) * 6} y1={a.y + (dy / d) * 6}
              x2={b.x - (dx / d) * 7} y2={b.y - (dy / d) * 7}
              stroke="#f59e0b" strokeWidth="0.55" strokeDasharray="1.6 1.2" strokeOpacity="0.9"
              markerEnd="url(#inf-arrow-hot)"
            />
          );
        })}

        {edgePulses.map((ev, i) => {
          const a = layout[ev.from];
          const b = layout[ev.to];
          if (!a || !b) return null;
          return (
            <line
              key={`pulse-${stepKey}-${i}`}
              className="edge-pulse"
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              pathLength="20"
              stroke={ev.tone === "down" ? "#f87171" : "#2dd4bf"}
              strokeWidth="0.9"
            />
          );
        })}

        {workers.map(w => {
          const p = layout[w.id];
          if (!p) return null;
          const r = nodeRadius(w);
          const tier = supportTier(w.support);
          const hl = highlights ? highlights[w.id] : null;
          const connected = active != null && (active === w.id || edges.some(e => (e.from.id === active && e.to.id === w.id) || (e.to.id === active && e.from.id === w.id)));
          const dimOthers = active != null && !connected;
          const planLabels = plannedTargets[w.id];
          return (
            <g
              key={w.id}
              transform={`translate(${p.x} ${p.y})`}
              opacity={w.burned ? 0.35 : dimOthers ? 0.4 : 1}
              className={w.burned ? "" : "cursor-pointer"}
              onClick={() => !w.burned && onSelect(w)}
              onMouseEnter={() => setHoverId(w.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              {planLabels && !w.burned && (
                <circle r={r + 2} fill="none" stroke="#f59e0b" strokeWidth="0.45" strokeDasharray="1.4 1" />
              )}
              {w.signed && !w.burned && (
                <circle r={r + 1.2} fill="none" stroke="#2dd4bf" strokeWidth="0.55" strokeOpacity="0.85" />
              )}
              {w.organizer && !w.burned && (
                <circle className="leader-pulse" r={r + 2.6} fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.6" />
              )}
              {hl && (hl.signed || hl.burned) && (
                <circle
                  key={`flash-${stepKey}-${w.id}`}
                  className="ring-flash"
                  r={r + 3}
                  fill="none"
                  stroke={hl.burned ? "#f87171" : "#2dd4bf"}
                />
              )}
              <circle r={r} fill="#1c1917" stroke={w.burned ? "#57534e" : tier.hex} strokeWidth="0.8" />
              {!w.burned && (
                <rect x={-(r + 1.4)} y={-(r + 1.4)} width="1.9" height="1.9" fill={TEAM_HEX[w.team]} />
              )}
              {!w.burned && (
                <g transform={`translate(${r + 1.1} ${-3})`}>
                  <rect width="0.9" height="6" fill="#292524" />
                  <rect y={6 - (6 * w.fulfillment) / 100} width="0.9" height={(6 * w.fulfillment) / 100} fill={FULFILL_HEX} />
                </g>
              )}
              {w.burned ? (
                <text textAnchor="middle" dominantBaseline="central" fontSize="4.2" fill="#78716c">✕</text>
              ) : (
                <text textAnchor="middle" dominantBaseline="central" fontSize="3.1" fill="#d6d3d1" fontFamily="'Courier New', monospace" fontWeight="bold">{w.support}</text>
              )}
              {hl && hl.delta !== 0 && !w.burned && (
                <text
                  key={`delta-${stepKey}-${w.id}`}
                  className="delta-float"
                  textAnchor="middle"
                  y={-(r + 2.2)}
                  fontSize="3.2"
                  fontWeight="bold"
                  fill={hl.delta > 0 ? "#2dd4bf" : "#f87171"}
                  fontFamily="'Courier New', monospace"
                >{hl.delta > 0 ? "+" : ""}{hl.delta}</text>
              )}
              <text textAnchor="middle" y={r + 3.6} fontSize="3" fill={w.burned ? "#57534e" : "#e7e5e4"} fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.1">{w.name.toUpperCase()}</text>
              {planLabels && (
                <text textAnchor="middle" y={r + 6.6} fontSize="2.3" fill="#fbbf24" fontFamily="'Courier New', monospace">{planLabels.join(" + ")}</text>
              )}
              {notes && notes[w.id] && (
                <g key={`note-${stepKey}-${w.id}`} className="note-float">
                  <rect x={-17} y={-(r + 12)} width={34} height={6.4} rx={1} fill="#1c1917" stroke="#57534e" strokeWidth="0.3" />
                  <text x={0} y={-(r + 8.2)} textAnchor="middle" fontSize="2.4" fill="#e7e5e4" fontFamily="'Courier New', monospace">{truncateNote(notes[w.id], 26)}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="border-t border-stone-800 px-3 py-2 min-h-[3.6rem]">
        {hovered ? (
          <div className="text-[10px] text-stone-400 leading-snug">
            <span className={`font-bold ${supportTier(hovered.support).text}`}>{hovered.name}{hovered.burned ? " (OUT OF PLAY)" : ""}</span>
            <span className="text-stone-500"> ({TEAM_LABEL[hovered.team]}) — support <span className="text-stone-300 font-bold">{hovered.support}</span> · {fulfillmentLabel(hovered.fulfillment).toLowerCase()} ({hovered.fulfillment}){hovered.signed ? " · SIGNED" : ""}</span>
            <span className="text-stone-500"> — {hovered.hook}</span>
            <div className="mt-0.5">
              {hoveredOut.length > 0 ? (
                <span className="text-stone-500">Moves: <span className="text-amber-400">{hoveredOut.map(t => `${nameOf(t.id)} (${t.weight})`).join(", ")}</span>. </span>
              ) : (
                <span className="text-stone-600 italic">No mapped influence on anyone yet. </span>
              )}
              {hovered.revealed ? (
                <span className="text-stone-500">Moved by: <span className="text-stone-300">{hoveredIn.length ? hoveredIn.map(t => `${nameOf(t.id)} (${t.weight})`).join(", ") : "nobody in particular"}</span>.</span>
              ) : (
                <span className="text-stone-600 italic">Who moves them: unmapped.</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-stone-600 italic">
            {anyRevealed
              ? "Arrows point from a person to whoever they can move; thicker means more influence. Numbers inside the circles are support. Click anyone to plan."
              : "You can see who your own two people reach. The rest of the floor's web — who moves whom — stays invisible until you map it. Click anyone to plan."}
          </div>
        )}
      </div>
    </div>
  );
}

function ActOneGame({ onGraduate }) {
  const [week, setWeek] = useState(1);
  const [phase, setPhase] = useState("intro"); // intro, plan, resolving, victory
  const [influence] = useState(() => generateInfluence(ACT1_WORKERS_SEED));
  const [workers, setWorkers] = useState(makeAct1Workers);
  const [planEntries, setPlanEntries] = useState([]); // {key, actorId, type, targetId?}
  const [heat, setHeat] = useState(0);
  const [resolutionSteps, setResolutionSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [wonOnWeek, setWonOnWeek] = useState(null);
  const pendingRef = useRef(null);
  const planKeyRef = useRef(0);

  const floorLayout = useMemo(() => computeFloorLayout(ACT1_WORKERS_SEED.map(w => ({ ...w })), influence), [influence]);

  const organizers = workers.filter(w => w.organizer && !w.burned);
  // Burned workers stay counted: they signed, and the petition doesn't un-sign them.
  // A burn already costs an organizer, their reach, and support across everyone they
  // carried — clawing the signature back on top of that made one bad roll unrecoverable.
  const signedCount = workers.filter(w => w.signed).length;
  const cardPct = Math.round((signedCount / ACT1_TOTAL_WORKERS) * 100);
  const hoursFor = (w) => (w.shaken > 0 ? 1 : ACT1_HOURS_PER_ORGANIZER);
  const hoursUsedBy = (id) => planEntries.filter(e => e.actorId === id).reduce((s, e) => s + ACT1_ACTION[e.type].hours, 0);
  const hoursLeftFor = (w) => hoursFor(w) - hoursUsedBy(w.id);
  const totalHours = organizers.reduce((s, o) => s + hoursFor(o), 0);
  const totalUsed = planEntries.reduce((s, e) => s + ACT1_ACTION[e.type].hours, 0);

  // Progressive unlocks — a mechanic introduces itself the week it first matters.
  const unlockMapping = week >= 2;
  const unlockPublic = week >= 2;
  const anyRevealedBeyondStart = workers.some(w => w.revealed && !w.organizer);
  const anyPublicDone = workers.some(w => w.history.some(h => h.includes("public")));
  const anyRecruitable = workers.some(w => w.signed && !w.organizer && !w.burned && w.support >= ACT1_RECRUIT_REQ);

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
    const bump = (worker, amount) => {
      worker.support = clamp(worker.support + amount);
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
      const gain = convoGain(actor, target, weight)[e.type];
      const before = target.support;
      bump(target, gain);
      target.revealed = true; // you learn who they listen to by sitting down with them
      convoPulses.push({ from: actor.id, to: target.id, tone: "up" });
      const flavor = weight >= 55
        ? `${actor.name} has real standing with them`
        : weight >= 25
          ? `${actor.name} gets a fair hearing`
          : `${actor.name} isn't someone they take cues from`;
      convoNotes[target.id] = weight >= 55 ? `${actor.name} lands hard` : weight >= 25 ? `${actor.name} gets heard` : `${actor.name} bounces off`;
      convoLines.push(`${target.name}: ${e.type === "deep" ? "a long, honest conversation" : "a quick word"} with ${actor.name} — ${flavor}. Support ${before} → ${target.support}.`);
      target.history.push(`Week ${week}: ${ACT1_ACTION[e.type].label.toLowerCase()} with ${actor.name} (+${target.support - before} support).`);
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
      heatNext = clamp(heatNext + tier.heat);
      const reached = outgoingTies(influence, actor.id).filter(t => {
        const target = byId(t.id);
        return target && !target.burned && t.weight >= EDGE_MIN_DRAW;
      });
      let moved = 0;
      reached.forEach(t => {
        const target = byId(t.id);
        const gain = publicGain(actor, target, t.weight, e.type, uses);
        if (gain <= 0) return;
        bump(target, gain);
        moved++;
        publicPulses.push({ from: actor.id, to: t.id, tone: "up" });
      });
      publicNotes[actor.id] = e.type === "large" ? "goes public, loudly" : e.type === "medium" ? "puts their name on it" : "wears the button";
      publicLines.push(`${actor.name} ${tier.blurb} ${moved > 0 ? `${moved} coworker${moved === 1 ? "" : "s"} who take cues from ${actor.name} move${uses > 0 ? " — though this isn't news anymore" : ""}.` : "Nobody who takes cues from them notices."}`);
      actor.history.push(`Week ${week}: took a ${e.type} public action.`);

      if (tier.burn > 0) {
        const lastOne = w.filter(x => x.organizer && !x.burned).length <= 1;
        const risk = tier.burn * (0.6 + heatNext / 100);
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
        target.support = Math.max(target.support, 78);
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
    planEntries.filter(e => e.type === "recruit").forEach(e => {
      const actor = byId(e.actorId);
      const target = byId(e.targetId);
      if (!actor || !target || target.burned || target.organizer || !target.signed || target.support < ACT1_RECRUIT_REQ) return;
      target.organizer = true;
      target.revealed = true;
      recruitNotes[target.id] = "joins the committee";
      recruitLines.push(`${target.name} joins the organizing committee. That's ${ACT1_HOURS_PER_ORGANIZER} more hours on the floor every week, and a whole set of relationships you couldn't reach before.`);
      target.history.push(`Week ${week}: joined the organizing committee.`);
    });
    if (recruitLines.length) steps.push({ label: "THE COMMITTEE GROWS", sub: "Every person you bring on is more time and more reach.", workers: w.map(x => ({ ...x })), lines: recruitLines, notes: recruitNotes });

    // --- THE FLOOR TALKS: signed workers keep working on the people they move, for free ---
    const passiveLines = [];
    const passivePulses = [];
    w.filter(x => x.signed && !x.burned).forEach(signer => {
      outgoingTies(influence, signer.id).forEach(t => {
        if (t.weight < 50) return;
        const target = byId(t.id);
        if (!target || target.burned || target.signed) return;
        const gain = Math.max(1, Math.round((t.weight / 100) * 2 * affinityMult(signer, target)));
        bump(target, gain);
        passivePulses.push({ from: signer.id, to: t.id, tone: "up" });
      });
    });
    w.forEach(x => {
      if (x.askedRecently > 0) x.askedRecently -= 1;
      if (x.shaken > 0) x.shaken -= 1;
      if (x.signed || x.burned) { x.quietWeeks = 0; return; }
      x.quietWeeks = touched.has(x.id) ? 0 : x.quietWeeks + 1;
      if (x.quietWeeks >= 3 && x.support > 25) {
        x.support = clamp(x.support - 2);
        x.quietWeeks = 0;
        passiveLines.push(`${x.name} hasn't heard from anybody in weeks. Whatever was building quietly drains back out.`);
      }
    });
    if (passivePulses.length) {
      passiveLines.unshift("Everyone who's signed keeps working on the people they carry weight with — no hours spent.");
    }
    if (passiveLines.length) steps.push({ label: "THE FLOOR TALKS", sub: "The campaign runs on its own between your hours — in both directions.", workers: w.map(x => ({ ...x })), lines: passiveLines, edgePulses: passivePulses });

    // --- MANAGEMENT ---
    // The hotter it has been, the more of it cools off over a quiet week — otherwise one
    // aggressive stretch pins heat at 100 and the shop never gets back off the radar.
    heatNext = clamp(heatNext - (5 + Math.floor(heatNext / 12)), 0, 100);
    const mgmtLines = [];
    if (heatNext >= 45 && Math.random() < 0.55) {
      const roll = rand(100);
      if (roll < 45) {
        mgmtLines.push("A mandatory all-hands appears on everyone's calendar: 'Why we work better talking directly.' Attendance is not optional.");
        w.forEach(x => {
          if (x.burned || x.signed) return;
          const hit = Math.max(2, Math.round(7 - x.support / 20));
          x.support = clamp(x.support - hit);
        });
        heatNext = clamp(heatNext - 8);
      } else if (roll < 78) {
        const lucky = [...w].filter(x => !x.burned).sort(() => Math.random() - 0.5).slice(0, 7);
        lucky.forEach(x => {
          x.fulfillment = clamp(x.fulfillment + 10);
          if (!x.signed) x.support = clamp(x.support - 3);
        });
        mgmtLines.push(`Corporate announces a surprise studio offsite, new hardware, and a hiring freeze lift. It works — ${lucky.length} people feel noticeably better about the job this week, and the ones you were counting on may not be who you thought.`);
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

    const signedNow = w.filter(x => x.signed).length;
    steps.push({
      label: "END OF WEEK",
      sub: `Week ${week} complete.`,
      workers: w.map(x => ({ ...x })),
      lines: [`${signedNow} of ${ACT1_TOTAL_WORKERS} cards signed — ${Math.round((signedNow / ACT1_TOTAL_WORKERS) * 100)}% of the floor. You need ${Math.round(ACT1_CARD_THRESHOLD * 100)}%.`],
    });

    setResolutionSteps(steps);
    setStepIndex(0);
    setPhase("resolving");
    pendingRef.current = { workers: w, heat: heatNext, won: signedNow >= ACT1_CARDS_NEEDED };
  }

  function commitWeek() {
    const { workers: w, heat: h, won } = pendingRef.current;
    setWorkers(w);
    setHeat(h);
    setPlanEntries([]);
    if (won) {
      setWonOnWeek(week);
      setPhase("victory");
      return;
    }
    setWeek(wk => wk + 1);
    setPhase("plan");
  }

  function startOver() {
    setWeek(1);
    setWorkers(makeAct1Workers());
    setPlanEntries([]);
    setHeat(0);
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

  const canResolve = planEntries.length > 0 && organizers.every(o => hoursLeftFor(o) >= 0);
  const overBudget = organizers.some(o => hoursLeftFor(o) < 0);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-mono">
      <GlobalStyle />
      <div className="border-b-2 border-stone-800 bg-stone-900 px-4 py-3 sm:px-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-stencil text-2xl sm:text-3xl tracking-wide text-amber-400">ONE SHOP</div>
          <div className="text-[10px] sm:text-xs tracking-[0.2em] text-stone-500">ACT ONE — CARDS ON THE TABLE</div>
        </div>
        {phase !== "intro" && (
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <div className="text-center">
              <div className="text-stone-500 text-[10px]">WEEK</div>
              <div className="text-lg font-bold text-stone-100">{week}</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-[10px]">CARDS SIGNED</div>
              <div className={`text-lg font-bold ${signedCount >= ACT1_CARDS_NEEDED ? "text-teal-400" : "text-amber-400"}`}>{signedCount} / {ACT1_CARDS_NEEDED}</div>
              <div className="text-[9px] text-stone-600">{cardPct}% of {ACT1_TOTAL_WORKERS} — need {Math.round(ACT1_CARD_THRESHOLD * 100)}%</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-[10px]">COMMITTEE</div>
              <div className="text-lg font-bold text-stone-100">{organizers.length}</div>
              <div className="text-[9px] text-stone-600">{totalHours} hrs/week</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-[10px] flex items-center gap-1"><Eye size={11} /> HEAT</div>
              <div className={`text-lg font-bold ${heat >= 60 ? "text-red-500" : heat >= 35 ? "text-amber-400" : "text-teal-400"}`}>{heat}</div>
            </div>
          </div>
        )}
      </div>

      {phase === "intro" && (
        <div className="max-w-2xl mx-auto px-6 py-14 anim-rise">
          <div className="font-stencil text-4xl text-amber-400 mb-4 text-center">TWO OF YOU. TWENTY OF THEM.</div>
          <div className="text-left border border-red-900 bg-red-950/20 p-3 mb-5">
            <p className="text-stone-300 text-sm leading-relaxed mb-3">
              Ownership stopped really listening a long time ago. Raises dried up. The studio used to feel like
              something worth building — now it belongs to a private equity firm three acquisitions deep.
            </p>
            <p className="text-stone-300 text-sm leading-relaxed mb-3">
              Six months ago, corporate stopped even pretending. They rolled out{" "}
              <span className="text-red-400 font-bold">PL-A-EYE</span>, an AI system that makes design decisions
              for the game your studio has spent four years crafting. It pushes updates, overrides your actual
              designers, and contradicts your playtesters. Appeal it and there's no one to appeal to.
            </p>
            <p className="text-stone-300 text-sm leading-relaxed">
              Two people on this floor are already sure about what has to happen next: <span className="text-amber-400 font-bold">Camille</span>, who
              was in a union at her last studio, and <span className="text-amber-400 font-bold">Wendell</span>, who
              was here before the acquisition. That's the whole campaign right now.
            </p>
          </div>
          <div className="text-left border border-stone-700 bg-stone-900/60 p-3 mb-5 space-y-2 text-xs text-stone-400 leading-relaxed">
            <div><span className="text-amber-400 font-bold">YOU DON'T TALK TO THE FLOOR YOURSELF.</span> You direct the people who are already in. Every hour you spend is Camille or Wendell having a conversation, taking a public stand, or asking someone to sign.</div>
            <div><span className="text-amber-400 font-bold">WHO ASKS MATTERS MORE THAN WHAT'S ASKED.</span> Influence runs person to person. A conversation between two people who move each other lands three times harder than the same conversation between strangers.</div>
            <div><span className="text-amber-400 font-bold">THE GOAL IS {Math.round(ACT1_CARD_THRESHOLD * 100)}%.</span> {ACT1_CARDS_NEEDED} signed cards out of {ACT1_TOTAL_WORKERS} workers and you can petition the NLRB for an election. There's no deadline — but the fewer weeks it takes, the better you did.</div>
          </div>
          <div className="text-center">
            <button onClick={() => setPhase("plan")} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
              I'M FED UP
            </button>
          </div>
        </div>
      )}

      {phase === "plan" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          {week === 1 && (
            <div className="mb-4 flex items-start gap-2 text-stone-300 text-xs border border-stone-700 bg-stone-900/60 px-3 py-2">
              <MessageCircle size={14} className="shrink-0 mt-0.5" />
              <span>Week one. Click anyone on the floor, pick which of your two people talks to them, and watch how much the choice of who matters. The number inside each circle is their support for unionizing.</span>
            </div>
          )}
          {unlockMapping && !anyRevealedBeyondStart && (
            <div className="mb-4 flex items-start gap-2 text-amber-300 text-xs border border-amber-700 bg-amber-950/30 px-3 py-2">
              <Radio size={14} className="shrink-0 mt-0.5" />
              <span><span className="font-bold text-amber-400">NEW — MAP THE FLOOR.</span> Influence is relationship-specific, and most of it is invisible. Spend 2 hours mapping to find out who actually moves whom — including relationships your own people don't have.</span>
            </div>
          )}
          {unlockPublic && !anyPublicDone && (
            <div className="mb-4 flex items-start gap-2 text-teal-300 text-xs border border-teal-700 bg-teal-950/30 px-3 py-2">
              <Megaphone size={14} className="shrink-0 mt-0.5" />
              <span><span className="font-bold text-teal-400">NEW — PUBLIC ACTIONS.</span> Instead of one conversation, have one of your people do something visible. It moves everyone they carry weight with at once, in proportion to that weight. The bigger the action, the bigger the ripple — and the bigger the chance management pulls them out of play.</span>
            </div>
          )}
          {anyRecruitable && (
            <div className="mb-4 flex items-start gap-2 text-teal-300 text-xs border border-teal-700 bg-teal-950/30 px-3 py-2">
              <UsersRound size={14} className="shrink-0 mt-0.5" />
              <span><span className="font-bold text-teal-400">SOMEONE'S READY TO ORGANIZE.</span> A signer with strong support can join the committee — {ACT1_HOURS_PER_ORGANIZER} more hours a week, and their relationships become yours to use.</span>
            </div>
          )}

          <Act1FloorMap
            workers={workers}
            influence={influence}
            layout={floorLayout}
            planEntries={planEntries}
            onSelect={(w) => setSelectedWorker(w)}
          />

          <div className="border-2 border-stone-800 bg-stone-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-stencil text-lg tracking-wide text-stone-200">PLAN WEEK {week}</div>
              <div className={`text-sm font-bold ${overBudget ? "text-red-500" : totalUsed === totalHours ? "text-teal-400" : "text-amber-400"}`}>
                {totalUsed} / {totalHours} HOURS
              </div>
            </div>
            <p className="text-[10px] text-stone-500 mb-3">
              Each person on the committee has {ACT1_HOURS_PER_ORGANIZER} hours a week. Click anyone on the floor to assign one of them a conversation, an ask, or a public action.
            </p>
            <div className="space-y-2 mb-3">
              {organizers.map(o => {
                const mine = planEntries.filter(e => e.actorId === o.id);
                const left = hoursLeftFor(o);
                return (
                  <div key={o.id} className={`border px-3 py-2 ${left < 0 ? "border-red-700 bg-red-950/20" : "border-stone-700"}`}>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setSelectedWorker(o)} className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">
                        {o.name} <span className="text-stone-500 font-normal">({TEAM_LABEL[o.team]})</span>
                      </button>
                      <span className={`text-[10px] font-bold ${left < 0 ? "text-red-400" : left === 0 ? "text-teal-400" : "text-stone-400"}`}>
                        {left} of {hoursFor(o)} hrs left{o.shaken > 0 ? " — under watch this week" : ""}
                      </span>
                    </div>
                    {mine.length === 0 ? (
                      <div className="text-[10px] text-stone-600 italic mt-1">Idle this week.</div>
                    ) : (
                      <div className="mt-1 space-y-0.5">
                        {mine.map(e => (
                          <div key={e.key} className="flex items-center justify-between text-[10px] text-stone-300">
                            <span>▸ {ACT1_ACTION[e.type].label}{e.targetId ? ` — ${workers.find(x => x.id === e.targetId)?.name}` : ""} <span className="text-stone-600">({ACT1_ACTION[e.type].hours}h)</span></span>
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          <Act1FloorMap
            workers={resStep.workers}
            influence={influence}
            layout={floorLayout}
            planEntries={[]}
            onSelect={() => {}}
            highlights={resHighlights}
            edgePulses={resStep.edgePulses || []}
            stepKey={stepIndex}
            notes={resNotes}
          />
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex-1 min-h-[1.5rem] text-xs text-stone-400 font-mono">
              <div className="text-[10px] text-amber-400 tracking-widest">{resStep.label}</div>
              {resBanner.map((line, i) => <div key={`${stepIndex}-${i}`}>▸ {line}</div>)}
            </div>
            <button onClick={commitWeek} className="shrink-0 text-[10px] text-stone-500 hover:text-amber-400 underline transition-colors">
              SKIP ▸▸
            </button>
          </div>
          {resolutionSteps.slice(0, stepIndex + 1).some(s => s.lines.length > 0) && (
            <div ref={resLogRef} className="bg-stone-950/60 border border-stone-800 p-2 space-y-0.5 max-h-24 overflow-y-auto">
              {resolutionSteps.slice(0, stepIndex + 1).map((s, si) =>
                s.lines.map((line, li) => (
                  <div key={`${si}-${li}`} className={`text-[10px] font-mono ${si === stepIndex ? "text-stone-400" : "text-stone-600"}`}>▸ {line}</div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {phase === "victory" && (
        <div className="max-w-xl mx-auto px-6 py-16 text-center anim-rise">
          <div className="font-stencil text-5xl mb-2 text-teal-400">THIRTY PERCENT</div>
          <div className="flex justify-center mb-3"><Stars count={act1Stars(wonOnWeek)} /></div>
          <p className="text-amber-400 text-sm mb-5">{signedCount} cards in {wonOnWeek} week{wonOnWeek === 1 ? "" : "s"} — the petition goes to the NLRB.</p>
          <p className="text-stone-400 mb-5 leading-relaxed text-sm">
            Enough of this floor has put their name on paper that the labor board has to take it seriously.
            An election gets scheduled. Nobody upstairs gets to pretend this is a few disgruntled people anymore.
          </p>
          <div className="text-left border border-stone-700 bg-stone-900/60 p-3 mb-5 text-[11px] text-stone-400 space-y-1">
            <div className="flex justify-between"><span className={wonOnWeek <= ACT1_STAR_WEEKS.three ? "text-amber-400" : ""}>★★★ — {ACT1_STAR_WEEKS.three} weeks or fewer</span><span>{wonOnWeek <= ACT1_STAR_WEEKS.three ? "EARNED" : ""}</span></div>
            <div className="flex justify-between"><span className={wonOnWeek > ACT1_STAR_WEEKS.three && wonOnWeek <= ACT1_STAR_WEEKS.two ? "text-amber-400" : ""}>★★ — {ACT1_STAR_WEEKS.two} weeks or fewer</span><span>{wonOnWeek > ACT1_STAR_WEEKS.three && wonOnWeek <= ACT1_STAR_WEEKS.two ? "EARNED" : ""}</span></div>
            <div className="flex justify-between"><span className={wonOnWeek > ACT1_STAR_WEEKS.two ? "text-amber-400" : ""}>★ — got there</span><span>{wonOnWeek > ACT1_STAR_WEEKS.two ? "EARNED" : ""}</span></div>
          </div>
          <div className="text-left border border-teal-900 bg-teal-950/20 p-3 mb-6">
            <div className="text-[10px] text-teal-400 font-bold mb-2 tracking-wide">THE COMMITTEE THAT GOT IT THERE:</div>
            {organizers.map(w => (
              <div key={w.id} className="text-xs text-stone-300 mb-1">
                <span className="font-bold text-stone-100">{w.name}</span> — {w.hook}
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={() => graduate(true)} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
              GET CALLED UP
            </button>
            <button onClick={startOver} className="font-stencil text-xl border-2 border-stone-700 hover:border-stone-500 text-stone-300 px-8 py-3 tracking-wide transition-colors">
              RUN IT FASTER
            </button>
          </div>
        </div>
      )}

      {selectedWorker && phase === "plan" && (
        <Act1WorkerModal
          worker={workers.find(w => w.id === selectedWorker.id) || selectedWorker}
          allWorkers={workers}
          influence={influence}
          organizers={organizers}
          hoursLeftFor={hoursLeftFor}
          hoursFor={hoursFor}
          unlockPublic={unlockPublic}
          unlockMapping={unlockMapping}
          onPlan={(actorId, type, targetId) => { addPlan(actorId, type, targetId); setSelectedWorker(null); }}
          onClose={() => setSelectedWorker(null)}
        />
      )}

      {phase !== "intro" && (
        <div className="fixed bottom-2 left-2 z-40">
          {confirmStartOver ? (
            <div className="flex items-center gap-2 bg-stone-900 border border-stone-700 px-2 py-1.5 text-[10px]">
              <span className="text-stone-500">Restart Act One from scratch?</span>
              <button onClick={startOver} className="text-red-400 hover:text-red-300 font-bold">YES</button>
              <button onClick={() => setConfirmStartOver(false)} className="text-stone-500 hover:text-stone-300">CANCEL</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmStartOver(true)}
              className="text-[10px] text-stone-600 hover:text-stone-400 underline transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      )}

      {phase !== "intro" && (
        <div className="fixed bottom-2 right-2 z-40">
          <button
            onClick={() => graduate(false)}
            title="Jumps to Act Two for testing without saving over your real Act One progress."
            className="text-[10px] text-stone-600 hover:text-stone-400 underline transition-colors"
          >
            Skip to Phase 2 (playtest — doesn't save)
          </button>
        </div>
      )}
    </div>
  );
}

function Act1WorkerModal({ worker, allWorkers, influence, organizers, hoursLeftFor, hoursFor, unlockPublic, unlockMapping, onPlan, onClose }) {
  const others = organizers.filter(o => o.id !== worker.id);
  const [actorId, setActorId] = useState(() => {
    if (worker.organizer) return worker.id;
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
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-xs font-bold ${supportTier(worker.support).text}`}>{supportTier(worker.support).label}</span>
          <span className="flex items-center gap-1 text-[10px] text-stone-500">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: TEAM_HEX[worker.team] }} />
            {TEAM_LABEL[worker.team]}
          </span>
          {worker.signed && <span className="text-[10px] font-bold text-teal-400 border border-teal-800 px-1.5">CARD SIGNED</span>}
          {worker.organizer && <span className="text-[10px] font-bold text-amber-400 border border-amber-800 px-1.5">ON THE COMMITTEE</span>}
        </div>
        <p className="text-xs text-stone-400 mb-4">{worker.hook}</p>

        <div className="border border-stone-800 bg-stone-950/50 p-3 mb-4">
          <StatRow
            label="SUPPORT FOR UNIONIZING"
            value={worker.support}
            hex={supportTier(worker.support).hex}
            info={STAT_INFO.support}
            align="left"
            sub={worker.signed ? "Already signed a card." : worker.support >= 80 ? "Ready to be asked." : worker.support >= 55 ? "With you in principle. Not yet a signature." : "Not close to putting their name on anything."}
          />
          <StatRow
            label="JOB FULFILLMENT"
            value={worker.fulfillment}
            hex={FULFILL_HEX}
            info={STAT_INFO.fulfillment}
            align="left"
            sub={`${fulfillmentLabel(worker.fulfillment)} — this says nothing about whether they'll sign, only about who can move them.`}
          />
          <div className="mb-1">
            <div className="flex items-center justify-between text-[10px] text-stone-500 tracking-wide">
              <span className="flex items-center">INFLUENCE<InfoDot align="left">{STAT_INFO.influence}</InfoDot></span>
              <span className="font-bold text-stone-200">{out.length ? `${out.length} mapped relationship${out.length === 1 ? "" : "s"}` : "none mapped"}</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-1 leading-relaxed">
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
          </div>
        </div>

        {worker.history.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-stone-500 font-bold mb-1 tracking-wide">HISTORY</div>
            <div className="bg-stone-950 border border-stone-800 p-2 max-h-24 overflow-y-auto space-y-1">
              {worker.history.map((h, i) => (<div key={i} className="text-[10px] text-stone-400">▸ {h}</div>))}
            </div>
          </div>
        )}

        {worker.burned ? (
          <div className="text-xs text-red-400">This person is out of play for the rest of the campaign.</div>
        ) : isSelfPanel ? (
          <div className="space-y-2">
            <div className="text-[10px] text-stone-500 tracking-wide">
              {worker.name} HAS <span className="text-amber-400 font-bold">{hoursLeftFor(worker)}</span> OF {hoursFor(worker)} HOURS LEFT
              {worker.shaken > 0 && <span className="text-red-400"> — under a manager's eye this week</span>}
            </div>
            {!unlockPublic && (
              <div className="text-[10px] text-stone-600 italic border border-stone-800 px-3 py-2">
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
                  <div className="text-xs text-stone-100 flex justify-between">
                    <span>{ACT1_ACTION[tier].label}</span>
                    <span className="text-stone-500">{ACT1_ACTION[tier].hours}h</span>
                  </div>
                  <div className="text-[10px] text-stone-400 leading-snug mt-0.5">{t.blurb}</div>
                  <div className="text-[10px] text-teal-400 leading-snug mt-0.5">
                    Reaches {p.count} coworker{p.count === 1 ? "" : "s"} along their influence{p.knownCount > 0 ? ` — about +${p.total} support in total across the ${p.knownCount} you've mapped` : ", none of them mapped yet"}.
                  </div>
                  {p.uses > 0 && (
                    <div className="text-[10px] text-amber-500 leading-snug mt-0.5">
                      {worker.name} has already done this {p.uses === 1 ? "once" : `${p.uses} times`} — it isn't news anymore. Escalating lands harder than repeating.
                    </div>
                  )}
                  {t.burn > 0 && (
                    <div className="text-[10px] text-red-400 leading-snug mt-0.5">
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
                <div className="text-xs text-stone-100 flex justify-between"><span>{ACT1_ACTION.map.label}</span><span className="text-stone-500">{ACT1_ACTION.map.hours}h</span></div>
                <div className="text-[10px] text-stone-400 leading-snug mt-0.5">Spend the week listening instead of talking. Reveals who moves three more people — and by how much.</div>
              </button>
            )}
          </div>
        ) : others.length === 0 ? (
          <div className="text-xs text-stone-500">Nobody on the committee is free to work on {worker.name} right now.</div>
        ) : (
          <div>
            <div className="text-[10px] text-stone-500 font-bold mb-1 tracking-wide">WHO DOES IT</div>
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
                    <div className="text-[11px] text-stone-100">{o.name}</div>
                    <div className={`text-[9px] ${hoursLeftFor(o) <= 0 ? "text-red-400" : "text-stone-500"}`}>
                      {hoursLeftFor(o)}h left · influence {wgtKnown ? wgt : "?"}
                    </div>
                  </button>
                );
              })}
            </div>
            {actor && (
              <div className="text-[10px] text-stone-400 border border-stone-800 bg-stone-950/50 px-2.5 py-2 mb-3 leading-relaxed">
                {weightKnown ? (
                  <>
                    <span className="text-stone-300 font-bold">{actor.name} → {worker.name}: influence {weight}.</span>{" "}
                    {weight >= 55 ? "Real standing — this is who should be doing it." : weight >= 25 ? "Some standing. It'll land, but not hard." : "Almost none. Whatever they say bounces off."}
                  </>
                ) : (
                  <><span className="text-stone-300 font-bold">Influence unmapped.</span> Numbers below assume an average relationship — map {worker.name} to see the real ones.</>
                )}
                <br />
                On fulfillment, {affinityLabel(actor, worker)} ({actor.fulfillment} vs {worker.fulfillment}) — everything {actor.name} does lands at <span className="text-stone-300 font-bold">{Math.round(affinityMult(actor, worker) * 100)}%</span> strength with {worker.name}.
                {hoursLeftFor(actor) <= 0 && (
                  <><br /><span className="text-red-400">{actor.name} has no hours left this week — pick someone else, or free up an hour in the plan below.</span></>
                )}
              </div>
            )}

            <div className="space-y-2">
              {["quick", "deep"].map(type => (
                <button
                  key={type}
                  disabled={!canAfford(type)}
                  onClick={() => onPlan(actor.id, type, worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford(type) ? "border-stone-700 hover:bg-stone-800/60" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-xs text-stone-100 flex justify-between">
                    <span>{ACT1_ACTION[type].label}</span>
                    <span className="text-stone-500">{ACT1_ACTION[type].hours}h</span>
                  </div>
                  <div className="text-[10px] text-stone-400 leading-snug mt-0.5">
                    {weightKnown ? "+" : "≈+"}{gains[type]} support for {worker.name}.
                    {type === "deep" ? " A real sit-down — the kind of conversation that only works if they'd take the call." : " Cheap, fast, shallow."}
                  </div>
                </button>
              ))}

              {!worker.signed && (
                <button
                  disabled={!canAfford("ask")}
                  onClick={() => onPlan(actor.id, "ask", worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford("ask") ? "border-teal-800 hover:bg-teal-950/30" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-xs text-teal-300 flex justify-between">
                    <span>{ACT1_ACTION.ask.label}</span>
                    <span className="text-stone-500">{ACT1_ACTION.ask.hours}h</span>
                  </div>
                  <div className="text-[10px] text-stone-400 leading-snug mt-0.5">
                    {worker.support < 46
                      ? "They are nowhere near ready. Asking now would be worse than not asking."
                      : `${weightKnown ? "~" : "≈"}${pctOf(chance)}% they sign, from ${actor.name}.`}
                    {worker.askedRecently > 0 && " They were asked recently — it's a harder sell right now."}
                  </div>
                  <div className="text-[10px] text-stone-500 leading-snug mt-0.5">
                    Odds are read off their support before this week's conversations land — talk to them first and the ask gets easier.
                  </div>
                  <div className="text-[10px] text-red-400 leading-snug mt-0.5">If they say no: −5 support, and the next ask is harder.</div>
                </button>
              )}

              {worker.signed && !worker.organizer && (
                <button
                  disabled={!canAfford("recruit") || worker.support < ACT1_RECRUIT_REQ}
                  onClick={() => onPlan(actor.id, "recruit", worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford("recruit") && worker.support >= ACT1_RECRUIT_REQ ? "border-amber-700 hover:bg-amber-950/30" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-xs text-amber-300 flex justify-between">
                    <span>{ACT1_ACTION.recruit.label}</span>
                    <span className="text-stone-500">{ACT1_ACTION.recruit.hours}h</span>
                  </div>
                  <div className="text-[10px] text-stone-400 leading-snug mt-0.5">
                    {worker.support < ACT1_RECRUIT_REQ
                      ? `Needs ${ACT1_RECRUIT_REQ} support to take this on — they're at ${worker.support}.`
                      : `${worker.name} starts organizing too: +${ACT1_HOURS_PER_ORGANIZER} hours every week, and their relationships become yours to direct.`}
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
          <p className="text-stone-400 text-sm leading-relaxed mb-6">
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
            className="text-xs text-stone-500 hover:text-stone-300 underline"
          >
            Replay One Shop from the start instead
          </button>
        </div>
      </div>
    );
  } else if (act === "shop") {
    content = <ActOneGame onGraduate={handleGraduate} />;
  } else {
    content = <ActTwoGame recruitedLeaders={recruitedLeaders} onFullRestart={handleFullRestart} />;
  }

  return (
    <div>
      {content}
      <div className="text-center text-xs text-stone-600 py-4">
        A <a href="https://permadeathmedia.com" target="_blank" rel="noopener noreferrer" className="hover:text-stone-400 transition-colors">Permadeath Studio</a> game
      </div>
    </div>
  );
}
