// Sweeps the Phase 2 knobs: node sim/phase2-sweep.mjs [n] '{"tuning":{...},"fear":{...},"tiers":{"walkin":{...}},"players":{...}}'
import { playGame } from './run.mjs';
import * as C from '../src/engine/act1/index.js';
const N = Number(process.argv[2] || 600);
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const variants = JSON.parse(process.argv[3] || '{}');
Object.assign(C.CAMPAIGN_TUNING, variants.tuning || {});
Object.assign(C.FEAR, variants.fear || {});
for (const [k, v] of Object.entries(variants.tiers || {})) Object.assign(C.COORDINATED[k], v);
const players = { counter: { phase2: 'counter' }, talker: { phase2: 'talker' }, noact: { phase2: 'counter', actionEvery: 0 }, ...(variants.players || {}) };
let line = '';
for (const [name, o] of Object.entries(players)) {
  const rs = []; for (let i = 0; i < N; i++) rs.push(playGame({ askBar: 74, mapper: true, ...o }));
  const v = rs.filter(r => r.ballot);
  line += `${name} ${(100*rs.filter(r=>r.won).length/N).toFixed(1)} (m ${mean(v.map(r=>r.ballot.yes-r.ballot.no)).toFixed(1)})  `;
}
console.log(JSON.stringify(variants), '\n  ', line);
