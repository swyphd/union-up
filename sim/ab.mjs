import { playGame } from './run.mjs';
import { applyRules, RULESETS } from './rules.mjs';

const N = Number(process.argv[2] || 400);
const BAR = Number(process.argv[3] || 74);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);

console.log(`n=${N} per ruleset, askBar=${BAR}\n`);
const rows = [];
for (const name of Object.keys(RULESETS)) {
  applyRules(name);
  const rs = []; for (let i = 0; i < N; i++) rs.push(playGame({ askBar: BAR }));
  const filed = rs.filter(r => r.filedOn != null);
  rows.push({
    name,
    won: 100 * rs.filter(r => r.won).length / N,
    filed: 100 * filed.length / N,
    wkThresh: filed.length ? med(filed.map(r => r.thresholdOn)) : null,
    signs: mean(rs.map(r => r.signs)),
    cttee: mean(rs.map(r => r.committee)),
    misfire: mean(rs.map(r => r.misfires)),
    burns: mean(rs.map(r => r.burns)),
    convo: mean(rs.map(r => r.convoGain)),
    pub: mean(rs.map(r => r.publicGain)),
    pas: mean(rs.map(r => r.passiveGain)),
    gap: mean(rs.map(r => r.statedMean - r.trueMean)),
  });
}
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('ruleset', 13) + pad('won%', 7) + pad('filed%', 8) + pad('wk@30%', 8) + pad('signs', 7)
  + pad('cttee', 7) + pad('convo', 8) + pad('public', 8) + pad('passive', 9) + 'stated-true');
for (const r of rows) {
  console.log(pad(r.name, 13) + pad(r.won.toFixed(1), 7) + pad(r.filed.toFixed(1), 8)
    + pad(r.wkThresh ?? '-', 8) + pad(r.signs.toFixed(1), 7) + pad(r.cttee.toFixed(1), 7)
    + pad(r.convo.toFixed(0), 8) + pad(r.pub.toFixed(0), 8) + pad(r.pas.toFixed(0), 9)
    + r.gap.toFixed(1));
}
