# Union Up — Plan: The Social Floor

**Status:** plan, decisions settled (§10). Nothing below is implemented.
**Base commit:** `87fce6a`
**Scope:** the nine requests in the September brief: 1–5 ratings, a representative committee,
two floor views, the falling-out event, three explicit phases, a redesigned card, mapping as
Phase 1's challenge, management pushback as Phase 2's, and a near-textless interface.

This is written against the code as it stands. Where a request collides with something the
current design leans on, the collision is named and a way through is recommended. Section 10
lists the decisions that are yours to make before work starts.

---

## 0. Where things stand, and what each request touches

The game is one 8,086-line React file plus a headless sim that regenerates its math by
slicing `App.jsx` on string markers (`sim/extract.mjs`). Three acts in order: the shop
(`ActOneGame`: a `drive` stage, then a `campaign` stage to the ballot), the first contract
(`ContractPrototype`), then the company campaign across four studios (`ActTwoGame`).

What exists today that the brief will change:

| Today | Brief |
|---|---|
| `support` 0–100 stated, `trueSupport` 0–100 hidden, a read-band drawn on the card, exact number only after a sit-down | a 1–5 rating on the card, no percentages anywhere |
| directed, weighted `influence[a][b]` map, 2–3 outgoing per person, random weights, hidden until a conversation | 0–3 undirected friends per person, shown as slots on the card |
| one board: the org chart, with influence lines removed and reach shown by dimming | two views: org chart (day one) and a social mind-map (grows as you map) |
| committee = anyone signed at true ≥ 85 you have sat down with; unbounded; every member is +3 hours, so bigger is strictly better; Kirkman arrives at 4 | small committee, one member per team and per social group, size itself a risk |
| Phase 2 is the `campaign` stage: four weeks of the same actions while Kirkman works the floor; public actions exist in both stages and the sim says they are never correct | Phase 2 is its own game: management moves and coordinated counter-actions |
| no relationship ever changes shape; the company poisons affinities, never friendships | a falling out re-draws the social map |
| card: name, exact number if known, ladder pips, 3–5 affinity icons, read bar, hour pie, XP bar | card: rating, job title, 0–3 friends, maybe affinities |
| both click orders (actor-first arming, target-first panel); actor-first never tested by a human | pick one |

Two things in the current design are worth protecting through all of this, because the sim
shows they are what make the game teach: **stated vs. true support** (the read that blurs)
and **the network is not the org chart** (density of trusted signers is the defence). Every
recommendation below keeps both; several make them more visible than they are now.

---

## 1. The five forks, with recommendations

These decide the shape of everything else. My recommendation is first in each case.

**F1. Keep a hidden continuous number under the 1–5.** The engine keeps `trueSupport`
0–100; the *player* only ever sees a 1–5 rating derived from it. Reasons: the ballot curves,
sign odds, passive drift and the whole sim stay valid; small conversational gains still
accumulate instead of every +1 being a cliff; and the stated/true spine survives as three
glyph states (§2.1) instead of dying. The alternative, a discrete 1–5 engine, is simpler to
read in code and would mean re-deriving every curve and every sim result from scratch. Not
worth it for a number the player never sees.

**F2. Friends replace the influence map; they do not sit beside it.** One relationship
structure, undirected, 0–3 per person. Direction and weight come from *traits* (an ORGANIC
LEADER lands harder on their friends, a CAUTIOUS person is moved less) and from surfaced
common ground, not from per-edge random weights nobody can see. This is what makes "0–3
friends on the card" honest: the card shows the whole relationship structure, not a shadow
of it. Cost: the contract act and the company campaign read `influence` today; they get a
thin adapter (§9.4) until they are revisited.

**F3. Social groups are authored circles, not detected clusters.** Each worker belongs to
one hidden circle (the loading-dock crew, the parents, the pre-acquisition old guard, the
Friday Discord raid, the lunch table). Friendships form mostly inside circles, with a few
authored bridges across them. The committee's representation goal is "one member in every
circle and every team." Reasons: it is legible and deterministic, it matches how the game
already authors traits per worker (`INFLUENCE_ASSIGN`), it gives the social view its bubbles,
and it gives affinities a job (F5). Community detection on a 20-node graph with degree ≤ 3
would produce different groupings each seed and merge whenever a bridge is discovered.

