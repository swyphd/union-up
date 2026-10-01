// Phase 2: the weeks between the petition and the ballot.
//
// Management stops improvising. Every week has one move on the calendar, and the player
// sees it coming: a captive-audience meeting for one department, a perk bought for one
// crowd, a job threat or a raise aimed at one person. Kirkman's one-on-ones and his rumor
// stay hidden. The player answers with the committee they built in Phase 1:
//
//   inoculate   a committee member gets to a department or a crowd first. If they work there
//               or run with that crowd they reach all of it; otherwise only their friends and
//               crowd-mates. Whoever they reach takes the move at 0.4 strength, and no fear.
//   debrief     a committee member talks it over with a friend afterwards: a fresh read,
//               the fear gone, and a rumor about them talked down.
//   stand with  a committee member goes into the room with whoever is threatened or bought.
//   coordinated action
//               a structure test. Every participant turns out their friends and crowd, and
//               the count is a read. A crowd with nobody on the committee turns out nobody.
//
// A leak on the committee hands Kirkman the plan: the week's move lands before anything
// the committee does about it.
import { clamp, rand, random } from "../rng.js";
import { CIRCLES, CIRCLE_BY_ID, friendsOf, knownFriends } from "./friends.js";
import { refreshInfluence, seenCircle } from "./fallout.js";
import { AFF_BY_ID, PERK_WEEKS, affList, poisonedAff } from "./affinities.js";
import { infTrait } from "./traits.js";
import { committeeOf, activeLeaks } from "./coverage.js";
import { FEAR_MAX } from "./election.js";
import { TEAM_LABEL } from "./constants.js";
import { CONSULTANT_MAX_EACH, CONSULTANT_NAME, KIRKMAN_SIGHT, holdsFast, orgChartResistance, signedBacking } from "./consultant.js";

// Everything the sim sweeps, in one place.
const CAMPAIGN_TUNING = {
  meetingTrue: 10,       // a full-strength meeting: this much off where somebody stands, before backing
  inoculated: 0.4,       // what is left of a move on somebody the committee got to first
  perkTrue: 7,           // a perk, on everybody who holds the thing it buys
  debriefTrue: 3,        // what a debrief gives back
  oneOnOnes: 2,          // hidden, every week of Phase 2
  rumorChance: 0.5,      // in a week the rumor is due, the chance he runs it
};

// The structure tests. `bar` is the turnout that counts as a show of strength; `center` is
// the true support at which somebody you reach is a coin flip to show.
const COORDINATED = {
  button: { label: "Button day", short: "buttons", bar: 6, center: 45, heat: 3, missHeat: 3, floorTrue: 3, burn: 0 },
  letter: { label: "Open letter", short: "open letter", bar: 8, center: 55, heat: 6, missHeat: 6, floorTrue: 5, burn: 0 },
  walkin: { label: "Walk in on Daniels", short: "walk-in", bar: 10, center: 64, heat: 10, missHeat: 10, floorTrue: 7, burn: 0.06 },
};
const COORDINATED_ORDER = ["button", "letter", "walkin"];
// The second button day is not news. Escalating is how a structure test stays one.
const actionFatigue = (uses) => 1 / (1 + 0.6 * uses);

const TEAMS = Object.keys(TEAM_LABEL);
const addFear = (x, n = 1) => { x.fear = clamp((x.fear || 0) + n, 0, FEAR_MAX); };

// A fresh Phase 2 state. `next` is the move on the calendar for the coming week.
const newCampaign = () => ({ next: null, uses: {}, letterDone: false, lastMeeting: null });

