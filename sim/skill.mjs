import { playGame } from './run.mjs';
import { applyRules, RULESETS } from './rules.mjs';
const N = Number(process.argv[2] || 400), BAR = 74;
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const run = (opts) => { const rs = []; for (let i = 0; i < N; i++) rs.push(playGame(opts)); return rs; };
const pad = (s, n) => String(s).padEnd(n);

const POLICIES = {
  careful: { askBar: BAR },
  sloppy:  { askBar: BAR, blindDeep: true },
  noPublic:{ askBar: BAR, noPublic: true },
};
console.log(`n=${N} per cell\n`);
console.log(pad('ruleset', 13) + Object.keys(POLICIES).map(k => pad(k + ' won%', 14)).join('') + 'careful−sloppy');
for (const name of Object.keys(RULESETS)) {
  applyRules(name);
  const out = {}; const extra = {};
  for (const [pn, po] of Object.entries(POLICIES)) {
    const rs = run(po);
    out[pn] = 100 * rs.filter(r => r.won).length / N;
    extra[pn] = mean(rs.map(r => r.misfires));
  }
  console.log(pad(name, 13) + Object.keys(POLICIES).map(k => pad(out[k].toFixed(1) + ` (mf ${extra[k].toFixed(1)})`, 14)).join('')
    + (out.careful - out.sloppy).toFixed(1));
}
console.log('\nmf = misfired deep talks per game. noPublic = careful player who never goes public.');