**F4. Target-first click is primary; drag is the shortcut; the armed mode goes.** §5 argues
it. Short version: modes are where players get lost, the panel already picks the best
organizer for you, and dragging a committee member onto a person (or onto a team box, or a
circle bubble) is the one gesture that needs no explanation.

**F5. Affinities become the thing a circle has in common.** Each circle is defined by one
affinity from the existing pool; its members share it; a friendship inside the circle is
*because of* it. The perk mechanic already written ("the company sponsors the thing they have
in common") then weakens a whole circle's internal ties for six weeks, which is exactly what
it was meant to do and never quite did. Affinities come off the card and live in the circle
bubble on the social view. You said you have not figured affinities out; this is the version
that costs the least and keeps the machinery. The alternative is to cut them entirely, which
is also fine and is a smaller change.

---

## 2. The model

### 2.1 Rating: three glyph states, one digit

`rating(v)` bands the hidden 0–100 into five, on the existing tier boundaries plus one split:

| rating | true support | means |
|---|---|---|
| 5 | ≥ 78 | would sign today; could organize |
| 4 | 55–77 | votes yes; will probably sign if asked by the right person |
| 3 | 30–54 | undecided |
| 2 | 15–29 | leans no |
| 1 | < 15 | no |

The player never sees the 0–100. What they see is the digit in one of three states, which
is `readOf()` rendered as a glyph instead of a bar:

| glyph | today's `readOf` kind | what it is |
|---|---|---|
| **blank** | `cold` | nobody has talked to them |
| **hollow digit** | `warm`, or `fading` past the number threshold | provisional: `rating(stated)`. Warm words are a ceiling, so the true rating is this or lower, never higher |
| **solid digit** | `fresh`, `signed` | confirmed: `rating(true)` as of the sit-down; goes hollow again after `READ_NUMBER_MAX` weeks |

That is the whole stated/true lesson in one mark: a hollow 4 might be a 3. Signing turns the
digit solid with a card corner. The rule of thumb the intro teaches: **ask a solid 5, maybe a
solid 4, never a hollow anything.**

*As built in M1:* the ask stays clickable on a hollow digit, with the panel warning in amber
rather than greying the button. Disabling it would remove the gamble the sim's `careless`
profile exists to measure, and the lesson is taught better by a "no" than by a locked button.
Signed shows as the teal border rather than a corner mark. Management's own set-piece log
lines still quote their arithmetic; they are rewritten with Phase 2 in M5.

Direction: 5 = strongest. Real charting uses the inverse (1 = leader, 5 = hard no). Five is
more intuitive on a card; a single constant flips it if you want the field convention.

**What "no percentages" removes.** The read bar on the card. The `~45% they sign` line on
the ask button (the glyph *is* the odds; the ask is greyed on a hollow digit). `YOU CAN SEE
62%` on the HUD (becomes a count of solid digits over live workers, drawn as a filled row).
`6 / 6 cards — 30%` (becomes `6 / 20` with a tick at the filing line). Misfire chance on the
sit-down (becomes a red mark on the button when there is no surfaced common ground; §6.1).
Kirkman's banner numbers (§7).

### 2.2 Friends

```
friends: { [id]: number[] }        // symmetric; 0–3 entries each
circle:  per worker, one of ~5 authored ids; 1–2 workers have none (isolates)
knownFriends: { [id]: number[] }   // what the player has mapped, also symmetric
```

`tieOn(a, b)` becomes:

```
base  = friends(a,b) ? 65 : sameCircle(a,b) ? 35 : sameTeam(a,b) ? 22 : 10
vouch = !friends(a,b) && a and b share a signed friend ? +18 : 0
tie   = (base + vouch) * senderMult(a) * recvMult(b) * (1 + 0.35 * surfacedCommonGround)
```

The `vouch` term is what pays for mapping: a committee member reaches their friend's friend
once the friend has signed. *(Deferred to M2 with the conversation payloads, which is
where the mapping it pays for is built. M1 ships `FRIEND_TIE` 65 and `CIRCLE_TIE` 35 only.)* Every downstream formula (`convoGain`, `signChance`, passive
drift, `signedBacking`, `orgChartResistance`, Kirkman's targeting) keeps its shape and reads
this tie. Generation constraints: 4–5 circles of 3–6 people; 3–4 bridge friendships; 1–2
isolates (the KEEPS THEIR HEAD DOWN people); cross-team share of friendships around 40%; the
two starting organizers in different circles and different teams.

### 2.3 Job titles

A `title` field on `ACT1_WORKERS_SEED` (Senior Engineer, QA Coordinator, Concept Artist,
Narrative Lead, Audio, contract). Titles are public from day one, like teams. They also let
Phase 2's org-chart moves get specific (a "leads only" meeting; the contractor renewal).

### 2.4 The ladder goes

`LADDER` (UNTOUCHED › CONTACTED › SUPPORTER › SIGNED › COMMITTEE) is fully implied once the
card carries a rating glyph and a border colour: blank = untouched, any digit = contacted,
4–5 = supporter, teal border = signed, amber = committee. Dropping the pips frees the card's
top-right corner and removes one legend from the board.

---

## 3. The card

Same fixed size in both views. Top to bottom:

```
┌──────────────────────────────┐
│▌NAME                      [4]│   rating glyph: blank / hollow / solid, coloured by value
│▌Senior Engineer              │   title, small, grey
│▌ ●  ●  ○                  ◔  │   friend slots (filled = mapped, ring = not yet); hour pie if committee
└──────────────────────────────┘
```

Border: amber committee, teal signed, grey otherwise; red tick when under pressure; the
existing `⧖` when a card is going stale. The team colour stays as the left stripe. The
committee XP bar stays as a hairline under the name on committee cards only.

**Friend slots show the count before you know the names.** Three slots means a hub; none
means an isolate. That is real information ("who do they eat lunch with?" is observable from
across the room) and it tells the player where mapping will pay. If you would rather hide the
count, the slots appear one at a time as edges are mapped, and an unmapped person shows a
single `?`. Either is a one-line change; I recommend showing the count.

Affinities: off the card (F5). If you decide to keep them personal instead, the slot row has
room for two 5-unit icons after the friend slots and nothing else.

---

## 4. Two views

A two-icon toggle in the board header (a grid glyph, a web glyph). Both views render the same
`WorkerCard` SVG group, extracted from `Act1FloorMap`, so a card looks identical wherever it
sits; only the layout changes.

**Org view** is the current board minus the read bar, ladder pips and affinity icons. Team
boxes remain drop targets in Phase 2.

**Social view** is a mind-map: circle bubbles, members inside, bridge friendships drawn
between bubbles, isolates in the margin, and a tray along the bottom for everyone not yet
placed. It starts on day one with the two organizers, their circles' bubbles (you know your
own people's worlds), and their mapped friends. Everyone else is in the tray.

Layout: `d3-force` (about 20 KB, the only new dependency) with a `forceX/forceY` per circle
pulling members toward a bubble centre, collision on card size, and link forces on mapped
friendships. Bubble centres themselves are laid out once by a tiny force pass over the
circle graph. Two rules keep it from feeling like soup:

1. **Positions are sticky.** Run the simulation to rest only when the *set* of placed nodes
   or edges changes, seed new nodes from their org-chart position, and animate to the new
   rest state over 600 ms. Weeks where nothing new was mapped do not move anything.
2. **Bubbles are drawn only when discovered** (§6.1). Before that a member sits at their
   friend's side with no bubble around them.

The falling-out animation (§7.4) is a link snapping and the two nodes drifting apart, which
the sticky rule handles because the edge set changed.

The HUD's representation row (§6.2) reads off the same data: one dot per discovered circle,
one per team, filled when a committee member is inside.

---

## 5. Interactions and the text budget

**Click order.** Click a person, get their panel. The panel's header is the actor chip row:
committee members ranked by tie to this person, each a small card (name, hour pie, a ring
coloured by tie strength), the best pre-selected. Below, one row of action icons with hour
pips. That is the entire decision, and it is the same panel from both entry points today.

Why not actor-first: it is a *mode*. The player has to know they are in it, know how to leave
it (Esc, today), and understand why clicking a committee member's own card does a different
thing depending on state. Its one real benefit, "light up who this organizer can reach," is
served better by **hover**: hovering a committee card highlights their friends and vouched
friends-of-friends in both views, no click needed.

**Drag** is the power shortcut and needs no mode: drag a committee card onto a person to open
the pair panel with that actor locked, onto a team box to inoculate that department (Phase
2), onto a circle bubble to brief that circle. A drop target lights while dragging. Touch
gets the same via long-press. This is the one new interaction pattern worth building because
it is the one that pays off in all three phases.

**The text budget.** What goes:

- the board's hover footer paragraph and the "Click a committee member..." instructions;
- the action buttons' two-line explanations (replaced by icon + hour pips + one glyph preview:
  a `▲` for the rating gain, a red `!` for a cold sit-down, a card corner for the ask);
- the ladder legend and the three border legends (border colour is learned once in the intro);
- Kirkman's standing banner (his moves become marks on the board: a red team box, a red tick
  on a card, a broken link);