// Kirkman picks next week's move. He aims by the org chart below KIRKMAN_SIGHT and by the
// friend graph above it or with a leak: sighted, he books whichever department and buys
// whichever crowd the committee is thinnest in.
function planMove({ workers, social, consultant, campaign, heat }) {
  const live = workers.filter(x => !x.burned);
  const sees = heat >= KIRKMAN_SIGHT || activeLeaks(workers).length > 0;
  const members = committeeOf(workers);
  const coveredCircles = new Set(members.map(m => social.circleOf?.[m.id]).filter(Boolean));
  const open = (x) => !x.organizer && !(x.signed && (x.trueSupport ?? 0) >= 78);
  const teamScore = (t) => {
    const people = live.filter(x => x.team === t && open(x));
    const base = sees
      ? people.reduce((n, x) => n + 1 + (coveredCircles.has(social.circleOf?.[x.id]) ? 0 : 1) + (members.some(m => m.team === t) ? 0 : 0.5), 0)
      : people.length;
    return base - (campaign.lastMeeting === t ? 3 : 0) + random() * 0.5;
  };
  const meeting = () => ({ kind: "meeting", team: [...TEAMS].sort((a, b) => teamScore(b) - teamScore(a))[0] });

  const options = [{ kind: "meeting", wt: 3 }];
  const bought = social.bought || {};
  const perkCircles = CIRCLES.filter(c => !bought[c.id] && !live.some(x => poisonedAff(x).includes(c.affinity)));
  if ((consultant.perks || 0) < CONSULTANT_MAX_EACH && perkCircles.length) options.push({ kind: "perk", wt: 1.5 });
  const threatPool = members.filter(m => !m.burned);
  if ((consultant.threats || 0) < CONSULTANT_MAX_EACH && threatPool.length > 1) options.push({ kind: "threat", wt: 1 });
  const raisePool = live.filter(x => !x.organizer && (x.signed || x.support >= 55));
  if ((consultant.raises || 0) < CONSULTANT_MAX_EACH && raisePool.length) options.push({ kind: "raise", wt: 1 });
  const total = options.reduce((t, o) => t + o.wt, 0);
  let r = random() * total, kind = "meeting";
  for (const o of options) { r -= o.wt; if (r <= 0) { kind = o.kind; break; } }

  if (kind === "perk") {
    const score = (c) => {
      const inside = live.filter(x => social.circleOf?.[x.id] === c.id);
      return sees
        ? inside.filter(open).length + (coveredCircles.has(c.id) ? 0 : 3)
        : live.filter(x => affList(x).includes(c.affinity)).length;
    };
    const c = [...perkCircles].sort((a, b) => score(b) - score(a))[0];
    return { kind, circle: c.id };
  }
  if (kind === "threat") {
    const backing = (x) => signedBacking(social.influence, workers, x.id);
    const mark = [...threatPool].sort((a, b) => backing(a) - backing(b))[0];
    return { kind, targetId: mark.id };
  }
  if (kind === "raise") {
    const mark = [...raisePool].sort((a, b) => a.support - b.support)[0];
    return { kind, targetId: mark.id };
  }
  return meeting();
}

// Filing: the consultant is on site full time and the first move is already booked.
function openCampaign({ workers, social, consultant, heat, campaign }) {
  const c = { ...newCampaign(), ...(campaign || {}) };
  return { ...c, next: planMove({ workers, social, consultant, campaign: c, heat }) };
}

// Who a committee member covers when they get somewhere first: themselves, their friends,
// and the people in their crowd. The truth, not the map: the hour works on who they
// actually know, whether or not you do.
function reachOf(social, member) {
  const ids = new Set([member.id, ...friendsOf(social, member.id)]);
  const circle = social.circleOf?.[member.id];
  if (circle) Object.entries(social.circleOf).forEach(([id, c]) => { if (c === circle) ids.add(Number(id)); });
  return ids;
}

// The people a move hits, before any counter.
function moveVictims(move, workers, social) {
  if (!move) return [];
  const live = workers.filter(x => !x.burned);
  if (move.kind === "meeting") return live.filter(x => x.team === move.team && !x.organizer);
  if (move.kind === "perk") {
    const aff = CIRCLE_BY_ID[move.circle]?.affinity;
    return live.filter(x => !x.organizer && (social.circleOf?.[x.id] === move.circle || affList(x).includes(aff)));
  }
  const t = live.find(x => x.id === move.targetId);
  return t ? [t] : [];
}

// Does this inoculation entry point at this move?
const aims = (e, move) => !!move && ((move.kind === "meeting" && e.team === move.team) || (move.kind === "perk" && e.circle === move.circle));

