// Phase 2 on screen: management's calendar, the counter panel it opens, and the
// megaphone's picker for a coordinated action.
import React, { useState } from "react";
import { Banknote, Gift, Megaphone, Presentation, ShieldAlert, X } from "lucide-react";
import { CostPips, HourPie } from "../shared.jsx";
import { TEAM_HEX, TEAM_LABEL } from "../../engine/act1/constants.js";
import { CIRCLE_BY_ID } from "../../engine/act1/friends.js";
import { ratingGlyph } from "../../engine/act1/election.js";
import { CAMPAIGN_TUNING, COORDINATED, COORDINATED_ORDER, visibleHit, visiblePool, visibleReach } from "../../engine/act1/campaign.js";

const MOVE_RED = "#f87171";
// One picture per move. The board draws the same mark on whatever it lands on.
const MOVE_ICON = { meeting: Presentation, perk: Gift, threat: ShieldAlert, raise: Banknote };
const MOVE_WORD = { meeting: "MEETING", perk: "PERK", threat: "THREAT", raise: "RAISE" };

// Where the move lands, in a word or two.
function moveWhere(move, workers) {
  if (!move) return "";
  if (move.kind === "meeting") return TEAM_LABEL[move.team];
  if (move.kind === "perk") return CIRCLE_BY_ID[move.circle]?.label ?? "";
  return workers.find(x => x.id === move.targetId)?.name ?? "";
}
const moveHex = (move) => (move?.kind === "meeting" ? TEAM_HEX[move.team] : move?.kind === "perk" ? CIRCLE_BY_ID[move.circle]?.hex : MOVE_RED);

// The strip above the board: this week's move, and who is already on it.
function CalendarStrip({ move, workers, social, planEntries, onOpen }) {
  if (!move) return null;
  const Icon = MOVE_ICON[move.kind];
  const counters = planEntries.filter(e => (e.type === "inoculate" && ((move.kind === "meeting" && e.team === move.team) || (move.kind === "perk" && e.circle === move.circle)))
    || (e.type === "standwith" && e.targetId === move.targetId));
  const reached = new Set();
  counters.filter(e => e.type === "inoculate").forEach(e => {
    const a = workers.find(x => x.id === e.actorId);
    if (a) visibleReach(a, move, workers, social).reached.forEach(x => reached.add(x.id));
  });
  const hitCount = visibleHit(move, workers, social).length;
  return (
    <button type="button" onClick={onOpen}
      className="w-full mb-3 flex items-center gap-3 border-2 px-3 py-2 text-left transition-colors hover:bg-red-950/30"
      style={{ borderColor: MOVE_RED, backgroundColor: "rgba(127,29,29,0.12)" }}>
      <Icon size={22} style={{ color: MOVE_RED }} className="shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] tracking-widest text-red-400">THIS WEEK</span>
        <span className="block font-stencil text-lg tracking-wide text-stone-100 leading-tight">
          {MOVE_WORD[move.kind]} <span className="text-stone-500">·</span> <span style={{ color: moveHex(move) }}>{moveWhere(move, workers)}</span>
        </span>
      </span>
      <span className="text-right shrink-0">
        {counters.length > 0 ? (
          <span className="block text-sm font-bold text-teal-300">
            {move.kind === "threat" || move.kind === "raise"
              ? `${counters.map(e => workers.find(x => x.id === e.actorId)?.name).join(", ")} with them`
              : `${reached.size} of ${hitCount} covered`}
          </span>
        ) : (
          <span className="block text-sm font-bold text-red-300">{move.kind === "threat" || move.kind === "raise" ? "alone" : `0 of ${hitCount} covered`}</span>
        )}
      </span>
    </button>
  );
}

