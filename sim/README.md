# Act One simulation harness

A headless Act One for balance work. The point of it is that it cannot drift from the
game: the drivers import `src/engine/act1` directly, the same modules the game runs, and
the week itself is the game's own `resolveWeek`. Change a number in the engine and every
report below moves with it. Nothing is generated or extracted.

`SEED=7 node sim/verify-ballot.mjs` makes any run replayable: same seed, same output, byte
for byte. That is how a refactor of the engine is checked.

```
node sim/verify-ballot.mjs   # win rate, margin and projection error by player skill (mapper with and without Phase 2 counters, careful, sloppy, careless)
node sim/phase2.mjs [n] [wk] # Phase 2: a player who counters management's calendar against one who keeps talking, and coverage at filing against the margin
node sim/phase2-sweep.mjs    # sweeps CAMPAIGN_TUNING, FEAR and the coordinated-action tiers (JSON on the command line)
node sim/fuzz.mjs [games]    # random and adversarial plans through the real week, invariants checked; prints "no problems" when clean
node sim/mapper-tune.mjs     # mapper variants (recruiting for coverage / everybody / 5s, patience) against careful
node sim/committee-sweep.mjs # leak and committee-size costs against recruiting strategies
node sim/fallouts.mjs        # falling outs and rumors per game, and how stale the map goes if you stop mapping
node sim/clarity.mjs         # how much of the floor a player can see, week by week
node sim/sweep.mjs           # ballot-curve sweep: pivot and span against margin
node sim/company-reach.mjs   # which company moves can still reach the ballot
```

The other two acts have harnesses of their own (see `DESIGN-REVIEW.md` for what they found):

```
node sim/act2-report.mjs 2000    # Act Two win rate and what decides it, by policy
node sim/act2-anatomy.mjs 1500   # what an Act Two election is made of at the roll
node sim/act2-platform.mjs       # all 56 platforms against the side-offer line
node sim/act2-survey.mjs         # the bargaining survey by timing, and what a signed contract carries
node sim/act2-ballot.mjs         # the ballot curve, and what support/fear/recruits/platform buy
node sim/act2-oneonone.mjs       # does asking who else to talk to beat picking the keenest person?
node sim/contract-report.mjs     # first-contract act: tiers, ratification, decert
node sim/carry.mjs               # plays real Act One wins (countering mapper, careful) into the contract act on their own friendships
```

`contract-engine.mjs` is the headless first-contract act and takes the same `carry` the shipped
game hands it — Act One's own workers and friendships — so `carry.mjs` measures the real
handoff rather than a reconstruction of it.

`act2-engine.mjs` and `contract-engine.mjs` import their numbers from `src/engine/company`
and `src/engine/contract`, but their turn loops are still hand ports of the two `resolveTurn`
functions, which live inside React components. Keep them in step until those are extracted
the way Act One's week was.

## Pieces

- `seed.mjs` — reads `SEED` and seeds the shared RNG. Every driver imports it first.
- `engine.mjs` — a game object and a running tally around the game's own `resolveWeek`.
- `policy.mjs` — the simulated player. Decides on what the UI actually shows: stated
  support, revealed affinities, true support only where `trueKnown` is set. Options:
  `askBar` (how convinced someone must look before you ask), `blindDeep` (deep-talk
  without scouting first), and for the mapper `recruit`, `askAt`, `stopMappingAt`. After
  filing, `phase2: 'counter'` answers the calendar (`planWeekPhase2`: inoculate with whoever
  covers the most of the department or crowd, stand with the threatened, debrief friends who
  sat through last week's move, a coordinated action every other week at the highest tier the
  visible count clears); `phase2: 'talker'` keeps having sit-downs. `electionWeeks` overrides
  the length of Phase 2.

The player profiles the drivers compare are `mapper` (`planWeekMapper`: reads only the
board, sits down only along a path in, favours hubs, recruits uncovered crowds first),
`careful` (scouts before sitting down with anyone), `sloppy` (deep-talks blind and eats the
misfires) and `careless` (sloppy, and asks for cards long before people are ready).
