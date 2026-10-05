// Act One: the card drive and the election campaign, one shop.
import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, Eye, Info, Vote, Megaphone, Network, UsersRound, X } from "lucide-react";
import { GlobalStyle, IntroSequence, OutcomeRoster, OutcomeScreen, splitLinesByEntity } from "../shared.jsx";
import { random } from "../../engine/rng.js";
import { ACT1_INTRO_BEATS, IntroCommitteeVisual, IntroInfluenceVisual } from "./intro.jsx";
import { Act1FloorMap, ORG_LAYOUT } from "./FloorMap.jsx";
import { Act1WorkerModal } from "./WorkerPanel.jsx";
import { makeAct1Workers } from "../../engine/act1/influence.js";
import { CIRCLES, generateSocial, isKnownFriend, mapProgress, vouchFor } from "../../engine/act1/friends.js";
import { activeLeaks, coverageGaps, recentlyTipped } from "../../engine/act1/coverage.js";
import { seenCircle } from "../../engine/act1/fallout.js";
import { TEAM_HEX, TEAM_LABEL, ACT1_CARDS_NEEDED, ACT1_CARD_THRESHOLD, ACT1_HOURS_PER_ORGANIZER, ACT1_RECRUIT_REQ, ACT1_SHIP_WEEK, ACT1_TOTAL_WORKERS, ACT1_WORKERS_SEED, act1Stars, cardStaleSoon } from "../../engine/act1/constants.js";
import { committeeHours, orgTier } from "../../engine/act1/committee.js";
import { ACT1_ACTION } from "../../engine/act1/actions.js";
import { resolveWeek as runWeek } from "../../engine/act1/resolveWeek.js";
import { ACT1_SAVE_KEY } from "../../save.js";
import { ELECTION_WEEKS, readOf, recognitionChance, voteProjection } from "../../engine/act1/election.js";

// What each HUD tile means, in the sentence a player needs the week it first shows up. A
// tile appears when it first matters and opens its sentence once; clicking any tile reopens
// it. Nothing here depends on hovering, so it reads the same on a phone.
const HUD_TIPS = {
  week: `The studio ships its game in week ${ACT1_SHIP_WEEK}. After that the floor changes shape and the campaign is over, so everything has to happen before then.`,
  cards: `${ACT1_CARDS_NEEDED} of the ${ACT1_TOTAL_WORKERS} people here have to sign a union card before you can file for an election. That gets you a vote; it does not win one.`,
  reads: "A solid number on a card means somebody sat down with that person lately, so you know where they stand. A hollow number is only what they said. This counts the solid ones.",
  committee: "The people whose hours you spend. Each small square is a team and each circle is a crowd you have found; it fills in when somebody on the committee belongs to it. Management's campaign lands hardest where you have nobody.",
  heat: "How much attention the campaign is drawing from management. It cools on quiet weeks. Past a point, the company brings in help.",
  ballot: "The secret ballot. Every week until then is a week management campaigns against you.",
  against: "Who the company has brought in against you. Each one fights differently.",
};
const HUD_TIP_ORDER = ["week", "cards", "reads", "committee", "heat", "ballot", "against"];
import { CONSULTANT_MAX_EACH, CONSULTANT_NAME, CONSULTANT_SETPIECE_GAP, KIRKMAN_SIGHT, OUTSIDERS, act1Winnability } from "../../engine/act1/consultant.js";
import { AFF_BY_ID } from "../../engine/act1/affinities.js";
import { COORDINATED_ORDER, newCampaign, openCampaign } from "../../engine/act1/campaign.js";
import { ActionPicker, CalendarStrip, MovePanel } from "./Campaign.jsx";
import { CAMPAIGN_SCRIPT, LESSONS_DONE, campaignLesson, lessonFrom, openActions } from "./lessons.js";
import { CampaignLessonBanner, LessonBanner } from "./LessonBanner.jsx";

