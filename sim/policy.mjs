// A competent-but-not-omniscient player. It decides on what the UI actually shows —
// stated support, revealed affinities, true support only where trueKnown is set — so
// the sim measures the rules, not a cheat.
import * as C from '../src/engine/act1/index.js';
const { ACT1_ACTION, ACT1_RECRUIT_REQ, ACT1_PUBLIC_UNLOCK_WEEK, committeeHours, infOn,
  visibleShared, affList, knownAff, EDGE_MIN_DRAW, outgoingTies, ASSUMED } = C;

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
    .forEach(t => { const a = bestActor(t, 3); if (a) { take(a, 'recruit', t.id); busy.add(t.id); } });

  // 3. Ask the people who look ready. Uses true support when a deep talk has revealed it,
  //    stated support otherwise — which is exactly how a real campaign over-asks.
  w.filter(x => !x.signed && !x.burned && !busy.has(x.id) && !x.askedRecently)
    .map(x => ({ x, read: x.trueKnown ? (x.trueSupport ?? x.support) : x.support }))
    .filter(({ read }) => read >= (opts.askBar ?? 62))
    .sort((a, b) => b.read - a.read)
    .forEach(({ x }) => { const a = bestActor(x, 2); if (a) { take(a, 'ask', x.id); busy.add(x.id); } });

  // 4. Public actions, once unlocked: escalate with the most-connected organizer.
  // The ballot runs on stated support; the cards run on true support. So the sharp
  // question is not whether to go public but WHEN — `pubPhase` picks the stage.
  const pubOk = opts.pubPhase === 'campaign' ? G.stage === 'campaign'
    : opts.pubPhase === 'drive' ? G.stage === 'drive' : true;
  if (G.week >= ACT1_PUBLIC_UNLOCK_WEEK && !opts.noPublic && pubOk) {
    const reach = (o) => outgoingTies(G.influence, o.id).filter(t => t.weight >= EDGE_MIN_DRAW).length;
    const loud = [...orgs].sort((a, b) => reach(b) - reach(a))[0];
    if (loud && reach(loud) >= 2) {
      const tier = opts.pubTier ?? (G.heat < 40 ? 'medium' : 'small');
      if (spent(loud.id) >= ACT1_ACTION[tier].hours) take(loud, tier, null);
    }
  }

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
  const budget = new Map(orgs.map(o => [o.id, committeeHours(o)]));
  const plan = [];
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
  const busy = new Set();
  const read = (x) => C.readOf(x, G.week);

  // 1. Keep the committee.
  orgs.filter(x => (x.weeksIdle || 0) >= 2 || x.shaken > 0).forEach(t => {
    const a = best(t, 1); if (a) { take(a, 'checkin', t.id); busy.add(t.id); }
  });

  // 2. Recruit, uncovered circles and teams first.
  const coveredCircle = new Set(orgs.map(o => C.circleOfId(soc, o.id)).filter(Boolean));
  const coveredTeam = new Set(orgs.map(o => o.team));
  w.filter(x => x.signed && !x.organizer && !x.burned && x.trueKnown && (x.trueSupport ?? 0) >= ACT1_RECRUIT_REQ && !busy.has(x.id))
    .map(x => ({ x, gap: (x.circleKnown && !coveredCircle.has(C.circleOfId(soc, x.id)) ? 2 : 0) + (!coveredTeam.has(x.team) ? 1 : 0) }))
    .sort((p, q) => q.gap - p.gap || slots(q.x) - slots(p.x))
    .forEach(({ x }) => { const a = best(x, 3); if (a) { take(a, 'recruit', x.id); busy.add(x.id); } });

  // 3. Ask the people whose read says ready.
  w.filter(x => !x.signed && !x.burned && !busy.has(x.id) && !x.askedRecently)
    .map(x => ({ x, r: read(x) }))
    .filter(({ r }) => r.exact && r.mid >= (opts.askAt ?? opts.askBar ?? 74))
    .sort((p, q) => q.r.mid - p.r.mid)
    .forEach(({ x }) => { const a = best(x, 2); if (a) { take(a, 'ask', x.id); busy.add(x.id); } });

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
