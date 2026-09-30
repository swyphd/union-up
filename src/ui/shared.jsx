// Pieces every act draws with: the global style, meters, pips, pies, intro and outcome screens.
import React, { useState, useEffect } from "react";
import { ACT1_STAR_WEEKS, act1Stars } from "../engine/act1/constants.js";

// ---------- FONTS / GLOBAL STYLE ----------
const GlobalStyle = () => (
  <style>{`
    .font-stencil { font-family: Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif; letter-spacing: 0.02em; }
    .font-mono { font-family: 'Courier New', ui-monospace, Menlo, Consolas, monospace; }
    .card-perf {
      background-image: radial-gradient(circle, rgba(237,232,220,0.05) 1px, transparent 1px);
      background-size: 14px 14px;
      background-position: 0 0;
    }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .anim-rise { animation: rise 0.35s ease-out; }
    @keyframes deltafloat { 0% { opacity: 0; transform: translateY(2.5px); } 35% { opacity: 1; } 100% { opacity: 1; transform: translateY(0); } }
    .delta-float { animation: deltafloat 0.9s ease-out forwards; }
    @keyframes ringflash { 0% { opacity: 0; stroke-width: 0.2; } 40% { opacity: 1; stroke-width: 1.6; } 100% { opacity: 0.55; stroke-width: 0.6; } }
    .ring-flash { animation: ringflash 1.1s ease-out forwards; }
    @keyframes edgepulse { 0% { stroke-dashoffset: 20; opacity: 0; } 25% { opacity: 1; } 85% { opacity: 0.9; } 100% { stroke-dashoffset: 0; opacity: 0.25; } }
    .edge-pulse { stroke-dasharray: 20; animation: edgepulse 1.3s ease-out forwards; }
    @keyframes leaderpulse { 0%, 100% { stroke-opacity: 0.25; } 50% { stroke-opacity: 0.9; } }
    .leader-pulse { animation: leaderpulse 2.4s ease-in-out infinite; }
    @keyframes notefloat { 0% { opacity: 0; transform: translateY(2px); } 14% { opacity: 1; transform: translateY(0); } 78% { opacity: 1; } 100% { opacity: 0; } }
    .note-float { animation: notefloat 2.6s ease-in-out forwards; }
  `}</style>
);