- the always-open resolution log (collapses to one line per step; expands on click).

What stays as words, once: the intro beats (already one rule per beat), set-piece log lines
when a mark on the board cannot carry the meaning (a raise, a threat), the outcome screens,
and hover tooltips for anyone who wants the sentence.

---

## 6. Phase 1: map the floor, build the right committee

### 6.1 Conversations are how the map gets drawn

| action | hours | rating payload | map payload |
|---|---|---|---|
| quick chat | 1 | hollow digit (their words) | one of their friends, and whether they share the actor's circle |
| sit-down | 2 | solid digit, and +rating movement | all of their friends; their circle (draws the bubble if new); their read on each friend as a hollow digit |
| card ask | 2 | solid on a yes (a signature is an act) | — |
| check-in | 1 | — | refreshes a committee member's solid digit; reveals a leak (§6.2) |

The sit-down's "their read on each friend" is the mechanic that makes mapping feel like
organizing: one good conversation with a hub gives you three hollow digits and three edges.
It is also how a *wrong* map happens, because the hub's read of their friend is a ceiling
too.

The misfire rule stays but its trigger changes: a sit-down with someone you have no path to
(not a friend, not vouched, no surfaced common ground) lands as a pitch. The panel shows it
as a red mark on the sit-down icon, no number.

