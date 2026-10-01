// Friendships end. Two people fall out, the edge between them is gone, and whoever lost
// the argument drifts: to another crowd if they still have a friend in one, to the margin
// if not. Each of them moves toward the friends they have left, which can open a door as
// easily as close one.
//
// Visibility is the lesson. A falling out between two people whose friendship you had
// mapped shows on the board: the slot cracks, the line snaps. One you never mapped
// changes nothing you can see, and your map is quietly wrong until somebody on the
// committee next talks to either of them ("they don't talk anymore").
//
// So the board shows what you BELIEVE, not what is true: how many friends you last saw
// somebody have (slotsSeen), and which crowd you last saw them in (circleSeen).
import { clamp, rand, random } from "../rng.js";
import { MAX_FRIENDS, friendsOf, influenceFrom, isKnownFriend, knownFriends } from "./friends.js";
import { rating } from "./election.js";
import { infTrait } from "./traits.js";

const FALLOUT_TUNING = {
  driveChance: 0.04,       // a week of the card drive: about one falling out per campaign
  campaignChance: 0.08,    // once the petition is in, people are under more strain
};
const BROKEN_SHOW_WEEKS = 2;   // a cracked slot stays on the card this long
const RUMOR_REPAIR_WEEKS = 1;  // a rumor can be talked down for this long
const DRIFT_SHARE = 0.5;       // how far toward their remaining friends somebody moves
const DRIFT_CAP = 15;

// A deep enough copy that a week can change who is friends with whom without touching the
// state it was handed.
function cloneSocial(social) {
  if (!social) return { friends: {}, circleOf: {}, influence: {}, rumors: [], bought: {} };
  return {
    ...social,
    friends: Object.fromEntries(Object.entries(social.friends || {}).map(([k, v]) => [k, [...v]])),
    circleOf: { ...(social.circleOf || {}) },
    rumors: (social.rumors || []).map(r => ({ ...r })),
    bought: { ...(social.bought || {}) },
  };
}
const refreshInfluence = (social, workers) => {
  social.influence = influenceFrom(social.friends, social.circleOf, workers, social.bought || {});
  return social;
};

// The crowd you last saw them in, if you have found it at all.
const seenCircle = (w, social) => (w?.circleKnown ? (w.circleSeen !== undefined ? w.circleSeen : social?.circleOf?.[w.id] ?? null) : null);
// Finding out which crowd somebody is in.
function seeCircle(w, social) { w.circleKnown = true; w.circleSeen = social?.circleOf?.[w.id] ?? null; }
// How many friends you believe they have. Known friendships are never more than that.
const believedSlots = (w, social) => Math.max(knownFriends(w).length, w?.slotsSeen ?? friendsOf(social, w?.id).length);

function edgesOf(social) {
  const out = [];
  Object.entries(social.friends || {}).forEach(([a, list]) => list.forEach(b => { if (Number(a) < b) out.push([Number(a), b]); }));
  return out;
}

// Which friendship gives way. A 5 and a 2 do not stay friends through a drive; a hothead
// on either end, or somebody a manager is leaning on, makes it likelier. Two people on the
// committee keep it civil.
function falloutWeight(a, b) {
  let wt = 1;
  if (Math.abs(rating(a.trueSupport ?? a.support) - rating(b.trueSupport ?? b.support)) >= 2) wt += 3;
  if (infTrait(a).id === "hothead" || infTrait(b).id === "hothead") wt += 2;
  if ((a.underPressure || 0) > 0 || (b.underPressure || 0) > 0) wt += 2;
  return wt;
}
function pickFallout(workers, social) {
  const byId = (id) => workers.find(x => x.id === id);
  const pool = edgesOf(social).map(([a, b]) => [byId(a), byId(b)])
    .filter(([a, b]) => a && b && !a.burned && !b.burned && !(a.organizer && b.organizer))
    .map(([a, b]) => ({ a, b, wt: falloutWeight(a, b) }));
  const total = pool.reduce((t, p) => t + p.wt, 0);
  if (!total) return null;
  let r = random() * total;
  for (const p of pool) { r -= p.wt; if (r <= 0) return [p.a, p.b]; }
  return [pool[pool.length - 1].a, pool[pool.length - 1].b];
}

// Rumors aim at the bridge closest to your committee: a friendship across two crowds with
// one of your people on it if there is one, a signed worker if not.
function pickRumor(workers, social) {
  const byId = (id) => workers.find(x => x.id === id);
  const cands = edgesOf(social).map(([a, b]) => [byId(a), byId(b)])
    .filter(([a, b]) => a && b && !a.burned && !b.burned && !(a.organizer && b.organizer)
      && social.circleOf[a.id] && social.circleOf[b.id] && social.circleOf[a.id] !== social.circleOf[b.id])
    .map(([a, b]) => ({ a, b, close: (a.organizer || b.organizer ? 2 : 0) + (a.signed || b.signed ? 1 : 0) }))
    .filter(c => c.close > 0);
  if (!cands.length) return null;
  const top = Math.max(...cands.map(c => c.close));
  const best = cands.filter(c => c.close === top);
  const pick = best[rand(best.length)];
  return [pick.a, pick.b];
}

