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

1. ~~**State does not carry. The spine breaks at every act boundary.**~~ **FIXED, commit after
   `bd2ecc0`.** Act One used to hand Act Two four names and a trait each, worth +0.6 points of
   win rate, while the contract prototype rolled a *fresh* influence map and fresh commitment for
   the same twenty people. Act One now hands forward the floor itself — the twenty workers with
   where they actually stood, the affinities the player surfaced, their history, their organizer
   experience, and the influence map that took twenty weeks to draw. The contract act runs on it:
   commitment starts from each worker's real true support at the ballot, scaled by
   `CONTRACT_VOTE_TO_ACTION` because voting yes once and giving up your Friday are different
   acts; the committee that won the election is the action team; a lead organizer keeps the extra
   hour their experience earned; and winning the election is what brings back anyone management
   burned out of Act One, wary. The company's perks lapse, so the common ground is theirs again.

   The effect on the contract act, measured end to end by playing real Act One wins into it
   (`sim/carry.mjs`):

   | | rolled floor (old) | carried, careful Act One | carried, sloppy Act One |
   |---|---|---|---|
   | starting commitment | 59 | 45 | 44 |
   | starting action team | 2.0 | 4.6 | 4.6 |
   | full contract (6/6) | 94% | **68%** | **61%** |
   | ratified | 100% | **84%** | **81%** |
   | survives decertification | 100% | **85%** | **83%** |
   | tiers won, escalating | 5.92 | 4.86 | 4.65 |

   So the carry is also a partial answer to F9: the contract act stopped being a walkover on its
   own, because a floor nobody organized properly arrives measurably colder than an invented
   one. Act One skill now shows through into the contract. It is still too easy, and §4 is still
   the work.
2. ~~**The acts are in the wrong order, and the Act Two win screen says the wrong thing.**~~
   **FIXED.** The order is now win the shop → win its first contract → take the contract to the
   parent company's other studios. The first-contract act calls itself Act Two rather than a
   prototype slice, hands its outcome forward, and the company campaign's intro knows what
   happened: "You won one shop, and then you won it a contract — 3 of 6 tiers, signed. The other
   studios under the same parent read it the week it was posted", or, where nothing was signed,
   "held it through a year of bargaining with nothing signed". Whoever is left on the contract
   action team becomes the company team, capped at four. A decertified unit is an ending rather
   than a doorway — nothing carries out of it. Saves are versioned: a v2 save carries the whole
   floor and resumes at either boundary, and a pre-reorder v1 save still loads but can only
   rejoin at the company campaign, since it never wrote a map down.
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

**Wiring (an afternoon, no design decisions) — DONE, commit after `bde0b94`:**
Items 1–6 below are in. Verified by compiling, by the Act Two sim (false-"alive" turns went
from 41% of games to 0%; four carried leaders now move the win rate from 54% to 88%, which is
strong and worth revisiting once the election roll is fixed), and by driving the built app in
Chromium: listening action visible on QA's panel, the escalation prompt shown once with four
gates, the standing banner and the panel FILE control both reaching the platform screen, and
the site landing at the vote. Two extra bugs surfaced on the way and are fixed too: filing from
the site panel opened the platform screen *underneath* the panel, and fifteen `\u2014` escapes
written inside JSX text rendered literally. The filing gates now live in one `filingGates()`
used by the prompt, the banner, the panel and the filing itself, with the clock as a fourth gate.
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

**The election (this is the fix that matters most) — DONE, commit after `12af198`:**
Items 7 and 8 are in; item 9 is partly answered and partly still open. Each site now casts
one ballot per worker: a deterministic spread of standings around the site's true support,
a per-worker turnout roll and yes roll, decided on a majority of the ballots cast. The exact
odds are computed by walking the distribution of (yes - no) over the shop, so the percentage
the player is quoted before filing is the percentage the ballot actually rolls.