// Who on the committee can answer this week's move, and how much each would cover.
function MovePanel({ week, move, workers, social, organizers, hoursLeftFor, hoursFor, planEntries, onPlan, onCancel, onClose }) {
  const Icon = MOVE_ICON[move.kind];
  const person = move.kind === "threat" || move.kind === "raise";
  const type = person ? "standwith" : "inoculate";
  const mine = (o) => planEntries.find(e => e.actorId === o.id && e.type === type
    && (person ? e.targetId === move.targetId : move.kind === "meeting" ? e.team === move.team : e.circle === move.circle));
  const rows = organizers.filter(o => !(person && o.id === move.targetId)).map(o => {
    const r = person ? null : visibleReach(o, move, workers, social);
    return { o, r, planned: mine(o) };
  }).sort((a, b) => (b.r?.reached.length ?? 0) - (a.r?.reached.length ?? 0));
  const hit = person ? [] : visibleHit(move, workers, social);
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-stone-900 border-2 max-w-lg w-full p-5 my-auto" style={{ borderColor: MOVE_RED }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-stencil text-2xl text-red-400">
            <Icon size={22} /> {MOVE_WORD[move.kind]} <span className="text-stone-500">·</span> <span style={{ color: moveHex(move) }}>{moveWhere(move, workers)}</span>
          </div>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-stone-500 hover:text-stone-200" /></button>
        </div>
        <p className="text-sm text-stone-400 leading-relaxed mb-2">
          {move.kind === "meeting" && "Everyone in the department, paid time, nobody allowed to answer back. Whoever sits through it cold is unreadable afterwards."}
          {move.kind === "perk" && "Bought for the thing that crowd has in common. Unless somebody gets there first, their friendships stop doing any work for you."}
          {move.kind === "threat" && "A room with Kirkman and their manager. Alone, people fold."}
          {move.kind === "raise" && "A quiet offer. Alone, people take it."}
        </p>
        {/* What the hour actually does, in the numbers the engine uses, so the player can
            tell a counter that matters from one that is wasted. */}
        <div className="text-xs leading-snug border border-stone-800 bg-stone-950/50 px-2.5 py-2 mb-3 space-y-0.5">
          {person ? (
            <>
              <div><span className="text-teal-300 font-bold">With somebody beside them:</span> <span className="text-stone-400">{move.kind === "raise"
                ? "they turn it down and repeat the offer out loud, and their friends move toward you."
                : "it backfires: they hold, write down who was in the room, and their friends move toward you."}</span></div>
              <div><span className="text-red-300 font-bold">Alone:</span> <span className="text-stone-400">{move.kind === "raise"
                ? "they may take it and pull their card. The less sure they are, the likelier."
                : "up to a coin flip that they step off the committee, and their friends take fright."}</span></div>
            </>
          ) : (
            <>
              <div><span className="text-teal-300 font-bold">Reached first:</span> <span className="text-stone-400">{move.kind === "meeting"
                ? `the meeting lands at ${Math.round(CAMPAIGN_TUNING.inoculated * 100)}% strength, about ${Math.round(CAMPAIGN_TUNING.meetingTrue * CAMPAIGN_TUNING.inoculated)} off where they stand instead of ${CAMPAIGN_TUNING.meetingTrue}. No fear, and your read on them survives.`
                : `the perk lands at ${Math.round(CAMPAIGN_TUNING.inoculated * 100)}% strength, and the crowd's friendships keep working for you.`}</span></div>
              <div><span className="text-red-300 font-bold">Not reached:</span> <span className="text-stone-400">{move.kind === "meeting"
                ? "full hit, fear goes up, and unless they have signed their digit goes back to a guess."
                : "full hit, fear goes up, and friendships inside that crowd count for nothing until the perk lapses."}</span></div>
              <div className="text-stone-500">Reaches stack. Once everyone is covered, another hour here is wasted.</div>
            </>
          )}
        </div>
        {!person && hit.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {hit.map(x => {
              const g = ratingGlyph(x, week);
              return <span key={x.id} className="text-[11px] border border-stone-700 px-1.5 py-0.5 text-stone-300">{x.name}{g.digit ? <span className="ml-1 font-bold" style={{ color: g.hex }}>{g.digit}</span> : null}</span>;
            })}
          </div>
        )}
        <div className="text-xs text-stone-500 font-bold mb-1 tracking-wide">{person ? "WHO GOES IN WITH THEM" : "WHO GETS THERE FIRST"}</div>
        <div className="space-y-1.5">
          {rows.map(({ o, r, planned }) => {
            const left = hoursLeftFor(o);
            const can = planned || left >= 1;
            return (
              <button key={o.id} type="button" disabled={!can}
                onClick={() => (planned ? onCancel(planned.key) : onPlan(o.id, type, person ? { targetId: move.targetId } : move.kind === "meeting" ? { team: move.team } : { circle: move.circle }))}
                className={`w-full flex items-center gap-2 border-2 px-3 py-1.5 text-left transition-colors ${planned ? "border-teal-600 bg-teal-950/30" : can ? "border-stone-700 hover:bg-stone-800/60" : "border-stone-800 opacity-40 cursor-not-allowed"}`}>
                <HourPie left={Math.max(0, left)} total={hoursFor(o)} size={15} />
                <span className="text-sm text-stone-100 flex-1">{o.name}</span>
                {r && <span className={`text-xs font-bold ${r.reached.length ? "text-teal-300" : "text-stone-600"}`}>{r.inside ? "all of them" : `${r.reached.length} of ${r.hit.length}`}</span>}
                {planned ? <span className="text-xs font-bold text-teal-300">✓</span> : <CostPips hours={1} affordable={can} />}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-stone-500 mt-3 leading-snug">
          {person ? "One hour. With somebody beside them, it does not land." : "One hour. Somebody who works there or runs with that crowd reaches all of it; anyone else, only their own friends and crowd."}
        </p>
      </div>
    </div>
  );
}

// The megaphone. One tier, and a toggle for each committee member: each spends an hour
// turning out their friends and their crowd.
function ActionPicker({ week, workers, social, organizers, hoursLeftFor, hoursFor, planEntries, uses = {}, tiers = COORDINATED_ORDER, onSet, onClose }) {
  const planned = planEntries.filter(e => e.type === "turnout");
  const [tier, setTier] = useState(planned[0]?.tier || tiers.find(t => !uses[t]) || tiers[0]);
  const [picked, setPicked] = useState(() => new Set(planned.length ? planned.map(e => e.actorId) : organizers.filter(o => hoursLeftFor(o) >= 1).map(o => o.id)));
  const parts = organizers.filter(o => picked.has(o.id));
  const pool = visiblePool(parts, workers, social);
  const solid = pool.filter(x => x.organizer || x.signed || ((ratingGlyph(x, week).digit || 0) >= 4 && ratingGlyph(x, week).state === "solid")).length;
  const T = COORDINATED[tier];
  // A participant already planned keeps their hour; anybody else needs one free.
  const can = (o) => planned.some(e => e.actorId === o.id) || hoursLeftFor(o) >= 1;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-stone-900 border-2 border-teal-700 max-w-lg w-full p-5 my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-stencil text-2xl text-teal-400"><Megaphone size={22} /> TURN THE FLOOR OUT</div>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-stone-500 hover:text-stone-200" /></button>
        </div>
        <div className="flex gap-1.5 mb-3">
          {tiers.map(t => (
            <button key={t} type="button" onClick={() => setTier(t)}
              className={`flex-1 border-2 px-2 py-1.5 text-center transition-colors ${tier === t ? "border-teal-500 bg-teal-950/40" : "border-stone-700 hover:bg-stone-800/60"}`}>
              <div className="text-sm text-stone-100">{COORDINATED[t].label}</div>
              <div className="text-[11px] text-stone-500">needs {COORDINATED[t].bar}{uses[t] ? ` · done ${uses[t]}×` : ""}</div>
            </button>
          ))}
        </div>
        <div className="space-y-1.5 mb-3">
          {organizers.map(o => {
            const on = picked.has(o.id);
            const ok = can(o);
            return (
              <button key={o.id} type="button" disabled={!ok && !on}
                onClick={() => setPicked(s => { const n = new Set(s); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })}
                className={`w-full flex items-center gap-2 border-2 px-3 py-1.5 text-left transition-colors ${on ? "border-teal-600 bg-teal-950/30" : ok ? "border-stone-700 hover:bg-stone-800/60" : "border-stone-800 opacity-40 cursor-not-allowed"}`}>
                <HourPie left={Math.max(0, hoursLeftFor(o))} total={hoursFor(o)} size={15} />
                <span className="text-sm text-stone-100 flex-1">{o.name}</span>
                <span className={`text-xs font-bold ${on ? "text-teal-300" : "text-stone-600"}`}>{on ? "✓" : "—"}</span>
              </button>
            );
          })}
        </div>
        {/* The whole forecast in one line: who they can reach, how many you can count on, and the bar. */}
        <div className="border border-stone-700 px-3 py-2 mb-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-stone-400">reach <span className="text-stone-100 font-bold">{pool.length}</span></span>
          <span className="text-stone-400">sure <span className={`font-bold ${solid >= T.bar ? "text-teal-300" : "text-amber-300"}`}>{solid}</span></span>
          <span className="text-stone-400">needs <span className="text-stone-100 font-bold">{T.bar}</span></span>
        </div>
        <p className="text-[11px] text-stone-500 mb-3 leading-snug">
          Whoever turns out reads solid afterwards; whoever you counted on and didn't, hollow. Clear the bar and the whole floor moves. Miss it and management saw who stayed at their desk.
          {T.burn > 0 ? " Somebody can get named for this one." : ""}
        </p>
        <div className="flex gap-2">
          <button type="button" disabled={!parts.length} onClick={() => onSet(tier, parts.map(o => o.id))}
            className={`flex-1 font-stencil text-base px-4 py-2 tracking-wide transition-colors ${parts.length ? "bg-teal-600 hover:bg-teal-500 text-stone-950" : "bg-stone-800 text-stone-600 cursor-not-allowed"}`}>
            {planned.length ? "UPDATE" : "PLAN IT"} · {parts.length}h
          </button>
          {planned.length > 0 && (
            <button type="button" onClick={() => onSet(null, [])} className="font-stencil text-base border-2 border-stone-600 hover:border-red-500 hover:text-red-400 text-stone-300 px-4 py-2 tracking-wide transition-colors">CALL IT OFF</button>
          )}
        </div>
      </div>
    </div>
  );
}

export { MOVE_ICON, MOVE_WORD, MOVE_RED, moveWhere, moveHex, CalendarStrip, MovePanel, ActionPicker };
