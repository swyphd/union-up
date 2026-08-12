import React, { useState, useEffect, useMemo, useRef } from "react";
import { AlertTriangle, Users, Eye, Zap, Scale, ClipboardList, Vote, ChevronRight, X, Circle, CheckCircle2, FileWarning, Wrench, MessageCircle, Radio, Megaphone, HandCoins, UsersRound, Brain } from "lucide-react";

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
const roll100 = () => rand(100) + 1;

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
  petitioned: { label: "PETITION FILED", color: "text-amber-400" },
  campaign: { label: "ELECTION CAMPAIGN", color: "text-red-400" },
  won: { label: "UNIONIZED", color: "text-teal-400" },
  lost: { label: "ELECTION LOST", color: "text-red-500" },
  abandoned: { label: "DEPRIORITIZED", color: "text-stone-500" },
};
const ACT2_STATUS_HEX = {
  organizing: "#d6d3d1",
  petitioned: "#fbbf24",
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
  const teamTraits = recruitedLeaders.map(l => l.trait);
  const hasTrait = (t) => teamTraits.includes(t);
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
  const [resolutionSteps, setResolutionSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [log, setLog] = useState([]);
  const pendingRef = useRef(null);

  const workforce = (l) => l.workers;
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

      let gain = baseGain(units) + (hasTrait("morale") && units > 0 ? 2 : 0);
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
      const committeeMoraleBonus = newCommittee.active ? (hasTrait("committee") ? 5 : 3) : 0;
      const committeeSupportBonus = newCommittee.active ? (hasTrait("committee") ? 4 : 2) : 0;
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
            if (Math.random() < (hasTrait("legal") ? 0.97 : 0.9)) {
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
      if (newAntiUnion.active) {
        if (r.counter) {
          feedbackLines.push(`${l.name}: Organizer knocks down anti-union talk before it spreads.${hasTrait("antiunion") ? " (a team member who's been through this before makes it land harder)" : ""}`);
          newAntiUnion = { active: false, turnsLeft: 0 };
          if (hasTrait("antiunion")) grievanceBonus += 3;
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

      let moraleGain = gain + recruitedBonus - momentumPenalty + grievanceBonus - antiUnionPenalty + climateGain + eventMoraleBurst + committeeMoraleBonus;
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
      if (retaliationLines.length > 0) decay += 3;
      if (totalAllocated <= 1) decay = -2; // rest recovers
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
          if (l.status !== "organizing" && l.status !== "petitioned") return l;
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
      setPhase(wonCount >= 2 ? "gameover-win" : "gameover-loss");
      return;
    }

    const escalationReady = workingLocs.find(l => l.status === "organizing" && l.morale >= 70);
    setTurn(t => t + 1);
    if (escalationReady) {
      setEscalationTarget(escalationReady.id);
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
    setPhase("allocate");
  }

  const remaining = 10 - totalAllocated;
  const locByStatus = (s) => locations.filter(l => l.status === s);
  const escLoc = locations.find(l => l.id === escalationTarget);

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

          <Act2NetworkMap locations={locations} allocations={allocations} onSelect={(loc) => setSelectedLoc(loc)} />

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

      {/* RESOLUTION ANIMATION */}
      {phase === "resolving" && resolutionSteps.length > 0 && (
        <ResolutionModal
          steps={resolutionSteps}
          stepIndex={stepIndex}
          onNext={() => {
            if (stepIndex < resolutionSteps.length - 1) setStepIndex(i => i + 1);
            else commitResolution();
          }}
        />
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

function Act2NetworkMap({ locations, allocations = {}, onSelect, edgePulses = [], stepKey = 0 }) {
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
              <circle r={r} fill="#1c1917" stroke={ACT2_STATUS_HEX[loc.status]} strokeWidth="0.9" />
              {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r="1.1" fill={moraleHex(loc)} />
              ))}
              <text textAnchor="middle" y={r + 5} fontSize="3.6" fill="#e7e5e4" fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.1">{loc.name}</text>
              <text textAnchor="middle" y={r + 9} fontSize="2.6" fill={ACT2_STATUS_HEX[loc.status]} fontFamily="'Courier New', monospace">{statusMeta[loc.status].label}</text>
              {allocation > 0 && (
                <text textAnchor="middle" y={r + 13} fontSize="2.4" fill="#fbbf24" fontFamily="'Courier New', monospace">PLANNED</text>
              )}
              {needsResponse && !dim && (
                <circle cx={r * 0.75} cy={-r * 0.75} r="1.6" fill="#f87171" />
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

function ResolutionModal({ steps, stepIndex, onNext }) {
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 px-4">
      <div className="bg-stone-900 border-2 border-amber-500 max-w-2xl w-full p-5 anim-rise max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <div className="font-stencil text-xl text-amber-400 tracking-wide">{step.label}</div>
          <div className="text-[10px] text-stone-500">{stepIndex + 1} / {steps.length}</div>
        </div>
        <div className="text-xs text-stone-500 mb-3">{step.sub}</div>

        <Act2NetworkMap
          locations={step.locs}
          onSelect={() => {}}
          edgePulses={step.edgePulses || []}
          stepKey={stepIndex}
        />

        {step.org && (
          <div className="text-[10px] text-stone-500 mb-3 flex items-center gap-1"><Zap size={10} /> Organizer stamina: <span className="text-stone-200 font-bold">{step.org.stamina}</span></div>
        )}

        {step.lines.length > 0 && (
          <div className="bg-stone-950 border border-stone-800 p-3 mb-4 space-y-1 max-h-32 overflow-y-auto">
            {step.lines.map((line, i) => (
              <div key={i} className="text-xs text-stone-300 font-mono">▸ {line}</div>
            ))}
          </div>
        )}

        <button onClick={onNext} className="w-full font-stencil text-lg bg-amber-500 hover:bg-amber-400 text-stone-950 py-2 tracking-wide flex items-center justify-center gap-1">
          {isLast ? "CONTINUE" : "NEXT"} <ChevronRight size={18} />
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
// ACT ONE — ONE SHOP. Structure tests, organic leaders, whole-worker organizing.
// =====================================================================================

const ACT1_WEEKS = 10;
const ACT1_HOURS_PER_WEEK = 8;
const STAGE_ORDER = ["hostile", "skeptical", "sympathetic", "leader"];
const STAGE_LABEL = { hostile: "HOSTILE", skeptical: "SKEPTICAL", sympathetic: "SYMPATHETIC", leader: "LEADER" };
const STAGE_COLOR = { hostile: "text-red-400", skeptical: "text-stone-400", sympathetic: "text-amber-400", leader: "text-teal-400" };
const TRAIT_LABEL = { legal: "legal grievances", antiunion: "countering anti-union pressure", committee: "building shop committees", morale: "keeping morale up" };
const BURN_NARRATIVES = [
  (name) => `${name} signs the card right as a manager who wasn't even supposed to be on shift walks by. Seen.`,
  (name) => `${name} gets turned in — somebody they trusted mentioned it to the wrong person.`,
  (name) => `${name} posts about it that night. It's back to corporate HR by morning.`,
  (name) => `${name} freezes halfway through, panics, and blurts out more than intended. Word travels fast after that.`,
];

const ACT1_WORKERS_SEED = [
  { id: 1, name: "Marisol", hook: "Was coded as a senior engineer for six years. After coming back from parental leave, she got her first-ever 'needs improvement' review — same work, different score.", ties: [6, 9], stage: "hostile", trait: "committee" },
  { id: 2, name: "Dante", hook: "New hire, six months in. Just happy to be here making games. Doesn't realize yet that being new makes him easy to cut first.", ties: [6], stage: "hostile", trait: "morale" },
  { id: 3, name: "Priya", hook: "Works crunch every launch cycle. Her health is suffering but she's afraid saying no will tank her stack ranking.", ties: [9], stage: "skeptical", trait: "legal" },
  { id: 4, name: "Wendell", hook: "Was here before the PE acquisition. Remembers when there was profit-sharing, real raises, and you could push back on a deadline.", ties: [9], stage: "skeptical", trait: "legal" },
  { id: 5, name: "Ashanti", hook: "Posts about everything. First to call out problems publicly, first to get quietly 'counseled' about her tone.", ties: [6], stage: "skeptical", trait: "antiunion" },
  { id: 6, name: "Miguel", hook: "The load-bearing engineer. Everyone routes their hardest problems to him. He does the work of two people and it shows on his face.", ties: [9], stage: "hostile", trait: "committee" },
  { id: 7, name: "Brianna", hook: "Transferred in from the studio they acquired last year. Still learning how this one works.", ties: [4], stage: "hostile", trait: "morale" },
  { id: 8, name: "Tyrell", hook: "His PerfAxis score dropped 12 points last quarter. He still doesn't know why. There's no one to ask.", ties: [4, 11], stage: "skeptical", trait: "antiunion" },
  { id: 9, name: "Sofia", hook: "Unofficial team mom. The first to notice when people are struggling before anyone else does.", ties: [4], stage: "hostile", trait: "committee" },
  { id: 10, name: "Jake", hook: "His hours are technically 40 but the Slack pings don't stop until midnight. He's been tracking it. Nobody's compensating him for it.", ties: [4], stage: "hostile", trait: "morale" },
  { id: 11, name: "Camille", hook: "Was in a union at her last studio. Doesn't advertise it.", ties: [6], stage: "sympathetic", trait: "legal" },
];

function generateRandomTies(ids) {
  const ties = {};
  ids.forEach(id => {
    const others = ids.filter(oid => oid !== id);
    const count = 1 + Math.floor(Math.random() * 3); // 1-3 ties each
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    ties[id] = shuffled.slice(0, count);
  });
  return ties;
}

function makeAct1Workers() {
  const trustByStage = { hostile: 10, skeptical: 35, sympathetic: 60, leader: 100 };
  const ids = ACT1_WORKERS_SEED.map(w => w.id);
  const randomTies = generateRandomTies(ids);
  return ACT1_WORKERS_SEED.map(w => ({
    ...w,
    ties: randomTies[w.id],
    trust: trustByStage[w.stage],
    burned: false,
    revealed: false,
    passedSmall: false,
    passedMedium: false,
    passedBig: false,
    history: [],
  }));
}

function act1Influence(workers, id) {
  return workers.filter(w => w.ties.includes(id)).length;
}
function act1Followers(workers, id) {
  return workers.filter(w => w.ties.includes(id) && !w.burned);
}
function act1FollowerNames(workers, id) {
  return workers.filter(w => w.ties.includes(id)).map(w => w.name);
}
function act1TrustsNames(workers, worker) {
  return worker.ties.map(tId => workers.find(w => w.id === tId)?.name).filter(Boolean);
}
function stageIndex(stage) { return STAGE_ORDER.indexOf(stage); }
const STAGE_FLOOR = { hostile: 0, skeptical: 30, sympathetic: 60, leader: 90 };

// Shared odds math — resolveWeek rolls against these same numbers, so what the
// player is shown before committing is exactly what the dice use.
// includeTies=false computes the floor a player can see without having mapped this worker.
function act1ConvoChance(worker, allWorkers, isDeep, includeTies) {
  let chance = isDeep ? 0.70 : 0.30;
  let tieBoost = 0;
  if (includeTies) {
    tieBoost = Math.min(2, worker.ties.filter(tId => {
      const t = allWorkers.find(x => x.id === tId);
      return t && stageIndex(t.stage) >= 2;
    }).length);
  }
  chance += tieBoost * 0.10;
  return { chance: Math.min(0.9, chance), tieBoost };
}
function act1TestChance(worker, allWorkers, tier, includeTies) {
  const base = tier === "small" ? 0.70 : tier === "medium" ? 0.50 : 0.35;
  let chance = base + Math.min(0.15, (worker.trust - STAGE_FLOOR[worker.stage]) / 200);
  let peerPassed = false;
  if (includeTies) {
    peerPassed = worker.ties.some(tId => {
      const t = allWorkers.find(x => x.id === tId);
      return t && (tier === "small" ? t.passedSmall : tier === "medium" ? t.passedMedium : t.passedBig);
    });
  }
  if (peerPassed) chance += 0.15;
  return { chance: Math.min(0.92, chance), peerPassed };
}

// ---------- FLOOR MAP (Act One board) ----------
const MAP_W = 160;
const MAP_H = 100;
const STAGE_HEX = { hostile: "#f87171", skeptical: "#a8a29e", sympathetic: "#fbbf24", leader: "#2dd4bf" };

// Small force-directed layout so people who trust each other cluster together.
// Runs once per campaign (ties never change mid-run), so the floor stays put week to week.
function computeFloorLayout(workers) {
  const n = workers.length;
  const pos = workers.map((w, i) => ({
    id: w.id,
    x: MAP_W / 2 + 55 * Math.cos((2 * Math.PI * i) / n),
    y: MAP_H / 2 + 34 * Math.sin((2 * Math.PI * i) / n),
  }));
  const idx = Object.fromEntries(pos.map((p, i) => [p.id, i]));
  for (let iter = 0; iter < 300; iter++) {
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
      w.ties.forEach(tId => {
        const j = idx[tId];
        if (j === undefined) return;
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        fx[i] += dx * 0.03; fy[i] += dy * 0.03;
        fx[j] -= dx * 0.03; fy[j] -= dy * 0.03;
      });
    });
    for (let i = 0; i < n; i++) {
      fx[i] += (MAP_W / 2 - pos[i].x) * 0.006;
      fy[i] += (MAP_H / 2 - pos[i].y) * 0.010;
      pos[i].x = Math.max(12, Math.min(MAP_W - 12, pos[i].x + fx[i] * 0.5));
      pos[i].y = Math.max(11, Math.min(MAP_H - 15, pos[i].y + fy[i] * 0.5));
    }
  }
  return Object.fromEntries(pos.map(p => [p.id, { x: p.x, y: p.y }]));
}

function Act1FloorMap({ workers, layout, plan, onSelect, highlights = null, edgePulses = [], stepKey = 0 }) {
  const [hoverId, setHoverId] = useState(null);
  const anyRevealed = workers.some(w => w.revealed);

  // An edge is public knowledge once either end has been mapped.
  const edges = [];
  workers.forEach(w => {
    w.ties.forEach(tId => {
      const t = workers.find(x => x.id === tId);
      if (t && (w.revealed || t.revealed)) edges.push({ from: w, to: t });
    });
  });

  const nodeRadius = (w) => {
    if (!w.revealed) return 4.5;
    return 4.5 + Math.min(4, act1Influence(workers, w.id)) * 0.7;
  };

  const hovered = workers.find(w => w.id === hoverId);

  return (
    <div className="border-2 border-stone-800 bg-stone-900 card-perf mb-6">
      <div className="flex items-center justify-between px-3 pt-2">
        <div className="font-stencil text-lg tracking-wide text-stone-200">THE FLOOR</div>
        <div className="flex items-center gap-3 text-[9px] text-stone-500">
          {STAGE_ORDER.map(s => (
            <span key={s} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: STAGE_HEX[s] }} />
              {STAGE_LABEL[s]}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full block select-none">
        <defs>
          <marker id="tie-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#78716c" />
          </marker>
          <marker id="tie-arrow-hot" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
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
          const rB = nodeRadius(e.to) + 2.2;
          const x1 = a.x + (dx / d) * rA, y1 = a.y + (dy / d) * rA;
          const x2 = b.x - (dx / d) * rB, y2 = b.y - (dy / d) * rB;
          const hot = hoverId != null && (e.from.id === hoverId || e.to.id === hoverId);
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={hot ? "#fbbf24" : "#57534e"}
              strokeWidth={hot ? 0.6 : 0.35}
              strokeOpacity={hoverId != null && !hot ? 0.25 : 0.8}
              markerEnd={hot ? "url(#tie-arrow-hot)" : "url(#tie-arrow)"}
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
          const planned = plan[w.id] && !w.burned;
          const hl = highlights ? highlights[w.id] : null;
          const dimOthers = hoverId != null && hoverId !== w.id
            && !edges.some(e => (e.from.id === hoverId && e.to.id === w.id) || (e.to.id === hoverId && e.from.id === w.id));
          return (
            <g
              key={w.id}
              transform={`translate(${p.x} ${p.y})`}
              opacity={w.burned ? 0.35 : dimOthers ? 0.45 : 1}
              className={w.burned ? "" : "cursor-pointer"}
              onClick={() => !w.burned && onSelect(w)}
              onMouseEnter={() => setHoverId(w.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              {planned && (
                <circle r={r + 1.8} fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1.4 1" />
              )}
              {w.stage === "leader" && !w.burned && (
                <circle className="leader-pulse" r={r + 1.1} fill="none" stroke="#2dd4bf" strokeWidth="0.35" strokeOpacity="0.6" />
              )}
              {hl && (hl.stageChange !== 0 || hl.burned) && (
                <circle
                  key={`flash-${stepKey}-${w.id}`}
                  className="ring-flash"
                  r={r + 2.4}
                  fill="none"
                  stroke={hl.burned || hl.stageChange < 0 ? "#f87171" : "#2dd4bf"}
                />
              )}
              <circle r={r} fill="#1c1917" stroke={w.burned ? "#57534e" : STAGE_HEX[w.stage]} strokeWidth="0.8" />
              {w.burned ? (
                <text textAnchor="middle" dominantBaseline="central" fontSize="4.5" fill="#78716c">✕</text>
              ) : (
                <text textAnchor="middle" dominantBaseline="central" fontSize="3.2" fill="#d6d3d1" fontFamily="'Courier New', monospace" fontWeight="bold">{w.trust}</text>
              )}
              {hl && hl.delta !== 0 && !w.burned && (
                <text
                  key={`delta-${stepKey}-${w.id}`}
                  className="delta-float"
                  textAnchor="middle"
                  y={-(r + 2.2)}
                  fontSize="3.4"
                  fontWeight="bold"
                  fill={hl.delta > 0 ? "#2dd4bf" : "#f87171"}
                  fontFamily="'Courier New', monospace"
                >{hl.delta > 0 ? "+" : ""}{hl.delta}</text>
              )}
              <text textAnchor="middle" y={r + 4} fontSize="3.4" fill={w.burned ? "#57534e" : "#e7e5e4"} fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.1">{w.name.toUpperCase()}</text>
              {planned && (
                <text textAnchor="middle" y={r + 7.5} fontSize="2.4" fill="#fbbf24" fontFamily="'Courier New', monospace">{ACT1_ACTION_LABEL[plan[w.id].type].replace(/ \(\d+h\)$/, "")}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="border-t border-stone-800 px-3 py-2 min-h-[3.25rem]">
        {hovered ? (
          <div className="text-[10px] text-stone-400 leading-snug">
            <span className={`font-bold ${STAGE_COLOR[hovered.stage]}`}>{hovered.name}{hovered.burned ? " (BURNED)" : ""}</span>
            <span className="text-stone-500"> — {hovered.hook}</span>
            {hovered.revealed ? (
              <span className="text-stone-500"> Listens to: <span className="text-stone-300">{act1TrustsNames(workers, hovered).join(", ") || "no one in particular"}</span>. Trusted by: <span className="text-amber-400">{act1FollowerNames(workers, hovered.id).join(", ") || "no one"}</span>.</span>
            ) : (
              <span className="text-stone-600 italic"> Ties unknown — map the floor.</span>
            )}
            {hovered.stage === "leader" && !hovered.burned && (
              <span className="text-teal-400"> A leader — runs their own one-on-ones every week, no hours needed.</span>
            )}
            {hovered.history.length > 0 && (
              <span className="text-stone-600 italic"> Last: {hovered.history[hovered.history.length - 1].replace(/^Week \d+: /, "")}</span>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-stone-600 italic">
            {anyRevealed
              ? "Arrows point at who a person listens to. Bigger circles carry more influence. Hover for details, click to plan."
              : "Nobody's ties are mapped yet — the lines between people are invisible until you map the floor. Hover for details, click to plan."}
          </div>
        )}
      </div>
    </div>
  );
}

function ActOneGame({ onGraduate }) {
  const [week, setWeek] = useState(1);
  const [phase, setPhase] = useState("intro"); // intro, plan, resolving, victory, loss
  const [workers, setWorkers] = useState(makeAct1Workers());
  const [plan, setPlan] = useState({}); // workerId -> {type, cost}
  const [planMapping, setPlanMapping] = useState(false);
  const [shopVisibility, setShopVisibility] = useState(10);
  const [resolutionSteps, setResolutionSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const pendingRef = useRef(null);

  // Layout keyed on the tie structure — ties are fixed at campaign start, so this only
  // recomputes on a fresh run (new random ties), not week to week.
  const tieSignature = workers.map(w => `${w.id}:${w.ties.join(".")}`).join("|");
  const floorLayout = useMemo(() => computeFloorLayout(workers), [tieSignature]);

  const burnedCount = workers.filter(w => w.burned).length;
  const sympathPlusCount = workers.filter(w => !w.burned && stageIndex(w.stage) >= 2).length;
  const leaderCount = workers.filter(w => !w.burned && w.stage === "leader").length;
  const weeklyHours = ACT1_HOURS_PER_WEEK + leaderCount * 2;

  const planCost = Object.values(plan).reduce((s, a) => s + (a?.cost || 0), 0) + (planMapping ? 2 : 0);
  const remaining = weeklyHours - planCost;

  // Progressive unlocks — mechanics introduce themselves when they first matter,
  // instead of being front-loaded in intro screens.
  const anyRevealed = workers.some(w => w.revealed);
  const anyStageMoved = workers.some(w => w.history.some(h => h.includes("moved")));
  const anyTestDone = workers.some(w => w.passedSmall || w.passedMedium || w.passedBig || w.history.some(h => h.includes("ask") || h.includes("Signed")));
  const unlockMapping = week >= 2;
  const unlockTests = week >= 3 || anyStageMoved;

  // In-place resolution: diff the current step's snapshot against the previous one
  // so the board can show what just changed instead of a modal describing it.
  const resStep = phase === "resolving" && resolutionSteps.length > 0 ? resolutionSteps[stepIndex] : null;
  const resHighlights = {};
  if (resStep) {
    const prevSnapshot = stepIndex > 0 ? resolutionSteps[stepIndex - 1].workers : workers;
    resStep.workers.forEach(cw => {
      const pw = prevSnapshot.find(x => x.id === cw.id);
      if (!pw) return;
      const delta = cw.trust - pw.trust;
      const stageChange = stageIndex(cw.stage) - stageIndex(pw.stage);
      const burned = cw.burned && !pw.burned;
      if (delta !== 0 || stageChange !== 0 || burned) resHighlights[cw.id] = { delta, stageChange, burned };
    });
  }
  const resLogRef = useRef(null);
  useEffect(() => {
    if (resLogRef.current) resLogRef.current.scrollTop = resLogRef.current.scrollHeight;
  }, [stepIndex, phase]);

  function setAction(workerId, action) {
    setPlan(prev => {
      const next = { ...prev };
      if (!action) { delete next[workerId]; return next; }
      next[workerId] = action;
      return next;
    });
  }

  function resolveWeek() {
    const steps = [];
    let w = workers.map(x => ({ ...x }));
    const lines1on1 = [];
    const testLines = [];
    const rippleLines = [];
    const rippleEvents = []; // {from, to, tone} — drawn as pulses along ties on the board
    let visDelta = 0;

    steps.push({ label: "WEEK START", sub: `Planning the floor for week ${week}.`, workers: w.map(x => ({ ...x })), lines: [] });

    // Leaders organize on their own — quiet one-on-ones with the people who trust
    // them, costing no organizer hours. This is the point of building leaders.
    const leaderLines = [];
    const leaderPulses = [];
    w.filter(x => !x.burned && x.stage === "leader").forEach(leader => {
      act1Followers(w, leader.id).forEach(f => {
        if (f.stage === "leader") return;
        f.trust = Math.min(100, f.trust + 3);
        leaderPulses.push({ from: leader.id, to: f.id, tone: "up" });
        if (stageIndex(f.stage) < 2 && Math.random() < 0.20) {
          f.stage = STAGE_ORDER[stageIndex(f.stage) + 1];
          f.trust = Math.max(f.trust, STAGE_FLOOR[f.stage] + 5);
          leaderLines.push(`${f.name} comes around after weeks of ${leader.name} quietly working on them. No organizer needed.`);
          f.history.push(`Week ${week}: moved up thanks to ${leader.name}'s steady one-on-ones.`);
        }
      });
    });
    if (leaderPulses.length) {
      steps.push({
        label: "LEADERS ON THE FLOOR",
        sub: "Your leaders run their own conversations — no hours spent.",
        workers: w.map(x => ({ ...x })),
        lines: leaderLines.length ? leaderLines : ["A quiet week of one-on-ones by your leaders. Trust ticks up around them."],
        edgePulses: leaderPulses,
      });
    }

    // Mapping resolves first — reveals info used for the rest of the display (doesn't change mechanics, just visibility of them)
    if (planMapping) {
      const hidden = w.filter(x => !x.revealed && !x.burned);
      const shuffled = [...hidden].sort(() => Math.random() - 0.5);
      const toReveal = shuffled.slice(0, 3);
      toReveal.forEach(x => { x.revealed = true; });
      if (toReveal.length > 0) {
        lines1on1.push(`Organizer spends time mapping the floor — learns more about ${toReveal.map(x => x.name).join(", ")}.`);
      } else {
        lines1on1.push(`Organizer maps the floor, but everyone worth mapping is already known.`);
      }
    }

    // One-on-ones and structure tests
    Object.entries(plan).forEach(([idStr, action]) => {
      const id = parseInt(idStr, 10);
      const worker = w.find(x => x.id === id);
      if (!worker || worker.burned) return;

      if (action.type === "quick" || action.type === "deep") {
        const isDeep = action.type === "deep";
        const { chance } = act1ConvoChance(worker, w, isDeep, true);

        if (stageIndex(worker.stage) >= 2) {
          // already sympathetic+: conversation just builds trust, can't reach leader this way
          worker.trust = Math.min(100, worker.trust + (isDeep ? 10 : 5));
          lines1on1.push(`${worker.name}: good conversation, but real leadership here will have to be earned, not just talked about.`);
          worker.history.push(`Week ${week}: ${isDeep ? "Deep conversation" : "Quick chat"} — solid, but leadership will take a structure test.`);
        } else if (Math.random() < chance) {
          worker.stage = STAGE_ORDER[stageIndex(worker.stage) + 1];
          worker.trust = Math.max(worker.trust, STAGE_FLOOR[worker.stage] + 5);
          lines1on1.push(`${worker.name}: the conversation lands. Now ${STAGE_LABEL[worker.stage].toLowerCase()}.`);
          worker.history.push(`Week ${week}: ${isDeep ? "Deep conversation" : "Quick chat"} — moved to ${STAGE_LABEL[worker.stage].toLowerCase()}.`);
        } else {
          worker.trust = Math.min(100, worker.trust + 2);
          lines1on1.push(`${worker.name}: a real conversation, but they're not ready to move yet.`);
          worker.history.push(`Week ${week}: ${isDeep ? "Deep conversation" : "Quick chat"} — not ready to move yet.`);
        }
      }

      if (action.type === "small" || action.type === "medium" || action.type === "big") {
        const tier = action.type;
        const { chance } = act1TestChance(worker, w, tier, true);

        const success = Math.random() < chance;
        const followers = act1Followers(w, worker.id);

        if (success) {
          if (tier === "small") {
            worker.trust = Math.min(100, worker.trust + 10);
            worker.passedSmall = true;
            testLines.push(`${worker.name} wears the button to work. Small, but real.`);
            worker.history.push(`Week ${week}: Small ask — passed.`);
            followers.forEach(f => { f.trust = Math.min(100, f.trust + 3); });
          } else if (tier === "medium") {
            if (stageIndex(worker.stage) < 2) worker.stage = "sympathetic";
            worker.trust = Math.min(100, worker.trust + 20);
            worker.passedMedium = true;
            testLines.push(`${worker.name} gets two coworkers to sign the petition. People notice.`);
            worker.history.push(`Week ${week}: Medium ask — passed, now sympathetic.`);
            followers.forEach(f => {
              f.trust = Math.min(100, f.trust + 7);
              if (stageIndex(f.stage) < 2 && Math.random() < 0.15) {
                f.stage = STAGE_ORDER[stageIndex(f.stage) + 1];
                rippleLines.push(`${f.name} moves up after watching ${worker.name} come through.`);
                rippleEvents.push({ from: worker.id, to: f.id, tone: "up" });
                f.history.push(`Week ${week}: moved up after watching ${worker.name} come through.`);
              }
            });
          } else {
            worker.stage = "leader";
            worker.trust = 100;
            worker.passedBig = true;
            testLines.push(`${worker.name} signs the card openly, in front of everyone. This is a leader now.`);
            worker.history.push(`Week ${week}: Signed the card openly — now a leader.`);
            followers.forEach(f => {
              f.trust = Math.min(100, f.trust + 15);
              if (stageIndex(f.stage) < 2 && Math.random() < 0.25) {
                f.stage = STAGE_ORDER[stageIndex(f.stage) + 1];
                rippleLines.push(`${f.name} moves up after seeing ${worker.name} sign.`);
                rippleEvents.push({ from: worker.id, to: f.id, tone: "up" });
                f.history.push(`Week ${week}: moved up after seeing ${worker.name} sign.`);
              }
            });
          }
        } else {
          if (tier === "small") {
            worker.trust = Math.max(0, worker.trust - 3);
            testLines.push(`${worker.name} doesn't wear the button after all. No harm done, but no progress either.`);
            worker.history.push(`Week ${week}: Small ask — didn't follow through.`);
          } else if (tier === "medium") {
            if (stageIndex(worker.stage) > 0) worker.stage = STAGE_ORDER[stageIndex(worker.stage) - 1];
            visDelta += 10;
            testLines.push(`${worker.name} backs out of speaking up. Word gets around the shift.`);
            worker.history.push(`Week ${week}: Medium ask — backed out, dropped to ${STAGE_LABEL[worker.stage].toLowerCase()}.`);
          } else {
            worker.burned = true;
            visDelta += 25;
            const narrative = BURN_NARRATIVES[Math.floor(Math.random() * BURN_NARRATIVES.length)](worker.name);
            testLines.push(`${narrative} ${worker.name} is out of play for the rest of this campaign.`);
            worker.history.push(`Week ${week}: Big ask — burned. ${narrative}`);
            followers.forEach(f => {
              f.trust = Math.max(0, f.trust - 10);
              if (Math.random() < 0.30 && stageIndex(f.stage) > 0) {
                f.stage = STAGE_ORDER[stageIndex(f.stage) - 1];
                rippleLines.push(`${f.name} gets spooked after what happened to ${worker.name}.`);
                rippleEvents.push({ from: worker.id, to: f.id, tone: "down" });
                f.history.push(`Week ${week}: spooked after what happened to ${worker.name}, dropped to ${STAGE_LABEL[f.stage].toLowerCase()}.`);
              }
            });
          }
        }
      }
    });

    if (lines1on1.length) steps.push({ label: "ONE-ON-ONES", sub: "Conversations on the floor.", workers: w.map(x => ({ ...x })), lines: lines1on1 });
    if (testLines.length) steps.push({ label: "STRUCTURE TESTS", sub: "Asking people to actually do something, and finding out who delivers.", workers: w.map(x => ({ ...x })), lines: testLines });
    if (rippleLines.length) steps.push({ label: "RIPPLE EFFECTS", sub: "What people saw happen to their coworkers.", workers: w.map(x => ({ ...x })), lines: rippleLines, edgePulses: rippleEvents });

    const newVisibility = Math.min(100, shopVisibility + visDelta - 3);
    const newBurned = w.filter(x => x.burned).length;
    const newSympathPlus = w.filter(x => !x.burned && stageIndex(x.stage) >= 2).length;
    const newLeaders = w.filter(x => !x.burned && x.stage === "leader").length;

    let outcome = null;
    if (newBurned >= 3) outcome = "loss-burned";
    else if (newSympathPlus >= 8 && newLeaders >= 4) outcome = "victory";
    else if (week >= ACT1_WEEKS) outcome = "loss-time";

    steps.push({ label: "END OF WEEK", sub: `Week ${week} complete.`, workers: w.map(x => ({ ...x })), lines: [] });

    setResolutionSteps(steps);
    setStepIndex(0);
    setPhase("resolving");
    pendingRef.current = { workers: w, visibility: Math.max(0, newVisibility), outcome };
  }

  function commitWeek() {
    const { workers: w, visibility, outcome } = pendingRef.current;
    setWorkers(w);
    setShopVisibility(visibility);
    setPlan({});
    setPlanMapping(false);

    if (outcome === "victory") {
      setPhase("victory");
    } else if (outcome === "loss-burned" || outcome === "loss-time") {
      setPhase(outcome);
    } else {
      setWeek(wk => wk + 1);
      setPhase("plan");
    }
  }

  function restartAct1() {
    setWeek(1);
    setWorkers(makeAct1Workers());
    setPlan({});
    setPlanMapping(false);
    setShopVisibility(10);
    setPhase("plan");
  }

  function graduate() {
    const leaders = workers.filter(w => !w.burned && w.stage === "leader").slice(0, 4).map(w => ({ name: w.name, trait: w.trait }));
    onGraduate(leaders);
  }

  function startOver() {
    setWeek(1);
    setPhase("intro");
    setWorkers(makeAct1Workers());
    setPlan({});
    setPlanMapping(false);
    setShopVisibility(10);
    setResolutionSteps([]);
    setStepIndex(0);
    setSelectedWorker(null);
    setConfirmStartOver(false);
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-mono">
      <GlobalStyle />
      <div className="border-b-2 border-stone-800 bg-stone-900 px-4 py-3 sm:px-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-stencil text-2xl sm:text-3xl tracking-wide text-amber-400">ONE SHOP</div>
          <div className="text-[10px] sm:text-xs tracking-[0.2em] text-stone-500">ACT ONE — WHOLE-WORKER ORGANIZING</div>
        </div>
        {phase !== "intro" && (
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <div className="text-center">
              <div className="text-stone-500 text-[10px]">WEEK</div>
              <div className="text-lg font-bold text-stone-100">{Math.min(week, ACT1_WEEKS)} / {ACT1_WEEKS}</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-[10px]">SYMPATHETIC+</div>
              <div className="text-lg font-bold text-amber-400">{sympathPlusCount} / 8</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-[10px]">LEADERS</div>
              <div className="text-lg font-bold text-teal-400">{leaderCount} / 4</div>
            </div>
          </div>
        )}
      </div>

      {phase === "intro" && (
        <div className="max-w-2xl mx-auto px-6 py-16 text-center anim-rise">
          <div className="font-stencil text-4xl text-amber-400 mb-4">ONE SHOP. ELEVEN PEOPLE.</div>
          <div className="text-left border border-red-900 bg-red-950/20 p-3 mb-6">
            <p className="text-stone-300 text-sm leading-relaxed mb-3">
              Ownership stopped really listening a long time ago. Raises dried up. The studio used to feel like
              something worth building — now it belongs to a private equity firm three acquisitions deep.
            </p>
            <p className="text-stone-300 text-sm leading-relaxed mb-3">
              Six months ago, corporate stopped even pretending. They rolled out{" "}
              <span className="text-red-400 font-bold">PL-A-EYE</span>, an AI system that makes design decisions
              for the game your studio has spent four years crafting. It pushes updates, overrides decisions from
              your actual designers, and even contradicts your playtesters. Your management is convinced that it
              knows best how to make a buck, so maybe lootboxes are back in.
            </p>
            <p className="text-stone-300 text-sm leading-relaxed">
              Appeal it and there's no one to appeal to. Just a model, running numbers on work it's never played.
            </p>
          </div>
          <p className="text-stone-600 text-xs leading-relaxed mb-8 italic">
            There's no fixing a system that isn't listening by asking nicer. The only lever left is each other.
            Start by talking to people — the rest you'll learn on the floor.
          </p>
          <button onClick={() => setPhase("plan")} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
            I'M FED UP
          </button>
        </div>
      )}

      {phase === "plan" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          {week === 1 && (
            <div className="mb-4 flex items-center gap-2 text-stone-300 text-xs border border-stone-700 bg-stone-900/60 px-3 py-2">
              <MessageCircle size={14} className="shrink-0" /> Week one, all you have is conversation. Click someone on the floor and hear them out — one-on-ones are how people move.
            </div>
          )}
          {unlockMapping && !anyRevealed && (
            <div className="mb-4 flex items-center gap-2 text-amber-300 text-xs border border-amber-700 bg-amber-950/30 px-3 py-2">
              <Radio size={14} className="shrink-0" /> <span><span className="font-bold text-amber-400">NEW — MAP THE FLOOR.</span> Nobody organizes alone: every worker listens to somebody. Spend 2 hours mapping to see who actually trusts whom — influence travels along those lines.</span>
            </div>
          )}
          {unlockTests && !anyTestDone && (
            <div className="mb-4 flex items-center gap-2 text-teal-300 text-xs border border-teal-700 bg-teal-950/30 px-3 py-2">
              <ClipboardList size={14} className="shrink-0" /> <span><span className="font-bold text-teal-400">NEW — STRUCTURE TESTS.</span> Sympathy alone doesn't win. Ask people to risk something real — wear the button, sign the card — and find out who delivers. That's how leaders are made, and what they do ripples out to everyone who trusts them. But push someone too hard too early and you can burn them for good: three burns ends the campaign. You need 8 people sympathetic or better and 4 proven leaders before week 10.</span>
            </div>
          )}
          <Act1FloorMap workers={workers} layout={floorLayout} plan={plan} onSelect={(w) => setSelectedWorker(w)} />

          <div className="border-2 border-stone-800 bg-stone-900 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="font-stencil text-lg tracking-wide text-stone-200">PLAN THE WEEK</div>
              <div className={`text-sm font-bold ${remaining < 0 ? "text-red-500" : remaining === 0 ? "text-teal-400" : "text-amber-400"}`}>{remaining} HOUR{Math.abs(remaining) === 1 ? "" : "S"} LEFT</div>
            </div>
            {leaderCount > 0 && (
              <div className="text-[10px] text-teal-400 mb-2">{ACT1_HOURS_PER_WEEK} base hours + {leaderCount * 2} from {leaderCount} leader{leaderCount === 1 ? "" : "s"} now running their own conversations = {weeklyHours} hours this week.</div>
            )}
            <p className="text-[10px] text-stone-500 mb-3">Click a worker above to plan a conversation or a structure test. Tap them again to change or clear it.</p>
            {unlockMapping && (
              <label className={`flex items-center gap-2 text-xs border px-3 py-2 cursor-pointer mb-3 ${!anyRevealed ? "border-amber-700" : "border-stone-700"}`}>
                <input type="checkbox" checked={planMapping} onChange={() => setPlanMapping(v => !v)} className="accent-amber-500" />
                <Radio size={14} />
                <span className="flex-1">Map the floor — find out by name who actually trusts whom (2 hours)</span>
                {!anyRevealed && <span className="text-[9px] font-bold text-amber-400 tracking-wide">NEW</span>}
              </label>
            )}
            <button
              onClick={resolveWeek}
              disabled={remaining < 0 || (Object.keys(plan).length === 0 && !planMapping)}
              className={`w-full font-stencil text-lg py-2.5 tracking-wide transition-colors ${remaining < 0 || (Object.keys(plan).length === 0 && !planMapping) ? "bg-stone-800 text-stone-600 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-400 text-stone-950"}`}
            >
              {remaining < 0 ? "OVER BUDGET — REDUCE PLAN" : `RESOLVE WEEK ${week}`}
            </button>
          </div>
        </div>
      )}

      {resStep && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          <Act1FloorMap
            workers={resStep.workers}
            layout={floorLayout}
            plan={{}}
            onSelect={() => {}}
            highlights={resHighlights}
            edgePulses={resStep.edgePulses || []}
            stepKey={stepIndex}
          />
          <div className="border-2 border-amber-500 bg-stone-900 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="font-stencil text-lg tracking-wide text-amber-400">{resStep.label}</div>
              <div className="text-[10px] text-stone-500">{stepIndex + 1} / {resolutionSteps.length}</div>
            </div>
            <div className="text-xs text-stone-500 mb-3">{resStep.sub}</div>
            {resolutionSteps.slice(0, stepIndex + 1).some(s => s.lines.length > 0) && (
              <div ref={resLogRef} className="bg-stone-950 border border-stone-800 p-3 mb-3 space-y-1 max-h-36 overflow-y-auto">
                {resolutionSteps.slice(0, stepIndex + 1).map((s, si) =>
                  s.lines.map((line, li) => (
                    <div key={`${si}-${li}`} className={`text-xs font-mono ${si === stepIndex ? "text-stone-200" : "text-stone-600"}`}>▸ {line}</div>
                  ))
                )}
              </div>
            )}
            <button
              onClick={() => {
                if (stepIndex < resolutionSteps.length - 1) setStepIndex(i => i + 1);
                else commitWeek();
              }}
              className="w-full font-stencil text-lg bg-amber-500 hover:bg-amber-400 text-stone-950 py-2 tracking-wide flex items-center justify-center gap-1 transition-colors"
            >
              {stepIndex === resolutionSteps.length - 1 ? "CONTINUE" : "NEXT"} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {phase === "victory" && (
        <div className="max-w-xl mx-auto px-6 py-20 text-center anim-rise">
          <div className="font-stencil text-5xl mb-4 text-teal-400">THE SHOP IS WON</div>
          <p className="text-stone-400 mb-6 leading-relaxed">
            A supermajority stands behind this, and four people proved themselves as leaders along the way —
            not because they volunteered loudest, but because they came through when it mattered. Word is
            starting to travel to other studios.
          </p>
          <div className="text-left border border-teal-900 bg-teal-950/20 p-3 mb-8">
            <div className="text-[10px] text-teal-400 font-bold mb-2 tracking-wide">LEADERS WHO STEPPED UP:</div>
            {workers.filter(w => !w.burned && w.stage === "leader").map(w => (
              <div key={w.id} className="text-xs text-stone-300 mb-1">
                <span className="font-bold text-stone-100">{w.name}</span> — {w.hook}
              </div>
            ))}
          </div>
          <button onClick={graduate} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
            GET CALLED UP
          </button>
        </div>
      )}

      {(phase === "loss-burned" || phase === "loss-time") && (
        <div className="max-w-xl mx-auto px-6 py-20 text-center anim-rise">
          <div className="font-stencil text-5xl mb-4 text-red-500">THE SHOP ISN'T READY</div>
          <p className="text-stone-400 mb-6 leading-relaxed">
            {phase === "loss-burned"
              ? "Too many people got burned testing them too hard, too fast. Word got around, and now nobody wants to be next."
              : `Ten weeks came and went without a real supermajority behind it. Good intentions, but not enough proven leaders.`}
          </p>
          <button onClick={restartAct1} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
            START OVER
          </button>
        </div>
      )}

      {selectedWorker && (
        <Act1WorkerModal
          worker={workers.find(w => w.id === selectedWorker.id) || selectedWorker}
          allWorkers={workers}
          currentAction={plan[selectedWorker.id]}
          testsUnlocked={unlockTests}
          onChoose={(action) => { setAction(selectedWorker.id, action); setSelectedWorker(null); }}
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
            onClick={graduate}
            className="text-[10px] text-stone-600 hover:text-stone-400 underline transition-colors"
          >
            Skip to Phase 2 (playtest)
          </button>
        </div>
      )}
    </div>
  );
}

const ACT1_ACTION_LABEL = {
  quick: "Quick chat (1h)",
  deep: "Deep conversation (2h)",
  small: "Structure test: small ask (1h)",
  medium: "Structure test: medium ask (2h)",
  big: "Structure test: sign the card (3h)",
};

function Act1WorkerModal({ worker, allWorkers, currentAction, testsUnlocked = true, onChoose, onClose }) {
  const idx = stageIndex(worker.stage);
  const followerNames = worker.revealed ? act1FollowerNames(allWorkers, worker.id) : null;
  const trustsNames = worker.revealed ? act1TrustsNames(allWorkers, worker) : null;
  const options = [
    { type: "quick", cost: 1, available: true },
    { type: "deep", cost: 2, available: true },
    { type: "small", cost: 1, available: testsUnlocked && idx >= 1 },
    { type: "medium", cost: 2, available: testsUnlocked && idx >= 2 },
    { type: "big", cost: 3, available: testsUnlocked && idx >= 2 && worker.stage !== "leader" },
  ];

  // The organizer's honest read on each option: same math the week resolution rolls,
  // with tie-based bonuses visible only once this worker has been mapped.
  const pctOf = (chance) => Math.round(chance * 20) * 5;
  const oddsFor = (type) => {
    if (type === "quick" || type === "deep") {
      if (idx >= 2) {
        return { line: `Builds trust (+${type === "deep" ? 10 : 5}). Real leadership here will take a structure test.` };
      }
      const { chance, tieBoost } = act1ConvoChance(worker, allWorkers, type === "deep", worker.revealed);
      let note = "";
      if (worker.revealed && tieBoost > 0) note = " Better than usual — someone they trust is already on board.";
      if (!worker.revealed) note = " True odds depend on who they trust — map the floor to know.";
      return { line: `~${pctOf(chance)}% they open up and move a stage.${note}` };
    }
    const { chance, peerPassed } = act1TestChance(worker, allWorkers, type, worker.revealed);
    let note = "";
    if (worker.revealed && peerPassed) note = " Easier — someone they trust already passed this test.";
    if (!worker.revealed) note = " True odds depend on who they trust — map the floor to know.";
    const win = type === "small"
      ? "they wear the button (+10 trust, nudges their people)"
      : type === "medium"
        ? "they deliver — sympathetic, +20 trust, can inspire their people"
        : "they sign openly and become a LEADER, pulling their people up";
    const risk = type === "small"
      ? "If not: no harm done, a little trust lost."
      : type === "medium"
        ? "If they back out: they drop a stage and word gets around the shop."
        : "If it goes wrong: they're burned — gone for the campaign, and it spooks everyone who trusts them.";
    return { line: `~${pctOf(chance)}% ${win}.${note}`, risk };
  };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-stone-900 border-2 border-stone-700 max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-stencil text-2xl text-amber-400">{worker.name}</div>
          <button onClick={onClose}><X size={18} className="text-stone-500 hover:text-stone-200" /></button>
        </div>
        <div className={`text-xs font-bold mb-2 ${STAGE_COLOR[worker.stage]}`}>{STAGE_LABEL[worker.stage]}</div>
        <p className="text-xs text-stone-400 mb-3">{worker.hook}</p>
        <div className="text-[10px] text-stone-500 mb-1">Trust: <span className="text-stone-300 font-bold">{worker.trust}</span></div>
        {worker.revealed ? (
          <div className="text-[10px] text-stone-500 mb-4 space-y-1">
            <div>Listens to: <span className="text-stone-300">{trustsNames.length > 0 ? trustsNames.join(", ") : "no one in particular — makes up their own mind"}</span></div>
            <div>Listened to by: <span className="text-amber-400">{followerNames.length > 0 ? followerNames.join(", ") : "no one — winning them over won't move anyone else"}</span></div>
          </div>
        ) : (
          <div className="text-[10px] text-stone-500 mb-4">Who they listen to, and who listens to them: unknown — map the floor to find out.</div>
        )}
        {worker.history.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-stone-500 font-bold mb-1 tracking-wide">HISTORY</div>
            <div className="bg-stone-950 border border-stone-800 p-2 max-h-32 overflow-y-auto space-y-1">
              {worker.history.map((h, i) => (<div key={i} className="text-[10px] text-stone-400">▸ {h}</div>))}
            </div>
          </div>
        )}
        {worker.burned ? (
          <div className="text-xs text-red-400">This person is out of play for the rest of the campaign.</div>
        ) : (
          <div className="space-y-2">
            {options.filter(o => o.available).map(o => {
              const odds = oddsFor(o.type);
              return (
                <button
                  key={o.type}
                  onClick={() => onChoose({ type: o.type, cost: o.cost })}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${currentAction?.type === o.type ? "border-amber-500 bg-amber-950/30" : "border-stone-700 hover:bg-stone-800/60"}`}
                >
                  <div className="text-xs text-stone-100">{ACT1_ACTION_LABEL[o.type]}</div>
                  <div className="text-[10px] text-stone-400 leading-snug mt-0.5">{odds.line}</div>
                  {odds.risk && (
                    <div className={`text-[10px] leading-snug mt-0.5 ${o.type === "big" ? "text-red-400" : "text-stone-500"}`}>{odds.risk}</div>
                  )}
                </button>
              );
            })}
            {!testsUnlocked && idx >= 1 && (
              <div className="text-[10px] text-stone-600 italic border border-stone-800 px-3 py-2">
                Talk is only the beginning — once your conversations start landing, you'll be able to ask people to actually do something.
              </div>
            )}
            {currentAction && (
              <button onClick={() => onChoose(null)} className="w-full text-center text-[10px] text-stone-500 hover:text-stone-300 underline pt-1">
                Clear planned action
              </button>
            )}
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
    let cancelled = false;
    (async () => {
      try {
        const result = await window.storage.get(ACT1_SAVE_KEY, false);
        if (!cancelled && result && result.value) {
          const parsed = JSON.parse(result.value);
          if (parsed && Array.isArray(parsed.leaders)) {
            setSavedRun(parsed);
            setAct("choice");
            return;
          }
        }
      } catch (e) {
        // no prior save, or storage unavailable — just start fresh
      }
      if (!cancelled) setAct("shop");
    })();
    return () => { cancelled = true; };
  }, []);

  async function saveAct1Win(leaders) {
    try {
      await window.storage.set(ACT1_SAVE_KEY, JSON.stringify({ leaders }), false);
    } catch (e) {
      // if storage fails, the run still proceeds — persistence is a convenience, not a requirement
    }
  }

  function handleGraduate(leaders) {
    setRecruitedLeaders(leaders);
    saveAct1Win(leaders);
    setAct("citywide");
  }

  async function handleFullRestart() {
    setRecruitedLeaders([]);
    try { await window.storage.delete(ACT1_SAVE_KEY, false); } catch (e) { /* nothing saved, or storage unavailable */ }
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
