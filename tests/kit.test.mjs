// The pieces of the studio kit Union Up now runs on: randomness, lessons, analytics.
import { suite, test, ok, eq, deepEq } from '../src/kit/test/harness.js';
import { checkSteps } from '../src/kit/tutorial.js';
import { mulberry32 } from '../src/kit/rng.js';
import { seedRng, random, rand } from '../src/engine/rng.js';
import { LESSONS, LESSONS_DONE, LESSON_STEPS, createLessons, nextLesson, openActions } from '../src/ui/act1/lessons.js';
import { stats } from '../src/stats.js';
import * as E from '../sim/engine.mjs';
import { planWeekMapper } from '../sim/policy.mjs';

suite('randomness on the kit', () => {
  test('SEED=7 draws exactly what the old seedRng drew', () => {
    const old = mulberry32(7);
    seedRng('7');
    for (let i = 0; i < 1000; i++) eq(random(), old());
    seedRng(null);
  });
  test('rand(n) stays an integer under n', () => {
    seedRng(3);
    for (let i = 0; i < 500; i++) { const v = rand(6); ok(Number.isInteger(v) && v >= 0 && v < 6); }
    seedRng(null);
  });
  test('unseeded it is not stuck on one value', () => {
    seedRng(null);
    ok(new Set([random(), random(), random()]).size === 3);
  });
});

// The staircase as it was before the kit: the first lesson whose goal isn't met, kept
// at its highest.
function oldLesson(prev, workers, week) {
  let i = 0;
  while (i < LESSONS.length && LESSONS[i].progress(workers, week) >= LESSONS[i].need) i++;
  return Math.max(prev, i);
}

suite('lessons on the kit tutorial engine', () => {
  test('open the same lesson, week for week, as the old staircase', () => {
    for (const seed of [7, 21, 404, 9001]) {
      seedRng(seed);
      let G = E.newGame();
      const lessons = createLessons();
      let mine = 0, theirs = 0;
      for (let i = 0; i < 20 && !G.ballot; i++) {
        G = E.resolveWeek(G, planWeekMapper(G, {}));
        mine = nextLesson(lessons, G.workers, G.week);
        theirs = oldLesson(theirs, G.workers, G.week);
        eq(mine, theirs, `seed ${seed}, week ${G.week}: lesson ${mine}, was ${theirs}`);
      }
      seedRng(null);
      ok(mine >= 2, `seed ${seed} only reached lesson ${mine}`);
    }
  });
  test('a resumed staircase picks up at the saved lesson', () => {
    const l = createLessons({ lesson: 2 });
    eq(l.index, 2);
    eq(l.status, 'active');
    eq(createLessons({ lesson: LESSONS_DONE }).status, 'done');
  });
  test('turning the lessons off stops them moving', () => {
    seedRng(7);
    let G = E.newGame();
    const l = createLessons({ off: true });
    for (let i = 0; i < 8; i++) { G = E.resolveWeek(G, planWeekMapper(G, {})); nextLesson(l, G.workers, G.week); }
    seedRng(null);
    eq(l.index, 0);
    eq(l.status, 'skipped');
  });
  test('every action is open once the staircase is done', () => {
    eq(openActions(LESSONS_DONE), null);
    ok(openActions(0).has('quick') && !openActions(0).has('deep'));
  });
  test("keeps to the kit's tutorial rules, apart from the run of goals", () => {
    // Four goals in a row is one more than the kit likes. Each one opens a different
    // action, so they can't be merged without opening everything at once; the run is
    // allowed here and nothing else is.
    deepEq(checkSteps(LESSON_STEPS, { maxInARow: LESSON_STEPS.length }), []);
  });
});

suite('analytics', () => {
  const calls = [];
  const fake = {
    run: null,
    runStart(props, opts) { this.run = opts?.resume || 'r1'; calls.push(['runStart', props, opts]); return this.run; },
    runEnd(outcome, props) { calls.push(['runEnd', outcome, props]); this.run = null; },
    milestone(name, props) { calls.push(['milestone', name, props]); },
    choice(id, option, props) { calls.push(['choice', id, option, props]); },
    progress() {},
  };
  test('passes runs, milestones and choices to the kit', () => {
    stats._use(fake);
    stats.runStart({ act: 'shop' });
    eq(stats.run, 'r1');
    stats.milestone('week', { week: 1 });
    stats.choice('lessons', 'off', { lesson: 1 });
    stats.runEnd('loss', { act: 'shop' });
    deepEq(calls.map(c => c[0]), ['runStart', 'milestone', 'choice', 'runEnd']);
  });
  test('a resumed run keeps its id', () => {
    calls.length = 0;
    stats.runStart({ act: 'contract' }, { resume: 'saved-run' });
    eq(stats.run, 'saved-run');
  });
  test('a playtest skip sends nothing', () => {
    calls.length = 0;
    stats.mute(true);
    stats.milestone('week', { week: 3 });
    stats.runEnd('win', {});
    eq(calls.length, 0);
    stats.mute(false);
  });
  test('an analytics failure never reaches the game', () => {
    stats._use({ milestone() { throw new Error('offline'); } });
    stats.milestone('week', {});
    stats.runEnd('loss');
  });
});
