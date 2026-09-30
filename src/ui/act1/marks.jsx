// The marks on a worker: trait chip, common-ground icons, the ladder badge.
import React from "react";
import { Pips } from "../shared.jsx";
import { infTrait } from "../../engine/act1/traits.js";
import { ladderOf } from "../../engine/act1/ladder.js";
import { AFF_BY_ID, affList, isPoisoned, knownAff, visibleShared } from "../../engine/act1/affinities.js";

function InfluenceTraitChip({ worker, size = "text-[11px]" }) {
  const t = infTrait(worker);
  return (
    <span title={t.blurb} className={`inline-flex items-center gap-1 px-1.5 py-0.5 border ${size}`}
      style={{ borderColor: t.hex, color: t.hex, backgroundColor: "rgba(0,0,0,0.2)" }}>
      {t.label}
    </span>
  );
}

// ---------- COMMON GROUND, DRAWN ----------
// Each affinity is a picture of the thing, not an abstract mark you have to be told the
// meaning of. Every icon lives in the same 0-10 box and paints with currentColor, so one
// definition serves the board, the panel and the hover line, and the surfaced / bought
// colour coding still applies.
const AFF_ICON = {
  dogs: (
    <>
      <path d="M5.7 3.6 L7.1 0.3 L8.9 3.8 Z" fill="currentColor" />
      <circle cx="6.4" cy="5.5" r="2.8" fill="currentColor" />
      <rect x="0.9" y="5.1" width="4.9" height="2.3" rx="1.15" fill="currentColor" />
      <circle cx="1.75" cy="5.8" r="0.7" fill="#100e0d" />
      <circle cx="6.7" cy="4.8" r="0.5" fill="#100e0d" />
    </>
  ),
  parent: (
    <>
      <circle cx="5" cy="2.1" r="1.7" fill="currentColor" />
      <path d="M5 3.9 L5 6.9 M2.6 5.1 L7.4 5.1 M5 6.9 L3.3 9.5 M5 6.9 L6.7 9.5"
        stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" fill="none" />
    </>
  ),
  commute: (
    <>
      <path d="M1 6.6 L1.9 4.3 L8.1 4.3 L9 6.6 Z" fill="currentColor" />
      <path d="M2.9 4.3 L3.7 2.4 L6.3 2.4 L7.1 4.3 Z" fill="currentColor" />
      <circle cx="2.9" cy="7.4" r="1.15" fill="currentColor" />
      <circle cx="7.1" cy="7.4" r="1.15" fill="currentColor" />
    </>
  ),
  ttrpg: (
    <>
      <path d="M5 0.7 L9.1 3.1 L9.1 6.9 L5 9.3 L0.9 6.9 L0.9 3.1 Z"
        fill="none" stroke="currentColor" strokeWidth="1.05" strokeLinejoin="round" />
      <path d="M5 2.7 L7.4 6.7 L2.6 6.7 Z" fill="currentColor" />
    </>
  ),
  veg: (
    <>
      {/* leafy tops */}
      <path d="M5 4.1 L5 0.5 M5 4.1 L2.9 1.4 M5 4.1 L7.1 1.4"
        stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* root, tapering to a point */}
      <path d="M3 3.9 L7 3.9 C6.6 6.2 5.9 8.2 5 9.6 C4.1 8.2 3.4 6.2 3 3.9 Z" fill="currentColor" />
      {/* the ridges are what stop it reading as a plain triangle */}
      <path d="M3.85 5.4 L6.15 5.4 M4.3 7 L5.7 7" stroke="#100e0d" strokeWidth="0.55" strokeLinecap="round" />
    </>
  ),
  gym: (
    <>
      <path d="M2.9 5 L7.1 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="0.7" y="2.6" width="1.9" height="4.8" rx="0.5" fill="currentColor" />
      <rect x="7.4" y="2.6" width="1.9" height="4.8" rx="0.5" fill="currentColor" />
    </>
  ),
  transplant: (
    <>
      <path d="M3.8 2.9 L3.8 1.5 L6.2 1.5 L6.2 2.9" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <rect x="1" y="2.9" width="8" height="5.6" rx="0.7" fill="currentColor" />
      <path d="M5 2.9 L5 8.5" stroke="#0c0a09" strokeWidth="0.7" />
    </>
  ),
  debt: (
    <>
      <path d="M5 0.7 L5 9.3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M7.5 2.9 C7.5 1.5 2.5 1.3 2.5 3.7 C2.5 5.8 7.5 4.5 7.5 6.6 C7.5 9 2.5 8.7 2.5 7.1"
        fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
    </>
  ),
  modder: (
    <>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <rect key={a} x="4.3" y="0.4" width="1.4" height="2.4" rx="0.35" fill="currentColor" transform={`rotate(${a} 5 5)`} />
      ))}
      <circle cx="5" cy="5" r="2.85" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="5" r="0.85" fill="currentColor" />
    </>
  ),
  secondjob: (
    <>
      <circle cx="5" cy="5" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.05" />
      <path d="M5 5 L5 2.6 M5 5 L7 6.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  caretaker: (
    <path d="M5 8.9 C0.9 6 0.9 3.3 2.6 2.3 C3.9 1.5 5 2.7 5 3.6 C5 2.7 6.1 1.5 7.4 2.3 C9.1 3.3 9.1 6 5 8.9 Z"
      fill="currentColor" />
  ),
  smoker: (
    <>
      <rect x="1" y="6.1" width="5.6" height="1.7" rx="0.4" fill="currentColor" />
      <rect x="7" y="6.1" width="2" height="1.7" rx="0.4" fill="currentColor" fillOpacity="0.55" />
      <path d="M3.1 4.6 C4.1 3.7 2.6 3.1 3.6 2.1" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </>
  ),
  church: (
    <>
      <path d="M5 0.8 L5 9.2 M2.4 3.7 L7.6 3.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </>
  ),
  vet: (
    <path d="M5 0.6 L6.4 3.7 L9.7 4.1 L7.2 6.3 L7.9 9.5 L5 7.9 L2.1 9.5 L2.8 6.3 L0.3 4.1 L3.6 3.7 Z"
      fill="currentColor" />
  ),
};

