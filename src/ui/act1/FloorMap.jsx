// The floor board: the company's org chart, with the campaign drawn on top of it.
import React, { useState, useRef, useEffect } from "react";
import { LayoutGrid, Network } from "lucide-react";
import { HourPieShapes, Pips, truncateNote } from "../shared.jsx";
import { socialLayoutFor } from "./socialLayout.js";
import { AFF_ICON, AffIcon } from "./marks.jsx";
import { ACT1_WORKERS_SEED, TEAM_HEX, TEAM_LABEL, cardStaleSoon } from "../../engine/act1/constants.js";
import { ACT1_ACTION } from "../../engine/act1/actions.js";
import { AFF_BY_ID, isPoisoned, knownAff } from "../../engine/act1/affinities.js";
import { RATING_HEX, deltaMarks, ratingGlyph } from "../../engine/act1/election.js";
import { believedSlots, recentBreaks } from "../../engine/act1/fallout.js";
import { CIRCLE_BY_ID, allEdges, friendsOf, isKnownFriend, knownEdges, knownFriends } from "../../engine/act1/friends.js";
import { IDLE_GRACE, IDLE_QUIT, committeeHours } from "../../engine/act1/committee.js";
import { infTrait } from "../../engine/act1/traits.js";
import { visibleHit } from "../../engine/act1/campaign.js";
import { MOVE_ICON, MOVE_RED, MOVE_WORD } from "./Campaign.jsx";

// ---------- THE ORG CHART (Act One board) ----------
// The chart is the company's own picture of itself: teams, boxes, reporting lines. The
// friendships marked on the cards are the real structure, and the whole point is that
// they don't respect the boxes. Organizing runs on the second map, not the first.
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
// A card in its own coordinates. Each view positions and scales the whole group.
const CARD_FRAME = { x: 0, y: 0, w: ORG_CARD_W, h: ORG_CARD_H, cx: ORG_CARD_W / 2, cy: ORG_CARD_H / 2 };

// Where a line from a card's centre crosses that card's border, so arrows start and end
// at the box edge instead of disappearing underneath it.
function cardEdgePoint(card, dx, dy, pad = 0) {
  const adx = Math.abs(dx), ady = Math.abs(dy);
  const tx = adx > 1e-6 ? (card.w / 2 + pad) / adx : Infinity;
  const ty = ady > 1e-6 ? (card.h / 2 + pad) / ady : Infinity;
  const t = Math.min(tx, ty);
  return { x: card.cx + dx * t, y: card.cy + dy * t };
}

// labels lets a second act reuse this board with its own vocabulary — the geometry and the
// card layout are identical, only the words change. `ladder`/`rungOf` draw a rung as pips
// in the corner where an act still has a ladder to show; Act One does not.
const FLOOR_LABELS = { organizerLegend: "YOURS TO DIRECT", signedLegend: "SIGNED A CARD" };

// The rating, drawn. Solid is a read; hollow is their words; blank is nobody has asked.
function RatingGlyph({ glyph, x, y, size = 9 }) {
  if (!glyph || glyph.state === "blank") return null;
  if (glyph.state === "out") {
    return <text x={x} y={y} textAnchor="end" fontSize={size * 0.7} fontWeight="bold" fill="#57534e" fontFamily="'Courier New', monospace">{"—"}</text>;
  }
  const hollow = glyph.state === "hollow";
  return (
    <text x={x} y={y} textAnchor="end" fontSize={size} fontWeight="bold" fontFamily="'Courier New', monospace"
      fill={hollow ? glyph.hex : glyph.hex} fillOpacity={hollow ? 0.14 : 1}
      stroke={hollow ? glyph.hex : "none"} strokeWidth={hollow ? 0.42 : 0} paintOrder="stroke">
      {glyph.digit}
    </text>
  );
}

const GLYPH_TIP = {
  solid: "Somebody sat down with them. This is where they stand.",
  hollow: "Their words, or an old read. Most people are this or lower. Sit down with them to find out.",
  blank: "Nobody has talked to them yet.",
};

