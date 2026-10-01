// The first contract's engine: the action ladder, the table, turnout and ratification.
// It runs on the floor Act One hands forward, so it leans on the Act One engine.
import { clamp, rand } from "../rng.js";
import { ACT1_WORKERS_SEED } from "../act1/constants.js";
import { infOn } from "../act1/influence.js";
import { friendsOf, generateSocial, influenceFrom, isKnownFriend, vouchFor } from "../act1/friends.js";
import { cloneSocial, seenCircle } from "../act1/fallout.js";

const CONTRACT_MONTHS = 12;
// Leverage is perishable. A sticker day three months ago doesn't frighten anybody today,
// so an unspent stack cools every month. Hoarding it is not a strategy.
const LEVERAGE_COOLING = 0.8;
const CAT_HOURS = 3;
const CAT_JOIN_REQ = 70;

// ---------- REPETITION IS NOT A STRUCTURE TEST ----------
// The second sticker day tells the company nothing the first one didn't. A test only
// tests something the last one left open, so a rung you have already run pays a
// fraction of what it paid — and escalating is the only thing that keeps paying. This is
// the same curve Act One uses on repeated public actions.
const CONTRACT_FATIGUE = 0.6;
function rungFatigue(uses) { return 1 / (1 + CONTRACT_FATIGUE * uses); }

// ---------- SURFACE BARGAINING ----------
// The employer never says no. They say not yet, and they say it for a year. Every month
// you cannot make that expensive, the price of everything you still want goes up — which
// is the actual mechanism by which most first contracts die.
const STALL_STEP = 0.15;
const STALL_MAX = 4;
const stalledCost = (base, stall) => Math.round(base * (1 + STALL_STEP * stall));

// ---------- THE CALENDAR ----------
// Withholding labour three weeks from a ship date is a different act from withholding it
// in a quiet month. Visible from month one, because a cap you plan against is strategy.
const CONTRACT_MILESTONES = { 4: "VERTICAL SLICE DUE", 8: "PUBLISHER MILESTONE", 11: "GOLD MASTER" };
const MILESTONE_MULT = 1.8;
const OFFPEAK_MULT = 0.65;
// Only the rungs that actually withhold something care what month it is.
const timingMult = (tier, month) =>
  tier.rank < 4 ? 1 : (CONTRACT_MILESTONES[month] ? MILESTONE_MULT : OFFPEAK_MULT);

// A team nobody asks to do anything stops being a team.
const CAT_IDLE_QUIT = 4;

// ---------- WHAT YOU KNOW ABOUT YOUR OWN MEMBERS ----------
// Act One's lesson, one act later: commitment is not on the board, it is a read on the
// board. Sitting down with somebody gives you a number for a couple of months. An action
// gives you a number for everybody who TURNED UP — and tells you nothing about the people
// who stayed home, which are exactly the people you needed to know about. That is what a
// structure test is for, and it is why the projection is a range and not an answer.
const CONTRACT_READ_FRESH = 2;
const CONTRACT_READ_STEP = 5;
const CONTRACT_READ_MAX = 24;
function contractRead(w, month) {
  const age = month - (w.spokenMonth ?? -99);
  if (age <= CONTRACT_READ_FRESH) return { lo: w.commitment, hi: w.commitment, mid: w.commitment, exact: true, age };
  const half = Math.min(CONTRACT_READ_MAX, CONTRACT_READ_STEP * (age - CONTRACT_READ_FRESH));
  return { lo: clamp(w.commitment - half), hi: clamp(w.commitment + half), mid: w.commitment, exact: false, age };
}