Public actions in Phase 1: **one**, late, optional: the open-letter sign-on, a structure test
you can run once the filing line is in sight. Everyone who signs it turns solid; everyone you
expected who does not turns hollow. It costs heat. Nothing else public before filing, which
is what the sim has been saying for a while.

### 6.2 The committee is small, representative, and a risk

Recruiting changes from a gate to a judgment:

- **Anyone with a digit can be recruited** (3 hours, by a committee member who is their
  friend or vouched). The gate `trueKnown && trueSupport ≥ 85` goes.
- **Recruit on a hollow digit and you may have recruited a leak.** If their true rating is
  under 4, they join as a leak with probability 0.5: Kirkman sees the network from that week
  (`seesNetwork` forced on), his one-on-ones start with the leak's friends, and Phase 2's
  telegraphed moves land one week earlier than shown. A check-in (1 hour, by a SEASONED or
  better organizer) reveals a leak; dropping them costs 1 hour and they fall to rating 2.
- **Size leaks on its own.** Each member above four adds +1 heat a week. Heat is what
  brings the outsider ladder and Kirkman's sight.
- **Coverage is the goal, shown as dots.** The HUD carries one dot per discovered circle and
  one per team; a dot fills when a committee member is inside. Coverage is not a hard gate on
  filing, because the legal gate is cards. It is what Phase 2 is scored against: an uncovered
  circle is where the captive-audience meeting lands at full strength and where no public
  action can turn anyone out (§7.2). The unwinnable detector names it: "nobody on the
  committee in the dock crew."