// Run the week's move. `early` means a leak handed him the plan, and nothing the committee
// did about it this week counts. Mutates the workers and `social`; returns what happened.
function resolveMove({ move, w, social, plan, week, early, actionHeld, consultant }) {
  const out = { lines: [], notes: {}, pulses: [], heat: 0, consultant: { ...consultant }, perk: null, stats: { moves: 1, inoculatedHits: 0, fullHits: 0, standWiths: 0 } };
  if (!move) return out;
  const byId = (id) => w.find(x => x.id === id);
  const inocs = early ? [] : plan.filter(e => e.type === "inoculate" && aims(e, move)).map(e => byId(e.actorId)).filter(a => a && a.organizer && !a.burned);
  // Somebody who works in that department, or runs with that crowd, can get to all of it;
  // anybody else only to their own friends and crowd. This is what coverage is for.
  const inside = (a, x) => (move.kind === "meeting" ? a.team === move.team : social.circleOf?.[a.id] === move.circle) && !!x;
  const shielded = new Set(inocs.flatMap(a => [...reachOf(social, a), ...moveVictims(move, w, social).filter(x => inside(a, x)).map(x => x.id)]));
  const strength = (x) => (shielded.has(x.id) ? CAMPAIGN_TUNING.inoculated : 1);
  const earlyNote = early ? ` It was moved up a day. Somebody told ${CONSULTANT_NAME} what the committee had planned.` : "";

  if (move.kind === "meeting") {
    let full = 0, soft = 0, held = 0;
    moveVictims(move, w, social).forEach(x => {
      if (holdsFast(x)) { held++; return; }
      const s = strength(x);
      const resist = orgChartResistance(signedBacking(social.influence, w, x.id));
      const hit = Math.max(1, Math.round(CAMPAIGN_TUNING.meetingTrue * s * resist));
      x.trueSupport = clamp((x.trueSupport ?? x.support) - hit);
      x.support = clamp(x.support - Math.round(hit * 1.5));
      x.underPressure = 2;
      x.hitWeek = week;
      if (s >= 1) {
        // The room becomes unreadable: whatever you knew about them is a guess again.
        addFear(x);
        if (!x.signed) x.trueKnown = false;
        full++;
        out.notes[x.id] = "sat through it";
      } else { soft++; out.notes[x.id] = "heard it first"; }
    });
    out.stats.inoculatedHits = soft; out.stats.fullHits = full;
    out.lines.push(`CAPTIVE-AUDIENCE MEETING — ${TEAM_LABEL[move.team]}. ` +
      (soft ? `${soft} had already heard it from somebody on the committee and shrugged it off. ` : "") +
      (full ? `${full} sat through it cold: whatever you knew about where they stand, you don't now.` : "Nobody walked out of it shaken.") +
      (held ? ` ${held} stubborn holdout${held === 1 ? "" : "s"} unmoved.` : "") + earlyNote);
    out.heat -= 4;
  } else if (move.kind === "perk") {
    const circle = CIRCLE_BY_ID[move.circle];
    const aff = AFF_BY_ID[circle.affinity];
    let trueTotal = 0, soft = 0;
    moveVictims(move, w, social).forEach(x => {
      x.poisoned = [...poisonedAff(x).filter(t => t !== circle.affinity), circle.affinity];
      if (holdsFast(x)) return;
      const s = strength(x);
      const resist = orgChartResistance(signedBacking(social.influence, w, x.id));
      const hit = Math.max(1, Math.round(CAMPAIGN_TUNING.perkTrue * s * resist));
      x.trueSupport = clamp((x.trueSupport ?? x.support) - hit);
      x.fulfillment = clamp(x.fulfillment + Math.round(10 * s));
      x.hitWeek = week;
      if (s < 1) soft++; else { addFear(x); out.notes[x.id] = "BOUGHT"; }
      trueTotal += hit;
    });
    // Unless somebody got there first, the friendships inside the crowd are worth no more
    // than knowing each other until the perk lapses or a coordinated action breaks it.
    const weakened = !inocs.length;
    if (weakened) { social.bought = { ...(social.bought || {}), [circle.id]: week + PERK_WEEKS }; refreshInfluence(social, w); }
    out.perk = { id: circle.affinity, until: week + PERK_WEEKS };
    out.consultant.perks = (out.consultant.perks || 0) + 1;
    out.lines.push(`PERK LANDS — ${aff?.perk?.toUpperCase() ?? circle.affinity}, aimed at ${circle.label}. −${trueTotal} between everyone who shares “${aff?.label ?? circle.affinity}”.` +
      (weakened ? ` Inside ${circle.label} people stop talking about anything else: those friendships count for less until it lapses.` : ` Somebody on the committee got there first; ${soft} saw it for what it was, and the crowd holds together.`) + earlyNote);
    out.heat -= 4;
  } else if (move.kind === "threat" || move.kind === "raise") {
    const mark = byId(move.targetId);
    const stood = early ? [] : plan.filter(e => e.type === "standwith" && e.targetId === move.targetId).map(e => byId(e.actorId)).filter(a => a && a.organizer && !a.burned && a.id !== move.targetId);
    out.stats.standWiths = stood.length;
    const backed = stood.length > 0 || actionHeld;
    const backingOf = (x) => signedBacking(social.influence, w, x.id);
    if (!mark || mark.burned || (move.kind === "threat" && !mark.organizer)) {
      // The person is out of reach before it happens. He keeps it for somebody else.
      out.lines.push(`${CONSULTANT_NAME} had something lined up for ${mark?.name ?? "somebody"}. It never happens.`);
      return out;
    }
    if (move.kind === "threat") out.consultant.threats = (out.consultant.threats || 0) + 1;
    else out.consultant.raises = (out.consultant.raises || 0) + 1;
    const carry = (dir) => friendsOf(social, mark.id).forEach(fid => {
      const f = byId(fid);
      if (!f || f.burned) return;
      if (dir > 0) { f.trueSupport = clamp((f.trueSupport ?? f.support) + 3); f.support = clamp(f.support + 4); f.fear = Math.max(0, (f.fear || 0) - 1); }
      else { f.trueSupport = clamp((f.trueSupport ?? f.support) - 2); addFear(f); }
      out.pulses.push({ from: mark.id, to: f.id, tone: dir > 0 ? "up" : "down" });
    });
    if (move.kind === "threat") {
      const fold = backed ? 0 : Math.max(0.1, Math.min(0.5, 0.5 - backingOf(mark) / 300));
      if (random() < fold) {
        mark.organizer = false;
        mark.leak = false; mark.leakKnown = false;
        mark.support = clamp(mark.support - 25);
        mark.underPressure = 2;
        addFear(mark, 2);
        out.notes[mark.id] = "STEPS BACK";
        out.lines.push(`JOB THREAT LANDS — ${mark.name} is walked into a room with ${CONSULTANT_NAME} and their manager, alone, and steps off the committee.${earlyNote}`);
        mark.history.push(`Week ${week}: pressured off the committee.`);
        carry(-1);
      } else {
        mark.support = clamp(mark.support + 5);
        mark.fear = 0;
        out.notes[mark.id] = "DOESN'T BLINK";
        out.lines.push(`JOB THREAT BACKFIRES — ${backed ? (stood.length ? `${stood.map(a => a.name).join(" and ")} walked in with ${mark.name}` : "the floor had just turned out together") : `${mark.name} held on their own`}. ${mark.name} writes down the date and who was in the room, and tells everyone.`);
        mark.history.push(`Week ${week}: threatened, didn't budge.`);
        carry(1);
      }
    } else {
      const take = backed ? 0 : Math.min(0.7, Math.max(0.05, (100 - mark.support) / 60));
      if (random() < take) {
        const wasSigned = mark.signed;
        mark.signed = false;
        mark.support = clamp(mark.support - 35);
        mark.trueSupport = clamp((mark.trueSupport ?? mark.support) - 20);
        out.notes[mark.id] = wasSigned ? "PULLS THEIR CARD" : "TAKES THE OFFER";
        out.lines.push(`BUY-OFF LANDS — ${mark.name} takes the raise${wasSigned ? " and pulls their card" : ""}. Nobody blames them.${earlyNote}`);
        mark.history.push(`Week ${week}: took the raise.`);
      } else {
        mark.support = clamp(mark.support + 8);
        out.notes[mark.id] = "TURNS IT DOWN";
        out.lines.push(`BUY-OFF REFUSED — ${backed && stood.length ? `with ${stood.map(a => a.name).join(" and ")} beside them, ` : ""}${mark.name} turns it down and repeats the offer out loud in the kitchen.`);
        mark.history.push(`Week ${week}: refused a raise.`);
        carry(1);
      }
    }
  }
  return out;
}

