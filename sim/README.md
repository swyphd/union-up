# Act One simulation harness

A headless Act One for balance work. The point of it is that it cannot drift from the
game: `extract.mjs` reads `src/App.jsx` and pulls the real formulas out verbatim into
`core.mjs`, so any change to the game's numbers flows straight through.

```
node sim/extract.mjs     # regenerate core.mjs — run this after touching App.jsx
node sim/ab.mjs 400 74   # rule-set comparison, n per cell and ask threshold
node sim/skill.mjs       # skill premium: careful vs sloppy play
node sim/drive.mjs       # cost of public actions during the card drive
```

`core.mjs` is generated and not checked in.

## Pieces

- `extract.mjs` — generates `core.mjs` from `src/App.jsx`. Splices in a `RULES` object
  with four hooks (`convoAff`, `publicAff`, `passiveAff`, `convoWeight`) so an experiment
  can swap one multiplier without editing the extracted math.
- `engine.mjs` — a week of Act One with the narration stripped and the arithmetic kept.
- `policy.mjs` — the simulated player. Decides on what the UI actually shows: stated
  support, revealed affinities, true support only where `trueKnown` is set. Options:
  `askBar` (how convinced someone must look before you ask), `blindDeep` (deep-talk
  without scouting first), `pubPhase` / `pubTier` / `noPublic`.
- `rules.mjs` — the rule sets under test.