// The same drawing in an HTML context — panels, the hover line.
function AffIcon({ id, size = 13, hex = "currentColor", title }) {
  const art = AFF_ICON[id];
  if (!art) return null;
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} style={{ color: hex, display: "inline-block", verticalAlign: "-0.15em" }} aria-hidden="true">
      {title ? <title>{title}</title> : null}
      {art}
    </svg>
  );
}



function LadderBadge({ worker, showLabel = true }) {
  const r = ladderOf(worker);
  return (
    <span className="inline-flex items-center gap-1.5" title={r.blurb}>
      <Pips filled={r.pips} total={4} hex={r.hex} size={7} gap={2.5} dim={worker.burned} />
      {showLabel && <span className="text-[11px] font-bold tracking-wide" style={{ color: r.hex }}>{r.label}</span>}
    </span>
  );
}

// Common ground, drawn. A trait both people share lights up — that is the entire
// "who do I send" decision, rendered without a sentence.
// One wording for an affinity nobody has found yet, so the board and the panel say the
// same thing about the same mark.
const AFF_UNKNOWN_LABEL = "Not surfaced yet";
const AFF_UNKNOWN_SUB = "A quick chat is the cheapest way to find out.";

// The tooltip body, shared by both places a mark can be hovered. Positioning is the
// caller's job, because the board places it in percentages over an SVG and the panel
// places it against the mark itself.
function AffTip({ tone, label, sub }) {
  return (
    <div className={`whitespace-nowrap border bg-stone-950 px-2.5 py-1.5 shadow-lg ${tone === "bought" ? "border-red-700" : tone === "unknown" ? "border-stone-700" : "border-stone-600"}`}>
      <div className={`text-sm font-bold leading-tight ${tone === "bought" ? "text-red-400" : tone === "unknown" ? "text-stone-400" : "text-stone-100"}`}>{label}</div>
      <div className="text-xs text-stone-500 leading-tight mt-0.5">{sub}</div>
    </div>
  );
}

// Wraps a mark in the panel so it raises the same tooltip the board does, rather than a
// browser title that looks nothing like it and arrives a second late.
function MarkWithTip({ tone, label, sub, children }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && (
        <span className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 pointer-events-none">
          <AffTip tone={tone} label={label} sub={sub} />
        </span>
      )}
    </span>
  );
}

// An affinity nobody has surfaced, drawn the same way in both places: a dashed slot with
// nothing in it yet.
function AffEmptySlot({ size = 30 }) {
  return (
    <span className="inline-flex items-center justify-center border border-dashed border-stone-700"
      style={{ width: size, height: size }}>
      <span className="rounded-full border border-stone-700" style={{ width: size * 0.27, height: size * 0.27 }} />
    </span>
  );
}

// Symbols, at a size you can actually read, with the name on hover. A mark shared with
// whoever is doing the asking lights up teal, because that is the only thing on this row
// the player is deciding on. An empty ring is something about them nobody has found yet.
function AffinityMarks({ worker, actor = null }) {
  const known = knownAff(worker);
  const hidden = affList(worker).length - known.length;
  if (!known.length && !hidden) return null;
  const shared = actor ? visibleShared(actor, worker) : [];
  return (
    <>
      {known.map(id => {
        const a = AFF_BY_ID[id];
        const match = shared.includes(id);
        const bought = isPoisoned(worker, id);
        return (
          <MarkWithTip
            key={id}
            tone={bought ? "bought" : "known"}
            label={a.label}
            sub={bought ? "The company sponsors this now \u2014 it counts for nothing."
              : match ? `${actor.name} shares this \u2014 a sit-down has something to open on.`
              : "Shared common ground makes a conversation land harder."}
          >
          <span
            className="inline-flex items-center justify-center border"
            style={{
              width: 30, height: 30,
              borderColor: bought ? "#7f1d1d" : match ? "#2dd4bf" : "#44403c",
              color: bought ? "#f87171" : match ? "#5eead4" : "#a8a29e",
              backgroundColor: match ? "rgba(45,212,191,0.12)" : "transparent",
            }}
          >
            <AffIcon id={a.id} size={17} />
          </span>
          </MarkWithTip>
        );
      })}
      {Array.from({ length: hidden }).map((_, i) => (
        <MarkWithTip key={"h" + i} tone="unknown" label={AFF_UNKNOWN_LABEL} sub={AFF_UNKNOWN_SUB}>
          <AffEmptySlot />
        </MarkWithTip>
      ))}
      {shared.length > 0 && (
        <span className="text-xs text-teal-300 ml-1">
          {shared.length} in common with {actor.name}
        </span>
      )}
    </>
  );
}

export { InfluenceTraitChip, AFF_ICON, AffIcon, LadderBadge, AFF_UNKNOWN_LABEL, AFF_UNKNOWN_SUB, AffTip, MarkWithTip, AffEmptySlot, AffinityMarks };
