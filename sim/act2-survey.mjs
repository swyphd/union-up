// Items 15 and 16: does the bargaining survey behave like a structure test, and is a
// signed first contract worth carrying?
import { playAct2 } from './act2-run.mjs';
const N = Number(process.argv[2] || 1500);
const pad = (s, n) => String(s).padEnd(n);
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const pctOf = (rs, f) => (100 * rs.filter(f).length / rs.length).toFixed(0);

console.log(`n=${N} per row, focus 3 shops.\n`);
console.log('THE BARGAINING SURVEY — the response rate is the measurement');
console.log(pad('when it goes out', 22) + pad('won%', 7) + pad('response', 10) + pad('strong', 8) + pad('thin', 7)
  + pad('dead', 7) + pad('revised', 9) + pad('defect%', 9) + 'committees by then');
for (const [name, opts] of Object.entries({
  'no survey':            { },
  'month 2 (too early)':  { survey: true, surveyTurn: 2 },
  'month 4':              { survey: true, surveyTurn: 4 },
  'month 6':              { survey: true, surveyTurn: 6 },
  'month 8 (late)':       { survey: true, surveyTurn: 8 },
})) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(playAct2({ focus: 3, ...opts }));
  const withRate = rs.filter(r => r.surveyRate != null);
  console.log(pad(name, 22) + pad(pctOf(rs, r => r.won), 7)
    + pad(withRate.length ? (100 * mean(withRate.map(r => r.surveyRate))).toFixed(0) + '%' : '-', 10)
    + pad(withRate.length ? pctOf(withRate, r => r.surveyTier === 'strong') + '%' : '-', 8)
    + pad(withRate.length ? pctOf(withRate, r => r.surveyTier === 'thin') + '%' : '-', 7)
    + pad(withRate.length ? pctOf(withRate, r => r.surveyTier === 'dead') + '%' : '-', 7)
    + pad(mean(rs.map(r => r.revisions)).toFixed(2), 9)
    + pad(pctOf(rs, r => r.defections > 0) + '%', 9)
    + mean(rs.map(r => r.committees)).toFixed(2));
}

console.log('\nA SIGNED FIRST CONTRACT — what it is worth at the next four shops');
console.log(pad('came in with', 30) + pad('won%', 7) + pad('proven', 8) + pad('elec win%', 11) + pad('mean p(win)', 13) + 'defect%');
const C = (ratified, tiers) => ({ ratified, issues: [
  { id: 'wages', tier: Math.min(2, tiers) },
  { id: 'justcause', tier: Math.min(2, Math.max(0, tiers - 2)) },
  { id: 'ai', tier: Math.min(2, Math.max(0, tiers - 4)) }] });
for (const [name, contract] of Object.entries({
  'nothing (skipped the act)':      null,
  'a year of talks, nothing signed': C(false, 3),
  'ratified, 2 of 6 tiers':          C(true, 2),
  'ratified, 4 of 6 tiers':          C(true, 4),
  'ratified, all 6 tiers':           C(true, 6),
})) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(playAct2({ focus: 3, survey: true, surveyTurn: 5, contract }));
  const els = rs.flatMap(r => r.elections);
  console.log(pad(name, 30) + pad(pctOf(rs, r => r.won), 7) + pad(rs[0].proven.length, 8)
    + pad(pctOf(els, e => e.won) + '%', 11) + pad(mean(els.map(e => e.winChance)).toFixed(2), 13)
    + pctOf(rs, r => r.defections > 0) + '%');
}
