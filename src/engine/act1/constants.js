// The shop: its clock, its thresholds, its twenty people.

const ACT1_CARD_THRESHOLD = 0.30;
const ACT1_HOURS_PER_ORGANIZER = 3;
// The level is scored on speed: beat it in this many weeks or fewer.
const ACT1_STAR_WEEKS = { three: 16, two: 21 };

// ---------- THE WINDOW CLOSES ----------
// Two deadlines, neither of them a bare countdown.
//
// 1. Cards go stale. This is real NLRB practice — old authorization cards get
//    challenged as unreliable evidence of CURRENT support — and it is the right shape
//    here because it isn't a timer, it's decay. A stale card drops that worker back
//    down the ladder and takes true support with it. It never touches a fast run: your
//    first card lands around week 6, so a 3-star campaign never loses one. A grind
//    watches its early signatures rot off faster than it can replace them.
const CARD_LIFESPAN = 14;
const CARD_STALE_WARNING = 3; // weeks of notice on the worker card

// 2. The studio ships. The most honest death available in this setting: the window
//    closes because the business cycle does not wait for the campaign. Visible from
//    week one — a cap you discover is a cheap shot, a cap you plan against is strategy.
const ACT1_SHIP_WEEK = 26;
const ACT1_CRUNCH_WEEKS = 4; // flagged off by default; see ACT1_CRUNCH_ENABLED
const ACT1_CRUNCH_ENABLED = false;

function cardAge(w, week) {
  return w.signedWeek == null ? 0 : week - w.signedWeek;
}
function cardExpiresOn(w) {
  return w.signedWeek == null ? null : w.signedWeek + CARD_LIFESPAN;
}
function cardStaleSoon(w, week) {
  const exp = cardExpiresOn(w);
  return exp != null && exp - week <= CARD_STALE_WARNING && exp - week > 0;
}
const ACT1_PUBLIC_UNLOCK_WEEK = 4; // three weeks of conversations first
const ACT1_RECRUIT_REQ = 85;
function act1Stars(week) {
  if (week <= ACT1_STAR_WEEKS.three) return 3;
  if (week <= ACT1_STAR_WEEKS.two) return 2;
  return 1;
}

const TRAIT_LABEL = { legal: "legal grievances", antiunion: "countering anti-union pressure", committee: "building shop committees", morale: "keeping morale up" };
// Teams are public knowledge from day one — unlike the influence map, you don't need to
// know who works where without being told. They bias who carries weight with whom.
const TEAM_LABEL = { engineering: "ENGINEERING", qa: "QA", production: "PRODUCTION" };
const TEAM_HEX = { engineering: "#38bdf8", qa: "#a78bfa", production: "#fb7185" };

// ---------- THE THREE STATS ----------
// Support tiers are only a readable band on the 0-100 support number.
const SUPPORT_TIERS = [
  { min: 78, label: "READY", hex: "#2dd4bf", text: "text-teal-400" },
  { min: 55, label: "WARM", hex: "#fbbf24", text: "text-amber-400" },
  { min: 30, label: "UNSURE", hex: "#a8a29e", text: "text-stone-400" },
  { min: 0, label: "COLD", hex: "#f87171", text: "text-red-400" },
];
const supportTier = (s) => SUPPORT_TIERS.find(t => s >= t.min) || SUPPORT_TIERS[SUPPORT_TIERS.length - 1];
const fulfillmentLabel = (f) => (f >= 70 ? "FULFILLED" : f >= 40 ? "MIXED" : "BURNED OUT");
const FULFILL_HEX = "#7dd3fc";

