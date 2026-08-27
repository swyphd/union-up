// A headless Act One. Every number comes from core.mjs, which is generated straight out
// of src/App.jsx — the narration is dropped, the arithmetic is not.
import * as C from './core.mjs';
const { clamp, rand, infOn, outgoingTies, signedBacking, orgChartResistance, holdsFast,
  infTrait, affList, poisonedAff, convoGain, publicGain, signChance,
  misfireChance, revealCount, revealAffinities, sharedAffinities, visibleShared, tieOn, tieFrom,
  PUBLIC_TIERS, ACT1_ACTION, ACT1_CARDS_NEEDED, ACT1_TOTAL_WORKERS, ACT1_RECRUIT_REQ,
  ACT1_HOURS_PER_ORGANIZER, EDGE_MIN_DRAW, XP_PER_ACTION, XP_PER_CARD, IDLE_GRACE, IDLE_QUIT,
  CARD_LIFESPAN, KIRKMAN_SIGHT, CONSULTANT_TRIGGER_COMMITTEE, CONSULTANT_SETPIECE_GAP,
  CONSULTANT_MAX_EACH, PERK_WEEKS, AFFINITY_POOL, AFF_BY_ID, committeeHours,
  turnoutChance, yesChance, voteProjection, OUTSIDERS, ELECTION_WEEKS } = C;

export function newGame() {
  const workers = C.makeAct1Workers();
  return {
    workers, influence: C.generateInfluence(workers), week: 1, heat: 0, stage: 'drive',
    consultant: { active: false, arrivedWeek: null, lastSetPiece: 0, raises: 0, threats: 0, perks: 0 },
    perks: [], outsiders: [], filedWeek: null, electionWeek: null, ballot: null,
    tally: { convoGain: 0, publicGain: 0, passiveGain: 0, misfires: 0, asks: 0, signs: 0, burns: 0 },
  };
}