Committee members still earn XP, still idle out, still get shaken. Nothing about the
`ORG_TIERS` ladder changes.

### 6.3 Filing

Cards at 30% unlocks the filing prompt as today. The prompt shows the coverage row and the
solid/hollow count for the whole floor, and nothing else. Filing starts Phase 2.

---

## 7. Phase 2: the management campaign

Six weeks (`ELECTION_WEEKS` 4 → 6) so a move-and-counter rhythm has room. The sim decides the
final number.

### 7.1 The weekly loop

1. **Management's calendar** shows one telegraphed move for the coming week as a mark on the
   board: a red team box (captive-audience meeting for that department), a red circle bubble
   (a perk aimed at what that circle shares), a red card (a job threat). Hidden alongside it:
   Kirkman's one-on-ones, and whether this is a set-piece week.
2. **The player plans**, with the same panel and drag gestures. New Phase 2 actions:

   | action | hours | who | what it does |
   |---|---|---|---|
   | inoculate | 1 | committee member → team box or circle bubble | the meeting/perk lands at 0.4 strength on that member's friends and circle-mates |
   | debrief | 1 | committee member → a friend | after a meeting: hollow → solid again (a re-read) |
   | coordinated action | 1 per participant | the HUD's megaphone; toggle participants | a structure test (§7.3) |
   | stand with | 1 | committee member → a threatened card | prevents the burn on that card this week |
   | sit-down / card ask / check-in | as Phase 1 | | |

3. **Resolution.** The telegraphed move hits, blunted where inoculated and where signed
   friends stand around the target. One-on-ones hit the isolated. The action's turnout is
   counted. Set-pieces fire on their cadence. Heat moves.

### 7.2 Management's tools and their counters

| management move | what it does today | Phase 2 shape | counter |
|---|---|---|---|
| captive-audience meeting | −2..7 stated on one team, absorbed by signed backing | telegraphed; hits the *team*; each hit turns a solid digit hollow (the room becomes unreadable) | inoculate the team, then debrief the friends who matter |
| one-on-ones | 2 (4 in campaign) marks off stated/true | hidden; targets fewest-signed-friends, or the leak's friends | density: a signed friend per target; check-in to find the leak |
| perk | poisons one affinity for 6 weeks | telegraphed; aimed at a circle's shared affinity; that circle's internal ties drop to acquaintance strength | inoculate the circle; a coordinated action with that circle in it restores the ties early |
| raise / job threat | set-pieces, 2 each | unchanged, telegraphed one week out | stand with; a public action the same week turns a threat into heat for *them* |
| **rumor** (new) | — | forces a falling out on the bridge friendship closest to the committee (§7.4) | a debrief on either party within one week repairs it |
| **the mole** (new) | — | a leak on the committee (§6.2) | check-in |

Kirkman's sight rule stays: below `KIRKMAN_SIGHT` heat he aims by org chart at 0.55
strength; above it, or with a leak, he aims by the friend graph.

### 7.3 Coordinated actions are structure tests

A coordinated action replaces the three per-person public tiers. The HUD's megaphone opens a
picker: a tier (button day / open letter / walk-in on the studio head) and a participant
toggle for each committee member. Each participant spends 1 hour to turn out their friends and
their circle. The result is a **count**, and the count is a read:

- everyone who turned out becomes a solid 4 or 5 (they did something);
- everyone you counted on who did not turns hollow;
- reaching the tier's turnout bar moves true support across the floor and cuts the fear term
  in the ballot; missing it costs heat for nothing;
- an uncovered circle contributes nobody, which is the whole reason Phase 1 asked for
  coverage.

