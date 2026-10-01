// The company campaign: four studios on one map.
import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, Zap, Scale, Vote, X, FileWarning, Wrench, MessageCircle, Radio, UsersRound, Brain } from "lucide-react";
import { clamp, rand, random } from "../../engine/rng.js";
import { CostPips, GlobalStyle, HourPie, IntroSequence, Pips, splitLinesByEntity } from "../shared.jsx";
import { Act2NetworkMap, EscalationModal, LocationActionModal, PlatformModal } from "./panels.jsx";
import { ACT2_BASE_ACTIONS, ACT2_CAMPAIGN_CRACKDOWN_CAP, ACT2_CAMPAIGN_HIT_SCALE, ACT2_CAMPAIGN_RETALIATION, ACT2_CAMPAIGN_UPKEEP, ACT2_DOCUMENT_DETERRENCE, ACT2_DOCUMENT_SHIELD, ACT2_EMBOLDENED_RETALIATION, ACT2_FILING_LEAD, ACT2_FILING_VISIBILITY, ACT2_LAST_FILING_TURN, ACT2_LOSS_FEAR, ACT2_LOSS_MORALE, ACT2_LOSS_STAMINA, ACT2_LOSS_TRUE, ACT2_RETALIATION_FEAR, ACT2_STAMINA_POOL, COMMITTEE_COST, COMMITTEE_COST_CAMPAIGN, COMMITTEE_MORALE_REQ, COMMITTEE_RECRUIT_PCT_REQ, EXTERNAL_EVENTS, GRIEVANCE_META, START_LOCATIONS, TOTAL_TURNS, roll100 } from "../../engine/company/constants.js";
import { ACT2_MAX_PLEDGES, ACT2_SURVEY_COST, BLOCS, DEFECT_THRESHOLD, DEMAND_BY_ID, LOC_COMPOSITION, PLATFORM_SLOTS, SURVEY_DEAD_MORALE, SURVEY_MORALE_GAIN, SURVEY_STRONG, SURVEY_TRUE_GAIN, SURVEY_WEAK, blocSatisfaction, contractHeadstart, locBlocFactor, provenDemands, rollBlocPriorities, surveyResponse } from "../../engine/company/platform.js";
import { ACT2_LEADER_PULL, ACT2_ONE_ON_ONES_PER_TURN, ACT2_SITDOWN_COST, ACT2_SITDOWN_LIFT, ACT2_SITDOWN_MORALE, ACT2_SITDOWN_SUPPORT, committeeWeight, makeAct2Rosters, metLeaders } from "../../engine/company/roster.js";
import { ACT2_SITES_NEEDED, act2CastBallot, act2WinChance, act2Winnability, baseGain, baseVis, computeSolidarityScore, filingGates } from "../../engine/company/campaign.js";
import { TRAIT_LABEL } from "../../engine/act1/constants.js";