// One coordinated action. `entries` are the participants' plan entries, all one tier.
function resolveTurnout({ entries, w, social, week, campaign, move }) {
  const byId = (id) => w.find(x => x.id === id);
  const tierId = COORDINATED[entries[0]?.tier] ? entries[0].tier : "button";
  const tier = COORDINATED[tierId];
  const out = { tierId, tier, lines: [], notes: {}, pulses: [], heat: 0, held: false, count: 0, counted: 0, burned: [], restored: [], campaign: { ...campaign, uses: { ...(campaign.uses || {}) } } };
  const parts = entries.map(e => byId(e.actorId)).filter((a, i, all) => a && a.organizer && !a.burned && all.indexOf(a) === i);
  if (!parts.length) return out;
  const uses = out.campaign.uses[tierId] || 0;
  out.campaign.uses[tierId] = uses + 1;
  if (tierId === "letter") out.campaign.letterDone = true;

  // Who the participants can bring: themselves, their friends, their crowd.
  const pool = new Set();
  parts.forEach(p => reachOf(social, p).forEach(id => pool.add(id)));
  const showed = [], noShow = [];
  [...pool].map(byId).filter(x => x && !x.burned).forEach(x => {
    if (parts.includes(x)) { showed.push(x); return; }
    const p = clamp(0.2 + ((x.trueSupport ?? x.support) - tier.center) / 40 + (x.signed ? 0.25 : 0) - 0.12 * (x.fear || 0), 0.03, 0.95);
    (random() < p ? showed : noShow).push(x);
  });
  out.count = showed.length; out.counted = pool.size;
  // The count is a read. Who turned up did something, and you know it; who you counted on
  // and did not is a guess again.
  showed.forEach(x => {
    x.trueSupport = clamp((x.trueSupport ?? x.support) + 3);
    x.support = clamp(x.support + 4);
    x.fear = 0;
    x.trueKnown = true; x.trueKnownWeek = week; x.trueReadValue = x.trueSupport; x.spokenTo = true;
    out.notes[x.id] = "turns out";
  });
  noShow.forEach(x => {
    if (!x.signed) x.trueKnown = false;
    x.spokenTo = true;
    x.support = clamp(x.support - 2);
    out.notes[x.id] = "stays at their desk";
  });
  parts.forEach(p => {
    const heat = Math.round(tier.heat / Math.max(1, parts.length) * (infTrait(p).publicHeat || 1));
    out.heat += heat;
    showed.filter(x => x !== p && friendsOf(social, p.id).includes(x.id)).forEach(x => out.pulses.push({ from: p.id, to: x.id, tone: "up" }));
  });
  out.held = out.count >= tier.bar;
  if (out.held) {
    const f = actionFatigue(uses);
    w.forEach(x => {
      if (x.burned) return;
      x.trueSupport = clamp((x.trueSupport ?? x.support) + Math.round(tier.floorTrue * f));
      x.fear = Math.max(0, (x.fear || 0) - 1);
    });
    // A crowd that turned out together is a crowd again, whatever the company bought it.
    const bought = { ...(social.bought || {}) };
    Object.keys(bought).forEach(cid => {
      if (showed.some(x => social.circleOf?.[x.id] === cid)) {
        delete bought[cid];
        out.restored.push(cid);
        const aff = CIRCLE_BY_ID[cid]?.affinity;
        w.forEach(x => { x.poisoned = poisonedAff(x).filter(t => t !== aff); });
      }
    });
    if (out.restored.length) { social.bought = bought; refreshInfluence(social, w); }
  } else {
    out.heat += tier.missHeat;
  }
  // The walk-in is where people get named.
  if (tier.burn > 0) {
    parts.forEach(p => {
      if (committeeOf(w).length <= 1) return;
      if (random() < tier.burn * (infTrait(p).burnMult ?? 1)) { p.burned = true; p.organizer = false; p.leak = false; p.leakKnown = false; out.burned.push(p); out.notes[p.id] = "walked out"; }
    });
  }
  out.lines.push(`${tier.label.toUpperCase()} — ${out.count} of the ${out.counted} people ${parts.map(p => p.name).join(", ")} could reach turned out. ` +
    (out.held
      ? `That clears the ${tier.bar} it needed: the whole floor saw it, and it moves.${uses ? " It is less news than the first time." : ""}` +
        (out.restored.length ? ` ${out.restored.map(c => CIRCLE_BY_ID[c]?.label).join(" and ")} turned out together, and the perk stops working on them.` : "")
      : `Short of the ${tier.bar} it needed. Management noticed who didn't come.`) +
    (out.burned.length ? ` ${out.burned.map(p => p.name).join(" and ")} ${out.burned.length === 1 ? "is" : "are"} walked off the floor the next morning.` : ""));
  if (move?.kind === "threat" && out.held) out.lines.push(`Nobody threatens a committee member the week the floor turns out behind them and gets away with it.`);
  return out;
}