The curve is Act Two's own (pivot 12, span 100), because a *shop* at 78 and a *person* at 78
are not the same measurement - Act One's pivot would have put every shop at the 0.93 cap.
Anchors, for a 10-worker shop at 40% recruited: 70 true support is the coin flip, 85 reads
79%, 98 reads 91%, 55 reads 18%.

Fear needed rethinking. Symmetric turnout suppression cannot move a majority at all - thinning
both piles in proportion changes the turnout and not the result - so fear now acts only on the
union's half of the room, in two terms: it keeps your voters at their desks, and it moves the
marginal one to the safe vote. Across the range the employer's counter-campaign reaches, that
is worth about 20 points of win chance. The platform factor moved onto turnout for the same
reason, which is what it always claimed to do. Item 9 (giving the player more handles on fear)
is still open; fear is now worth pulling, but a 6-action all-in is still the only lever on it.

| | before | after |
|---|---|---|
| focus 2, file at the prompt | 56.4% | 41.3% |
| focus 2, wait for a committee | 71.8% | 89.3% |
| spread 4, wait for a committee | 93.2% | 95.8% |
| median ballot margin, file-now | n/a (one roll) | 2 votes, 41% within one |
| median ballot margin, committee | n/a | 4 votes, 28% by six or more |
| listening first (open bargaining) | +3.7 pts | +11.3 pts |

Skill separation went from 15 points to 48. The margin now reads like Act One's (median 3,
41% close). Depth still does not quite beat breadth - 89.3% against 95.8% - but the gap
closed from 21 points to 7, and the rest of it is item 11's job: a lost election is still
nearly free, so four cheap tickets still beat two good ones. Two things to watch: filing at
the prompt now loses more often than it wins, which is correct but makes the committee gate
(item 10) urgent rather than optional; and four carried leaders are worth 39 points of win
rate, because extra actions buy extra elections.

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

**Depth over breadth (makes F2 go the right way) - DONE, commit after `20fe3fa`:**
Items 10, 11 and 12 are in. 12 was not optional: with a 5-week filing lead and a week-7
deadline every election lands in weeks 9-12, often the same week, so a loss has no time to
bite before the other votes are already cast. Raising the cascade from 18/14/14/18 to
26/22/22/32 moved `spread 4` by 1.4 points and did not change the ordering at all. The cost of
breadth has to be paid *before* the votes, and item 12 is where it is paid.

- **The committee is the fifth gate on the petition** (item 10), and `COMMITTEE_RECRUIT_PCT_REQ`
  dropped 0.4 -> 0.3 to line up with the petition's own recruitment gate, so the committee is
  never the thing that is arithmetically out of reach. A committee can also still be built after
  filing, at 5 actions instead of 3 - though that path is currently unreachable, because
  retaliation cannot touch a campaign site (item 17). It becomes reachable the moment 17 lands.
- **A defeat is company-wide** (item 11): every shop still in play takes -20 morale, -16 true
  support and **+16 fear**, which is the term that bites now that fear decides turnout. The
  organizer loses 22 stamina, and the stamina check re-runs so a defeat is the week they go
  under rather than the week after. A beaten employer reaches for the same tools sooner
  everywhere (+15 on the retaliation roll). The lost shop is named as gone: under the NLRB
  election bar it cannot petition again for a year, which in a twelve-week campaign is never.
- **A petition costs 2 actions a week to hold** (item 12) - hearings, the voter list, and a
  mandatory meeting somebody has to answer - taken off the top before anything is allocated.

| policy | before | after | mean p(win) per election | losses/game | organizer breaks |
|---|---|---|---|---|---|
| focus 1 shop | - | 64.7% | 0.90 | 0.15 | 0.00 |
| focus 2 shops | 71.8% | **70.8%** | 0.85 | 0.27 | 0.00 |
| focus 3 shops | - | **78.6%** | 0.71 | 0.80 | 0.21 |
| spread across all 4 | 93.2% | **68.9%** | 0.65 | 0.98 | 0.27 |
| never builds a committee | - | **0.0%** | - | - | - |

