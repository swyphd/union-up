// One worker, one organizer, and what the pair can do this week.
import React, { useState } from "react";
import { X } from "lucide-react";
import { AffinityMarks, InfluenceTraitChip } from "./marks.jsx";
import { CostPips, HourPie } from "../shared.jsx";
import { infOn, outgoingTies } from "../../engine/act1/influence.js";
import { ACT1_ACTION, EDGE_MIN_DRAW, PUBLIC_TIERS, pathTo, convoGain, influenceKnown, misfireChance, publicGain, shownInfluence } from "../../engine/act1/actions.js";
import { affList, knownAff, tieBonus, tieFrom, tieOn } from "../../engine/act1/affinities.js";
import { ACT1_HOURS_PER_ORGANIZER, ACT1_WORKERS_SEED, TEAM_HEX, TEAM_LABEL } from "../../engine/act1/constants.js";
import { RATING_WORD, deltaMarks, rating, ratingGlyph } from "../../engine/act1/election.js";
import { COMMITTEE_COMFORT, VET_MIN_XP } from "../../engine/act1/coverage.js";
import { IDLE_GRACE, IDLE_QUIT, committeeHours, orgTier } from "../../engine/act1/committee.js";
import { infTrait } from "../../engine/act1/traits.js";
import { FRIEND_TIE, VOUCH_TIE, vouchFor } from "../../engine/act1/friends.js";