// A reminder for a player who has stopped mapping: after this many weeks in which the map
// did not grow, while there is still something left to find, and again every few weeks
// if they keep not mapping. Mapping is the skill the whole act turns on.
const MAP_NAG_AFTER = 3;
const MAP_NAG_REPEAT = 4;

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
  // Phase 2: the move on management's calendar, and the coordinated actions run so far.
  const [campaign, setCampaign] = useState(newCampaign);
  const [showMove, setShowMove] = useState(false);
  const [showAction, setShowAction] = useState(false);
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
  // The week the map last grew, and the week the reminder last showed.
  const [mapGrewWeek, setMapGrewWeek] = useState(1);
  const [mapNagWeek, setMapNagWeek] = useState(null);
  const [showMapNag, setShowMapNag] = useState(false);
  // Which HUD tiles have introduced themselves, and which explanation is open right now.
  const [tipsSeen, setTipsSeen] = useState({});
  const [openTip, setOpenTip] = useState(null);
  const [sawFilePrompt, setSawFilePrompt] = useState(false);
  // The staircase: which lesson the floor has reached, the week it got there, and whether
  // the player has turned the lessons off. Nothing in the engine reads any of it.
  const [lesson, setLesson] = useState(0);
  const [lessonWeek, setLessonWeek] = useState(1);
  const [lessonsOff, setLessonsOff] = useState(false);
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

  // The only public action before filing: one open letter, once the filing line is in
  // sight. After filing, the megaphone runs any of the three.
  const letterOpen = stage === "drive" && !campaign.letterDone && signedCount >= ACT1_CARDS_NEEDED - 2;
  const megaphone = stage === "campaign" || letterOpen;
  const move = stage === "campaign" ? campaign.next : null;
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

  function addPlan(actorId, type, targetId = null, extra = {}) {
    setPlanEntries(prev => {
      // The Phase 2 counters do their work once: a second copy would only cost an hour.
      const same = (e) => e.actorId === actorId && e.type === type && e.targetId === targetId && e.team === extra.team && e.circle === extra.circle;
      if (["inoculate", "standwith", "debrief"].includes(type) && prev.some(same)) return prev;
      planKeyRef.current += 1;
      return [...prev, { key: planKeyRef.current, actorId, type, targetId, ...extra }];
    });
  }
  // The megaphone replaces the whole coordinated action at once: one tier, these people.
  function setTurnout(tier, actorIds) {
    setPlanEntries(prev => {
      const rest = prev.filter(e => e.type !== "turnout");
      if (!tier) return rest;
      return [...rest, ...actorIds.map(id => { planKeyRef.current += 1; return { key: planKeyRef.current, actorId: id, type: "turnout", targetId: null, tier }; })];
    });
    setShowAction(false);
  }
  function removePlan(key) {
    setPlanEntries(prev => prev.filter(e => e.key !== key));
  }

  // ---------- WEEK RESOLUTION ----------
  function resolveWeek() {
    const { steps, pending } = runWeek(
      { workers, influence, social, week, stage, heat, consultant, perks, outsiders, electionWeek, campaign },
      planEntries,
    );
    setResolutionSteps(steps);
    setStepIndex(0);
    setPhase("resolving");
    pendingRef.current = pending;
  }

  function commitWeek() {
    const { workers: w, heat: h, consultant: c, ballot, outsidersNext, perksNext, reachedThreshold, social: socialNext, campaign: campaignNext } = pendingRef.current;
    if (campaignNext) setCampaign(campaignNext);
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
    const filePromptNow = reachedThreshold && !sawFilePrompt;
    if (filePromptNow) {
      setSawFilePrompt(true);
      setShowFilePrompt(true);
    }
    const nextWeek = week + 1;
    // The lesson the floor has earned. It only ever goes up. The sit-down opening is the
    // moment the social map starts meaning something, so the board switches to it once.
    const earned = lessonFrom(w, nextWeek);
    if (earned > lesson) {
      setLesson(earned);
      setLessonWeek(nextWeek);
      if (lesson < 1 && earned >= 1 && !lessonsOff) setBoardView("social");
    }
    // Has the map grown this week? If it has stalled for a while and there is still floor
    // left to find, say so.
    const mapNow = mapProgress(w, socialNext || social);
    if (mapNow.known > mapProgress(workers, social).known) {
      setMapGrewWeek(nextWeek);
      setMapNagWeek(null);
    } else if (!mapNow.complete && !filePromptNow && (lessonsOff || earned >= LESSONS_DONE) && nextWeek - mapGrewWeek >= MAP_NAG_AFTER
      && (mapNagWeek == null || nextWeek - mapNagWeek >= MAP_NAG_REPEAT)) {
      setMapNagWeek(nextWeek);
      setShowMapNag(true);
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
    setCampaign(newCampaign());
    setShowMove(false);
    setShowAction(false);
    setPairActorId(null);
    setStage("drive");
    setFiledWeek(null);
    setElectionWeek(null);
    setVoteResult(null);
    setShowFilePrompt(false);
    setSawFilePrompt(false);
    setMapGrewWeek(1);
    setMapNagWeek(null);
    setShowMapNag(false);
    setTipsSeen({});
    setOpenTip(null);
    setLesson(0);
    setLessonWeek(1);
    setLessonsOff(false);
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
    const onSite = consultant.active ? consultant : { ...consultant, active: true, arrivedWeek: week };
    setConsultant(onSite);
    // His first move goes on the calendar the day the petition lands.
    // On the lessons, his first two moves come in a fixed order: the meeting, then the perk.
    const opening = lessonsOff ? campaign : { ...campaign, script: CAMPAIGN_SCRIPT };
    setCampaign(openCampaign({ workers, social, consultant: onSite, heat, campaign: opening }));
    const share = signedCount / ACT1_TOTAL_WORKERS;
    if (random() < recognitionChance(share, consultant.active, heat)) {
      setPhase("recognized");
      setWonOnWeek(week);
    } else {
      setPhase("filed");
    }
  }

  // Which tiles are on. A tile that has introduced itself stays on, so nothing flickers.
  const tileOn = {
    week: true,
    cards: true,
    reads: !!tipsSeen.reads || workers.some(x => !x.organizer && !x.burned && readOf(x, week).exact),
    committee: !!tipsSeen.committee || anyRecruitable || organizers.length > 2,
    heat: !!tipsSeen.heat || heat > 0 || consultant.active,
    ballot: stage === "campaign",
    against: consultant.active || outsiders.length > 0,
  };
  const tilesOnKey = HUD_TIP_ORDER.filter(k => tileOn[k]).join(",");
  useEffect(() => {
    if (phase !== "plan") return;
    const fresh = HUD_TIP_ORDER.filter(k => tileOn[k] && !tipsSeen[k]);
    if (!fresh.length) return;
    setTipsSeen(seen => ({ ...seen, ...Object.fromEntries(fresh.map(k => [k, true])) }));
    // A tile introducing itself takes the line, even over an explanation somebody left open.
    // The first week, only the week needs explaining; the card count speaks for itself.
    setOpenTip(fresh[0]);
  }, [phase, tilesOnKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const act1Win = act1Winnability(workers, stage, week);
  const lessonsOn = !lessonsOff;
  const allowedActions = lessonsOn ? openActions(lesson) : null;
  const organizerHours = Object.fromEntries(organizers.map(o => [o.id, hoursLeftFor(o)]));
  const canResolve = planEntries.length > 0 && organizers.every(o => hoursLeftFor(o) >= 0);
  const overBudget = organizers.some(o => hoursLeftFor(o) < 0);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-mono">
      <GlobalStyle />
      <div className="border-b-2 border-stone-800 bg-stone-900 px-4 py-3 sm:px-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-stencil text-2xl sm:text-3xl tracking-wide text-amber-400">ONE SHOP</div>
          <div className="text-xs sm:text-sm tracking-[0.2em] text-stone-500">{stage === "campaign" ? "ACT ONE — THEIR CAMPAIGN" : "ACT ONE — CARDS ON THE TABLE"}</div>
        </div>
        {phase !== "intro" && (() => {
          const Tile = ({ id, label, icon: Icon, children }) => (
            <button type="button" onClick={() => setOpenTip(t => (t === id ? null : id))} title={HUD_TIPS[id]}
              className={`text-center px-1.5 py-0.5 -my-0.5 rounded transition-colors hover:bg-stone-800/60 ${openTip === id ? "bg-stone-800/80" : ""}`}>
              <div className="text-stone-500 text-xs flex items-center justify-center gap-1">{Icon && <Icon size={11} />}{label}</div>
              {children}
            </button>
          );
          const staleSoon = workers.filter(x => x.signed && cardStaleSoon(x, week)).length;
          const weeksLeft = ACT1_SHIP_WEEK - week;
          return (
            <div className="flex items-center gap-3 sm:gap-5 text-sm sm:text-base">
              <Tile id="week" label="WEEK">
                <div className={`text-lg font-bold ${weeksLeft <= 4 ? "text-red-500" : weeksLeft <= 8 ? "text-amber-400" : "text-stone-100"}`}>
                  {week} <span className="text-stone-600 text-sm">of</span> {ACT1_SHIP_WEEK}
                </div>
                {staleSoon > 0
                  ? <div className="text-[10px] text-amber-400 font-bold">{staleSoon} card{staleSoon === 1 ? "" : "s"} going stale</div>
                  : <div className="text-[10px] text-stone-600">{weeksLeft} week{weeksLeft === 1 ? "" : "s"} until the game ships</div>}
              </Tile>
              <Tile id="cards" label="CARDS SIGNED">
                <div className={`text-lg font-bold ${signedCount >= ACT1_CARDS_NEEDED ? "text-teal-400" : "text-amber-400"}`}>{signedCount} / {ACT1_CARDS_NEEDED}</div>
                <div className="text-[10px] text-stone-600">of {ACT1_TOTAL_WORKERS} on the floor</div>
              </Tile>
              {tileOn.ballot && (
                <Tile id="ballot" label="BALLOT IN" icon={Vote}>
                  <div className={`text-lg font-bold ${weeksToVote <= 1 ? "text-red-500" : "text-amber-400"}`}>{Math.max(0, weeksToVote)} wk</div>
                  <div className="text-[10px] text-stone-600">filed week {filedWeek}</div>
                </Tile>
              )}
              {tileOn.reads && (
                <Tile id="reads" label="SOLID READS">
                  <div className={`text-lg font-bold ${readCounts.exact >= readCounts.live * 0.65 ? "text-teal-400" : readCounts.exact >= readCounts.live * 0.35 ? "text-amber-400" : "text-red-400"}`}>{readCounts.exact} / {readCounts.live}</div>
                  <div className="text-[10px] text-stone-600">know where they stand</div>
                </Tile>
              )}
              <Tile id="committee" label="COMMITTEE">
                <div className="text-lg font-bold text-stone-100">{organizers.length}</div>
                {/* Coverage, once there is anyone to recruit: one square per team and one circle
                    per crowd you have found, filled when somebody on the committee is inside. */}
                {tileOn.committee ? (
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    {Object.keys(TEAM_LABEL).map(team => {
                      const covered = organizers.some(o => o.team === team);
                      return <span key={team} title={`${TEAM_LABEL[team]}: ${covered ? "somebody on the committee is here" : "nobody on the committee is here"}`}
                        className="inline-block w-2 h-2 rounded-sm border" style={{ borderColor: TEAM_HEX[team], backgroundColor: covered ? TEAM_HEX[team] : "transparent" }} />;
                    })}
                    {CIRCLES.some(c => workers.some(x => seenCircle(x, social) === c.id)) && <span className="w-px h-2.5 bg-stone-700 mx-0.5" />}
                    {CIRCLES.filter(c => workers.some(x => seenCircle(x, social) === c.id)).map(c => {
                      const covered = organizers.some(o => seenCircle(o, social) === c.id);
                      return <span key={c.id} title={`${c.label}: ${covered ? "somebody on the committee is in this crowd" : "nobody on the committee is in this crowd"}`}
                        className="inline-block w-2 h-2 rounded-full border" style={{ borderColor: c.hex, backgroundColor: covered ? c.hex : "transparent" }} />;
                    })}
                  </div>
                ) : <div className="text-[10px] text-stone-600">yours to direct</div>}
              </Tile>
              {tileOn.heat && (
                <Tile id="heat" label="HEAT" icon={Eye}>
                  <div className={`text-lg font-bold ${heat >= 60 ? "text-red-500" : heat >= 35 ? "text-amber-400" : "text-teal-400"}`}>{heat}</div>
                  {consultant.active && (
                    <div className={`text-[10px] ${heat >= KIRKMAN_SIGHT || leakFeedsHim ? "text-red-400 font-bold" : "text-stone-600"}`}>
                      {heat >= KIRKMAN_SIGHT || leakFeedsHim ? "HE SEES THE NETWORK" : `${KIRKMAN_SIGHT - heat} from being seen`}
                    </div>
                  )}
                </Tile>
              )}
              {tileOn.against && (
                <Tile id="against" label="AGAINST YOU" icon={AlertTriangle}>
                  <div className="flex flex-col items-center leading-tight mt-0.5">
                    {OUTSIDERS.filter(o => (o.id === "consultant" ? consultant.active : outsiders.includes(o.id))).map(o => (
                      <span key={o.id} title={o.role} className="text-[10px] font-bold text-red-400">{o.name}</span>
                    ))}
                  </div>
                </Tile>
              )}
            </div>
          );
        })()}
        {phase !== "intro" && openTip && (
          <div className="w-full flex items-start gap-2 text-xs text-amber-100 border-t border-stone-800 pt-2 mt-1">
            <Info size={13} className="shrink-0 mt-0.5 text-amber-400" />
            <span className="flex-1 leading-snug">{HUD_TIPS[openTip]}</span>
            <button type="button" onClick={() => setOpenTip(null)} aria-label="Dismiss" className="text-stone-500 hover:text-stone-200"><X size={13} /></button>
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
          {lessonsOn && stage === "drive" && (
            <LessonBanner lesson={lesson} workers={workers} week={week} justUnlocked={lessonWeek === week && lesson > 0} onOff={() => setLessonsOff(true)} />
          )}
          {lessonsOn && stage === "campaign" && (
            <CampaignLessonBanner lesson={campaignLesson(move, week, filedWeek)} />
          )}
          {letterOpen && (
            <div className="mb-4 flex items-start gap-2 text-teal-300 text-sm border border-teal-700 bg-teal-950/30 px-3 py-2">
              <Megaphone size={14} className="shrink-0 mt-0.5" />
              <span><span className="font-bold text-teal-400">THE OPEN LETTER.</span> Once, before you file: who signs it reads solid, who doesn't reads hollow. The megaphone, below the board.</span>
            </div>
          )}
          {anyRecruitable && !(lessonsOn && lesson < LESSONS_DONE) && (
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
              </div>
            </div>
          )}
          {move && (
            <CalendarStrip move={move} workers={workers} social={social} planEntries={planEntries} onOpen={() => setShowMove(true)} />
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
                  Two one-on-ones a week, aimed at whoever looks strongest and isn't already
                  covered by signed friends; each one moves where somebody stands.
                  {stage === "campaign"
                    ? " And one move a week on the calendar above, where you can see it coming."
                    : ""}
                  {" "}{stage !== "campaign" && (() => {
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
                <span className={heat >= KIRKMAN_SIGHT || leakFeedsHim ? "text-red-400 font-bold" : "text-teal-400"}>
                  {heat >= KIRKMAN_SIGHT
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
            move={move}
            onMoveTarget={() => setShowMove(true)}
            onInoculate={(actor, where) => { if (hoursLeftFor(actor) >= 1) addPlan(actor.id, "inoculate", null, where); }}
            staleWeek={week}
          />

          {/* No shelf. Everything it carried per committee member now lives on that
              member's own card; what's left is the one instruction and the one button. */}
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-stone-500 flex-1 min-w-[16rem]">
              {move ? "Click anyone to plan. Drag one of your people onto somebody, or onto what management has booked." : "Click anyone to plan. Drag one of your people onto somebody to send them."}
            </p>
            {megaphone && (() => {
              const n = planEntries.filter(e => e.type === "turnout").length;
              return (
                <button type="button" onClick={() => setShowAction(true)} aria-label="Coordinated action"
                  title={stage === "campaign" ? "A coordinated action: turn the floor out." : "The open letter: once, before you file."}
                  className={`shrink-0 flex items-center gap-1.5 border-2 px-2.5 py-1 text-sm font-bold transition-colors ${n ? "border-teal-500 text-teal-300 bg-teal-950/40" : "border-teal-800 text-teal-400 hover:bg-teal-950/30"}`}>
                  <Megaphone size={15} />{n ? ` ${n}` : ""}
                </button>
              );
            })()}
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
            move={stage === "campaign" ? campaign.next : null}
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
                <span className="text-stone-200 font-bold">Those {ELECTION_WEEKS} weeks belong to them.</span> A move on their calendar every week, one-on-ones
                with whoever stands alone, and no way to withdraw once you've filed.
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
                    ? `Ahead by a hair. ${ELECTION_WEEKS} weeks of their campaign will eat that.`
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
            {CONSULTANT_NAME} is now on the floor full time. Every week his next move goes on the calendar: a meeting, a perk, a threat, a raise.
            Get there first with whoever on the committee knows those people. You have {ELECTION_WEEKS} weeks and the same hours you always had.
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
              "Between the petition and the ballot, the company worked everyone the committee could not reach.",
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
          move={move}
          stage={stage}
          allowed={allowedActions}
          social={social}
          onOpenMove={() => { setSelectedWorker(null); setPairActorId(null); setShowMove(true); }}
          onPlan={(actorId, type, targetId) => { addPlan(actorId, type, targetId); setSelectedWorker(null); setPairActorId(null); }}
          onClose={() => { setSelectedWorker(null); setPairActorId(null); }}
        />
      )}

      {showMapNag && phase === "plan" && (() => {
        const gaps = mapProgress(workers, social);
        const names = (list, n = 4) => list.slice(0, n).map(x => x.name).join(", ") + (list.length > n ? ` and ${list.length - n} more` : "");
        const rows = [];
        if (gaps.strangers.length) rows.push(<>Nobody has talked to <span className="text-stone-100">{names(gaps.strangers)}</span>. <span className="text-stone-500">A quick chat puts them on the map.</span></>);
        if (gaps.unplaced.length) rows.push(<><span className="text-stone-100">{names(gaps.unplaced)}</span> {gaps.unplaced.length === 1 ? "is" : "are"} not on the map yet. <span className="text-stone-500">A sit-down places them with their crowd.</span></>);
        if (gaps.unmet.length) rows.push(<><span className="text-stone-100">{gaps.unmet.slice(0, 3).map(e => `${e.x.name} has ${e.n}`).join(", ")}</span>{gaps.unmet.length > 3 ? ` and ${gaps.unmet.length - 3} more have` : ""} friend{gaps.unmet.length === 1 && gaps.unmet[0].n === 1 ? "" : "s"} you haven't met. <span className="text-stone-500">A sit-down with them names everyone.</span></>);
        return (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={() => setShowMapNag(false)}>
            <div className="bg-stone-900 border-2 border-amber-600 max-w-md w-full p-5 my-auto" onClick={e => e.stopPropagation()}>
              <Network size={34} className="mx-auto text-amber-400 mb-2" />
              <div className="font-stencil text-2xl text-amber-400 mb-2 text-center">{gaps.strangers.length ? "DON'T FORGET TO MAP THE FLOOR" : "THE MAP STILL HAS GAPS"}</div>
              <p className="text-base text-stone-200 mb-3 text-center">You can't organize people you don't know.</p>
              <div className="text-sm text-stone-400 leading-relaxed mb-4 space-y-1.5">
                {rows.map((r, i) => <div key={i}>▸ {r}</div>)}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => { setBoardView("social"); setShowMapNag(false); }}
                  className="flex-1 font-stencil text-base bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2.5 tracking-wide transition-colors">
                  SHOW ME THE MAP
                </button>
                <button onClick={() => setShowMapNag(false)}
                  className="flex-1 font-stencil text-base border-2 border-stone-600 hover:border-stone-400 text-stone-300 px-4 py-2.5 tracking-wide transition-colors">
                  GOT IT
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showMove && move && phase === "plan" && (
        <MovePanel week={week} move={move} workers={workers} social={social} organizers={organizers}
          hoursLeftFor={hoursLeftFor} hoursFor={hoursFor} planEntries={planEntries}
          onPlan={(actorId, type, extra) => addPlan(actorId, type, extra.targetId ?? null, extra)}
          onCancel={removePlan} onClose={() => setShowMove(false)} />
      )}
      {showAction && phase === "plan" && megaphone && (
        <ActionPicker week={week} workers={workers} social={social} organizers={organizers}
          hoursLeftFor={hoursLeftFor} hoursFor={hoursFor} planEntries={planEntries}
          uses={campaign.uses} tiers={stage === "campaign" ? COORDINATED_ORDER : ["letter"]}
          onSet={setTurnout} onClose={() => setShowAction(false)} />
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