const STAT_INFO = {
  support: "There is one number: what this person would actually do with a card in front of them. You do not get to see it. What you get is a read, and the band is how wide your uncertainty is. Warm words set the top of that band and nothing else \u2014 everyone who talks a good game looks identical from outside, and cheap actions make more of them: watching a coworker wear a button makes people talk warmer without making anyone likelier to sign. Only sitting down with somebody turns the band into a number, and it blurs again over the following weeks. The card ask, the committee, and the ballot all roll against the real figure, never against your read of it.",
  trueSupport: "There is one number: what this person would actually do with a card in front of them. You do not get to see it. What you get is a read, and the band is how wide your uncertainty is. Only sitting down with somebody turns that band into a number.",
  influence: "A tie is relationship-specific. There is no single number for how persuasive somebody is — Camille might carry real weight with one coworker and none at all with the next — and it runs one way, so Camille moving Dante says nothing about Dante moving Camille. What a tie is worth is standing plus whatever common ground you have surfaced between those two people: find something they share and the line thickens and turns teal; let the company buy it and the line goes thin and grey again. Common ground you have not found yet counts for nothing, and anything the company has bought counts for nothing either. Every conversation, card ask and public action lands in proportion to the tie.",
  fulfillment: "How much this person likes the job — which is to say, how much they feel they would be risking. It says nothing about their politics. What it changes is the ask: a worker who loves it here hesitates longer over the card. This is the lever the company buys with offsites and new hardware, one department at a time.",
  _legacyFulfillment: "How fulfilled this person is by the work itself. Fulfilled and burned-out workers both sign union cards — fulfillment does not predict support. What it predicts is who they'll listen to: people are moved much harder by an organizer whose relationship to the job resembles their own.",
};

const BURN_NARRATIVES = [
  (name) => `${name} is in a meeting with HR and a skip-level by 9am. No accusation — just a new weekly check-in and a manager on every calendar invite from now on.`,
  (name) => `Somebody in the room repeats what ${name} said, to the wrong person. By Friday ${name} is quietly off the flagship project.`,
  (name) => `${name} gets the "we love your passion, but" conversation. It comes with a performance plan attached.`,
  (name) => `A screenshot of ${name} makes it into a manager's DMs. The temperature around them drops overnight.`,
];

