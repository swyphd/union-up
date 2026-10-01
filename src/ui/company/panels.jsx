// The company campaign's panels: the network map, a site's actions, the platform, the escalation prompt.
import React, { useState } from "react";
import { AlertTriangle, Eye, Scale, Vote, X, CheckCircle2, Radio, Megaphone, HandCoins, UsersRound } from "lucide-react";
import { ACT2_LAYOUT, ACT2_STATUS_HEX, GRIEVANCE_ICON, MAP_H, MAP_W, statusMeta } from "./ActTwoGame.jsx";
import { CostPips, Meter, truncateNote } from "../shared.jsx";
import { ACT2_LEADER_PULL, ACT2_ONE_ON_ONES_PER_TURN, ACT2_SITDOWN_COST, act2Read, act2Standing, metLeaders } from "../../engine/company/roster.js";
import { ACT2_CAMPAIGN_TIERS, ACT2_CAMPAIGN_UPKEEP, ACT2_EFFORT_TIERS, ACT2_FILING_LEAD, COMMITTEE_COST, COMMITTEE_COST_CAMPAIGN, COMMITTEE_MORALE_REQ, COMMITTEE_RECRUIT_PCT_REQ, GRIEVANCE_META } from "../../engine/company/constants.js";
import { ACT2_MAX_PLEDGES, BLOCS, BLOC_BY_ID, DEFECT_THRESHOLD, DEMANDS, DEMAND_BY_ID, LOC_COMPOSITION, PLATFORM_SLOTS, PROVEN_BONUS, blocSatisfaction } from "../../engine/company/platform.js";
import { TRAIT_LABEL } from "../../engine/act1/constants.js";
import { act2Projection, act2WinChance, baseGain, baseVis, filingGates } from "../../engine/company/campaign.js";

function FeedbackControls({ loc, response, priorities = null, onToggle }) {
  // Once the petition is in, nothing on this list still applies except the one thing
  // that decides the vote — so the campaign gets the committee row and nothing else.
  const campaign = loc.status === "campaign";
  // Organizing: documenting is for the band where management has started watching but
  // has not moved yet. At the vote there is no band — you are already the loudest thing
  // in the building — so it is on offer every week.
  const inCrackdownBand = campaign ? !loc.documented : (loc.visibility >= 40 && loc.visibility < 60);
  const recruitedPct = loc.recruited / loc.workers;
  const leadersFound = metLeaders(loc);
  const numbersReady = !loc.committee?.active && loc.morale >= COMMITTEE_MORALE_REQ && recruitedPct >= COMMITTEE_RECRUIT_PCT_REQ;
  const committeeEligible = numbersReady && leadersFound.length > 0;
  const bargainable = !campaign && priorities && BLOCS.some(b => (LOC_COMPOSITION[loc.id]?.[b.id] || 0) >= 0.5 && !priorities[b.id]?.known);
  const hasAny = campaign
    ? (committeeEligible || inCrackdownBand)
    : (loc.grievance || inCrackdownBand || loc.antiUnion?.active || loc.buyOff?.active || committeeEligible || bargainable);
  if (!hasAny) return null;

  return (
    <div className="mt-2 space-y-1.5 border-t border-stone-800 pt-2">
      {!campaign && loc.grievance && (() => {
        const meta = GRIEVANCE_META[loc.grievance.type];
        const Icon = GRIEVANCE_ICON[loc.grievance.type];
        const autoHandled = loc.committee?.active && loc.grievance.type !== "legal";
        if (autoHandled) {
          return (
            <div className={`flex items-center gap-2 text-xs border px-2 py-1 ${meta.tone} opacity-70`}>
              <Icon size={12} />
              <span className="flex-1"><span className="font-bold">{meta.label}.</span> The shop committee is handling this one — no organizer time needed.</span>
            </div>
          );
        }
        return (
          <label className={`flex items-center gap-2 text-xs border px-2 py-1 cursor-pointer ${meta.tone} ${response.grievance ? "bg-stone-800" : ""}`}>
            <input type="checkbox" checked={!!response.grievance} onChange={() => onToggle("grievance")} className="accent-amber-500" />
            <Icon size={12} />
            <span className="flex-1"><span className="font-bold">{meta.label}.</span> {meta.action}</span><CostPips hours={meta.cost} />
          </label>
        );
      })()}
      {inCrackdownBand && (
        <label className="flex items-center gap-2 text-xs border border-stone-600 text-stone-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.document} onChange={() => onToggle("document")} className="accent-amber-500" />
          <Radio size={12} />
          <span className="flex-1">
            <span className="font-bold">{campaign ? "They will move on somebody before the ballot." : "Management is watching closer."}</span>{" "}
            {campaign
              ? "Keep the dates, the names and who was in the room — a crackdown you can file a charge over costs less than half the fear"
              : "Document it"}
          </span><CostPips hours={1} />
        </label>
      )}
      {!campaign && loc.antiUnion?.active && (
        <label className="flex items-center gap-2 text-xs border border-red-800 text-red-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.counter} onChange={() => onToggle("counter")} className="accent-amber-500" />
          <Megaphone size={12} />
          <span className="flex-1"><span className="font-bold">Anti-union talk is spreading.</span> Counter-message</span><CostPips hours={1} />
        </label>
      )}
      {!campaign && loc.buyOff?.active && (
        <label className="flex items-center gap-2 text-xs border border-teal-800 text-teal-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.reframe} onChange={() => onToggle("reframe")} className="accent-amber-500" />
          <HandCoins size={12} />
          <span className="flex-1"><span className="font-bold">Management just announced a retention bonus.</span> Reframe it as a union win</span><CostPips hours={1} />
        </label>
      )}
      {(() => {
        // Listening to a bloc is an action like any other. It reveals what they
        // actually want and how hard, and buys goodwill just for having asked.
        const comp = LOC_COMPOSITION[loc.id] || {};
        const thick = BLOCS.filter(b => (comp[b.id] || 0) >= 0.5);
        const target = thick.find(b => !(priorities?.[b.id]?.known)) || null;
        if (!target || !priorities) return null;
        return (
          <label className="flex items-center gap-2 text-xs border border-sky-800 text-sky-300 px-2 py-1 cursor-pointer">
            <input type="checkbox" checked={!!response.bargain} onChange={() => onToggle("bargain")} className="accent-amber-500" />
            <UsersRound size={12} />
            <span className="flex-1">
              <span className="font-bold">{target.label} are {Math.round((comp[target.id] || 0) * 100)}% of this shop.</span>{" "}
              Sit down and hear them out — reveals what they actually want and how hard
            </span>
            <CostPips hours={2} />
          </label>
        );
      })()}
      {committeeEligible && (
        <label className="flex items-center gap-2 text-xs border border-amber-600 text-amber-300 px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={!!response.formCommittee} onChange={() => onToggle("formCommittee")} className="accent-amber-500" />
          <UsersRound size={12} />
          <span className="flex-1">
            <span className="font-bold">{campaign ? "Still no shop committee, and the vote is coming." : `${leadersFound.map(w => w.name).join(" and ")} can carry a committee.`}</span>{" "}
            {campaign
              ? "Build one now — it is the only thing left that changes the count, and it costs more under a running clock"
              : "Build it around them — the petition needs it, and it is what lets anyone here count honestly"}
          </span><CostPips hours={campaign ? COMMITTEE_COST_CAMPAIGN : COMMITTEE_COST} />
        </label>
      )}
      {numbersReady && !leadersFound.length && (
        <div className="flex items-center gap-2 text-xs border border-stone-700 text-stone-500 px-2 py-1">
          <UsersRound size={12} />
          <span className="flex-1">
            <span className="font-bold text-stone-400">The numbers here are ready for a committee. You have not found anyone to build it around.</span>{" "}
            A committee is the people the floor already follows. Sit down with them and find out who those are.
          </span>
        </div>
      )}
    </div>
  );
}

