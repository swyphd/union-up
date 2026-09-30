// SEED=123 node sim/verify-ballot.mjs   -> a replayable run. Unset, the sim is as random
// as the game. Imported first by every driver so the seed is set before any roll.
import { seedRng } from '../src/engine/rng.js';
if (process.env.SEED != null && process.env.SEED !== '') seedRng(process.env.SEED);