// Act Two's network map board. Act One's floor uses its own, larger board.
const MAP_W = 160;
const MAP_H = 100;
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
    // A shop at the vote shows only the sit-downs, the committee and the paper trail; anything
    // ticked before it filed is gone with the rows that offered it, and costs nothing.
    const atVote = loc.status === "campaign";
    let cost = 0;
    if (!atVote && r.grievance && loc.grievance) cost += GRIEVANCE_META[loc.grievance.type].cost;
    if (r.document) cost += 1;
    if (!atVote && r.counter) cost += 1;
    if (!atVote && r.reframe && loc.buyOff?.active) cost += 1;
    if (r.formCommittee) cost += (atVote ? COMMITTEE_COST_CAMPAIGN : COMMITTEE_COST);
    if (!atVote && r.bargain) cost += 2;
    cost += (r.sitDown?.length || 0) * ACT2_SITDOWN_COST;
    return cost;
  }

  const totalResponseCost = locations.reduce((sum, l) => sum + responseCostFor(l, responses[l.id]), 0);
  // Every shop at the vote takes its upkeep off the top, before anything is allocated.
  const campaignCount = locations.filter(l => l.status === "campaign").length;
  const campaignUpkeep = campaignCount * ACT2_CAMPAIGN_UPKEEP;
  const surveyCost = surveyPlanned ? ACT2_SURVEY_COST : 0;
  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0) + totalResponseCost + campaignUpkeep + surveyCost;

  // On a break the organizer plans nothing; the controls stay put rather than pretend.
  const onBreakNow = organizer.onBreak > 0;
  function updateAlloc(id, val) {
    if (onBreakNow) return;
    val = Math.max(0, Math.min(weeklyBudget, val));
    setAllocations(prev => ({ ...prev, [id]: val }));
  }

  function toggleResponse(id, key) {
    if (onBreakNow) return;
    setResponses(prev => ({ ...prev, [id]: { ...prev[id], [key]: !prev[id]?.[key] } }));
  }

  // How many sit-downs are booked anywhere this month. The cap is campaign-wide on
  // purpose: the scarce thing in this act is the organizer's calendar, not any one site.
  const sitDownsBooked = locations.reduce((n, l) => n + (responses[l.id]?.sitDown?.length || 0), 0);
  function toggleSitDown(locId, workerId) {
    if (onBreakNow) return;
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

    // If organizer is on break, this turn is auto-skipped: no allocation, no sit-downs, no
    // responses, no survey. The committees and everything already in motion keep going.
    const isBreakTurn = onBreak > 0;
    const plannedResponses = isBreakTurn ? {} : responses;
    const surveyThisTurn = surveyPlanned && !isBreakTurn;

    let workingLocs = locations.map(l => ({ ...l }));

    // ---------- EXTERNAL / NATIONAL EVENTS ----------
    let moraleClimateNext = moraleClimate.turnsLeft > 0 ? { ...moraleClimate, turnsLeft: moraleClimate.turnsLeft - 1 } : { tone: "neutral", turnsLeft: 0 };
    let legalClimateNext = legalClimate.turnsLeft > 0 ? { ...legalClimate, turnsLeft: legalClimate.turnsLeft - 1 } : { tone: "neutral", turnsLeft: 0 };
    let firedEvent = null;
    if (!isBreakTurn && random() < 0.18) {
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
        else if (random() < 0.12) au = { active: true, turnsLeft: 2 };
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
        const ids = (plannedResponses[l.id] || {}).sitDown || [];
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
        const rc = plannedResponses[l.id] || {};
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
      const r = plannedResponses[l.id] || {};
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
      // A month on a break is not a month you chose to leave a site alone.
      const newAbandonedTurns = isBreakTurn ? l.abandonedTurns : units === 0 ? l.abandonedTurns + 1 : 0;
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
            if (random() < (locHasTrait(l.id, "legal") ? 0.97 : 0.9)) {
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
        const roll = random();
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
        } else if (eligible && random() < 0.22) {
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

    const allocLines = isBreakTurn ? [] : workingLocs.filter(l => l.status === "organizing").map(l => `${l.name}: allocated ${allocations[l.id] || 0} action(s) → morale ${l._lastGain >= 0 ? "+" : ""}${l._lastGain ?? 0}`);
    const feedbackLines = workingLocs.filter(l => l.status === "organizing" || l.status === "campaign").flatMap(l => l._feedbackLines || []);
    steps.push({ label: "MORALE & VISIBILITY", sub: "Resolving organizing activity across sites...", locs: workingLocs.map(l => ({ ...l })), org: { stamina: orgStamina }, lines: [...allocLines, ...feedbackLines] });

    // Retaliation checks — an employer that's learned from past failures reaches for subtler tools
    let retaliationLines = [];
    let noticeLines = 0; // "corporate notices": a warning, not a crackdown
    let sophisticationGain = 0;
    workingLocs = workingLocs.map(l => {
      if (l.status !== "organizing" && l.status !== "campaign") return l;
      const atVote = l.status === "campaign";
      const documented = !!l.documented || !!plannedResponses[l.id]?.document;

      // Did a past firing here fail to actually stop organizing? If so, the employer takes note.
      let updated = { ...l };
      if (l._watchRecovery && l.morale >= l._watchFloor) {
        sophisticationGain = 1;
        retaliationLines.push(`Corporate notices firing didn't shut ${l.name} down. Expect subtler tactics company-wide from here.`);
        noticeLines += 1;
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
        if (random() >= cureChance) return l;
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
      return !plannedResponses[l.id]?.counter; // unaddressed this turn
    });
    if (contagionSources.length) {
      workingLocs = workingLocs.map(l => {
        if (l.status === "won" || l.status === "lost" || l.antiUnion?.active) return l;
        const availableSources = contagionSources.filter(s => s.id !== l.id);
        if (!availableSources.length) return l;
        const spreadChance = Math.max(0.02, 0.12 + employerSophistication * 0.05 + (employerEmboldened ? 0.05 : 0) - turnSolidarityScore * 0.04);
        if (random() >= spreadChance) return l;
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
      if (retaliationLines.length - noticeLines > 0) decay += 3; // a crackdown still costs fatigue on a rest week
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
      if (!plannedResponses[l.id]?.bargain) return;
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
    if (surveyThisTurn && !surveyDone) {
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

      if (unserved.length && random() < 0.45) {
        const { b, sat, pr } = unserved[0];
        // Representation: is this bloc thick anywhere that has an active committee?
        const represented = workingLocs.some(l =>
          l.committee?.active && (LOC_COMPOSITION[l.id]?.[b.id] || 0) >= 0.5 && l.status !== "lost");
        const takeChance = clamp(
          (DEFECT_THRESHOLD + 25 - sat) / 100 + pr.intensity * 0.08 - (represented ? 0.35 : 0) - (pr.pledged ? 0.12 : 0),
          0, 0.85) ;
        if (random() < takeChance) {
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
            `Satisfaction ${sat} \u2192 ${blocSatisfaction(b.id, platform, { ...prioritiesNext, [b.id]: { ...pr, heard: (pr.heard || 0) + 1 } }, proven)}.`
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

    // The month that certifies the second shop is a win, even if it also burns the organizer out.
    const wonCount = workingLocs.filter(l => l.status === "won").length;
    if (wonCount >= 2) {
      setPhase("gameover-win");
      return;
    }
    if (breaksTaken >= 2) {
      setPhase("gameover-loss");
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
    // Whatever was ticked for this shop as an organizing site no longer has a row to untick.
    setResponses(prev => {
      const r = prev[locId] || {};
      return { ...prev, [locId]: { ...(r.sitDown ? { sitDown: r.sitDown } : {}), ...(r.formCommittee ? { formCommittee: r.formCommittee } : {}), ...(r.document ? { document: r.document } : {}) } };
    });
    setEscalationTarget(null);
    setPendingFileLoc(null);
    setSelectedLoc(null);
    setPhase("allocate");
  }
  function adoptPlatform(chosen) {
    // The first platform is not the "one change" a survey promised: that stays open.
    const first = platform.length === 0;
    setPlatform(chosen);
    if (!first) setPlatformOpen(false);
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
    if (organizer.onBreak > 0) return { decay: 0, why: ["on a break"] };
    const active = locations.filter(l => (l.status === "organizing" || l.status === "campaign") && (allocations[l.id] || 0) > 0).length;
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
            {onBreakNow && (
              <div className="mb-3 border border-amber-700 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
                {organizer.onBreak} more month{organizer.onBreak === 1 ? "" : "s"} of mandatory rest. Nothing you plan happens until it is over; the committees you built keep working without you.
              </div>
            )}
            <div className="flex items-center justify-between mb-1">
              <div className="font-stencil text-lg tracking-wide text-stone-200">{onBreakNow ? "THE ORGANIZER IS ON A BREAK" : "ALLOCATE ORGANIZER TIME"}</div>
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
                    <input type="checkbox" checked={surveyPlanned} disabled={onBreakNow} onChange={() => setSurveyPlanned(v => !v)} className="accent-amber-500 mt-0.5" />
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


// The grievance icons live with the components that draw them, so the engine's
// GRIEVANCE_META carries no React.
const GRIEVANCE_ICON = { legal: FileWarning, material: Wrench, noise: MessageCircle };
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
              ? `You won one shop, then won it a contract${contract.tiers != null && contract.max ? ` — ${contract.tiers} of ${contract.max} tiers` : ""}, signed. The other studios under the same parent read it the week it was posted.`
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

export { MAP_W, MAP_H, statusMeta, ACT2_STATUS_HEX, ACT2_LAYOUT, ActTwoGame, GRIEVANCE_ICON, act2IntroBeats, IntroRosterVisual };
