// Mapper variants against careful, same seed, same n.
import './seed.mjs';
import { playGame } from './run.mjs';
const N = Number(process.argv[2] || 800);
const rows = {
  careful: { askBar: 74 },
  'mapper (coverage)': { askBar: 74, mapper: true },
  'mapper recruits all': { askBar: 74, mapper: true, recruit: 'all' },
  'mapper recruits 5s': { askBar: 74, mapper: true, recruit: 'fives' },
  'patient mapper': { askBar: 74, mapper: true, askAt: 78 },
};
for (const [name, o] of Object.entries(rows)) {
  let won = 0, filed = 0, wk = 0, com = 0;
  for (let i = 0; i < N; i++) { const r = playGame(o); won += r.won; filed += !!r.ballot; wk += r.filedOn || 0; com += r.committee; }
  console.log(name.padEnd(16), (100 * won / N).toFixed(1).padStart(5) + '%', 'filed', (100 * filed / N).toFixed(0) + '%', 'mean filing wk', (wk / Math.max(1, filed)).toFixed(1), 'committee at end', (com / N).toFixed(1));
}
