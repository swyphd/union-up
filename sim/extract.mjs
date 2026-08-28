// Pull the game's own pure math out of App.jsx so the sim can't drift from it.
import fs from 'fs';
const src = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

// grab from the first line that starts `marker` up to (not including) `until`
function block(marker, until) {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('missing: ' + marker);
  const j = src.indexOf(until, i);
  if (j < 0) throw new Error('missing end for: ' + marker + ' -> ' + until);
  return src.slice(i, j);
}

const parts = [
  'const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));',
  'const rand = (n) => Math.floor(Math.random() * n);',
  (() => { const i = src.indexOf('const ACT1_WORKERS_SEED = ['); const j = src.indexOf('\n];', i); return src.slice(i, j + 3); })(),
  block('function generateInfluence', 'function makeAct1Workers'),
  block('const ORG_TIERS = [', '// ---------- INFLUENCE TRAITS'),
  block('const INFLUENCE_TRAITS = [', '// ---------- COMMON GROUND, DRAWN'),
  block('const AFFINITY_POOL = [', '// ---------- SYMBOLS, NOT SENTENCES'),
  block('function makeAct1Workers', '// ---------- THE COMMITTEE DEVELOPS'),
  block('function holdsFast', 'const ACT1_TOTAL_WORKERS'),
  block('const KIRKMAN_SIGHT', '// ---------- THE OUTSIDER LADDER'),
  block('// A secret ballot is decided by', 'function recognitionChance'),
  block('const OUTSIDERS = [', '// ---------- CAN ACT ONE STILL BE WON?'),
];
let out = parts.join('\n\n');
// any small component that shares a section with the math gets dropped
out = out.replace(/\nfunction [A-Z]\w*\([\s\S]*?\n}\n/g, '\n');


// constants the sim needs that live elsewhere in the file
for (const name of ['ACT1_CARD_THRESHOLD','ACT1_HOURS_PER_ORGANIZER','ACT1_RECRUIT_REQ','EDGE_MIN_DRAW',
                    'ASSUMED_INFLUENCE','XP_PER_ACTION','XP_PER_CARD','IDLE_GRACE','IDLE_QUIT',
                    'CARD_LIFESPAN','ACT1_SHIP_WEEK','ACT1_PUBLIC_UNLOCK_WEEK','ELECTION_WEEKS',
                    'CONSULTANT_TRIGGER_COMMITTEE','CONSULTANT_SETPIECE_GAP','CONSULTANT_MAX_EACH',
                    'PERK_WEEKS','CONSULTANT_FIRM','TEAM_LABEL']) {
  if (new RegExp('^(const|let) ' + name + '\\b', 'm').test(out)) continue;   // already came in with a block
  const m = src.match(new RegExp('^const ' + name + ' = [^;]+;', 'm'));
  if (!m) throw new Error('constant not found: ' + name);
  out += '\n' + m[0];
}
out = out.replace(/\bconst ACT1_TOTAL_WORKERS[\s\S]*?;\n/, '');
out += `
const ACT1_TOTAL_WORKERS = ACT1_WORKERS_SEED.length;
const ACT1_CARDS_NEEDED = Math.ceil(ACT1_TOTAL_WORKERS * ACT1_CARD_THRESHOLD);
export { ACT1_WORKERS_SEED, ACT1_CARDS_NEEDED, ACT1_TOTAL_WORKERS, ACT1_ACTION, ACT1_HOURS_PER_ORGANIZER,
  ACT1_RECRUIT_REQ, ACT1_PUBLIC_UNLOCK_WEEK, EDGE_MIN_DRAW, XP_PER_ACTION, XP_PER_CARD,
  IDLE_GRACE, IDLE_QUIT, CARD_LIFESPAN, ACT1_SHIP_WEEK, KIRKMAN_SIGHT,
  CONSULTANT_TRIGGER_COMMITTEE, CONSULTANT_SETPIECE_GAP, CONSULTANT_MAX_EACH,
  AFFINITY_POOL, AFF_BY_ID, affList, knownAff, isPoisoned, sharedAffinities, visibleShared,   complacencyMult, CONVO_BASE, TRUE_RATIO, convoGain, misfireChance, revealCount, revealAffinities,
  PUBLIC_TIERS, publicFatigue, publicGain, signChance, infTrait, senderMult, recvMult, holdsFast,
  ORG_TIERS, orgTier, orgMult, committeeHours, idlePenalty, makeAct1Workers, generateInfluence,
  infOn, outgoingTies, incomingTies, influenceKnown, shownInfluence, signedBacking, orgChartResistance,
  clamp, rand, readOf, floorClarity, tieOn, tieFrom, tieBonus, turnoutChance, yesChance, voteProjection, OUTSIDERS, PERK_WEEKS,
  poisonedAff, TEAM_LABEL, ACT1_CARD_THRESHOLD, ELECTION_WEEKS };
`;
fs.writeFileSync(new URL('core.mjs', import.meta.url), out);
console.log('core.mjs written,', out.split('\n').length, 'lines');
