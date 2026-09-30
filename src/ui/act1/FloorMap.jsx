// The floor board: the company's org chart, with the campaign drawn on top of it.
import React, { useState } from "react";
import { HourPieShapes, Pips, truncateNote } from "../shared.jsx";
import { AFF_ICON, AFF_UNKNOWN_LABEL, AFF_UNKNOWN_SUB, AffIcon, AffTip } from "./marks.jsx";
import { clamp } from "../../engine/rng.js";
import { ACT1_WORKERS_SEED, TEAM_HEX, TEAM_LABEL, cardStaleSoon, fulfillmentLabel, supportTier } from "../../engine/act1/constants.js";
import { LADDER, ladderOf } from "../../engine/act1/ladder.js";
import { ACT1_ACTION, EDGE_MIN_DRAW, influenceKnown } from "../../engine/act1/actions.js";
import { incomingTies, infOn, outgoingTies } from "../../engine/act1/influence.js";
import { AFF_BY_ID, affList, isPoisoned, knownAff, tieFrom } from "../../engine/act1/affinities.js";
import { readOf } from "../../engine/act1/election.js";
import { IDLE_GRACE, IDLE_QUIT, committeeHours } from "../../engine/act1/committee.js";
import { infTrait } from "../../engine/act1/traits.js";

// ---------- THE ORG CHART (Act One board) ----------
// The chart is the company's own picture of itself: teams, boxes, reporting lines.
// The influence arrows drawn on top of it are the real structure, and the whole point
// is that they don't respect the boxes. Organizing runs on the second map, not the first.
const ORG_CARD_W = 42;
const ORG_CARD_H = 25;
const ORG_COL_GAP = 3;
const ORG_ROW_GAP = 4.5;
const ORG_TEAM_GAP = 13;
const ORG_MARGIN = 6;
const ORG_TEAM_COLS = 2;
const ORG_ROOT_H = 12;
const ORG_HEADER_H = 11;
// Common ground you have surfaced, wherever it is marked.
const EDGE_COMMON_GROUND = "#2dd4bf";

// Fixed layout — the org chart never moves, so the player learns one stable picture of
// the floor instead of re-reading a new arrangement every week.
function computeOrgLayout(seed) {
  const teams = Object.keys(TEAM_LABEL);
  const blockW = ORG_TEAM_COLS * ORG_CARD_W + (ORG_TEAM_COLS - 1) * ORG_COL_GAP;
  const width = ORG_MARGIN * 2 + teams.length * blockW + (teams.length - 1) * ORG_TEAM_GAP;
  const rootY = 2;
  const headerY = rootY + ORG_ROOT_H + 11;
  const gridY = headerY + ORG_HEADER_H + 6;

  const cards = {};
  const teamBoxes = {};
  let maxRows = 0;
  teams.forEach((team, ti) => {
    const bx = ORG_MARGIN + ti * (blockW + ORG_TEAM_GAP);
    const members = seed.filter(w => w.team === team);
    const rows = Math.ceil(members.length / ORG_TEAM_COLS);
    maxRows = Math.max(maxRows, rows);
    teamBoxes[team] = {
      x: bx, y: headerY, w: blockW, h: ORG_HEADER_H,
      cx: bx + blockW / 2, cy: headerY + ORG_HEADER_H / 2,
      spineX: bx + blockW / 2,
      spineEndY: gridY + (rows - 1) * (ORG_CARD_H + ORG_ROW_GAP) + ORG_CARD_H / 2,
      count: members.length,
    };
    members.forEach((m, i) => {
      const col = i % ORG_TEAM_COLS;
      const row = Math.floor(i / ORG_TEAM_COLS);
      const x = bx + col * (ORG_CARD_W + ORG_COL_GAP);
      const y = gridY + row * (ORG_CARD_H + ORG_ROW_GAP);
      cards[m.id] = { x, y, w: ORG_CARD_W, h: ORG_CARD_H, cx: x + ORG_CARD_W / 2, cy: y + ORG_CARD_H / 2, team, col };
    });
  });

  const height = gridY + maxRows * ORG_CARD_H + (maxRows - 1) * ORG_ROW_GAP + 3;
  const root = { x: width / 2 - 38, y: rootY, w: 76, h: ORG_ROOT_H, cx: width / 2, cy: rootY + ORG_ROOT_H / 2 };
  return { cards, teamBoxes, root, width, height, headerY, gridY };
}

