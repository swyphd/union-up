// Mapper variants against careful, same seed, same n.
import './seed.mjs';
import { playGame } from './run.mjs';
const N = Number(process.argv[2] || 800);
const rows = {
  careful: { askBar: 74, pubPhase: 'campaign' },
  'mapper ask74': { askBar: 74, pubPhase: 'campaign', mapper: true, askAt: 74 },
  'mapper ask78': { askBar: 74, pubPhase: 'campaign', mapper: true, askAt: 78 },
  'mapper ask74 hub0': { askBar: 74, pubPhase: 'campaign', mapper: true, askAt: 74, hubWeight: 0 },
  'mapper ask74 hub40': { askBar: 74, pubPhase: 'campaign', mapper: true, askAt: 74, hubWeight: 40 },
};
for (const [name, o] of Object.entries(rows)) {
  let won = 0, filed = 0, wk = 0;
  for (let i = 0; i < N; i++) { const r = playGame(o); won += r.won; filed += !!r.ballot; wk += r.filedOn || 0; }
  console.log(name.padEnd(16), (100 * won / N).toFixed(1).padStart(5) + '%', 'filed', (100 * filed / N).toFixed(0) + '%', 'mean filing wk', (wk / Math.max(1, filed)).toFixed(1));
}
