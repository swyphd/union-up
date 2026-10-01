// What a conversation and a card ask are worth, and what every action costs.
import { clamp, rand, random } from "../rng.js";
import { infOn } from "./influence.js";
import { infTrait, recvMult, senderMult } from "./traits.js";
import { affList, knownAff, sharedAffinities, visibleShared } from "./affinities.js";
import { isKnownFriend, vouchFor } from "./friends.js";

// ---------- FULFILLMENT AS COMPLACENCY ----------
// Fulfillment no longer decides who persuades whom. It decides how much a person
// feels they'd be risking. Someone who loves this job hesitates longer over the card —
// and that is exactly the lever the company buys with offsites and new hardware.
function complacencyMult(target) {
  return clamp(1 - 0.006 * (target.fulfillment - 45), 0.55, 1.25);
}

// You know the reach of your own people — they can tell you who'd take their call.
// What you can't see is the rest of the floor's web: who moves the people you haven't
// worked yet. That is what a conversation buys, and it is what tells you who is worth recruiting.
const ASSUMED_INFLUENCE = 35;
function influenceKnown(actor, target) {
  return !!(actor?.revealed || target?.revealed);
}
function shownInfluence(influence, actor, target) {
  return influenceKnown(actor, target) ? infOn(influence, actor.id, target.id) : ASSUMED_INFLUENCE;
}

const CONVO_BASE = { quick: 5, deep: 12 };
// A quick chat moves what someone SAYS more than what they'd do — it's a pleasant
// exchange, not an ask. A deep conversation is the only action that reliably moves the
// number underneath, and only when the two of them actually have something in common.
const TRUE_RATIO = { quick: 0.35, deep: 0.9 };
function convoGain(actor, target, tie) {
  const scale = (0.45 + 0.85 * (tie / 100)) * senderMult(actor) * recvMult(target);
  const quick = Math.max(1, Math.round(CONVO_BASE.quick * scale));
  const deep = Math.max(2, Math.round(CONVO_BASE.deep * scale));
  return {
    quick, deep,
    quickTrue: Math.max(0, Math.round(quick * TRUE_RATIO.quick)),
    deepTrue: Math.max(1, Math.round(deep * TRUE_RATIO.deep)),
  };
}

// THE ANSWER TO "why not deep-talk everyone." It isn't the hour cost — it's that a
// structured organizing conversation run on someone you haven't scouted lands as a
// pitch. They get guarded, and a guarded worker is harder to move for weeks.
// It lands as a pitch only when there is no path in: not their friend, nobody signed
// between you who can vouch, and nothing found in common.
function pathTo(actor, target, workers = null) {
  if (isKnownFriend(actor, target.id)) return { kind: "friend" };
  const via = vouchFor(actor, target, workers);
  if (via) return { kind: "vouch", via };
  if (visibleShared(actor, target).length > 0) return { kind: "ground" };
  return null;
}
function misfireChance(actor, target, workers = null) {
  if (pathTo(actor, target, workers)) return 0;
  const blindness = affList(target).filter(t => !knownAff(target).includes(t)).length;
  return Math.min(0.55, 0.16 + 0.09 * blindness);
}
// How many affinities a conversation surfaces. Rapport opens people up, so a sender who
// already shares ground with them learns more.
function revealCount(kind, actor, target) {
  const rapport = sharedAffinities(actor, target).length > 0 ? 1 : 0;
  return kind === "deep" ? 3 + rand(2) : 1 + rand(2) + rapport;
}
function revealAffinities(target, n) {
  const hidden = affList(target).filter(t => !knownAff(target).includes(t));
  const picked = hidden.sort(() => random() - 0.5).slice(0, n);
  target.knownAffinities = [...knownAff(target), ...picked];
  return picked;
}

// Support is not action. Readiness gates everything, but who's asking still matters.
function signChance(actor, target, tie) {
  if (target.signed) return 0;
  // Deliberately concave: a worker at 70 support is nowhere near twice as likely to sign
  // as one at 55. Saying you're for it and putting your name on paper are different acts.
  // Rolls against TRUE support, not the number the player has been watching. The gap
  // between the two is the whole lesson: a floor that says yes can still not sign.
  const real = target.trueSupport ?? target.support;
  // CAUTIOUS needs to see it working first; HOTHEAD signs before they have thought it through.
  const bar = 45 + (infTrait(target).signShift || 0);
  const readiness = Math.pow(Math.max(0, Math.min(1, (real - bar) / 50)), 1.3);
  const trustPart = 0.55 + 0.45 * (tie / 100);
  const recent = target.askedRecently > 0 ? 0.6 : 1;
  const guard = target.guarded > 0 ? 0.65 : 1;
  return Math.min(0.93, readiness * trustPart * recent * guard * complacencyMult(target) * senderMult(actor));
}

const ACT1_ACTION = {
  quick: { label: "Quick chat", hours: 1, short: "chat" },
  deep: { label: "Deep conversation", hours: 2, short: "deep talk" },
  ask: { label: "Ask them to sign a card", hours: 2, short: "card ask" },
  recruit: { label: "Bring onto the committee", hours: 3, short: "recruit" },
  checkin: { label: "Check in with them", hours: 1, short: "check-in" },
  drop: { label: "Take them off the committee", hours: 1, short: "step back" },
  // Phase 2 (campaign.js). Inoculate aims at a department or a crowd, not a person; a
  // coordinated action is one hour from every participant, with no target at all.
  inoculate: { label: "Get there first", hours: 1, short: "gets ahead" },
  debrief: { label: "Debrief", hours: 1, short: "debrief" },
  standwith: { label: "Stand with them", hours: 1, short: "stand with" },
  turnout: { label: "Turn people out", hours: 1, short: "turns out" },
};
// A tie below this is too weak to draw, and too weak for a public action to carry along.
const EDGE_MIN_DRAW = 20;

export { pathTo, complacencyMult, ASSUMED_INFLUENCE, influenceKnown, shownInfluence, CONVO_BASE, TRUE_RATIO, convoGain, misfireChance, revealCount, revealAffinities, signChance, ACT1_ACTION, EDGE_MIN_DRAW };
