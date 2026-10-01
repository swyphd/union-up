// Fuzz: random and adversarial plans against the real resolveWeek, with invariants checked
// every week (ranges, friendships symmetric and at most three, influence in step with the
// friendships, a booked move that makes sense, no mutation of the state it was handed).
//   SEED=7 node sim/fuzz.mjs [games]   prints "no problems" when clean.
import './seed.mjs';
import * as E from './engine.mjs';
import * as C from '../src/engine/act1/index.js';
import { planWeekMapper, planWeekPhase2 } from './policy.mjs';
const N = Number(process.argv[2] || 300);
const problems = {};
const bad = (k, detail) => { if (!problems[k]) problems[k] = { n: 0, detail }; problems[k].n++; };
const TYPES = Object.keys(C.ACT1_ACTION);
const teams = Object.keys(C.TEAM_LABEL);
function randomPlan(G) {
  const w = G.workers, plan = [];
  const pick = (a) => a[Math.floor(C.random() * a.length)];
  const n = 1 + Math.floor(C.random() * 12);
  for (let i = 0; i < n; i++) {
    const type = pick(TYPES);
    const actor = pick(w), target = pick(w);
    const e = { actorId: C.random() < 0.9 ? actor.id : 999, type, targetId: C.random() < 0.9 ? target.id : 999 };
    if (type === 'inoculate') { e.targetId = null; if (C.random() < 0.5) e.team = pick(teams); else e.circle = pick(C.CIRCLES).id; }
    if (type === 'turnout') { e.targetId = null; e.tier = pick(['button', 'letter', 'walkin', 'bogus']); }
    plan.push(e);
  }
  return plan;
}
function snapshotDeep(x) { return JSON.stringify(x); }
function check(G, before, label) {
  const w = G.workers;
  w.forEach(x => {
    for (const k of ['support', 'trueSupport', 'fulfillment', 'experience']) {
      const v = x[k];
      if (v != null && (Number.isNaN(v) || v < 0 || v > 100)) bad(`${k} out of range`, `${label} ${x.name} ${k}=${v}`);
    }
    if (x.fear != null && (x.fear < 0 || x.fear > 3 || Number.isNaN(x.fear))) bad('fear out of range', `${x.name} ${x.fear}`);
    if (x.organizer && x.burned) bad('organizer and burned', x.name);
    if (x.leak && !x.organizer) bad('leak flag on non-organizer', x.name);
    if (x.trueKnown && x.trueKnownWeek == null) bad('trueKnown without week', x.name);
    if ((x.knownFriends || []).includes(x.id)) bad('self in knownFriends', x.name);
    if (new Set(x.knownFriends || []).size !== (x.knownFriends || []).length) bad('duplicate knownFriends', x.name);
  });
  const fr = G.social.friends;
  Object.entries(fr).forEach(([a, list]) => {
    if (list.length > 3) bad('more than 3 friends', `${a}: ${list}`);
    list.forEach(b => { if (!(fr[b] || []).includes(Number(a))) bad('asymmetric friendship', `${a}-${b}`); if (b === Number(a)) bad('self friendship', a); });
    if (new Set(list).size !== list.length) bad('duplicate friendship', `${a}: ${list}`);
  });
  // influence must equal the map derived from friends/circles/bought
  const derived = C.influenceFrom(G.social.friends, G.social.circleOf, w, G.social.bought || {});
  if (JSON.stringify(derived) !== JSON.stringify(G.social.influence)) bad('influence stale vs friendships', label);
  if (G.influence !== G.social.influence) bad('G.influence not social.influence', label);
  if (G.heat < 0 || G.heat > 100 || Number.isNaN(G.heat)) bad('heat out of range', G.heat);
  const c = G.campaign;
  if (G.stage === 'campaign' && G.week <= G.electionWeek && !c?.next) bad('campaign without next move', `week ${G.week}`);
  if (c?.next) {
    const m = c.next;
    if (m.kind === 'meeting' && !teams.includes(m.team)) bad('meeting on bad team', m.team);
    if (m.kind === 'perk' && !C.CIRCLE_BY_ID[m.circle]) bad('perk on bad circle', m.circle);
    if ((m.kind === 'threat' || m.kind === 'raise') && !w.find(x => x.id === m.targetId)) bad('move target missing', m);
    if (m.kind === 'threat' && !w.find(x => x.id === m.targetId)?.organizer) bad('threat booked on non-organizer', `${m.targetId}`);
  }
  for (const k of ['perks', 'threats', 'raises', 'rumors']) if ((G.consultant[k] || 0) > C.CONSULTANT_MAX_EACH) bad(`consultant ${k} over max`, G.consultant[k]);
  // perks list and bought crowds
  Object.entries(G.social.bought || {}).forEach(([cid, until]) => { if (until < G.week - 1) bad('bought crowd past its expiry', `${cid} until ${until} at week ${G.week}`); });
}
let games = 0;
for (let g = 0; g < N; g++) {
  let G = E.newGame();
  const mode = g % 3; // 0 random plans, 1 mapper+counter, 2 mixed
  for (let i = 0; i < 40; i++) {
    const signed = G.workers.filter(x => x.signed).length;
    if (G.stage === 'drive' && signed >= C.ACT1_CARDS_NEEDED + 1) G = E.file(G);
    let plan;
    if (mode === 0) plan = randomPlan(G);
    else if (mode === 1) plan = G.stage === 'campaign' ? planWeekPhase2(G, { askBar: 74, mapper: true, phase2: 'counter' }) : planWeekMapper(G, { askBar: 74 });
    else plan = [...(G.stage === 'campaign' ? planWeekPhase2(G, { phase2: 'counter' }) : planWeekMapper(G, {})), ...randomPlan(G).slice(0, 3)];
    const frozen = snapshotDeep({ w: G.workers, s: G.social, c: G.campaign, k: G.consultant, p: G.perks });
    let next;
    try { next = E.resolveWeek(G, plan); }
    catch (e) { bad('THROW ' + e.message.slice(0, 80), e.stack.split('\n').slice(0, 3).join(' | ')); break; }
    if (snapshotDeep({ w: G.workers, s: G.social, c: G.campaign, k: G.consultant, p: G.perks }) !== frozen) bad('resolveWeek mutated its input', `mode ${mode} week ${G.week}`);
    G = next;
    check(G, null, `mode ${mode} week ${G.week}`);
    if (G.ballot) break;
  }
  games++;
}
console.log(`${games} games fuzzed`);
const keys = Object.keys(problems);
if (!keys.length) console.log('no problems');
keys.forEach(k => console.log(`${problems[k].n}x ${k} :: ${typeof problems[k].detail === 'string' ? problems[k].detail : JSON.stringify(problems[k].detail)}`));
