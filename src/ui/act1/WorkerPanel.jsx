// One worker, one organizer, and what the pair can do this week.
import React, { useState } from "react";
import { X } from "lucide-react";
import { AffinityMarks, InfluenceTraitChip, LadderBadge } from "./marks.jsx";
import { CostPips, HourPie } from "../shared.jsx";
import { infOn, outgoingTies } from "../../engine/act1/influence.js";
import { ACT1_ACTION, EDGE_MIN_DRAW, PUBLIC_TIERS, convoGain, influenceKnown, misfireChance, publicGain, shownInfluence, signChance } from "../../engine/act1/actions.js";
import { affList, knownAff, tieBonus, tieFrom } from "../../engine/act1/affinities.js";
import { ACT1_HOURS_PER_ORGANIZER, ACT1_RECRUIT_REQ, TEAM_HEX, TEAM_LABEL, supportTier } from "../../engine/act1/constants.js";
import { readOf } from "../../engine/act1/election.js";
import { IDLE_GRACE, IDLE_QUIT, committeeHours, orgTier } from "../../engine/act1/committee.js";
import { infTrait } from "../../engine/act1/traits.js";

function Act1WorkerModal({ worker, allWorkers, influence, week = 1, organizers, hoursLeftFor, hoursFor, preferActorId = null, plannedFor = [], onCancelPlans = null, unlockPublic, consultantActive = false, onPlan, onClose }) {
  const others = organizers.filter(o => o.id !== worker.id);
  const [actorId, setActorId] = useState(() => {
    if (preferActorId && preferActorId !== worker.id && others.some(o => o.id === preferActorId)) return preferActorId;
    if (worker.organizer) return worker.id;
    // If the player picked the actor off the shelf first, honour that choice.
    if (preferActorId && preferActorId !== worker.id && others.some(o => o.id === preferActorId)) return preferActorId;
    // Default to whoever carries the most weight with this person — but skip anyone
    // whose week is already spent, so the panel doesn't open fully greyed out.
    const ranked = [...others].sort((a, b) => infOn(influence, b.id, worker.id) - infOn(influence, a.id, worker.id));
    return (ranked.find(o => hoursLeftFor(o) >= 1) || ranked[0])?.id ?? null;
  });
  const actor = allWorkers.find(w => w.id === actorId);
  const isSelfPanel = worker.organizer && (!preferActorId || preferActorId === worker.id);
  // Armed-actor flow: the pair is already decided, so the panel is an action card for
  // that pair rather than a place to shop for a different organizer.
  const locked = !isSelfPanel;

  const pctOf = (c) => Math.round(c * 20) * 5;

  const weight = actor && !isSelfPanel ? shownInfluence(influence, actor, worker) : 0;
  // What the relationship is actually worth, once the common ground you have surfaced
  // is counted. This is the number every formula below runs on.
  const tie = actor && !isSelfPanel ? tieFrom(weight, actor, worker) : 0;
  const weightKnown = influenceKnown(actor, worker);
  const gains = actor && !isSelfPanel ? convoGain(actor, worker, tie) : null;
  const chance = actor && !isSelfPanel ? signChance(actor, worker, tie) : 0;

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
          <LadderBadge worker={worker} />
          <InfluenceTraitChip worker={worker} />
          <span className="flex items-center gap-1 text-xs text-stone-500">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: TEAM_HEX[worker.team] }} />
            {TEAM_LABEL[worker.team]}
          </span>
          {worker.guarded > 0 && <span className="text-[11px] font-bold text-red-400 border border-red-900 px-1.5">GUARDED · {worker.guarded}w</span>}
        </div>

        {/* The read, as the same bar that is on their card. This is the panel where the
            player decides whether to ask, so how sure they are has to be in front of
            them at that moment — but it is one bar and a number, not a section. */}
        {!worker.burned && (() => {
          const r = readOf(worker, week);
          const hex = supportTier(r.mid).hex;
          return (
            <div className="flex items-center gap-2 mb-3"
              title={worker.signed ? "They signed — this is not an estimate."
                : r.exact ? "Somebody sat down with them recently, so this is where they actually stand."
                : r.kind === "fading" ? `Last read ${r.age} weeks ago, and people move.`
                : r.kind === "warm" ? "You've talked, never sat down. Their words are the top of this range, not the middle."
                : "Nobody has spoken to them. All you have is what they say to the room, which is a ceiling."}>
              <div className="relative h-1.5 flex-1 bg-stone-800 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 rounded-full" style={{
                  left: `${r.lo}%`, width: `${Math.max(1.5, r.hi - r.lo)}%`,
                  backgroundColor: hex, opacity: r.exact ? 0.95 : r.kind === "cold" ? 0.3 : 0.5,
                }} />
                {r.exact
                  ? <div className="absolute inset-y-0 w-0.5" style={{ left: `${r.mid}%`, backgroundColor: hex }} />
                  : <div className="absolute -inset-y-0.5 w-0.5" style={{ left: `${r.hi}%`, backgroundColor: hex, opacity: 0.8 }} />}
              </div>
              <span className="font-mono text-sm font-bold shrink-0" style={{ color: hex }}>
                {r.exact ? r.mid : `${r.lo}\u2013${r.hi}`}
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
                <span className="text-stone-500">{worker.experience || 0} xp</span>
              </div>
              <div className="h-1 w-full bg-stone-800 mb-1.5">
                <div className="h-1" style={{ width: `${worker.experience || 0}%`, backgroundColor: orgTier(worker).hex }} />
              </div>
              <div className="text-stone-400 leading-snug">{orgTier(worker).blurb}</div>
              {(worker.weeksIdle || 0) > IDLE_GRACE && (
                <div className="text-amber-400 mt-1 font-bold">
                  Idle {worker.weeksIdle} weeks — down to {committeeHours(worker)} hour{committeeHours(worker) === 1 ? "" : "s"}. They leave at {IDLE_QUIT}.
                </div>
              )}
            </div>
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
                    Reaches {p.count} coworker{p.count === 1 ? "" : "s"} along their influence{p.knownCount > 0 ? ` — about +${p.total} support in total across the ${p.knownCount} you've mapped` : ", none of them mapped yet"}.
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
              {others.map(o => {
                const wgt = infOn(influence, o.id, worker.id);
                const wgtKnown = influenceKnown(o, worker);
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
                      <span className="text-stone-500">inf {wgtKnown ? wgt : "?"}</span>
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
                    <span className="text-stone-300 font-bold">{actor.name} {"\u2192"} {worker.name}: {tie}</span>
                    {tieBonus(actor, worker) > 0 && (
                      <span className="text-teal-300"> ({weight} + {tie - weight} from what they share)</span>
                    )}
                    <span className="text-stone-500">
                      {" \u00b7 "}
                      {tie >= 55 ? "this is who should be doing it"
                        : tie >= 25 ? "it'll land, but not hard"
                        : "whatever they say bounces off"}
                    </span>
                  </>
                ) : (
                  <span className="text-stone-500">
                    <span className="text-stone-300 font-bold">Unmapped.</span> Numbers below assume an average relationship.
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
                  </div>
                  {(worker.weeksIdle || 0) >= IDLE_QUIT - 1 && (
                    <div className="text-xs text-amber-400 leading-snug mt-0.5 font-bold">
                      {worker.name} walks off the committee next week without this.
                    </div>
                  )}
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
                      ? <><span className="text-teal-400 font-bold">{weightKnown ? "+" : "\u2248+"}{gains.deepTrue}</span> where they stand, and you learn the number. Surfaces 3-4.</>
                      : <><span className="text-teal-400">{weightKnown ? "+" : "\u2248+"}{gains.quickTrue}</span> where they stand, and your read narrows. Surfaces 1-3.</>}
                  </div>
                  {type === "deep" && misfireChance(actor, worker) > 0 && (
                    <div className="text-xs text-red-400 leading-snug mt-0.5">
                      {Math.round(misfireChance(actor, worker) * 100)}% it misfires — {affList(worker).some(t => !knownAff(worker).includes(t))
                        ? "nothing found in common yet, so it lands as a pitch. Quick chat first."
                        : "these two have nothing to build on, so it lands as a pitch."}
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
                    {(worker.trueKnown ? worker.trueSupport : worker.support) < 46
                      ? (worker.trueKnown
                          ? "Nowhere near ready underneath — asking now is worse than not asking."
                          : "They don't sound ready, and you have no real read on them.")
                      : `${weightKnown ? "~" : "≈"}${pctOf(chance)}% they sign, from ${actor.name}.`}
                    {worker.askedRecently > 0 && " Asked recently — harder right now."}
                    <span className="text-red-400"> A no costs 5 and makes the next ask harder.</span>
                  </div>
                </button>
              )}

              {worker.signed && !worker.organizer && (
                <button
                  disabled={!canAfford("recruit") || !worker.trueKnown || (worker.trueSupport ?? 0) < ACT1_RECRUIT_REQ}
                  onClick={() => onPlan(actor.id, "recruit", worker.id)}
                  className={`w-full text-left border-2 px-3 py-2 transition-colors ${canAfford("recruit") && worker.trueKnown && (worker.trueSupport ?? 0) >= ACT1_RECRUIT_REQ ? "border-amber-700 hover:bg-amber-950/30" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
                >
                  <div className="text-sm text-amber-300 flex justify-between">
                    <span>{ACT1_ACTION.recruit.label}</span>
                    <CostPips hours={ACT1_ACTION.recruit.hours} affordable={canAfford("recruit")} />
                  </div>
                  <div className="text-xs text-stone-400 leading-snug mt-0.5">
                    {!worker.trueKnown
                      ? `You don't actually know where ${worker.name} stands — only what they say. Sit down with them properly before handing them other people's campaigns.`
                      : (worker.trueSupport ?? 0) < ACT1_RECRUIT_REQ
                      ? `Needs ${ACT1_RECRUIT_REQ} to take this on. Your read puts them at ${worker.trueSupport}, which is not close, however they talk.`
                      : `${worker.name} starts organizing too: +${ACT1_HOURS_PER_ORGANIZER} hours every week, their relationships become yours to direct, and they get better at it the more you use them. Leave them idle ${IDLE_QUIT} weeks and they walk.`}
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

export { Act1WorkerModal };