// The escalation ladder. Each rung is a structure test: it costs prep, it produces a
// measured turnout, and that number is the only thing the company actually responds to.
// The contract act climbs the same shape, but the rungs are different acts. Signing a
// card is not what is being asked for any more, so SIGNED cannot be the rung that
// matters — turning out is. The board takes these as props the way it takes `labels`.
const CONTRACT_LADDER = [
  { id: "committee", label: "ACTION TEAM", pips: 4, hex: "#fbbf24", blurb: "Runs the actions and brings other people out. Their relationships are yours to direct." },
  { id: "signed", label: "TURNED OUT", pips: 3, hex: "#2dd4bf", blurb: "Showed up at the last action. This is the only thing the company actually counts." },
  { id: "supporter", label: "SAYS YES", pips: 2, hex: "#a3e635", blurb: "Says they're in. Has not shown up to anything yet." },
  { id: "contacted", label: "SPOKEN TO", pips: 1, hex: "#a8a29e", blurb: "Sat down with recently, so you know where they actually are." },
  { id: "cold", label: "OUT OF TOUCH", pips: 0, hex: "#57534e", blurb: "Nobody has been near them lately. Whatever you think you know about them is old." },
];
const CONTRACT_LADDER_BY_ID = Object.fromEntries(CONTRACT_LADDER.map(r => [r.id, r]));
// Everyone carries an Act One history and arrives revealed, so "have you ever spoken to
// them" is true of the whole floor and says nothing. What matters now is whether the
// read is still good, which is the same test the panel and the projection already use.
function contractLadderOf(w, month = 1) {
  if (w.organizer) return CONTRACT_LADDER_BY_ID.committee;
  if (w.signed) return CONTRACT_LADDER_BY_ID.signed;
  if (w.support >= 55) return CONTRACT_LADDER_BY_ID.supporter;
  if (month - (w.spokenMonth ?? -99) <= CONTRACT_READ_FRESH) return CONTRACT_LADDER_BY_ID.contacted;
  return CONTRACT_LADDER_BY_ID.cold;
}

const ACTION_LADDER = [
  {
    key: "letter", rank: 1, label: "Open letter to management", hours: 1,
    floor: 15, span: 55, threshold: 0.55, payout: 14,
    blurb: "Everyone who signs puts their name on a piece of paper the company has to read.",
  },
  {
    key: "stickers", rank: 2, label: "Sticker day", hours: 2,
    floor: 32, span: 55, threshold: 0.6, payout: 30,
    blurb: "One day, everyone wears it. Management counts stickers walking down the hall.",
  },
  {
    key: "march", rank: 3, label: "March on the boss", hours: 3,
    floor: 48, span: 52, threshold: 0.5, payout: 58,
    blurb: "A delegation walks into the studio head's office, unannounced, with a demand.",
  },
  {
    key: "worktorule", rank: 4, label: "No voluntary overtime", hours: 4,
    floor: 58, span: 48, threshold: 0.5, payout: 90,
    blurb: "Nobody stays past their hours. Three weeks from a milestone, that is a loaded gun.",
  },
  {
    key: "strike", rank: 5, label: "One-day stoppage", hours: 5,
    floor: 70, span: 42, threshold: 0.75, payout: 160,
    blurb: "For one day nobody works. The only thing that costs the company money — and the only thing that costs the floor a day's pay to say.",
  },
];

const CONTRACT_ISSUES = [
  {
    id: "wages", label: "WAGES",
    tiers: ["The company's offer — 1.5%, under inflation", "Keeps pace with inflation", "A real raise, and a floor under QA"],
    costs: [0, 28, 66],
  },
  {
    id: "justcause", label: "JUST CAUSE",
    tiers: ["At-will. A PerfAxis score still decides who goes", "Progressive discipline, on paper", "Just cause, and an appeal that reaches a human"],
    costs: [0, 42, 86],
  },
  {
    id: "ai", label: "PLAY-EYE",
    tiers: ["No language at all", "The company must disclose what it overrides", "No override of credited work. No unit jobs replaced"],
    costs: [0, 38, 92],
  },
];
const CONTRACT_MAX_TIERS = CONTRACT_ISSUES.length * 2;

// Voting yes once and giving up your Friday are different acts, so what somebody would
// have done at the ballot is a ceiling on what they will do now, not a promise.
const CONTRACT_VOTE_TO_ACTION = 0.85;

