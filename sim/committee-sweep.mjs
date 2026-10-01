// M3's question: does a committee built for coverage beat one that takes everybody? Sweeps
// the two weekly costs (size heat, leak heat) and the odds that a 4 leaks.
import './seed.mjs';
import * as C from '../src/engine/act1/index.js';
import { playGame } from './run.mjs';
const N = Number(process.argv[2] || 500);
const grid = [
  { sizeHeat: 1, leakHeat: 2, leak4: 0.4, tip: 0.2, sizeLeak: 0.12 },
  { sizeHeat: 1, leakHeat: 3, leak4: 0.4, tip: 0.2, sizeLeak: 0.15 },
];
const play = (o) => { let won = 0, com = 0, leaks = 0, tips = 0; for (let i = 0; i < N; i++) { const r = playGame(o); won += r.won; com += r.committee; leaks += r.leaksJoined || 0; tips += r.tipped || 0; } return [(100 * won / N).toFixed(1), (com / N).toFixed(1), 'L' + (leaks / N).toFixed(1), 'T' + (tips / N).toFixed(1)]; };
console.log('sizeHeat leakHeat leak4 tip | coverage (won, size, leaks, tips) | all | fives | careful');
for (const g of grid) {
  C.COMMITTEE_TUNING.sizeHeat = g.sizeHeat; C.COMMITTEE_TUNING.leakHeat = g.leakHeat; C.LEAK_CHANCE[4] = g.leak4; C.COMMITTEE_TUNING.tipAsk = g.tip; C.COMMITTEE_TUNING.sizeLeak = g.sizeLeak;
  const base = { askBar: 74 };
  const cov = play({ ...base, mapper: true }), all = play({ ...base, mapper: true, recruit: 'all' }), fives = play({ ...base, mapper: true, recruit: 'fives' }), car = play(base);
  console.log(`${g.sizeHeat} ${g.leakHeat} ${g.leak4} ${g.tip} ${g.sizeLeak} | ${cov.join(' ')} | ${all.join(' ')} | ${fives.join(' ')} | ${car.join(' ')}`);
}
