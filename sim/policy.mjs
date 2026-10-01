// A competent-but-not-omniscient player. It decides on what the UI actually shows —
// stated support, revealed affinities, true support only where trueKnown is set — so
// the sim measures the rules, not a cheat.
import * as C from '../src/engine/act1/index.js';
const { ACT1_ACTION, ACT1_RECRUIT_REQ, committeeHours, infOn, visibleShared, affList, knownAff } = C;

export function planWeek(G, opts = {}) {
  const w = G.workers;
  const orgs = w.filter(x => x.organizer && !x.burned);
  const budget = new Map(orgs.map(o => [o.id, committeeHours(o)]));
  const plan = [];
  const spent = (id) => budget.get(id) || 0;
  const take = (o, type, targetId) => {
    const cost = ACT1_ACTION[type].hours;
    if (spent(o.id) < cost) return false;
    budget.set(o.id, spent(o.id) - cost);
    plan.push({ actorId: o.id, type, targetId });
    return true;
  };
  // Who has the most pull on this person, among organizers with hours left?
  const bestActor = (target, cost) => orgs
    .filter(o => o.id !== target.id && spent(o.id) >= cost)
    .sort((a, b) => infOn(G.influence, b.id, target.id) - infOn(G.influence, a.id, target.id))[0];

  const busy = new Set();   // one action per target per week, as a player would

  // 1. Look after the committee first: anyone drifting or shaken.
  orgs.filter(x => (x.weeksIdle || 0) >= 2 || x.shaken > 0).forEach(t => {
    const a = bestActor(t, 1); if (a) { take(a, 'checkin', t.id); busy.add(t.id); }
  });

  // 2. Recruit anyone the committee can actually vouch for. More hours every week.
  w.filter(x => x.signed && !x.organizer && !x.burned && x.trueKnown
      && (x.trueSupport ?? 0) >= ACT1_RECRUIT_REQ && !busy.has(x.id))
    .sort((a, b) => (b.trueSupport ?? 0) - (a.trueSupport ?? 0))
    .forEach(t => {
      const a = orgs.filter(o => o.id !== t.id && spent(o.id) >= 3 && (C.isKnownFriend(o, t.id) || C.vouchFor(o, t, w)))
        .sort((p, q) => infOn(G.influence, q.id, t.id) - infOn(G.influence, p.id, t.id))[0];
      if (a) { take(a, 'recruit', t.id); busy.add(t.id); }
    });

  // 3. Ask the people who look ready. Uses true support when a deep talk has revealed it,
  //    stated support otherwise — which is exactly how a real campaign over-asks.
  w.filter(x => !x.signed && !x.burned && !busy.has(x.id) && !x.askedRecently)
    .map(x => ({ x, read: x.trueKnown ? (x.trueSupport ?? x.support) : x.support }))
    .filter(({ read }) => read >= (opts.askBar ?? 62))
    .sort((a, b) => b.read - a.read)
    .forEach(({ x }) => { const a = bestActor(x, 2); if (a) { take(a, 'ask', x.id); busy.add(x.id); } });

  // 5. Deep talks. The careful player only sits down where there is visible common
  //    ground; the sloppy one runs the long version on whoever they have most pull with
  //    and eats the misfires. This is the whole scouting question, in one flag.
  w.filter(x => !x.signed && !x.burned && !busy.has(x.id))
    .forEach(t => {
      const pool = orgs.filter(o => o.id !== t.id && spent(o.id) >= 2
        && (opts.blindDeep || visibleShared(o, t).length > 0));
      const a = pool.sort((p, q) => infOn(G.influence, q.id, t.id) - infOn(G.influence, p.id, t.id))[0];
      if (a) { take(a, 'deep', t.id); busy.add(t.id); }
    });

  // 6. Spend what's left scouting: quick chats surface affinities and cost one hour.
  const unscouted = w.filter(x => !x.signed && !x.burned && !busy.has(x.id))
    .sort((a, b) => (knownAff(a).length - affList(a).length) - (knownAff(b).length - affList(b).length));
  for (const t of unscouted) {
    const a = bestActor(t, 1);
    if (a) { take(a, 'quick', t.id); busy.add(t.id); }
  }
  return plan;
}