const ORG_LAYOUT = computeOrgLayout(ACT1_WORKERS_SEED);

// Where a line from a card's centre crosses that card's border, so arrows start and end
// at the box edge instead of disappearing underneath it.
function cardEdgePoint(card, dx, dy, pad = 0) {
  const adx = Math.abs(dx), ady = Math.abs(dy);
  const tx = adx > 1e-6 ? (card.w / 2 + pad) / adx : Infinity;
  const ty = ady > 1e-6 ? (card.h / 2 + pad) / ady : Infinity;
  const t = Math.min(tx, ty);
  return { x: card.cx + dx * t, y: card.cy + dy * t };
}

// labels lets a second act reuse this board with its own vocabulary — the geometry,
// influence arrows and card layout are identical, only the words change.
const FLOOR_LABELS = { organizerLegend: "YOURS TO DIRECT", signedLegend: "SIGNED A CARD", numberLegend: "SUPPORT" };

function Act1FloorMap({ workers, influence, staleWeek = null, weekNow = 1, layout = ORG_LAYOUT, planEntries = [], onSelect, onArm = null, highlights = null, edgePulses = [], stepKey = 0, notes = null, focusId = null, labels = FLOOR_LABELS, ladder = LADDER, rungOf = ladderOf, hoursLeft = null, tierOf = null, planLabel = (e) => ACT1_ACTION[e.type]?.short ?? e.type }) {
  const [hoverId, setHoverId] = useState(null);
  // Which common-ground mark the cursor is on. The tooltip is HTML rather than SVG so
  // its type is real pixels — the SVG version scaled down to about eight of them.
  const [hoverAff, setHoverAff] = useState(null);
  const anyRevealed = workers.some(w => w.revealed && !w.organizer);
  const active = hoverId != null ? hoverId : focusId;
  // The organizer the player has picked to act. Once somebody is armed, every card on
  // the floor lights the marks it has in common with them — which is the whole of the
  // deep-conversation decision, and the biggest cliff in the game: a sit-down with
  // somebody you share nothing with misfires and guards them for three weeks.
  const armed = focusId != null ? workers.find(x => x.id === focusId && x.organizer && !x.burned) : null;

  // An influence line is visible once either end is known to you — you can see your own
  // people's reach from day one, and sitting down with somebody reveals theirs.
  // Kept as a stat rather than a picture: how much of the floor's real structure you have
  // found, and how much of it the org chart would never have told you.
  const mapped = (() => {
    let total = 0, cross = 0;
    workers.forEach(a => {
      outgoingTies(influence, a.id).forEach(t => {
        const b = workers.find(x => x.id === t.id);
        if (!b || !influenceKnown(a, b)) return;
        if (tieFrom(t.weight, a, b) < EDGE_MIN_DRAW) return;
        total++; if (a.team !== b.team) cross++;
      });
    });
    return { total, cross };
  })();

  const plannedByWorker = {};
  planEntries.forEach(e => {
    const key = e.targetId != null ? e.targetId : e.actorId;
    if (!plannedByWorker[key]) plannedByWorker[key] = [];
    plannedByWorker[key].push(planLabel(e));
  });
  const planArrows = planEntries.filter(e => e.targetId != null);

  const hovered = workers.find(w => w.id === active);
  const hoveredOut = hovered ? outgoingTies(influence, hovered.id).filter(t => influenceKnown(hovered, workers.find(w => w.id === t.id))) : [];
  const hoveredIn = hovered && hovered.revealed ? incomingTies(influence, hovered.id) : [];
  const nameOf = (id) => workers.find(w => w.id === id)?.name || "?";
  const teamOf = (id) => workers.find(w => w.id === id)?.team;

  // Who the active person actually reaches, read straight off the influence map now that
  // nothing is drawn between the cards.
  const reaches = (aId, bId) => {
    const a = workers.find(x => x.id === aId), b = workers.find(x => x.id === bId);
    return !!a && !!b && influenceKnown(a, b) && tieFrom(infOn(influence, aId, bId), a, b) >= EDGE_MIN_DRAW;
  };
  const connectedToActive = (id) =>
    active != null && (id === active || reaches(active, id) || reaches(id, active));

  return (
    <div className="border-2 border-stone-800 bg-stone-900 card-perf mb-6">
      <div className="flex items-center justify-between px-3 pt-2 flex-wrap gap-y-1">
        <div className="font-stencil text-lg tracking-wide text-stone-200">THE FLOOR</div>
        {/* What the two card borders mean. The words come from `labels` so a second act
            can reuse this board without describing its own board in Act One's vocabulary. */}
        <div className="flex items-center gap-3 flex-wrap text-[10px]">
          <span className="flex items-center gap-1.5" title="You can spend this person's hours.">
            <span className="w-2.5 h-2 shrink-0 border" style={{ borderColor: "#f59e0b" }} />
            <span className="text-stone-400">{labels.organizerLegend}</span>
          </span>
          <span className="flex items-center gap-1.5" title="They are with you, but their hours are not yours to spend.">
            <span className="w-2.5 h-2 shrink-0 border" style={{ borderColor: "#2dd4bf" }} />
            <span className="text-stone-400">{labels.signedLegend}</span>
          </span>
          <span className="flex items-center gap-1.5" title="Not yet — or no longer.">
            <span className="w-2.5 h-2 shrink-0 border" style={{ borderColor: "#44403c" }} />
            <span className="text-stone-600">NEITHER</span>
          </span>
          {labels.numberLegend && (
            <span className="flex items-center gap-1.5 border-l border-stone-800 pl-3" title="What the big number on each card is measuring.">
              <span className="font-mono text-stone-400 font-bold">42</span>
              <span className="text-stone-500">=</span>
              <span className="text-stone-300 font-bold">{labels.numberLegend}</span>
            </span>
          )}
        </div>
      </div>


      {/* THE LADDER. Left to right is the whole campaign. */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] mb-2 px-0.5">
        {[...ladder].reverse().map((r, i) => (
          <span key={r.id} className="flex items-center gap-1.5" title={r.blurb}>
            {i > 0 && <span className="text-stone-700 mr-1">{"\u203a"}</span>}
            <Pips filled={r.pips} total={4} hex={r.hex} size={5} gap={1.5} />
            <span style={{ color: r.hex }}>{r.label}</span>
          </span>
        ))}
      </div>

      <div className="relative">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="w-full block select-none">
        <defs>
          <marker id="org-arrow-hot" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#fbbf24" />
          </marker>
        </defs>

        {/* ---- the company's own chart: reporting lines, drawn underneath everything ---- */}
        <g stroke="#3a3330" strokeWidth="0.5" fill="none">
          <line x1={layout.root.cx} y1={layout.root.y + layout.root.h} x2={layout.root.cx} y2={layout.headerY - 5.5} />
          <line
            x1={layout.teamBoxes[Object.keys(TEAM_LABEL)[0]].cx}
            y1={layout.headerY - 5.5}
            x2={layout.teamBoxes[Object.keys(TEAM_LABEL)[Object.keys(TEAM_LABEL).length - 1]].cx}
            y2={layout.headerY - 5.5}
          />
          {Object.values(layout.teamBoxes).map((tb, i) => (
            <line key={`drop-${i}`} x1={tb.cx} y1={layout.headerY - 5.5} x2={tb.cx} y2={tb.y} />
          ))}
          {Object.values(layout.teamBoxes).map((tb, i) => (
            <line key={`spine-${i}`} x1={tb.spineX} y1={tb.y + tb.h} x2={tb.spineX} y2={tb.spineEndY} />
          ))}
          {workers.map(w => {
            const c = layout.cards[w.id];
            const tb = layout.teamBoxes[c.team];
            if (!c || !tb) return null;
            const innerX = c.col === 0 ? c.x + c.w : c.x;
            return <line key={`stub-${w.id}`} x1={tb.spineX} y1={c.cy} x2={innerX} y2={c.cy} />;
          })}
        </g>

        <rect x={layout.root.x} y={layout.root.y} width={layout.root.w} height={layout.root.h} rx="1" fill="#1c1917" stroke="#44403c" strokeWidth="0.5" />
        <text x={layout.root.cx} y={layout.root.y + 5} textAnchor="middle" fontSize="4" fill="#a8a29e" fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.3">THE STUDIO</text>
        <text x={layout.root.cx} y={layout.root.y + 9.5} textAnchor="middle" fontSize="2.9" fill="#57534e" fontFamily="'Courier New', monospace">{workers.length} WORKERS · PLAY-EYE RUNS THE FLOOR</text>

        {Object.entries(layout.teamBoxes).map(([team, tb]) => (
          <g key={team}>
            <rect x={tb.x} y={tb.y} width={tb.w} height={tb.h} rx="1" fill="#1c1917" stroke={TEAM_HEX[team]} strokeWidth="0.5" strokeOpacity="0.7" />
            <rect x={tb.x} y={tb.y} width={tb.w} height="1.4" fill={TEAM_HEX[team]} fillOpacity="0.8" />
            <text x={tb.cx} y={tb.y + 7.6} textAnchor="middle" fontSize="4.5" fill="#d6d3d1" fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.25">{TEAM_LABEL[team]}</text>
          </g>
        ))}

        {planArrows.map((e, i) => {
          const a = layout.cards[e.actorId];
          const b = layout.cards[e.targetId];
          if (!a || !b) return null;
          const dx = b.cx - a.cx, dy = b.cy - a.cy;
          const p1 = cardEdgePoint(a, dx, dy, 0.8);
          const p2 = cardEdgePoint(b, -dx, -dy, 2.2);
          return (
            <line
              key={`plan-${i}`}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1.6 1.2" strokeOpacity="0.95"
              markerEnd="url(#org-arrow-hot)"
            />
          );
        })}

        {edgePulses.map((ev, i) => {
          const a = layout.cards[ev.from];
          const b = layout.cards[ev.to];
          if (!a || !b) return null;
          const dx = b.cx - a.cx, dy = b.cy - a.cy;
          const p1 = cardEdgePoint(a, dx, dy, 0.4);
          const p2 = cardEdgePoint(b, -dx, -dy, 1.5);
          return (
            <line
              key={`pulse-${stepKey}-${i}`}
              className="edge-pulse"
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              pathLength="20"
              stroke={ev.tone === "down" ? "#f87171" : "#2dd4bf"}
              strokeWidth="0.9"
            />
          );
        })}

        {/* ---- people ---- */}
        {workers.map(w => {
          const c = layout.cards[w.id];
          if (!c) return null;
          const tier = supportTier(w.support);
          const hl = highlights ? highlights[w.id] : null;
          const planLabels = plannedByWorker[w.id];
          const dim = active != null && !connectedToActive(w.id);
          const border = w.burned ? "#44403c" : w.organizer ? "#f59e0b" : w.signed ? "#2dd4bf" : "#44403c";
          // Only while the player is still spending the week: during a resolution the
          // right-hand slot belongs to the support delta.
          const budget = hoursLeft && !w.burned && !hl && hoursLeft[w.id] != null ? hoursLeft[w.id] : null;
          return (
            <g
              key={w.id}
              opacity={w.burned ? 0.4 : dim ? 0.35 : 1}
              className={w.burned ? "" : "cursor-pointer"}
              onClick={() => {
                if (w.burned) return;
                if (onArm && w.organizer) onArm(w); else onSelect(w);
              }}
              onMouseEnter={() => setHoverId(w.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="1.2" fill="#1c1917" stroke={border} strokeWidth={w.organizer || w.signed ? 0.75 : 0.5} />
              <rect x={c.x} y={c.y} width="1.6" height={c.h} rx="0.4" fill={TEAM_HEX[w.team]} fillOpacity={w.burned ? 0.3 : 0.9} />
              {planLabels && !w.burned && (
                <rect x={c.x - 1.3} y={c.y - 1.3} width={c.w + 2.6} height={c.h + 2.6} rx="1.6" fill="none" stroke="#f59e0b" strokeWidth="0.45" strokeDasharray="1.6 1.2" />
              )}
              {focusId === w.id && !w.burned && (
                // The armed organizer, as a ring rather than a label.
                <rect x={c.x - 2.2} y={c.y - 2.2} width={c.w + 4.4} height={c.h + 4.4} rx="2.2" fill="none" stroke="#fcd34d" strokeWidth="0.7" />
              )}
              {hl && (hl.signed || hl.burned) && (
                <rect
                  key={`flash-${stepKey}-${w.id}`}
                  className="ring-flash"
                  x={c.x - 2} y={c.y - 2} width={c.w + 4} height={c.h + 4} rx="2"
                  fill="none"
                  stroke={hl.burned ? "#f87171" : "#2dd4bf"}
                />
              )}

              <text x={c.x + 3.6} y={c.y + 8.2} fontSize="4.3" fill={w.burned ? "#57534e" : "#e7e5e4"} fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.12">{w.name.toUpperCase()}</text>
              {/* A number here would be a lie on anybody you haven't sat down with, so
                  only a read narrow enough to be worth a number gets one. Everyone else
                  gets the band below and nothing else — not knowing is the information. */}
              {(() => {
                if (w.burned) return <text x={c.x + c.w - 2.6} y={c.y + 9.2} textAnchor="end" fontSize="6" fontWeight="bold" fill="#57534e" fontFamily="'Courier New', monospace">{"\u2014"}</text>;
                const r = readOf(w, weekNow);
                if (!r.exact) return null;
                return (
                  <text x={c.x + c.w - 2.6} y={c.y + 9.2} textAnchor="end" fontSize="6" fontWeight="bold"
                    fill={supportTier(r.mid).hex} fontFamily="'Courier New', monospace">{r.mid}</text>
                );
              })()}

              {/* Commitment ladder in the top-right corner, where the trait tick used to
                  sit. Small, because it is a state you glance at rather than read. */}
              {(() => {
                const rung = rungOf(w);
                return (
                  <g opacity={w.burned ? 0.3 : 1}>
                    {[0, 1, 2, 3].map(i => (
                      <circle
                        key={i}
                        cx={c.x + c.w - 11.1 + i * 2.9}
                        cy={c.y + 2.5}
                        r="1.05"
                        fill={i < rung.pips ? rung.hex : "none"}
                        stroke={i < rung.pips ? rung.hex : "#57534e"}
                        strokeWidth="0.3"
                      />
                    ))}
                  </g>
                );
              })()}

              {/* Common ground, with the whole of its own row now that the pips have moved
                  off it. One you have surfaced is drawn; one you haven't is an empty
                  ring, so the card shows how much of this person you still don't know. */}
              <g opacity={w.burned ? 0.3 : 1}>
                {affList(w).slice(0, 5).map((t, i) => {
                  const seen = knownAff(w).includes(t);
                  const bought = isPoisoned(w, t);
                  const withArmed = !!armed && armed.id !== w.id && seen && !bought
                    && affList(armed).includes(t) && knownAff(armed).includes(t);
                  const hex = withArmed ? EDGE_COMMON_GROUND
                    : seen ? (bought ? "#f87171" : "#a8a29e") : "#57534e";
                  const S = 5.2;                       // icon box, in board units
                  const x = c.x + 3.4 + i * 5.9;
                  const y = c.y + 10.6;
                  return (
                    <g
                      key={t}
                      onMouseEnter={() => setHoverAff({
                        leftPct: ((x + S / 2) / layout.width) * 100,
                        topPct: (y / layout.height) * 100,
                        // Anchor to whichever side keeps the box on the board.
                        align: ((x + S / 2) / layout.width) < 0.2 ? "left"
                          : ((x + S / 2) / layout.width) > 0.8 ? "right" : "center",
                        tone: withArmed ? "known" : seen ? (bought ? "bought" : "known") : "unknown",
                        label: seen ? (AFF_BY_ID[t]?.label ?? t) : AFF_UNKNOWN_LABEL,
                        sub: withArmed
                          ? `${armed.name} shares this \u2014 a sit-down with them has something to open on.`
                          : seen
                            ? (bought
                                ? "The company sponsors this now \u2014 it counts for nothing."
                                : "Shared common ground makes a conversation land harder.")
                            : AFF_UNKNOWN_SUB,
                      })}
                      onMouseLeave={() => setHoverAff(null)}
                    >
                      {/* A drawn icon is a few pixels of ink; the slot is the hover target. */}
                      <rect x={x - 0.4} y={y - 0.5} width={S + 0.8} height={S + 1} fill="transparent" />
                      {withArmed && (
                        <rect x={x - 0.5} y={y - 0.6} width={S + 1} height={S + 1.2} rx="0.6"
                          fill={EDGE_COMMON_GROUND} fillOpacity="0.16"
                          stroke={EDGE_COMMON_GROUND} strokeWidth="0.25" strokeOpacity="0.7" />
                      )}
                      {seen ? (
                        <g transform={`translate(${x} ${y}) scale(${S / 10})`} style={{ color: hex }} opacity={bought ? 0.85 : 1}>
                          {AFF_ICON[t]}
                        </g>
                      ) : (
                        // The same dashed slot the panel draws, in board units: an empty
                        // frame with nothing in it yet.
                        <g>
                          <rect x={x} y={y} width={S} height={S} fill="none"
                            stroke="#57534e" strokeWidth="0.35" strokeDasharray="1.1 0.9" />
                          <circle cx={x + S / 2} cy={y + S / 2} r={S * 0.135}
                            fill="none" stroke="#57534e" strokeWidth="0.3" />
                        </g>
                      )}
                    </g>
                  );
                })}
                {w.guarded > 0 && <text x={c.x + c.w - 3} y={c.y + 15.2} fontSize="3.2" fill="#f87171" textAnchor="end" fontFamily="'Courier New', monospace">!</text>}
                {staleWeek != null && cardStaleSoon(w, staleWeek) && (
                  <text x={c.x + c.w - (w.guarded > 0 ? 6.5 : 3)} y={c.y + 15.2} fontSize="3.6" fill="#fbbf24" textAnchor="end" fontFamily="'Courier New', monospace">
                    {"\u29D6"}
                  </text>
                )}
              </g>

              {/* ---- THE READ ---- One bar per person: how sure you are, drawn to scale.
                   A wide bar hanging off the right-hand end is somebody who has said warm
                   things to nobody in particular. A short bar with a tick is somebody a
                   member of your committee has actually sat down with. The board reads at
                   a glance as how much of this floor you can honestly see. */}
              {!w.burned && (() => {
                const r = readOf(w, weekNow);
                const X0 = c.x + 3.6, W = c.w - 7.2, Y = c.y + 18.9;
                const at = (v) => X0 + (W * clamp(v)) / 100;
                const hex = supportTier(r.mid).hex;
                const bandW = Math.max(0.8, at(r.hi) - at(r.lo));
                return (
                  <g opacity={w.signed ? 1 : 0.95}>
                    <rect x={X0} y={Y} width={W} height="1.5" rx="0.75" fill="#292524" />
                    <rect x={at(r.lo)} y={Y} width={bandW} height="1.5" rx="0.75"
                      fill={hex} fillOpacity={r.exact ? 0.95 : r.kind === "cold" ? 0.22 : 0.4} />
                    {/* The tick is the claim. Only a read worth trusting makes one. */}
                    {r.exact && <rect x={at(r.mid) - 0.3} y={Y - 0.7} width="0.6" height="2.9" fill={hex} />}
                    {/* Cold reads get a nick at the top of the band: that edge is their
                        words, and their words are the only thing you have. */}
                    {!r.exact && <rect x={at(r.hi) - 0.35} y={Y - 0.4} width="0.7" height="2.3" fill={hex} fillOpacity="0.75" />}
                  </g>
                );
              })()}

              {planLabels ? (
                <text x={c.x + 3.6} y={c.y + 17.5} fontSize="2.9" fill="#fbbf24" fontFamily="'Courier New', monospace">{truncateNote(planLabels.join(" + "), budget != null ? 13 : 17)}</text>
              ) : null}
              {w.burned && (
                <text x={c.x + c.w - 3.4} y={c.y + 18.6} textAnchor="end" fontSize="3.6" fill="#78716c" fontFamily="'Courier New', monospace">{"\u2715"}</text>
              )}
              {/* The hours budget lives on the card so the player can see it without
                  leaving the board. On someone the company is working on it goes red,
                  which is also the week their budget is cut — one token, both facts. */}
              {/* ---- ROW FOUR ---- Tier is the colour of the experience bar; trouble is
                   one mark. The hover line underneath says which, in words. */}
              {w.organizer && !w.burned && tierOf && (() => {
                const t = tierOf(w);
                const xp = Math.max(0, Math.min(100, w.experience || 0));
                const idle = w.weeksIdle || 0;
                const flag = w.shaken > 0 ? { mark: "\u25C9", hex: "#f87171" }
                  : idle >= IDLE_QUIT - 1 ? { mark: "\u25B2", hex: "#f87171" }
                  : idle > IDLE_GRACE ? { mark: "\u25B2", hex: "#fbbf24" }
                  : idle > 0 ? { mark: "\u25B3", hex: "#78716c" }
                  : null;
                return (
                  <g>
                    {flag && (
                      <text x={c.x + c.w - 3.4} y={c.y + 21.8} textAnchor="end" fontSize="3.4" fill={flag.hex} fontFamily="'Courier New', monospace">{flag.mark}</text>
                    )}
                    <rect x={c.x + 3.6} y={c.y + 21.2} width={c.w - 7.2} height="0.8" rx="0.4" fill="#292524" />
                    <rect x={c.x + 3.6} y={c.y + 21.2} width={(c.w - 7.2) * (xp / 100)} height="0.8" rx="0.4" fill={t.hex} fillOpacity="0.9" />
                  </g>
                );
              })()}


              {budget != null && (() => {
                const total = Math.max(budget, committeeHours(w));
                const hex = budget < 0 || w.underPressure > 0 ? "#f87171" : budget === 0 ? "#2dd4bf" : "#f59e0b";
                return (
                  <g>
                    <HourPieShapes
                      cx={c.x + c.w - 4.4} cy={c.y + 16.6} r="2.7"
                      left={budget} total={total} hex={hex} sw="0.3" bg="#1c1917"
                    />
                  </g>
                );
              })()}
              {budget == null && !w.burned && !hl && w.underPressure > 0 && (
                <text x={c.x + c.w - 3.4} y={c.y + 18.6} textAnchor="end" fontSize="3.4" fill="#f87171" fontFamily="'Courier New', monospace">{"\u25C9"}</text>
              )}

              {hl && hl.delta !== 0 && !w.burned && (
                // Inside the card, not floating above it: the note box for the same person
                // is drawn later in this group and would paint straight over a floating delta.
                <text
                  key={`delta-${stepKey}-${w.id}`}
                  className="delta-float"
                  x={c.x + c.w - 2.6}
                  y={c.y + 18}
                  textAnchor="end"
                  fontSize="3.7"
                  fontWeight="bold"
                  fill={hl.delta > 0 ? "#2dd4bf" : "#f87171"}
                  fontFamily="'Courier New', monospace"
                >{hl.delta > 0 ? "+" : ""}{hl.delta} support</text>
              )}
              {notes && notes[w.id] && (
                <g key={`note-${stepKey}-${w.id}`} className="note-float">
                  <rect x={c.cx - 20} y={c.y - 8.8} width={40} height={7} rx={1} fill="#0c0a09" stroke="#57534e" strokeWidth="0.3" />
                  <text x={c.cx} y={c.y - 4.2} textAnchor="middle" fontSize="2.8" fill="#e7e5e4" fontFamily="'Courier New', monospace">{truncateNote(notes[w.id], 22)}</text>
                </g>
              )}
            </g>
          );
        })}

        

      </svg>
      {hoverAff && (
        <div
          className={`absolute z-20 pointer-events-none -translate-y-full ${
            hoverAff.align === "left" ? "translate-x-0" : hoverAff.align === "right" ? "-translate-x-full" : "-translate-x-1/2"}`}
          style={{ left: `${hoverAff.leftPct}%`, top: `${hoverAff.topPct}%` }}
        >
          <div className="mb-1.5"><AffTip tone={hoverAff.tone} label={hoverAff.label} sub={hoverAff.sub} /></div>
        </div>
      )}
      </div>

      <div className="border-t border-stone-800 px-3 py-2 min-h-[3.6rem]">
        {hovered ? (
          <div className="text-xs text-stone-400 leading-snug">
            <span className={`font-bold ${supportTier(hovered.support).text}`}>{hovered.name}{hovered.burned ? " (OUT OF PLAY)" : ""}</span>
            <span className="text-stone-500"> ({TEAM_LABEL[hovered.team]}) — {(() => {
              const r = readOf(hovered, weekNow);
              return r.exact
                ? <>stands at <span className="text-stone-300 font-bold">{r.mid}</span></>
                : <>somewhere in <span className="text-stone-300 font-bold">{r.lo}{"\u2013"}{r.hi}</span>{r.kind === "cold" ? " — never spoken to" : r.kind === "fading" ? ` — last read ${r.age} weeks ago` : " — talked to, never sat down with"}</>;
            })()} · {fulfillmentLabel(hovered.fulfillment).toLowerCase()} ({hovered.fulfillment}){hovered.signed ? " · SIGNED" : ""}</span>
            <span style={{ color: infTrait(hovered).hex }} className="font-bold"> · {infTrait(hovered).label}</span>
            <span className="text-stone-500"> — {hovered.hook}</span>
            <div className="mt-0.5">
              <span className="text-stone-500">Common ground: </span>
              {knownAff(hovered).length ? (
                <span>
                  {knownAff(hovered).map((t, i) => (
                    <span key={t} className={isPoisoned(hovered, t) ? "text-red-400" : "text-stone-300"}>
                      {i > 0 ? "  ·  " : ""}<AffIcon id={t} size={12} /> {AFF_BY_ID[t]?.label ?? t}
                      {isPoisoned(hovered, t) ? " (bought)" : ""}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-stone-600 italic">nothing surfaced yet</span>
              )}
              {affList(hovered).length > knownAff(hovered).length && (
                <span className="text-stone-600 italic">
                  {knownAff(hovered).length ? " · " : " · "}{affList(hovered).length - knownAff(hovered).length} still unknown
                </span>
              )}
            </div>
            <div className="mt-0.5">
              {hoveredOut.length > 0 ? (
                <span className="text-stone-500">Moves: <span className="text-amber-400">{hoveredOut.map(t => `${nameOf(t.id)}${teamOf(t.id) !== hovered.team ? " ↗" : ""} (${t.weight})`).join(", ")}</span>. </span>
              ) : (
                <span className="text-stone-600 italic">No mapped influence on anyone yet. </span>
              )}
              {hovered.revealed ? (
                <span className="text-stone-500">Moved by: <span className="text-stone-300">{hoveredIn.length ? hoveredIn.map(t => `${nameOf(t.id)}${teamOf(t.id) !== hovered.team ? " ↗" : ""} (${t.weight})`).join(", ") : "nobody in particular"}</span>.</span>
              ) : (
                <span className="text-stone-600 italic">Who moves them: unmapped.</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-stone-500 leading-snug">
            <div>
              {anyRevealed
                ? "The boxes are the company's chart, and it is not the map you organize on. Pick one of your people: the marks they share light up across the floor, and hovering anyone says who moves them and how hard."
                : "The boxes are the company's chart, and it is not the map you organize on. Pick one of your people: the marks they share light up across the floor. Who moves whom you learn by sitting down with people."}
            </div>
            {mapped.total > 0 && (
              <div className="text-stone-500 not-italic mt-0.5">
                Of the {mapped.total} {mapped.total === 1 ? "relationship" : "relationships"} you've mapped, <span className="text-stone-200 font-bold">{mapped.cross}</span> cross team boundaries.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { ORG_CARD_W, ORG_CARD_H, ORG_COL_GAP, ORG_ROW_GAP, ORG_TEAM_GAP, ORG_MARGIN, ORG_TEAM_COLS, ORG_ROOT_H, ORG_HEADER_H, EDGE_COMMON_GROUND, computeOrgLayout, ORG_LAYOUT, cardEdgePoint, FLOOR_LABELS, Act1FloorMap };