// One week of plans resolved. `plan` is a list of {actorId, type, targetId}.
export function resolveWeek(G, plan) {
  const w = G.workers.map(x => ({ ...x }));
  const byId = (id) => w.find(x => x.id === id);
  const influence = G.influence;
  const week = G.week, stage = G.stage;
  let heatNext = G.heat;
  const touched = new Set();
  const T = G.tally;
  const gainXp = (a, n) => { if (a?.organizer) a.experience = clamp((a.experience || 0) + n, 0, 100); };
  const bump = (x, amount, trueAmount = null) => {
    x.support = clamp(x.support + amount);
    const real = trueAmount === null ? Math.round(amount * 0.3) : trueAmount;
    x.trueSupport = clamp((x.trueSupport ?? x.support) + real);
    touched.add(x.id);
  };

  // --- MAPPING ---
  for (let i = 0; i < plan.filter(e => e.type === 'map').length; i++) {
    const hidden = w.filter(x => !x.revealed && !x.burned);
    if (!hidden.length) break;
    [...hidden].sort(() => Math.random() - 0.5).slice(0, 3).forEach(x => { x.revealed = true; });
  }

  // --- CONVERSATIONS ---
  plan.filter(e => e.type === 'quick' || e.type === 'deep').forEach(e => {
    const actor = byId(e.actorId), target = byId(e.targetId);
    if (!actor || !target || actor.burned || target.burned) return;
    const tie = tieOn(influence, actor, target);
    const g = convoGain(actor, target, tie);
    target.revealed = true;
    revealAffinities(target, revealCount(e.type, actor, target));
    if (e.type === 'deep' && Math.random() < misfireChance(actor, target)) {
      target.guarded = 3; gainXp(actor, 3); bump(target, -2, -4); T.misfires++;
      return;
    }
    if (e.type === 'deep') target.trueKnown = true;
    gainXp(actor, e.type === 'deep' ? XP_PER_ACTION : Math.round(XP_PER_ACTION * 0.6));
    const before = target.support;
    bump(target, e.type === 'deep' ? g.deep : g.quick, e.type === 'deep' ? g.deepTrue : g.quickTrue);
    T.convoGain += target.support - before;
    if (target.guarded > 0 && e.type === 'deep' && visibleShared(actor, target).length) target.guarded = 0;
  });

  // --- PUBLIC ACTIONS ---
  plan.filter(e => PUBLIC_TIERS[e.type]).forEach(e => {
    const actor = byId(e.actorId);
    if (!actor || actor.burned) return;
    const tier = PUBLIC_TIERS[e.type];
    const uses = actor.publicUses?.[e.type] || 0;
    actor.publicUses = { ...actor.publicUses, [e.type]: uses + 1 };
    actor.support = clamp(actor.support + tier.selfSupport);
    heatNext = clamp(heatNext + Math.round(tier.heat * (infTrait(actor).publicHeat || 1)));
    outgoingTies(influence, actor.id).map(t => {
      const tg = byId(t.id);
      return tg && !tg.burned ? { ...t, target: tg, tie: tieFrom(t.weight, actor, tg) } : null;
    }).filter(t => t && t.tie >= EDGE_MIN_DRAW).forEach(t => {
      const target = t.target;
      const gain = publicGain(actor, target, t.tie, e.type, uses);
      if (gain <= 0) return;
      bump(target, gain, Math.round(gain * 0.15));
      T.publicGain += gain;
    });
    gainXp(actor, XP_PER_ACTION);
    if (tier.burn > 0) {
      const lastOne = w.filter(x => x.organizer && !x.burned).length <= 1;
      const risk = tier.burn * (0.6 + heatNext / 100) * (infTrait(actor).burnMult ?? 1);
      if (Math.random() < risk) {
        if (lastOne) { heatNext = clamp(heatNext + 8); actor.shaken = 1; }
        else {
          actor.burned = true; actor.organizer = false; T.burns++;
          outgoingTies(influence, actor.id).forEach(t => {
            const target = byId(t.id);
            if (!target || target.burned) return;
            const hit = Math.round((t.weight / 100) * 9);
            if (hit > 0) bump(target, -hit);
          });
          heatNext = clamp(heatNext + 6);
        }
      }
    }
  });

  // --- CARD ASKS ---
  plan.filter(e => e.type === 'ask').forEach(e => {
    const actor = byId(e.actorId), target = byId(e.targetId);
    if (!actor || !target || actor.burned || target.burned || target.signed) return;
    const tie = tieOn(influence, actor, target);
    const chance = signChance(actor, target, tie);
    target.revealed = true; touched.add(target.id); T.asks++;
    if (Math.random() < chance) {
      target.signed = true; target.signedWeek = week; T.signs++;
      target.support = Math.max(target.support, 78);
      target.trueSupport = clamp(Math.max(target.trueSupport ?? 0, 72));
      gainXp(actor, XP_PER_CARD); heatNext = clamp(heatNext + 4);
      outgoingTies(influence, target.id).forEach(t => {
        const other = byId(t.id);
        if (other && !other.burned && !other.signed) bump(other, Math.round((t.weight / 100) * 4));
      });
    } else {
      gainXp(actor, 4);
      target.support = clamp(target.support - 5);
      target.askedRecently = 2;
    }
  });

  // --- COMMITTEE GROWTH ---
  plan.filter(e => e.type === 'recruit').forEach(e => {
    const actor = byId(e.actorId), target = byId(e.targetId);
    if (!actor || !target || target.burned || target.organizer || !target.signed) return;
    if (!target.trueKnown || (target.trueSupport ?? 0) < ACT1_RECRUIT_REQ) return;
    target.organizer = true; target.revealed = true; target.weeksIdle = 0; target.signedWeek = week;
    gainXp(actor, XP_PER_ACTION);
    target.knownAffinities = [...affList(target)];
    target.trueKnown = true;
    outgoingTies(influence, target.id).filter(t => t.weight >= 40).forEach(t => {
      const tg = byId(t.id); if (tg) tg.trueKnown = true;
    });
  });

  // --- CHECK-INS ---
  plan.filter(e => e.type === 'checkin').forEach(e => {
    const actor = byId(e.actorId), target = byId(e.targetId);
    if (!actor || !target || actor.burned || target.burned || !target.organizer) return;
    target.weeksIdle = 0; target.shaken = 0;
    gainXp(target, 10); gainXp(actor, 4);
    target.trueSupport = clamp((target.trueSupport ?? target.support) + 3);
    touched.add(target.id);
  });

  // --- THE FLOOR TALKS ---
  w.filter(x => x.signed && !x.burned).forEach(signer => {
    outgoingTies(influence, signer.id).forEach(t => {
      if (t.weight < 50) return;
      const target = byId(t.id);
      if (!target || target.burned || target.signed) return;
      const gain = Math.max(1, Math.round((tieFrom(t.weight, signer, target) / 100) * 2
        * (infTrait(signer).passive || 1) * C.recvMult(target)));
      bump(target, gain); T.passiveGain += gain;
    });
  });

  // --- COMMITTEE NEGLECT ---
  w.forEach(x => {
    if (!x.organizer || x.burned) return;
    const used = plan.some(e => e.actorId === x.id) || plan.some(e => e.type === 'checkin' && e.targetId === x.id);
    x.weeksIdle = used ? 0 : (x.weeksIdle || 0) + 1;
    if (x.weeksIdle >= IDLE_QUIT) {
      x.organizer = false; x.weeksIdle = 0;
      x.experience = Math.round((x.experience || 0) * 0.6);
      x.trueSupport = clamp((x.trueSupport ?? x.support) - 12);
    }
  });

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
    }
  });

  // --- CARDS GO STALE ---
  w.forEach(x => {
    if (!x.signed || x.burned || x.signedWeek == null) return;
    if (week - x.signedWeek < CARD_LIFESPAN) return;
    x.signed = false; x.signedWeek = null;
    x.staleCount = (x.staleCount || 0) + 1;
    x.askedRecently = 2;
    x.support = clamp(x.support - 6);
    x.trueSupport = clamp((x.trueSupport ?? x.support) - 10);
    if (x.organizer) {
      x.experience = Math.round((x.experience || 0) * 0.85);
      x.signed = true; x.signedWeek = week;
    }
  });

  // --- THE OUTSIDER LADDER ---
  const outsidersNext = [...G.outsiders];
  {
    const ctx = { committee: w.filter(x => x.organizer && !x.burned).length,
      signed: w.filter(x => x.signed).length, heat: heatNext, stage };
    OUTSIDERS.forEach(o => {
      if (outsidersNext.includes(o.id) || o.id === 'consultant') return;
      if (o.arrival(ctx)) outsidersNext.push(o.id);
    });
    if (outsidersNext.includes('boss') && Math.random() < 0.5) {
      w.forEach(x => {
        if (x.burned || x.organizer) return;
        x.support = clamp(x.support + 4 + rand(4));
        x.trueSupport = clamp((x.trueSupport ?? x.support) - 2);
      });
    }
    if (outsidersNext.includes('corporate') && Math.random() < 0.45) {
      const teams = ['engineering', 'qa', 'production'];
      const t = teams[rand(teams.length)];
      w.forEach(x => {
        if (x.burned || x.team !== t) return;
        x.fulfillment = clamp(x.fulfillment + 6);
        x.trueSupport = clamp((x.trueSupport ?? x.support) - 4);
      });
      heatNext = clamp(heatNext + 5);
    }
    if (outsidersNext.includes('celebrity') && Math.random() < 0.4) {
      w.forEach(x => {
        if (x.burned) return;
        const t = infTrait(x);
        if (t.holdsFast || t.id === 'hothead') {
          x.support = clamp(x.support + 6);
          x.trueSupport = clamp((x.trueSupport ?? x.support) + 5);
        } else {
          x.support = clamp(x.support - 3);
          x.trueSupport = clamp((x.trueSupport ?? x.support) - 2);
        }
      });
      heatNext = clamp(heatNext + 9);
    }
  }

  // --- MANAGEMENT ---
  heatNext = clamp(heatNext - (5 + Math.floor(heatNext / 12)), 0, 100);
  if (heatNext >= 45 && Math.random() < 0.55) {
    const roll = rand(100);
    const teams = ['engineering', 'qa', 'production'];
    if (roll < 45) {
      const meetTeam = teams[rand(teams.length)];
      w.forEach(x => {
        if (x.burned || x.signed || x.team !== meetTeam || holdsFast(x)) return;
        const raw = Math.max(2, Math.round(7 - x.support / 20));
        const hit = Math.max(1, Math.round(raw * orgChartResistance(signedBacking(influence, w, x.id))));
        x.support = clamp(x.support - hit);
        x.trueSupport = clamp((x.trueSupport ?? x.support) - Math.round(hit * 0.4));
      });
      heatNext = clamp(heatNext - 8);
    } else if (roll < 78) {
      const pickTeam = teams[rand(teams.length)];
      w.filter(x => !x.burned && x.team === pickTeam).forEach(x => { x.fulfillment = clamp(x.fulfillment + 12); });
      heatNext = clamp(heatNext - 6);
    } else {
      const cands = w.filter(x => x.organizer && !x.burned);
      if (cands.length > 1) cands[rand(cands.length)].shaken = 1;
      heatNext = clamp(heatNext - 4);
    }
  }

  // --- THE CONSULTANT ---
  let consultantNext = { ...G.consultant };
  const perksNext = G.perks.filter(pk => pk.until > week);
  G.perks.filter(pk => pk.until <= week).forEach(pk => {
    w.forEach(x => { x.poisoned = poisonedAff(x).filter(t => t !== pk.id); });
  });
  const consultantPerks = [];
  const committeeNow = w.filter(x => x.organizer && !x.burned).length;
  const signedForTrigger = w.filter(x => x.signed).length;

  if (!consultantNext.active && (committeeNow >= CONSULTANT_TRIGGER_COMMITTEE || signedForTrigger >= ACT1_CARDS_NEEDED - 2)) {
    consultantNext = { ...consultantNext, active: true, arrivedWeek: week };
  } else if (consultantNext.active) {
    const inCampaign = stage === 'campaign';
    const seesNetwork = G.heat >= KIRKMAN_SIGHT || inCampaign;
    const marks = w.filter(x => !x.burned && x.support >= 30 && (inCampaign || !x.signed))
      .map(x => ({ t: x, score: x.support - (seesNetwork ? signedBacking(influence, w, x.id) : 0) * 0.35 - (x.signed ? 25 : 0) }))
      .sort((a, b) => b.score - a.score).slice(0, inCampaign ? 4 : 2);
    marks.forEach(({ t }) => {
      t.pressuredCount = (t.pressuredCount || 0) + 1;
      if (holdsFast(t)) return;
      const resist = Math.min(5, Math.round(signedBacking(influence, w, t.id) / 30));
      const hit = Math.max(1, Math.round((8 - resist) * (seesNetwork ? 1 : 0.55)));
      t.support = clamp(t.support - hit);
      t.trueSupport = clamp((t.trueSupport ?? t.support) - Math.round(hit * 0.6));
      t.underPressure = 2;
    });
    if (inCampaign) {
      w.forEach(x => {
        if (x.burned) return;
        const hit = Math.max(1, Math.round(4 - signedBacking(influence, w, x.id) / 70 - (x.signed ? 1 : 0)));
        x.support = clamp(x.support - hit);
      });
    }
    if (week - (consultantNext.lastSetPiece || 0) >= CONSULTANT_SETPIECE_GAP) {
      const canRaise = consultantNext.raises < CONSULTANT_MAX_EACH;
      const canThreat = consultantNext.threats < CONSULTANT_MAX_EACH;
      const threatPool = w.filter(x => x.organizer && !x.burned);
      const raisePool = w.filter(x => !x.burned && !x.organizer && (x.signed || x.support >= 55));
      const alreadyPoisoned = new Set(w.flatMap(x => poisonedAff(x)));
      const perkCandidates = AFFINITY_POOL.filter(a => !alreadyPoisoned.has(a.id)).map(a => {
        const holders = w.filter(x => !x.burned && affList(x).includes(a.id));
        const reach = seesNetwork
          ? w.filter(x => x.organizer && !x.burned).reduce((n, org) => n + (affList(org).includes(a.id)
              ? w.filter(x => !x.burned && !x.signed && x.id !== org.id && affList(x).includes(a.id)).length : 0), 0)
          : holders.filter(x => !x.signed).length;
        return { a, holders, reach };
      }).filter(c => c.holders.length >= 2 && c.reach > 0).sort((x, y) => y.reach - x.reach);
      const canPerk = consultantNext.perks < CONSULTANT_MAX_EACH && perkCandidates.length > 0;
      const options = [];
      if (canThreat && threatPool.length > 1) options.push('threat');
      if (canRaise && raisePool.length) options.push('raise');
      if (canPerk) options.push('perk');
      const chosen = options.length ? options[rand(options.length)] : null;

      if (chosen === 'perk') {
        const { a: aff, holders } = perkCandidates[0];
        consultantNext = { ...consultantNext, perks: (consultantNext.perks || 0) + 1, lastSetPiece: week };
        holders.forEach(x => {
          x.poisoned = [...poisonedAff(x), aff.id];
          if (holdsFast(x)) return;
          const shield = Math.min(6, Math.round(signedBacking(influence, w, x.id) / 25));
          const trueHit = Math.max(1, 9 - shield);
          x.trueSupport = clamp((x.trueSupport ?? x.support) - trueHit);
          x.support = clamp(x.support - Math.max(1, Math.round(trueHit * 0.4)));
          x.fulfillment = clamp(x.fulfillment + Math.max(2, 12 - shield));
        });
        heatNext = clamp(heatNext - 4);
        consultantPerks.push({ id: aff.id, until: week + PERK_WEEKS });
      } else if (chosen === 'threat') {
        const mb = (x) => signedBacking(influence, w, x.id);
        const mark = [...threatPool].sort((a, b) => mb(a) - mb(b))[0];
        const foldChance = Math.max(0.1, Math.min(0.5, 0.5 - mb(mark) / 300));
        consultantNext = { ...consultantNext, threats: consultantNext.threats + 1, lastSetPiece: week };
        if (Math.random() < foldChance) {
          mark.organizer = false; mark.support = clamp(mark.support - 25); mark.underPressure = 2;
          outgoingTies(influence, mark.id).forEach(t => {
            const o = byId(t.id);
            if (o && !o.burned && !o.signed) bump(o, -Math.round((t.weight / 100) * 5));
          });
        } else {
          mark.support = clamp(mark.support + 5); heatNext = clamp(heatNext + 8);
          outgoingTies(influence, mark.id).forEach(t => {
            const o = byId(t.id);
            if (o && !o.burned && !o.signed) bump(o, Math.round((t.weight / 100) * 6));
          });
        }
      } else if (chosen === 'raise') {
        const mark = [...raisePool].sort((a, b) => a.support - b.support)[0];
        const takeChance = Math.min(0.7, Math.max(0.05, (100 - mark.support) / 60));
        consultantNext = { ...consultantNext, raises: consultantNext.raises + 1, lastSetPiece: week };
        if (Math.random() < takeChance) {
          mark.signed = false; mark.support = clamp(mark.support - 35);
          mark.underPressure = 2; heatNext = clamp(heatNext - 5);
        } else {
          mark.support = clamp(mark.support + 8); heatNext = clamp(heatNext + 6);
          outgoingTies(influence, mark.id).forEach(t => {
            const o = byId(t.id);
            if (o && !o.burned && !o.signed) bump(o, Math.round((t.weight / 100) * 6));
          });
        }
      }
    }
  }

  // --- ELECTION DAY ---
  let ballot = null;
  if (stage === 'campaign' && G.electionWeek != null && week >= G.electionWeek) {
    let yes = 0, no = 0, out = 0;
    w.forEach(x => {
      if (Math.random() >= turnoutChance(x)) { out++; return; }
      if (Math.random() < yesChance(x)) yes++; else no++;
    });
    ballot = { yes, no, out, cast: yes + no, won: yes > no };
  }

  return { ...G, workers: w, heat: heatNext, consultant: consultantNext,
    perks: [...perksNext, ...consultantPerks], outsiders: outsidersNext,
    ballot, week: week + 1 };
}

export { C };