// THE MAPPER. Plays the social floor the way the plan says it should be played: it reads
// only what the board shows (friend slots, known friendships, circles you have found, the
// digit), sits down only where it has a path in (a friend, a vouch through a signed mutual
// friend, or common ground it has found), favours hubs, asks solid 4s and 5s through
// whoever is closest, and recruits from circles and teams the committee does not cover.
export function planWeekMapper(G, opts = {}) {
  const w = G.workers, soc = G.social;
  const orgs = w.filter(x => x.organizer && !x.burned);
  // `opts.spent` and `opts.plan` let the Phase 2 player spend its counters first.
  const budget = new Map(orgs.map(o => [o.id, committeeHours(o) - (opts.spent?.get(o.id) || 0)]));
  const plan = opts.plan ? [...opts.plan] : [];
  const left = (id) => budget.get(id) || 0;
  const take = (o, type, targetId) => {
    const cost = ACT1_ACTION[type].hours;
    if (left(o.id) < cost) return false;
    budget.set(o.id, left(o.id) - cost);
    plan.push({ actorId: o.id, type, targetId });
    return true;
  };
  const tie = (o, t) => C.tieOn(G.influence, o, t, w);
  const best = (t, cost, needPath = false) => orgs
    .filter(o => o.id !== t.id && left(o.id) >= cost && (!needPath || C.pathTo(o, t, w)))
    .sort((a, b) => tie(b, t) - tie(a, t))[0];
  const slots = (x) => C.friendsOf(soc, x.id).length;
  const busy = new Set(opts.busy || []);
  const read = (x) => C.readOf(x, G.week);

  // 1. Keep the committee.
  orgs.filter(x => (x.weeksIdle || 0) >= 2 || x.shaken > 0).forEach(t => {
    const a = best(t, 1); if (a) { take(a, 'checkin', t.id); busy.add(t.id); }
  });

  // 2. The committee. Drop known leaks; vet when he plainly knows more than he should;
  //    recruit for coverage (or everybody, for the comparison).
  const recruiter = (t) => orgs.filter(o => o.id !== t.id && left(o.id) >= 3 && (C.isKnownFriend(o, t.id) || C.vouchFor(o, t, w)))
    .sort((a, b) => tie(b, t) - tie(a, t))[0];
  orgs.filter(x => x.leakKnown && !busy.has(x.id)).forEach(t => { const a = best(t, 1); if (a) { take(a, 'drop', t.id); busy.add(t.id); } });
  // What the player sees: somebody got to a target first in the last couple of weeks.
  const suspected = C.recentlyTipped(w, G.week).length > 0;
  if (suspected || opts.alwaysVet) {
    const vetter = (t) => orgs.filter(o => o.id !== t.id && left(o.id) >= 1 && (o.experience || 0) >= C.VET_MIN_XP).sort((a, b) => tie(b, t) - tie(a, t))[0];
    orgs.filter(x => x.vettedWeek == null && !x.leakKnown && !busy.has(x.id))
      .forEach(t => { const a = vetter(t); if (a) { take(a, 'checkin', t.id); busy.add(t.id); } });
  }
  const covered = { circle: new Set(orgs.map(o => C.circleOfId(soc, o.id)).filter(Boolean)), team: new Set(orgs.map(o => o.team)) };
  const fills = (x) => (x.circleKnown && C.circleOfId(soc, x.id) && !covered.circle.has(C.circleOfId(soc, x.id)) ? 2 : 0) + (!covered.team.has(x.team) ? 1 : 0);
  let size = orgs.length;
  w.filter(x => x.signed && !x.organizer && !x.burned && !busy.has(x.id))
    .map(x => ({ x, r: C.rating(x.trueSupport ?? 0), gap: fills(x) }))
    .filter(({ r, gap }) => opts.recruit === 'all' ? true
      : opts.recruit === 'fives' ? r >= 5
      : (r >= 5 && (gap > 0 || size < C.COMMITTEE_COMFORT)) || (r === 4 && gap >= 2 && size < C.COMMITTEE_COMFORT))
    .sort((p, q) => q.gap - p.gap || q.r - p.r || slots(q.x) - slots(p.x))
    .forEach(({ x }) => {
      const a = recruiter(x);
      if (a && take(a, 'recruit', x.id)) { busy.add(x.id); size++; if (x.circleKnown) covered.circle.add(C.circleOfId(soc, x.id)); covered.team.add(x.team); }
    });

  // 3. Ask the people whose read says ready.
  w.filter(x => !x.signed && !x.burned && !busy.has(x.id) && !x.askedRecently)
    .map(x => ({ x, r: read(x) }))
    .filter(({ r }) => r.exact && r.mid >= (opts.askAt ?? opts.askBar ?? 74))
    .sort((p, q) => q.r.mid - p.r.mid)
    .forEach(({ x }) => { const a = best(x, 2); if (a) { take(a, 'ask', x.id); busy.add(x.id); } });

  // A player who stops mapping: after this week, only asks and committee business.
  if (opts.stopMappingAt != null && G.week > opts.stopMappingAt) return plan;

  // 4. Sit down where there is a path. Unread hubs first (a hub's sit-down maps three
  //    people), then everyone below the ask bar, closest to it first: the sit-down is
  //    also the only thing that really moves somebody.
  const bar = opts.askAt ?? opts.askBar ?? 74;
  const deepScore = (x) => {
    const r = read(x);
    if (!r.exact) return 200 + slots(x) * (opts.hubWeight ?? 20) + r.hi / 4;
    return r.mid < bar ? 100 + r.mid : -1;
  };
  w.filter(x => !x.signed && !x.burned && !busy.has(x.id) && deepScore(x) >= 0)
    .sort((p, q) => deepScore(q) - deepScore(p))
    .forEach(t => { const a = best(t, 2, true); if (a) { take(a, 'deep', t.id); busy.add(t.id); } });

  // 5. Scout with what is left: people next to the mapped network, hubs first, so the
  //    next sit-down has a path.
  const nearNetwork = (x) => C.knownFriends(x).length > 0 ? 1 : 0;
  w.filter(x => !x.signed && !x.burned && !busy.has(x.id))
    .sort((p, q) => nearNetwork(q) - nearNetwork(p) || slots(q) - slots(p))
    .forEach(t => { const a = best(t, 1); if (a) { take(a, 'quick', t.id); busy.add(t.id); } });
  return plan;
}

