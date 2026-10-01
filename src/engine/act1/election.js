// What the player can know, and what the ballot does with what is true.
import { clamp } from "../rng.js";

// ---------- THE ELECTION ----------
// 30% of the unit on cards is the legal minimum to petition — it is not the number you
// win on. Filing starts a clock: the employer campaigns hard for four weeks, and then a
// secret ballot decides it on a majority of votes actually cast. The whole point of this
// stage is the third loss in the chain the game has been teaching: support isn't a
// signature, and a signature isn't a vote.
// Six since M5, so the move-and-counter rhythm of Phase 2 has room. sim/phase2.mjs sweeps it.
const ELECTION_WEEKS = 6;
const VOLUNTARY_RECOGNITION_FLOOR = 0.5;

// A secret ballot is decided by what somebody would actually do, not by what they have
// been telling the organizer who keeps stopping by their desk. Every other number in the
// game is a read on this one — which is why the company spends its whole budget attacking
// the read and can barely touch this.
const ballotStanding = (w) => w.trueSupport ?? w.support;
// Where the yes-curve sits. True support runs about 25 points below stated support, so
// these are not the numbers a stated-support ballot would use. Tuned in sim/: a careful
// campaign carries the unit about two thirds of the time, a sloppy one is a coin flip,
// and the median result is decided by three votes.
// ---------- WHAT YOU ACTUALLY KNOW ----------
// There is one real number per worker: what they would do. The player never sees it.
// What the board shows is a READ, and the width of that read is the honest measure of
// how much organizing has been done on that person.
//
// Warm words are a ceiling, not an estimate. Somebody who says all the right things
// might be exactly where they sound or twenty points below it and being polite; what
// they cannot be is further along than they claim. So a read built only on what
// somebody says hangs DOWN from their words instead of sitting around them, and the
// only thing that moves it off the ceiling and onto a number is a conversation.
const READ_COLD_DROP = 45;   // never spoken to: they could be anywhere under their words
const READ_WARM_DROP = 28;   // you've talked, but never the long version
const READ_FRESH_HALF = 4;   // the week you sit down with them
const READ_BLUR_RATE = 1;    // and it blurs again at this rate afterwards
// A read never decays to worse than a quick chat's ceiling band: having sat down with
// somebody once is permanently worth something, it just stops being worth a number.
const READ_BLUR_CAP = 9;
// Wide enough to still be worth printing a figure for. Buys a deep conversation about
// three weeks of a hard number before it goes back to being a range.
const READ_NUMBER_MAX = 6;

function readOf(w, week = 1) {
  const commitment = w.trueSupport ?? w.support;
  // A signature is not a report, it is an act. You know what it was worth.
  if (w.signed) return { lo: commitment, hi: commitment, mid: commitment, exact: true, kind: "signed" };
  if (w.trueKnown) {
    const age = Math.max(0, week - (w.trueKnownWeek ?? week));
    const half = Math.min(READ_BLUR_CAP, READ_FRESH_HALF + age * READ_BLUR_RATE);
    // What you learned when you sat down with them, not where they are now: after the
    // sit-down they keep moving and the read does not follow them.
    const learned = w.trueReadValue ?? commitment;
    return {
      lo: clamp(learned - half), hi: clamp(learned + half), mid: learned,
      exact: half <= READ_NUMBER_MAX, kind: age <= 1 ? "fresh" : "fading", age,
    };
  }
  // Mapping tells you who listens to whom. It tells you nothing about where somebody
  // stands, so only an actual conversation narrows this.
  // A friend's account of them counts as words: a ceiling, the same as their own.
  const heard = w.spokenTo || w.heardAbout;
  const drop = heard ? READ_WARM_DROP : READ_COLD_DROP;
  return {
    lo: clamp(w.support - drop), hi: clamp(w.support), mid: clamp(w.support - drop / 2),
    exact: false, kind: heard ? "warm" : "cold",
  };
}
// ---------- THE RATING ----------
// What the player sees of any of this is a digit from 1 to 5, the way a charting sheet
// carries one. The hidden number stays hidden; the digit is a band of it, and the band
// edges are the same tiers the ballot and the card ask already turn on.
//
//   5  would sign today, could organize        4  votes yes, signs for the right asker
//   3  undecided                               2  leans no          1  no
//
// The digit comes in three states, which is the whole stated-vs-true lesson in one mark:
//   blank   nobody has talked to them
//   hollow  their words, which are a ceiling: they are this or lower, never higher
//   solid   somebody sat down with them and knows, until that read fades again
const RATING_BANDS = [78, 55, 30, 15];
function rating(v) {
  return v >= RATING_BANDS[0] ? 5 : v >= RATING_BANDS[1] ? 4 : v >= RATING_BANDS[2] ? 3 : v >= RATING_BANDS[3] ? 2 : 1;
}
const RATING_HEX = { 5: "#2dd4bf", 4: "#a3e635", 3: "#fbbf24", 2: "#fb923c", 1: "#f87171" };
const RATING_WORD = { 5: "ready", 4: "with you", 3: "undecided", 2: "leaning no", 1: "no" };
function ratingGlyph(w, week = 1) {
  if (w.burned) return { digit: null, state: "out", hex: "#57534e" };
  const r = readOf(w, week);
  if (r.kind === "cold") return { digit: null, state: "blank", hex: "#57534e" };
  if (r.exact) { const d = rating(r.mid); return { digit: d, state: "solid", hex: RATING_HEX[d], signed: !!w.signed }; }
  // Warm: the top of the band is what they say. Fading: the number you learned then.
  const d = rating(r.kind === "fading" ? r.mid : r.hi);
  return { digit: d, state: "hollow", hex: RATING_HEX[d], age: r.age };
}
// A change in the hidden number, as marks rather than a figure: one per four points.
function deltaMarks(delta) {
  const n = Math.max(1, Math.min(3, Math.round(Math.abs(delta) / 4)));
  return (delta > 0 ? "\u25B2" : "\u25BC").repeat(n);
}

