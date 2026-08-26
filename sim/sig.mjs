import { playGame } from './run.mjs';
import { applyRules } from './rules.mjs';
const N = 3000;
const BASE = { askBar: 74, pubPhase: 'campaign', pubTier: 'medium' };
const run=(o)=>{let n=0;for(let i=0;i<N;i++) if(playGame({...BASE,...o}).won) n++; return n/N;};
const se=(p)=>Math.sqrt(p*(1-p)/N);
const pad=(s,n)=>String(s).padEnd(n);
console.log(`n=${N} per cell\n`);
console.log(pad('ruleset',13)+pad('careful',18)+pad('sloppy',18)+'gap ± 95% CI');
for (const name of ['current','publicOnly','split']) {
  applyRules(name);
  const c=run({}), s=run({blindDeep:true});
  const g=(c-s)*100, ci=1.96*Math.sqrt(se(c)**2+se(s)**2)*100;
  console.log(pad(name,13)+pad(`${(c*100).toFixed(1)} ±${(1.96*se(c)*100).toFixed(1)}`,18)
    +pad(`${(s*100).toFixed(1)} ±${(1.96*se(s)*100).toFixed(1)}`,18)+`${g.toFixed(1)} ±${ci.toFixed(1)}`);
}