Escalation still beats repetition (`publicFatigue` stays). HOTHEAD still draws heat.

### 7.4 The falling out

A friendship ends. The edge is removed for both; each loses a slot on the card (drawn as a
cracked slot for two weeks, then gone). If the edge was a bridge, the two circles stop
touching and a committee member on one side no longer reaches the other; if it was inside a
circle, the person who lost the argument drifts to the margin or to whichever circle they
still have a friend in.

Trigger: a low base chance each week in Phase 1 (target about one per campaign), higher in
Phase 2, and forced by the rumor set-piece. Pair choice weights: a rating gap of two or more
across the friendship (a 5 and a 2 do not stay friends through a drive), a HOTHEAD on either
end, either party under pressure that week.

Visibility is the lesson: **you only see it if you had mapped the edge.** Otherwise the social
view is quietly wrong until the next conversation with either party ("they don't talk
anymore"). The social view animates a known snap. Both directions matter: the person who
walked away from an anti-union friend group becomes reachable (+1 rating drift toward their
remaining friends' average), so a falling out can open a door as well as close one.

---

## 8. Phase 3 and the company campaign

Phase 3 is `ContractPrototype`, which already runs on the carried floor. It needs: the friend
graph and circles instead of `influence` (`catBacking` counts signed friends; the action team
is the committee), the rating glyph on its cards, and nothing else in this pass. Its own
open items in `DESIGN-REVIEW.md` §4 stay open.

The company campaign (`ActTwoGame`) is not in your three phases. Recommend leaving it as an
epilogue reached from the contract outcome, running on the `influence` adapter (§9.4), and
deciding later whether it stays. Nothing in this plan touches it.

---

## 9. Engineering plan

### 9.1 Step 0: split the file, and make the sim import the engine

Before any design change. `App.jsx` becomes:

```
src/engine/act1/        rating.js, friends.js, circles.js, conversations.js,
                        committee.js, management.js, ballot.js, resolveWeek.js
src/engine/contract/    (moved as-is)
src/engine/company/     (moved as-is)
src/ui/                 WorkerCard.jsx, OrgView.jsx, SocialView.jsx, PersonPanel.jsx,
                        Hud.jsx, Phase1.jsx, Phase2.jsx, Contract.jsx, Company.jsx
src/App.jsx             routing between acts, saves
```

`resolveWeek` moves out of the component into the engine as a pure function of
`(state, plan) → { steps, pending, stats }`, which is what `sim/engine.mjs` used to re-implement
by hand. (As built: randomness is a module-level source in `rng.js` that `seedRng` swaps,
rather than a parameter threaded through every call; the acceptance test is the same.) The sim then imports `src/engine/act1/*` directly and `sim/extract.mjs` is deleted,
along with the drift risk the review flagged for the Act Two and contract ports.

Add a seedable RNG threaded through the engine. Proof the split changed nothing: run
`verify-ballot.mjs` with a fixed seed before and after and diff the output byte for byte.

The `// ----------` section markers that `extract.mjs` slices on are the map for this move;
each becomes a module.

### 9.2 Milestones

Each one is playable in the browser and measurable in the sim before the next starts.

| # | milestone | size | done when |
|---|---|---|---|
| M0 | engine split, seeded RNG, sim imports engine | M | **done**, branch `plan/social-floor`: seeded output identical at every step; the real `resolveWeek` runs in the sim |
| M1 | titles; friends + circles replace influence; rating glyph; new card; percentages gone; target-first + drag; armed mode removed | L | **done**: careful 60.6 / sloppy 42.6 / careless 14.5 at SEED=7, n=1500, with no retune needed (the gap widened; careful held). Three deferrals noted under §2.2 and §7 |
| M2 | social view + toggle; sticky layout; conversation map payloads; coverage dots | M | a `mapper` sim policy that recruits for coverage exists and beats the current `careful` |
| M3 | committee redesign: recruit as judgment, leaks, size heat, coverage in the filing prompt and the unwinnable detector | M | a policy that recruits everyone loses to one that recruits for coverage |
| M4 | falling out + rumor set-piece; cracked slots; social-view snap | S | about one per Phase 1 campaign; the map is measurably wrong for players who stop mapping |
| M5 | Phase 2 as its own screen: calendar, inoculate/debrief/stand-with, coordinated actions, six weeks, drive-phase public actions cut to the open letter | L | a policy that counters beats one that keeps having conversations; coverage predicts the ballot margin |
| M6 | contract act on friends; `influence` adapter for the company campaign; save v3 | S | carry sim (`carry.mjs`) runs end to end |

M1 is the risky one and should be sliced: friends + adapter first (everything else still
renders), then card + glyph, then interaction.

### 9.3 Balance work the sim has to do

- `policy.mjs` needs a **mapper** (sits down with hubs, recruits one per circle, asks solid
  5s) and a **recruit-everyone** baseline. M3 is done when the first beats the second.
- A Phase 2 policy pair: **counters** (inoculates the telegraphed team, debriefs, runs one
  action a fortnight) vs. **talker** (keeps having sit-downs). M5 is done when counters win
  and coverage from Phase 1 predicts the margin.
- Expect the friend graph to cut reach at first (2 friends versus 2–3 weighted ties plus
  cross-team randomness). `FRIEND_TIE`, the vouch bonus and the acquaintance tier are the
  knobs; re-tune until the careful player is back near 65% and the margin near three votes.

### 9.4 The `influence` adapter

Until the contract and company acts are revisited, derive `influence[a][b]` from the friend
graph: `friends ? 65 : sameCircle ? 35 : 0`, times `senderMult(a)`. Both acts keep running
unchanged on that. It is a stopgap and should say so in a comment.

### 9.5 Saves

`SAVE_VERSION` 2 → 3. A v2 save has no friends or circles; it can rejoin only at the company
campaign, the same rule v1 saves follow today.

### 9.6 Risks

- **Social view readability at phone width.** Twenty cards plus bubbles in a 160-unit
  viewBox is tight. Mitigation: the tray keeps unplaced cards out of the graph, and bubbles
  can collapse to a count until tapped.
- **Sticky layout fighting discovery.** A newly mapped bridge can want to drag two settled
  bubbles together. Mitigation: bubble centres are fixed after first placement; only members
  move.
- **Phase 2 is the largest new system in the game** and has no sim today. Mitigation: it is
  the last design milestone, and M0 makes its engine testable from day one.
- **Losing the read model's precision.** A digit is coarser than a band. Mitigation: the
  three glyph states carry the uncertainty, and the sim's projection-error metric tells us if
  players stop being able to tell a good read from a bad one.
- **The 8,000-line file.** M0 is mechanical but touches everything. Do it on a branch with
  the seeded-sim diff as the only acceptance test.

---

## 10. Decisions, settled

Answered 2026-09-30. Every recommendation above was taken, so the body of this document
stands as written and M0 can start.

| # | decision | answer | where it lands |
|---|---|---|---|
| 1 | rating direction | **5 = strongest** | §2.1; one constant if the field convention is ever wanted |
| 2 | friend count visible before mapping | **show the count** as empty rings | §3 |
| 3 | affinities | **become the circle's shared thing**; off the card, in the bubble | F5, §2.2, §7.2 (perk aims at a circle) |
| 4 | company campaign | **keep as an epilogue** on the `influence` adapter, untouched | §8, §9.4 |
| 5 | Phase 1 public actions | **only the open-letter structure test**, near the filing line | §6.1; the three drive-phase tiers go in M5 |
| 6 | Phase 2 length | **six weeks to start; the sim sets the final number** | §7, `ELECTION_WEEKS` 4 → 6 |
| 7 | leak odds (0.5 on a hollow recruit) and size heat (+1 per member above four) | **first guesses; the sim tunes them** | §6.2, §9.3: coverage-first must beat recruit-everyone, and leaks must bite without dominating |