The test the review set - focus beats spread - passes: 70.8% against 68.9% at two shops, and
78.6% at three. The curve now has an interior optimum, which is the right shape: one shop
cannot reach the two wins the objective needs, four is too thin to carry, three is the campaign
that wins. Every measure moves the right way with breadth - the odds per election fall from
0.90 to 0.65, defeats per game rise from 0.15 to 0.98, and the organizer starts hitting zero
stamina. A player who never builds a committee never files at all.

Two side effects worth noting. Carried leaders are back to a sane +4.8 points (they were +39
before the upkeep, because extra actions bought extra cheap elections). And listening first is
now worth +3.3 rather than +11 - the platform matters less when fewer shops reach a vote, which
is an argument for doing item 13 next rather than a reason not to.

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

**The platform (makes F3 interesting) - DONE, commit after `2e055d8`:**
Items 13 and 14 are in; 15 and 16 remain open. `blocSatisfaction` starts at 42 rather than
50 - deliberately below the line where the company can come to a bloc with a side offer,
because a platform is capital you are spending, not a gift you hand out - and the
served/unserved swing is 10 points per point of intensity rather than 8 and 6.

One thing had to be added that the review did not list. The pledge button was free and
unlimited, and it softens a miss by 55%; strengthening the unserved penalty would have made
pledging *more* powerful and let a player neutralise the whole retune by promising all four
blocs they were next. It is now one pledge a campaign. "We'll get you next time" is worth
something said to one group and nothing said to four, which is also the honest version.

| | before | after |
|---|---|---|
| bland platform keeps every bloc >=50 | 100% of rolls | **15%** |
| some platform keeps every bloc >=50 | 100% | 66% |
| a safe platform needs a contested demand | never | 63% of rolls |
| turnout factor at the vote | 1.04 .. 1.28 | **0.81 .. 1.27** |
| games where a bloc walked, blind | 0% | **17%** |
| games where a bloc walked, having listened | 0% | **1%** |
| listening first is worth | +3.7 pts | **+4.7 pts** |

The qualitative change is the defection line. Side offers now fire, blocs now walk, and the
one reliable way to stop it is to have sat down and asked - which is what the open-bargaining
action was built for and never previously repaid. Listening beats even an omniscient platform
(80.0% against 76.6%), because being heard is worth something on its own that simply knowing
the answer is not.

Item 14 closes the feedback gap: the platform now works on the floor every week, not only at
the count. A shop's organizing converts at its own bloc factor, the shop's panel reports what
the platform is worth there, and the week says so in words - "CORE STUDIO: the platform lands
badly here. VETERANS are 60% of this shop and the platform gives them 0. Organizing converts
at 92% here: +13 became +12 true support." Before this the player adopted a platform and got
no feedback on it until the ballot, which is far too late for it to have been a decision.

Depth still beats breadth after the retune: focus 2 shops 68.3%, focus 3 shops 75.3%, spread
across all 4 65.6%.

13. **Retune satisfaction so the bland platform is not free.** Verified with
    `act2-platform.mjs` variants: at `base 42, served +10/pt, unserved −10/pt` a platform keeps
    every bloc ≥ 50 in only 69% of rolls (vs 100%), nobody-walks stays at 97%, and listening
    first improves the pick by 8+ points in 64% of rolls (vs 44%). That is the shape you want:
    the blind pick is usually survivable, sometimes not, and the listening action pays.
14. **Let the platform matter during the campaign, not only at the count.** Weight each site's
    true-support gains by its bloc composition × satisfaction every turn, so a QA-heavy shop
    visibly stalls under a salaried platform *before* the vote and the player can react.
