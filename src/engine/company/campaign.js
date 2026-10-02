// Solidarity, effort, whether the campaign is still alive, and the ballot.
import { ACT2_LAST_FILING_TURN, TOTAL_TURNS } from "./constants.js";
import { clamp, random } from "../rng.js";
import { act2Standing } from "./roster.js";


function computeSolidarityScore(locs) {
  return locs.reduce((sum, l) => {
    if (l.status === "won") return sum + 2;
    if (l.status === "lost" || l.status === "abandoned") return sum;
    let pts = 0;
    if (l.morale >= 70) pts += 1;
    if (l.committee?.active) pts += 1;
    return sum + pts;
  }, 0);
}

function baseGain(units) {
  if (units <= 0) return -2;
  if (units === 1) return 4;
  if (units === 2) return 7;
  if (units === 3) return 10;
  if (units === 4) return 13;
  if (units === 5) return 15;
  return 17;
}
function baseVis(units) {
  if (units <= 0) return -2;
  if (units === 1) return 2;
  if (units === 2) return 4;
  if (units === 3) return 6;
  if (units === 4) return 8;
  if (units === 5) return 10;
  return 13;
}
// ---------- CAN THIS STILL BE WON? ----------
// Permadeath means the game owes you the truth the moment it stops being winnable,
// and it owes you the specific reason. No quietly playing out a dead campaign.
const ACT2_SITES_NEEDED = 2;
// The four gates on a petition. Each one passes or it doesn't — the escalation prompt,
// the site panel, the banner and the filing itself all read this one list.
function filingGates(loc, turn) {
  const recruitedPct = loc.recruited / loc.workers;
  return [
    { id: "morale", label: "MORALE", val: loc.morale, pass: loc.morale >= 70, req: "\u2265 70" },
    { id: "recruited", label: "RECRUITED", val: `${Math.round(recruitedPct * 100)}%`, pass: recruitedPct >= 0.3, req: "\u2265 30%" },
    { id: "legal", label: "LEGAL RISK", val: loc.legalRisk, pass: loc.legalRisk < 75, req: "< 75" },
    { id: "clock", label: "MONTH", val: turn, pass: turn <= ACT2_LAST_FILING_TURN, req: `\u2264 ${ACT2_LAST_FILING_TURN}` },
    // The gate the campaign research is loudest about. A representative committee of
    // the workers themselves, before the petition, is the strongest single predictor of
    // winning the vote — and mechanically it is the only thing that lets anyone in this
    // shop count honestly, so filing without one is filing blind.
    { id: "committee", label: "COMMITTEE", val: loc.committee?.active ? "yes" : "no", pass: !!loc.committee?.active, req: "built" },
  ];
}
// `turn` is the next turn the player can act on: a site still organizing can only
// deliver if a petition filed that turn reaches its vote by the end of the calendar.
function act2Winnability(locations, turn) {
  const won = locations.filter(l => l.status === "won").length;
  const needed = ACT2_SITES_NEEDED - won;
  if (needed <= 0) return { alive: true, won, needed: 0, salvageable: [], reason: null };
  // A site can still deliver if it's already at the vote, or has room to file and vote.
  // A shop you pivoted away from is set aside for good.
  const salvageable = locations.filter(l => {
    if (l.status === "won" || l.status === "lost" || l.status === "abandoned") return false;
    if (l.status === "campaign") return l.electionTurn <= TOTAL_TURNS;
    return turn <= ACT2_LAST_FILING_TURN;
  });
  if (salvageable.length < needed) {
    const dead = locations.filter(l => l.status === "lost").length;
    // Name the actual cause: shops you lost, or a clock that ran out on the ones left.
    const blockedByClock = locations.filter(
      l => l.status !== "won" && l.status !== "lost" && l.status !== "abandoned" && !salvageable.includes(l)
    ).length;
    const setAside = locations.filter(l => l.status === "abandoned").length;
    return {
      alive: false, won, needed, salvageable,
      reason: blockedByClock > 0
        ? `${blockedByClock} shop${blockedByClock === 1 ? " is" : "s are"} still organizing, but none can file and reach a vote before month ${TOTAL_TURNS} — the last month to file was ${ACT2_LAST_FILING_TURN}. You needed ${needed} more.`
        : dead === 0 && setAside > 0
          ? `You set aside ${setAside} shop${setAside === 1 ? "" : "s"}, and there aren't enough left to reach ${ACT2_SITES_NEEDED}.`
          : `${dead} election${dead === 1 ? " has" : "s have"} already come back NO${setAside ? `, and ${setAside} shop${setAside === 1 ? " was" : "s were"} set aside` : ""}. There aren't enough shops left standing to reach ${ACT2_SITES_NEEDED}.`,
    };
  }
  return { alive: true, won, needed, salvageable, reason: null };
}

// ---------- THE BALLOT ----------
// A shop's election is decided the way Act One's is: one ballot per worker, each with
// their own odds, counted up. Not one random roll against an aggregate probability —
// that made a well-run campaign lose a quarter of the time for no reason the player
// could see, and it meant the margin said nothing about the work.
//
// The curve is NOT Act One's. There, `trueSupport` is what one named person would do
// with a card in front of them and it runs in the 40s. Here it is a whole shop's
// aggregate standing and it runs in the 70s and 80s, so this needs its own pivot and
// span. A shop sitting at PIVOT + SPAN/2 is the coin flip.
const ACT2_BALLOT_PIVOT = 12;
const ACT2_BALLOT_SPAN = 100;
// No shop is uniform. A shop at 70 is carrying people at 52 and people at 88, and the
// ones at both ends are the ones who reliably turn up. Spread is deterministic in
// shape — the site's own number decides the distribution, and only voting is random.
const ACT2_BALLOT_SPREAD = 18;
// Fear works on the ballot twice, and both of them land on YOUR half of the room.
// Nobody stays home out of fear of voting no, and nobody is frightened into voting for
// a union — so both terms are weighted by how much of a worker is on your side.
//
// It empties the room: a frightened yes stays at their desk. On its own this is a much
// weaker weapon than it looks, because thinning both piles in proportion changes the
// turnout and not the result — which is why the second term has to exist.
const ACT2_FEAR_TURNOUT = 0.45;
// And it moves the marginal vote. A worker who believes the company will find out and
// remember votes the safe way. This is the term that lets a fear campaign actually take
// a close shop off you, and it is worth about 20 points of win chance across the range
// the employer's counter-campaign can reach.
const ACT2_FEAR_YES = 0.18;

