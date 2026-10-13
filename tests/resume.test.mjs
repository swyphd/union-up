// A resumed run plays exactly like one that was never closed. The engine is the game's
// own (src/engine/act1, through sim/engine.mjs); the round trip is the one the save does.
import { suite, test, ok, deepEq } from '../src/kit/test/harness.js';
import { seedRng } from '../src/engine/rng.js';
import * as E from '../sim/engine.mjs';
import { planWeekMapper } from '../sim/policy.mjs';
import { roundTrip, snapshotOf } from '../src/runSave.js';

const C = E.C;
const WEEKS = 22;

// What ActOneGame saves, and the game it rebuilds from a save.
function save(G) {
  return roundTrip(snapshotOf('shop', { ...G, phase: 'plan', planEntries: [] }));
}
function load(s, tally) {
  return {
    workers: s.workers, social: s.social, influence: s.social.influence, week: s.week, heat: s.heat,
    stage: s.stage, consultant: s.consultant, perks: s.perks, outsiders: s.outsiders, campaign: s.campaign,
    filedWeek: s.filedWeek, electionWeek: s.electionWeek, ballot: null, tally,
  };
}

// Plays a seeded run, saving and loading at the weeks listed. Files once the cards are in.
function play(seed, reloadAt = []) {
  seedRng(seed);
  let G = E.newGame();
  for (let i = 0; i < WEEKS && !G.ballot; i++) {
    if (reloadAt.includes(G.week)) G = load(save(G), G.tally);
    if (G.stage === 'drive' && G.workers.filter(x => x.signed).length >= C.ACT1_CARDS_NEEDED + 1) G = E.file(G);
    G = E.resolveWeek(G, planWeekMapper(G, {}));
  }
  seedRng(null);
  return G;
}
// Compared with keys sorted: a field the save dropped as undefined comes back later in a
// different place in the object, which is the same state written in a different order.
const canon = (x) => Array.isArray(x) ? x.map(canon)
  : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canon(x[k])])) : x;
const outcome = (G) => canon(roundTrip({ week: G.week, workers: G.workers, social: G.social, heat: G.heat, campaign: G.campaign, ballot: G.ballot, consultant: G.consultant, perks: G.perks, outsiders: G.outsiders }));

suite('resuming Act One', () => {
  for (const seed of [7, 21, 404]) {
    test(`seed ${seed}: closing and reopening every few weeks changes nothing`, () => {
      deepEq(outcome(play(seed, [2, 5, 9, 13, 17, 20])), outcome(play(seed)));
    });
  }

  test('the runs above get far enough to mean something (cards signed, weeks played)', () => {
    const G = play(7);
    ok(G.week > 10, `only reached week ${G.week}`);
    ok(G.workers.some(x => x.signed), 'nobody signed');
  });

  test('a week saved mid-playback commits the same result it would have', () => {
    seedRng(11);
    let G = E.newGame();
    for (let i = 0; i < 6; i++) G = E.resolveWeek(G, planWeekMapper(G, {}));
    const { pending } = C.resolveWeek(G, planWeekMapper(G, {}));
    seedRng(null);
    deepEq(roundTrip(pending), JSON.parse(JSON.stringify(pending)));
    // Everything the commit reads survives the trip.
    const back = roundTrip(pending);
    for (const k of ['workers', 'heat', 'consultant', 'outsidersNext', 'perksNext', 'social', 'campaign']) {
      ok(k in back, `pending.${k} lost in the save`);
    }
  });
});