function Act1FloorMap({ workers, influence, social = null, view = "org", onView = null, staleWeek = null, weekNow = 1, layout = ORG_LAYOUT, planEntries = [], onSelect, onPair = null, highlights = null, edgePulses = [], stepKey = 0, notes = null, labels = FLOOR_LABELS, ladder = null, rungOf = null, hoursLeft = null, tierOf = null, glyphOf = ratingGlyph, planLabel = (e) => ACT1_ACTION[e.type]?.short ?? e.type, move = null, onMoveTarget = null, onInoculate = null }) {
  const [hoverId, setHoverId] = useState(null);
  const svgRef = useRef(null);
  // A committee card being dragged onto somebody. `over` is the card under the pointer;
  // `started` is whether the pointer has moved far enough that this is not a click.
  // Nothing is captured until it has: capturing on pointerdown sends the pointerup, and
  // so the click, to the <svg> instead of the card, and a plain click stops working.
  const [drag, setDrag] = useState(null);
  const suppressClick = useRef(false);
  const active = hoverId;

  const byId = (id) => workers.find(w => w.id === id);
  const plannedByWorker = {};
  planEntries.forEach(e => {
    const key = e.targetId != null ? e.targetId : e.actorId;
    if (!plannedByWorker[key]) plannedByWorker[key] = [];
    plannedByWorker[key].push(planLabel(e));
  });
  const planArrows = planEntries.filter(e => e.targetId != null);

  // How much of the floor's real structure you have found. A friendship counts once.
  const mappedEdges = knownEdges(workers);
  const totalEdges = social ? allEdges(social).length : null;
  const crossMapped = mappedEdges.filter(([a, b]) => byId(a)?.team !== byId(b)?.team).length;

  // Where each card sits on whichever view is showing. Both views draw the same card;
  // only this map changes, and the card glides between the two.
  const socialView = view === "social" && !!social;
  const sl = socialView ? socialLayoutFor(workers, social, layout.width, ORG_CARD_W, ORG_CARD_H) : null;
  const rects = socialView ? sl.pos : Object.fromEntries(Object.entries(layout.cards).map(([id, c]) => [id, { ...c, scale: 1 }]));
  const boardH = socialView ? sl.height : layout.height;

  // Phase 2: what management has booked this week, drawn where it lands. The cards it will
  // hit, as far as you know, carry a red corner; the person it is aimed at, a red frame.
  const moveHit = new Set(move ? visibleHit(move, workers, social).map(x => x.id) : []);
  const MoveIcon = move ? MOVE_ICON[move.kind] : null;
  // The department box or the crowd's bubble, if that is where the move lands: a place to
  // drop one of your people to get there first.
  const moveZone = (() => {
    if (!move) return null;
    if (move.kind === "meeting" && !socialView) return layout.teamBoxes[move.team];
    if (move.kind === "perk" && socialView) return sl.bubbles.find(b => b.id === move.circle) || null;
    return null;
  })();
  const moveWhere = move?.kind === "meeting" ? { team: move.team } : move?.kind === "perk" ? { circle: move.circle } : null;

  const hovered = byId(active);
  // Hovering anyone lights the friendships you know about; everyone else steps back.
  const connectedToActive = (id) => active != null && (id === active || isKnownFriend(byId(active), id));

  // ---- drag: a committee card onto a person ----
  // Chrome ignores touch-action on SVG child elements, so a finger on a committee card
  // starts a pan and the browser cancels the pointer. Stopping the touch's default here,
  // and only on those cards, keeps the gesture ours; the rest of the board still scrolls.
  // It also stops the browser's own click, so a tap is handled on pointerup instead.
  const dragEnabled = !!onPair;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !dragEnabled) return undefined;
    const onTouchStart = (e) => { if (e.target.closest && e.target.closest("[data-drag]")) e.preventDefault(); };
    svg.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => svg.removeEventListener("touchstart", onTouchStart);
  }, [dragEnabled]);

  const toBoard = (evt) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
  };
  const cardAt = (p) => {
    const hit = Object.entries(rects).find(([, c]) => p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h);
    return hit ? Number(hit[0]) : null;
  };
  const onCardPointerDown = (w, evt) => {
    if (!onPair || !w.organizer || w.burned || evt.button > 0) return;
    const p = toBoard(evt);
    setDrag({ actorId: w.id, pointerId: evt.pointerId, pointerType: evt.pointerType, x: p.x, y: p.y, x0: p.x, y0: p.y, over: null, started: false });
  };
  const onSvgPointerMove = (evt) => {
    if (!drag || evt.pointerId !== drag.pointerId) return;
    const p = toBoard(evt);
    const started = drag.started || Math.hypot(p.x - drag.x0, p.y - drag.y0) > 2.5;
    if (started && !drag.started) {
      // Now it is a drag: keep the pointer even if it leaves the board.
      try { svgRef.current.setPointerCapture(evt.pointerId); } catch (e) { /* not every pointer can be captured */ }
    }
    const over = started ? cardAt(p) : null;
    const inZone = started && over == null && !!moveZone && !!onInoculate
      && p.x >= moveZone.x && p.x <= moveZone.x + moveZone.w && p.y >= moveZone.y && p.y <= moveZone.y + moveZone.h;
    setDrag({ ...drag, x: p.x, y: p.y, started, over: over === drag.actorId ? null : over, zone: inZone });
  };
  const endDrag = (evt) => {
    if (!drag) return;
    if (!drag.started && drag.pointerType === "touch" && evt?.type === "pointerup") {
      // A tap on a committee card: the browser will not send a click (see above).
      const actor = byId(drag.actorId);
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 400);
      setDrag(null);
      if (actor && !actor.burned) onSelect(actor);
      return;
    }
    if (drag.started) {
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);
      const target = drag.over != null ? byId(drag.over) : null;
      const actor = byId(drag.actorId);
      // After the click that trails this pointer-up, or the panel it opens would take
      // that click on its own backdrop and close again.
      if (target && !target.burned && onPair) setTimeout(() => onPair(actor, target), 0);
      else if (drag.zone && actor && onInoculate && moveWhere) setTimeout(() => onInoculate(actor, moveWhere), 0);
    }
    setDrag(null);
  };

  return (
    <div className="border-2 border-stone-800 bg-stone-900 card-perf mb-6">
      <div className="flex items-center justify-between px-3 pt-2 pb-1 flex-wrap gap-y-1">
        <div className="flex items-center gap-3">
          <div className="font-stencil text-lg tracking-wide text-stone-200">THE FLOOR</div>
          {onView && social && (
            <div className="flex items-center border border-stone-700" role="group" aria-label="Board view">
              {[["org", LayoutGrid, "The org chart: the company's map of the floor."], ["social", Network, "Who is friends with whom: the map you are drawing."]].map(([id, Icon, tip]) => (
                <button key={id} type="button" onClick={() => onView(id)} title={tip} aria-label={id === "org" ? "Org chart view" : "Social view"} aria-pressed={view === id}
                  className={`px-2 py-1 transition-colors ${view === id ? "bg-stone-700 text-amber-300" : "text-stone-500 hover:text-stone-200"}`}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[10px]">
          <span className="flex items-center gap-1.5" title="You can spend this person's hours. Drag their card onto somebody to send them.">
            <span className="w-2.5 h-2 shrink-0 border" style={{ borderColor: "#f59e0b" }} />
            <span className="text-stone-400">{labels.organizerLegend}</span>
          </span>
          <span className="flex items-center gap-1.5" title="They are with you, but their hours are not yours to spend.">
            <span className="w-2.5 h-2 shrink-0 border" style={{ borderColor: "#2dd4bf" }} />
            <span className="text-stone-400">{labels.signedLegend}</span>
          </span>
          {/* The friend slots: a dot for a friend you have met, a ring for one you have not. */}
          {social && (
            <span className="flex items-center gap-1.5 border-l border-stone-800 pl-3" title="Each person has up to three friends. A filled dot is a friend you have met, in their team's colour; a dashed ring is a friend you know about but have not met.">
              <span className="inline-block w-2 h-2 rounded-full bg-stone-400" />
              <span className="inline-block w-2 h-2 rounded-full border border-dashed border-stone-500" />
              <span className="text-stone-400">FRIENDS</span>
            </span>
          )}
          {/* The three states of the digit, as the digit itself. Hover for the sentence. */}
          <span className="flex items-center gap-2 border-l border-stone-800 pl-3 font-mono font-bold text-sm leading-none">
            <span title={GLYPH_TIP.solid} style={{ color: RATING_HEX[4] }}>4</span>
            <span title={labels.hollowTip || GLYPH_TIP.hollow} style={{ color: RATING_HEX[4], WebkitTextStroke: `0.6px ${RATING_HEX[4]}`, WebkitTextFillColor: "transparent" }}>4</span>
            {!labels.numberLegend && <span title={GLYPH_TIP.blank} className="inline-block w-2.5 h-3 border border-dashed border-stone-700" />}
            {labels.numberLegend && <span className="font-sans text-[10px] font-normal text-stone-400 tracking-wide">= {labels.numberLegend}</span>}
          </span>
          {ladder && (
            <span className="flex items-center gap-2 border-l border-stone-800 pl-3">
              {[...ladder].reverse().map(r => (
                <span key={r.id} className="flex items-center gap-1" title={`${r.label} — ${r.blurb}`}>
                  <Pips filled={r.pips} total={4} hex={r.hex} size={4} gap={1.2} />
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${layout.width} ${boardH}`} className="w-full block select-none"
        onPointerMove={onSvgPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={() => { if (drag && !drag.started) endDrag(); }}>
        <defs>
          <marker id="org-arrow-hot" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#fbbf24" />
          </marker>
        </defs>

        {!socialView && (<>
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
            const tb = c && layout.teamBoxes[c.team];
            if (!c || !tb) return null;
            const innerX = c.col === 0 ? c.x + c.w : c.x;
            return <line key={`stub-${w.id}`} x1={tb.spineX} y1={c.cy} x2={innerX} y2={c.cy} />;
          })}
        </g>

        <rect x={layout.root.x} y={layout.root.y} width={layout.root.w} height={layout.root.h} rx="1" fill="#1c1917" stroke="#44403c" strokeWidth="0.5" />
        <text x={layout.root.cx} y={layout.root.y + 5} textAnchor="middle" fontSize="4" fill="#a8a29e" fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.3">THE STUDIO</text>
        <text x={layout.root.cx} y={layout.root.y + 9.5} textAnchor="middle" fontSize="2.9" fill="#57534e" fontFamily="'Courier New', monospace">{workers.length} WORKERS · PLAY-EYE RUNS THE FLOOR</text>

        {Object.entries(layout.teamBoxes).map(([team, tb]) => {
          const booked = move?.kind === "meeting" && move.team === team;
          const dropping = booked && drag?.zone;
          return (
            <g key={team} className={booked && onMoveTarget ? "cursor-pointer" : ""} onClick={booked && onMoveTarget ? () => { if (!suppressClick.current) onMoveTarget(); } : undefined}>
              <rect x={tb.x} y={tb.y} width={tb.w} height={tb.h} rx="1" fill={booked ? "#2a1212" : "#1c1917"} stroke={booked ? MOVE_RED : TEAM_HEX[team]} strokeWidth={dropping ? 1.1 : booked ? 0.8 : 0.5} strokeOpacity={booked ? 1 : 0.7} />
              <rect x={tb.x} y={tb.y} width={tb.w} height="1.4" fill={TEAM_HEX[team]} fillOpacity="0.8" />
              <text x={tb.cx} y={tb.y + 7.6} textAnchor="middle" fontSize="4.5" fill="#d6d3d1" fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.25">{TEAM_LABEL[team]}</text>
              {booked && MoveIcon && (
                <g transform={`translate(${tb.x + 2.2} ${tb.y + 2.6})`} style={{ color: MOVE_RED }}>
                  <MoveIcon x={0} y={0} width={6.4} height={6.4} strokeWidth={2.4} />
                </g>
              )}
            </g>
          );
        })}
        </>)}

        {socialView && (<>
          {/* ---- the crowds you have found ---- */}
          {sl.bubbles.map(bb => {
            const booked = move?.kind === "perk" && move.circle === bb.id;
            return (
            <g key={`bubble-${bb.id}`} className={booked && onMoveTarget ? "cursor-pointer" : ""} onClick={booked && onMoveTarget ? () => { if (!suppressClick.current) onMoveTarget(); } : undefined}>
              <rect x={bb.x} y={bb.y} width={bb.w} height={bb.h} rx="6" fill={booked ? MOVE_RED : bb.hex} fillOpacity={booked ? 0.1 : 0.06} stroke={booked ? MOVE_RED : bb.hex} strokeOpacity={booked ? 1 : 0.45} strokeWidth={booked && drag?.zone ? 1.1 : booked ? 0.8 : 0.45} />
              {booked && MoveIcon && (
                <g transform={`translate(${bb.x + bb.w - 13} ${bb.y + 0.8})`} style={{ color: MOVE_RED }}>
                  <MoveIcon x={0} y={0} width={5} height={5} strokeWidth={2.4} />
                </g>
              )}
              <text x={bb.x + 3} y={bb.y + 4.6} fontSize="3" fill={bb.hex} fillOpacity="0.9" fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.2">{bb.label}</text>
              {AFF_ICON[bb.affinity] && (
                <g transform={`translate(${bb.x + bb.w - 6.2} ${bb.y + 1}) scale(0.42)`} style={{ color: bb.hex }} opacity="0.85">{AFF_ICON[bb.affinity]}</g>
              )}
            </g>
            );
          })}
          {/* ---- friendships you have mapped ---- */}
          <g fill="none">
            {sl.links.map(({ source, target }) => {
              const a = rects[source.id ?? source], b = rects[target.id ?? target];
              if (!a || !b) return null;
              const aid = source.id ?? source, bid = target.id ?? target;
              const lit = active != null && (aid === active || bid === active);
              const both = byId(aid)?.signed && byId(bid)?.signed;
              // While somebody is hovered, every other line steps back with the cards it joins.
              const faded = active != null && !lit;
              return <line key={`f-${aid}-${bid}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
                stroke={lit ? "#fcd34d" : both ? "#2dd4bf" : "#57534e"} strokeOpacity={lit ? 0.95 : faded ? 0.12 : 0.7} strokeWidth={lit ? 0.7 : 0.45} />;
            })}
          </g>
          {/* ---- friendships you saw end lately: the line snaps ---- */}
          <g>
            {workers.flatMap(w => recentBreaks(w, weekNow).filter(e => w.id < e.id).map(e => {
              const a = rects[w.id], b = rects[e.id];
              if (!a || !b || a.tray || b.tray) return null;
              const mx = (a.cx + b.cx) / 2, my = (a.cy + b.cy) / 2;
              const gx = (b.cx - a.cx) * 0.08, gy = (b.cy - a.cy) * 0.08;
              return (
                <g key={`snap-${w.id}-${e.id}`} stroke="#f87171" strokeOpacity="0.75" strokeWidth="0.5" strokeDasharray="1.2 0.9">
                  <line x1={a.cx} y1={a.cy} x2={mx - gx} y2={my - gy} />
                  <line x1={mx + gx} y1={my + gy} x2={b.cx} y2={b.cy} />
                </g>
              );
            }))}
          </g>
          {sl.trayY != null && (
            <g>
              <line x1="4" x2={layout.width - 4} y1={sl.trayY - 6.5} y2={sl.trayY - 6.5} stroke="#292524" strokeWidth="0.4" />
              <text x="6" y={sl.trayY - 2} fontSize="2.8" fill="#57534e" fontFamily="'Courier New', monospace" letterSpacing="0.2">NOT ON THE MAP YET</text>
            </g>
          )}
        </>)}

        {planArrows.map((e, i) => {
          const a = rects[e.actorId];
          const b = rects[e.targetId];
          if (!a || !b) return null;
          const dx = b.cx - a.cx, dy = b.cy - a.cy;
          const p1 = cardEdgePoint(a, dx, dy, 0.8);
          const p2 = cardEdgePoint(b, -dx, -dy, 2.2);
          return (
            <line key={`plan-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1.6 1.2" strokeOpacity="0.95" markerEnd="url(#org-arrow-hot)" />
          );
        })}

        {edgePulses.map((ev, i) => {
          const a = rects[ev.from];
          const b = rects[ev.to];
          if (!a || !b) return null;
          const dx = b.cx - a.cx, dy = b.cy - a.cy;
          const p1 = cardEdgePoint(a, dx, dy, 0.4);
          const p2 = cardEdgePoint(b, -dx, -dy, 1.5);
          return (
            <line key={`pulse-${stepKey}-${i}`} className="edge-pulse" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              pathLength="20" stroke={ev.tone === "down" ? "#f87171" : "#2dd4bf"} strokeWidth="0.9" />
          );
        })}

        {/* ---- people ---- */}
        {workers.map(w => {
          const r = rects[w.id];
          if (!r) return null;
          // The card's own frame. Every coordinate below is relative to its corner.
          const c = CARD_FRAME;
          const hl = highlights ? highlights[w.id] : null;
          const planLabels = plannedByWorker[w.id];
          const dim = (active != null && !connectedToActive(w.id)) || (drag?.started && drag.over != null && drag.over !== w.id && drag.actorId !== w.id);
          // A committee member you have caught talking keeps an amber card with a red edge.
          const border = w.burned ? "#44403c" : w.organizer && w.leakKnown ? "#f87171" : w.organizer ? "#f59e0b" : w.signed ? "#2dd4bf" : "#44403c";
          // Only while the player is still spending the week: during a resolution the
          // right-hand slot belongs to the change marks.
          const budget = hoursLeft && !w.burned && !hl && hoursLeft[w.id] != null ? hoursLeft[w.id] : null;
          const glyph = glyphOf(w, weekNow);
          // What you believe: the friends you have met, rings for the ones you believe are
          // there but have not met, and a cracked slot for a friendship you saw end lately.
          const metIds = knownFriends(w);
          const unmet = Math.max(0, believedSlots(w, social) - metIds.length);
          const cracked = recentBreaks(w, weekNow);
          const slotRow = [...metIds.map(id => ({ kind: "met", id })), ...Array.from({ length: unmet }, (_, i) => ({ kind: "unmet", id: `u${i}` })), ...cracked.map(e => ({ kind: "cracked", id: `x${e.id}`, who: e.id }))];
          const isOver = drag?.started && drag.over === w.id;
          const isDragging = drag?.actorId === w.id && drag.started;
          return (
            <g key={w.id} style={{ transform: `translate(${r.x}px, ${r.y}px) scale(${r.scale})`, transition: "transform 600ms ease" }}>
            <g
              opacity={w.burned ? 0.4 : dim ? 0.35 : 1}
              className={w.burned ? "" : onPair && w.organizer ? "cursor-grab" : "cursor-pointer"}
              // A finger on one of your people is a drag, not a scroll (see the touchstart
              // handler: the style alone is not enough on SVG in Chrome).
              style={onPair && w.organizer && !w.burned ? { touchAction: "none" } : undefined}
              data-drag={onPair && w.organizer && !w.burned ? "1" : undefined}
              onClick={() => {
                if (w.burned || suppressClick.current) return;
                onSelect(w);
              }}
              onPointerDown={(evt) => onCardPointerDown(w, evt)}
              onMouseEnter={() => setHoverId(w.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="1.2" fill="#1c1917" stroke={border} strokeWidth={w.organizer || w.signed ? 0.75 : 0.5} />
              <rect x={c.x} y={c.y} width="1.6" height={c.h} rx="0.4" fill={TEAM_HEX[w.team]} fillOpacity={w.burned ? 0.3 : 0.9} />
              {planLabels && !w.burned && (
                <rect x={c.x - 1.3} y={c.y - 1.3} width={c.w + 2.6} height={c.h + 2.6} rx="1.6" fill="none" stroke="#f59e0b" strokeWidth="0.45" strokeDasharray="1.6 1.2" />
              )}
              {move && (move.kind === "threat" || move.kind === "raise") && move.targetId === w.id && !w.burned && (
                <g>
                  <rect x={c.x - 1.6} y={c.y - 1.6} width={c.w + 3.2} height={c.h + 3.2} rx="1.8" fill="none" stroke={MOVE_RED} strokeWidth="0.8" />
                  <rect x={c.x + c.w - 15} y={c.y + c.h - 0.4} width="14" height="4" rx="0.8" fill={MOVE_RED} />
                  <text x={c.x + c.w - 8} y={c.y + c.h + 2.6} textAnchor="middle" fontSize="2.8" fontWeight="bold" fill="#0c0a09" fontFamily="'Courier New', monospace">{MOVE_WORD[move.kind]}</text>
                </g>
              )}
              {moveHit.has(w.id) && move && (move.kind === "meeting" || move.kind === "perk") && !w.burned && (
                <path d={`M ${c.x} ${c.y + 4.2} L ${c.x} ${c.y + 1.2} Q ${c.x} ${c.y} ${c.x + 1.2} ${c.y} L ${c.x + 4.2} ${c.y} Z`} fill={MOVE_RED} />
              )}
              {(isOver || isDragging) && (
                <rect x={c.x - 2.2} y={c.y - 2.2} width={c.w + 4.4} height={c.h + 4.4} rx="2.2" fill="none" stroke="#fcd34d" strokeWidth="0.7" />
              )}
              {hl && (hl.signed || hl.burned) && (
                <rect key={`flash-${stepKey}-${w.id}`} className="ring-flash"
                  x={c.x - 2} y={c.y - 2} width={c.w + 4} height={c.h + 4} rx="2" fill="none" stroke={hl.burned ? "#f87171" : "#2dd4bf"} />
              )}

              {/* ---- row one: name, and the digit ---- */}
              <text x={c.x + 3.6} y={c.y + 7.6} fontSize="4.1" fill={w.burned ? "#57534e" : "#e7e5e4"} fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.12">{w.name.toUpperCase()}</text>
              <g opacity={w.burned ? 0.5 : 1}>
                <RatingGlyph glyph={glyph} x={c.x + c.w - 2.4} y={c.y + 9.6} />
              </g>
              {ladder && rungOf && (() => {
                const rung = rungOf(w);
                return (
                  <g opacity={w.burned ? 0.3 : 1}>
                    {[0, 1, 2, 3].map(i => (
                      <circle key={i} cx={c.x + 4.6 + i * 2.4} cy={c.y + 10.1} r="0.85"
                        fill={i < rung.pips ? rung.hex : "none"} stroke={i < rung.pips ? rung.hex : "#57534e"} strokeWidth="0.3" />
                    ))}
                  </g>
                );
              })()}

              {/* ---- row two: what they do here, and any trouble ---- */}
              <text x={c.x + 3.6} y={c.y + (ladder ? 14.2 : 11.8)} fontSize="2.5" fill="#78716c" fontFamily="'Courier New', monospace">{truncateNote(w.title || TEAM_LABEL[w.team], 22)}</text>
              {w.guarded > 0 && <text x={c.x + c.w - 2.6} y={c.y + 13.6} fontSize="3.2" fill="#f87171" textAnchor="end" fontFamily="'Courier New', monospace">!</text>}
              {staleWeek != null && cardStaleSoon(w, staleWeek) && (
                <text x={c.x + c.w - (w.guarded > 0 ? 6.2 : 2.6)} y={c.y + 13.6} fontSize="3.6" fill="#fbbf24" textAnchor="end" fontFamily="'Courier New', monospace">{"⧖"}</text>
              )}

              {/* ---- row three: friends. A ring is a friend you have not met yet. ---- */}
              <g opacity={w.burned ? 0.3 : 1}>
                {slotRow.map((slot, i) => {
                  const cx = c.x + 5.6 + i * 5.2, cy = c.y + 16.6;
                  const f = slot.kind === "met" ? byId(slot.id) : slot.kind === "cracked" ? byId(slot.who) : null;
                  return (
                    <g key={slot.id}>
                      {slot.kind === "met" && f ? (
                        // A friend you have met: a dot in their team's colour. Their name is in the
                        // hover line and the panel; an initial on the dot was never readable.
                        <circle cx={cx} cy={cy} r="1.7" fill={TEAM_HEX[f.team]} fillOpacity="0.9">
                          <title>{f.name}</title>
                        </circle>
                      ) : slot.kind === "cracked" ? (
                        // A friendship you saw end: the slot breaks, and goes in a couple of weeks.
                        <>
                          <circle cx={cx} cy={cy} r="1.8" fill="none" stroke="#f87171" strokeWidth="0.4" strokeDasharray="0.9 0.7" />
                          <line x1={cx - 1.6} y1={cy + 1.6} x2={cx + 1.6} y2={cy - 1.6} stroke="#f87171" strokeWidth="0.45" />
                        </>
                      ) : (
                        <circle cx={cx} cy={cy} r="1.8" fill="none" stroke="#57534e" strokeWidth="0.35" strokeDasharray="1 0.8" />
                      )}
                    </g>
                  );
                })}
              </g>

              {planLabels ? (
                <text x={c.x + 3.6} y={c.y + 22.8} fontSize="2.8" fill="#fbbf24" fontFamily="'Courier New', monospace">{truncateNote(planLabels.join(" + "), budget != null ? 14 : 18)}</text>
              ) : null}
              {w.burned && (
                <text x={c.x + c.w - 3.4} y={c.y + 18.6} textAnchor="end" fontSize="3.6" fill="#78716c" fontFamily="'Courier New', monospace">{"✕"}</text>
              )}

              {/* ---- committee only: experience as a hairline, trouble as one mark ---- */}
              {w.organizer && !w.burned && tierOf && (() => {
                const t = tierOf(w);
                const xp = Math.max(0, Math.min(100, w.experience || 0));
                const idle = w.weeksIdle || 0;
                const flag = w.shaken > 0 ? { mark: "◉", hex: "#f87171" }
                  : idle >= IDLE_QUIT - 1 ? { mark: "▲", hex: "#f87171" }
                  : idle > IDLE_GRACE ? { mark: "▲", hex: "#fbbf24" }
                  : idle > 0 ? { mark: "△", hex: "#78716c" }
                  : null;
                return (
                  <g>
                    {flag && (
                      <text x={c.x + c.w - 9.2} y={c.y + 18.4} textAnchor="end" fontSize="3.2" fill={flag.hex} fontFamily="'Courier New', monospace">{flag.mark}</text>
                    )}
                    <rect x={c.x + 3.6} y={c.y + 20.2} width={c.w - 7.2} height="0.8" rx="0.4" fill="#292524" />
                    <rect x={c.x + 3.6} y={c.y + 20.2} width={(c.w - 7.2) * (xp / 100)} height="0.8" rx="0.4" fill={t.hex} fillOpacity="0.9" />
                  </g>
                );
              })()}

              {budget != null && (() => {
                const total = Math.max(budget, committeeHours(w));
                const hex = budget < 0 || w.underPressure > 0 ? "#f87171" : budget === 0 ? "#2dd4bf" : "#f59e0b";
                return <HourPieShapes cx={c.x + c.w - 4.4} cy={c.y + 16.6} r="2.7" left={budget} total={total} hex={hex} sw="0.3" bg="#1c1917" />;
              })()}
              {budget == null && !w.burned && !hl && w.underPressure > 0 && (
                <text x={c.x + c.w - 3.4} y={c.y + 18.6} textAnchor="end" fontSize="3.4" fill="#f87171" fontFamily="'Courier New', monospace">{"◉"}</text>
              )}

              {hl && hl.delta !== 0 && !w.burned && (
                // Inside the card, not floating above it: the note box for the same person
                // is drawn later in this group and would paint straight over a floating mark.
                <text key={`delta-${stepKey}-${w.id}`} className="delta-float"
                  x={c.x + c.w - 2.6} y={c.y + 18.4} textAnchor="end" fontSize="3.4" fontWeight="bold"
                  fill={hl.delta > 0 ? "#2dd4bf" : "#f87171"} fontFamily="'Courier New', monospace">{deltaMarks(hl.delta)}</text>
              )}
              {notes && notes[w.id] && (
                <g key={`note-${stepKey}-${w.id}`} className="note-float">
                  <rect x={c.cx - 20} y={c.y - 8.8} width={40} height={7} rx={1} fill="#0c0a09" stroke="#57534e" strokeWidth="0.3" />
                  <text x={c.cx} y={c.y - 4.2} textAnchor="middle" fontSize="2.8" fill="#e7e5e4" fontFamily="'Courier New', monospace">{truncateNote(notes[w.id], 22)}</text>
                </g>
              )}
            </g>
            </g>
          );
        })}

        {/* The card in hand, following the pointer. */}
        {drag?.started && (() => {
          const a = byId(drag.actorId);
          if (!a) return null;
          return (
            <g pointerEvents="none" opacity="0.92">
              <rect x={drag.x - 13} y={drag.y - 9.5} width="26" height="8" rx="1.2" fill="#1c1917" stroke="#fcd34d" strokeWidth="0.6" />
              <text x={drag.x} y={drag.y - 4} textAnchor="middle" fontSize="3.8" fill="#fcd34d" fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.12">{a.name.toUpperCase()}</text>
            </g>
          );
        })()}
      </svg>
      </div>

      <div className="border-t border-stone-800 px-3 py-2 min-h-[3.2rem]">
        {hovered ? (
          <div className="text-xs text-stone-400 leading-snug">
            <span className="font-bold" style={{ color: glyphOf(hovered, weekNow).hex }}>{hovered.name}{hovered.burned ? " (OUT OF PLAY)" : ""}</span>
            <span className="text-stone-500"> · {hovered.title || TEAM_LABEL[hovered.team]}{hovered.signed ? " · SIGNED" : ""}</span>
            <span style={{ color: infTrait(hovered).hex }} className="font-bold"> · {infTrait(hovered).label}</span>
            {hovered.organizer && hovered.leakKnown && <span className="text-red-400 font-bold"> · HAS BEEN TALKING TO A MANAGER</span>}
            <span className="text-stone-500"> — {hovered.hook}</span>
            <div className="mt-0.5">
              <span className="text-stone-500">Friends: </span>
              {(() => {
                const known = knownFriends(hovered);
                const believed = believedSlots(hovered, social);
                const fellOut = recentBreaks(hovered, weekNow).map(e => byId(e.id)?.name).filter(Boolean);
                return (
                  <>
                    {believed === 0 && <span className="text-stone-600 italic">{social ? "keeps to themselves" : "none you know of"}</span>}
                    <span className="text-stone-300">{known.map(id => byId(id)?.name).join(", ")}</span>
                    {believed > known.length && <span className="text-stone-600 italic">{known.length ? " · " : ""}{believed - known.length} not yet met</span>}
                    {fellOut.length > 0 && <span className="text-red-400"> · fell out with {fellOut.join(" and ")}</span>}
                  </>
                );
              })()}
              {knownAff(hovered).length > 0 && (
                <span className="text-stone-500"> · </span>
              )}
              {knownAff(hovered).map((t, i) => (
                <span key={t} className={isPoisoned(hovered, t) ? "text-red-400" : "text-stone-300"} title={isPoisoned(hovered, t) ? "The company sponsors this now." : ""}>
                  {i > 0 ? "  " : ""}<AffIcon id={t} size={12} /> {AFF_BY_ID[t]?.label ?? t}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-stone-500 leading-snug">
            {onPair && <div>{move && moveZone ? "Drag one of your people onto the red box to get there before management does." : "Click anyone to plan. Drag one of your people onto somebody to send them."}</div>}
            {socialView && sl.unplacedCount > 0 && <div className="text-stone-600">Talking to people puts them on the map. A sit-down maps all their friends and their crowd.</div>}
            {mappedEdges.length > 0 && (
              <div className="text-stone-500 mt-0.5">
                {mappedEdges.length}{totalEdges != null ? ` of ${totalEdges}` : ""} friendships mapped, <span className="text-stone-200 font-bold">{crossMapped}</span> across team lines.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { EDGE_COMMON_GROUND, computeOrgLayout, ORG_LAYOUT, cardEdgePoint, FLOOR_LABELS, RatingGlyph, Act1FloorMap };