// Titles are public from day one, like teams: the org chart is the one map you get free.
// support / fulfillment are deliberately uncorrelated — the whole point of stat 3 is that
// you cannot read someone's politics off how much they love the job.
const ACT1_WORKERS_SEED = [
  { id: 1, name: "Marisol", team: "engineering", title: "Senior Engineer", trait: "committee", support: 38, fulfillment: 62, hook: "Was coded as a senior engineer for six years. After coming back from parental leave, she got her first-ever 'needs improvement' review — same work, different score." },
  { id: 2, name: "Dante", team: "production", title: "Associate Producer", trait: "morale", support: 16, fulfillment: 85, hook: "New hire, six months in. Just happy to be here making games. Doesn't realize yet that being new makes him easy to cut first." },
  { id: 3, name: "Priya", team: "engineering", title: "Gameplay Engineer", trait: "legal", support: 46, fulfillment: 35, hook: "Works crunch every launch cycle. Her health is suffering but she's afraid saying no will tank her stack ranking." },
  { id: 4, name: "Wendell", team: "production", title: "Producer", trait: "legal", support: 85, fulfillment: 30, organizer: true, hook: "Was here before the PE acquisition. Remembers when there was profit-sharing, real raises, and you could push back on a deadline." },
  { id: 5, name: "Ashanti", team: "production", title: "Community Manager", trait: "antiunion", support: 48, fulfillment: 55, hook: "Posts about everything. First to call out problems publicly, first to get quietly 'counseled' about her tone." },
  { id: 6, name: "Miguel", team: "engineering", title: "Staff Engineer", trait: "committee", support: 34, fulfillment: 25, hook: "The load-bearing engineer. Everyone routes their hardest problems to him. He does the work of two people and it shows on his face." },
  { id: 7, name: "Brianna", team: "qa", title: "QA Analyst", trait: "morale", support: 20, fulfillment: 60, hook: "Transferred in from the studio they acquired last year. Still learning how this one works." },
  { id: 8, name: "Tyrell", team: "qa", title: "QA Analyst", trait: "antiunion", support: 40, fulfillment: 30, hook: "His PerfAxis score dropped 12 points last quarter. He still doesn't know why. There's no one to ask." },
  { id: 9, name: "Sofia", team: "production", title: "Production Coordinator", trait: "committee", support: 30, fulfillment: 70, hook: "Unofficial team mom. The first to notice when people are struggling before anyone else does." },
  { id: 10, name: "Jake", team: "engineering", title: "Tools Engineer", trait: "morale", support: 36, fulfillment: 45, hook: "His hours are technically 40 but the Slack pings don't stop until midnight. He's been tracking it. Nobody's compensating him for it." },
  { id: 11, name: "Camille", team: "qa", title: "QA Lead", trait: "legal", support: 88, fulfillment: 50, organizer: true, hook: "Was in a union at her last studio. Doesn't advertise it — but she knows exactly how this is supposed to go." },
  { id: 12, name: "Roz", team: "engineering", title: "Principal Engineer", trait: "legal", support: 26, fulfillment: 78, hook: "Principal engineer. Genuinely loves this codebase — she wrote half of it. Which is exactly why watching Play-Eye overwrite her systems is unbearable." },
  { id: 13, name: "Omar", team: "qa", title: "Senior QA Analyst", trait: "antiunion", support: 18, fulfillment: 40, hook: "Keeps his head down and his numbers up. He's been told he's 'on the list' for a lead role two years running." },
  { id: 14, name: "Fen", team: "production", title: "Concept Artist", trait: "morale", support: 44, fulfillment: 82, hook: "Concept artist. Loves this game more than anyone in the building, and can't stand what the building does to the people making it." },
  { id: 15, name: "Gus", team: "engineering", title: "Engine Programmer", trait: "committee", support: 14, fulfillment: 65, hook: "Twenty-two years in games, four studios. Was around for one union drive that fell apart badly. Doesn't intend to live through a second." },
  { id: 16, name: "Naledi", team: "qa", title: "QA Coordinator", trait: "legal", support: 52, fulfillment: 22, hook: "Runs the entire QA pipeline on a coordinator's title and a coordinator's pay. Hasn't taken a full weekend since March." },
  { id: 17, name: "Theo", team: "production", title: "Audio Designer (contract)", trait: "morale", support: 28, fulfillment: 48, hook: "Audio, contract-to-hire for the third contract running. His renewal is up in eleven weeks and he knows exactly who signs it." },
  { id: 18, name: "Iris", team: "engineering", title: "Tools Engineer", trait: "antiunion", support: 37, fulfillment: 20, hook: "Built the internal tools team's best work. Play-Eye replaced it in a single sprint and nobody told her before the all-hands." },
  { id: 19, name: "Marcus", team: "qa", title: "QA Analyst", trait: "committee", support: 42, fulfillment: 66, hook: "Ran the studio's mentorship program until it got cut for 'focus.' Still mentors people anyway, on his own time." },
  { id: 20, name: "Delphine", team: "production", title: "Narrative Lead", trait: "antiunion", support: 22, fulfillment: 88, hook: "Narrative lead, four years inside this world. Thinks a union fight will slow the ship down right when the game finally needs to land." },
];
const ACT1_TOTAL_WORKERS = ACT1_WORKERS_SEED.length;
const ACT1_CARDS_NEEDED = Math.ceil(ACT1_TOTAL_WORKERS * ACT1_CARD_THRESHOLD);

export { ACT1_CARD_THRESHOLD, ACT1_HOURS_PER_ORGANIZER, ACT1_STAR_WEEKS, CARD_LIFESPAN, CARD_STALE_WARNING, ACT1_SHIP_WEEK, ACT1_CRUNCH_WEEKS, ACT1_CRUNCH_ENABLED, cardAge, cardExpiresOn, cardStaleSoon, ACT1_PUBLIC_UNLOCK_WEEK, ACT1_RECRUIT_REQ, act1Stars, TRAIT_LABEL, TEAM_LABEL, TEAM_HEX, SUPPORT_TIERS, supportTier, fulfillmentLabel, FULFILL_HEX, STAT_INFO, BURN_NARRATIVES, ACT1_WORKERS_SEED, ACT1_TOTAL_WORKERS, ACT1_CARDS_NEEDED };
