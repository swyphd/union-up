// Each studio's named roster, and the one-on-one read.
import { clamp, rand, random } from "../rng.js";
import { START_LOCATIONS } from "./constants.js";
import { LOC_COMPOSITION, PLATFORM_SLOTS, blocSatisfaction } from "./platform.js";


// ---------- THE ROSTER ----------
// Act Three's shops stop being a headcount with a mood attached. Every ballot the game
// rolls is a named person with a status and a tenure, and that is where the bloc layer
// finally lives: not a composition table applied to an average, but Dario on the QA
// floor, on contract, eighteen months in, whom your platform says nothing to.
//
// They are a floor you READ, not a floor you work one at a time. That is the whole
// difference between this act and Act One, and it is this act's own premise — you are
// not in the room any more. What organizing moves here is the shop; who it lands on,
// and who turns up on the day, is these people.
const ACT2_NAMES = [
  "Yusuf", "Nadia", "Bea", "Cormac", "Imani", "Rafa", "Sunny", "Teodora", "Kwame", "Lila",
  "Anders", "Petra", "Hoang", "Marguerite", "Dario", "Elke", "Nnamdi", "Saoirse", "Vikram", "Odile",
  "Bram", "Chiara", "Tobias", "Amara", "Jonty", "Ilse", "Rasheed", "Freya", "Milo", "Zainab",
  "Costas", "Winnie", "Halvard", "Perpetua", "Sami", "Greta", "Obi", "Lourdes", "Ewan", "Ingrid",
  "Kofi", "Solveig", "Bastien", "Neve",
];
const ACT2_ROSTER_ROLES = {
  downtown: ["gameplay engineer", "environment artist", "level designer", "producer", "technical artist",
    "animator", "systems designer", "build engineer", "UI artist", "narrative designer", "combat designer", "engine programmer"],
  suburban: ["QA analyst", "test lead", "automation engineer", "compliance tester", "localisation QA",
    "release tester", "bug triage", "playtest coordinator", "certification tester", "QA analyst"],
  airport: ["community manager", "copywriter", "brand designer", "video editor", "marketing analyst",
    "social lead", "PR coordinator", "storefront producer", "trailer editor"],
  university: ["remote gameplay engineer", "contract animator", "remote QA", "concept artist",
    "audio designer", "tools engineer", "remote producer", "technical writer"],
};
// How far apart the people in one shop are. The same spread the synthesised ballot used,
// only now it belongs to somebody instead of to an index.
const ACT2_ROSTER_SPREAD = 18;
// And how much of a bloc's satisfaction each of its members carries personally. Kept
// small on purpose: the platform already decides turnout at the site level, so this is
// here to make the trade VISIBLE on a person rather than to charge for it twice.
const ACT2_BLOC_TILT = 0.2;
const ACT2_DEFECTED_TILT = -20;
// Without a shop committee nobody is counting honestly, so a person is a range rather
// than a number — the same rule the site's own true support already follows, made
// concrete on the people it is actually about.
const ACT2_ROSTER_BAND = 20;

// ---------- ONE-ON-ONES ----------
// The organizer has four sites and one calendar, so a one-on-one is not how you work
// the floor here — there are 39 people and twelve months. It is how you find the two or
// three people the floor already follows, so that THEY can work the floor. That is the
// whole argument for a committee, and it is why the cap is campaign-wide and brutal.
const ACT2_ONE_ON_ONES_PER_TURN = 2;
const ACT2_SITDOWN_COST = 1;
// Social weight: how many people take their cue from this person. Deliberately drawn
// INDEPENDENTLY of how warm they are. The loudest supporter is very often not the
// leader, and a player who picks by visible enthusiasm is picking on the wrong axis.
const ACT2_LEADER_PULL = 55;
// Most people carry almost nobody; two or three in any shop carry everybody. Tuned so
// about a quarter of a floor can anchor a committee — rarer than that and twelve months
// is not enough calendar to find anyone, which stops being a lesson and starts being a
// wall.
function rollPull() {
  const r = random();
  if (r < 0.52) return 10 + rand(26);   // most of the floor
  if (r < 0.74) return 36 + rand(19);   // well-liked, not followed
  return 55 + rand(41);                 // an organic leader
}
// Sitting down with somebody moves them, and moves the shop a little: an hour across a
// table is the highest-quality organizing conversation there is, and pretending it buys
// only information would be its own kind of lie. It is still small — one person out of
// twelve. The reason to do it is who it lets you find.
const ACT2_SITDOWN_LIFT = 6;
const ACT2_SITDOWN_MORALE = 2;
const ACT2_SITDOWN_SUPPORT = 2;
// How many names a person gives you when you ask the only question that matters:
// "who else should I be talking to?" Weighted by pull, so the network reports itself.
const ACT2_REFERRALS = 3;
function act2Read(loc, w, ctx = null) {
  const mid = act2Standing(loc, w, ctx);
  // A committee reports the whole floor honestly. Short of that, you know exactly the
  // people you have personally sat down with, and nobody else.
  if (loc.committee?.active || w.met) return { lo: mid, hi: mid, mid, exact: true };
  return { lo: clamp(mid - ACT2_ROSTER_BAND), hi: clamp(mid + ACT2_ROSTER_BAND), mid, exact: false };
}

