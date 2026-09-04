// A headless Act Two. Constants and pure functions come from core2.mjs (generated from
// App.jsx). resolveTurn below is a PORT of ActTwoGame.resolveTurn with the narration
// stripped — it lives inside a React component, so it can't be extracted verbatim.
// Keep it in step with App.jsx by hand; the order of operations matters.
import * as C from './core2.mjs';
const { clamp, rand, TOTAL_TURNS, START_LOCATIONS, COMMITTEE_COST, COMMITTEE_MORALE_REQ,
  COMMITTEE_RECRUIT_PCT_REQ, GRIEVANCE_META, EXTERNAL_EVENTS, BLOCS, LOC_COMPOSITION, DEMAND_BY_ID,
  PLATFORM_SLOTS, DEFECT_THRESHOLD, rollBlocPriorities, blocSatisfaction, locBlocFactor,
  computeSolidarityScore, baseGain, baseVis, ACT2_SITES_NEEDED, act2Winnability } = C;
const roll100 = () => rand(100) + 1;

export function newGame(leaders = []) {
  return {
    turn: 1,
    locations: START_LOCATIONS.map(l => ({ ...l })),
    organizer: { stamina: 100 + leaders.length * 15, breaksTaken: 0, onBreak: 0 },
    platform: [],
    priorities: rollBlocPriorities(),
    moraleClimate: { tone: 'neutral', turnsLeft: 0 },
    legalClimate: { tone: 'neutral', turnsLeft: 0 },
    soph: 0, emboldened: false,
    leaders,               // [{name, trait}]
    deployment: {},        // leaderIndex -> locId
    log: { elections: [], defections: 0, sideOffers: 0, retaliations: 0, grievanceWins: 0,
      breaks: 0, events: 0, falseAlive: 0, committees: 0, bargains: 0, buyOffs: 0, firings: 0 },
  };
}

