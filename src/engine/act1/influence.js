// Who moves whom, and how the floor is rolled.
import { clamp, rand, random } from "../rng.js";
import { ACT1_WORKERS_SEED } from "./constants.js";
import { AFFINITY_POOL } from "./affinities.js";
import { generateSocial, friendsOf, circleOfId, CIRCLE_BY_ID } from "./friends.js";
import { influenceKnown } from "./actions.js";

// ---------- THE INFLUENCE MAP ----------
// Kept for the acts that still read a weighted map. It is now derived from the friend
// graph in friends.js: a friend is worth FRIEND_TIE, a circle-mate CIRCLE_TIE, and the
// direction that used to be a random weight is the sender's trait.
function generateInfluence(seed = ACT1_WORKERS_SEED) {
  return generateSocial(seed).influence;
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
function makeAct1Workers(social = null) {
  const soc = social || generateSocial(ACT1_WORKERS_SEED);
  const workers = ACT1_WORKERS_SEED.map(w => ({
    ...w,
    organizer: !!w.organizer,
    signed: !!w.organizer,
    influenceTrait: INFLUENCE_ASSIGN[w.id] || "quiet",
    signedWeek: w.organizer ? 1 : null,
    staleCount: 0,
    experience: w.organizer ? 45 : 0, // your two starters have already done this before
    weeksIdle: 0,
    ...(() => {
      // The thing their circle shares comes first; two or three more are their own. An
      // isolate has only their own. Your two organizers start fully known — you already
      // know what your people talk about.
      const circleAff = CIRCLE_BY_ID[circleOfId(soc, w.id)]?.affinity || null;
      const pool = [...AFFINITY_POOL].filter(a => a.id !== circleAff).sort(() => random() - 0.5);
      const affinities = [...(circleAff ? [circleAff] : []), ...pool.slice(0, 2 + rand(2)).map(a => a.id)];
      return { affinities, knownAffinities: w.organizer ? [...affinities] : [], poisoned: [] };
    })(),
    // Who they are friends with is on the card as slots; which slot is whom you learn by
    // talking to them. You know your own people's friends from day one.
    knownFriends: w.organizer ? [...friendsOf(soc, w.id)] : [],
    circleKnown: !!w.organizer,
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
  // Knowing a friendship is symmetric: your organizers' friends know them back.
  workers.filter(x => x.organizer).forEach(o => o.knownFriends.forEach(f => {
    const fw = workers.find(x => x.id === f);
    if (fw && !fw.knownFriends.includes(o.id)) fw.knownFriends = [...fw.knownFriends, o.id];
  }));
  return workers;
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
