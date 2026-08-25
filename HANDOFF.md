# Union Up — Handoff: P0–P3 + Demand Platform

**Base commit:** `340aecd`
**Scope:** ~1,660 insertions in `src/App.jsx`. Single-file React app.
**Status:** Compiles clean (esbuild). 131 logic tests pass. **Never run in a browser.**

This document exists so a fresh session can pick up the work without re-deriving the
design. Read it before changing any of the systems below — several of the constants
are load-bearing and the reasons aren't obvious from the code.

---

## Verify before trusting

None of the 131 tests render a component. They cover pure functions only. These need a
human in a browser:

1. **Platform screen at first filing (Act 2).** Filing a petition used to be one click;
   it now opens a mandatory 3-of-8 demand selection. Highest risk of feeling like a wall.
   If it does: ship a default platform with a "revise" button.
2. **Card staleness pacing (Act 1).** `CARD_LIFESPAN = 14` was balanced against an
   assumed first signature around week 6. If the real first card lands week 9+, the
   window is looser than intended — tighten toward 12.
3. **Actor-first selection (Act 1).** Click a committee member on the shelf, then click
   a target on the floor. Never exercised by a human.
4. **Committee neglect curve.** Members lose an hour per idle week past 2 and walk at 5.
   May be too punishing in a long campaign.

---

## The design spine

Four ideas everything else hangs off. Don't break these without deciding to.

### 1. Stated support vs. true support
`support` is what a worker SAYS. `trueSupport` is what they'd DO. Card asks and votes
roll against the hidden one. Cheap actions widen the gap:

| Action | true support gained |
|---|---|
| Public action | 15% of stated |
| Quick chat | 35% |
| Deep conversation | 90% |

Six weeks of public actions opens a ~37-point phantom gap. This is the core lesson;
protect it.

### 2. Two tiers of traits
- **Influence traits** (visible from week 1): ORGANIC LEADER, WELL-LIKED, CONNECTOR,
  STUBBORN, CAUTIOUS, HOTHEAD, KEEPS THEIR HEAD DOWN. Change how a worker moves others
  and resists being moved. Authored per worker in `INFLUENCE_ASSIGN`, matched to hooks.
- **Affinity traits** (hidden, 3–5 each): loves dogs, long commute, etc. Decide WHO can
  reach WHOM. Revealed by conversation.

**Why deep conversation isn't always correct:** a cold deep talk (no *visible* shared
affinity) has a 16–55% chance to misfire — worker goes `guarded` for 3 weeks, all asks
35% harder. Cost alone never solved this; risk does. See `misfireChance()`.

### 3. Org chart vs. social network
The McAlevey argument, as mechanics:
- **Org-chart moves** (department meetings, reporting-line 1:1s) are absorbed in
  proportion to trusted signed coworkers. See `orgChartResistance()`. Covered workers
  take under a third the damage.
- **The exception is the department buy-off**, which works — because it operates on
  material interest, not persuasion. A department really can be bought.
- Kirkman is **org-chart-blind below 55 heat** (`KIRKMAN_SIGHT`). Above it he sees who's
  isolated. Your own visibility teaches him the map.

### 4. Permadeath consistency
Nothing resets clean. Lapsed cards cost true support and make the re-ask harder.
Committee members who walk lose 40% of experience. Defected blocs campaign against you
rather than going neutral.

---

## Systems added, in build order

**P0 — Legibility.** Pips replace all hour/action text. Commitment ladder
(UNTOUCHED › CONTACTED › SUPPORTER › SIGNED › COMMITTEE) as 4 pips on every card.
Meters carry threshold ticks. Act 2 objective banner. Unwinnable detection in both acts
with the specific reason named.

**P1 — Traits + true support.** See spine above. Fulfillment converted from an affinity
mechanic into complacency (`complacencyMult`): the better the job feels, the more there
is to lose, and the harder the card ask. It's the lever the company buys.

**P2 — Committee as actors.** Members gain XP from work (7/action, 12/card), promote at
40 and 75. LEAD ORGANIZER = +30% and a 4th hour. Idle 2 weeks grace, then −1 hour/week,
gone at 5. New `checkin` action (1hr, organizer→organizer) resets idle, +10 XP, clears
`shaken`. Actor-first selection added alongside target-first.

**P3 — Antagonist depth.** Four-rung outsider ladder: KIRKMAN → DANIELS (studio head,
+6 stated / −2 true on everyone — likeable is the weapon) → VANTAGE PARTNERS (ownership,
raises what-you'd-be-risking per department) → THE PODCAST (hits everyone, backfires on
STUBBORN and HOTHEAD). Rungs never un-arrive. All set-piece logs now state their numbers.

**Cap.** `CARD_LIFESPAN = 14` (real NLRB practice — old cards get challenged as stale
evidence). `ACT1_SHIP_WEEK = 26` — the game ships, contractors roll off. Visible from
week 1; a cap you discover is a cheap shot. `ACT1_CRUNCH_ENABLED = false` — crunch
mechanic is written but flagged off until the other two are playtested.

**Act 2 demand platform.** 3 slots from 8 demands. Four cross-cutting blocs (SALARIED /
CONTRACT × VETERANS / NEW HIRES) with per-location composition in `LOC_COMPOSITION`.
Two genuine opposition pairs: flat vs. percentage raise, conversion vs. seniority.
**Brute-forced: none of the 56 possible platforms satisfies all four blocs.** Hidden
priority + intensity (1–3), exposed by open bargaining (2 actions). Blocs below 35
satisfaction defect. Kirkman side-offers your most neglected bloc; committee
representation cuts defection odds by 35 points. Turnout weighted 0.55–1.3 — a tilt,
not a decider.

---

## Known open questions

- **Act 2 has no worker-level detail.** Blocs are aggregate. If Act 2 ever gets named
  workers, the bloc layer needs rethinking.
- **`_legacyFulfillment` in `STAT_INFO`** is dead text left for reference. Safe to delete.
- **Act 1 has no crunch phase.** Constant defined, flag off. Turning it on may make the
  1-star band unwinnable — playtest with it off first.
- **Physical board game** is a separate parallel project. Not in this repo.

---

## Working notes for this repo

- `App.jsx` is ~5,000 lines. Use `grep -n "^const\|^function\|// ---"` for a structural
  map before editing.
- Compile check without a full install:
  `npx esbuild src/App.jsx --loader:.jsx=jsx --bundle --external:react --external:lucide-react --external:recharts --outfile=/tmp/o.js`
- The logic tests were built by extracting pure-function blocks from `App.jsx` into a
  node harness. They aren't committed. Worth formalizing into a real test file.
- Deploy: Vercel, auto-builds every pushed branch to its own preview URL.