// Debriefs: after the move lands, a committee member talks it over with a friend.
function resolveDebriefs({ plan, w, social, week }) {
  const byId = (id) => w.find(x => x.id === id);
  const out = { lines: [], notes: {}, pulses: [], repaired: [], count: 0, valid: [] };
  const done = new Set();
  plan.filter(e => e.type === "debrief").forEach(e => {
    const a = byId(e.actorId), t = byId(e.targetId);
    if (!a || !t || a.burned || t.burned || !a.organizer || done.has(t.id)) return;
    // Once a week is enough: a second debrief of the same person does nothing more.
    done.add(t.id);
    out.count++;
    out.valid.push(e);
    const recent = t.hitWeek != null && week - t.hitWeek <= 1;
    t.fear = Math.max(0, (t.fear || 0) - 2);
    if (recent) t.trueSupport = clamp((t.trueSupport ?? t.support) + CAMPAIGN_TUNING.debriefTrue);
    t.trueKnown = true; t.trueKnownWeek = week; t.trueReadValue = t.trueSupport; t.spokenTo = true;
    out.notes[t.id] = `${a.name} debriefs`;
    out.pulses.push({ from: a.id, to: t.id, tone: "up" });
    out.lines.push(`${a.name} and ${t.name} go over what management said${recent ? ", line by line" : ""}. You know where ${t.name} stands again.`);
  });
  return out;
}

