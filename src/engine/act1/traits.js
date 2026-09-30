// Influence traits: visible from week one.
import { orgMult } from "./committee.js";

// ---------- INFLUENCE TRAITS ----------
// Tier one. Unlike affinities these are VISIBLE from week one — you can tell who the
// floor already follows without being told. McAlevey's organic leader is the whole
// point: the person others actually take cues from, who almost never holds a title.
// These change how a worker moves people and how easily they get moved. They are not
// about connection — that is what affinities are for.
const INFLUENCE_TRAITS = [
  { id: "leader",   label: "ORGANIC LEADER", hex: "#fbbf24", send: 1.35, recv: 1.0,  signShift: 0,   burnMult: 1.0, passive: 1.0,
    blurb: "The floor already follows them. Everything they say to anyone lands 35% harder. Worth three hours to recruit." },
  { id: "wellliked",label: "WELL-LIKED",     hex: "#a3e635", send: 1.0,  recv: 1.1,  signShift: 0,   burnMult: 0.8, passive: 2.0,
    blurb: "No agenda, everybody's friend. Once they sign, they move people passively at double rate without spending an hour." },
  { id: "connector",label: "CONNECTOR",      hex: "#38bdf8", send: 1.15, recv: 1.0,  signShift: 0,   burnMult: 1.0, passive: 1.4, crossTeam: 1.6,
    blurb: "Knows people outside their own team. Their reach across department lines is worth 60% more — which is where campaigns are won." },
  { id: "stubborn", label: "STUBBORN",       hex: "#fb7185", send: 1.0,  recv: 0.6,  signShift: 0,   burnMult: 0.9, passive: 1.0, holdsFast: true,
    blurb: "Takes far more work to move. But nothing management does moves them back — once they're with you, they stay." },
  { id: "cautious", label: "CAUTIOUS",       hex: "#a8a29e", send: 0.95, recv: 1.0,  signShift: 12,  burnMult: 0.35, passive: 1.0,
    blurb: "Wants to see it work before committing. Needs 12 more points before they'll sign, and rarely draws management's eye." },
  { id: "hothead",  label: "HOTHEAD",        hex: "#f97316", send: 1.1,  recv: 1.15, signShift: -8,  burnMult: 1.9, passive: 1.0, publicGain: 1.4, publicHeat: 1.6,
    blurb: "Goes first and goes loud. Public actions hit 40% harder and draw 60% more heat — and they are the likeliest person to get walked out." },
  { id: "quiet",    label: "KEEPS THEIR HEAD DOWN", hex: "#78716c", send: 0.7, recv: 0.9, signShift: 6, burnMult: 0.1, passive: 0.6,
    blurb: "Nobody takes cues from them and nobody watches them either. Safe, slow, and easy to write off — which is a mistake at the count." },
];
const INF_BY_ID = Object.fromEntries(INFLUENCE_TRAITS.map(t => [t.id, t]));
const infTrait = (w) => INF_BY_ID[w?.influenceTrait] || INF_BY_ID.quiet;
const senderMult = (a) => infTrait(a).send * orgMult(a);
const recvMult = (b) => infTrait(b).recv;

export { INFLUENCE_TRAITS, INF_BY_ID, infTrait, senderMult, recvMult };
