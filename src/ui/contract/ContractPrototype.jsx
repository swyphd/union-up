// The first contract: twelve months from certification to a signed agreement, or not.
import React, { useState, useRef } from "react";
import { X, Megaphone } from "lucide-react";
import { clamp, rand, random } from "../../engine/rng.js";
import { GlobalStyle, OutcomeScreen, StatRow } from "../shared.jsx";
import { Act1FloorMap } from "../act1/FloorMap.jsx";
import { infOn } from "../../engine/act1/influence.js";
import { generateSocial } from "../../engine/act1/friends.js";
import { ACT1_WORKERS_SEED, BURN_NARRATIVES, FULFILL_HEX, TEAM_LABEL, fulfillmentLabel, supportTier } from "../../engine/act1/constants.js";
import { ACTION_LADDER, CAT_HOURS, CAT_IDLE_QUIT, CAT_JOIN_REQ, CONTRACT_ISSUES, CONTRACT_LADDER, CONTRACT_MAX_TIERS, CONTRACT_MILESTONES, CONTRACT_MONTHS, CONTRACT_READ_FRESH, LEVERAGE_COOLING, STALL_MAX, STALL_STEP, catBacking, contractLadderOf, contractRead, contractTierSum, keepUnionChance, makeContractWorkers, participationChance, projectedTurnoutBand, ratifyYesChance, rungFatigue, stalledCost, timingMult } from "../../engine/contract/index.js";
import { orgTier } from "../../engine/act1/committee.js";
import { tieOn } from "../../engine/act1/affinities.js";
import { RATING_HEX, rating } from "../../engine/act1/election.js";

// =====================================================================================
// PROTOTYPE — THE FIRST CONTRACT
// A vertical slice, not a finished act. It exists to test one question: does
// "run an action → get a real turnout number → spend it at the table" feel good?
//
// Deliberately NOT in the slice: turnover, decertification, ULP charges, the bargaining
// survey, open bargaining, direct dealing, the community campaign. Four ladder rungs,
// three issues, eight turns.
// =====================================================================================

// One turn is a month, and twelve of them is the certification year — the window in
// which the employer must bargain and cannot be challenged. Run it out without a contract
// and the union you won in Act One goes to a decertification vote.

