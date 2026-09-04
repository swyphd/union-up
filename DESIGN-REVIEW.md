# Union Up — Level Design Review

**Scope:** all three levels as they stand at `fb4a620` — Act One (the card drive), Act Two
(four studios), and the First Contract prototype.
**Method:** read the whole of `src/App.jsx`, then measured each act headlessly. Act One uses the
existing `sim/` harness. Act Two and the contract slice had no harness, so this review adds one
for each (`sim/act2-*.mjs`, `sim/contract-report.mjs`). Act One's numbers are extracted verbatim
from `App.jsx`; the Act Two and contract turn loops are hand ports of the two `resolveTurn`
functions (they live inside React components and can't be extracted), with their pure functions
and constants extracted verbatim. Every number below is reproducible with the commands in the
appendix. Sample sizes are 1,500–3,000 games per row, so the win-rate columns are good to about
±2 points.

The organizing theory this game leans on is McAlevey's (*No Shortcuts*): organic leaders, the
social network versus the org chart, the one-on-one, the structure test, the supermajority, and
"whole worker" organizing. Where I judge a mechanic against theory below, that's the yardstick,
with Bronfenbrenner's campaign research (a representative rank-and-file committee, house calls,
and escalating actions are what predict wins) as the second source.

---

## 1. The whole game

### What is strong

- **The spine is right, and it is real in the numbers.** Stated vs. true support, the read that
  blurs, who-asks-matters, density as the defence against the consultant, and permadeath
  consistency all survive contact with the sim. The theoretically correct Act One player wins
  65%, the sloppy one 48%, the careless one 20%, and the median ballot is decided by three votes.
  That is exactly the shape a teaching game wants: skill separates outcomes, and the margin
  reflects the work.
- **The read model is the best idea in the game.** "Warm words are a ceiling" is a genuinely novel
  mechanic, it is legible on the card, and it is what makes the structure test in Act One (the
  card ask, the ballot) test something. Everything below that says "port the read model" is
  pointing at this.
- **The antagonist is a mirror.** Kirkman runs the player's own playbook backwards, sees the
  network only when the player's heat shows it to him, and buys the affinity the committee is
  travelling along. This is theory rendered as mechanic, not as tooltip.
- **The writing does the teaching.** Set-piece logs state their numbers. The unwinnable detector
  names the cause. The intro carries one rule. Keep this discipline in the other two acts.

### What is broken across the acts

1. **State does not carry. The spine breaks at every act boundary.** Act One hands Act Two four
   names and a trait each, worth **+0.6 points of win rate** in the sim (57.0% vs 56.4%). The
   contract prototype rolls a *fresh* influence map (`generateInfluence` is called again) and
   fresh commitment for the same twenty people, so the relationships the player mapped and the
   committee they built in Act One are discarded. "Nothing resets clean" is the game's promise;
   the acts reset each other clean.
2. **The acts are in the wrong order, and the Act Two win screen says the wrong thing.** Act Two
   ends with the headline **CONTRACT WON** on the strength of two election wins. Act One's own
   victory screen says the opposite ("Certification obliges them to bargain, not to agree").
   The contract prototype then goes back to the *first* shop. The natural arc is: win the shop
   (Act One) → win its first contract (the prototype, promoted to Act Two) → take the contract to
   the parent company's other studios (the current Act Two, as Act Three). That order is the
   real sequence, it fixes the mislabel, and it puts the "you can't be everywhere" lesson after
   the player has learned that committees are the engine.
3. **Three clocks, three units.** Act One is 26 weeks for one shop. Act Two is 12 *weeks* for four
   shops, each of which goes from cold to a certified election in about ten. The contract slice is
   12 months. Relabel Act Two's turns as months (vote two months after filing instead of five
   turns) and the scale stops fighting the fiction.
4. **The "correct" play should win more than the naive play in every act.** It does in Act One.
   It does not in Act Two (spreading thin ties building deep, see §3). In the contract slice
   there is no naive play left to lose with (§4).

---

