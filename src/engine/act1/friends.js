// Who is friends with whom, and the circles those friendships live in.
//
// One relationship structure, undirected, 0-3 friends each. Direction and weight come
// from traits (an ORGANIC LEADER lands harder on their friends) and from surfaced common
// ground, never from a hidden number on the edge. The card shows the whole structure:
// three slots means a hub, none means an isolate.
//
// Circles are authored, not detected. Each is defined by one thing its members share,
// which is where the affinity system now lives: the perk that buys "the thing they have
// in common" weakens a whole circle at once. Friendships form mostly inside a circle,
// with a few bridges across; the committee's job is to have someone inside every one.
import { rand, random } from "../rng.js";
import { ACT1_WORKERS_SEED } from "./constants.js";

const CIRCLES = [
  { id: "oldguard", hex: "#f59e0b", label: "THE OLD GUARD", affinity: "ttrpg", members: [4, 12, 15, 19],
    blurb: "Here before the acquisition. Still run the Thursday game, still remember profit-sharing." },
  { id: "dock", hex: "#f87171", label: "THE DOCK", affinity: "smoker", members: [5, 8, 18, 17],
    blurb: "The loading-dock break: the one place on the lot with no manager in earshot." },
  { id: "parents", hex: "#a3e635", label: "THE PARENTS", affinity: "parent", members: [1, 9, 3, 20],
    blurb: "Pickup at five thirty, and a group chat about whose kid is sick this week." },
  { id: "raid", hex: "#818cf8", label: "THE RAID", affinity: "modder", members: [10, 2, 14, 7],
    blurb: "Came up through mods. Friday night Discord, and they play what they ship." },
  { id: "lunch", hex: "#22d3ee", label: "THE LUNCH TABLE", affinity: "commute", members: [11, 16, 6],
    blurb: "Long commutes, same train, same table at twelve fifteen." },
];
const CIRCLE_BY_ID = Object.fromEntries(CIRCLES.map(c => [c.id, c]));
// Omar (13) belongs to nobody's circle: KEEPS THEIR HEAD DOWN, and eats at his desk.

const MAX_FRIENDS = 3;
// What a relationship is worth before common ground. These sit where the old random
// edge weights used to land, so every formula downstream reads the same scale.
const FRIEND_TIE = 65;   // a friend
const CIRCLE_TIE = 35;   // same circle, not close
const BRIDGES_MIN = 3;   // cross-circle friendships per floor
const BRIDGES_EXTRA = 2; // plus 0..1 more
const STARTER_MIN_FRIENDS = 2;

const shuffle = (a) => a.map(v => ({ v, k: random() })).sort((x, y) => x.k - y.k).map(x => x.v);

// Roll the floor's social structure. Deterministic under a seed, different every game.
function generateSocial(seed = ACT1_WORKERS_SEED) {
  const friends = {};
  const circleOf = {};
  seed.forEach(w => { friends[w.id] = []; });
  CIRCLES.forEach(c => c.members.forEach(id => { circleOf[id] = c.id; }));
  const degree = (id) => friends[id].length;
  const areFriends = (a, b) => friends[a].includes(b);
  const link = (a, b) => {
    if (a === b || areFriends(a, b) || degree(a) >= MAX_FRIENDS || degree(b) >= MAX_FRIENDS) return false;
    friends[a].push(b); friends[b].push(a);
    return true;
  };

  // Inside each circle: a random spanning tree, so nobody in a circle is cut off from
  // it, then usually one more friendship so it is not just a chain.
  CIRCLES.forEach(c => {
    const order = shuffle(c.members);
    for (let i = 1; i < order.length; i++) {
      const earlier = shuffle(order.slice(0, i)).filter(id => degree(id) < MAX_FRIENDS);
      if (earlier.length) link(order[i], earlier[0]);
    }
    if (random() < 0.7) {
      const pairs = shuffle(c.members.flatMap(a => c.members.filter(b => b > a).map(b => [a, b])));
      pairs.some(([a, b]) => link(a, b));
    }
  });

  // Bridges: a few real friendships across circle lines. These are what a campaign
  // travels along, and what a falling out can cut.
  let bridges = BRIDGES_MIN + rand(BRIDGES_EXTRA);
  for (let tries = 0; bridges > 0 && tries < 60; tries++) {
    const [ca, cb] = shuffle(CIRCLES).slice(0, 2);
    const a = shuffle(ca.members.filter(id => degree(id) < MAX_FRIENDS))[0];
    const b = shuffle(cb.members.filter(id => degree(id) < MAX_FRIENDS))[0];
    if (a != null && b != null && link(a, b)) bridges--;
  }

  // The two people you start with have to have somewhere to start.
  seed.filter(w => w.organizer).forEach(o => {
    const mates = shuffle((CIRCLE_BY_ID[circleOf[o.id]]?.members || []).filter(id => id !== o.id));
    const anyone = shuffle(seed.map(w => w.id).filter(id => id !== o.id && !w_isOrganizer(seed, id)));
    for (const pool of [mates, anyone]) {
      for (const id of pool) { if (degree(o.id) >= STARTER_MIN_FRIENDS) break; link(o.id, id); }
    }
  });

  return { friends, circleOf, influence: influenceFrom(friends, circleOf, seed) };
}
function w_isOrganizer(seed, id) { return !!seed.find(w => w.id === id)?.organizer; }