export function responseCostFor(loc, r) {
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

export function fileEligible(l) {
  return l.status === 'organizing' && l.morale >= 70 && l.recruited / l.workers >= 0.3 && l.legalRisk < 75;
}

// Filing happens between turns, at the escalation prompt. Mirrors commitFiling.
export function file(G, locId) {
  return { ...G, locations: G.locations.map(l => l.id !== locId || !fileEligible(l) ? l
    : { ...l, status: 'campaign', electionTurn: G.turn + 5, fear: 35 + rand(15) }) };
}

// One turn. alloc: {locId: units}, resp: {locId: {grievance,document,counter,reframe,formCommittee,bargain}}
export function resolveTurn(G, alloc, resp) {
  const turn = G.turn, L = G.log;
  const locHasTrait = (locId, t) => G.leaders.some((l, i) => G.deployment[i] === locId && l.trait === t);
  let orgStamina = G.organizer.stamina, breaksTaken = G.organizer.breaksTaken, onBreak = G.organizer.onBreak;
  const isBreakTurn = onBreak > 0;
  let workingLocs = G.locations.map(l => ({ ...l }));

  let moraleClimateNext = G.moraleClimate.turnsLeft > 0 ? { ...G.moraleClimate, turnsLeft: G.moraleClimate.turnsLeft - 1 } : { tone: 'neutral', turnsLeft: 0 };
  let legalClimateNext = G.legalClimate.turnsLeft > 0 ? { ...G.legalClimate, turnsLeft: G.legalClimate.turnsLeft - 1 } : { tone: 'neutral', turnsLeft: 0 };
  let firedEvent = null;
  if (!isBreakTurn && Math.random() < 0.18) {
    firedEvent = EXTERNAL_EVENTS[rand(EXTERNAL_EVENTS.length)]; L.events++;
    if (firedEvent.moraleClimate) moraleClimateNext = { ...firedEvent.moraleClimate };
    if (firedEvent.legalClimate) legalClimateNext = { ...firedEvent.legalClimate };
  }

  let activeLocationCount = 0;
  const totalResponseCost = workingLocs.reduce((s, l) => s + (l.status === 'organizing' ? responseCostFor(l, resp[l.id]) : 0), 0);
  const totalAllocated = Object.values(alloc).reduce((a, b) => a + b, 0) + totalResponseCost;

  workingLocs = workingLocs.map(l => {
    if (l.status === 'won' || l.status === 'lost') return l;
    if (l.status === 'abandoned') {
      let au = l.antiUnion || { active: false, turnsLeft: 0 };
      if (!au.active && Math.random() < 0.12) au = { active: true, turnsLeft: 2 };
      return { ...l, antiUnion: au };
    }
    const units = isBreakTurn ? 0 : (alloc[l.id] || 0);
    if (units > 0) activeLocationCount++;

    if (l.status === 'campaign') {
      const employerHit = 3 + rand(3);
      const committeeDefense = l.committee?.active ? 2 : 0;
      const defense = Math.min(employerHit, Math.floor(units * 1.2) + committeeDefense);
      let moraleDelta = -(employerHit - defense);
      let fearDelta = 8 - Math.floor(units * 1.5) - (l.committee?.active ? 2 : 0);
      fearDelta = Math.max(-8, fearDelta);
      if (moraleClimateNext.tone === 'positive') { moraleDelta += 2; fearDelta -= 2; }
      else if (moraleClimateNext.tone === 'negative') { moraleDelta -= 2; fearDelta += 2; }
      else if (moraleClimateNext.tone === 'volatile') { fearDelta += 1; }
      if (firedEvent && firedEvent.immediateCampaignFear) fearDelta += firedEvent.immediateCampaignFear;
      if (firedEvent && firedEvent.immediateOrganizingMorale) moraleDelta += Math.round(firedEvent.immediateOrganizingMorale / 2);
      const newMorale = clamp(l.morale + moraleDelta);
      const newFear = clamp(l.fear + fearDelta);
      const trueSupportDelta = Math.round(moraleDelta * 0.5) + (l.committee?.active ? 1 : 0);
      return { ...l, morale: newMorale, trueSupport: clamp((l.trueSupport ?? l.morale) + trueSupportDelta), fear: newFear };
    }

    const r = resp[l.id] || {};
    let gain = baseGain(units) + (locHasTrait(l.id, 'morale') && units > 0 ? 2 : 0);
    let recruitedBonus = Math.floor(l.recruited * 2 * (units > 0 ? 1 : 0.3));
    if (l.manager === 'sympathetic' && units > 0) gain += 3;
    if (orgStamina >= 85 && units > 0) gain += 2;
    if (orgStamina < 40 && units > 0) gain -= 3;
    if (l.visibility >= 80 && units > 0) gain -= 5;
    if (l._retaliatedLastTurn) gain -= 8;

    let newBuyOff = l.buyOff || { active: false, turnsLeft: 0 };
    const buyOffWasActive = newBuyOff.active;
    if (newBuyOff.active) {
      if (r.reframe) { gain += 5; newBuyOff = { active: false, turnsLeft: 0 }; }
      else {
        gain = Math.round(gain * 0.6);
        const turnsLeft = newBuyOff.turnsLeft - 1;
        newBuyOff = turnsLeft <= 0 ? { active: false, turnsLeft: 0 } : { active: true, turnsLeft };
      }
    }

    let momentumPenalty = 0;
    const newAbandonedTurns = units === 0 ? l.abandonedTurns + 1 : 0;
    if (newAbandonedTurns >= 3) momentumPenalty = 10;

    let newCommittee = l.committee || { active: false, strikes: 0 };
    const committeeEligible = !newCommittee.active && l.morale >= COMMITTEE_MORALE_REQ && l.recruited / l.workers >= COMMITTEE_RECRUIT_PCT_REQ;
    if (r.formCommittee && committeeEligible) { newCommittee = { active: true, strikes: 0 }; L.committees++; }
    const committeeMoraleBonus = newCommittee.active ? (locHasTrait(l.id, 'committee') ? 5 : 3) : 0;
    const committeeSupportBonus = newCommittee.active ? (locHasTrait(l.id, 'committee') ? 4 : 2) : 0;
    const committeeVisDrift = newCommittee.active ? 3 : 0;

    let newGrievance = l.grievance, grievanceBonus = 0, grievanceRecruitBonus = 0, grievanceSupportBonus = 0;
    if (l.grievance) {
      const committeeHandlesIt = newCommittee.active && l.grievance.type !== 'legal';
      const responded = r.grievance || committeeHandlesIt;
      if (responded) {
        if (l.grievance.type === 'legal') {
          if (Math.random() < (locHasTrait(l.id, 'legal') ? 0.97 : 0.9)) {
            grievanceBonus = 20; grievanceRecruitBonus = 2; grievanceSupportBonus = 18; newGrievance = null; L.grievanceWins++;
          } else newGrievance = { ...l.grievance, turnsActive: l.grievance.turnsActive + 1 };
        } else if (l.grievance.type === 'material') { grievanceBonus = 15; grievanceSupportBonus = 8; newGrievance = null; }
        else { grievanceBonus = 3; newGrievance = null; }
      } else {
        const nextTurnsActive = l.grievance.turnsActive + 1;
        if (l.grievance.type === 'legal' && nextTurnsActive >= 3) { grievanceBonus = -5; grievanceSupportBonus = -6; newGrievance = null; }
        else if (l.grievance.type !== 'legal' && nextTurnsActive >= 3) newGrievance = null;
        else newGrievance = { ...l.grievance, turnsActive: nextTurnsActive };
      }
    } else {
      const roll = Math.random();
      if (l.morale >= 50 && roll < 0.12) newGrievance = { type: 'legal', turnsActive: 0 };
      else if (roll < 0.27) newGrievance = { type: 'material', turnsActive: 0 };
      else if (roll < 0.52) newGrievance = { type: 'noise', turnsActive: 0 };
    }

    const inCrackdownBand = l.visibility >= 40 && l.visibility < 60;
    let legalRiskAdjust = 0;
    if (inCrackdownBand && r.document) legalRiskAdjust = -8;

    let newAntiUnion = l.antiUnion || { active: false, turnsLeft: 0 };
    let antiUnionPenalty = 0, antiUnionCounterBonus = 0;
    if (newAntiUnion.active) {
      if (r.counter) { newAntiUnion = { active: false, turnsLeft: 0 }; if (locHasTrait(l.id, 'antiunion')) antiUnionCounterBonus = 3; }
      else {
        antiUnionPenalty = 2;
        const turnsLeft = newAntiUnion.turnsLeft - 1;
        newAntiUnion = turnsLeft <= 0 ? { active: false, turnsLeft: 0 } : { active: true, turnsLeft };
      }
    } else {
      const eligible = l.visibility >= 50 || l.manager === 'hostile';
      if (firedEvent && firedEvent.seedAntiUnion) newAntiUnion = { active: true, turnsLeft: 2 };
      else if (eligible && Math.random() < 0.22) newAntiUnion = { active: true, turnsLeft: 2 };
    }

    let climateGain = moraleClimateNext.tone === 'positive' ? 2 : moraleClimateNext.tone === 'negative' ? -2 : moraleClimateNext.tone === 'volatile' ? 1 : 0;
    const eventMoraleBurst = firedEvent && firedEvent.immediateOrganizingMorale ? firedEvent.immediateOrganizingMorale : 0;
    const moraleGain = gain + recruitedBonus - momentumPenalty + grievanceBonus - antiUnionPenalty + antiUnionCounterBonus + climateGain + eventMoraleBurst + committeeMoraleBonus;
    const newMorale = clamp(l.morale + moraleGain);

    const recruitGain = units > 0 ? Math.round(units * 0.35) : 0;
    const newRecruited = Math.min(l.workers, l.recruited + recruitGain + grievanceRecruitBonus);

    const softPortion = gain + climateGain + eventMoraleBurst;
    const trueSupportGain = Math.round(softPortion * 0.35) + recruitGain * 1.4 + grievanceSupportBonus - antiUnionPenalty * 1.3
      - momentumPenalty + committeeSupportBonus - (buyOffWasActive && !r.reframe ? 3 : 0);
    const newTrueSupport = clamp(l.trueSupport + trueSupportGain);

    let visGain = baseVis(units);
    if (units > 0) visGain += Math.floor(l.recruited * 0.6);
    if (orgStamina < 30 && units > 0) visGain += 3;
    if (l.manager === 'hostile' && units > 0) visGain += 4;
    if (l._retaliatedLastTurn) visGain += 5;
    if (l.manager === 'sympathetic') visGain -= 2;
    visGain += committeeVisDrift;

    const legalClimateDrift = legalClimateNext.tone === 'favorable' ? -2 : legalClimateNext.tone === 'hostile' ? 2 : 0;
    const eventLegalBurst = firedEvent && firedEvent.immediateLegalRiskAll ? firedEvent.immediateLegalRiskAll : 0;
    const newLegalRisk = clamp(l.legalRisk - (l._retaliatedLastTurn ? 0 : 3) + legalRiskAdjust + legalClimateDrift + eventLegalBurst, 0, 100);

    return { ...l, morale: newMorale, trueSupport: newTrueSupport, visibility: clamp(l.visibility + visGain), recruited: newRecruited,
      legalRisk: newLegalRisk, abandonedTurns: newAbandonedTurns, grievance: newGrievance, antiUnion: newAntiUnion, buyOff: newBuyOff,
      committee: newCommittee, _retaliatedLastTurn: false };
  });

  // Retaliation
  let retaliated = 0, sophisticationGain = 0;
  workingLocs = workingLocs.map(l => {
    if (l.status !== 'organizing') return l;
    const u = { ...l };
    if (l._watchRecovery && l.morale >= l._watchFloor) { sophisticationGain = 1; u._watchRecovery = false; }
    if (l.visibility >= 60) {
      const forceRetaliate = l.visibility >= 90;
      const retaliateThreshold = legalClimateNext.tone === 'hostile' ? 65 : legalClimateNext.tone === 'favorable' ? 35 : 50;
      if (forceRetaliate || roll100() <= retaliateThreshold) {
        const typeRoll = rand(100);
        const buyOffChance = G.soph >= 1 ? 15 + G.soph * 8 : 0;
        const fireChance = Math.max(15, 50 - G.soph * 10);
        let moraleHit = 0, visHit = 0, legalHit = 0, setBuyOff = false, targetCommittee = false;
        if (typeRoll < buyOffChance) { setBuyOff = true; visHit = -5; L.buyOffs++; }
        else if (typeRoll < buyOffChance + fireChance) { targetCommittee = !!u.committee?.active; moraleHit = targetCommittee ? 35 : 25; visHit = -20; legalHit = 15; L.firings++; }
        else if (typeRoll < buyOffChance + fireChance + 30) { moraleHit = 10; legalHit = 5; }
        else { moraleHit = 5; visHit = -10; legalHit = 8; }
        retaliated++; L.retaliations++;
        u.morale = clamp(u.morale - moraleHit);
        u.trueSupport = clamp((u.trueSupport ?? u.morale) - Math.round(moraleHit * 0.8));
        u.visibility = clamp(u.visibility + visHit);
        u.legalRisk = clamp(u.legalRisk + legalHit);
        u._retaliatedLastTurn = true;
        if (setBuyOff) u.buyOff = { active: true, turnsLeft: 3 };
        if (targetCommittee) {
          const strikes = (u.committee.strikes || 0) + 1;
          if (strikes >= 2) { u.committee = { active: false, strikes: 0 }; u.morale = clamp(u.morale - 15); }
          else u.committee = { ...u.committee, strikes };
        }
        if (moraleHit >= 20 && !targetCommittee) { u._watchRecovery = true; u._watchFloor = 55; }
      }
    }
    return u;
  });
  const sophNext = Math.min(3, G.soph + sophisticationGain);

  // Solidarity network
  const turnSolidarityScore = computeSolidarityScore(workingLocs);
  if (turnSolidarityScore > 0) {
    const cureChance = Math.min(0.5, turnSolidarityScore * 0.07);
    workingLocs = workingLocs.map(l => {
      if (!l.antiUnion?.active || l.status === 'won' || l.status === 'lost') return l;
      if (Math.random() >= cureChance) return l;
      return { ...l, antiUnion: { active: false, turnsLeft: 0 }, morale: clamp(l.morale + 3) };
    });
    const moraleTrickle = Math.min(6, turnSolidarityScore * 2);
    const supportTrickle = Math.min(3, turnSolidarityScore);
    workingLocs = workingLocs.map(l => (l.status !== 'organizing' && l.status !== 'campaign') ? l
      : { ...l, morale: clamp(l.morale + moraleTrickle), trueSupport: clamp((l.trueSupport ?? l.morale) + supportTrickle) });
  }

  // Contagion
  const contagionSources = workingLocs.filter(l => {
    if (!l.antiUnion?.active) return false;
    if (l.status === 'abandoned') return true;
    if (l.status !== 'organizing') return false;
    return !resp[l.id]?.counter;
  });
  if (contagionSources.length) {
    workingLocs = workingLocs.map(l => {
      if (l.status === 'won' || l.status === 'lost' || l.antiUnion?.active) return l;
      const avail = contagionSources.filter(s => s.id !== l.id);
      if (!avail.length) return l;
      const spreadChance = Math.max(0.02, 0.12 + G.soph * 0.05 + (G.emboldened ? 0.05 : 0) - turnSolidarityScore * 0.04);
      if (Math.random() >= spreadChance) return l;
      if (l.status === 'campaign') return { ...l, fear: clamp(l.fear + 8) };
      return { ...l, antiUnion: { active: true, turnsLeft: 2 } };
    });
  }

  // Stamina
  if (!isBreakTurn) {
    let decay = totalAllocated >= 6 ? 5 : (totalAllocated <= 2 ? 1 : 2);
    if (activeLocationCount >= 3) decay += 2;
    if (totalAllocated <= 1) decay = -2;
    if (retaliated > 0) decay += 3;
    orgStamina = clamp(orgStamina - decay, 0, 100);
  }
  let justBroke = false;
  if (orgStamina <= 0 && onBreak === 0) { onBreak = 2; breaksTaken += 1; justBroke = true; L.breaks++; }
  if (onBreak > 0 && !justBroke) { onBreak -= 1; if (onBreak === 0) orgStamina = 80; }

  // Open bargaining
  let prioritiesNext = { ...G.priorities };
  workingLocs.forEach(l => {
    if (!resp[l.id]?.bargain || l.status !== 'organizing') return;
    const comp = LOC_COMPOSITION[l.id] || {};
    const target = BLOCS.find(b => (comp[b.id] || 0) >= 0.5 && !prioritiesNext[b.id]?.known);
    if (!target) return;
    const pr = prioritiesNext[target.id];
    prioritiesNext = { ...prioritiesNext, [target.id]: { ...pr, known: true, heard: (pr.heard || 0) + 1 } };
    L.bargains++;
  });

  // The side offer
  if (G.platform.length >= PLATFORM_SLOTS) {
    const unserved = BLOCS.map(b => ({ b, sat: blocSatisfaction(b.id, G.platform, prioritiesNext), pr: prioritiesNext[b.id] }))
      .filter(x => !x.pr.defected && x.sat < 50).sort((x, y) => x.sat - y.sat);
    if (unserved.length && Math.random() < 0.45) {
      const { b, sat, pr } = unserved[0];
      L.sideOffers++;
      const represented = workingLocs.some(l => l.committee?.active && (LOC_COMPOSITION[l.id]?.[b.id] || 0) >= 0.5 && l.status !== 'lost');
      const takeChance = clamp((DEFECT_THRESHOLD + 25 - sat) / 100 + pr.intensity * 0.08 - (represented ? 0.35 : 0) - (pr.pledged ? 0.12 : 0), 0, 0.85);
      if (Math.random() < takeChance) { prioritiesNext = { ...prioritiesNext, [b.id]: { ...pr, defected: true } }; L.defections++; }
      else prioritiesNext = { ...prioritiesNext, [b.id]: { ...pr, heard: (pr.heard || 0) + 1 } };
    }
  }

  // Elections
  let lostOne = false;
  workingLocs = workingLocs.map(l => {
    if (l.status === 'campaign' && turn >= l.electionTurn) {
      const raw = l.trueSupport ?? l.morale;
      const factor = locBlocFactor(l, G.platform, G.priorities);
      const support = clamp(Math.round(raw * factor));
      const winChance = (support / 100) * 0.6 + ((100 - l.fear) / 100) * 0.4;
      const won = Math.random() <= winChance;
      L.elections.push({ id: l.id, turn, raw, factor, support, fear: l.fear, morale: l.morale, winChance, won, committee: !!l.committee?.active });
      if (won) return { ...l, status: 'won', morale: 95, trueSupport: 95, legalRisk: 0 };
      lostOne = true;
      return { ...l, status: 'lost', morale: 20, trueSupport: 20, fear: 90, abandonedTurns: 99 };
    }
    return l;
  });
  let emboldenedNext = G.emboldened;
  if (lostOne) {
    workingLocs = workingLocs.map(l => l.status !== 'organizing' ? l : { ...l, morale: clamp(l.morale - 15), trueSupport: clamp((l.trueSupport ?? l.morale) - 8) });
    emboldenedNext = true;
  }

  // Commit (mirrors commitResolution)
  const next = { ...G, locations: workingLocs, organizer: { stamina: orgStamina, breaksTaken, onBreak }, priorities: prioritiesNext,
    moraleClimate: moraleClimateNext, legalClimate: legalClimateNext, soph: sophNext, emboldened: emboldenedNext };
  const wonCount = workingLocs.filter(l => l.status === 'won').length;
  if (breaksTaken >= 2) return { ...next, over: 'burnout' };
  if (wonCount >= ACT2_SITES_NEEDED) return { ...next, over: 'win' };
  if (turn >= TOTAL_TURNS) return { ...next, over: 'clock' };
  const winnable = act2Winnability(workingLocs, turn);
  if (!winnable.alive) return { ...next, over: 'called', deadReason: winnable.reason };
  // The shipped check uses ELECTION_LEAD_TURNS = 2, but filing at turn T votes at T+5.
  // Count the turns where the game says "alive" and the arithmetic says otherwise.
  const trulyAlive = (() => {
    const nextTurn = turn + 1;
    const canFinish = workingLocs.filter(l => (l.status === 'campaign' && l.electionTurn <= TOTAL_TURNS)
      || (l.status === 'organizing' && nextTurn + 5 <= TOTAL_TURNS));
    return wonCount + canFinish.length >= ACT2_SITES_NEEDED;
  })();
  if (!trulyAlive) L.falseAlive++;
  return { ...next, turn: turn + 1 };
}