## 2. Act One — brief notes (you're comfortable here; three things worth knowing)

| player | won | filed | median margin | projection error |
|---|---|---|---|---|
| careful (scouts before every deep talk) | 64.6% | 97% | 3 votes | +1.4 yes |
| sloppy (deep-talks blind) | 47.7% | 97% | 3 | +2.0 |
| careless (sloppy, asks early) | 20.5% | 87% | 3 | +2.7 |

- **Public actions are never correct.** Your own `when.mjs` says it: never going public wins
  65.8%; going public during the drive wins 41% and fails to file 31% of the time (burns); even
  small actions during the campaign cost about five points. A mechanic that is wrong under every
  timing is a trap, not a lesson. Either make a public action *do* something a conversation
  cannot (e.g. it is the only thing that moves true support of people no organizer has a tie
  to — the "the floor sees it" effect — or it is required as the pre-filing structure test), or
  cut it to one rung and say plainly that it's for the campaign phase.
- **Voluntary recognition is a lottery ticket that hands out three stars.** `recognitionChance`
  at 50%+ cards gives up to 55% odds of skipping the vote entirely. A player who happens to hit
  it is scored above one who ran a clean ballot. Consider scoring recognition on the same star
  table but flagging it as the rare outcome it is, or lowering the ceiling to ~25%.
- **Card lifespan is compressed.** The NLRB generally treats cards as current for about a year;
  14 weeks is a game abstraction, and a fine one, but the intro copy presents it as practice.
  Say "the board wants recent cards" rather than citing a rule.

Everything else in Act One I would leave alone until the other two acts are at its level.

---

## 3. Act Two — four studios

### 3.1 What the sim says

`node sim/act2-report.mjs 2000`. "Elections" is elections held per game; "mean p(win)" is the
`winChance` the game rolls at the moment of each vote.

| policy | won | elections | mean p(win) | committees formed | false "alive" turns | fired/game | organizer breaks |
|---|---|---|---|---|---|---|---|
| focus 2 sites, file when the modal says | 56.4% | 2.09 | 0.72 | 0.00 | 41% of games | 0.04 | 0.000 |
| focus 2, wait one turn for a committee | 71.8% | 2.01 | 0.84 | 1.91 | 16% | 0.00 | 0.000 |
| focus 3, wait for committee | 89.3% | 3.00 | 0.79 | — | — | — | — |
| **spread across all 4, wait for committee** | **93.2%** | 3.95 | 0.74 | — | — | — | — |
| spread across all 4, file now | 72.7% | 2.90 | 0.65 | 0.00 | 20% | 0.05 | 0.000 |
| focus 2 + all four Act One leaders | 57.0% | 2.10 | 0.72 | 0.00 | 40% | 0.05 | 0.000 |
| focus 2, "safe" platform (just cause, grievance, crunch) | 54.6% | 2.09 | 0.70 | 0.00 | 42% | 0.04 | 0.000 |
| focus 2, omniscient platform | 58.6% | 2.09 | 0.73 | 0.00 | 38% | 0.04 | 0.000 |

What an election is made of at the moment of the roll (`act2-anatomy.mjs`):

| | file when the modal says | wait for a committee |
|---|---|---|
| true support at the vote (mean, p10–p90) | 78 (67–91) | 98 (92–100) |
| fear at the vote | 52 (36–67) | 40 (25–55) |
| platform turnout factor | 1.14 (1.04–1.28) | 1.14 |
| support term `0.6 × support` | 0.53 | 0.60 (saturated) |
| fear term `0.4 × (1 − fear)` | 0.19 | 0.24 |
| p(win) p10 / p50 / p90 | 0.62 / 0.72 / 0.82 | 0.78 / 0.84 / 0.90 |
| retaliations per game | 0.07 | 0.00 |
| side offers per game | 0.00 | 0.00 |

### 3.2 Findings

