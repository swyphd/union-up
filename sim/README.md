# Act One simulation harness

A headless Act One for balance work. The point of it is that it cannot drift from the
game: `extract.mjs` reads `src/App.jsx` and pulls the real formulas out verbatim into
`core.mjs`, so any change to the game's numbers flows straight through.

```
node sim/extract.mjs         # regenerate core.mjs — run this after touching App.jsx
node sim/verify-ballot.mjs   # win rate, margin and projection error by player skill
node sim/clarity.mjs         # how much of the floor a player can see, week by week
node sim/sweep.mjs           # ballot-curve sweep: pivot and span against margin
node sim/drive.mjs           # cost of public actions during the card drive
node sim/company-reach.mjs   # which company moves can still reach the ballot
```

`core.mjs` is generated and not checked in.

## Pieces

- `extract.mjs` — generates `core.mjs` from `src/App.jsx`.
- `engine.mjs` — a week of Act One with the narration stripped and the arithmetic kept.
- `policy.mjs` — the simulated player. Decides on what the UI actually shows: stated
  support, revealed affinities, true support only where `trueKnown` is set. Options:
  `askBar` (how convinced someone must look before you ask), `blindDeep` (deep-talk
  without scouting first), `pubPhase` / `pubTier` / `noPublic`.

The three player profiles the drivers compare are `careful` (scouts before sitting down
with anyone), `sloppy` (deep-talks blind and eats the misfires) and `careless` (sloppy,
and asks for cards long before people are ready).
