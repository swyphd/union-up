// Act One: the card drive and the election campaign, one shop.
import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, Eye, Vote, Megaphone, UsersRound } from "lucide-react";
import { GlobalStyle, IntroSequence, OutcomeRoster, OutcomeScreen, splitLinesByEntity } from "../shared.jsx";
import { random } from "../../engine/rng.js";
import { ACT1_INTRO_BEATS, IntroCommitteeVisual, IntroInfluenceVisual } from "./intro.jsx";
import { Act1FloorMap, ORG_LAYOUT } from "./FloorMap.jsx";
import { Act1WorkerModal } from "./WorkerPanel.jsx";
import { makeAct1Workers } from "../../engine/act1/influence.js";
import { CIRCLES, generateSocial, isKnownFriend, vouchFor } from "../../engine/act1/friends.js";
import { activeLeaks, coverageGaps, recentlyTipped } from "../../engine/act1/coverage.js";
import { seenCircle } from "../../engine/act1/fallout.js";
import { TEAM_HEX, TEAM_LABEL, ACT1_CARDS_NEEDED, ACT1_CARD_THRESHOLD, ACT1_HOURS_PER_ORGANIZER, ACT1_PUBLIC_UNLOCK_WEEK, ACT1_RECRUIT_REQ, ACT1_SHIP_WEEK, ACT1_TOTAL_WORKERS, ACT1_WORKERS_SEED, act1Stars, cardStaleSoon } from "../../engine/act1/constants.js";
import { committeeHours, orgTier } from "../../engine/act1/committee.js";
import { ACT1_ACTION } from "../../engine/act1/actions.js";
import { resolveWeek as runWeek } from "../../engine/act1/resolveWeek.js";
import { ACT1_SAVE_KEY } from "../../save.js";
import { ELECTION_WEEKS, readOf, recognitionChance, voteProjection } from "../../engine/act1/election.js";
import { CONSULTANT_MAX_EACH, CONSULTANT_NAME, CONSULTANT_SETPIECE_GAP, KIRKMAN_SIGHT, OUTSIDERS, act1Winnability } from "../../engine/act1/consultant.js";
import { AFF_BY_ID } from "../../engine/act1/affinities.js";