**F1. The act is two dice rolls with a hard ceiling, and perfect play loses 28% of the time with no
feedback.** `winChance = 0.6·support/100 + 0.4·(1 − fear/100)`, and support is clamped at 100.
A well-run site saturates the support term by the vote (true support 98). All that is left is
fear, which sits at 35–50 at filing and barely moves (`fearDelta = 8 − ⌊1.5·units⌋ − 2` is zero
at four units). So the best reachable p(win) is about 0.84, and the act needs two of them:
0.84² ≈ 0.71, which is exactly the "wait for committee" row. Then each site is resolved with a
**single** `Math.random()`. Act One resolves twenty individual ballots, so its margin reflects the
work; Act Two flips a coin per site. The same p(win), resolved as a ten-worker majority vote
instead of one roll, would carry 85% (file-now) and 98% (committee) of the time — the *variance*
is the problem, not the mean.

**F2. Breadth beats depth, which is the opposite of the lesson.** Filing at all four sites and
waiting for committees wins 93%; focusing on two wins 72%. The reason is F1: elections are cheap
lottery tickets. A lost election costs the other sites −15 morale and a slightly higher
contagion chance, nothing more. McAlevey's whole argument (and Bronfenbrenner's data) is that a
staff-driven, spread-thin mobilization loses to deep organizing; this act rewards the spread. It
also hides the fact that under the *natural* play (file when the escalation modal first appears)
a committee never forms, because committees need 40% recruited and the modal fires at 30%.

**F3. The platform has a dominant answer you can read off the screen.** `act2-platform.mjs`
enumerates all 56 platforms. With nothing learned, **crunch caps + Play-Eye language + just cause
keeps every bloc at ≥ 56**, above the 50 line where a side offer becomes possible, in **100% of
priority rolls**. Ten of the 56 platforms do this blind. Consequently no side offer ever fires
under sensible play (0.00 per game in every policy row), no bloc ever walks, and the hidden
intensity system never touches an outcome. The handoff's claim that no platform satisfies all
four blocs is not true of the shipped formula. The two "genuinely opposed" pairs are simply never
worth taking. And the platform's effect on the vote is a turnout factor of 1.04–1.28 — an
omniscient platform is worth 4 points of win rate over the blind one.

**F4. The listening action is unreachable.** `LocationActionModal` is rendered (line ~1387)
without `priorities`, so `FeedbackControls` never shows "sit down and hear them out". Bloc
priorities stay `?` forever in the real game. (Also missing: `remaining`, so cost pips never grey
out.) The one action designed to make F3 interesting is not on screen.

**F5. Six meters are inert under competent play.** Over 2,000 games per policy: organizer
breaks **0.000** (stamina never reaches zero; the p10 minimum is 27); retaliation 0.04–0.07 per
game; firings, buy-offs, sophistication, legal risk, "document it" — all effectively never
engage, because visibility only accrues to *organizing* sites and a focused site files at turn
five and stops accruing. The employer counter-campaign, which in reality is *the* period of
retaliation, cannot retaliate at all. The Act One leaders' +15 stamina each is wiped on turn one
by `clamp(orgStamina − decay, 0, 100)`.

**F6. The unwinnable detector is wrong by three turns.** `ELECTION_LEAD_TURNS = 2`, but filing at
turn T votes at T+5. In 41% of file-now games the objective bar says "alive" on at least one turn
where no remaining site can file and vote before turn 12. This is the one promise the game makes
loudly ("the game owes you the truth the moment it stops being winnable"), and Act Two breaks it.