// The adapter. Everything downstream still reads influence[a][b]; here is what that
// number is now made of. Symmetric, because a friendship is; the asymmetry that used to
// be a random weight is now the sender's trait, applied where the formulas already apply
// it. Strangers are absent rather than zero so reach lists stay short.
// `bought` is the crowds the company has bought a perk for in Phase 2: friendships inside
// one count for no more than knowing each other, until the perk lapses or is broken.
function influenceFrom(friends, circleOf, seed = ACT1_WORKERS_SEED, bought = {}) {
  const inf = {};
  seed.forEach(a => {
    inf[a.id] = {};
    seed.forEach(b => {
      if (a.id === b.id) return;
      const sameCircle = circleOf[a.id] && circleOf[a.id] === circleOf[b.id];
      if (friends[a.id].includes(b.id)) inf[a.id][b.id] = sameCircle && bought[circleOf[a.id]] ? CIRCLE_TIE : FRIEND_TIE;
      else if (sameCircle) inf[a.id][b.id] = CIRCLE_TIE;
    });
  });
  return inf;
}

const friendsOf = (social, id) => (social?.friends?.[id]) || [];
const circleOfId = (social, id) => social?.circleOf?.[id] || null;
const knownFriends = (w) => w?.knownFriends || [];
const isKnownFriend = (w, id) => knownFriends(w).includes(id);
// Learning a friendship is symmetric: once you know A and B are friends, both cards say so.
function learnFriendship(workers, aId, bId) {
  const a = workers.find(x => x.id === aId), b = workers.find(x => x.id === bId);
  if (!a || !b) return;
  if (!isKnownFriend(a, bId)) a.knownFriends = [...knownFriends(a), bId];
  if (!isKnownFriend(b, aId)) b.knownFriends = [...knownFriends(b), aId];
}
// A conversation with somebody tells you who their friends are.
function learnFriends(workers, social, id) {
  const before = knownFriends(workers.find(x => x.id === id)).length;
  friendsOf(social, id).forEach(f => learnFriendship(workers, id, f));
  return knownFriends(workers.find(x => x.id === id)).length - before;
}
// A quick chat gets you one name: somebody they mention. Returns that friend's id, or null
// if you already knew everyone they would mention.
function learnOneFriend(workers, social, id) {
  const w = workers.find(x => x.id === id);
  const unknown = friendsOf(social, id).filter(f => !isKnownFriend(w, f));
  if (!unknown.length) return null;
  const f = unknown[rand(unknown.length)];
  learnFriendship(workers, id, f);
  return f;
}

// ---------- THE VOUCH ----------
// Your friend's friend will hear you out once your friend has signed. A committee member
// reaches somebody they do not know through a mutual friend who is already in, and only
// when you know both friendships exist: a path you have not mapped does no work for you,
// the same rule common ground follows. This is what mapping pays for.
const VOUCH_TIE = 18;
function vouchFor(a, b, workers) {
  if (!a || !b || !workers || isKnownFriend(a, b.id)) return null;
  const mutual = knownFriends(a).filter(id => isKnownFriend(b, id));
  return mutual.map(id => workers.find(x => x.id === id)).find(c => c && c.signed && !c.burned) || null;
}

// One friendship per pair, for counting and drawing.
function allEdges(social) {
  const out = [];
  Object.entries(social?.friends || {}).forEach(([a, list]) => list.forEach(b => { if (Number(a) < b) out.push([Number(a), b]); }));
  return out;
}
function knownEdges(workers) {
  const out = [];
  workers.forEach(w => knownFriends(w).forEach(b => { if (w.id < b) out.push([w.id, b]); }));
  return out;
}

export { learnOneFriend, VOUCH_TIE, vouchFor, CIRCLES, CIRCLE_BY_ID, MAX_FRIENDS, FRIEND_TIE, CIRCLE_TIE, generateSocial, influenceFrom,
  friendsOf, circleOfId, knownFriends, isKnownFriend, learnFriendship, learnFriends, allEdges, knownEdges };