// Break a friendship. `seen` is whether the player sees it happen: true for a friendship
// they had mapped, or for anything done in public (a rumor). Mutates workers and social.
function breakFriendship(workers, social, a, b, week, { seen = null } = {}) {
  const visible = seen ?? isKnownFriend(a, b.id);
  social.friends[a.id] = (social.friends[a.id] || []).filter(x => x !== b.id);
  social.friends[b.id] = (social.friends[b.id] || []).filter(x => x !== a.id);

  // Whoever lost the argument drifts.
  const loser = random() < 0.5 ? a : b;
  const own = social.circleOf[loser.id] || null;
  const left = friendsOf(social, loser.id).map(id => workers.find(x => x.id === id)).filter(Boolean);
  let movedTo = own;
  if (own && !left.some(f => social.circleOf[f.id] === own)) {
    movedTo = left.map(f => social.circleOf[f.id]).find(Boolean) || null;
    social.circleOf[loser.id] = movedTo;
  }

  // Each of them moves toward the friends they have left.
  const drift = {};
  [a, b].forEach(x => {
    const fr = friendsOf(social, x.id).map(id => workers.find(y => y.id === id)).filter(Boolean);
    if (!fr.length) return;
    const avg = fr.reduce((t, f) => t + (f.trueSupport ?? f.support), 0) / fr.length;
    const d = Math.round(Math.max(-DRIFT_CAP, Math.min(DRIFT_CAP, (avg - (x.trueSupport ?? x.support)) * DRIFT_SHARE)));
    x.trueSupport = clamp((x.trueSupport ?? x.support) + d);
    drift[x.id] = d;
  });

  if (visible) {
    [[a, b], [b, a]].forEach(([x, y]) => {
      x.knownFriends = knownFriends(x).filter(id => id !== y.id);
      x.brokenFriends = [...(x.brokenFriends || []), { id: y.id, week }];
      x.slotsSeen = Math.max(knownFriends(x).length, (x.slotsSeen ?? 0) - 1);
    });
    if (loser.circleKnown) loser.circleSeen = movedTo;
  } else {
    // Nothing on the board changes. Somebody will mention it eventually.
    a.unseenBreaks = [...(a.unseenBreaks || []), b.id];
    b.unseenBreaks = [...(b.unseenBreaks || []), a.id];
  }
  refreshInfluence(social, workers);
  return { visible, loser, movedFrom: own, movedTo, drift };
}

// Talking a rumor down: they are friends again, and you know it.
function repairFriendship(workers, social, a, b, week) {
  if ((social.friends[a.id] || []).length >= MAX_FRIENDS || (social.friends[b.id] || []).length >= MAX_FRIENDS) return false;
  social.friends[a.id] = [...(social.friends[a.id] || []), b.id];
  social.friends[b.id] = [...(social.friends[b.id] || []), a.id];
  [[a, b], [b, a]].forEach(([x, y]) => {
    if (!isKnownFriend(x, y.id)) x.knownFriends = [...knownFriends(x), y.id];
    x.brokenFriends = (x.brokenFriends || []).filter(e => e.id !== y.id);
    x.slotsSeen = Math.max(knownFriends(x).length, (x.slotsSeen ?? 0) + 1);
  });
  refreshInfluence(social, workers);
  return true;
}

// A conversation with somebody brings you up to date on their friendships: how many they
// have now, and anybody they have stopped talking to since you last knew.
function catchUp(workers, social, x) {
  const gone = (x.unseenBreaks || []).map(id => workers.find(y => y.id === id)).filter(Boolean);
  gone.forEach(y => {
    y.unseenBreaks = (y.unseenBreaks || []).filter(id => id !== x.id);
    y.slotsSeen = Math.max(knownFriends(y).length, (y.slotsSeen ?? 0) - 1);
  });
  x.unseenBreaks = [];
  x.slotsSeen = friendsOf(social, x.id).length;
  return gone;
}

const recentBreaks = (w, week) => (w?.brokenFriends || []).filter(e => week - e.week <= BROKEN_SHOW_WEEKS);

export { FALLOUT_TUNING, BROKEN_SHOW_WEEKS, RUMOR_REPAIR_WEEKS, cloneSocial, refreshInfluence, seenCircle, seeCircle,
  believedSlots, edgesOf, falloutWeight, pickFallout, pickRumor, breakFriendship, repairFriendship, catchUp, recentBreaks };