// PHASE 2. `opts.phase2` picks the player once the petition is in:
//   'counter'  answers the calendar: gets to the department or crowd first with whoever on
//              the committee knows the most people there, stands with whoever is threatened
//              or bought, debriefs the friends who sat through last week's move, and runs a
//              coordinated action every other week, escalating. Then it keeps mapping.
//   'talker'   ignores the calendar and keeps having sit-downs (the mapper, unchanged).
// Reads only what the board shows: the calendar, known friends, crowds found, the digit.
export function planWeekPhase2(G, opts = {}) {
  if (opts.phase2 === 'idle') return [];
  if (opts.phase2 !== 'counter') return planWeekMapper(G, opts);
  const w = G.workers, soc = G.social;
  const orgs = w.filter(x => x.organizer && !x.burned);
  const spent = new Map();
  const left = (o) => committeeHours(o) - (spent.get(o.id) || 0);
  const plan = [], busy = new Set();
  const take = (o, type, extra = {}) => {
    if (left(o) < ACT1_ACTION[type].hours) return false;
    spent.set(o.id, (spent.get(o.id) || 0) + ACT1_ACTION[type].hours);
    plan.push({ actorId: o.id, type, targetId: null, ...extra });
    return true;
  };
  // Who a committee member can be seen to cover: the friends you have mapped, and the
  // people you have found in their crowd.
  const covers = (o) => {
    const mine = C.seenCircle(o, soc);
    const inside = move?.kind === 'meeting' ? o.team === move.team : move?.kind === 'perk' && mine === move.circle;
    return new Set([o.id, ...C.knownFriends(o), ...w.filter(x => (mine && C.seenCircle(x, soc) === mine)
      || (inside && (move.kind === 'meeting' ? x.team === move.team : C.seenCircle(x, soc) === move.circle))).map(x => x.id)]);
  };
  const move = G.campaign?.next;
  if (move && (move.kind === 'meeting' || move.kind === 'perk')) {
    const hit = move.kind === 'meeting'
      ? w.filter(x => !x.burned && !x.organizer && x.team === move.team)
      : w.filter(x => !x.burned && !x.organizer && C.seenCircle(x, soc) === move.circle);
    const hitIds = new Set(hit.map(x => x.id));
    const covered = new Set();
    const gain = (o) => [...covers(o)].filter(id => hitIds.has(id) && !covered.has(id)).length;
    for (let i = 0; i < (opts.inoculators ?? 2); i++) {
      const o = orgs.filter(o => left(o) >= 1).sort((a, b) => gain(b) - gain(a))[0];
      if (!o || gain(o) < (i === 0 ? 1 : 2)) break;
      covers(o).forEach(id => covered.add(id));
      take(o, 'inoculate', move.kind === 'meeting' ? { team: move.team } : { circle: move.circle });
    }
  } else if (move && (move.kind === 'threat' || move.kind === 'raise')) {
    const t = w.find(x => x.id === move.targetId);
    const o = orgs.filter(o => o.id !== move.targetId && left(o) >= 1)
      .sort((a, b) => (C.isKnownFriend(b, move.targetId) ? 1 : 0) - (C.isKnownFriend(a, move.targetId) ? 1 : 0))[0];
    if (t && o) { take(o, 'standwith', { targetId: t.id }); busy.add(t.id); }
  }
  // Debrief the friends who sat through last week's move and no longer read solid.
  const last = G.campaign?.last;
  if (last && G.week - last.week <= 1) {
    const victims = C.moveVictims(last, w, soc).filter(x => !x.organizer && !C.readOf(x, G.week).exact);
    victims.slice(0, opts.debriefs ?? 3).forEach(x => {
      const o = orgs.filter(o => C.isKnownFriend(o, x.id) && left(o) >= 1).sort((a, b) => left(b) - left(a))[0];
      if (o && !busy.has(x.id)) { take(o, 'debrief', { targetId: x.id }); busy.add(x.id); }
    });
  }
  // A coordinated action every other week, at the highest tier the count you can see clears.
  // The count you can see: the committee, everyone signed they reach, and half of the rest
  // who read as a 4 or better.
  const sinceFiling = G.week - (G.filedWeek ?? G.week);
  if ((opts.actionEvery ?? 2) > 0 && sinceFiling % (opts.actionEvery ?? 2) === (opts.actionPhase ?? 1)) {
    const parts = orgs.filter(o => left(o) >= 1);
    const pool = new Set(parts.flatMap(o => [...covers(o)]));
    const expect = [...pool].map(id => w.find(x => x.id === id)).filter(x => x && !x.burned)
      .reduce((n, x) => n + (x.organizer ? 1 : x.signed ? 0.8 : (C.ratingGlyph(x, G.week).digit || 0) >= 4 ? 0.5 : 0.1), 0);
    const uses = G.campaign?.uses || {};
    const fits = C.COORDINATED_ORDER.filter(t => C.COORDINATED[t].bar <= expect * (opts.actionNerve ?? 1));
    const tier = opts.tier ?? (fits.filter(t => !uses[t]).pop() || fits.pop());
    if (tier) parts.forEach(o => take(o, 'turnout', { tier }));
  }
  return planWeekMapper(G, { ...opts, spent, plan, busy });
}
