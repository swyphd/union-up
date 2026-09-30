// The commitment ladder, for the shop and for the contract fight.

// ---------- THE COMMITMENT LADDER ----------
// The playtest note was right: someone who "supports" the union without doing anything
// isn't a member of anything. So say so. Each rung is a costlier act, and the pip count
// is the whole state of a person on the floor.
const LADDER = [
  { id: "committee", label: "COMMITTEE", pips: 4, hex: "#fbbf24", blurb: "Organizes other people. Their relationships are yours to direct." },
  { id: "signed", label: "SIGNED", pips: 3, hex: "#2dd4bf", blurb: "Put their name on a card. This is the only number the labor board counts." },
  { id: "supporter", label: "SUPPORTER", pips: 2, hex: "#a3e635", blurb: "Says they're for it. Has given the union nothing yet." },
  { id: "contacted", label: "CONTACTED", pips: 1, hex: "#a8a29e", blurb: "You've had a conversation. That's all." },
  { id: "cold", label: "UNTOUCHED", pips: 0, hex: "#57534e", blurb: "Nobody has talked to them." },
];
const LADDER_BY_ID = Object.fromEntries(LADDER.map(r => [r.id, r]));
function ladderOf(w) {
  if (w.organizer) return LADDER_BY_ID.committee;
  if (w.signed) return LADDER_BY_ID.signed;
  if (w.support >= 55) return LADDER_BY_ID.supporter;
  if ((w.history && w.history.length > 0) || w.revealed) return LADDER_BY_ID.contacted;
  return LADDER_BY_ID.cold;
}

export { LADDER, LADDER_BY_ID, ladderOf };