15. **Make the platform revisable, at a cost.** — **DONE.** A bargaining survey, 3 actions,
    company-wide, once a campaign. The response rate is the measurement, and what it measures
    is whether there is anybody to hand the thing to: a shop with a committee answers, a shop
    without one gets a link in an email from a stranger. Above 60% you learn every bloc's real
    priority, gain a point of goodwill with all of them, take +4 true support and +3 morale
    everywhere (a survey is an excuse to talk to the whole company in a fortnight, and that is
    the half of it that isn't information), and may change one demand. Above 35% you learn one
    thing and still get the change. Below that you learn nothing, lose 3 morale everywhere, and
    everyone who didn't fill it in now knows they were asked.

    | when it goes out | won | response | strong | thin | dead |
    |---|---|---|---|---|---|
    | no survey | 74% | — | — | — | — |
    | month 2 (before any committee) | **70%** | 25% | 0% | 0% | 100% |
    | month 4 | **69%** | 49% | 0% | 100% | 0% |
    | month 6 | **79%** | 62% | 86% | 14% | 0% |
    | month 8 | **82%** | 64% | 97% | 3% | 0% |

    Surveying a floor you have not organized is worse than not asking — which is the whole
    point of a structure test, and the same shape as a thin turnout in the contract act.
16. ~~Carry the platform into the contract act as the issue list.~~ **DONE, pointed the other
    way.** As written this assumed the platform came *before* the contract; after the reorder
    it comes after, so the carry that survives is the contract carrying forward into the
    platform — which is what the company campaign's intro had already been promising ("a
    contract is a document other people can point at"). Two effects, and only for a **ratified**
    contract, because a year of bargaining with nothing signed proves nothing:

    - **A demand you already won is worth `PROVEN_BONUS` (8) more to every bloc**, marked IN
      WRITING on the platform screen. Wages proves both raise demands; just cause and the
      Play-Eye language prove themselves.
    - **Every shop opens further along**, 1.5 points of true support per tier signed, because
      four studios under the same parent read the contract the week it was posted.

    | came in with | focus 2 | focus 3 | focus 4 | blocs walked |
    |---|---|---|---|---|
    | nothing (skipped the act) | 68% | 78% | 74% | 17% / 8% / 10% |
    | a year of talks, nothing signed | 66% | 80% | 73% | 17% / 11% / 9% |
    | ratified, 3 of 6 tiers | 75% | 88% | 83% | 0% |
    | ratified, all 6 tiers | **79%** | **91%** | **87%** | 0-1% |

    A signed contract is worth 11–13 points of win rate at the next four shops and all but
    ends bloc defection; an unsigned year is worth nothing at all, which is exactly the
    difference between having a union and having won something with it.

**Meters (fix F5 or remove) — DONE, commit after `7111746`:**
All three, though 18 and 19 both turned out to have false premises once measured, and the
report says so rather than pretending otherwise.

17. **DONE.** Filing puts a shop's visibility at 62 and retaliation now reaches shops at the
    vote — previously the single most dangerous stretch of a real campaign was the safest
    stretch of this one. It is rated rather than constant: a much lower roll than an
    organizing shop that has drawn attention, capped at two crackdowns a campaign, and what
    it costs is mostly *fear* (the weekly counter-campaign is already eating support), which
    is the term that decides who turns out. Documenting is now a one-off practice you start
    rather than a chore you repeat, offered every month at a shop that has filed, and it both
    **deters** (half as many crackdowns) and **softens** (a third of the fear). Worth +7 points
    of win rate. Before: retaliations 0.000 and firings 0.000 in every policy. After: 1.1–2.0
    and 0.55–0.95 a game.

    Fixing this exposed a dead chain of my own making. `employerSophistication` rises when a
    firing *fails* to shut a shop down, but the watch that detects it was gated on
    `!targetCommittee` — and once a committee became the price of a petition, every shop had
    one, so every firing targeted one, so the watch never started, so sophistication never
    rose and the quiet buy-off never existed. It now turns on whether the committee *held*,
    which is the question that was always being asked. Sophistication reaches 1 in 63% of
    games, up from 0%.
18. ~~Stamina: cut the pool to 60, or delete it.~~ **PREMISE GONE.** The item assumed a meter
    that never moves. Since the defeat cascade started costing 22 stamina, it moves: 38% of
    focus-3 games and 44% of spread-4 games now hit a forced break, with the minimum dipping
    to 15. It stays flat only for a *focused* campaign — which is correct, because stamina is
    now the cost of breadth, and a pool tight enough to bite two shops would punish the
    strategy the game is built to reward (measured: pool 70 gives focus 2 a 43% break rate and
    focus 3 a 75% one). So the pool stays at 100 and the fix is legibility instead: the
    allocate screen forecasts the month — "STAMINA 74 → 67 after this month — a heavy month, 3
    shops in one calendar. A crackdown anywhere costs 3 more."
19. **HALF DONE, HALF REJECTED, ON EVIDENCE.** Act Three now runs on **months**: twelve months
    for four studios is credible where twelve weeks never was, and it lines up with Act One's
    twenty-six weeks and the contract act's certification year.

    Cutting the filing lead to 2 was implemented, measured and reverted. It reads better on
    paper and plays much worse: the stretch between petition and ballot is where a player
    fights — driving fear down, answering the captive-audience meetings, getting a committee
    built under pressure — and at two turns it becomes a formality you file into and hope.
    Election odds fell from 53–82% to 33–47%, and a single shop became the dominant strategy
    at 68% against focus-3's 43%. Five months is also the truer number: a contested petition
    means hearings, unit-scope challenges, and an employer with every reason to take its time.

| policy | before 17–19 | after |
|---|---|---|
| focus 1 shop | 53.6% | 55.4% |
| focus 2 shops | 53.3% | 55.7% |
| **focus 3 shops** | 63.5% | **60.8%** |
| spread across all 4 | 52.3% | 52.9% |
| focus 3 + document | — | **68%** |
| focus 3 + survey + document | — | **72%** |
| never builds a committee | 0.0% | 0.0% |

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

**Roster (item 20) — DONE, with one deliberate omission.**

Every site now has one named person per worker — 39 across the four sites, drawn from a
shared name pool so nobody appears twice, with a role, a status bloc, a tenure bloc, and a
stable personal `jitter` of ±18 around the site's number. The blocs are drawn independently
of each other and shuffled against role, so they genuinely cross-cut: the QA division is 80%
contract and 70% new, but which eight and which seven are not the same eight and seven.

Where a person stands is `act2Standing`: the site's true support, plus their own jitter, plus
a small tilt from what the platform says to the two blocs they belong to (`ACT2_BLOC_TILT =
0.2`; a defected bloc is a flat −20). The tilt is deliberately small — `locBlocFactor` already
charges the platform against turnout at the site level, so this exists to make the trade
*visible on a person*, not to bill for it twice.

Three things now read off the roster instead of off an index:

| | before | after |
| --- | --- | --- |
| map dots | 3–9 decorative dots, hollow past a computed share | one dot per person; hollow = that named person votes no |
| the ballot | `act2Standings` synthesised a spread from the site's number | walks the actual roster; the same spread, but it belongs to somebody |
| the site modal | site aggregates only | a THE FLOOR panel: name, role, both bloc marks, and their read |

The read model is the point. Without a shop committee every person reads as a band (±20,
`ACT2_ROSTER_BAND`) and the panel says why: *"No committee here, so every one of these is an
estimate."* Build the committee and the same names read as exact numbers. That is Act One's
central lesson — you do not know your shop until the shop tells you — restated at the scale
where a player is most tempted to trust the aggregate. The election line now also names up to
three of the people who stayed home, which is the other half of the same lesson.

**One-on-ones — DONE, as a deliberate change to the act's premise.**

I first left these out, on the grounds that per-worker actions would erase what separates
this act from Act One. That objection was right about the *wrong* design — one-on-ones as a
way to work the floor. It is answered by the design that is actually true to the source
material: at four sites and 39 people you cannot work a floor person by person, and neither
can a real lead organizer. What you can do is find the two or three people the floor already
follows, and let **them** work it. That is McAlevey's entire argument for a committee, and the
act had been asserting it in prose while gating the committee on a morale threshold.

So: **a sit-down is 1 action, capped at two per month across the whole campaign** — four
sites, one calendar. What it buys:

- an **exact read** on that person, permanently, with no committee needed
- their **pull**: how many people take their cue from them, invisible until you sit down
- the **names they give you** when you ask who else you should be talking to
- a small real gain for the shop (+2 morale, +2 true support): an hour across a table is the
  best organizing conversation there is, and pretending it buys only information would be its
  own kind of lie

**Pull is drawn independently of standing.** The warmest person in the shop is no likelier to
be a leader than anyone else. This is the trap, and it is the point.

**And the committee is now built out of people, not numbers.** The old gate (morale ≥ 55,
30% recruited) still applies, but on top of it you must have *found somebody to build it
around* — a met worker with pull ≥ 55. A site that clears the numbers and has nobody says so:
*"The numbers here are ready for a committee. You have not found anyone to build it around."*
A committee's ongoing bonus then scales with the summed pull of its leaders, so a committee of
the people the floor follows is a different object from a committee of whoever was willing.

**The lesson is in the rules, not the prose.** `sim/act2-oneonone.mjs` plays the same game
four ways, varying only who the organizer picks inside a site, each deciding on what the UI
shows and never on the hidden pull:

| method | won% | sit-downs/game | leader hit rate |
| --- | --- | --- | --- |
| ask who else to talk to, then go | **60.8%** | **11.3** | **33%** |
| sit down with whoever reads warmest | 53.7% | 14.0 | 26% |
| pick at random | 54.1% | 13.9 | 26% |
| never sit down with anyone | 0.0% | 0.0 | — |

Picking by visible enthusiasm is *no better than picking at random* — 26% either way. Following
referrals is worth about seven points, and it buys them by needing **three fewer conversations
per campaign**: three actions handed back to organizing. The referral edge is real but not a
giveaway — the first name you are given is a leader 38% of the time against 15% cold.

Tuning it took three passes. The first cost the game 54 points of win rate (65% → 11%): leaders
were too rare for twelve months of calendar to reach, which stops being a lesson and becomes a
wall. Leaders went from ~15% of a floor to ~25%, the committee's own cost went 3 → 2 since the
identification work is now explicit and paid for separately, and the sit-down got its small
site-level gain. Two apparent findings along the way were my own sim policy, not the rules:
referral mode kept chaining referrals at a site where it had *already* found its leader, and
sit-downs were being booked at sites the policy never worked.

Balance after (n=2000):

| policy | before one-on-ones | after |
| --- | --- | --- |
| focus 3 shops | 65.3% | 62.0% |
| focus 2 shops | 53.6% | 56.2% |
| spread across all 4 | 55.1% | 53.4% |
| focus 3, listen first | 76.2% | 72.0% |
| focus 3 + 4 leaders | 71.0% | 81.4% |
| never builds a committee | 0.0% | 0.0% |

One strategy moved a long way: **working a single shop fell from 54.6% to 19.8%.** That is a
real change and worth knowing about, but I think it is a correction rather than damage — the
objective is two certified shops, and a player who only ever works one should not have been
winning half the time.

Balance is unmoved (n=2000, and the ordering is what matters):

| policy | won% before | won% after |
| --- | --- | --- |
| focus 3 shops | 60.8% | 65.3% |
| focus 2 shops | 55.7% | 53.6% |
| spread across all 4 | 52.9% | 55.1% |
| focus 3, listen first | 76.6% | 76.2% |
| never builds a committee | 0.0% | 0.0% |

---

## 3.5 The text audit (all three acts)

Every player-facing prose block in the game, extracted by script and measured. The rule:
**more than two lines is a bug unless the board genuinely cannot say it.** A block that
survives has to be carrying something no number, colour, band or rung on screen already
carries.

Seven screen regions ran to 200+ characters of standing prose. Four survive, and all four
are structural rather than expository: a confirm dialog for an irreversible action, three
choice buttons that each describe their choice, an on-demand hover tooltip, and two
independent one-line event banners that happened to sit next to each other.

**Cut as already-said-elsewhere:**

| Where | What it said | Where the board already said it |
| --- | --- | --- |
| Act One, filing banner | what filing does, the ballot rule, the projection, the cushion advice | the modal it opens, one click away — the banner now gives the count and whether you have a cushion |
| Act One, filing modal | the card count and the 30% again | the banner you clicked to get here |
| Act One, public-actions unlock | reach, proportionality, exposure risk | the tier cards: "Reaches 4 coworkers — about +11 support in total", "Exposure risk: high", "has already done this once — it isn't news anymore" |
| Act Three, allocate screen | "unassigned actions count as rest" | the first entry of every site's effort list, and the stamina forecast directly above |
| Act Three, escalation modal | true support, fear and the odds, restated | the "IF YOU FILE TODAY" block one line above, which quotes all three |
| Act Three, site panel | "a majority of the ballots cast decides it" | the escalation prompt states it at the moment of filing; the yes/no projection shows it |
| Act Three, map caption | "every site shares the same company" | the edges drawn between the sites |

**Act One's ballot rule now appears once** — in the confirm dialog, at the point of
decision — instead of three times across a banner, a panel and a modal.

**Built into the board instead: the projection is now a band.**

The campaign panel said, under a single hard number, *"This is an estimate, not a promise:
the booth is secret, people who signed still vote no…"* — prose apologising for a number
the game was presenting as exact. The contract act had already solved this: its turnout
projection reads `13–14 of 20` because it is built from each worker's read. Act One has the
same read model and was throwing it away in `voteProjection`.

`voteProjectionBand` keeps it. PROJECTED YES now reads `9–15` on an unread floor and
collapses to a single number when every worker is signed or freshly read. The width is the
warning, so the sentence is gone:

| floor | projection |
| --- | --- |
| mixed reads, week 10 | 7–12 |
| same floor, week 14 (reads aging) | 6–12 |
| every worker signed | 12 |

The band leans downward rather than sitting symmetrically around the estimate, because
`readOf` puts warm words at the *top* of a person's band. The projection is therefore
wrong in the flattering direction exactly where the player has not done the work — which
is the lesson Act One is built on, now visible in the one number they watch most.

**The intro sequences.**

Act Three's opening ran five or six beats. Three of its claims were duplicating surfaces
that are on screen permanently, one of them from the very next click:

| Intro said | Already on screen |
| --- | --- |
| "Unionize two of the four sites and the campaign carries." | the objective bar, always visible: *"Win union elections at 2 of 4 shops within 12 months."* |
| "Every month you decide where your 10 actions of time go." | the hour pie: *"7 of 11 actions left this month"* |
| "Station each of them at a site — their strength only helps where you post them." | the team panel: *"YOUR TEAM — click a leader, then click a site to station them there"* |
| "Any demand you already got signed is worth 8 more to every bloc." | the platform screen says this at the moment you are picking demands |

Four beats now, from six, and 979 characters from 1,511. What survives is what the board
cannot hold: the bridge from the last act, the thesis (*"What worked once wasn't a fluke.
It was a system"*), the premise (*"You're one organizer with four sites and one calendar"*),
and permadeath (*"none of it resets"*) — which nothing on the board states.

The premise beat moved to **last**, so it is the thing still on screen when BEGIN CAMPAIGN
is pressed rather than a goal restatement the objective bar is about to repeat.

**Act Two has no intro sequence at all.** It opens on `phase: "plan"` with the two-line
banner and the board. That is a gap rather than a redundancy, and filling it would mean
adding text rather than cutting it, so it is left as a decision rather than taken.

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

### 4.3 Fixes — DONE, commit after `4a70654`

Items 1–5, 7 and 8 are in. Item 6 no longer applies: it assumed the demand platform came
*before* the contract, and after the reorder it comes after, so there is no platform yet to
ratify against. The reverse carry — a signed contract making the company campaign's platform
easier to write — is a new idea rather than a fix, and is not done.

- **An employer at the table** (1). Three moves, each stating its own numbers. *Surface
  bargaining*: a month where nothing lands banks a month of "not yet", and every tier you have
  not won gets 15% dearer, up to 60% — they never refuse to bargain, because refusing would be
  illegal; they agree to meet, at length, forever. *Direct dealing*: the company goes round the
  union to whoever is cheapest to buy, and a worker who takes it sits out the next three
  actions. *Discipline*: the rungs from "march on the boss" up get somebody written up — the
  person on your team with the least standing behind them — costing them the team and everyone
  who watched it 3 commitment. Act One's own `BURN_NARRATIVES` do the talking.
- **The projection is a read** (2). This is the one that makes it a structure test. Commitment
  is a number only for somebody sat down with in the last two months, or who turned out at the
  last action; everyone else is a range that widens 5 points a month. So the ladder quotes
  "13–14 of 20 · needs 11", green only when even the pessimistic end clears the line. And a
  landed action reads the floor — but only the people who *turned up*. The ones who stayed home
  stay unread, which is exactly who the next month has to be spent on.
- **Fatigue and escalation** (3). A rung pays `1/(1 + 0.6·uses)` of its value. Fatigue applies
  to the leverage, not to what standing next to each other does for the people who came, so
  the floor still builds — that distinction matters, because scaling both killed the growth
  engine outright in the first pass (2.19 tiers, ladder stuck at sticker day). Higher rungs pay
  substantially more than they used to, since each is now worth full value only once.
- **A team, capped, that can leave** (4). Commitment growth is dragged by fulfillment. A member
  nobody asks for anything — no conversation to run, no action to stand up in, and turning out
  counts — drifts off after four months. Two thin turnouts running is enough for anyone. Teams
  now end at 9–11 rather than 19.9.
- **A fifth rung and a calendar** (5). The one-day stoppage: 75% threshold, 160 payout. And
  three milestone months, visible from month one, where withholding labour is worth 180% and
  outside them 65% — so timing the ladder is a real decision, and it is the strongest line.
- **An unwinnable detector** (7). No action team left, no campaign: named and called, like the
  other two acts.

Measured, n=800 per row, on real Act One wins (`node sim/contract-report.mjs`):

| policy | tiers /6 | 4+ tiers | 6/6 | ratified | survives | dead |
|---|---|---|---|---|---|---|
| escalate, reading the band | 3.29 | 56% | 23% | 58% | 57% | 12% |
| **time the milestones** | 3.41 | 55% | **35%** | **60%** | **59%** | **8%** |
| gamble on the optimistic end | 3.53 | 57% | 21% | 60% | 57% | 20% |
| letters only, every month | 0.42 | 0% | 0% | 18% | **16%** | 16% |
| reckless (top rung always) | 0.00 | 0% | 0% | 0% | 0% | 100% |

Against F9's "follow the green text and you cannot lose": a careful escalating campaign now
wins a contract it can ratify 58% of the time, timing the milestones is the best line and the
safest (8% collapse against 12%), gambling on the optimistic end of the range pays more and
kills more, camping on open letters gets the unit **decertified 84% of the time**, and reckless
climbing loses the whole team inside three months. The decertification vote was reweighted onto
what was actually won rather than how warm the floor feels, because a year of pleasant meetings
and an empty contract is the most common way a first unit dies and it should read that way.

Act One skill now carries into the result: a careful Act One yields 3.46 tiers and 62%
ratification, a sloppy one 2.91 and 52%.

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
node sim/act2-survey.mjs             # the bargaining survey by timing, and what a contract carries
node sim/act2-ballot.mjs             # Act Two: the ballot curve, and what each input is worth
node sim/contract-report.mjs 1500    # contract: tiers, ratification, decert by policy
node sim/carry.mjs 300               # plays real Act One wins into the contract act
```

The Act Two engine (`sim/act2-engine.mjs`) and the contract loop inside `contract-report.mjs`
are ports; when you change a `resolveTurn`, change the port. The policies in
`sim/act2-policy.mjs` decide on what the UI shows (they never read hidden bloc intensity unless
told to cheat), and their options are documented at the top of the file.