**F7. Smaller things.** `restartGame` does not reset `platform`, `blocPriorities`, `pendingFileLoc`
or `deadReason`, so "RUN IT BACK" starts with last run's platform already adopted. The escalation
modal fires *every turn* a site sits at ≥70 morale, so the player clicks "consolidate" repeatedly.
`locBlocFactor` at the vote reads `blocPriorities` (last turn's) rather than `prioritiesNext`.
The true-support "hollow dots" and the dashed ghost line show the same fact twice.

### 3.3 Fixes, in the order I'd do them

**Wiring (an afternoon, no design decisions):**
1. Pass `priorities={blocPriorities}` and `remaining={remaining}` to `LocationActionModal`.
2. Derive the lead from the filing rule: `ELECTION_LEAD_TURNS = 5` (or a shared constant used by
   `commitFiling`), and put "last turn you can still file: N" on the objective bar.
3. Reset platform, priorities, pending filing and dead reason in `restartGame`.
4. Rename the win screen: "TWO SHOPS CERTIFIED", with Act One's own line about bargaining.
5. Replace the every-turn escalation modal with a persistent FILE control on the site panel (Act
   One's "YOU CAN FILE TODAY" banner is the model). Show it once as a modal, then never again.
6. Make the leader bonus real or delete it. Real: each carried leader adds +1 action to the
   weekly budget (11, 12, 13, 14) and their Act One organizer tier carries. That is an effect the
   sim can see.

**The election (this is the fix that matters most):**
7. **Resolve the vote as a ballot, not a roll.** Reuse Act One's `turnoutChance` / `yesChance`
   with per-site "virtual voters": a site of 12 workers casts 12 ballots, each with p from the
   site's true support and fear. This alone turns a 28%-loss-on-perfect-play act into one where
   the margin shows the work (see the last row of the anatomy table). It costs a dozen lines and
   the ballot functions already exist.
8. **Stop saturating the support term.** Either the ballot above (which does this naturally) or
   move the curve to Act One's pivot/span so 98 true support is not the same as 80.
9. **Make fear a lever with a handle.** Right now only a 6-action all-in moves it, and the budget
   allows one of those. Give the committee's counter-messaging, a won grievance, and solidarity
   from a *certified* site explicit fear reductions during a campaign; say the numbers.

**Depth over breadth (makes F2 go the right way):**
10. **A committee is the price of filing.** Bronfenbrenner: a representative rank-and-file
    committee before filing is the single strongest predictor of a win. Make "shop committee
    active" the third gate next to morale and recruited (drop the 40%-recruited requirement to
    30% so it lines up), and let a committee still form *during* a campaign at a higher cost.
    The sim already shows why: committee sites vote at 98 true support, non-committee at 78.
11. **A lost election has to hurt company-wide.** Emboldened should raise retaliation odds at
    every site (currently it only nudges contagion by 5%), cost the organizer stamina (this
    gives the inert meter a job), and lock the lost site for the rest of the act. Losses should
    make the spread strategy lose, and the sim should show "focus 2 + committee" beating
    "spread 4 + committee". Rerun `act2-report.mjs` until it does.
12. **Filing consumes staff time.** A site at the vote should cost 2 actions a week just to
    *hold* (hearings, lists, the Excelsior list, the employer's unit-scope challenge). Two
    campaigns at once is a stretch; four is impossible, which is the truth.

**The platform (makes F3 interesting):**
13. **Retune satisfaction so the bland platform is not free.** Verified with
    `act2-platform.mjs` variants: at `base 42, served +10/pt, unserved −10/pt` a platform keeps
    every bloc ≥ 50 in only 69% of rolls (vs 100%), nobody-walks stays at 97%, and listening
    first improves the pick by 8+ points in 64% of rolls (vs 44%). That is the shape you want:
    the blind pick is usually survivable, sometimes not, and the listening action pays.
14. **Let the platform matter during the campaign, not only at the count.** Weight each site's
    true-support gains by its bloc composition × satisfaction every turn, so a QA-heavy shop
    visibly stalls under a salaried platform *before* the vote and the player can react.
15. **Make the platform revisable, at a cost.** A "bargaining survey" action (3 actions, company
    wide) that re-opens one slot and resets `heard`. McAlevey's survey is itself a structure
    test; treat it as one and report the response rate.
16. Carry the platform into the contract act as the issue list (see §4).

**Meters (fix F5 or remove):**
17. Let campaign sites accrue visibility and be retaliated against. Move the "document it"
    action into the campaign phase where the paper trail actually matters (ULP charges).
18. Stamina: either cut the pool to 60 with all-in weeks costing 10, or delete it and let the
    10-action budget be the whole resource, as Act One's hours are. Fewer meters that don't move
    is a legibility win in itself.
19. Relabel turns as months and cut the filing-to-vote lead to 2. Twelve months for a four-site
    campaign is honest; twelve weeks is not.

**Bigger (only after the above):**
20. **Give Act Two a roster.** The board already shares Act One's visual grammar "at a different
    zoom". Five to eight named workers per site, generated from the same seed logic, with the
    read model and one-on-ones, would make Act Two the same game at scale instead of a different
    game. The bloc layer then becomes a property of people (salaried/contract, veteran/new are
    two more visible traits), which is where the handoff's open question ("if Act 2 ever gets
    named workers, the bloc layer needs rethinking") resolves itself.

---

## 4. The First Contract prototype

### 4.1 What the sim says

`node sim/contract-report.mjs 1500`. Ratification is called at month 12 unless noted.

| policy | tiers won /6 | full contract | ratified | survives decert | landed | thin | CAT size at end | mean commitment | leverage lost to cooling |
|---|---|---|---|---|---|---|---|---|---|
| escalate: highest rung the screen says will land | 5.94 | 96% | 100% | 100% | 11.2 | 0.8 | 19.9 / 20 | 91 | 100 |
| letters only, every month | 3.00 | 0% | 96% | 99% | 12.0 | 0.0 | 20.0 | 99 | 60 |
| reach one rung above what lands | 2.33 | 9% | 39% | 42% | 3.3 | 7.7 | 12.3 | 57 | 48 |
| reckless: highest affordable rung | 0.00 | 0% | 0% | 0% | 0.0 | 12.0 | 2.0 | 28 | 24 |
| escalate, ratify at 4 tiers (≈ month 7) | 4.00 | 0% | 98% | 97% | 6.2 | 0.5 | 16.3 | 81 | 27 |

Month-one projections on a fresh floor with the two-person team: open letter 15/20 (needs 11),
sticker day 10/20 (needs 12), march 4/20 (needs 10), work-to-rule 2/20 (needs 10).

### 4.2 Findings

**F8. The slice answers its own question, and the answer is "yes, but only once".** "Run an
action → get a real turnout number → spend it at the table" does feel right, and the ladder's
month-one projections are exactly the shape a structure-test ladder should have: the letter
lands, the sticker day is close, the march is out of reach. The problem is what happens next.

**F9. Follow the green text and you cannot lose.** The escalate policy — pick the highest rung
whose projection is green — wins a **full contract 96% of the time, ratifies 100%, survives 100%**.
Everyone joins the action team (19.9 of 20). Commitment ends at 91–99 because every landed action
gives every participant +4 and nothing ever takes it back. There is no employer at the table:
leverage cools, and that is the only thing pushing back. "Letters only, every month" still
ratifies 96% of the time on a three-of-six contract.

**F10. The structure test tests nothing, because the projection is omniscient.** In Act One a
card ask is a test because the read is a band. Here `participationChance` is computed from
`commitment`, which the player sees exactly ("every read on this board is exact"). A structure
test exists to reveal structure you *can't* see; the green/red line pre-solves it.

**F11. Repetition is free.** Work-to-rule lands in month 7 and then lands again every month to
month 12 at full payout. Act One already has the answer (`publicFatigue(uses)`): the same action
twice is not news, and it is not a *test* either, because it reveals nothing the last one didn't.

**F12. The ladder is missing its top rung and its context.** No strike. Work-to-rule's blurb says
"three weeks from a milestone, that is a loaded gun", but there is no milestone: leverage is
perishable but never *situational*, so timing is not a decision.

### 4.3 Fixes

1. **Put an employer at the table.** Three moves, each a set piece with its numbers stated, in the
   Act One style: *surface bargaining* (the cost of every tier rises each month no action lands —
   "they only have to outlast you" as a mechanic, not a screen); *direct dealing* (a raise offered
   to the lowest-commitment non-team worker; reuse Act One's buy-off roll); *discipline* for
   rung-3+ participants (heat and a burn chance; reuse Act One's `BURN_NARRATIVES`). The
   decert petition at month 12 then becomes the natural fourth.
2. **Make the projection a read.** Commitment known exactly only for people a team member has
   spoken to this quarter; a band otherwise, using `readOf`. The action's *result* narrows the
   band for everyone — that is what a structure test is for, and the board already knows how to
   draw it.
3. **Fatigue and escalation.** Apply `publicFatigue` to repeated rungs; a rung repeated at the
   same turnout pays a quarter. A rung one step above the last one that landed pays full. That
   is what "escalating" means, and it forces the ladder to be climbed rather than camped.
4. **Cap the team and let people leave.** Commitment growth should be dragged by fulfillment (the
   function already has the shape), contractors should roll off (Theo's renewal is *in his
   hook*), and a thin turnout should cost participants trust in the team, not just −3 to
   everyone. Aim: a good campaign ends with 8–12 on the team, not 20.
5. **A fifth rung, and a calendar.** Add the strike (threshold 0.75, real cost: pay, a burn roll
   for everyone who walks). Add a milestone calendar visible from month one (ship dates,
   investor review) so that work-to-rule in the right month is worth double and in the wrong
   month is worth half. Leverage should be perishable *and* situational.
6. **Ratify on what was promised.** Bring the Act Two platform in as the issue list (or make the
   contract issues a superset of the demands) and score ratification with `blocSatisfaction`
   per bloc, so a contract that abandons QA fails in the QA-heavy vote even at 4/6 tiers.
7. **An unwinnable detector, as in the other acts.** Months left × the best possible payout <
   the cost of the next tier the floor would ratify → say so.
8. **Carry Act One in.** Same influence map, same committee as the starting team, the Act One
   organizer tiers as team hours. This costs nothing and it is the whole promise of the game.

After 1–4 the target balance, measured with the report script, is roughly: escalate-carefully
wins a 4–5 tier contract about two thirds of the time; letters-only gets decertified more often
than not; reckless still fails. That is the Act One shape.

---

## 5. Where to start

If you do five things, do these, in this order:

1. Act Two wiring bugs (§3.3 items 1–6). Half a day. Nothing else can be judged until the
   listening action exists and the winnability bar tells the truth.
2. Act Two ballot instead of roll (§3.3 item 7). One evening. Removes the single biggest source
   of "I did everything right and lost".
3. Committee-before-filing and losses that hurt (§3.3 items 10–11), then rerun
   `act2-report.mjs` until "focus 2 + committee" beats "spread 4 + committee". That is the test
   of whether the act teaches what it means to.
4. Platform retune and in-campaign effect (§3.3 items 13–14). One evening with the enumeration
   script open.
5. Reorder the acts and carry state (§1). This is the largest job and the one with the biggest
   payoff, and it is easier once Act Two has a roster (§3.3 item 20), so it goes last.

---

## Appendix — reproducing the numbers

```
node sim/extract.mjs                 # Act One core (existing)
node sim/extract-act2.mjs            # Act Two pure functions -> sim/core2.mjs
node sim/extract-contract.mjs        # contract pure functions -> sim/core3.mjs
node sim/verify-ballot.mjs 1500      # Act One: win rate by player skill
node sim/when.mjs                    # Act One: public actions by timing
node sim/act2-report.mjs 2000        # Act Two: win rate by policy
node sim/act2-anatomy.mjs 1500       # Act Two: what an election is made of
node sim/act2-platform.mjs           # Act Two: all 56 platforms, side-offer safety
node sim/contract-report.mjs 1500    # contract: tiers, ratification, decert by policy
```

The Act Two engine (`sim/act2-engine.mjs`) and the contract loop inside `contract-report.mjs`
are ports; when you change a `resolveTurn`, change the port. The policies in
`sim/act2-policy.mjs` decide on what the UI shows (they never read hidden bloc intensity unless
told to cheat), and their options are documented at the top of the file.