// ---------- THE FLOOR, ON FRIENDS ----------
// The contract act runs on the friendships Act One carried, not on a weight map. Who turns
// somebody out is their friends on the action team (FRIEND_TIE each) and anyone on it from
// their crowd (CIRCLE_TIE). The company's perks lapse in the contract fight, so a crowd it
// bought during the campaign is a crowd again. The playtest entrance, with nothing
// carried, rolls a floor; a save from before friendships existed brings only its map.
function contractFloor(carry = null) {
  if (carry?.social) {
    const social = { ...cloneSocial(carry.social), bought: {} };
    social.influence = influenceFrom(social.friends, social.circleOf, carry.workers || ACT1_WORKERS_SEED, {});
    return { social, influence: social.influence };
  }
  if (carry?.influence) return { social: null, influence: carry.influence };
  const social = generateSocial(ACT1_WORKERS_SEED);
  return { social, influence: social.influence };
}

// What fear Phase 2 left in somebody comes off what they will do now: the meeting is over,
// the worry about what happens to people who stick their necks out is not.
const CONTRACT_FEAR_COST = 5;

function makeContractWorkers(act1Workers = null, social = null) {
  if (!act1Workers) {
    // The playtest entrance, with no campaign behind it: a plausible floor, rolled. With
    // no campaign there was nobody to map it, so everyone's friendships are simply known.
    return ACT1_WORKERS_SEED.map(w => ({
      ...w,
      knownFriends: social ? [...friendsOf(social, w.id)] : [],
      circleKnown: !!social,
      commitment: clamp(38 + rand(38) + (w.organizer ? 22 : 0)),
      fulfillment: clamp(w.fulfillment + rand(9) - 4),
      cat: !!w.organizer,
      participated: false,
      revealed: true,
      history: [],
      spokenMonth: w.organizer ? 1 : -99,
      monthsIdle: 0,
      bought: 0,
      thinRuns: 0,
    }));
  }
  // The real entrance. These are the same twenty people a week after the vote, and
  // everything that was true of them at the ballot is still true of them now.
  return act1Workers.map(w => {
    const stood = w.trueSupport ?? w.support;
    const wasBurned = !!w.burned;
    return {
      ...w,
      commitment: clamp(Math.round(stood * CONTRACT_VOTE_TO_ACTION)
        + (w.organizer && !wasBurned ? 10 : 0)   // they have already been doing this
        - (wasBurned ? 18 : 0)                   // and they have already been punished for it
        - CONTRACT_FEAR_COST * (w.fear || 0)),   // and the campaign got to them
      fear: 0,
      // The committee that won the election is the team that bargains the contract.
      cat: !!w.organizer && !wasBurned,
      // Winning is what brings back the people management pulled out of the campaign.
      // They come back, and they come back wary.
      burned: false,
      // The company's perks lapse in the contract fight. What these people have in
      // common is theirs again.
      poisoned: [],
      participated: false,
      revealed: true,
      // A deep conversation in Act One is still a fresh read here; anyone the campaign
      // never actually sat down with arrives as a question mark, same as they were.
      spokenMonth: w.trueKnown ? 1 : -99,
      monthsIdle: 0,
      bought: 0,
      thinRuns: 0,
    };
  });
}

// Who on the action team can reach this person: friends, and people from their crowd.
// Read off the friendships you have mapped, because that is what the panel can show.
function teamTies(social, workers, w) {
  if (!social) return { friends: [], crowd: [] };
  const team = workers.filter(x => x.cat && x.id !== w.id);
  const friends = team.filter(x => isKnownFriend(w, x.id));
  const mine = seenCircle(w, social);
  const crowd = team.filter(x => !friends.includes(x) && mine && seenCircle(x, social) === mine);
  return { friends, crowd };
}
// Bringing somebody onto the action team takes a way in, as Act One's committee did: a
// friend on the team, a signed friend in common to vouch, or (a won election later)
// somebody from their own crowd, as far as you have found it. A save from before
// friendships has no map to check, so anybody may ask.
function teamPath(actor, target, workers, social) {
  if (!social) return true;
  const mine = seenCircle(actor, social);
  const sameCrowd = mine && seenCircle(target, social) === mine;
  return isKnownFriend(actor, target.id) || !!vouchFor(actor, target, workers) || !!sameCrowd;
}

