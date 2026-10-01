// Who is on the committee, and what that costs. A committee is a set of relationships,
// and every one of them is also a way for the company to hear things.
//
// Recruiting is a judgment, not a gate. Anybody who has signed can be asked, by somebody
// on the committee who is their friend or has a signed friend in common to vouch. What
// you are judging is the digit: a solid 5 is a safe pair of hands; a 4 has signed but is
// not all the way in, and one in a few of them will repeat what they hear in committee to
// a manager. That is a leak. A leak hands Kirkman your map, and he works the people the
// leak is closest to first.
//
// A check-in by somebody SEASONED or better finds out. Taking a leak off the committee
// costs an hour and sours them; taking anyone off costs something.
//
// Size is a cost of its own: past four, every member is one more person who might
// mention a meeting, and the floor runs hotter for it.
import { CIRCLES } from "./friends.js";
import { TEAM_LABEL } from "./constants.js";
import { rating } from "./election.js";

const LEAK_CHANCE = { 5: 0, 4: 0.4, 3: 0.5, 2: 0.6, 1: 0.7 };
const leakChance = (trueSupport) => LEAK_CHANCE[rating(trueSupport ?? 0)] ?? 0;
const VET_MIN_XP = 40;               // SEASONED: the experience a check-in needs to tell
const COMMITTEE_COMFORT = 4;         // members before size starts to cost
// The two weekly costs, in one object so the sim can sweep them.
const COMMITTEE_TUNING = {
  sizeHeat: 1,                       // heat per member past COMMITTEE_COMFORT, every week
  leakHeat: 3,                       // heat per undetected leak, every week: management hears about the meetings
  tipAsk: 0.2,                       // a card ask management got to first signs at this fraction
  sizeLeak: 0.15,                    // each week, per member past COMMITTEE_COMFORT: somebody starts talking
  // Tuned in sim/committee-sweep.mjs: recruiting for coverage 77.9, everybody 70.6, only
  // solid 5s 72.9 (SEED=11, n=1000). Weaker settings left recruit-everyone ahead.
};
const SIZE_HEAT = COMMITTEE_TUNING.sizeHeat;
const DROP_LEAK_TRUE = 20;           // a leak shown the door is a 2, and stays one
const LEAK_TIP_TRUE = 4;             // and the person moves back this far
// A tip-off in the last couple of weeks is the visible sign that somebody is talking.
const TIP_MEMORY = 2;
const recentlyTipped = (workers, week) => workers.filter(x => x.tippedWeek != null && week - x.tippedWeek <= TIP_MEMORY);

const committeeOf = (workers) => workers.filter(x => x.organizer && !x.burned);
// An undetected leak on the committee right now, if any.
const activeLeaks = (workers) => committeeOf(workers).filter(x => x.leak);
const sizeHeat = (workers) => Math.max(0, committeeOf(workers).length - COMMITTEE_COMFORT) * COMMITTEE_TUNING.sizeHeat;
const leakHeat = (workers) => activeLeaks(workers).length * COMMITTEE_TUNING.leakHeat;
// Big committees leak because there are more people in the room, not because any one of
// them is shaky. The chance this week that somebody new starts talking.
const sizeLeakChance = (workers) => Math.max(0, committeeOf(workers).length - COMMITTEE_COMFORT) * COMMITTEE_TUNING.sizeLeak;

// The teams and the crowds you have found that have nobody on the committee in them.
function coverageGaps(workers, social) {
  const members = committeeOf(workers);
  const teams = Object.keys(TEAM_LABEL).filter(t => !members.some(m => m.team === t));
  const found = CIRCLES.filter(c => workers.some(x => x.circleKnown && social?.circleOf?.[x.id] === c.id));
  const crowds = found.filter(c => !members.some(m => social?.circleOf?.[m.id] === c.id));
  return { teams, crowds, foundCrowds: found.length };
}

export { sizeLeakChance, LEAK_TIP_TRUE, TIP_MEMORY, recentlyTipped, COMMITTEE_TUNING, leakHeat, LEAK_CHANCE, leakChance, VET_MIN_XP, COMMITTEE_COMFORT, SIZE_HEAT, DROP_LEAK_TRUE, committeeOf, activeLeaks, sizeHeat, coverageGaps };