// The people at this site you have sat down with who turned out to carry the floor.
// These are what a committee is made of; without them there is nobody to form one.
function metLeaders(loc) {
  return (loc.roster || []).filter(w => w.met && w.pull >= ACT2_LEADER_PULL);
}
// How much weight the committee actually has. A committee of the two people everybody
// follows is a different object from a committee of whoever put their hand up, and the
// game should not price them the same.
function committeeWeight(loc) {
  const led = metLeaders(loc);
  if (!led.length) return 0;
  return led.reduce((t, w) => t + w.pull, 0) / 100;
}

const shuffled = (a) => a.map(v => ({ v, k: random() })).sort((x, y) => x.k - y.k).map(x => x.v);

function makeAct2Rosters() {
  const names = shuffled(ACT2_NAMES);
  let cursor = 0;
  const out = {};
  START_LOCATIONS.forEach(loc => {
    const comp = LOC_COMPOSITION[loc.id] || {};
    const roles = ACT2_ROSTER_ROLES[loc.id] || [];
    const n = loc.workers;
    const nContract = Math.round(n * (comp.contract || 0));
    const nNew = Math.round(n * (comp.new || 0));
    // Status and tenure are drawn independently so they cross-cut, which is the whole
    // reason the blocs are interesting: a shop can be three-quarters contract and still
    // split down the middle on how long people have been there.
    const statuses = shuffled(Array.from({ length: n }, (_, i) => (i < nContract ? "contract" : "salaried")));
    const tenures = shuffled(Array.from({ length: n }, (_, i) => (i < nNew ? "new" : "veteran")));
    const jitters = shuffled(Array.from({ length: n }, (_, i) =>
      Math.round(ACT2_ROSTER_SPREAD * (n === 1 ? 0 : (2 * i) / (n - 1) - 1))));
    const people = Array.from({ length: n }, (_, i) => ({
      id: `${loc.id}-${i}`,
      name: names[cursor++ % names.length],
      role: roles[i % roles.length],
      status: statuses[i],
      tenure: tenures[i],
      jitter: jitters[i],
      pull: rollPull(),
      met: false,
    }));
    // Who each person names when you ask who else to talk to. Drawn by pull, so
    // following referrals walks you up the social network and picking by enthusiasm
    // does not. This is the only view of the network the player ever gets.
    people.forEach(w => {
      const others = people.filter(o => o.id !== w.id);
      const picked = [];
      // Squared, not linear. Asking "who should I talk to?" is a question people answer
      // with the names that carry weight — that is what the question is FOR. A referral
      // is a leader about half the time; a cold pick, about one time in seven.
      const pool = others.map(o => ({ o, weight: (o.pull + 8) * (o.pull + 8) }));
      for (let k = 0; k < Math.min(ACT2_REFERRALS, pool.length); k++) {
        let total = pool.reduce((t, x) => t + (picked.includes(x.o.id) ? 0 : x.weight), 0);
        let roll = random() * total;
        for (const x of pool) {
          if (picked.includes(x.o.id)) continue;
          roll -= x.weight;
          if (roll <= 0) { picked.push(x.o.id); break; }
        }
      }
      w.points = picked;
    });
    out[loc.id] = people;
  });
  return out;
}

// Where one person stands: the shop's number, their own distance from it, and what the
// platform says to the two blocs they happen to belong to.
function act2Standing(loc, w, ctx = null) {
  const base = loc.trueSupport ?? loc.morale;
  let tilt = 0;
  if (ctx && ctx.platform && ctx.platform.length >= PLATFORM_SLOTS && ctx.priorities) {
    const pr = ctx.priorities;
    if (pr[w.status]?.defected || pr[w.tenure]?.defected) tilt = ACT2_DEFECTED_TILT;
    else {
      const a = blocSatisfaction(w.status, ctx.platform, pr, ctx.proven || []);
      const b = blocSatisfaction(w.tenure, ctx.platform, pr, ctx.proven || []);
      tilt = ((a + b) / 2 - 50) * ACT2_BLOC_TILT;
    }
  }
  return clamp(Math.round(base + w.jitter + tilt));
}

export { ACT2_NAMES, ACT2_ROSTER_ROLES, ACT2_ROSTER_SPREAD, ACT2_BLOC_TILT, ACT2_DEFECTED_TILT, ACT2_ROSTER_BAND, ACT2_ONE_ON_ONES_PER_TURN, ACT2_SITDOWN_COST, ACT2_LEADER_PULL, rollPull, ACT2_SITDOWN_LIFT, ACT2_SITDOWN_MORALE, ACT2_SITDOWN_SUPPORT, ACT2_REFERRALS, act2Read, metLeaders, committeeWeight, shuffled, makeAct2Rosters, act2Standing };
