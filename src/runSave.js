// The mid-act save: where the run stood the last time anything changed, inside whichever
// act it was in. It sits beside the act-boundary save in save.js (which this file leaves
// alone) and is written through the studio kit's local save.
//
// One slot, holding one act: { act, ctx, state }.
//   act    "shop", "contract" or "company"
//   ctx    what App handed that act: the Act One floor going into the contract, the
//          leaders and contract result going into the company campaign
//   state  the act's own snapshot, from its snapshot function below
//
// Nothing here rerolls a week. Act One and the company campaign compute a week before
// they play it back, so a snapshot taken during the playback carries the computed result
// as `pending`, and resuming applies it: closing the tab on a bad week does not undo it.
// Playtest skips never write here.
import { createLocalSave } from "./kit/index.js";

export const RUN_SAVE_KEY = "union-up-run";
export const RUN_SAVE_VERSION = 1;
export const ACTS = ["shop", "contract", "company"];

export function createRunSave(opts = {}) {
  return createLocalSave({ key: RUN_SAVE_KEY, version: RUN_SAVE_VERSION, ...opts });
}

// A run is only worth offering if it names an act and carries that act's state.
export function validRun(run) {
  return !!run && ACTS.includes(run.act) && !!run.state && typeof run.state === "object";
}

// JSON drops undefined and turns non-finite numbers into null; everything an act keeps is
// plain data, so a snapshot that survives this is one that will load.
export const roundTrip = (x) => JSON.parse(JSON.stringify(x));

// The fields of each act that make up a resume. Anything not listed (what's selected,
// which panel is open, the playback steps) starts fresh, which is what a reload should do.
export const ACT1_FIELDS = [
  "week", "phase", "social", "workers", "planEntries", "heat", "consultant", "perks", "outsiders",
  "campaign", "boardView", "wonOnWeek", "stage", "filedWeek", "electionWeek", "voteResult",
  "showFilePrompt", "mapGrewWeek", "mapNagWeek", "showMapNag", "tipsSeen", "sawFilePrompt",
  "lesson", "lessonWeek", "lessonsOff", "pending",
];
export const CONTRACT_FIELDS = [
  "floor", "workers", "turn", "phase", "leverage", "issues", "planEntries", "actionPlan", "result",
  "ratification", "decert", "rungUses", "stall", "dead", "lastVoteMonth",
];
export const COMPANY_FIELDS = [
  "leaderDeployment", "turn", "phase", "rosters", "locations", "allocations", "responses", "organizer",
  "platform", "surveyPlanned", "surveyDone", "platformOpen", "blocPriorities", "pendingFileLoc",
  "moraleClimate", "legalClimate", "employerSophistication", "employerEmboldened", "escalationTarget",
  "escalationSeen", "deadReason", "pending",
];
const FIELDS = { shop: ACT1_FIELDS, contract: CONTRACT_FIELDS, company: COMPANY_FIELDS };

// Picks an act's fields out of everything it has, so the snapshot is the same shape
// whatever the component happened to pass.
export function snapshotOf(act, values) {
  const out = {};
  for (const k of FIELDS[act]) out[k] = values[k] === undefined ? null : values[k];
  return out;
}

// The phase a resume opens on. A week caught mid-playback opens on planning, with its
// result applied as soon as the act mounts (see `pending` above).
export function resumePhase(act, phase) {
  if (phase === "resolving") return act === "company" ? "allocate" : "plan";
  return phase;
}

// The next plan-entry key after the ones already in a restored plan.
export const nextPlanKey = (entries) => (entries || []).reduce((m, e) => Math.max(m, e.key || 0), 0);

// What the welcome-back screen calls a run in progress.
export function describeRun(run) {
  if (!validRun(run)) return null;
  const s = run.state;
  if (run.act === "shop") return `week ${s.week} of organizing the shop`;
  if (run.act === "contract") return `month ${s.turn} of bargaining the first contract`;
  return `month ${s.turn} of the company campaign`;
}