function act2Standings(trueSupport, n) {
  return Array.from({ length: n }, (_, i) =>
    clamp(Math.round(trueSupport + ACT2_BALLOT_SPREAD * (n === 1 ? 0 : (2 * i) / (n - 1) - 1))));
}
function act2YesChance(standing, recruited, fear = 0) {
  return Math.min(0.93, Math.max(0.02,
    (standing - ACT2_BALLOT_PIVOT) / ACT2_BALLOT_SPAN
    - ACT2_FEAR_YES * (fear / 100)
    + (recruited ? 0.08 : 0)));
}
// People with strong feelings in either direction vote. The torn stay at their desks,
// fear keeps more of them there, and the platform decides whose turnout it suppresses —
// which is what "the people you didn't write into the platform stayed home" means.
function act2TurnoutChance(yes, fear, factor, recruited) {
  const conviction = Math.abs(yes - 0.5) * 2;
  const base = 0.55 + 0.30 * conviction + (recruited ? 0.06 : 0);
  // Both the employer's fear campaign and your own platform act on your voters, not on
  // theirs. `yes` is how much of this person is on your side of the ballot.
  const mobilization = 1 - ACT2_FEAR_TURNOUT * (fear / 100) * yes + (factor - 1) * yes;
  return Math.min(0.96, Math.max(0.05, base * mobilization));
}
// The shop as a list of voters. The recruited are the most convinced end of the floor,
// which is what finally gives the recruitment number a job at the ballot box instead of
// only being a gate on the petition.
function act2Ballot(loc, factor = 1, ctx = null) {
  const n = loc.workers;
  const signedUp = Math.min(n, loc.recruited || 0);
  // The roster if the shop has one, and the old synthesised spread if it does not, so
  // nothing downstream has to care which.
  const people = loc.roster && loc.roster.length
    ? loc.roster.map(w => ({ w, standing: act2Standing(loc, w, ctx) }))
    : act2Standings(loc.trueSupport ?? loc.morale, n).map(standing => ({ w: null, standing }));
  // The recruited are the most convinced end of the floor, whoever they turn out to be.
  const order = [...people].sort((a, b) => a.standing - b.standing);
  const recruitedSet = new Set(order.slice(order.length - signedUp).map(x => x.w?.id ?? x.standing));
  return people.map(({ w, standing }) => {
    const recruited = recruitedSet.has(w?.id ?? standing);
    const yes = act2YesChance(standing, recruited, loc.fear);
    return { worker: w, standing, recruited, yes, turnout: act2TurnoutChance(yes, loc.fear, factor, recruited) };
  });
}
function act2Projection(loc, factor = 1, ctx = null) {
  let yes = 0, no = 0, out = 0;
  act2Ballot(loc, factor, ctx).forEach(v => {
    yes += v.turnout * v.yes; no += v.turnout * (1 - v.yes); out += 1 - v.turnout;
  });
  return { yes: Math.round(yes), no: Math.round(no), out: Math.round(out) };
}
// The exact odds, by walking the distribution of (yes - no) over the whole shop. It is
// a dozen workers, so this is cheap — and it means the percentage the player is quoted
// before filing is the percentage the ballot actually rolls, rather than a formula that
// approximates it.
function act2WinChance(loc, factor = 1, ctx = null) {
  let dist = new Map([[0, 1]]);
  act2Ballot(loc, factor, ctx).forEach(v => {
    const next = new Map();
    const add = (k, p) => { if (p > 0) next.set(k, (next.get(k) || 0) + p); };
    dist.forEach((p, k) => {
      add(k + 1, p * v.turnout * v.yes);
      add(k - 1, p * v.turnout * (1 - v.yes));
      add(k, p * (1 - v.turnout));
    });
    dist = next;
  });
  let win = 0;
  dist.forEach((p, k) => { if (k > 0) win += p; }); // a tie is not a majority
  return win;
}
// Cast it. Every worker decides whether to show up, then how to vote.
function act2CastBallot(loc, factor = 1, ctx = null) {
  let yes = 0, no = 0, out = 0;
  const stayed = [];
  act2Ballot(loc, factor, ctx).forEach(v => {
    if (random() >= v.turnout) { out += 1; if (v.worker) stayed.push(v.worker); return; }
    if (random() < v.yes) yes += 1; else no += 1;
  });
  return { yes, no, out, cast: yes + no, won: yes > no, stayed };
}

export { computeSolidarityScore, baseGain, baseVis, ACT2_SITES_NEEDED, filingGates, act2Winnability, ACT2_BALLOT_PIVOT, ACT2_BALLOT_SPAN, ACT2_BALLOT_SPREAD, ACT2_FEAR_TURNOUT, ACT2_FEAR_YES, act2Standings, act2YesChance, act2TurnoutChance, act2Ballot, act2Projection, act2WinChance, act2CastBallot };
