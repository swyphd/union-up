// One source of randomness for the whole game, so a run can be replayed.
//
// Everything in the engine draws from `random()` rather than `Math.random()`. Unseeded it
// is Math.random, which is what the shipped game wants. `seedRng(n)` swaps in a small
// deterministic generator (mulberry32), which is what the sim wants: two runs with the
// same seed and the same plans produce the same floor, week for week, so a refactor can
// be checked by diffing output rather than by squinting at win rates.
let source = Math.random;

function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedRng(seed) {
  source = seed == null ? Math.random : mulberry32(Number(seed) >>> 0);
}
export const random = () => source();
export const rand = (n) => Math.floor(random() * n);
export const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
