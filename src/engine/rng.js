// One source of randomness for the whole game, so a run can be replayed.
//
// Everything in the engine draws from `random()` rather than `Math.random()`. The source
// is the studio kit's seeded generator (src/kit/rng.js), which began as this file.
// Unseeded it is Math.random, which is what the shipped game wants. `seedRng(n)` switches
// it to mulberry32, which is what the sim wants: two runs with the same seed and the same
// plans produce the same floor, week for week, so a refactor can be checked by diffing
// output rather than by squinting at win rates.
import { createRng, clamp } from "../kit/rng.js";

export const rng = createRng();

// SEED arrives from the environment as a string; it has always meant the number, so it
// is converted here rather than hashed as text, and old SEED= output stays the same.
export function seedRng(seed) {
  rng.seed(seed == null ? null : Number(seed) >>> 0);
}
export const random = () => rng.random();
export const rand = (n) => rng.int(n);
export { clamp };
