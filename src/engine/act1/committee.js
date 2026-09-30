// Organizers get better with use and drift away without it.
import { ACT1_HOURS_PER_ORGANIZER } from "./constants.js";

// ---------- THE COMMITTEE DEVELOPS ----------
// The fantasy is building a network that organizes itself. A committee whose members
// are interchangeable hour-tokens cuts directly against that, so they aren't: people
// get better at this by doing it, and they fall away if you stop coming back to them.
const ORG_TIERS = [
  { min: 75, label: "LEAD ORGANIZER", hex: "#fbbf24", send: 1.30, bonusHours: 1,
    blurb: "Runs their own conversations without being told. +30% to everything they do, and an extra hour every week." },
  { min: 40, label: "SEASONED",       hex: "#a3e635", send: 1.15, bonusHours: 0,
    blurb: "Has had enough hard conversations to know how they go. +15% to everything they do." },
  { min: 0,  label: "NEW TO THIS",    hex: "#a8a29e", send: 1.00, bonusHours: 0,
    blurb: "Willing, but green. Gets better every week you actually use them." },
];
const orgTier = (w) => ORG_TIERS.find(t => (w.experience || 0) >= t.min) || ORG_TIERS[ORG_TIERS.length - 1];
const orgMult = (w) => (w?.organizer ? orgTier(w).send : 1);

// Experience comes from the work, not from being named to a list.
const XP_PER_ACTION = 7;
const XP_PER_CARD = 12;

// Neglect. Two weeks of grace, then they start giving you less, then they walk.
const IDLE_GRACE = 2;
const IDLE_QUIT = 5;
function idlePenalty(w) {
  return Math.max(0, (w.weeksIdle || 0) - IDLE_GRACE);
}
function committeeHours(w) {
  if (w.shaken > 0) return 1;
  return Math.max(0, ACT1_HOURS_PER_ORGANIZER + orgTier(w).bonusHours - idlePenalty(w));
}

export { ORG_TIERS, orgTier, orgMult, XP_PER_ACTION, XP_PER_CARD, IDLE_GRACE, IDLE_QUIT, idlePenalty, committeeHours };
