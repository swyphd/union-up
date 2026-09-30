// Act One's opening beats and the two pictures that go with them.
import React from "react";
import { ACT1_SHIP_WEEK, CARD_LIFESPAN, FULFILL_HEX, TEAM_HEX } from "../../engine/act1/constants.js";

// ---------- THE OPENING ----------
// One beat per click, never more than two lines. Everything that the game teaches in
// context later — public actions, recruiting, how filing works — is deliberately
// not here. The intro carries the situation and exactly one rule: you direct your people.
const ACT1_INTRO_BEATS = [
  {
    kicker: "Our Studio",
    title: "We spent years building our name",
    lines: ["It used to feel like something worth building. Now it belongs to a private equity firm."],
  },
  {
    kicker: "Six months ago",
    title: "They rolled out Play-Eye",
    lines: [
      "An AI that makes design calls for the game we've spent four years on. It overrides our designers and contradicts our playtesters.",
      "Play-Eye insists micro-transactions instill pride and a sense of accomplishment.",
    ],
    tone: "red",
  },
  {
    kicker: "We've tried everything",
    title: "There's nobody to appeal to",
    lines: ["The hedge fund doesn't listen, the AI doesn't care. We can't fix a system that isn't listening just by asking nicer. We have to unionize."],
    tone: "red",
  },
  {
    kicker: "Where we're at",
    lines: [
      "Wendell was here before the acquisition. I'm Camille, and I was in a union at my last studio.",
      "We are ready to take back control, but we need your help.",
    ],
    visual: "committee",
  },
  {
    kicker: "Your role",
    lines: [
      "You're a seasoned worker advocate. You know you can't parachute in and fix our problems.",
      "But you can help us build the structure needed to reclaim control of our studio.",
    ],
  },
  {
    kicker: "Gameplay",
    title: "Influence runs person to person",
    lines: [
      "The same conversation is more powerful when there's an existing relationship there.",
      "Guide Wendell and Camille to have the right conversations with the right people.",
    ],
    visual: "influence",
  },
  {
    kicker: "The goal",
    title: "30% support for unionizing forces an election",
    lines: ["No guarantee of a win, just opens the door for a majority vote on whether the studio should be controlled by Play-Eye or the workers who actually love the game."],
  },
  {
    kicker: "The Brief",
    title: `You have until the game ships in week ${ACT1_SHIP_WEEK}`,
    lines: [
      "After launch the contractors roll off, the cuts land, and this shop stops existing in this shape.",
      `Cards go stale after ${CARD_LIFESPAN} weeks too \u2014 a signature is evidence of what somebody thought the day they signed it, not a permanent fact.`,
      "Move fast, or watch your early wins rot off the count.",
    ],
  },
];

// The two beats that get a picture instead of another sentence: the people you actually
// have, drawn as the cards they'll be on the board, and the influence idea in one arrow.
function IntroCommitteeVisual() {
  const people = [
    { name: "CAMILLE", team: "qa", support: 88, fulfillment: 50 },
    { name: "WENDELL", team: "production", support: 85, fulfillment: 30 },
  ];
  return (
    <div className="flex gap-4 flex-wrap">
      {people.map(p => (
        <div key={p.name} className="relative border-2 border-amber-500 bg-stone-950 w-44 px-3 py-2 text-left">
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: TEAM_HEX[p.team] }} />
          <div className="flex items-baseline justify-between pl-1.5">
            <span className="font-stencil text-base tracking-wide text-stone-100">{p.name}</span>
            <span className="font-mono text-xl font-bold text-teal-400">{p.support}</span>
          </div>
          <div className="h-1.5 bg-stone-800 mt-1.5 ml-1.5">
            <div className="h-full" style={{ width: `${p.fulfillment}%`, backgroundColor: FULFILL_HEX }} />
          </div>
          <div className="text-[11px] text-amber-500 font-mono mt-1.5 ml-1.5 tracking-wide">ON COMMITTEE</div>
        </div>
      ))}
    </div>
  );
}

function IntroInfluenceVisual() {
  return (
    <svg viewBox="0 0 220 46" className="w-full max-w-md block">
      <defs>
        <marker id="intro-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="#fbbf24" />
        </marker>
      </defs>
      <rect x="4" y="14" width="62" height="26" rx="2" fill="#1c1917" stroke="#f59e0b" strokeWidth="1" />
      <text x="35" y="31" textAnchor="middle" fontSize="9" fill="#e7e5e4" fontFamily="Impact, 'Arial Black', sans-serif">CAMILLE</text>
      <line x1="70" y1="27" x2="140" y2="27" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#intro-arrow)" />
      <text x="106" y="20" textAnchor="middle" fontSize="8" fill="#fbbf24" fontFamily="'Courier New', monospace">influence 71</text>
      <rect x="148" y="14" width="62" height="26" rx="2" fill="#1c1917" stroke="#44403c" strokeWidth="1" />
      <text x="179" y="31" textAnchor="middle" fontSize="9" fill="#a8a29e" fontFamily="Impact, 'Arial Black', sans-serif">NALEDI</text>
    </svg>
  );
}

export { ACT1_INTRO_BEATS, IntroCommitteeVisual, IntroInfluenceVisual };