function ActOneGame({ onGraduate, onSkipToCompany }) {
  const [week, setWeek] = useState(1);
  const [phase, setPhase] = useState("intro"); // intro, plan, resolving, victory
  // The floor's social structure is rolled once and never re-rolled: who is friends with
  // whom is the thing the whole act is about learning. `influence` is derived from it.
  const [social, setSocial] = useState(() => generateSocial(ACT1_WORKERS_SEED));
  const influence = social.influence;
  const [workers, setWorkers] = useState(() => makeAct1Workers(social));
  const [planEntries, setPlanEntries] = useState([]); // {key, actorId, type, targetId?}
  const [heat, setHeat] = useState(0);
  const [consultant, setConsultant] = useState({ active: false, arrivedWeek: null, lastSetPiece: 0, raises: 0, threats: 0, perks: 0 });
  const [perks, setPerks] = useState([]); // { id, until } — company perks currently poisoning an affinity
  // Which rungs of the outsider ladder have already arrived. They never leave.
  const [outsiders, setOutsiders] = useState([]);
  const [resolutionSteps, setResolutionSteps] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedWorker, setSelectedWorker] = useState(null);
  // Target-first: click anyone and the panel opens with the best organizer picked. Dragging
  // a committee card onto somebody opens the same panel with that pair locked.
  const [pairActorId, setPairActorId] = useState(null);
  // Org chart or social map. One choice for both the planning board and the playback.
  const [boardView, setBoardView] = useState("org");
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [wonOnWeek, setWonOnWeek] = useState(null);
  // "drive" = collecting cards toward the 30% petition threshold. "campaign" = petition
  // filed, clock running to the ballot.
  const [stage, setStage] = useState("drive");
  const [filedWeek, setFiledWeek] = useState(null);
  const [electionWeek, setElectionWeek] = useState(null);
  const [voteResult, setVoteResult] = useState(null);
  const [showFilePrompt, setShowFilePrompt] = useState(false);
  const [sawFilePrompt, setSawFilePrompt] = useState(false);
  const pendingRef = useRef(null);
  const planKeyRef = useRef(0);


  const organizers = workers.filter(w => w.organizer && !w.burned);
  // Burned workers stay counted: they signed, and the petition doesn't un-sign them.
  // A burn already costs an organizer, their reach, and support across everyone they
  // carried — clawing the signature back on top of that made one bad roll unrecoverable.
  const signedCount = workers.filter(w => w.signed).length;
  const hoursFor = (w) => committeeHours(w);
  const hoursUsedBy = (id) => planEntries.filter(e => e.actorId === id).reduce((s, e) => s + ACT1_ACTION[e.type].hours, 0);
  const hoursLeftFor = (w) => hoursFor(w) - hoursUsedBy(w.id);
  const totalHours = organizers.reduce((s, o) => s + hoursFor(o), 0);
  const totalUsed = planEntries.reduce((s, e) => s + ACT1_ACTION[e.type].hours, 0);

  // Progressive unlocks — a mechanic introduces itself the week it first matters.
  // Public actions stay locked for the first three weeks: the opening of a drive is
  // one-on-one work, and handing over the visible options early lets a player skip it.
  const unlockPublic = week >= ACT1_PUBLIC_UNLOCK_WEEK;
  const anyPublicDone = workers.some(w => w.history.some(h => h.includes("public")));
  // Somebody who signed and has a friend on the committee, or a signed friend in common.
  const anyRecruitable = workers.some(w => w.signed && !w.organizer && !w.burned
    && organizers.some(o => isKnownFriend(o, w.id) || vouchFor(o, w, workers)));
  const tippedOff = recentlyTipped(workers, week);
  // A leak hands him the map whatever the heat, and the banner does not pretend otherwise.
  const leakFeedsHim = activeLeaks(workers).length > 0;
  const gaps = coverageGaps(workers, social);

  const resStep = phase === "resolving" && resolutionSteps.length > 0 ? resolutionSteps[stepIndex] : null;
  const resHighlights = {};
  if (resStep) {
    const prevSnapshot = stepIndex > 0 ? resolutionSteps[stepIndex - 1].workers : workers;
    resStep.workers.forEach(cw => {
      const pw = prevSnapshot.find(x => x.id === cw.id);
      if (!pw) return;
      const delta = cw.support - pw.support;
      const signed = cw.signed && !pw.signed;
      const burned = cw.burned && !pw.burned;
      if (delta !== 0 || signed || burned) resHighlights[cw.id] = { delta, signed, burned };
    });
  }
  const resLogRef = useRef(null);
  useEffect(() => {
    if (resLogRef.current) resLogRef.current.scrollTop = resLogRef.current.scrollHeight;
  }, [stepIndex, phase]);

  useEffect(() => {
    if (phase !== "resolving" || resolutionSteps.length === 0) return;
    const step = resolutionSteps[stepIndex];
    const lineCount = step.lines?.length || 0;
    const duration = lineCount === 0 ? 200 : Math.min(2600, 900 + lineCount * 250);
    const t = setTimeout(() => {
      if (stepIndex < resolutionSteps.length - 1) setStepIndex(i => i + 1);
      else commitWeek();
    }, duration);
    return () => clearTimeout(t);
  }, [phase, stepIndex, resolutionSteps]);

  // Full sentences go in the log; the board gets a short tag per person so the floating
  // notes stay legible instead of overlapping into each other.
  const resNotes = resStep?.notes || {};
  const { banner: resBanner } = resStep
    ? splitLinesByEntity(resStep.lines, resStep.workers.map(w => ({ id: w.id, name: w.name })))
    : { banner: [] };

  function addPlan(actorId, type, targetId = null) {
    planKeyRef.current += 1;
    setPlanEntries(prev => [...prev, { key: planKeyRef.current, actorId, type, targetId }]);
  }
  function removePlan(key) {
    setPlanEntries(prev => prev.filter(e => e.key !== key));
  }

  // ---------- WEEK RESOLUTION ----------
  function resolveWeek() {
    const { steps, pending } = runWeek(
      { workers, influence, social, week, stage, heat, consultant, perks, outsiders, electionWeek },
      planEntries,
    );
    setResolutionSteps(steps);
    setStepIndex(0);
    setPhase("resolving");
    pendingRef.current = pending;
  }

  function commitWeek() {
    const { workers: w, heat: h, consultant: c, ballot, outsidersNext, perksNext, reachedThreshold, social: socialNext } = pendingRef.current;
    setWorkers(w);
    // Friendships can end in a week; the floor's structure moves on with everything else.
    if (socialNext) setSocial(socialNext);
    setHeat(h);
    setConsultant(c);
    setOutsiders(outsidersNext);
    setPerks(perksNext);
    setPlanEntries([]);
    if (ballot) {
      setVoteResult(ballot);
      setWonOnWeek(week);
      setPhase(ballot.won ? "victory" : "defeat");
      return;
    }
    setWeek(wk => wk + 1);
    // The first time the petition threshold is crossed, stop and make the player choose.
    if (reachedThreshold && !sawFilePrompt) {
      setSawFilePrompt(true);
      setShowFilePrompt(true);
    }
    setPhase("plan");
  }

  function startOver() {
    setWeek(1);
    const fresh = generateSocial(ACT1_WORKERS_SEED);
    setSocial(fresh);
    setWorkers(makeAct1Workers(fresh));
    setPlanEntries([]);
    setHeat(0);
    setConsultant({ active: false, arrivedWeek: null, lastSetPiece: 0, raises: 0, threats: 0, perks: 0 });
    setPerks([]);
    setStage("drive");
    setFiledWeek(null);
    setElectionWeek(null);
    setVoteResult(null);
    setShowFilePrompt(false);
    setSawFilePrompt(false);
    setResolutionSteps([]);
    setStepIndex(0);
    setSelectedWorker(null);
    setWonOnWeek(null);
    setConfirmStartOver(false);
    setPhase("intro");
  }

  // What Act One hands forward. Not four names and a trait each — the floor itself:
  // who these people are, where they actually stand, what you found out they have in
  // common, and the map of who listens to whom that took twenty weeks to draw. The next
  // act is the same twenty people in the same building; there is no honest reason for
  // any of it to be rolled again.
  function graduate(persist = true) {
    const committee = workers
      .filter(w => w.organizer && !w.burned)
      .slice(0, 4)
      .map(w => ({ name: w.name, trait: w.trait }));
    onGraduate({ leaders: committee, workers, influence, social, week }, persist);
  }

  const cardShare = signedCount / ACT1_TOTAL_WORKERS;
  const canFile = stage === "drive" && signedCount >= ACT1_CARDS_NEEDED;
  const projection = voteProjection(workers);
  const readCounts = (() => {
    const live = workers.filter(x => !x.burned);
    return { live: live.length, exact: live.filter(x => readOf(x, week).exact).length };
  })();
  const weeksToVote = electionWeek != null ? electionWeek - week : null;

  function fileWithNLRB() {
    setShowFilePrompt(false);
    setStage("campaign");
    setFiledWeek(week);
    setElectionWeek(week + ELECTION_WEEKS);
    // Nobody sits out their own election. If management hadn't hired anyone yet, they do
    // the day the petition lands.
    setConsultant(c => (c.active ? c : { ...c, active: true, arrivedWeek: week }));
    const share = signedCount / ACT1_TOTAL_WORKERS;
    if (random() < recognitionChance(share, consultant.active, heat)) {
      setPhase("recognized");
      setWonOnWeek(week);
    } else {
      setPhase("filed");
    }
  }

  const act1Win = act1Winnability(workers, stage, week);
  const organizerHours = Object.fromEntries(organizers.map(o => [o.id, hoursLeftFor(o)]));
  const canResolve = planEntries.length > 0 && organizers.every(o => hoursLeftFor(o) >= 0);
  const overBudget = organizers.some(o => hoursLeftFor(o) < 0);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-mono">
      <GlobalStyle />
      <div className="border-b-2 border-stone-800 bg-stone-900 px-4 py-3 sm:px-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-stencil text-2xl sm:text-3xl tracking-wide text-amber-400">ONE SHOP</div>
          <div className="text-xs sm:text-sm tracking-[0.2em] text-stone-500">ACT ONE — CARDS ON THE TABLE</div>
        </div>
        {phase !== "intro" && (
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
            <div className="text-center">
              <div className="text-stone-500 text-xs">WEEK / SHIP</div>
              <div className={`text-lg font-bold ${ACT1_SHIP_WEEK - week <= 4 ? "text-red-500" : ACT1_SHIP_WEEK - week <= 8 ? "text-amber-400" : "text-stone-100"}`}>
                {week} <span className="text-stone-600">/</span> {ACT1_SHIP_WEEK}
              </div>
              {(() => {
                const soon = workers.filter(x => x.signed && cardStaleSoon(x, week)).length;
                return soon > 0
                  ? <div className="text-[10px] text-amber-400 font-bold">{soon} card{soon === 1 ? "" : "s"} going stale</div>
                  : <div className="text-[10px] text-stone-600">{ACT1_SHIP_WEEK - week} weeks to launch</div>;
              })()}
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-xs">MARGIN LEFT</div>
              <div className={`text-lg font-bold ${(() => {
                const spare = workers.filter(w => !w.burned && !w.signed).length + workers.filter(w => w.signed).length - ACT1_CARDS_NEEDED;
                return spare <= 1 ? "text-red-500" : spare <= 3 ? "text-amber-400" : "text-stone-100";
              })()}`}>
                +{Math.max(0, workers.filter(w => !w.burned).length - ACT1_CARDS_NEEDED)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-xs">CARDS SIGNED</div>
              <div className={`text-lg font-bold ${signedCount >= ACT1_CARDS_NEEDED ? "text-teal-400" : "text-amber-400"}`}>{signedCount} / {ACT1_CARDS_NEEDED}</div>
              <div className="text-[11px] text-stone-600">of {ACT1_TOTAL_WORKERS} on the floor</div>
            </div>
            {stage === "campaign" && (
              <div className="text-center">
                <div className="text-stone-500 text-xs flex items-center gap-1"><Vote size={11} /> BALLOT IN</div>
                <div className={`text-lg font-bold ${weeksToVote <= 1 ? "text-red-500" : "text-amber-400"}`}>{Math.max(0, weeksToVote)} wk</div>
                <div className="text-[11px] text-stone-600">filed week {filedWeek}</div>
              </div>
            )}
            {/* How much of this floor you can honestly see. Nothing else on the HUD says
                whether the numbers you are steering by are worth anything. */}
            <div className="text-center">
              <div className="text-stone-500 text-xs">SOLID READS</div>
              <div className={`text-lg font-bold ${readCounts.exact >= readCounts.live * 0.65 ? "text-teal-400" : readCounts.exact >= readCounts.live * 0.35 ? "text-amber-400" : "text-red-400"}`}>{readCounts.exact} / {readCounts.live}</div>
              <div className="text-[11px] text-stone-600">sat down with, recently</div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-xs">COMMITTEE</div>
              <div className="text-lg font-bold text-stone-100">{organizers.length}</div>
              {/* Coverage: one dot per team and per crowd you have found, filled when
                  somebody on the committee is inside it. */}
              <div className="flex items-center justify-center gap-1 mt-0.5">
                {Object.keys(TEAM_LABEL).map(team => {
                  const covered = organizers.some(o => o.team === team);
                  return <span key={team} title={`${TEAM_LABEL[team]}: ${covered ? "somebody on the committee is here" : "nobody on the committee is here"}`}
                    className="inline-block w-2 h-2 rounded-sm border" style={{ borderColor: TEAM_HEX[team], backgroundColor: covered ? TEAM_HEX[team] : "transparent" }} />;
                })}
                <span className="w-px h-2.5 bg-stone-700 mx-0.5" />
                {CIRCLES.filter(c => workers.some(x => seenCircle(x, social) === c.id)).map(c => {
                  const covered = organizers.some(o => seenCircle(o, social) === c.id);
                  return <span key={c.id} title={`${c.label}: ${covered ? "somebody on the committee is in this crowd" : "nobody on the committee is in this crowd"}`}
                    className="inline-block w-2 h-2 rounded-full border" style={{ borderColor: c.hex, backgroundColor: covered ? c.hex : "transparent" }} />;
                })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-stone-500 text-xs flex items-center gap-1"><Eye size={11} /> HEAT</div>
              <div className={`text-lg font-bold ${heat >= 60 ? "text-red-500" : heat >= 35 ? "text-amber-400" : "text-teal-400"}`}>{heat}</div>
              {consultant.active && (
                <div className={`text-[10px] ${heat >= KIRKMAN_SIGHT || leakFeedsHim ? "text-red-400 font-bold" : "text-stone-600"}`}>
                  {heat >= KIRKMAN_SIGHT || leakFeedsHim ? "HE SEES THE NETWORK" : `${KIRKMAN_SIGHT - heat} from being seen`}
                </div>
              )}
            </div>
            {(consultant.active || outsiders.length > 0) && (
              <div className="text-center">
                <div className="text-stone-500 text-xs flex items-center gap-1"><AlertTriangle size={11} /> AGAINST YOU</div>
                <div className="flex items-center gap-1.5 justify-center mt-1">
                  {OUTSIDERS.map(o => {
                    const here = o.id === "consultant" ? consultant.active : outsiders.includes(o.id);
                    return (
                      <span
                        key={o.id}
                        title={here ? `${o.name} — ${o.role}` : "not here yet"}
                        className="text-[10px] font-bold px-1 py-0.5 border"
                        style={{
                          borderColor: here ? "#f87171" : "#44403c",
                          color: here ? "#f87171" : "#44403c",
                          backgroundColor: here ? "rgba(248,113,113,0.12)" : "transparent",
                        }}
                      >{o.name[0]}</span>
                    );
                  })}
                </div>
                <div className="text-[10px] text-stone-600 mt-0.5">
                  {(outsiders.length + (consultant.active ? 1 : 0))} of {OUTSIDERS.length} escalations
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {phase === "intro" && (
        <IntroSequence
          beats={ACT1_INTRO_BEATS}
          visuals={{ committee: <IntroCommitteeVisual />, influence: <IntroInfluenceVisual /> }}
          doneLabel="LET'S GO"
          onDone={() => setPhase("plan")}
        />
      )}

      {phase === "plan" && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          {unlockPublic && !anyPublicDone && (
            <div className="mb-4 flex items-start gap-2 text-teal-300 text-sm border border-teal-700 bg-teal-950/30 px-3 py-2">
              <Megaphone size={14} className="shrink-0 mt-0.5" />
              {/* The tier cards in the worker panel already quote the reach, the support
                  it moves, the exposure risk and what repeating one costs — live, per
                  person, per tier. This only has to say the option now exists. */}
              <span><span className="font-bold text-teal-400">NEW — PUBLIC ACTIONS.</span> One of your people can do something visible instead of having one more conversation. Open anyone on the committee to see what it reaches, and what it risks.</span>
            </div>
          )}
          {anyRecruitable && (
            <div className="mb-4 flex items-start gap-2 text-teal-300 text-sm border border-teal-700 bg-teal-950/30 px-3 py-2">
              <UsersRound size={14} className="shrink-0 mt-0.5" />
              <span><span className="font-bold text-teal-400">SOMEBODY CAN JOIN THE COMMITTEE.</span> Anyone who signed can be asked by a friend on the committee, or through a signed friend in common. A solid 5 is safe; a 4 might talk.</span>
            </div>
          )}
          {tippedOff.length > 0 && (
            <div className="mb-4 flex items-start gap-2 text-red-300 text-sm border border-red-800 bg-red-950/30 px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span><span className="font-bold text-red-400">SOMEBODY KNEW.</span> Management got to {tippedOff.map(x => x.name).join(" and ")} before you did. Somebody on the committee is talking. A seasoned organizer's check-in finds out who.</span>
            </div>
          )}

          {stage === "campaign" && (
            <div className="mb-4 border-2 border-amber-700 bg-amber-950/20 px-3 py-3">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="font-stencil text-lg tracking-wide text-amber-400">THE BALLOT IS {Math.max(0, weeksToVote)} WEEK{weeksToVote === 1 ? "" : "S"} OUT</div>
                <div className="text-xs text-stone-400">Petition filed week {filedWeek} with {signedCount} cards</div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="border border-teal-800 bg-teal-950/30 p-2 text-center">
                  <div className="text-[11px] text-stone-500 tracking-wide">PROJECTED YES</div>
                  <div className="text-2xl font-bold text-teal-400">{projection.yes}</div>
                </div>
                <div className="border border-red-800 bg-red-950/30 p-2 text-center">
                  <div className="text-[11px] text-stone-500 tracking-wide">PROJECTED NO</div>
                  <div className="text-2xl font-bold text-red-400">{projection.no}</div>
                </div>
                <div className="border border-stone-700 p-2 text-center">
                  <div className="text-[11px] text-stone-500 tracking-wide">WON'T VOTE</div>
                  <div className="text-2xl font-bold text-stone-400">{projection.out}</div>
                </div>
              </div>
              {/* The band above says "estimate, not promise" better than a sentence can,
                  so the sentence is gone. What stays is the one fact no number shows: the
                  employer owns every week left on that clock. */}
              <div className="text-xs text-stone-400 leading-relaxed">
                Majority of ballots cast wins it, and <span className="text-stone-200 font-bold">{projection.yes > projection.no ? "you are ahead" : "you are behind"}</span> on today's read.
                Every week left on the clock is a week the employer campaigns.
              </div>
            </div>
          )}

          {canFile && (
            <div className="mb-4 border-2 border-teal-700 bg-teal-950/20 px-3 py-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[16rem]">
                  <div className="font-stencil text-lg tracking-wide text-teal-400">YOU CAN FILE TODAY</div>
                  {/* A prompt and the live count. What filing costs you is the modal's
                      job — saying it here too just means saying it twice. */}
                  <div className="text-xs text-stone-400 leading-relaxed mt-1">
                    <span className="text-stone-200 font-bold">{signedCount} of {ACT1_TOTAL_WORKERS}</span> cards clears the line the labor board needs to schedule an election.
                    {projection.yes > projection.no + 2
                      ? " Organizers file on a cushion, and you have one."
                      : " Organizers almost never file at the minimum."}
                  </div>
                </div>
                <button
                  onClick={() => setShowFilePrompt(true)}
                  className="font-stencil text-base bg-teal-600 hover:bg-teal-500 text-stone-950 px-5 py-2.5 tracking-wide transition-colors shrink-0"
                >
                  FILE WITH THE NLRB
                </button>
              </div>
            </div>
          )}

          {consultant.active && (
            <div className="mb-4 flex items-start gap-2 text-red-300 text-sm border border-red-800 bg-red-950/30 px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {/* A standing readout of his rules, not a mood. It changes when his
                  sight or his tempo does, so the player can see the threat change. */}
              <span>
                <span className="font-bold text-red-400">{CONSULTANT_NAME.toUpperCase()} IS ON SITE.</span>{" "}
                <span className="text-stone-300">
                  {stage === "campaign" ? "Four" : "Two"} one-on-ones a week, aimed at whoever looks strongest and isn't already
                  covered by signed friends; each one moves where somebody stands.
                  {stage === "campaign"
                    ? " Plus a mandatory all-hands every week that moves no votes and makes the room harder to read: solid digits go hollow."
                    : ""}
                  {" "}{(() => {
                    const left = [
                      [CONSULTANT_MAX_EACH - (consultant.raises || 0), "raise", "raises"],
                      [CONSULTANT_MAX_EACH - (consultant.threats || 0), "job threat", "job threats"],
                      [CONSULTANT_MAX_EACH - (consultant.perks || 0), "company perk", "company perks"],
                      [CONSULTANT_MAX_EACH - (consultant.rumors || 0), "rumor", "rumors"],
                    ].filter(([n]) => n > 0);
                    if (!left.length) return "Every set piece is spent — no raise, no job threat, no perk left to run.";
                    return `A set piece every ${CONSULTANT_SETPIECE_GAP} week${CONSULTANT_SETPIECE_GAP === 1 ? "" : "s"}: ${
                      left.map(([n, one, many]) => `${n} ${n === 1 ? one : many}`).join(", ")} left.`;
                  })()}
                </span>{" "}
                <span className={heat >= KIRKMAN_SIGHT || stage === "campaign" || leakFeedsHim ? "text-red-400 font-bold" : "text-teal-400"}>
                  {heat >= KIRKMAN_SIGHT || stage === "campaign"
                    ? "He can see your map."
                    : leakFeedsHim
                    ? "He can see your map, and the floor is not loud enough for that. Somebody told him."
                    : `He can't see your map yet — at ${heat} heat he's picking names off the org chart, at half strength. It changes at ${KIRKMAN_SIGHT}.`}
                </span>{" "}
                <span className="text-stone-400">
                  Signed friends standing around a target blunt every blow. Density is the defence.
                </span>
                {perks.length > 0 && (
                  <span className="block mt-1 text-red-400">
                    THE COMPANY OWNS: {perks.map(pk => {
                      const left = pk.until - week;
                      const when = left <= 0 ? "lapses after this week" : `${left} more week${left === 1 ? "" : "s"}`;
                      return `${AFF_BY_ID[pk.id]?.label ?? pk.id} (${when})`;
                    }).join(" · ")}
                    <span className="text-stone-400"> — these stop counting as common ground in any conversation until the perk lapses.</span>
                  </span>
                )}
              </span>
            </div>
          )}
          <Act1FloorMap
            workers={workers}
            view={boardView}
            onView={setBoardView}
            weekNow={week}
            influence={influence}
            layout={ORG_LAYOUT}
            planEntries={planEntries}
            hoursLeft={organizerHours}
            tierOf={orgTier}
            social={social}
            onSelect={(w) => { setPairActorId(null); setSelectedWorker(w); }}
            onPair={(actor, target) => { setPairActorId(actor.id); setSelectedWorker(target); }}
            staleWeek={week}
          />

          {/* No shelf. Everything it carried per committee member now lives on that
              member's own card; what's left is the one instruction and the one button. */}
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-stone-500 flex-1 min-w-[16rem]">
              Click anyone to plan. Drag one of your people onto somebody to send them.
            </p>
            <span className={`text-base font-bold shrink-0 ${overBudget ? "text-red-500" : totalUsed === totalHours ? "text-teal-400" : "text-amber-400"}`}>
              {totalUsed} / {totalHours} HOURS
            </span>
          </div>
          <button
            onClick={resolveWeek}
            disabled={!canResolve}
            className={`w-full font-stencil text-lg py-2.5 mt-2 tracking-wide transition-colors ${!canResolve ? "bg-stone-800 text-stone-600 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-400 text-stone-950"}`}
          >
            {overBudget ? "OVER BUDGET — CANCEL SOMETHING" : planEntries.length === 0 ? "PLAN SOMETHING FIRST" : `RESOLVE WEEK ${week}`}
          </button>
        </div>
      )}

      {resStep && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 anim-rise">
          <Act1FloorMap
            workers={resStep.workers}
            social={social}
            view={boardView}
            onView={setBoardView}
            weekNow={resStep.week ?? week}
            influence={influence}
            layout={ORG_LAYOUT}
            planEntries={[]}
            onSelect={() => {}}
            highlights={resHighlights}
            edgePulses={resStep.edgePulses || []}
            stepKey={stepIndex}
            notes={resNotes}
          />
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex-1 min-h-[1.5rem] text-sm text-stone-400 font-mono">
              <div className="text-xs text-amber-400 tracking-widest">{resStep.label}</div>
              {resBanner.map((line, i) => <div key={`${stepIndex}-${i}`}>▸ {line}</div>)}
            </div>
            <button onClick={commitWeek} className="shrink-0 text-xs text-stone-500 hover:text-amber-400 underline transition-colors">
              SKIP ▸▸
            </button>
          </div>
          {resolutionSteps.slice(0, stepIndex + 1).some(s => s.lines.length > 0) && (
            <div ref={resLogRef} className="bg-stone-950/60 border border-stone-800 p-2 space-y-0.5 max-h-28 overflow-y-auto">
              {resolutionSteps.slice(0, stepIndex + 1).map((s, si) =>
                s.lines.map((line, li) => (
                  <div key={`${si}-${li}`} className={`text-xs font-mono ${si === stepIndex ? "text-stone-400" : "text-stone-600"}`}>▸ {line}</div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {phase === "victory" && (
        <OutcomeScreen
          tone="win"
          title="THE UNION CARRIES IT"
          stars={act1Stars(wonOnWeek)}
          tally={voteResult}
          meta={{ week: wonOnWeek, line: `Won on the ballot in week ${wonOnWeek} — filed week ${filedWeek} with ${signedCount} cards.` }}
          beats={[
            { lines: [
              "A majority of the ballots cast came back yes, and the labor board certifies it.",
              "This floor has a union — a bargaining unit the company is legally required to sit down with.",
            ]},
            { lines: [
              "Winning the election is not the end of the process. Certification obliges them to bargain, not to agree.",
              "A first contract can take years. The committee you built is the thing that gets you one.",
            ], quiet: true },
            { lines: ["These are the people who came through when it counted."], visual: "roster" },
          ]}
          visuals={{ roster: <OutcomeRoster workers={organizers} /> }}
          actions={<>
            <button onClick={() => graduate(true)} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">BARGAIN THE CONTRACT</button>
            <button onClick={startOver} className="font-stencil text-xl border-2 border-stone-700 hover:border-stone-500 text-stone-300 px-8 py-3 tracking-wide transition-colors">RUN IT FASTER</button>
          </>}
        />
      )}

      {showFilePrompt && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={() => setShowFilePrompt(false)}>
          <div className="bg-stone-900 border-2 border-teal-800 max-w-lg w-full p-5 my-auto" onClick={e => e.stopPropagation()}>
            <div className="font-stencil text-2xl text-teal-400 mb-1">FILE THE PETITION?</div>
            {/* The banner you clicked to get here already gave the count and the 30%.
                What it did not say is the part that matters. */}
            <p className="text-sm text-stone-400 leading-relaxed mb-3">
              Thirty percent schedules an election. It is not what wins one.
            </p>
            <div className="border border-stone-700 bg-stone-950/60 p-3 mb-3 space-y-2 text-[13px] text-stone-400 leading-relaxed">
              <div>
                <span className="text-stone-200 font-bold">What filing does.</span> You demand recognition and petition the NLRB the same day.
                A lopsided enough count can win recognition outright — rare, and rarer once they are paying a consultant.
              </div>
              <div>
                <span className="text-stone-200 font-bold">Otherwise, a secret ballot in {ELECTION_WEEKS} weeks.</span> Decided by a majority of the
                ballots actually cast — someone who stays at their desk is a vote you didn't get.
              </div>
              <div>
                <span className="text-stone-200 font-bold">Those {ELECTION_WEEKS} weeks belong to them.</span> Mandatory meetings every week, one-on-ones
                with everyone wavering, and no way to withdraw once you've filed.
              </div>
            </div>
            <div className="border border-stone-700 p-3 mb-4">
              {(gaps.teams.length > 0 || gaps.crowds.length > 0) && (
                <div className="text-xs text-amber-400 mb-2">
                  Nobody on the committee in {[...gaps.teams.map(t => TEAM_LABEL[t]), ...gaps.crowds.map(c => c.label)].join(", ")}.
                  <span className="text-stone-500"> Those are the people their campaign reaches first.</span>
                </div>
              )}
              <div className="text-xs text-stone-500 tracking-wide mb-1">TODAY'S PROJECTION, BEFORE ANY OF THAT</div>
              <div className="flex items-center gap-4 text-base">
                <span className="text-teal-400 font-bold">{projection.yes} YES</span>
                <span className="text-red-400 font-bold">{projection.no} NO</span>
                <span className="text-stone-500">{projection.out} not voting</span>
              </div>
              <div className={`text-xs mt-1 ${projection.yes > projection.no + 2 ? "text-teal-400" : "text-red-400"}`}>
                {projection.yes > projection.no + 2
                  ? "A real cushion. This is roughly where organizers actually file."
                  : projection.yes > projection.no
                    ? "Ahead by a hair. Four weeks of their campaign will eat that."
                    : "You would lose this vote today."}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={fileWithNLRB} className="flex-1 font-stencil text-base bg-teal-600 hover:bg-teal-500 text-stone-950 px-4 py-2.5 tracking-wide transition-colors">
                FILE IT
              </button>
              <button onClick={() => setShowFilePrompt(false)} className="flex-1 font-stencil text-base border-2 border-stone-600 hover:border-stone-400 text-stone-300 px-4 py-2.5 tracking-wide transition-colors">
                KEEP ORGANIZING
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "filed" && (
        <div className="max-w-xl mx-auto px-6 py-16 text-center anim-rise">
          <div className="font-stencil text-4xl mb-3 text-amber-400">THE PETITION IS IN</div>
          <p className="text-stone-400 mb-4 leading-relaxed text-base">
            You demanded recognition with {signedCount} cards. The company declined, the way companies almost always do, and the
            matter goes to the labor board. An election is scheduled for <span className="text-stone-100 font-bold">week {electionWeek}</span>.
          </p>
          <p className="text-stone-500 mb-6 leading-relaxed text-sm">
            {CONSULTANT_NAME} is now on the floor full time. There will be a mandatory meeting every week between now and the ballot,
            and he will sit down with everyone who looks like they might waver. You have {ELECTION_WEEKS} weeks and the same hours you always had.
          </p>
          <button onClick={() => setPhase("plan")} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">
            GET TO WORK
          </button>
        </div>
      )}

      {phase === "recognized" && (
        <OutcomeScreen
          tone="win"
          title="RECOGNIZED"
          stars={act1Stars(wonOnWeek)}
          meta={{ week: wonOnWeek, line: `${signedCount} of ${ACT1_TOTAL_WORKERS} cards in ${wonOnWeek} week${wonOnWeek === 1 ? "" : "s"}. No election needed.` }}
          beats={[
            { lines: [
              "The count was lopsided enough that fighting it looked worse than losing it.",
              "The company recognized the union rather than spend three months losing an election everyone could already see coming.",
            ]},
            { lines: [
              "This is the outcome almost nobody gets. The only way to get it is to be overwhelming.",
            ], quiet: true },
            { lines: ["These are the people who came through when it counted."], visual: "roster" },
          ]}
          visuals={{ roster: <OutcomeRoster workers={organizers} /> }}
          actions={<>
            <button onClick={() => graduate(true)} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">BARGAIN THE CONTRACT</button>
            <button onClick={startOver} className="font-stencil text-xl border-2 border-stone-700 hover:border-stone-500 text-stone-300 px-8 py-3 tracking-wide transition-colors">RUN IT AGAIN</button>
          </>}
        />
      )}

      {phase === "defeat" && voteResult && (
        <OutcomeScreen
          tone="loss"
          title="THE VOTE COMES BACK NO"
          tally={voteResult}
          meta={{ line: `Filed week ${filedWeek} with ${signedCount} cards. The ballot was week ${wonOnWeek}.` }}
          beats={[
            { lines: [
              voteResult.out > voteResult.yes
                ? "More people stayed at their desks than voted yes. Every one of them was a vote you could have had."
                : "It came down to the ballots cast, and there weren't enough of them.",
              "Under labor law there's no second attempt for a year. The committee holds, quietly, and waits.",
            ]},
            { lines: [
              "Thirty percent gets you an election. It doesn't win one.",
              "Between the petition and the ballot, the company got four uninterrupted weeks with everyone you hadn't locked down.",
            ]},
            { lines: [
              "A signature on a card was never the same thing as a yes in a booth.",
            ], quiet: true },
          ]}
          actions={<button onClick={startOver} className="font-stencil text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3 tracking-wide transition-colors">START OVER</button>}
        />
      )}

            {selectedWorker && phase === "plan" && (
        <Act1WorkerModal
          worker={workers.find(w => w.id === selectedWorker.id) || selectedWorker}
          allWorkers={workers}
          influence={influence}
          organizers={organizers}
          hoursLeftFor={hoursLeftFor}
          hoursFor={hoursFor}
          week={week}
          preferActorId={pairActorId}
          plannedFor={planEntries.filter(e => e.targetId === selectedWorker.id || (e.actorId === selectedWorker.id && !e.targetId))}
          onCancelPlans={(key) => setPlanEntries(es => es.filter(e => e.key !== key))}
          unlockPublic={unlockPublic}
          onPlan={(actorId, type, targetId) => { addPlan(actorId, type, targetId); setSelectedWorker(null); setPairActorId(null); }}
          onClose={() => { setSelectedWorker(null); setPairActorId(null); }}
        />
      )}

      {phase !== "intro" && (
        <div className="fixed bottom-2 left-2 z-40">
          {confirmStartOver ? (
            <div className="flex items-center gap-2 bg-stone-900 border border-stone-700 px-2 py-1.5 text-xs">
              <span className="text-stone-500">Restart Act One from scratch?</span>
              <button onClick={startOver} className="text-red-400 hover:text-red-300 font-bold">YES</button>
              <button onClick={() => setConfirmStartOver(false)} className="text-stone-500 hover:text-stone-300">CANCEL</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmStartOver(true)}
              className="text-xs text-stone-600 hover:text-stone-400 underline transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      )}

      {phase !== "intro" && !act1Win.alive && (
        <div className="fixed inset-0 bg-stone-950/95 z-50 flex items-center justify-center px-6">
          <div className="max-w-lg text-center anim-rise">
            <div className="font-stencil text-5xl mb-4 text-red-500">{act1Win.shipped ? "THE GAME SHIPPED" : "DRIVE DEAD"}</div>
            <p className="text-stone-400 mb-4 leading-relaxed">{act1Win.reason}</p>
            <p className="text-red-400/80 text-sm mb-6 leading-relaxed border border-red-900/60 bg-red-950/20 px-4 py-3">
              {act1Win.shipped
                ? `You had ${ACT1_SHIP_WEEK} weeks and ${workers.filter(x => x.signed).length} of the ${ACT1_CARDS_NEEDED} cards you needed. There is no next build to organize.`
                : "Called at week " + week + ". There is no clock left to run down \u2014 the count stopped being reachable, so the remaining weeks would not have changed the ending. The people who were walked out are not coming back."}
            </p>
            <button
              onClick={() => { try { localStorage.removeItem(ACT1_SAVE_KEY); } catch (err) { /* private mode */ } window.location.reload(); }}
              className="border-2 border-stone-600 px-6 py-2 text-sm text-stone-200 hover:bg-stone-800 transition-colors"
            >
              START OVER
            </button>
          </div>
        </div>
      )}

      {phase !== "intro" && (
        <div className="fixed bottom-2 right-2 z-40">
          <button
            onClick={() => graduate(false)}
            title="Jumps straight to the first contract without saving over your real Act One progress."
            className="text-xs text-stone-600 hover:text-stone-400 underline transition-colors"
          >
            Skip to the first contract (playtest — doesn't save)
          </button>
          {onSkipToCompany && (
            <button
              onClick={onSkipToCompany}
              title="Jumps past the first contract to the company-wide campaign. Doesn't save."
              className="text-xs text-stone-600 hover:text-amber-400 underline transition-colors ml-3"
            >
              Skip to the company campaign (playtest)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { ActOneGame };
