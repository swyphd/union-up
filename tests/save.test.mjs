// The mid-act save itself: what goes in, what comes back, what the welcome-back screen says.
import { suite, test, ok, eq, deepEq } from '../src/kit/test/harness.js';
import { ACT1_FIELDS, COMPANY_FIELDS, CONTRACT_FIELDS, RUN_SAVE_KEY, createRunSave, describeRun, nextPlanKey, resumePhase, roundTrip, snapshotOf, validRun } from '../src/runSave.js';
import { ACT1_SAVE_KEY } from '../src/save.js';

// A browser's localStorage, enough of it for the kit's local save.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

suite('mid-act save', () => {
  test('keeps its own key, apart from the act-boundary save', () => {
    ok(RUN_SAVE_KEY !== ACT1_SAVE_KEY);
  });

  test('a written run loads back as written', () => {
    store.clear();
    const save = createRunSave();
    const run = { act: 'contract', ctx: { act1: { leaders: [{ name: 'Ana', trait: 'x' }] }, contract: null }, state: { turn: 4, phase: 'plan' } };
    ok(save.write(run));
    deepEq(createRunSave().load(), run);
  });

  test('clearing it leaves the act-boundary save alone', () => {
    store.clear();
    store.set(ACT1_SAVE_KEY, '{"v":3}');
    const save = createRunSave();
    save.write({ act: 'shop', ctx: null, state: { week: 2 } });
    save.clear();
    eq(save.load(), null);
    eq(store.get(ACT1_SAVE_KEY), '{"v":3}');
  });

  test('a save from some other version is not offered', () => {
    store.clear();
    store.set(RUN_SAVE_KEY, JSON.stringify({ v: 99, at: 1, data: { act: 'shop', state: { week: 3 } } }));
    eq(createRunSave().load(), null);
  });

  test('a garbled save is not offered', () => {
    store.clear();
    store.set(RUN_SAVE_KEY, '{not json');
    eq(createRunSave().load(), null);
    ok(!validRun(null));
    ok(!validRun({ act: 'lobby', state: {} }));
    ok(!validRun({ act: 'shop' }));
    ok(validRun({ act: 'shop', state: { week: 1 } }));
  });

  test('storage that throws (private mode) does not stop play', () => {
    const real = globalThis.localStorage;
    globalThis.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
    const save = createRunSave();
    eq(save.load(), null);
    eq(save.write({ act: 'shop', state: {} }), false);
    save.clear();
    globalThis.localStorage = real;
  });
});

suite('snapshots', () => {
  test('each act keeps exactly its listed fields, missing ones as null', () => {
    const s = snapshotOf('shop', { week: 5, extra: 'dropped', selectedWorker: 3 });
    deepEq(Object.keys(s), ACT1_FIELDS);
    eq(s.week, 5);
    eq(s.heat, null);
    deepEq(Object.keys(snapshotOf('contract', {})), CONTRACT_FIELDS);
    deepEq(Object.keys(snapshotOf('company', {})), COMPANY_FIELDS);
  });

  test('field order is fixed, so the save effect always has the same dependencies', () => {
    const a = Object.keys(snapshotOf('company', { turn: 1, phase: 'allocate' }));
    const b = Object.keys(snapshotOf('company', { phase: 'allocate', turn: 1 }));
    deepEq(a, b);
  });

  test('a week caught mid-playback reopens on planning', () => {
    eq(resumePhase('shop', 'resolving'), 'plan');
    eq(resumePhase('company', 'resolving'), 'allocate');
    eq(resumePhase('shop', 'victory'), 'victory');
    eq(resumePhase('contract', 'ratify'), 'ratify');
  });

  test('new plan entries never reuse a restored key', () => {
    eq(nextPlanKey([]), 0);
    eq(nextPlanKey(null), 0);
    eq(nextPlanKey([{ key: 3 }, { key: 11 }, { key: 7 }]), 11);
  });

  test('the welcome-back line names where the run stands', () => {
    eq(describeRun({ act: 'shop', state: { week: 9 } }), 'week 9 of organizing the shop');
    eq(describeRun({ act: 'contract', state: { turn: 4 } }), 'month 4 of bargaining the first contract');
    eq(describeRun({ act: 'company', state: { turn: 2 } }), 'month 2 of the company campaign');
    eq(describeRun(null), null);
  });

  test('round-tripping turns undefined into nothing and keeps everything else', () => {
    deepEq(roundTrip({ a: 1, b: undefined, c: [1, { d: null }] }), { a: 1, c: [1, { d: null }] });
  });
});