// How much of the floor you can actually see. The one number worth putting on the HUD.
function floorClarity(workers, week) {
  const live = workers.filter(x => !x.burned);
  if (!live.length) return 0;
  const width = live.reduce((n, x) => { const r = readOf(x, week); return n + (r.hi - r.lo); }, 0) / live.length;
  return Math.round(100 * (1 - width / READ_COLD_DROP));
}

const BALLOT_PIVOT = 20;
const BALLOT_SPAN = 35;
// Fear. What a captive-audience meeting or a one-on-one leaves behind that is not a change
// of mind: a worry about what happens to people who vote yes. Marks run 0-3 and are hidden;
// each one takes this much off the yes chance and off the chance they vote at all. A
// debrief from a friend, or turning out with coworkers, takes them away again.
const FEAR_MAX = 3;
// One object so the sim can sweep it.
const FEAR = { yes: 0.08, turnout: 0.03 };
const fearOf = (w) => Math.max(0, Math.min(FEAR_MAX, w.fear || 0));

// Turnout: people with strong feelings in either direction show up. Fence-sitters are the
// ones who stay at their desks, and a fence-sitter who doesn't vote is a vote you lost.
function turnoutChance(w) {
  const conviction = Math.abs(ballotStanding(w) - 50) / 50;
  return Math.min(0.96, 0.62 + 0.28 * conviction + (w.signed ? 0.06 : 0) - FEAR.turnout * fearOf(w));
}
// Even someone who signed can vote no in the booth, and at the top end there is always a
// little slippage that no amount of organizing removes.
function yesChance(w) {
  const base = (ballotStanding(w) - BALLOT_PIVOT) / BALLOT_SPAN;
  return Math.min(0.93, Math.max(0.02, base + (w.signed ? 0.05 : 0) - FEAR.yes * fearOf(w)));
}
// The projection is a read, not an oracle. It can only use the true number for people the
// campaign has actually sat down with; everywhere else it has to go on what they have been
// saying. So it is wrong in exactly the places the player hasn't done the work — and it is
// wrong in the flattering direction, which is the whole lesson.
function voteProjection(workers) {
  let yes = 0, no = 0, out = 0;
  workers.forEach(w => {
    // Fear is part of what a sit-down tells you, and invisible otherwise.
    const believed = { ...w, trueSupport: w.trueKnown ? ballotStanding(w) : w.support, fear: w.trueKnown ? w.fear : 0 };
    const t = turnoutChance(believed);
    const y = yesChance(believed);
    yes += t * y;
    no += t * (1 - y);
    out += 1 - t;
  });
  return { yes: Math.round(yes), no: Math.round(no), out: Math.round(out) };
}
// The same projection with its uncertainty left in, the way the contract act's turnout
// band already does it. Every worker is a read rather than a number, so the yes count is a
// range as wide as the reads behind it — and the width IS the warning. Somebody looking at
// "9-15 yes" does not need to be told in prose that the booth is secret and the number is
// soft. Somebody looking at "12 yes" does, and will not believe it anyway.
function voteProjectionBand(workers, week = 1) {
  let lo = 0, hi = 0, exact = true;
  workers.forEach(w => {
    const r = readOf(w, week);
    if (!r.exact) exact = false;
    const at = (v) => {
      const believed = { ...w, support: v, trueSupport: v, trueKnown: true, fear: r.exact ? w.fear : 0 };
      return turnoutChance(believed) * yesChance(believed);
    };
    lo += at(r.lo); hi += at(r.hi);
  });
  return { lo: Math.round(lo), hi: Math.round(hi), exact };
}
// Employers voluntarily recognize when the count is so lopsided that fighting it looks
// worse than losing. A union-avoidance consultant on the payroll is there to argue the
// opposite, so having hired one makes it much less likely.
function recognitionChance(cardShare, consultantActive, heat) {
  if (cardShare < VOLUNTARY_RECOGNITION_FLOOR) return 0;
  let c = Math.min(0.55, (cardShare - VOLUNTARY_RECOGNITION_FLOOR) * 1.4);
  if (consultantActive) c *= 0.55;
  if (heat > 60) c *= 0.7;
  return c;
}

export { RATING_BANDS, rating, RATING_HEX, RATING_WORD, ratingGlyph, deltaMarks, ELECTION_WEEKS, VOLUNTARY_RECOGNITION_FLOOR, ballotStanding, READ_COLD_DROP, READ_WARM_DROP, READ_FRESH_HALF, READ_BLUR_RATE, READ_BLUR_CAP, READ_NUMBER_MAX, readOf, floorClarity, BALLOT_PIVOT, BALLOT_SPAN, FEAR_MAX, FEAR, fearOf, turnoutChance, yesChance, voteProjection, voteProjectionBand, recognitionChance };
