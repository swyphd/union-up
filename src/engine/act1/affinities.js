// Common ground, and the tie it is made of.
import { clamp } from "../rng.js";
import { infOn } from "./influence.js";

// ---------- AFFINITY TRAITS ----------
// Tier two of the trait system. These do not make anyone a better organizer — they
// decide WHO can reach WHOM. Hidden until a conversation surfaces them, which is the
// whole reason the quick chat exists as an action.
// Each one also names the perk the company can buy it with. A perk is not a bribe
// aimed at a person — it is aimed at a THING PEOPLE HAVE IN COMMON, which is the
// thing the campaign was using to reach them.
const AFFINITY_POOL = [
  { id: "dogs", label: "Dog person",
    perk: "Dog-Friendly Fridays", barb: "A photo wall goes up by reception within a week." },
  { id: "parent", label: "Has small kids",
    perk: "backup childcare stipend", barb: "Capped, reimbursed quarterly, and worth less than the raise it replaced." },
  { id: "commute", label: "Long commute",
    perk: "transit subsidy", barb: "Ninety dollars a month, and a reminder of who pays it, every month." },
  { id: "ttrpg", label: "Runs a tabletop game",
    perk: "games room, bookable after hours", barb: "The company now hosts the thing they did to get away from the company." },
  { id: "veg", label: "Vegetarian",
    perk: "catered lunch with a real plant-based menu", barb: "Thursdays. Attendance is noted, warmly." },
  { id: "gym", label: "Lifts before shift",
    perk: "gym reimbursement", barb: "Submitted through the same portal as the performance review." },
  { id: "transplant", label: "Moved here for the job",
    perk: "relocation top-up, paid late", barb: "Money they were owed, arriving now, framed as generosity." },
  { id: "debt", label: "Carrying student debt",
    perk: "student loan matching", barb: "Vests over four years. Nobody says the word \u2018vests\u2019 out loud." },
  { id: "modder", label: "Came up through modding",
    perk: "company game jam, on the clock", barb: "The one weekend a year the work feels like it used to." },
  { id: "secondjob", label: "Works a second job",
    perk: "shift-flexibility pilot", barb: "A pilot. Reviewed in six months, by the people running it." },
  { id: "caretaker", label: "Cares for a parent",
    perk: "eldercare leave", barb: "Unpaid, but approved quickly, and everyone hears whose was approved." },
  { id: "smoker", label: "Takes the loading-dock break",
    perk: "covered patio with heaters", barb: "The dock was where people talked without a manager in earshot." },
  { id: "church", label: "Church every Sunday",
    perk: "Sunday shifts made voluntary", barb: "Voluntary, and the schedule still gets written by someone." },
  { id: "vet", label: "Veteran",
    perk: "veterans\u2019 resource group, company-sponsored", barb: "A group for them, chaired by HR, meeting on company time." },
];

// How long a perk keeps an affinity from working as common ground. It wears off —
// people notice the dog day was a one-off — but six weeks is most of a card drive.
const PERK_WEEKS = 6;
const AFF_BY_ID = Object.fromEntries(AFFINITY_POOL.map(a => [a.id, a]));

const affList = (w) => w?.affinities || [];
const knownAff = (w) => w?.knownAffinities || [];
const poisonedAff = (w) => w?.poisoned || [];
const isPoisoned = (w, t) => poisonedAff(w).includes(t);
// What actually exists between two people — minus anything the company has bought.
// A poisoned affinity is still true about both of them. It just stops being yours:
// once the company sponsors the thing they have in common, bringing it up in a
// conversation is bringing up the company.
function sharedAffinities(a, b) {
  return affList(a).filter(t => affList(b).includes(t) && !isPoisoned(a, t) && !isPoisoned(b, t));
}
// What the PLAYER can see — a match only helps you plan if you've surfaced it on both.
function visibleShared(a, b) {
  return sharedAffinities(a, b).filter(t => knownAff(a).includes(t) && knownAff(b).includes(t));
}
// ---------- COMMON GROUND IS WHAT THE MAP IS MADE OF ----------
// Affinity is not a second system running alongside the influence map. It is what the
// map is made of. There is one number for a relationship — the tie — and the symbols
// under somebody's name are the reason the line into them is as thick as it is.
//
// It amplifies the standing two people already had rather than manufacturing standing
// out of nothing: finding out you both have dogs makes a real difference to somebody you
// already talk to, and gets you a foot in the door with somebody you don't. And it
// counts only what you have SURFACED. Common ground nobody has found yet is doing no
// work for anybody, which is the whole argument for scouting the floor.
//
// The multipliers are the old affinity multiplier's own numbers, moved from the gain to
// the relationship, which is where they always belonged. Every formula downstream kept
// its original shape and simply reads the tie where it used to read raw influence.
const TIE_COLD = 0.7;          // a relationship with nothing found in it
const TIE_PER_SHARED = 0.35;   // and what each surfaced thing is worth on top
const TIE_STRANGER_STEP = 3;   // a foot in the door for two people with no standing
const TIE_SHARED_CAP = 3;
function tieBonus(a, b) {
  return Math.min(TIE_SHARED_CAP, visibleShared(a, b).length);
}
function tieFrom(base, a, b) {
  const n = tieBonus(a, b);
  return Math.round(clamp(base * (TIE_COLD + TIE_PER_SHARED * n) + TIE_STRANGER_STEP * n));
}
function tieOn(influence, a, b) {
  return tieFrom(infOn(influence, a.id, b.id), a, b);
}

export { AFFINITY_POOL, PERK_WEEKS, AFF_BY_ID, affList, knownAff, poisonedAff, isPoisoned, sharedAffinities, visibleShared, TIE_COLD, TIE_PER_SHARED, TIE_STRANGER_STEP, TIE_SHARED_CAP, tieBonus, tieFrom, tieOn };