// Resolution narrative lines almost always lead with "Name: ..." or "Name did X" —
// split them into notes that can float next to the person/site they're about, and a
// small leftover pile (national news, stamina, momentum) that isn't about anyone specific.
function splitLinesByEntity(lines, entities) {
  const noteById = {};
  const banner = [];
  (lines || []).forEach(line => {
    const match = entities.find(e => e.name && (line.startsWith(e.name + ":") || line.startsWith(e.name + " ") || line.startsWith(e.name + "'")));
    if (match) {
      const rest = line.slice(match.name.length).replace(/^:\s*/, "").trim();
      if (!noteById[match.id]) noteById[match.id] = rest;
    } else {
      banner.push(line);
    }
  });
  return { noteById, banner };
}
function truncateNote(str, n = 42) {
  if (!str) return str;
  return str.length > n ? str.slice(0, n - 1).trimEnd() + "…" : str;
}
// A bar with the cliff drawn on it. Knowing a number is 54 is useless without knowing
// that 60 is where management starts firing people.
function Meter({ label, value, icon, colorClass = "bg-amber-500", danger = false, thresholds = [], ghost = null, ghostLabel = null, delta = null }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-stone-500 mb-0.5">
        <span className="flex items-center gap-1">{icon}{label}</span>
        <span className="flex items-center gap-2">
          {delta != null && delta !== 0 && (
            <span className={`font-bold ${delta > 0 ? "text-teal-400" : "text-red-400"}`}>{delta > 0 ? "+" : ""}{delta}</span>
          )}
          <span className={`font-bold ${danger ? "text-red-400" : "text-stone-300"}`}>{value}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-stone-800 relative">
        <div className={`h-2 ${danger ? "bg-red-600" : colorClass} transition-all duration-500`} style={{ width: `${value}%` }} />
        {ghost != null && (
          <div
            className="absolute top-0 h-2 border-r-2 border-dashed border-stone-300/70"
            style={{ width: `${ghost}%` }}
            title={ghostLabel || "true support"}
          />
        )}
        {thresholds.map(t => (
          <div
            key={t.at}
            className="absolute top-[-2px] h-3 w-px"
            style={{ left: `${t.at}%`, backgroundColor: t.hex || "#78716c" }}
            title={t.label}
          />
        ))}
      </div>
      {thresholds.length > 0 && (
        <div className="relative h-3 mt-0.5">
          {thresholds.map(t => (
            <span key={t.at} className="absolute text-[9px] whitespace-nowrap"
              style={{ left: `${t.at}%`, transform: "translateX(-50%)", color: t.hex || "#78716c" }}>{t.tick || t.at}</span>
          ))}
        </div>
      )}
    </div>
  );
}
// Shared by both acts: one beat per click, never more than two lines, with a progress
// bar, back-navigation, a skip for replays, and keyboard control. State lives here, so
// leaving the intro phase unmounts it and a replay starts from the top on its own.
function IntroSequence({ beats, visuals = {}, doneLabel, onDone }) {
  const [step, setStep] = useState(0);
  const last = step === beats.length - 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (last) onDone(); else setStep(i => i + 1);
      } else if (e.key === "ArrowLeft") {
        setStep(i => Math.max(0, i - 1));
      } else if (e.key === "Escape") {
        onDone();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onDone]);

  const beat = beats[Math.min(step, beats.length - 1)] || {};
  // A mistyped key in a beat table should not be able to white-screen the game, so
  // accept `text` as well as `lines` and tolerate a beat that has neither.
  const beatLines = beat.lines ?? (beat.text ? [beat.text] : []);
  const accent = beat.tone === "red" ? "text-red-400" : "text-amber-400";
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 min-h-[70vh] flex flex-col">
      <div key={step} className="flex-1 flex flex-col justify-center anim-rise">
        <div className={`text-base tracking-[0.22em] mb-4 ${beat.tone === "red" ? "text-red-500" : "text-stone-500"}`}>{beat.kicker}</div>
        {beat.title && <div className={`font-stencil text-3xl sm:text-4xl leading-tight mb-4 ${accent}`}>{beat.title}</div>}
        {beatLines.map((line, i) => (
          // A beat with no headline leads on its first line instead, so it still has a
          // visual anchor rather than opening on body copy.
          <p key={i} className={!beat.title && i === 0
            ? `text-2xl sm:text-3xl leading-snug mb-4 ${accent}`
            : "text-stone-300 text-lg leading-relaxed mb-3"}>{line}</p>
        ))}
        {beat.visual && visuals[beat.visual] && <div className="mt-6">{visuals[beat.visual]}</div>}
      </div>

      <div className="mt-10">
        <div className="flex items-center gap-1.5 mb-4">
          {beats.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
              className={`h-1 flex-1 transition-colors ${i === step ? "bg-amber-400" : i < step ? "bg-stone-600" : "bg-stone-800"}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(i => Math.max(0, i - 1))}
            disabled={step === 0}
            className={`text-sm tracking-wide transition-colors ${step === 0 ? "text-stone-800 cursor-not-allowed" : "text-stone-500 hover:text-stone-300"}`}
          >
            ◂ BACK
          </button>
          <button
            onClick={() => (last ? onDone() : setStep(i => i + 1))}
            className="font-stencil text-lg sm:text-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-2.5 tracking-wide transition-colors"
          >
            {last ? doneLabel : "NEXT ▸"}
          </button>
          <button onClick={onDone} className="text-sm tracking-wide text-stone-600 hover:text-stone-400 transition-colors">
            SKIP
          </button>
        </div>
      </div>
    </div>
  );
}

// Endings are not intros. The result is the payoff, so the headline, tally and stars are
// never gated behind a click — they land the moment the screen opens. What gets paced is
// the part underneath: what it means, what it doesn't mean, and who got you there. The
// actions live on the last beat, and SKIP jumps straight to them rather than leaving.
function OutcomeTally({ tally }) {
  return (
    <div className="flex items-center justify-center gap-7 font-mono">
      <div><div className="text-xs text-stone-500 tracking-wide">YES</div><div className="text-3xl font-bold text-teal-400">{tally.yes}</div></div>
      <div><div className="text-xs text-stone-500 tracking-wide">NO</div><div className="text-3xl font-bold text-red-400">{tally.no}</div></div>
      {tally.out != null && (
        <div><div className="text-xs text-stone-500 tracking-wide">DIDN'T VOTE</div><div className="text-3xl font-bold text-stone-500">{tally.out}</div></div>
      )}
    </div>
  );
}

function StarThresholdLine({ week }) {
  const earned = act1Stars(week);
  const cell = (n, label) => (
    <span className={n === earned ? "text-amber-400 font-bold" : "text-stone-600"}>{"★".repeat(n)} {label}</span>
  );
  return (
    <div className="flex items-center justify-center gap-4 text-xs tracking-wide mt-2 flex-wrap">
      {cell(3, `≤${ACT1_STAR_WEEKS.three} wks`)}
      {cell(2, `≤${ACT1_STAR_WEEKS.two} wks`)}
      {cell(1, "finished")}
    </div>
  );
}

function OutcomeScreen({ tone = "win", title, stars, tally, meta, beats, visuals = {}, actions }) {
  const [step, setStep] = useState(0);
  const last = step === beats.length - 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        if (!last) { e.preventDefault(); setStep(i => i + 1); }
      } else if (e.key === "ArrowLeft") {
        setStep(i => Math.max(0, i - 1));
      } else if (e.key === "Escape") {
        setStep(beats.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, beats.length]);

  const beat = beats[step];
  return (
    <div className="max-w-2xl mx-auto px-6 py-14 anim-rise">
      <div className="text-center">
        <div className={`font-stencil text-4xl sm:text-5xl leading-tight mb-2 ${tone === "loss" ? "text-red-500" : "text-teal-400"}`}>{title}</div>
        {stars != null && (
          <>
            <div className="flex justify-center"><Stars count={stars} /></div>
            {meta?.week != null && <StarThresholdLine week={meta.week} />}
          </>
        )}
        {tally && <div className="mt-4"><OutcomeTally tally={tally} /></div>}
        {meta?.line && <p className="text-amber-400 text-lg mt-4">{meta.line}</p>}
      </div>

      <div className="border-t border-stone-800 mt-6 pt-5 min-h-[8.5rem]">
        <div key={step} className="anim-rise">
          {beat.lines.map((line, i) => (
            <p key={i} className={`leading-relaxed mb-3 ${beat.quiet ? "text-stone-500 text-base italic" : "text-stone-300 text-lg"}`}>{line}</p>
          ))}
          {beat.visual && visuals[beat.visual] && <div className="mt-4">{visuals[beat.visual]}</div>}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center gap-1.5 mb-4">
          {beats.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
              className={`h-1 flex-1 transition-colors ${i === step ? "bg-amber-400" : i < step ? "bg-stone-600" : "bg-stone-800"}`}
            />
          ))}
        </div>
        {last ? (
          <div className="flex flex-col sm:flex-row gap-2 justify-center">{actions}</div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setStep(i => Math.max(0, i - 1))}
              disabled={step === 0}
              className={`text-sm tracking-wide transition-colors ${step === 0 ? "text-stone-800 cursor-not-allowed" : "text-stone-500 hover:text-stone-300"}`}
            >
              ◂ BACK
            </button>
            <button
              onClick={() => setStep(i => i + 1)}
              className="font-stencil text-lg bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-2.5 tracking-wide transition-colors"
            >
              NEXT ▸
            </button>
            <button onClick={() => setStep(beats.length - 1)} className="text-sm tracking-wide text-stone-600 hover:text-stone-400 transition-colors">
              SKIP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function OutcomeRoster({ workers }) {
  return (
    <div className="border border-teal-900 bg-teal-950/20 p-3 text-left">
      <div className="text-xs text-teal-400 font-bold mb-2 tracking-wide">THE COMMITTEE THAT GOT IT THERE:</div>
      {workers.map(w => (
        <div key={w.id} className="text-sm text-stone-300 mb-1">
          <span className="font-bold text-stone-100">{w.name}</span> — {w.hook}
        </div>
      ))}
    </div>
  );
}

// ---------- SYMBOLS, NOT SENTENCES ----------
// Everything the player has to compare at a glance is a shape. Text is for the things
// that only get read once.

// Cost and budget as filled/empty pips. One pip is one hour.
function Pips({ filled = 0, total = 0, hex = "#fbbf24", size = 7, gap = 3, dim = false }) {
  return (
    <span className="inline-flex items-center" style={{ gap }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: size, height: size, borderRadius: "50%",
            backgroundColor: i < filled ? hex : "transparent",
            border: `1px solid ${i < filled ? hex : "#57534e"}`,
            opacity: dim ? 0.35 : 1,
          }}
        />
      ))}
    </span>
  );
}
// ---------- TIME IS A PIE, NOT PIPS ----------
// Pips mean commitment. Hours are a different resource and get a different shape: a
// week cut into as many slices as the person has hours, filled with what's left. The
// promotion to a fourth hour re-cuts the same circle into quarters instead of thirds,
// which makes the promotion something you can see rather than read.
function pieSlicePath(cx, cy, r, i, n) {
  const a0 = (-90 + (i * 360) / n) * (Math.PI / 180);
  const a1 = (-90 + ((i + 1) * 360) / n) * (Math.PI / 180);
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${360 / n > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
}

// Bare SVG shapes, so the same pie can be drawn inside the floor map's own <svg> and
// inside a standalone one in the panels.
function HourPieShapes({ cx, cy, r, left, total, hex, sw = 0.9, bg = "#1c1917" }) {
  const n = Math.max(1, total);
  const lit = Math.max(0, Math.min(n, left));
  if (n === 1) {
    return <circle cx={cx} cy={cy} r={r} fill={lit >= 1 ? hex : "none"} stroke={hex} strokeWidth={sw} strokeOpacity={lit >= 1 ? 1 : 0.4} />;
  }
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        // A filled wedge is cut from its neighbours in the panel colour, so three hours
        // still read as thirds instead of one solid disc. An empty wedge keeps its own
        // faint outline, so you can count the slices on a week that's fully spent.
        <path
          key={i}
          d={pieSlicePath(cx, cy, r, i, n)}
          fill={i < lit ? hex : "none"}
          stroke={i < lit ? bg : hex}
          strokeWidth={sw}
          strokeOpacity={i < lit ? 1 : 0.35}
          strokeLinejoin="round"
        />
      ))}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={hex} strokeWidth={sw} strokeOpacity="0.6" />
    </>
  );
}

function HourPie({ left, total, hex = "#fbbf24", size = 15, label }) {
  return (
    <span className="inline-flex items-center shrink-0" title={label ?? `${left} of ${total} hour${total === 1 ? "" : "s"} left`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block overflow-visible">
        <HourPieShapes cx={size / 2} cy={size / 2} r={size / 2 - 1} left={left} total={total} hex={hex} sw={1} />
      </svg>
    </span>
  );
}

// The price tag on every action button. Not a pie: a pie shows time REMAINING, and a
// second pie next to it showing time SPENT would read as the same shape meaning the
// opposite thing.
function CostPips({ hours, affordable = true }) {
  return (
    <span
      className={`text-xs font-bold tabular-nums shrink-0 ${affordable ? "text-amber-400" : "text-stone-600"}`}
      title={`${hours} hour${hours === 1 ? "" : "s"}`}
    >
      {hours}h
    </span>
  );
}


// ---------- SHARED BITS OF UI ----------
function InfoDot({ children, align = "center" }) {
  const pos = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span className="relative group inline-flex items-center align-middle ml-1">
      <span className="w-3 h-3 rounded-full border border-stone-600 text-stone-500 text-[10px] leading-[10px] text-center cursor-help transition-colors group-hover:border-amber-500 group-hover:text-amber-400 font-mono">i</span>
      <span className={`pointer-events-none absolute ${pos} bottom-full mb-1.5 z-50 hidden group-hover:block w-64 sm:w-72 border border-stone-600 bg-stone-950 px-2.5 py-2 text-xs leading-relaxed text-stone-300 normal-case tracking-normal text-left shadow-xl`}>
        {children}
      </span>
    </span>
  );
}

function StatRow({ label, value, suffix, hex, info, align, sub }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs text-stone-500 tracking-wide">
        <span className="flex items-center">{label}<InfoDot align={align}>{info}</InfoDot></span>
        <span className="font-bold text-stone-200">{value}{suffix}</span>
      </div>
      <div className="h-1.5 bg-stone-800 mt-1">
        <div className="h-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: hex }} />
      </div>
      {sub && <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">{sub}</div>}
    </div>
  );
}

function Stars({ count, size = "text-3xl" }) {
  return (
    <div className={`${size} tracking-widest`}>
      {[1, 2, 3].map(i => (
        <span key={i} className={i <= count ? "text-amber-400" : "text-stone-700"}>★</span>
      ))}
    </div>
  );
}

export { GlobalStyle, splitLinesByEntity, truncateNote, Meter, IntroSequence, OutcomeTally, StarThresholdLine, OutcomeScreen, OutcomeRoster, Pips, pieSlicePath, HourPieShapes, HourPie, CostPips, InfoDot, StatRow, Stars };
