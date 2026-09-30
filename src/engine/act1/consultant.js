// The other side: the consultant, the outsider ladder, and whether the drive is still alive.
import { infTrait } from "./traits.js";
import { incomingTies } from "./influence.js";
import { ACT1_CARDS_NEEDED, ACT1_SHIP_WEEK } from "./constants.js";

// ---------- THE UNION-AVOIDANCE CONSULTANT ----------
// Management's real counter-campaign isn't a poster: it's a paid professional running the
// same playbook the player runs — one-on-ones with the people closest to signing, plus the
// two set pieces every organizer has seen. Gated behind a committee that's clearly working,
// because the early game is hard enough without it.
const CONSULTANT_NAME = "Kirkman";
const CONSULTANT_FIRM = "Meridian Workplace Strategies";
const CONSULTANT_TRIGGER_COMMITTEE = 4;
const CONSULTANT_SETPIECE_GAP = 3;
const CONSULTANT_MAX_EACH = 2;

const CONSULTANT_ONE_ON_ONES = [
  (n) => `${CONSULTANT_NAME} books ${n} for a "listening session." Twenty minutes, no witnesses, and a lot of concern about what dues would cost them.`,
  (n) => `${CONSULTANT_NAME} catches ${n} alone and walks them through a slide deck about "what you give up when a third party speaks for you."`,
  (n) => `${CONSULTANT_NAME} asks ${n} whether they've actually read what they'd be signing. They haven't. He has a copy ready.`,
  (n) => `${CONSULTANT_NAME} tells ${n} he's heard great things about them, and that people who are going places usually keep their heads down right now.`,
];

const CONSULTANT_NAME_UC = CONSULTANT_NAME.toUpperCase();

// How much backing a worker has from people who've already signed. Somebody surrounded by
// organizers has been inoculated — they've heard all of this before, from someone they
// trust more. Somebody isolated is who the consultant peels off.
// STUBBORN workers do not move back once they are with you. Everything Kirkman does
// to them washes off, which is the flip side of how hard they were to move at all.
function holdsFast(w) { return !!infTrait(w).holdsFast; }
function signedBacking(influence, workers, id) {
  return incomingTies(influence, id)
    .filter(t => {
      const s = workers.find(x => x.id === t.id);
      return s && s.signed && !s.burned;
    })
    .reduce((sum, t) => sum + t.weight, 0);
}


// ---------- ORG CHART VS SOCIAL NETWORK ----------
// The central argument, as a mechanic instead of a tooltip. The company can only see
// the org chart: teams, reporting lines, mandatory meetings. That is a real weapon and
// it is a blunt one, because a department is not a set of relationships. Density of
// signed coworkers a person actually trusts is what blunts it.
//
// The player works the opposite map. Kirkman only finds it when the campaign gets loud
// enough to show him — which makes your own visibility the thing that teaches him.
const KIRKMAN_SIGHT = 55; // heat above which he stops guessing from the org chart

// An org-chart hit is absorbed in proportion to how much signed influence surrounds
// someone. Fully covered workers take roughly a fifth of the blow.
function orgChartResistance(backing) {
  return Math.max(0.2, 1 - Math.min(1, backing / 110) * 0.8);
}

// ---------- THE OUTSIDER LADDER ----------
// Kirkman is not the whole company. The better the campaign does, the further up the
// chain it gets escalated, and each rung fights differently. Rungs never un-arrive.
const OUTSIDERS = [
  {
    id: "consultant", name: "KIRKMAN", role: "union-avoidance consultant",
    arrival: (c) => c.committee >= CONSULTANT_TRIGGER_COMMITTEE || c.signed >= ACT1_CARDS_NEEDED - 2,
    intro: (n) => `A consultant from ${CONSULTANT_FIRM} is on site by Wednesday. ${n} has a badge, a corner office nobody was using, and a list of names.`,
  },
  {
    id: "boss", name: "DANIELS", role: "studio head",
    arrival: (c) => c.signed >= ACT1_CARDS_NEEDED || c.stage !== "drive",
    intro: () => `The studio head starts walking the floor. Sleeves up, first names, remembering your kid's name. Everybody likes Daniels. That is the problem.`,
  },
  {
    id: "corporate", name: "VANTAGE PARTNERS", role: "the owners",
    arrival: (c) => c.stage !== "drive" && c.heat >= 55,
    intro: () => `Someone from the ownership group flies in for a "portfolio review." No names on the calendar invite, no minutes taken.`,
  },
  {
    id: "celebrity", name: "THE PODCAST", role: "an outside voice",
    arrival: (c) => c.heat >= 72,
    intro: () => `A podcaster with four million subscribers does eleven minutes on your campaign without ever having set foot in the building.`,
  },
];


// ---------- CAN ACT ONE STILL BE WON? ----------
// Same promise as Act Two: the game owes you the truth the moment the arithmetic dies,
// and it owes you the specific reason. Burning people out of the campaign is the way
// you kill a drive here — there are only twenty of them, and you need six signatures.
function act1Winnability(workers, stage, week = 1) {
  if (stage !== "drive") return { alive: true, reason: null };
  if (week > ACT1_SHIP_WEEK) {
    return {
      alive: false, shipped: true, signed: workers.filter(w => w.signed).length, burned: 0,
      reason: `The game ships. Contract workers roll off, post-launch cuts land, and the shop you spent ${ACT1_SHIP_WEEK} weeks organizing does not exist in that configuration anymore. The window didn't close because you ran out of time. It closed because the business cycle was never going to wait for you.`,
    };
  }
  const signed = workers.filter(w => w.signed).length;
  const live = workers.filter(w => !w.burned && !w.signed).length;
  const burned = workers.filter(w => w.burned).length;
  const organizers = workers.filter(w => w.organizer && !w.burned).length;
  if (signed + live < ACT1_CARDS_NEEDED) {
    return {
      alive: false, signed, burned,
      reason: `${burned} ${burned === 1 ? "person is" : "people are"} out of the campaign for good. With ${signed} card${signed === 1 ? "" : "s"} signed and only ${live} ${live === 1 ? "person" : "people"} left who could still sign, this shop cannot reach the ${ACT1_CARDS_NEEDED} the labor board requires.`,
    };
  }
  if (organizers === 0) {
    return { alive: false, signed, burned, reason: `There is nobody left on the committee. Without an organizer on the floor there is no campaign to run.` };
  }
  return { alive: true, signed, burned, reason: null };
}

export { CONSULTANT_NAME, CONSULTANT_FIRM, CONSULTANT_TRIGGER_COMMITTEE, CONSULTANT_SETPIECE_GAP, CONSULTANT_MAX_EACH, CONSULTANT_ONE_ON_ONES, CONSULTANT_NAME_UC, holdsFast, signedBacking, KIRKMAN_SIGHT, orgChartResistance, OUTSIDERS, act1Winnability };
