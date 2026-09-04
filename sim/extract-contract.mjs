// The contract prototype's pure math, for a headless run.
import fs from 'fs';
const src = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const i = src.indexOf('const CONTRACT_MONTHS'), j = src.indexOf('function ContractPrototype');
let out = `import { clamp, rand, infOn, ACT1_WORKERS_SEED } from './core.mjs';\n` + src.slice(i, j);
out += `\nexport { CONTRACT_MONTHS, LEVERAGE_COOLING, CAT_HOURS, CAT_JOIN_REQ, ACTION_LADDER, CONTRACT_ISSUES, CONTRACT_MAX_TIERS,
  makeContractWorkers, catBacking, participationChance, projectedTurnout, contractTierSum, ratifyYesChance, keepUnionChance };\n`;
fs.writeFileSync(new URL('core3.mjs', import.meta.url), out);
console.log('core3.mjs written');