function Act2NetworkMap({ locations, allocations = {}, onSelect, edgePulses = [], stepKey = 0, highlights = null, deployedLeaders = {}, notes = null, ballotCtx = null }) {
  const [hoverId, setHoverId] = useState(null);
  const hovered = locations.find(l => l.id === hoverId);
  const clusterRadius = (loc) => 8 + Math.min(5, Math.round(loc.workers / 3));
  const moraleHex = (loc) => (loc.morale >= 70 ? "#2dd4bf" : loc.morale >= 30 ? "#a8a29e" : "#f87171");

  // Static faint edges — the shared channels and cross-site friend groups the flavor text
  // describes are drawn once, always visible, so pulses have a network to travel along.
  const pairs = [];
  const ids = locations.map(l => l.id);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]]);

  return (
    <div className="border-2 border-stone-800 bg-stone-900 card-perf mb-6">
      <div className="flex items-center justify-between flex-wrap gap-y-1 px-3 pt-2">
        <div className="font-stencil text-lg tracking-wide text-stone-200">THE COMPANY</div>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-500">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-teal-400" /> MORALE 70+</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-stone-400" /> MID</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-400" /> LOW</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block rounded-full bg-stone-500" style={{ width: 5, height: 5 }} />
            <span className="inline-block rounded-full bg-stone-500" style={{ width: 10, height: 10 }} />
            SIZE = WORKFORCE
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block rounded-full border border-stone-400" style={{ width: 7, height: 7 }} />
            HOLLOW = TALK, NOT VOTES
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full block select-none">
        <defs>
          <marker id="site-arrow-hot-up" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#2dd4bf" />
          </marker>
          <marker id="site-arrow-hot-down" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#f87171" />
          </marker>
        </defs>

        {pairs.map(([a, b], i) => {
          const pa = ACT2_LAYOUT[a], pb = ACT2_LAYOUT[b];
          if (!pa || !pb) return null;
          return <line key={`edge-${i}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#57534e" strokeWidth="0.3" strokeOpacity="0.35" strokeDasharray="1.5 1.5" />;
        })}

        {edgePulses.map((ev, i) => {
          const a = ACT2_LAYOUT[ev.from], b = ACT2_LAYOUT[ev.to];
          if (!a || !b) return null;
          const hot = ev.tone === "down" ? "#f87171" : "#2dd4bf";
          return (
            <line
              key={`pulse-${stepKey}-${i}`}
              className="edge-pulse"
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              pathLength="20"
              stroke={hot}
              strokeWidth="1"
              markerEnd={ev.tone === "down" ? "url(#site-arrow-hot-down)" : "url(#site-arrow-hot-up)"}
            />
          );
        })}

        {locations.map(loc => {
          const p = ACT2_LAYOUT[loc.id];
          if (!p) return null;
          const r = clusterRadius(loc);
          const dim = loc.status === "won" || loc.status === "lost" || loc.status === "abandoned";
          const escalationReady = loc.status === "organizing" && loc.morale >= 70;
          const needsResponse = loc.grievance || loc.antiUnion?.active || loc.buyOff?.active || (loc.visibility >= 40 && loc.visibility < 60);
          const allocation = allocations[loc.id];
          const hl = highlights ? highlights[loc.id] : null;
          const leader = deployedLeaders[loc.id];
          // One dot per actual person on the roster, so the circle is the shop rather
          // than a decoration sized like it.
          const people = loc.roster && loc.roster.length ? loc.roster : null;
          const dotCount = people ? people.length : Math.min(9, Math.max(3, Math.round(loc.workers / 2)));
          const dots = Array.from({ length: dotCount }, (_, i) => {
            const ang = (2 * Math.PI * i) / dotCount - Math.PI / 2;
            const rr = r * (dotCount > 9 ? 0.62 : 0.55);
            return { x: Math.cos(ang) * rr, y: Math.sin(ang) * rr, w: people ? people[i] : null };
          });
          return (
            <g
              key={loc.id}
              transform={`translate(${p.x} ${p.y})`}
              opacity={dim ? 0.4 : 1}
              className="cursor-pointer"
              onClick={() => onSelect(loc)}
              onMouseEnter={() => setHoverId(loc.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              {escalationReady && (
                <circle r={r + 2.5} fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1.4 1" />
              )}
              {loc.committee?.active && (
                <circle className="leader-pulse" r={r + 1.6} fill="none" stroke="#2dd4bf" strokeWidth="0.4" strokeOpacity="0.6" />
              )}
              {hl && hl.statusChanged && (
                <circle
                  key={`flash-${stepKey}-${loc.id}`}
                  className="ring-flash"
                  r={r + 2.8}
                  fill="none"
                  stroke={loc.status === "won" ? "#2dd4bf" : loc.status === "lost" ? "#f87171" : "#fbbf24"}
                />
              )}
              <circle r={r} fill="#1c1917" stroke={ACT2_STATUS_HEX[loc.status]} strokeWidth="0.9" />
              {/* Each dot is a worker. Filled = morale; the hollow ones past the true-support
                  share are the people who talk warmer than they'd vote. */}
              {(() => {
                const known = !!loc.committee?.active;
                // Without a committee you only see the warm surface: every dot filled.
                // With one you see each person, and the hollow dots are the specific
                // people who talk warmer than they would vote.
                if (!known) {
                  return dots.map((d, i) => (
                    <circle key={i} cx={d.x} cy={d.y} r="1.1" fill={moraleHex(loc)} strokeOpacity="0.7" />
                  ));
                }
                if (!people) {
                  const realShare = (loc.trueSupport ?? loc.morale) / 100;
                  const solidUpTo = Math.round(dots.length * realShare / Math.max(0.01, loc.morale / 100));
                  return dots.map((d, i) => {
                    const solid = i < solidUpTo;
                    return (
                      <circle
                        key={i} cx={d.x} cy={d.y} r="1.1"
                        fill={solid ? moraleHex(loc) : "none"}
                        stroke={moraleHex(loc)} strokeWidth={solid ? 0 : 0.4} strokeOpacity="0.7"
                      />
                    );
                  });
                }
                return dots.map((d, i) => {
                  const pr = ballotCtx?.priorities;
                  const walked = !!(pr?.[d.w.status]?.defected || pr?.[d.w.tenure]?.defected);
                  const solid = !walked && act2Standing(loc, d.w, ballotCtx) >= 50;
                  return (
                    <circle
                      key={i} cx={d.x} cy={d.y} r="1.1"
                      fill={solid ? moraleHex(loc) : "none"}
                      stroke={walked ? "#57534e" : moraleHex(loc)} strokeWidth={solid ? 0 : 0.4} strokeOpacity="0.7"
                    />
                  );
                });
              })()}
              {hl && hl.moraleDelta !== 0 && (
                <text
                  key={`delta-${stepKey}-${loc.id}`}
                  className="delta-float"
                  textAnchor="middle"
                  y={-(r + 3)}
                  fontSize="3.6"
                  fontWeight="bold"
                  fill={hl.moraleDelta > 0 ? "#2dd4bf" : "#f87171"}
                  fontFamily="'Courier New', monospace"
                >{hl.moraleDelta > 0 ? "+" : ""}{hl.moraleDelta}</text>
              )}
              <text textAnchor="middle" y={r + 5} fontSize="3.6" fill="#e7e5e4" fontFamily="Impact, 'Arial Black', sans-serif" letterSpacing="0.1">{loc.name}</text>
              <text textAnchor="middle" y={r + 9} fontSize="2.6" fill={ACT2_STATUS_HEX[loc.status]} fontFamily="'Courier New', monospace">{statusMeta[loc.status].label}</text>
              {allocation > 0 && (
                <g>
                  {Array.from({ length: allocation }).map((_, i) => (
                    <circle key={i} cx={(i - (allocation - 1) / 2) * 2.6} cy={r + 12} r="0.95" fill="#fbbf24" />
                  ))}
                </g>
              )}
              {needsResponse && !dim && (
                <circle cx={r * 0.75} cy={-r * 0.75} r="1.6" fill="#f87171" />
              )}
              {leader && (
                <g transform={`translate(${-r * 0.8} ${-r * 0.8})`}>
                  <circle r="2.1" fill="#1c1917" stroke="#fbbf24" strokeWidth="0.6" />
                  <text textAnchor="middle" dominantBaseline="central" fontSize="2.6" fill="#fbbf24" fontFamily="Impact, 'Arial Black', sans-serif">{leader.name[0]}</text>
                </g>
              )}
              {notes && notes[loc.id] && (
                <g key={`note-${stepKey}-${loc.id}`} className="note-float">
                  <rect x={-24} y={-(r + 17)} width={48} height={8.5} rx={1.2} fill="#1c1917" stroke="#57534e" strokeWidth="0.3" />
                  <text x={0} y={-(r + 12.3)} textAnchor="middle" fontSize="2.5" fill="#e7e5e4" fontFamily="'Courier New', monospace">{truncateNote(notes[loc.id], 46)}</text>
                </g>
              )}
            </g>
          );
        })}

      </svg>
      <div className="border-t border-stone-800 px-3 py-2 min-h-[3.25rem]">
        {hovered ? (
          <div className="text-xs text-stone-400 leading-snug">
            <span className={`font-bold ${statusMeta[hovered.status].color}`}>{hovered.name}</span>
            <span className="text-stone-500"> — {statusMeta[hovered.status].label}. Morale {hovered.morale}, visibility {hovered.visibility}, {hovered.recruited}/{hovered.workers} recruited.</span>
            {hovered.committee?.active && <span className="text-teal-400"> Shop committee active — organizing here no longer depends entirely on you.</span>}
            {hovered.antiUnion?.active && <span className="text-red-400"> Anti-union talk circulating — can spread to other sites if unanswered.</span>}
            {deployedLeaders[hovered.id] && <span className="text-amber-400"> {deployedLeaders[hovered.id].name} is stationed here — strong on {TRAIT_LABEL[deployedLeaders[hovered.id].trait]}.</span>}
          </div>
        ) : (
          <div className="text-xs text-stone-600 italic">
            Anti-union talk and momentum both travel these lines. Hover a site for details, click to plan.
          </div>
        )}
      </div>
    </div>
  );
}

function LocationActionModal({ loc, turn, allocation, response, priorities = null, remaining = 99, factor = 1, platform = [], proven = [], ballotCtx = null, sitDownsLeft = 0, onSitDown = null, onFile = null, onSetUnits, onToggleResponse, onClose }) {
  const booking = response?.sitDown || [];
  const canSitDown = !!onSitDown && (sitDownsLeft > 0 || booking.length > 0) && remaining >= ACT2_SITDOWN_COST;
  const meta = statusMeta[loc.status];
  const isCampaign = loc.status === "campaign";
  const isOrganizing = loc.status === "organizing";
  const tiers = isCampaign ? ACT2_CAMPAIGN_TIERS : ACT2_EFFORT_TIERS;
  const canAct = isCampaign || isOrganizing;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-stone-900 border-2 border-stone-700 max-w-md w-full p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-stencil text-2xl text-amber-400">{loc.name}</div>
          <button onClick={onClose}><X size={18} className="text-stone-500 hover:text-stone-200" /></button>
        </div>
        <div className={`text-sm font-bold mb-4 ${meta.color}`}>{meta.label}</div>

        <div className="space-y-4 mb-4">
          <Meter
            label="MORALE (what the floor says)"
            value={loc.morale}
            icon={<CheckCircle2 size={11} />}
            colorClass="bg-teal-500"
            ghost={loc.committee?.active ? loc.trueSupport : null}
            ghostLabel="true support, as the committee reports it"
            thresholds={[{ at: 70, hex: "#2dd4bf", tick: "70 file" }]}
          />
          {loc.committee?.active ? (
            <div className="text-xs -mt-2.5">
              <span className="text-stone-500">TRUE SUPPORT</span>{" "}
              <span className="font-bold text-amber-400">{loc.trueSupport}</span>
              <span className="text-stone-500"> — the dashed line. The vote rolls against this, not morale.</span>
              {loc.morale - loc.trueSupport >= 12 && (
                <span className="text-red-400 font-bold"> {loc.morale - loc.trueSupport} points of it is talk.</span>
              )}
            </div>
          ) : (
            <div className="text-xs -mt-2.5 text-stone-600 italic">
              True support unknown — no shop committee here to report honestly. The vote rolls against a number you cannot see.
            </div>
          )}
          <Meter
            label="VISIBILITY"
            value={loc.visibility}
            icon={<Eye size={11} />}
            danger={loc.visibility >= 60}
            thresholds={[{ at: 40, hex: "#fbbf24", tick: "40 watched" }, { at: 60, hex: "#f87171", tick: "60 retaliation" }]}
          />
          <Meter
            label="LEGAL RISK"
            value={loc.legalRisk}
            icon={<Scale size={11} />}
            danger={loc.legalRisk >= 60}
            thresholds={[{ at: 75, hex: "#f87171", tick: "75 cannot file" }]}
          />
          {isCampaign && (
            <Meter
              label="WORKER FEAR"
              value={loc.fear}
              icon={<AlertTriangle size={11} />}
              danger={loc.fear >= 60}
              thresholds={[{ at: 60, hex: "#f87171", tick: "60 turnout collapses" }]}
            />
          )}
        </div>

        {/* The count, as it stands today. This is the number the campaign is actually
            fighting over, so it belongs where the player decides what to spend here. */}
        {isCampaign && (
          loc.committee?.active ? (() => {
            const odds = act2WinChance(loc, factor, ballotCtx);
            const p = act2Projection(loc, factor, ballotCtx);
            return (
              <div className="border border-stone-700 bg-stone-950/60 px-3 py-2 mb-4">
                <div className="text-xs text-stone-500 tracking-wide mb-1">THE COUNT, ON TODAY'S NUMBERS</div>
                <div className="flex items-center gap-4 text-base">
                  <span className="text-teal-400 font-bold">{p.yes} YES</span>
                  <span className="text-red-400 font-bold">{p.no} NO</span>
                  <span className="text-stone-500">{p.out} won't vote</span>
                  <span className={`ml-auto font-bold ${odds >= 0.7 ? "text-teal-400" : odds >= 0.5 ? "text-amber-400" : "text-red-400"}`}>
                    {Math.round(odds * 100)}%
                  </span>
                </div>
                {/* The escalation prompt states the ballot rule at the moment you file,
                    and the yes/no projection above shows it. What is left here is the part
                    no number on this panel explains: what fear actually does. */}
                <div className="text-xs text-stone-500 mt-1 leading-snug">
                  Fear keeps your people at their desks rather than changing their vote, and every month of the employer's campaign is a month it goes up.
                </div>
              </div>
            );
          })() : (
            <div className="border border-amber-800 bg-amber-950/20 text-amber-300 px-3 py-2 mb-4 text-xs leading-snug">
              No shop committee here, so nobody is counting honestly. You are running a campaign without knowing the count.
            </div>
          )
        )}

        <div className="text-xs text-stone-500 space-y-1 font-mono mb-4">
          <div>
            Manager: <span className="text-stone-200">{loc.manager}</span>{" "}
            <span className={loc.manager === "hostile" ? "text-red-400" : loc.manager === "sympathetic" ? "text-teal-400" : "text-stone-600"}>
              {loc.manager === "hostile"
                ? "(+4 visibility every month you organize here, and they can retaliate below the usual threshold)"
                : loc.manager === "sympathetic"
                ? "(+3 morale per active month, \u22122 visibility)"
                : "(no modifier)"}
            </span>
          </div>
          <div>Recruited: <span className="text-stone-200">{loc.recruited}/{loc.workers}</span> ({Math.round((loc.recruited / loc.workers) * 100)}%)</div>
          {platform.length >= PLATFORM_SLOTS && priorities && (() => {
            // The platform read through the people who actually work here. Same number
            // the vote uses, shown every week instead of once at the count.
            const comp = LOC_COMPOSITION[loc.id] || {};
            const thick = BLOCS.filter(b => (comp[b.id] || 0) >= 0.5)
              .map(b => ({ b, sat: priorities[b.id]?.defected ? 0 : blocSatisfaction(b.id, platform, priorities, proven) }))
              .sort((x, y) => x.sat - y.sat);
            return (
              <div className={factor < 0.95 ? "text-red-400" : factor > 1.05 ? "text-teal-400" : "text-stone-400"}>
                Platform here: <span className="font-bold">{Math.round(factor * 100)}%</span>
                <span className="text-stone-500">
                  {" — "}
                  {thick.length
                    ? thick.map(({ b, sat }) => `${b.label} are ${Math.round((comp[b.id] || 0) * 100)}% of this shop, satisfied ${sat}`).join("; ")
                    : "no bloc is thick enough here to swing it"}
                  . Organizing and turnout both land at that rate.
                </span>
              </div>
            );
          })()}
          {isCampaign && <div>Election in <span className="text-stone-200">{Math.max(0, loc.electionTurn - turn)} month{Math.max(0, loc.electionTurn - turn) === 1 ? "" : "s"}</span> — actions here fight the employer's counter-campaign directly.</div>}
          {loc.antiUnion?.active && <div className="text-red-400">Anti-union talk is circulating ({loc.antiUnion.turnsLeft} month{loc.antiUnion.turnsLeft === 1 ? "" : "s"} left)</div>}
          {loc.buyOff?.active && <div className="text-teal-400">Workers just got a surprise raise ({loc.buyOff.turnsLeft} month{loc.buyOff.turnsLeft === 1 ? "" : "s"} of dampened organizing left)</div>}
          {loc.committee?.active && <div className="text-teal-400">Shop committee active{loc.committee.strikes > 0 ? ` (${loc.committee.strikes} strike${loc.committee.strikes === 1 ? "" : "s"} taken)` : ""}</div>}
        </div>

        {loc.roster && loc.roster.length > 0 && (
          <div className="border border-stone-800 bg-stone-950/60 px-3 py-2 mb-4">
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="text-xs text-stone-500 tracking-wide">THE FLOOR</div>
              <div className="text-[11px] text-stone-600">
                {loc.committee?.active
                  ? "The committee reports honestly, so these are numbers."
                  : "No committee here, so every one of these is an estimate."}
              </div>
            </div>
            <div className="text-[11px] leading-snug mb-1.5">
              {sitDownsLeft > 0 || booking.length > 0 ? (
                <span className="text-amber-400">
                  Click a name to sit down with them this month — 1 action each, {sitDownsLeft} left on the calendar.
                  You get an honest read on them, and the names they give you when you ask who else to talk to.
                </span>
              ) : (
                <span className="text-stone-600">
                  No one-on-ones left this month. You get {ACT2_ONE_ON_ONES_PER_TURN} across the whole campaign — four sites, one calendar.
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-y-0.5">
              {loc.roster.map(w => {
                const r = act2Read(loc, w, ballotCtx);
                const sb = BLOC_BY_ID[w.status], tb = BLOC_BY_ID[w.tenure];
                const gone = priorities?.[w.status]?.defected || priorities?.[w.tenure]?.defected;
                const hex = r.mid >= 62 ? "#2dd4bf" : r.mid >= 45 ? "#fbbf24" : "#f87171";
                const booked = booking.includes(w.id);
                const canBook = canSitDown && !w.met && !gone;
                // Who has already named this person. The only view of the network there is.
                const namedBy = loc.roster.filter(o => o.met && (o.points || []).includes(w.id)).map(o => o.name);
                const leader = w.met && w.pull >= ACT2_LEADER_PULL;
                return (
                  <div key={w.id}>
                    <div
                      className={`flex items-center gap-1.5 text-[11px] leading-tight px-1 -mx-1 ${canBook ? "cursor-pointer hover:bg-stone-900" : ""} ${booked ? "bg-amber-950/40" : ""}`}
                      onClick={canBook ? () => onSitDown(w.id) : undefined}
                      title={canBook ? `Sit down with ${w.name} this month (1 action)` : w.met ? `You have sat down with ${w.name}.` : undefined}
                    >
                      <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: sb?.hex }} title={sb?.label} />
                      <span className="w-1.5 h-1.5 shrink-0 rounded-full" style={{ backgroundColor: tb?.hex }} title={tb?.label} />
                      <span className={`font-bold shrink-0 ${gone ? "text-stone-600 line-through" : leader ? "text-amber-400" : "text-stone-200"}`}>{w.name}</span>
                      {leader && <span className="shrink-0 text-[9px] text-amber-500 tracking-wide">CARRIES {w.pull}</span>}
                      {w.met && !leader && <span className="shrink-0 text-[9px] text-stone-600 tracking-wide">carries {w.pull}</span>}
                      {!w.met && namedBy.length > 0 && (
                        <span className="shrink-0 text-[9px] text-teal-500 tracking-wide" title={`Named by ${namedBy.join(", ")}`}>
                          {"\u25b8"} NAMED BY {namedBy.join(", ").toUpperCase()}
                        </span>
                      )}
                      <span className="text-stone-600 truncate flex-1">{w.role}</span>
                      {booked && <span className="shrink-0 text-[9px] text-amber-400 tracking-wide">BOOKED</span>}
                      <span className="font-mono shrink-0" style={{ color: gone ? "#57534e" : hex }}>
                        {gone ? "walked" : r.exact ? r.mid : `${r.lo}\u2013${r.hi}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-stone-600 mt-1.5 leading-snug">
              Square is status, circle is tenure — {BLOCS.map(b => b.label.toLowerCase()).join(", ")}. Both cut across this shop,
              and the platform speaks to a person through whichever two they happen to be.
              {" "}CARRIES is how many people take their cue from someone. You cannot see it until you have sat down with them,
              and it has nothing to do with how warm they are.
            </div>
          </div>
        )}

        {canAct ? (
          <>
            <div className="text-xs text-stone-500 font-bold mb-1 tracking-wide">WHAT SHOULD THE ORGANIZER DO HERE THIS MONTH?</div>
            <div className="space-y-2 mb-2">
              {tiers.map(t => (
                <button
                  key={t.units}
                  onClick={() => onSetUnits(t.units)}
                  className={`w-full text-left border-2 px-3 py-2 text-sm transition-colors ${allocation === t.units ? "border-amber-500 bg-amber-950/30" : "border-stone-700 hover:bg-stone-800/60"}`}
                >
                  <div className="font-stencil text-base tracking-wide text-stone-100 flex items-center justify-between gap-2">
                    <span>{t.label}</span>
                    {t.cost > 0 ? <CostPips hours={t.cost} affordable={t.cost <= remaining + allocation} /> : <span className="text-xs text-stone-600">FREE</span>}
                  </div>
                  <div className="text-xs text-stone-400">{t.desc}</div>
                  <div className="text-xs mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className={baseGain(t.units) >= 0 ? "text-teal-400" : "text-red-400"}>
                      {baseGain(t.units) >= 0 ? "+" : ""}{baseGain(t.units)} morale
                    </span>
                    <span className={baseVis(t.units) > 0 ? "text-amber-400" : "text-stone-500"}>
                      {baseVis(t.units) >= 0 ? "+" : ""}{baseVis(t.units)} visibility
                    </span>
                    {t.units > 0 && (
                      <span className="text-stone-500">
                        {"\u2248+"}{Math.max(0, Math.round(baseGain(t.units) * 0.35))} true support
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {(isOrganizing || isCampaign) && (
              <FeedbackControls loc={loc} response={response} priorities={priorities} onToggle={onToggleResponse} />
            )}
            {isOrganizing && onFile && loc.morale >= 70 && (() => {
              // The standing FILE control. The escalation prompt asks once; this is where
              // the answer lives every week after that.
              const gates = filingGates(loc, turn);
              const blocked = gates.filter(g => !g.pass);
              return (
                <button
                  onClick={onFile}
                  disabled={blocked.length > 0}
                  className={`mt-3 w-full text-left border-2 px-3 py-2 transition-colors ${blocked.length ? "border-stone-800 opacity-50 cursor-not-allowed" : "border-teal-600 hover:bg-teal-950/40"}`}
                >
                  <div className="font-stencil text-base text-teal-400">FILE FOR UNION ELECTION</div>
                  <div className="text-xs text-stone-400">
                    {blocked.length
                      ? `Blocked: ${blocked.map(g => `${g.label.toLowerCase()} ${g.val} (needs ${g.req})`).join(", ")}.`
                      : `Vote lands in ${ACT2_FILING_LEAD} weeks. The employer campaigns against you every week of it.`}
                  </div>
                </button>
              );
            })()}
          </>
        ) : (
          <div className="text-sm text-stone-500 italic">This site is no longer active — nothing left to organize here.</div>
        )}

        <button onClick={onClose} className="mt-4 w-full font-stencil text-lg bg-amber-500 hover:bg-amber-400 text-stone-950 py-2 tracking-wide">
          DONE
        </button>
      </div>
    </div>
  );
}


// ---------- THE PLATFORM SCREEN ----------
// Three slots, eight demands, and no combination that pleases everyone. The screen's
// whole job is to make the trade visible while you are making it, not afterwards.
function PlatformModal({ priorities, locations, proven = [], initial = [], onAdopt, onPledge }) {
  const pledgesUsed = BLOCS.filter(b => priorities[b.id]?.pledged).length;
  const pledgesLeft = ACT2_MAX_PLEDGES - pledgesUsed;
  // Reopened by a survey rather than written from scratch: the platform is already
  // adopted, and what the survey bought is exactly one change of mind.
  const revising = initial.length >= PLATFORM_SLOTS;
  const [chosen, setChosen] = useState(() => (revising ? [...initial] : []));
  const changes = chosen.filter(id => !initial.includes(id)).length;
  const full = chosen.length >= PLATFORM_SLOTS && (!revising || changes <= 1);
  const toggle = (id) => setChosen(c => c.includes(id) ? c.filter(x => x !== id) : (c.length < PLATFORM_SLOTS ? [...c, id] : c));

  const sat = Object.fromEntries(BLOCS.map(b => [b.id, blocSatisfaction(b.id, chosen, priorities, proven)]));
  const anyDefecting = BLOCS.filter(b => chosen.length && sat[b.id] < DEFECT_THRESHOLD);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto px-4 py-6">
      <div className="bg-stone-900 border-2 border-amber-500 max-w-2xl w-full mx-auto p-5 anim-rise">
        <div className="font-stencil text-2xl text-amber-400 tracking-wide mb-1">
          {revising ? "WHAT ARE WE ASKING FOR NOW?" : "WHAT ARE WE ASKING FOR?"}
        </div>
        <p className="text-sm text-stone-400 mb-4">
          {revising
            ? <>You asked the whole company and they answered. That buys <span className="text-amber-400 font-bold">one</span> change — swap a single
              demand for a single demand. Changing your mind twice on the strength of one survey is not listening, it is drift.</>
            : <>Everybody wanted a union. Nobody agreed what it was for. Pick <span className="text-amber-400 font-bold">{PLATFORM_SLOTS}</span> demands
              {" "}— bargaining capital is finite, and every one you take is one you didn't.</>}
          {proven.length > 0 && <> You already have <span className="text-teal-400 font-bold">{proven.length === 1 ? "one of these" : `${proven.length} of these`}</span> signed
            at the first shop, and a demand somebody has already won is worth {PROVEN_BONUS} more to everybody than one you are only asking for.</>}
        </p>

        {/* The blocs, live, as you choose. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {BLOCS.map(b => {
            const pr = priorities[b.id] || {};
            const v = sat[b.id];
            const dead = chosen.length > 0 && v < DEFECT_THRESHOLD;
            return (
              <div key={b.id} className={`border p-2 ${dead ? "border-red-600 bg-red-950/30" : "border-stone-800"}`} title={b.blurb}>
                <div className="text-[11px] font-bold" style={{ color: b.hex }}>{b.label}</div>
                <div className="h-1.5 w-full bg-stone-800 my-1 relative">
                  <div className="h-1.5 transition-all duration-300" style={{ width: `${v}%`, backgroundColor: dead ? "#ef4444" : b.hex }} />
                  <div className="absolute top-[-2px] h-2.5 w-px bg-red-500" style={{ left: `${DEFECT_THRESHOLD}%` }} title="below this they walk" />
                </div>
                <div className={`text-[11px] font-bold ${dead ? "text-red-400" : "text-stone-400"}`}>{v}{dead ? " WALKS" : ""}</div>
                <div className="text-[10px] mt-1">
                  {pr.known
                    ? <span className="text-stone-400">wants <span className="font-bold" style={{ color: b.hex }}>{DEMAND_BY_ID[pr.top]?.label}</span>{" "}
                        <span className="text-stone-500">({"\u25CF".repeat(pr.intensity)})</span></span>
                    : <span className="text-stone-600 italic">priority unknown</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5 mb-4">
          {DEMANDS.map(d => {
            const on = chosen.includes(d.id);
            const blocked = !on && full;
            const conflict = d.opposes && chosen.includes(d.opposes);
            return (
              <button
                key={d.id}
                disabled={blocked}
                onClick={() => toggle(d.id)}
                className={`w-full text-left border-2 px-3 py-2 transition-colors ${
                  on ? "border-amber-500 bg-amber-950/30" : blocked ? "border-stone-800 opacity-35 cursor-not-allowed" : "border-stone-700 hover:bg-stone-800/60"}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-stencil text-base tracking-wide text-stone-100">{d.label}</span>
                  <span className="flex items-center gap-1.5">
                    {proven.includes(d.id) && (
                      <span className="text-[10px] font-bold px-1 border border-teal-600 text-teal-400" title={`Won in the first contract. +${PROVEN_BONUS} with every bloc, because it exists in writing.`}>
                        IN WRITING +{PROVEN_BONUS}
                      </span>
                    )}
                    {BLOCS.map(b => {
                      const e = d.effect[b.id] || 0;
                      if (e === 0) return null;
                      return (
                        <span key={b.id} className="text-[10px] font-bold px-1 border"
                          style={{ borderColor: b.hex, color: e > 0 ? b.hex : "#f87171" }}
                          title={`${b.label} ${e > 0 ? "+" : ""}${e}`}>
                          {b.label[0]}{e > 0 ? "+" : ""}{e}
                        </span>
                      );
                    })}
                  </span>
                </div>
                <div className="text-xs text-stone-400 leading-snug mt-0.5">{d.desc}</div>
                {conflict && (
                  <div className="text-xs text-amber-400 leading-snug mt-0.5">
                    Directly against {DEMAND_BY_ID[d.opposes].label}. Taking both spends two slots to cancel yourself out.
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {anyDefecting.length > 0 && (
          <div className="border border-red-800 bg-red-950/30 px-3 py-2 mb-3 text-xs text-red-300">
            <span className="font-bold">{anyDefecting.map(b => b.label).join(" and ")} will walk.</span>{" "}
            A bloc below {DEFECT_THRESHOLD} stops counting and starts campaigning against you.{" "}
            {pledgesLeft > 0
              ? <>You can promise one group they are next, which softens the miss without buying any enthusiasm. Only one — a promise made to everybody is a promise to nobody.</>
              : <>You have already promised {BLOCS.find(b => priorities[b.id]?.pledged)?.label} they are next. There is nobody left to say it to who would believe it.</>}
            <div className="flex gap-2 mt-2 flex-wrap">
              {pledgesLeft > 0 && anyDefecting.map(b => (
                <button key={b.id} onClick={() => onPledge(b.id)}
                  className="border border-amber-700 text-amber-300 px-2 py-1 hover:bg-amber-950/40 transition-colors">
                  Pledge {b.label} next
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          disabled={!full}
          onClick={() => onAdopt(chosen)}
          className={`w-full font-stencil text-lg py-2.5 tracking-wide transition-colors ${
            full ? "bg-amber-500 hover:bg-amber-400 text-stone-950" : "bg-stone-800 text-stone-600 cursor-not-allowed"}`}
        >
          {revising
            ? (chosen.length < PLATFORM_SLOTS ? `PICK ${PLATFORM_SLOTS - chosen.length} MORE`
               : changes > 1 ? "THE SURVEY BOUGHT ONE CHANGE, NOT TWO"
               : changes === 0 ? "KEEP IT AS IT IS" : "ADOPT THE REVISION")
            : (full ? "ADOPT THIS PLATFORM" : `PICK ${PLATFORM_SLOTS - chosen.length} MORE`)}
        </button>
      </div>
    </div>
  );
}

function EscalationModal({ loc, turn, factor = 1, ballotCtx = null, onFile, onConsolidate, onPivot }) {
  const gates = filingGates(loc, turn);
  const eligible = gates.every(g => g.pass);
  const gap = loc.morale - (loc.trueSupport ?? loc.morale);
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 px-4">
      <div className="bg-stone-900 border-2 border-amber-500 max-w-lg w-full p-5 anim-rise">
        <div className="flex items-center gap-2 mb-1">
          <Vote size={18} className="text-amber-400" />
          <div className="font-stencil text-xl text-amber-400 tracking-wide">ESCALATION DECISION: {loc.name}</div>
        </div>
        <p className="text-sm text-stone-400 mb-4">Morale has crossed 70. Workers are ready to move — the question is whether you are. You will only be asked this once; after today the FILE control lives on the shop's own panel.</p>

        {/* The gates. Each one passes or it doesn't \u2014 no interpreting a number. */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3 text-xs">
          {gates.map(g => (
            <div key={g.label} className={`border p-2 text-center ${g.pass ? "border-teal-800 bg-teal-950/20" : "border-red-900 bg-red-950/20"}`}>
              <div className="text-stone-500">{g.label}</div>
              <div className={`font-bold text-base ${g.pass ? "text-teal-400" : "text-red-400"}`}>
                {g.pass ? "\u2713" : "\u2715"} {g.val}
              </div>
              <div className="text-[10px] text-stone-600">needs {g.req}</div>
            </div>
          ))}
        </div>

        {/* What filing actually buys, in numbers. */}
        <div className="mb-3 text-xs border border-stone-800 bg-stone-950/50 px-3 py-2">
          <div className="text-stone-500 font-bold tracking-wide mb-1">IF YOU FILE TODAY</div>
          <div className="text-stone-400 leading-relaxed">
            Vote lands in <span className="text-stone-200 font-bold">{ACT2_FILING_LEAD} months</span>, and every one of them
            costs <span className="text-amber-400 font-bold">{ACT2_CAMPAIGN_UPKEEP} actions a month</span> off the top just to keep the process
            running. Every worker in the unit gets one secret ballot, and it takes a majority of the ones actually cast.
            {loc.committee?.active
              ? (() => {
                  const odds = act2WinChance(loc, factor, ballotCtx);
                  const p = act2Projection(loc, factor, ballotCtx);
                  return <> At {loc.trueSupport} true support and {loc.fear} fear that projects
                    {" "}<span className="text-teal-400 font-bold">{p.yes} yes</span> to <span className="text-red-400 font-bold">{p.no} no</span>
                    {p.out > 0 && <span className="text-stone-500"> with {p.out} not voting</span>}, which carries
                    {" "}<span className={`font-bold ${odds >= 0.7 ? "text-teal-400" : odds >= 0.5 ? "text-amber-400" : "text-red-400"}`}>
                      {Math.round(odds * 100)}%
                    </span> of the time.</>;
                })()
              : <> You cannot project it: true support here is unknown, and the ballot rolls against that, not morale.</>}
          </div>
        </div>

        {/* The block above already quotes true support, fear and the odds. Restating them
            here was the same sentence twice. Only the no-committee case says anything the
            projection cannot: that there is no projection. */}
        {!loc.committee?.active && gap >= 12 ? (
          <div className="mb-4 text-xs border border-amber-800 bg-amber-950/30 text-amber-300 px-3 py-2">
            {/* The line above already says it cannot be projected. This adds the one
                thing it does not: how big the hole is. */}
            Morale reads {loc.morale}. The number the vote actually uses could be as low as {Math.max(0, loc.morale - 25)}.
          </div>
        ) : null}

        <div className="space-y-2">
          <button
            onClick={onFile}
            disabled={!eligible}
            className={`w-full text-left border-2 p-3 transition-colors ${eligible ? "border-teal-600 hover:bg-teal-950/40" : "border-stone-800 opacity-40 cursor-not-allowed"}`}
          >
            <div className="font-stencil text-base text-teal-400">FILE FOR UNION ELECTION</div>
            <div className="text-xs text-stone-400">Go for the win now. Triggers a {ACT2_FILING_LEAD}-month NLRB and campaign period, during which the employer campaigns against you every month. {!eligible && "Blocked: one of the gates above is red."}</div>
          </button>
          <button onClick={onConsolidate} className="w-full text-left border-2 border-amber-700 hover:bg-amber-950/40 p-3 transition-colors">
            <div className="font-stencil text-base text-amber-400">CONSOLIDATE & KEEP ORGANIZING</div>
            <div className="text-xs text-stone-400">Hold here, build strength at other sites, escalate multiple locations together. Morale here will decay slowly if neglected. You can file from the shop's panel any later week.</div>
          </button>
          <button onClick={onPivot} className="w-full text-left border-2 border-stone-700 hover:bg-stone-800/60 p-3 transition-colors">
            <div className="font-stencil text-base text-stone-300">PIVOT AWAY</div>
            <div className="text-xs text-stone-400">Deprioritize this site for now and refocus the organizer elsewhere.</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export { FeedbackControls, Act2NetworkMap, LocationActionModal, PlatformModal, EscalationModal };