// What the board can tell you about a counter before you commit the hour: who the move
// will hit as far as you know, and how many of them this committee member would reach.
// Built from the map you have drawn, so it is wrong where the map is.
function visibleHit(move, workers, social) {
  if (!move) return [];
  const live = workers.filter(x => !x.burned && !x.organizer);
  if (move.kind === "meeting") return live.filter(x => x.team === move.team);
  if (move.kind === "perk") {
    // Everyone you have seen in that crowd, and anyone you know shares what it is buying.
    const aff = CIRCLE_BY_ID[move.circle]?.affinity;
    return live.filter(x => seenCircle(x, social) === move.circle || (x.knownAffinities || []).includes(aff));
  }
  return live.filter(x => x.id === move.targetId);
}
function visibleReach(member, move, workers, social) {
  const hit = visibleHit(move, workers, social);
  const mine = seenCircle(member, social);
  const inside = move?.kind === "meeting" ? member.team === move.team : move?.kind === "perk" && mine === move.circle;
  const reached = hit.filter(x => inside || knownFriends(member).includes(x.id) || (mine && seenCircle(x, social) === mine));
  return { reached, hit, inside };
}
// Who a coordinated action could bring, as far as you know: the participants, their
// friends you have mapped, and the people you have found in their crowds.
function visiblePool(parts, workers, social) {
  const ids = new Set();
  parts.forEach(p => {
    ids.add(p.id);
    knownFriends(p).forEach(id => ids.add(id));
    const mine = seenCircle(p, social);
    if (mine) workers.forEach(x => { if (seenCircle(x, social) === mine) ids.add(x.id); });
  });
  return workers.filter(x => ids.has(x.id) && !x.burned);
}

const describeMove = (move, workers) => {
  if (!move) return null;
  if (move.kind === "meeting") return `Captive-audience meeting: ${TEAM_LABEL[move.team]}`;
  if (move.kind === "perk") return `A perk for ${CIRCLE_BY_ID[move.circle]?.label}`;
  const t = workers.find(x => x.id === move.targetId);
  return move.kind === "threat" ? `A job threat: ${t?.name}` : `A raise for ${t?.name}`;
};

export { CAMPAIGN_TUNING, COORDINATED, COORDINATED_ORDER, actionFatigue, newCampaign, planMove, openCampaign, reachOf, moveVictims, aims, resolveMove, resolveTurnout, resolveDebriefs, describeMove, addFear, visibleHit, visibleReach, visiblePool };