function ContractPrototype({ carry = null, onComplete = null, onExit }) {
  // The influence map is not regenerated. Who listens to whom did not change because an
  // election happened, and re-rolling it would throw away the one thing the player spent
  // the whole of Act One learning.
  // A carried floor brings its own friendships. The playtest (no carry) rolls one, and
  // keeps it, so the board and the ties it runs on describe the same people. A pre-friends
  // save has a map but no friendships to show, and the board says so.
  const [social] = useState(() => carry?.social ?? (carry?.influence ? null : generateSocial(ACT1_WORKERS_SEED)));
  const [influence] = useState(() => carry?.influence ?? social.influence);
  const [workers, setWorkers] = useState(() => makeContractWorkers(carry?.workers));
  const [turn, setTurn] = useState(1);
  const [phase, setPhase] = useState("plan"); // plan, result, ratify
  const [leverage, setLeverage] = useState(0);
  const [issues, setIssues] = useState(CONTRACT_ISSUES.map(i => ({ id: i.id, tier: 0 })));
  const [planEntries, setPlanEntries] = useState([]);
  const [actionPlan, setActionPlan] = useState(null); // { tierKey, leadId }
  const [result, setResult] = useState(null);
  const [ratification, setRatification] = useState(null);
  const [decert, setDecert] = useState(null);
  // How many times each rung has been run, so repeating one pays what repeating is worth.
  const [rungUses, setRungUses] = useState({});
  // Months of "not yet" the company has banked, priced into everything you still want.
  const [stall, setStall] = useState(0);
  const [dead, setDead] = useState(null);
  const [selected, setSelected] = useState(null);
  const planKey = useRef(0);

  const cat = workers.filter(w => w.cat);
  // One-on-ones and recruiting come out of one person's three hours. A collective action
  // is prepped by the whole team, so it draws on the pool — otherwise the four-hour rung
  // could never be chosen by anybody, which is exactly the lock this replaced.
  const hoursUsed = (id) =>
    planEntries.filter(e => e.actorId === id).reduce((n, e) => n + (e.type === "oneOnOne" ? 2 : 3), 0);
  // A lead organizer out of Act One is still a lead organizer. Experience carries.
  const catHours = (w) => CAT_HOURS + (orgTier(w).bonusHours || 0);
  const hoursLeft = (w) => catHours(w) - hoursUsed(w.id);
  const totalHours = cat.reduce((n, o) => n + catHours(o), 0);
  const actionHours = actionPlan ? ACTION_LADDER.find(t => t.key === actionPlan.tierKey).hours : 0;
  const totalUsed = cat.reduce((n, o) => n + hoursUsed(o.id), 0) + actionHours;

  const tier = actionPlan ? ACTION_LADDER.find(t => t.key === actionPlan.tierKey) : null;
  // The player gets the range, never the number. The exact one is only ever used to
  // resolve the action itself.
  const projection = tier ? projectedTurnoutBand(workers, influence, tier, turn) : { lo: 0, hi: 0, exact: true };
  const unread = workers.filter(x => !contractRead(x, turn).exact).length;
  const issueDef = (id) => CONTRACT_ISSUES.find(i => i.id === id);
  const ratifyProjection = workers.reduce((n, w) => n + ratifyYesChance(w, issues), 0);
  const cooled = Math.floor(leverage * LEVERAGE_COOLING);
  const monthsLeft = CONTRACT_MONTHS - turn;

  function addPlan(actorId, type, targetId) {
    // One of each per person per month — stacking two recruits on the same worker just
    // burns hours, and it stacks up unreadably on their card.
    if (planEntries.some(e => e.type === type && e.targetId === targetId)) return;
    planKey.current += 1;
    setPlanEntries(p => [...p, { key: planKey.current, actorId, type, targetId }]);
  }
  function advanceIssue(id) {
    const cur = issues.find(i => i.id === id);
    const cost = stalledCost(issueDef(id).costs[cur.tier + 1], stall);
    if (cur.tier >= 2 || leverage < cost) return;
    setLeverage(l => l - cost);
    setIssues(list => list.map(i => (i.id === id ? { ...i, tier: i.tier + 1 } : i)));
  }

  function resolveTurn() {
    let w = workers.map(x => ({ ...x, participated: false }));
    const byId = (id) => w.find(x => x.id === id);
    const lines = [];
    const notes = {};
    let gained = 0;
    let stallNext = stall;
    const usesNext = { ...rungUses };

    planEntries.filter(e => e.type === "oneOnOne").forEach(e => {
      const a = byId(e.actorId), t = byId(e.targetId);
      if (!a || !t) return;
      const tie = tieOn(influence, a, t);
      // Somebody who loves this job is harder to move toward doing something about it.
      const drag = 1 - 0.35 * (t.fulfillment / 100);
      const gain = Math.max(1, Math.round(11 * (0.45 + 0.85 * (tie / 100)) * drag));
      const before = t.commitment;
      t.commitment = clamp(t.commitment + gain);
      t.spokenMonth = turn; // and now you know where they are, for a couple of months
      notes[t.id] = `${a.name} +${t.commitment - before}`;
      lines.push(`${a.name} sits down with ${t.name}. Commitment ${before} \u2192 ${t.commitment}, and it is a number rather than a range for the next ${CONTRACT_READ_FRESH} months.`);
    });

    planEntries.filter(e => e.type === "recruit").forEach(e => {
      const t = byId(e.targetId);
      if (!t || t.cat || t.commitment < CAT_JOIN_REQ) return;
      t.cat = true;
      t.monthsIdle = 0;
      notes[t.id] = "JOINS THE CAT";
      lines.push(`${t.name} joins the contract action team \u2014 ${catHours(t)} more hours a month, and everyone they can turn out.`);
    });

    let actionResult = null;
    if (tier) {
      const lead = byId(actionPlan.leadId);
      const showed = [];
      const sat = [];
      w.forEach(x => {
        const backing = catBacking(influence, w, x.id) + infOn(influence, lead.id, x.id) * 0.5;
        if (random() < participationChance(x, tier, backing)) { x.participated = true; showed.push(x); }
        else sat.push(x);
      });
      const share = showed.length / w.length;
      const strong = share >= tier.threshold;
      const uses = rungUses[tier.key] || 0;
      const fatigue = rungFatigue(uses);
      const timing = timingMult(tier, turn);
      usesNext[tier.key] = uses + 1;
      const raw = strong
        ? tier.payout * Math.min(1.35, share / tier.threshold)
        : tier.payout * 0.25 * (share / tier.threshold);
      const payout = Math.round(raw * fatigue * timing);
      gained = payout;
      // Everyone who turned up, you now know about. The people who stayed home you do
      // not — and they are exactly the people the next month has to be spent on.
      showed.forEach(x => { x.spokenMonth = turn; });
      if (strong) {
        // Fatigue is what the COMPANY stops noticing. It is not what standing next to
        // each other does for the people who turned up, so the floor still builds.
        const bump = 4;
        showed.forEach(x => { x.commitment = clamp(x.commitment + bump); x.thinRuns = 0; });
        stallNext = Math.max(0, stall - 1);
        lines.push(`${showed.length} of ${w.length} took part. The company's negotiator noticed, and the room changed. +${payout} leverage, +${bump} commitment to everyone who turned up, and a month comes off what they have banked.`);
      } else {
        w.forEach(x => { x.commitment = clamp(x.commitment - 3); if (x.cat) x.thinRuns = (x.thinRuns || 0) + 1; });
        stallNext = Math.min(STALL_MAX, stall + 1);
        lines.push(`Only ${showed.length} of ${w.length} took part, against the ${Math.round(tier.threshold * w.length)} this needed. A thin turnout is worse than none \u2014 it shows them exactly how little you can move. +${payout} leverage, \u22123 commitment across the floor.`);
      }
      if (uses > 0) lines.push(`AND THEY HAVE SEEN IT ${uses === 1 ? "ONCE" : `${uses} TIMES`} BEFORE \u2014 this rung pays ${Math.round(fatigue * 100)}% of what it paid the first time. A test only tests what the last one left open. Climbing is the only thing that keeps paying.`);
      if (timing !== 1) lines.push(timing > 1
        ? `AND THE TIMING IS THE WHOLE POINT \u2014 ${CONTRACT_MILESTONES[turn]} this month, so withholding labour is worth ${Math.round(timing * 100)}% of normal. This is the month they cannot afford you.`
        : `AND THE TIMING IS WRONG \u2014 no milestone this month, so withholding labour is worth ${Math.round(timing * 100)}% of normal. Nobody upstairs is counting the hours in a quiet month.`);
      actionResult = { tier, showed: showed.length, sat: sat.length, total: w.length, share, strong, payout, uses, fatigue, timing };
    } else {
      // A quiet month is not neutral. This is how units die.
      w.forEach(x => { if (!x.cat) x.commitment = clamp(x.commitment - 3); });
      stallNext = Math.min(STALL_MAX, stall + 1);
      lines.push("No action this month. Bargaining happened in a room nobody saw, and the floor drifted.");
    }

    // --- THE OTHER SIDE OF THE TABLE ---
    // They never have to agree. They have to outlast you, and they have three ways of
    // going about it. Each states its own numbers, the way every set piece in this game
    // does, because a cost you cannot see teaches nothing.
    if (stallNext > stall) {
      lines.push(
        `SURFACE BARGAINING \u2014 nothing moved them this month, so every tier you have not won gets ${Math.round(STALL_STEP * 100)}% dearer. ` +
        `That is ${stallNext} month${stallNext === 1 ? "" : "s"} of "not yet" now priced in, and the price does not come back down on its own. ` +
        `They are not refusing to bargain. Refusing would be illegal. They are agreeing to meet, at length, forever.`
      );
    }
    const buyable = w.filter(x => !x.cat && (x.bought || 0) <= 0 && x.commitment >= 20)
      .sort((a, b) => a.commitment - b.commitment);
    if (buyable.length && random() < 0.3) {
      const mark = buyable[0];
      const before = mark.commitment;
      const takeChance = Math.min(0.75, Math.max(0.1, (100 - before) / 90));
      if (random() < takeChance) {
        mark.commitment = clamp(before - 26);
        mark.bought = 3;
        notes[mark.id] = "TAKES THE OFFER";
        lines.push(
          `DIRECT DEALING \u2014 ${mark.name} is offered a raise and a title one to one, outside the contract. At ${before} commitment that was a ` +
          `${Math.round(takeChance * 100)}% chance of landing, and it landed: ${before} \u2192 ${mark.commitment}, and they sit out the next 3 actions. ` +
          `Going around the union like this is unlawful. Proving it takes longer than the certification year, which is the point.`
        );
      } else {
        mark.commitment = clamp(before + 6);
        mark.spokenMonth = turn;
        notes[mark.id] = "TURNS IT DOWN";
        lines.push(
          `DIRECT DEALING REFUSED \u2014 ${mark.name} is offered a raise outside the contract and brings the offer to the team instead. ` +
          `+6 commitment, and you know exactly where they stand now, which is worth as much as the six.`
        );
      }
    }
    if (actionResult && tier.rank >= 3 && actionResult.showed > 0 && random() < 0.35) {
      const pool = w.filter(x => x.participated && x.cat);
      const mark = pool.length
        ? [...pool].sort((a, b) => catBacking(influence, w, a.id) - catBacking(influence, w, b.id))[0]
        : null;
      if (mark) {
        mark.cat = false;
        mark.commitment = clamp(mark.commitment - 18);
        w.forEach(x => { if (x.id !== mark.id) x.commitment = clamp(x.commitment - 3); });
        notes[mark.id] = "WRITTEN UP";
        lines.push(
          `DISCIPLINE \u2014 ${BURN_NARRATIVES[rand(BURN_NARRATIVES.length)](mark.name)} ` +
          `${mark.name} comes off the action team, \u221218 commitment, and \u22123 across everybody who watched it happen. ` +
          `They picked the person on your team with the least standing behind them. This is what the top of the ladder costs, and it is why you do not climb it before the floor is with you.`
        );
      }
    }

    // --- A TEAM IS A SET OF PEOPLE WHO ARE ASKED TO DO THINGS ---
    w.forEach(x => {
      if (!x.cat) { x.monthsIdle = 0; return; }
      // Turning out for the action is doing something. Only somebody nobody asked for
      // anything at all — no conversation to run, no action to stand up in — drifts off.
      const used = planEntries.some(e => e.actorId === x.id) || actionPlan?.leadId === x.id || x.participated;
      x.monthsIdle = used ? 0 : (x.monthsIdle || 0) + 1;
      if (x.monthsIdle >= CAT_IDLE_QUIT) {
        x.cat = false;
        x.monthsIdle = 0;
        x.commitment = clamp(x.commitment - 8);
        notes[x.id] = "STEPS OFF THE TEAM";
        lines.push(`${x.name} stops coming to the meetings. Nobody has asked them to do anything in ${CAT_IDLE_QUIT} months, and they got the message.`);
      } else if ((x.thinRuns || 0) >= 2) {
        x.cat = false;
        x.thinRuns = 0;
        x.commitment = clamp(x.commitment - 6);
        notes[x.id] = "HAS HAD ENOUGH";
        lines.push(`${x.name} steps off the action team. Two actions running where they stood there with their name on it and almost nobody came is enough for anybody.`);
      }
    });
    w.forEach(x => { if ((x.bought || 0) > 0) x.bought -= 1; });

    setWorkers(w);
    setLeverage(l => l + gained);
    setRungUses(usesNext);
    setStall(stallNext);
    setResult({ lines, notes, action: actionResult, gained });
    setPhase("result");
  }

  function callRatification() {
    const yes = [];
    const no = [];
    workers.forEach(w => (random() < ratifyYesChance(w, issues) ? yes : no).push(w.name));
    setRatification({ yes: yes.length, no: no.length, passed: yes.length > no.length, month: turn });
    setPhase("ratify");
  }

  function runDecert() {
    const keep = [];
    const drop = [];
    workers.forEach(w => (random() < keepUnionChance(w, issues) ? keep : drop).push(w.name));
    setDecert({ keep: keep.length, drop: drop.length, survived: keep.length > drop.length });
    setPhase("decert");
  }

  // Who walks out of this act and into the company campaign: the action team, best
  // first. Four at most — beyond that the company campaign's week stops making sense.
  function contractLeaders() {
    return workers.filter(w => w.cat)
      .sort((a, b) => b.commitment - a.commitment)
      .slice(0, 4)
      .map(w => ({ name: w.name, trait: w.trait }));
  }
  function finish(outcome) {
    const payload = {
      ...outcome,
      tiers: contractTierSum(issues),
      max: CONTRACT_MAX_TIERS,
      leaders: contractLeaders(),
      issues: issues.map(i => ({ id: i.id, tier: i.tier })),
    };
    if (onComplete) onComplete(payload); else onExit();
  }

  function backToTable() {
    // A deal voted down isn't the end — you go back, with a floor that trusts you less.
    setWorkers(ws => ws.map(w => ({ ...w, commitment: clamp(w.commitment - 6) })));
    setRatification(null);
    setPhase("plan");
  }

  function nextTurn() {
    setPlanEntries([]);
    setActionPlan(null);
    if (turn >= CONTRACT_MONTHS) { runDecert(); return; }
    // Same promise as the other two acts: the moment the arithmetic dies, say so, and
    // say why. Here it dies when there is nobody left willing to put their name on
    // anything, because then there is nothing for the company to answer.
    if (!workers.some(x => x.cat)) {
      setDead(`There is nobody left on the contract action team. The company does not have to agree with an empty room \u2014 it only has to keep booking the meeting.`);
      return;
    }
    setLeverage(l => Math.floor(l * LEVERAGE_COOLING));
    setTurn(t => t + 1);
    setPhase("plan");
  }

  // The board speaks Act One's 1-5, but what it measures here is commitment: will this
  // person actually do something. Solid where the read is current (sat down with, or seen
  // at the last action), hollow where it has gone stale, as the member panel says.
  const boardWorkers = workers.map(w => ({
    ...w, support: w.commitment, organizer: w.cat, signed: w.participated, trueSupport: w.commitment,
  }));
  const contractGlyph = (w) => {
    if (w.burned) return { digit: null, state: "out", hex: "#57534e" };
    const r = contractRead(w, turn);
    const d = rating(r.mid);
    return { digit: d, state: r.exact ? "solid" : "hollow", hex: RATING_HEX[d], age: r.exact ? null : r.age };
  };
  const labels = { organizerLegend: "ON THE ACTION TEAM", signedLegend: "TURNED OUT LAST TIME", numberLegend: "COMMITMENT",
    hollowTip: "Nobody has sat down with them or seen them turn out lately. This is an old read." };
  const canResolve = planEntries.length > 0 || actionPlan;
  const overBudget = cat.some(o => hoursLeft(o) < 0) || totalUsed > totalHours;
  const poolLeft = totalHours - totalUsed;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-mono">
      <GlobalStyle />
      <div className="border-b-2 border-stone-800 bg-stone-900 px-4 py-3 sm:px-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-stencil text-2xl sm:text-3xl tracking-wide text-amber-400">THE FIRST CONTRACT</div>
          <div className="text-xs sm:text-sm tracking-[0.2em] text-stone-500">
            {carry ? "ACT TWO — CERTIFICATION IS NOT AGREEMENT" : "PROTOTYPE SLICE — NOT A FINISHED ACT"}
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
          <div className="text-center">
            <div className="text-stone-500 text-xs">MONTH</div>
            <div className="text-lg font-bold text-stone-100">{Math.min(turn, CONTRACT_MONTHS)} / {CONTRACT_MONTHS}</div>
          </div>
          <div className="text-center">
            <div className="text-stone-500 text-xs">THE CALENDAR</div>
            <div className={`text-lg font-bold ${CONTRACT_MILESTONES[turn] ? "text-amber-400" : "text-stone-500"}`}>
              {CONTRACT_MILESTONES[turn] ? "MILESTONE" : "quiet"}
            </div>
            <div className="text-[11px] text-stone-600">
              {CONTRACT_MILESTONES[turn] || `next: month ${Object.keys(CONTRACT_MILESTONES).map(Number).find(m => m > turn) ?? "\u2014"}`}
            </div>
          </div>
          <div className="text-center">
            <div className="text-stone-500 text-xs">CERT YEAR</div>
            <div className={`text-lg font-bold ${monthsLeft <= 2 ? "text-red-500" : monthsLeft <= 4 ? "text-amber-400" : "text-teal-400"}`}>{Math.max(0, monthsLeft)} left</div>
          </div>
          <div className="text-center">
            <div className="text-stone-500 text-xs">LEVERAGE</div>
            <div className="text-lg font-bold text-amber-400">{leverage}</div>
            <div className="text-[11px] text-stone-600">cools to {cooled}</div>
          </div>
          <div className="text-center">
            <div className="text-stone-500 text-xs">CONTRACT</div>
            <div className="text-lg font-bold text-teal-400">{contractTierSum(issues)} / {CONTRACT_MAX_TIERS}</div>
          </div>
          <div className="text-center">
            <div className="text-stone-500 text-xs">ACTION TEAM</div>
            <div className="text-lg font-bold text-stone-100">{cat.length}</div>
            <div className="text-[11px] text-stone-600">{totalHours} hrs</div>
          </div>
        </div>
      </div>

      {phase === "ratify" && ratification && (
        <OutcomeScreen
          tone={ratification.passed ? "win" : "loss"}
          title={ratification.passed ? "RATIFIED" : "VOTED DOWN"}
          tally={{ yes: ratification.yes, no: ratification.no }}
          meta={{ line: `${contractTierSum(issues)} of ${CONTRACT_MAX_TIERS} tiers won across three issues.` }}
          beats={[
            { lines: ratification.passed
              ? ["The membership ratifies. This floor has a contract — the first one is always the hardest, and most units never get here."]
              : ["The membership votes it down. You bargained a deal the people who have to live under it wouldn't accept.", turn >= CONTRACT_MONTHS ? "And the certification year is gone." : "You can go back to the table — but the clock doesn't stop, and the floor trusts you a little less."] },
            { lines: [
              `Wages: ${issueDef("wages").tiers[issues.find(i => i.id === "wages").tier]}.`,
              `Just cause: ${issueDef("justcause").tiers[issues.find(i => i.id === "justcause").tier]}.`,
            ]},
            { lines: [`Play-Eye: ${issueDef("ai").tiers[issues.find(i => i.id === "ai").tier]}.`], quiet: true },
          ]}
          actions={ratification.passed || turn >= CONTRACT_MONTHS ? (
            <button onClick={() => finish({ ratified: ratification.passed, survived: true })} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
              {onComplete ? "TAKE IT TO THE OTHER STUDIOS" : "BACK TO THE GAME"}
            </button>
          ) : (
            <>
              <button onClick={backToTable} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">BACK TO THE TABLE</button>
              <button onClick={onExit} className="font-stencil text-xl border-2 border-stone-700 hover:border-stone-500 text-stone-300 px-8 py-3 tracking-wide transition-colors">LEAVE IT</button>
            </>
          )}
        />
      )}

      {phase === "decert" && decert && (
        <OutcomeScreen
          tone={decert.survived ? "win" : "loss"}
          title={decert.survived ? "STILL A UNION" : "DECERTIFIED"}
          tally={{ yes: decert.keep, no: decert.drop }}
          meta={{ line: `The certification year ran out with ${contractTierSum(issues)} of ${CONTRACT_MAX_TIERS} tiers won and no contract.` }}
          beats={[
            { lines: decert.survived
              ? ["A year of bargaining with nothing signed, and the company petitioned to decertify. The floor held anyway — barely.",
                 "You keep the union. You still don't have a contract, and now everyone knows how long the company is willing to wait."]
              : ["A year of bargaining produced nothing anyone could hold, and enough of the floor voted to be rid of it.",
                 "This is how most first contracts actually fail. Not a lost strike — a year of meetings nobody could see."] },
            { lines: ["The employer never has to agree. They only have to outlast you, and twelve months is not a long time to wait."], quiet: true },
          ]}
          actions={decert.survived
            ? <button onClick={() => finish({ ratified: false, survived: true })} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
                {onComplete ? "TAKE IT TO THE OTHER STUDIOS" : "BACK TO THE GAME"}
              </button>
            // Decertified is an ending, not a doorway. The unit you spent two acts
            // building does not exist any more, and nothing carries out of that.
            : <button onClick={onExit} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">START OVER</button>}
        />
      )}

      {dead && (
        <div className="fixed inset-0 bg-stone-950/95 z-50 flex items-center justify-center px-6">
          <div className="max-w-lg text-center anim-rise">
            <div className="font-stencil text-5xl mb-4 text-red-500">NOBODY LEFT TO ASK</div>
            <p className="text-stone-400 mb-4 leading-relaxed">{dead}</p>
            <p className="text-red-400/80 text-sm mb-6 leading-relaxed border border-red-900/60 bg-red-950/20 px-4 py-3">
              Called at month {turn} of {CONTRACT_MONTHS}, with {contractTierSum(issues)} of {CONTRACT_MAX_TIERS} tiers won. There is
              still calendar left, but no campaign to run on it — so the rest of the year would not have changed the ending.
            </p>
            <button onClick={onExit} className="border-2 border-stone-600 px-6 py-2 text-sm text-stone-200 hover:bg-stone-800 transition-colors">
              START OVER
            </button>
          </div>
        </div>
      )}

      {(phase === "plan" || phase === "result") && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          {turn === 1 && phase === "plan" && (
            <div className="mb-4 flex items-start gap-2 text-stone-300 text-sm border border-stone-700 bg-stone-900/60 px-3 py-2">
              <Megaphone size={14} className="shrink-0 mt-0.5" />
              {/* Two lines. Everything this used to explain — what repetition pays, what a
                  milestone month is worth, what the number on a card measures — is now on
                  the board itself, live and numeric, where it is still there in month 9. */}
              <span>
                You won the election. Now the company has to bargain — <span className="text-stone-100 font-bold">but not to agree</span>.
                Run an action; the turnout you get is the only argument they answer to.</span>
            </div>
          )}

          {/* THE TABLE */}
          <div className="border-2 border-stone-800 bg-stone-900 p-4 mb-6">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="font-stencil text-lg tracking-wide text-stone-200">AT THE TABLE</div>
              <div className="text-sm text-stone-400 max-w-md text-right">
                Spend leverage to move an issue. You will not be able to afford everything — and it cools 20% a month if you sit on it.
                {stall > 0 && <span className="text-red-400"> Every price here is {Math.round(STALL_STEP * stall * 100)}% above list: {stall} month{stall === 1 ? "" : "s"} of them agreeing to meet and settling nothing.</span>}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {CONTRACT_ISSUES.map(def => {
                const cur = issues.find(i => i.id === def.id);
                const maxed = cur.tier >= 2;
                const base = maxed ? null : def.costs[cur.tier + 1];
                const cost = maxed ? null : stalledCost(base, stall);
                const afford = !maxed && leverage >= cost;
                return (
                  <div key={def.id} className={`border p-2.5 ${maxed ? "border-teal-800 bg-teal-950/20" : "border-stone-700"}`}>
                    <div className="text-xs tracking-wide text-stone-500 mb-1">{def.label}</div>
                    <div className="text-sm text-stone-200 leading-snug mb-2 min-h-[3rem]">{def.tiers[cur.tier]}</div>
                    <div className="flex items-center gap-1 mb-2">
                      {[0, 1, 2].map(t => (
                        <div key={t} className={`h-1 flex-1 ${t <= cur.tier ? "bg-teal-500" : "bg-stone-800"}`} />
                      ))}
                    </div>
                    {maxed ? (
                      <div className="text-xs text-teal-400 font-bold">WON</div>
                    ) : (
                      <button
                        onClick={() => advanceIssue(def.id)}
                        disabled={!afford}
                        className={`w-full text-sm py-1.5 tracking-wide transition-colors ${afford ? "bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold" : "border border-stone-800 text-stone-600 cursor-not-allowed"}`}
                      >
                        PUSH IT — {cost}{stall > 0 && base !== cost ? ` (was ${base})` : ""} LEVERAGE
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {phase === "plan" && turn >= 2 && (
            <div className={`mb-6 border-2 px-3 py-3 ${monthsLeft <= 3 ? "border-red-700 bg-red-950/20" : "border-teal-800 bg-teal-950/10"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[17rem]">
                  <div className={`font-stencil text-lg tracking-wide ${monthsLeft <= 3 ? "text-red-400" : "text-teal-400"}`}>
                    {monthsLeft <= 3 ? `THE CERTIFICATION YEAR ENDS IN ${Math.max(0, monthsLeft)} MONTH${monthsLeft === 1 ? "" : "S"}` : "YOU CAN TAKE THE DEAL YOU HAVE"}
                  </div>
                  <div className="text-xs text-stone-400 leading-relaxed mt-1">
                    You've won <span className="text-stone-100 font-bold">{contractTierSum(issues)} of {CONTRACT_MAX_TIERS}</span> tiers. Put it to a ratification vote whenever you like — the members vote on what you actually brought back.
                    Today it projects <span className="text-teal-400 font-bold">~{Math.round(ratifyProjection)} yes</span> to <span className="text-red-400 font-bold">~{workers.length - Math.round(ratifyProjection)} no</span>.
                    {monthsLeft <= 3 && " Reach month 12 with no contract and the company petitions to decertify the union."}
                  </div>
                </div>
                <button
                  onClick={callRatification}
                  className={`font-stencil text-base px-5 py-2.5 tracking-wide transition-colors shrink-0 ${monthsLeft <= 3 ? "bg-red-600 hover:bg-red-500 text-stone-950" : "bg-teal-600 hover:bg-teal-500 text-stone-950"}`}
                >
                  PUT IT TO A VOTE
                </button>
              </div>
            </div>
          )}

          <Act1FloorMap
            workers={boardWorkers}
            weekNow={1}
            influence={influence}
            social={social}
            glyphOf={contractGlyph}
            planEntries={planEntries}
            planLabel={(e) => (e.type === "oneOnOne" ? "1:1" : "recruit")}
            onSelect={(w) => phase === "plan" && setSelected(w)}
            notes={phase === "result" ? result?.notes : null}
            stepKey={turn}
            labels={labels}
            ladder={CONTRACT_LADDER}
            rungOf={(w) => contractLadderOf(w, turn)}
            hoursLeft={phase === "plan" ? Object.fromEntries(cat.map(o => [o.id, hoursLeft(o)])) : null}
          />

          {phase === "result" ? (
            <div className="border-2 border-amber-700 bg-stone-900 p-4">
              {result.action ? (
                <>
                  <div className="font-stencil text-xl tracking-wide text-amber-400 mb-1">{result.action.tier.label.toUpperCase()}</div>
                  <div className="flex items-end gap-3 mb-2">
                    <div className={`font-stencil text-5xl ${result.action.strong ? "text-teal-400" : "text-red-400"}`}>{result.action.showed}</div>
                    <div className="text-stone-500 text-lg mb-1">of {result.action.total} took part</div>
                    <div className="ml-auto text-right">
                      <div className="text-xs text-stone-500">LEVERAGE GAINED</div>
                      <div className="text-2xl font-bold text-amber-400">+{result.gained}</div>
                    </div>
                  </div>
                  <div className="h-2 bg-stone-800 mb-1">
                    <div className={result.action.strong ? "h-full bg-teal-500" : "h-full bg-red-500"} style={{ width: `${result.action.share * 100}%` }} />
                    <div className="relative" style={{ marginTop: -8, marginLeft: `${result.action.tier.threshold * 100}%`, width: 2, height: 8, background: "#e7e5e4" }} />
                  </div>
                  <div className="text-xs text-stone-500 mb-3">The white mark is what this action needed to land: {Math.round(result.action.tier.threshold * 100)}%.</div>
                </>
              ) : (
                <div className="font-stencil text-xl tracking-wide text-stone-400 mb-2">A QUIET MONTH</div>
              )}
              <div className="bg-stone-950/60 border border-stone-800 p-2 space-y-0.5 max-h-40 overflow-y-auto mb-3">
                {result.lines.map((l, i) => <div key={i} className="text-xs text-stone-400">▸ {l}</div>)}
              </div>
              <button onClick={nextTurn} className="w-full font-stencil text-lg bg-amber-500 hover:bg-amber-400 text-stone-950 py-2.5 tracking-wide transition-colors">
                {turn >= CONTRACT_MONTHS ? "THE CERTIFICATION YEAR IS UP" : "NEXT MONTH"}
              </button>
            </div>
          ) : (
            <>
              {/* THE ACTION */}
              <div className="border-2 border-stone-800 bg-stone-900 p-4 mb-4">
                <div className="font-stencil text-lg tracking-wide text-stone-200 mb-1">CALL AN ACTION</div>
                <p className="text-xs text-stone-500 mb-3">
                  One per month. Pick who leads it — the people they carry weight with are likelier to show.
                  {unread > 0
                    ? <span className="text-amber-500"> Turnout is a range because {unread} {unread === 1 ? "person hasn't" : "people haven't"} been sat down with
                      or seen at an action lately. Running one is how you find out — but only about the people who turn up.</span>
                    : <span className="text-teal-500"> Every read on this floor is current, so these numbers are as good as they get.</span>}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 mb-3">
                  {ACTION_LADDER.map(t => {
                    const chosen = actionPlan?.tierKey === t.key;
                    const proj = projectedTurnoutBand(workers, influence, t, turn);
                    // Green only when even the pessimistic end of the range clears it.
                    const need = t.threshold * workers.length;
                    const lands = proj.lo >= need;
                    const maybe = !lands && proj.hi >= need;
                    const uses = rungUses[t.key] || 0;
                    const timing = timingMult(t, turn);
                    // Prep comes out of the pool, so a rung the team can't cover this month
                    // shouldn't be selectable — better than letting the plan go over and
                    // then refusing to resolve it.
                    const affordable = chosen || t.hours <= poolLeft + actionHours;
                    return (
                      <button
                        key={t.key}
                        disabled={!affordable}
                        onClick={() => setActionPlan(a => (a?.tierKey === t.key ? null : { tierKey: t.key, leadId: a?.leadId ?? cat[0]?.id }))}
                        className={`text-left border-2 p-2.5 transition-colors ${chosen ? "border-amber-500 bg-amber-950/30" : affordable ? "border-stone-700 hover:bg-stone-800/60" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-stone-100 font-bold">{t.label}</span>
                          <span className="text-xs text-stone-500">{t.hours}h</span>
                        </div>
                        <div className="text-xs text-stone-400 leading-snug mt-0.5">{t.blurb}</div>
                        {(uses > 0 || timing !== 1) && (
                          <div className="text-xs mt-1 text-amber-500 leading-snug">
                            {uses > 0 && <>Run {uses === 1 ? "once" : `${uses} times`} already — pays {Math.round(rungFatigue(uses) * 100)}%. </>}
                            {timing > 1 && <>{CONTRACT_MILESTONES[turn]} this month — worth {Math.round(timing * 100)}%.</>}
                            {timing < 1 && <>No milestone this month — worth {Math.round(timing * 100)}%.</>}
                          </div>
                        )}
                        <div className={`text-xs mt-1 ${lands ? "text-teal-400" : maybe ? "text-amber-400" : "text-red-400"}`}>
                          {proj.lo === proj.hi ? `~${proj.lo}` : `${proj.lo}\u2013${proj.hi}`} of {workers.length} · needs {Math.round(t.threshold * workers.length)} to land
                        </div>
                      </button>
                    );
                  })}
                </div>
                {tier && (
                  <div className="border border-stone-700 bg-stone-950/60 p-2.5">
                    <div className="text-xs text-stone-500 tracking-wide mb-1.5">WHO LEADS IT</div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.map(o => (
                        <button
                          key={o.id}
                          onClick={() => setActionPlan(a => ({ ...a, leadId: o.id }))}
                          className={`border px-2 py-1 text-[13px] transition-colors ${actionPlan.leadId === o.id ? "border-amber-500 bg-amber-950/30 text-stone-100" : "border-stone-700 text-stone-400 hover:bg-stone-800/60"}`}
                        >
                          {o.name}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-amber-400 mt-2">
                      Turnout with this lead: {projection.lo === projection.hi ? `~${projection.lo}` : `${projection.lo}\u2013${projection.hi}`} of {workers.length}.
                      {unread > 0 && <span className="text-stone-500"> The range is that wide because {unread} {unread === 1 ? "person hasn't" : "people haven't"} been
                        sat down with or seen at an action recently. Running it is how you find out.</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* HOURS */}
              <div className="border-2 border-stone-800 bg-stone-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-stencil text-lg tracking-wide text-stone-200">PLAN MONTH {turn}</div>
                  <div className={`text-base font-bold ${overBudget ? "text-red-500" : totalUsed === totalHours ? "text-teal-400" : "text-amber-400"}`}>{totalUsed} / {totalHours} HOURS</div>
                </div>
                <p className="text-xs text-stone-500 mb-3">
                  Click anyone on the board for a one-on-one, or to bring them onto the action team. Each person has {CAT_HOURS} hours of their own;
                  the action's prep comes out of the team's pool{actionHours > 0 ? ` (${actionHours}h this month)` : ""}.
                </p>
                <div className="space-y-2 mb-3">
                  {cat.map(o => {
                    const mine = planEntries.filter(e => e.actorId === o.id);
                    const leading = actionPlan?.leadId === o.id ? ACTION_LADDER.find(t => t.key === actionPlan.tierKey) : null;
                    const left = hoursLeft(o);
                    return (
                      <div key={o.id} className={`border px-3 py-2 ${left < 0 ? "border-red-700 bg-red-950/20" : "border-stone-700"}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-amber-400">{o.name} <span className="text-stone-500 font-normal">({TEAM_LABEL[o.team]})</span></span>
                          <span className={`text-xs font-bold ${left < 0 ? "text-red-400" : left === 0 ? "text-teal-400" : "text-stone-400"}`}>{left} of {catHours(o)} hrs left</span>
                        </div>
                        {leading && <div className="text-xs text-amber-300 mt-1">▸ Leads: {leading.label} <span className="text-stone-600">(team prep, {leading.hours}h from the pool)</span></div>}
                        {mine.map(e => (
                          <div key={e.key} className="flex items-center justify-between text-xs text-stone-300 mt-0.5">
                            <span>▸ {e.type === "oneOnOne" ? "One-on-one" : "Bring onto the action team"} — {workers.find(x => x.id === e.targetId)?.name} <span className="text-stone-600">({e.type === "oneOnOne" ? 2 : 3}h)</span></span>
                            <button onClick={() => setPlanEntries(p => p.filter(x => x.key !== e.key))} className="text-stone-600 hover:text-red-400">✕</button>
                          </div>
                        ))}
                        {!leading && mine.length === 0 && <div className="text-xs text-stone-600 italic mt-1">Idle this month.</div>}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={resolveTurn}
                  disabled={!canResolve || overBudget}
                  className={`w-full font-stencil text-lg py-2.5 tracking-wide transition-colors ${!canResolve || overBudget ? "bg-stone-800 text-stone-600 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-400 text-stone-950"}`}
                >
                  {overBudget ? "OVER BUDGET" : canResolve ? `RESOLVE MONTH ${turn}` : "PLAN SOMETHING FIRST"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {selected && phase === "plan" && (() => {
        const w = workers.find(x => x.id === selected.id);
        const backing = catBacking(influence, workers, w.id);
        const actors = cat.filter(o => o.id !== w.id);
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={() => setSelected(null)}>
            <div className="bg-stone-900 border-2 border-stone-700 max-w-md w-full p-5 my-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-stencil text-2xl text-amber-400">{w.name}</div>
                <button onClick={() => setSelected(null)}><X size={18} className="text-stone-500 hover:text-stone-200" /></button>
              </div>
              <p className="text-sm text-stone-400 mb-3">{w.hook}</p>
              {(() => {
                const r = contractRead(w, turn);
                return (
                  <StatRow label="COMMITMENT" value={r.exact ? r.mid : `${r.lo}\u2013${r.hi}`} hex={supportTier(r.mid).hex} align="left"
                    info="Whether this person will actually do something — not whether they support the union. They already voted yes; commitment is what turns that into showing up. You only get a number for somebody you have sat down with recently, or who turned out at the last action. Everyone else is a range, and it widens."
                    sub={r.exact ? "Read is current." : `Nobody has sat down with them or seen them turn out in ${r.age} months. This is an estimate.`} />
                );
              })()}
              <StatRow label="JOB FULFILLMENT" value={w.fulfillment} hex={FULFILL_HEX} align="left"
                info="Still decides who can move them. It also decides how far they'll go: somebody who loves this job will sign a letter but won't hold a milestone hostage."
                sub={`${fulfillmentLabel(w.fulfillment)} — expect them at the low rungs, not the high ones.`} />
              <div className="text-xs text-stone-400 border-t border-stone-800 pt-2 mb-3">
                {backing} points of influence on them comes from the action team. That's what pulls them out on the day.
              </div>
              <div className="text-xs text-stone-500 tracking-wide mb-1">TURNOUT ODDS</div>
              <div className="grid grid-cols-2 gap-1 mb-3">
                {ACTION_LADDER.map(t => (
                  <div key={t.key} className="text-xs text-stone-400 border border-stone-800 px-2 py-1">
                    {t.label}: <span className="text-stone-200 font-bold">{(() => {
                      const r = contractRead(w, turn);
                      const lo = Math.round(participationChance({ ...w, commitment: r.lo }, t, backing) * 100);
                      const hi = Math.round(participationChance({ ...w, commitment: r.hi }, t, backing) * 100);
                      return lo === hi ? `${lo}%` : `${lo}\u2013${hi}%`;
                    })()}</span>
                  </div>
                ))}
              </div>
              {w.cat ? (
                <div className="text-sm text-amber-400">Already on the contract action team.</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-stone-500 tracking-wide">WHO DOES IT</div>
                  <div className="flex flex-wrap gap-1.5">
                    {actors.map(o => (
                      <button key={o.id} onClick={() => { addPlan(o.id, "oneOnOne", w.id); setSelected(null); }}
                        disabled={hoursLeft(o) < 2 || poolLeft < 2}
                        className={`border px-2 py-1 text-[13px] transition-colors ${hoursLeft(o) < 2 || poolLeft < 2 ? "border-stone-800 text-stone-700 cursor-not-allowed" : "border-stone-700 text-stone-300 hover:bg-stone-800/60"}`}>
                        {o.name} <span className="text-stone-600">· inf {infOn(influence, o.id, w.id)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-stone-500">Click a name to spend 2 of their hours on a one-on-one.</div>
                  <button
                    onClick={() => { const o = actors.find(x => hoursLeft(x) >= 3); if (o) { addPlan(o.id, "recruit", w.id); setSelected(null); } }}
                    disabled={w.commitment < CAT_JOIN_REQ || !actors.some(x => hoursLeft(x) >= 3) || poolLeft < 3}
                    className={`w-full text-left border-2 px-3 py-2 transition-colors ${w.commitment >= CAT_JOIN_REQ && actors.some(x => hoursLeft(x) >= 3) && poolLeft >= 3 ? "border-amber-700 hover:bg-amber-950/30" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                  >
                    <div className="text-sm text-amber-300">Bring onto the contract action team <span className="text-stone-500">3h</span></div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      {w.commitment < CAT_JOIN_REQ
                        ? `Needs ${CAT_JOIN_REQ} commitment — they're at ${w.commitment}.`
                        : `+${CAT_HOURS} hours a month, and everyone they can turn out becomes yours.`}
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div className="fixed bottom-2 right-2 z-40">
        <button onClick={onExit} className="text-xs text-stone-600 hover:text-stone-400 underline transition-colors">
          {carry ? "Start over from the shop floor" : "Leave the prototype"}
        </button>
      </div>
    </div>
  );
}

export { ContractPrototype };