// Who turns people out: the people on the contract action team who carry weight with them.
// On a carried floor that weight is friendship: a friend is worth FRIEND_TIE, somebody
// from their crowd CIRCLE_TIE (see contractFloor).
function catBacking(influence, workers, id) {
  return workers
    .filter(x => x.cat && x.id !== id)
    .reduce((sum, x) => sum + infOn(influence, x.id, id), 0);
}

// Commitment says whether they'd act at all. Fulfillment says how far they'll go:
// somebody who loves this job will sign a letter but won't hold a milestone hostage.
function participationChance(w, tier, backing) {
  const ready = Math.max(0, Math.min(1, (w.commitment - tier.floor) / tier.span));
  const drag = (w.fulfillment / 100) * (tier.rank >= 3 ? 0.42 : 0.10);
  const pull = Math.min(0.22, backing / 420);
  // Somebody the company has just bought does not walk out with you, whatever they said
  // last month. It wears off; the fact that it worked on them does not.
  const bought = (w.bought || 0) > 0 ? 0.3 : 1;
  return Math.max(0, Math.min(0.97, (ready * (1 - drag) + pull) * bought));
}

// The truth, used to resolve an action. The player never sees this one.
function projectedTurnout(workers, influence, tier) {
  if (!tier) return 0;
  return workers.reduce((n, w) => n + participationChance(w, tier, catBacking(influence, workers, w.id)), 0);
}
// What the player can actually work out, which is a range. Wide wherever nobody has
// spoken to anybody in a while.
// With `leadId`, the lead's own pull counts the way it does on the day (half again).
function projectedTurnoutBand(workers, influence, tier, month, leadId = null) {
  if (!tier) return { lo: 0, hi: 0, exact: true };
  let lo = 0, hi = 0, exact = true;
  workers.forEach(w => {
    const r = contractRead(w, month);
    if (!r.exact) exact = false;
    const backing = catBacking(influence, workers, w.id) + (leadId != null && leadId !== w.id ? infOn(influence, leadId, w.id) * 0.5 : 0);
    lo += participationChance({ ...w, commitment: r.lo }, tier, backing);
    hi += participationChance({ ...w, commitment: r.hi }, tier, backing);
  });
  return { lo: Math.round(lo), hi: Math.round(hi), exact };
}

const contractTierSum = (issues) => issues.reduce((n, i) => n + i.tier, 0);

// Ratification: they vote on what you actually brought back, not on how hard you tried.
function ratifyYesChance(w, issues) {
  const won = contractTierSum(issues) / CONTRACT_MAX_TIERS;
  return Math.max(0.02, Math.min(0.96, 0.12 + won * 0.62 + (w.commitment - 45) / 190));
}

// After the certification year, the question stops being what's in the contract and
// becomes whether there's still a union at all. Nothing to show for a year of bargaining
// is exactly how a unit gets decertified — so this leans on what was actually WON, not
// on how warm the floor feels. A year of pleasant meetings and an empty contract is the
// most common way a first unit dies, and it should read that way here.
function keepUnionChance(w, issues) {
  const won = contractTierSum(issues) / CONTRACT_MAX_TIERS;
  return Math.max(0.03, Math.min(0.97, 0.14 + won * 0.55 + (w.commitment - 45) / 220));
}

export { contractFloor, CONTRACT_FEAR_COST, teamTies, teamPath, CONTRACT_MONTHS, LEVERAGE_COOLING, CAT_HOURS, CAT_JOIN_REQ, CONTRACT_FATIGUE, rungFatigue, STALL_STEP, STALL_MAX, stalledCost, CONTRACT_MILESTONES, MILESTONE_MULT, OFFPEAK_MULT, timingMult, CAT_IDLE_QUIT, CONTRACT_READ_FRESH, CONTRACT_READ_STEP, CONTRACT_READ_MAX, contractRead, CONTRACT_LADDER, CONTRACT_LADDER_BY_ID, contractLadderOf, ACTION_LADDER, CONTRACT_ISSUES, CONTRACT_MAX_TIERS, CONTRACT_VOTE_TO_ACTION, makeContractWorkers, catBacking, participationChance, projectedTurnout, projectedTurnoutBand, contractTierSum, ratifyYesChance, keepUnionChance };
