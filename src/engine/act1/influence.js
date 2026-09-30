// Who moves whom, and how the floor is rolled.
import { clamp, rand, random } from "../rng.js";
import { ACT1_WORKERS_SEED } from "./constants.js";
import { AFFINITY_POOL } from "./affinities.js";
import { influenceKnown } from "./actions.js";

// ---------- THE INFLUENCE MAP ----------
// Directed and weighted: influence[a][b] is how much A moves B, which is not the same as
// how much B moves A. Same-team coworkers talk more, so ties cluster there, but the whole
// point is that team is a hint about who talks to whom, not the answer.
function generateInfluence(seed) {
  const inf = {};
  seed.forEach(w => { inf[w.id] = {}; });
  seed.forEach(a => {
    const others = seed.filter(o => o.id !== a.id);
    const ranked = others
      .map(b => ({ b, roll: random() * (b.team === a.team ? 1 : 0.5) }))
      .sort((x, y) => y.roll - x.roll);
    const count = 2 + rand(2); // each person carries real weight with 2-3 coworkers
    ranked.slice(0, count).forEach(({ b }) => {
      const sameTeam = b.team === a.team;
      const weight = clamp(Math.round((sameTeam ? 45 : 28) + random() * 45), 15, 95);
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
    const pool = seed.filter(b => b.id !== o.id && !b.organizer).sort(() => random() - 0.5);
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

// Authored per worker, not randomised — each one should be readable off their hook.
const INFLUENCE_ASSIGN = {
  1: "leader",    // Marisol — senior engineer, respected, newly burned by the review
  2: "quiet",     // Dante — new, happy, invisible
  3: "cautious",  // Priya — afraid of the stack ranking
  4: "leader",    // Wendell — remembers the old contract, people listen
  5: "hothead",   // Ashanti — posts about everything, first to call it out
  6: "wellliked", // Miguel — everyone routes their hardest problems to him
  7: "quiet",     // Brianna — transferred in, still learning the room
  8: "cautious",  // Tyrell — score dropped, nobody to ask
  9: "wellliked", // Sofia — unofficial team mom
  10: "connector",// Jake — in every Slack channel until midnight
  11: "leader",   // Camille — been in a union before, knows how it goes
  12: "stubborn", // Roz — principal engineer, wrote half the codebase
  13: "quiet",    // Omar — head down, numbers up
  14: "connector",// Fen — concept artist, touches every team
  15: "stubborn", // Gus — lived through a drive that fell apart
  16: "connector",// Naledi — runs the whole QA pipeline
  17: "cautious", // Theo — contract renewal in eleven weeks
  18: "hothead",  // Iris — her tools team got replaced without warning
  19: "wellliked",// Marcus — still mentors people on his own time
  20: "stubborn", // Delphine — narrative lead, thinks this slows the ship
};
function makeAct1Workers() {
  return ACT1_WORKERS_SEED.map(w => ({
    ...w,
    organizer: !!w.organizer,
    signed: !!w.organizer,
    influenceTrait: INFLUENCE_ASSIGN[w.id] || "quiet",
    signedWeek: w.organizer ? 1 : null,
    staleCount: 0,
    experience: w.organizer ? 45 : 0, // your two starters have already done this before
    weeksIdle: 0,
    ...(() => {
      // 3-5 affinities each. Your own two organizers start fully known — you already
      // know what your people talk about.
      const pool = [...AFFINITY_POOL].sort(() => random() - 0.5);
      const affinities = pool.slice(0, 3 + rand(3)).map(a => a.id);
      return { affinities, knownAffinities: w.organizer ? [...affinities] : [], poisoned: [] };
    })(),
    // What they SAY is a signal the player can pick up for free. What they'd DO is the
    // card in front of them, and it starts lower for everyone but your own people.
    support: clamp(w.support + rand(9) - 4),
    trueSupport: w.organizer ? clamp(w.support) : clamp(w.support - 6 - rand(14)),
    trueKnown: !!w.organizer,
    trueKnownWeek: w.organizer ? 1 : null,
    spokenTo: !!w.organizer,
    guarded: 0,
    fulfillment: clamp(w.fulfillment + rand(9) - 4),
    burned: false,
    revealed: !!w.organizer, // you already know who your own two people reach
    shaken: 0,
    underPressure: 0,
    pressuredCount: 0,
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

export { generateInfluence, INFLUENCE_ASSIGN, makeAct1Workers, infOn, outgoingTies, incomingTies, knownInfluence };