function Act1WorkerModal({ worker, allWorkers, influence, week = 1, organizers, hoursLeftFor, hoursFor, preferActorId = null, plannedFor = [], onCancelPlans = null, unlockPublic, onPlan, onClose }) {
  const others = organizers.filter(o => o.id !== worker.id);
  const [actorId, setActorId] = useState(() => {
    // A dragged-in organizer, unless their week is already spent.
    const dragged = others.find(o => o.id === preferActorId && preferActorId !== worker.id);
    if (dragged && hoursLeftFor(dragged) >= 1) return dragged.id;
    if (worker.organizer && !dragged) return worker.id;
    // Default to whoever carries the most weight with this person — but skip anyone
    // whose week is already spent, so the panel doesn't open fully greyed out. For one of
    // your own people the job is usually a check-in, and only experience can tell whether
    // they have been talking, so the most experienced organizer comes first.
    const ranked = [...others].sort((a, b) => worker.organizer
      ? (b.experience || 0) - (a.experience || 0)
      : infOn(influence, b.id, worker.id) - infOn(influence, a.id, worker.id));
    return (ranked.find(o => hoursLeftFor(o) >= 1) || ranked[0])?.id ?? null;
  });
  const actor = allWorkers.find(w => w.id === actorId);
  // A committee member's own panel is what they can do. "Somebody checks in on them" turns
  // it round: another organizer becomes the actor and this member the one being seen to.
  const [asTarget, setAsTarget] = useState(false);
  const isSelfPanel = worker.organizer && !asTarget && (!preferActorId || preferActorId === worker.id);
  const turnRound = () => {
    const best = [...others].filter(o => hoursLeftFor(o) >= 1).sort((a, b) => (b.experience || 0) - (a.experience || 0))[0] || others[0];
    if (best) { setActorId(best.id); setAsTarget(true); }
  };
  // A pair that arrived by drag is already decided, so the panel is an action card for
  // that pair rather than a place to shop for a different organizer. A plain click on
  // somebody shows the whole committee, closest relationship first.
  // A dragged-in organizer with no hours left is no pair at all: show the picker instead
  // of a panel that says "pick someone else" with the picker hidden.
  const preferred = others.find(o => o.id === preferActorId);
  const locked = !isSelfPanel && !!preferred && hoursLeftFor(preferred) > 0;
  // Your own people's relationships are known to you, so the ranking is the real tie,
  // including any signed mutual friend who can vouch.
  const rankedOthers = [...others].sort((a, b) => tieOn(influence, b, worker, allWorkers) - tieOn(influence, a, worker, allWorkers));


  const weight = actor && !isSelfPanel ? shownInfluence(influence, actor, worker) : 0;
  // What the relationship is actually worth, once the common ground you have surfaced
  // is counted. This is the number every formula below runs on.
  const via = actor && !isSelfPanel ? vouchFor(actor, worker, allWorkers) : null;
  const tie = actor && !isSelfPanel ? tieFrom(via && weight < FRIEND_TIE ? weight + VOUCH_TIE : weight, actor, worker) : 0;
  const path = actor && !isSelfPanel ? pathTo(actor, worker, allWorkers) : null;
  // Recruiting needs a real way in: a friend, or a vouch. Common ground alone is not one.
  const recruitPath = path && (path.kind === "friend" || path.kind === "vouch");
  const weightKnown = influenceKnown(actor, worker);
  const gains = actor && !isSelfPanel ? convoGain(actor, worker, tie) : null;

  const canAfford = (type) => actor && hoursLeftFor(actor) >= ACT1_ACTION[type].hours;

  const publicPreview = (tier) => {
    const uses = worker.publicUses?.[tier] || 0;
    const reached = outgoingTies(influence, worker.id).map(t => {
      const target = allWorkers.find(x => x.id === t.id);
      return target && !target.burned ? { ...t, target, tie: tieFrom(t.weight, worker, target) } : null;
    }).filter(t => t && t.tie >= EDGE_MIN_DRAW);
    const known = reached.filter(t => influenceKnown(worker, t.target));
    const total = known.reduce((s, t) => s + publicGain(worker, t.target, t.tie, tier, uses), 0);
    return { count: reached.length, knownCount: known.length, total, uses };
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-stone-900 border-2 border-stone-700 max-w-lg w-full p-5 my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-stencil text-2xl text-amber-400">
            {locked && actor ? <>{actor.name} <span className="text-stone-500">{"\u2192"}</span> {worker.name}</> : worker.name}
          </div>
          <button onClick={onClose}><X size={18} className="text-stone-500 hover:text-stone-200" /></button>
        </div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <InfluenceTraitChip worker={worker} />
          <span className="text-xs text-stone-500">{worker.title}</span>
          <span className="flex items-center gap-1 text-xs text-stone-500">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: TEAM_HEX[worker.team] }} />
            {TEAM_LABEL[worker.team]}
          </span>
          {worker.guarded > 0 && <span className="text-[11px] font-bold text-red-400 border border-red-900 px-1.5">GUARDED · {worker.guarded}w</span>}
        </div>

        {/* The digit, the same one that is on their card, and the sentence behind its state.
            This is the panel where the player decides whether to ask, so how sure they are
            has to be in front of them at that moment. */}
        {!worker.burned && (() => {
          const g = ratingGlyph(worker, week);
          const word = g.digit ? RATING_WORD[g.digit] : "";
          return (
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono font-bold text-3xl leading-none" style={g.state === "hollow"
                ? { color: g.hex, WebkitTextStroke: `1px ${g.hex}`, WebkitTextFillColor: "transparent" }
                : { color: g.hex }}>{g.digit ?? "\u2014"}</span>
              <span className="text-xs text-stone-400 leading-snug">
                {worker.signed ? <>Signed. <span className="text-stone-500">A signature is an act, not an estimate.</span></>
                  : g.state === "solid" ? <>{word[0].toUpperCase() + word.slice(1)}. <span className="text-stone-500">Somebody sat down with them recently.</span></>
                  : g.state === "hollow" ? (g.age != null
                    ? <>Was {word}. <span className="text-stone-500">That read is {g.age} weeks old, and people move.</span></>
                    : <>Says {word}. <span className="text-stone-500">Their words, and words run warm: most people are this or lower.</span></>)
                  : <span className="text-stone-500">Nobody has talked to them.</span>}
              </span>
            </div>
          );
        })()}

        {plannedFor.length > 0 && onCancelPlans && (
          // Cancelling lives here, next to what it cancels, rather than as a mark on the
          // board that has to be found before it can be clicked.
          <div className="border border-amber-700 bg-amber-950/25 px-3 py-2 mb-3">
            <div className="text-[11px] text-amber-400 font-bold tracking-wide mb-1">ALREADY PLANNED THIS WEEK</div>
            {plannedFor.map(e => (
              <div key={e.key} className="flex items-center justify-between gap-3 text-sm text-stone-200">
                <span>
                  {allWorkers.find(x => x.id === e.actorId)?.name} {"\u2192"} {ACT1_ACTION[e.type].label.toLowerCase()}
                  <span className="text-stone-500"> ({ACT1_ACTION[e.type].hours}h)</span>
                </span>
                <button
                  onClick={() => onCancelPlans(e.key)}
                  className="text-xs font-bold border border-stone-600 hover:border-red-500 hover:text-red-400 text-stone-300 px-2 py-1 transition-colors"
                >CANCEL</button>
              </div>
            ))}
          </div>
        )}
        {/* Who they are, and what they have in common with whoever is doing the asking.
            Everything else about this person — where they stand, how many hours they have
            left, what the company has bought — is already on their card on the board, and
            saying it twice made this panel longer than the decision it exists to serve. */}
        <p className="text-sm text-stone-400 leading-relaxed mb-3">{worker.hook}</p>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          <AffinityMarks worker={worker} actor={isSelfPanel ? null : actor} />
        </div>

        {worker.history.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-stone-500 font-bold mb-1 tracking-wide">HISTORY</div>
            <div className="bg-stone-950 border border-stone-800 p-2 max-h-28 overflow-y-auto space-y-1">
              {worker.history.map((h, i) => (<div key={i} className="text-xs text-stone-400">▸ {h}</div>))}
            </div>
          </div>
        )}

        {worker.burned ? (
          <div className="text-sm text-red-400">This person is out of play for the rest of the campaign.</div>
        ) : isSelfPanel ? (
          <div className="space-y-2">
            <div className="text-xs text-stone-500 tracking-wide flex items-center gap-2 flex-wrap">
              <span>{worker.name}</span>
              <HourPie left={Math.max(0, hoursLeftFor(worker))} total={hoursFor(worker)} hex="#fbbf24" size={19}
                label={`${hoursLeftFor(worker)} of ${hoursFor(worker)} hours left this week`} />
              {worker.shaken > 0 && <span className="text-red-400"> — under a manager's eye this week</span>}
            </div>
            <div className="border border-stone-800 bg-stone-950/50 px-3 py-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold" style={{ color: orgTier(worker).hex }}>{orgTier(worker).label}</span>
              </div>
              <div className="h-1 w-full bg-stone-800 mb-1.5">
                <div className="h-1" style={{ width: `${worker.experience || 0}%`, backgroundColor: orgTier(worker).hex }} />
              </div>
              <div className="text-stone-400 leading-snug">{orgTier(worker).blurb}</div>
              {!isFounder(worker) && (
                <div className={`mt-1 ${worker.leakKnown ? "text-red-400 font-bold" : "text-stone-500"}`}>
                  {worker.leakKnown ? "Has been talking to a manager. Take them off the committee."
                    : worker.vettedWeek != null ? `Vetted in week ${worker.vettedWeek}.`
                    : "Not vetted. A check-in from a seasoned organizer would tell you whether they talk."}
                </div>
              )}
              {(worker.weeksIdle || 0) > IDLE_GRACE && (
                <div className="text-amber-400 mt-1 font-bold">
                  Idle {worker.weeksIdle} weeks — down to {committeeHours(worker)} hour{committeeHours(worker) === 1 ? "" : "s"}. They leave at {IDLE_QUIT}.
                </div>
              )}
            </div>
            {others.length > 0 && (
              <button onClick={turnRound}
                className={`w-full text-left border-2 px-3 py-2 transition-colors ${worker.leakKnown ? "border-red-700 hover:bg-red-950/30" : "border-amber-800 hover:bg-amber-950/30"}`}>
                <div className={`text-sm ${worker.leakKnown ? "text-red-300" : "text-amber-300"}`}>Somebody checks in on {worker.name} {"\u2192"}</div>
                <div className="text-xs text-stone-400 leading-snug mt-0.5">
                  Another organizer spends an hour on them: keeps them from drifting, and a seasoned one can tell whether they have been talking. Or take them off the committee.
                </div>
              </button>
            )}
            {!unlockPublic && (
              <div className="text-xs text-stone-600 italic border border-stone-800 px-3 py-2">
                Right now {worker.name} can only have conversations. Click someone else on the floor to plan one.
              </div>
            )}
            {unlockPublic && ["small", "medium", "large"].map(tier => {
              const p = publicPreview(tier);
              const t = PUBLIC_TIERS[tier];
              const affordable = hoursLeftFor(worker) >= ACT1_ACTION[tier].hours;
              return (
                <button
                  key={tier}
                  disabled={!affordable}
                  onClick={() => onPlan(worker.id, tier)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${affordable ? "border-stone-700 hover:bg-stone-800/60" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-sm text-stone-100 flex justify-between">
                    <span>{ACT1_ACTION[tier].label}</span>
                    <CostPips hours={ACT1_ACTION[tier].hours} affordable={affordable} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">{t.blurb}</div>
                  <div className="text-xs text-teal-400 leading-snug mt-0.5">
                    Reaches {p.count} coworker{p.count === 1 ? "" : "s"} they carry weight with{p.knownCount < p.count ? `, ${p.count - p.knownCount} of them you have not met` : ""}.
                  </div>
                  {p.uses > 0 && (
                    <div className="text-xs text-amber-500 leading-snug mt-0.5">
                      {worker.name} has already done this {p.uses === 1 ? "once" : `${p.uses} times`} — it isn't news anymore. Escalating lands harder than repeating.
                    </div>
                  )}
                  {t.burn > 0 && (
                    <div className="text-xs text-red-400 leading-snug mt-0.5">
                      Exposure risk: {tier === "large" ? "high" : "some"}. If management moves on them, they're out of the campaign and everyone they carry loses ground.
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : others.length === 0 ? (
          <div className="text-sm text-stone-500">Nobody on the committee is free to work on {worker.name} right now.</div>
        ) : (
          <div>
            <div className={locked ? "hidden" : "text-xs text-stone-500 font-bold mb-1 tracking-wide"}>WHO DOES IT</div>
            <div className={locked ? "hidden" : "flex flex-wrap gap-1.5 mb-2"}>
              {rankedOthers.map(o => {
                const wgtKnown = influenceKnown(o, worker);
                const oTie = wgtKnown ? tieOn(influence, o, worker, allWorkers) : null;
                const tieHex = oTie == null ? "#57534e" : oTie >= 55 ? "#2dd4bf" : oTie >= 25 ? "#fbbf24" : "#78716c";
                const tieWord = oTie == null ? "you don't know how these two get on" : oTie >= 55 ? "close: this is who should be doing it" : oTie >= 25 ? "they know each other" : "barely know each other";
                const selected = o.id === actorId;
                return (
                  <button
                    key={o.id}
                    onClick={() => setActorId(o.id)}
                    className={`border px-2 py-1 text-left transition-colors ${selected ? "border-amber-500 bg-amber-950/30" : "border-stone-700 hover:bg-stone-800/60"}`}
                  >
                    <div className="text-[13px] text-stone-100 flex items-center gap-1.5">
                      {o.name}
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: infTrait(o).hex }} title={infTrait(o).label} />
                    </div>
                    <div className="text-[11px] flex items-center gap-1.5">
                      <HourPie left={Math.max(0, hoursLeftFor(o))} total={hoursFor(o)} hex={hoursLeftFor(o) <= 0 ? "#f87171" : "#fbbf24"} size={13}
                        label={`${hoursLeftFor(o)} of ${hoursFor(o)} hours left`} />
                      <span className="inline-block w-2.5 h-2.5 rounded-full border-2" title={tieWord} style={{ borderColor: tieHex, backgroundColor: oTie != null && oTie >= 55 ? tieHex : "transparent" }} />
                    </div>
                  </button>
                );
              })}
            </div>
            {actor && (
              <div className="text-xs text-stone-400 border border-stone-800 bg-stone-950/50 px-2.5 py-2 mb-3 leading-relaxed">
                {/* One line: the tie, and how much of it is common ground you surfaced.
                    The symbols above already say WHICH things they share, so this does
                    not repeat them. */}
                {weightKnown ? (
                  <>
                    <span className="text-stone-300 font-bold">{actor.name} {"\u2192"} {worker.name}:</span>
                    <span className="text-stone-400">
                      {" "}
                      {tie >= 55 ? "this is who should be doing it"
                        : tie >= 25 ? "it'll land, but not hard"
                        : "whatever they say bounces off"}
                    </span>
                    {path?.kind === "friend" && <span className="text-teal-300"> · friends</span>}
                    {path?.kind === "vouch" && <span className="text-teal-300"> · {path.via.name} vouches for them</span>}
                    {tieBonus(actor, worker) > 0 && (
                      <span className="text-teal-300"> · what they share does some of the work</span>
                    )}
                  </>
                ) : (
                  <span className="text-stone-500">
                    <span className="text-stone-300 font-bold">You don't know how these two get on.</span> Everything below assumes an average relationship.
                  </span>
                )}
                                {hoursLeftFor(actor) <= 0 && (
                  <><br /><span className="text-red-400">{actor.name} has no hours left this week — pick someone else, or free up an hour in the plan below.</span></>
                )}
              </div>
            )}

            <div className="space-y-2">
              {worker.organizer && (
                <button
                  disabled={!canAfford("checkin")}
                  onClick={() => onPlan(actor.id, "checkin", worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford("checkin") ? "border-amber-700 hover:bg-amber-950/30" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-sm text-amber-300 flex justify-between items-center">
                    <span>{ACT1_ACTION.checkin.label}</span>
                    <CostPips hours={ACT1_ACTION.checkin.hours} affordable={canAfford("checkin")} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">
                    An hour of {actor.name}'s week spent on {worker.name} instead of a target. +10 experience, resets their idle clock
                    {worker.shaken > 0 ? ", and gets them out from under the manager's eye this week" : ""}.
                    {!isFounder(worker) && ((actor.experience || 0) >= VET_MIN_XP
                      ? <span className="text-teal-300"> {actor.name} has done this long enough to tell whether {worker.name} has been talking.</span>
                      : <span className="text-stone-500"> {actor.name} is too new at this to tell whether {worker.name} has been talking.</span>)}
                  </div>
                  {(worker.weeksIdle || 0) >= IDLE_QUIT - 1 && (
                    <div className="text-xs text-amber-400 leading-snug mt-0.5 font-bold">
                      {worker.name} walks off the committee next week without this.
                    </div>
                  )}
                </button>
              )}
              {worker.organizer && !isFounder(worker) && (
                <button
                  disabled={!canAfford("drop")}
                  onClick={() => onPlan(actor.id, "drop", worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford("drop") ? (worker.leakKnown ? "border-red-700 hover:bg-red-950/30" : "border-stone-700 hover:bg-stone-800/60") : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className={`text-sm flex justify-between items-center ${worker.leakKnown ? "text-red-300" : "text-stone-300"}`}>
                    <span>{ACT1_ACTION.drop.label}</span>
                    <CostPips hours={ACT1_ACTION.drop.hours} affordable={canAfford("drop")} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">
                    {worker.leakKnown
                      ? `${worker.name} has been talking. Off the committee, they hear nothing more.`
                      : `They step back the way a neglected member does: they lose ground, and most of what they have learned.`}
                  </div>
                </button>
              )}
              {["quick", "deep"].map(type => (
                <button
                  key={type}
                  disabled={!canAfford(type)}
                  onClick={() => onPlan(actor.id, type, worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford(type) ? "border-stone-700 hover:bg-stone-800/60" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-sm text-stone-100 flex justify-between">
                    <span>{ACT1_ACTION[type].label}</span>
                    <CostPips hours={ACT1_ACTION[type].hours} affordable={canAfford(type)} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">
                    {type === "deep"
                      ? <><span className="text-teal-400 font-bold">{deltaMarks(gains.deepTrue)}</span> where they stand, and the digit turns solid. Maps all their friends and their crowd, and how their friends are doing.</>
                      : <><span className="text-teal-400">{gains.quickTrue > 0 ? deltaMarks(gains.quickTrue) : "\u25B3"}</span> where they stand, and you hear what they say. Surfaces a thing or two, and one friend's name.</>}
                  </div>
                  {type === "deep" && misfireChance(actor, worker, allWorkers) > 0 && (
                    <div className="text-xs text-red-400 leading-snug mt-0.5">
                      <span className="font-bold">!</span> {affList(worker).some(t => !knownAff(worker).includes(t))
                        ? "No way in: not friends, nobody signed to vouch, nothing found in common yet. This can land as a pitch and put them on guard. Quick chat first."
                        : "No way in: not friends, nobody signed to vouch, nothing in common. This can land as a pitch and put them on guard."}
                    </div>
                  )}
                </button>
              ))}

              {!worker.signed && (
                <button
                  disabled={!canAfford("ask")}
                  onClick={() => onPlan(actor.id, "ask", worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford("ask") ? "border-teal-800 hover:bg-teal-950/30" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-sm text-teal-300 flex justify-between">
                    <span>{ACT1_ACTION.ask.label}</span>
                    <CostPips hours={ACT1_ACTION.ask.hours} affordable={canAfford("ask")} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">
                    {(() => {
                      const g = ratingGlyph(worker, week);
                      if (g.state === "solid") return g.digit >= 5 ? "Ready. Ask." : g.digit === 4 ? "With you, and it could go either way on paper." : "Not ready underneath. Asking now is worse than not asking.";
                      if (g.state === "hollow") return <span className="text-amber-400">{g.age != null ? `Your read is ${g.age} weeks old.` : "You have their word, not a read."} A hollow {g.digit} is usually lower underneath. Sit down first.</span>;
                      return <span className="text-amber-400">Nobody has even talked to them.</span>;
                    })()}
                    {worker.askedRecently > 0 && " Asked recently — harder right now."}
                    <span className="text-red-400"> A no sets them back and makes the next ask harder.</span>
                  </div>
                </button>
              )}

              {worker.signed && !worker.organizer && (
                <button
                  disabled={!canAfford("recruit") || !recruitPath}
                  onClick={() => onPlan(actor.id, "recruit", worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford("recruit") && recruitPath ? "border-amber-700 hover:bg-amber-950/30" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-sm text-amber-300 flex justify-between">
                    <span>{ACT1_ACTION.recruit.label}</span>
                    <CostPips hours={ACT1_ACTION.recruit.hours} affordable={canAfford("recruit")} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">
                    {!recruitPath
                      ? <span className="text-amber-400">{actor.name} has no way to ask this. It takes a friend on the committee, or a signed friend in common to vouch.</span>
                      : (() => {
                          const d = rating(worker.trueSupport ?? 0);
                          return d >= 5
                            ? <>A solid 5: a safe pair of hands. +{ACT1_HOURS_PER_ORGANIZER} hours a week, and their friends become yours to reach.</>
                            : <span className="text-amber-300">{d === 4 ? `Signed, but a 4. Some 4s repeat what they hear in committee to a manager.` : `Signed once, and a ${d} now. Likely to talk.`} A seasoned organizer's check-in finds out.</span>;
                        })()}
                    {recruitPath && organizers.length >= COMMITTEE_COMFORT && (
                      <span className="text-red-400"> Past {COMMITTEE_COMFORT}, every member makes the committee likelier to leak and runs the floor hotter.</span>
                    )}
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// The two people the campaign started with never leak and are never vetted.
const isFounder = (w) => !!ACT1_WORKERS_SEED.find(s => s.id === w.id)?.organizer;

export { Act1WorkerModal };
