import { playGame } from './run.mjs';
import { applyRules } from './rules.mjs';
import * as C from './core.mjs';
applyRules('current');
const N=1500, mean=(a)=>a.reduce((s,x)=>s+x,0)/(a.length||1), pad=(s,n)=>String(s).padEnd(n);
console.log(`Public actions DURING THE DRIVE, n=${N}. Burn risk by tier: `
  + Object.entries(C.PUBLIC_TIERS).map(([k,v])=>`${k} ${v.burn}`).join(', ') + '\n');
console.log(pad('drive-phase policy',22)+pad('won%',8)+pad('Δ',8)+pad('burns',8)+pad('peak heat',11)+'filed%');
let base=null;
for (const [label,o] of [['no public action',{noPublic:true}],['small (burn 0)',{pubTier:'small'}],
    ['medium (burn .06)',{pubTier:'medium'}],['large (burn .18)',{pubTier:'large'}]]) {
  const rs=[];for(let i=0;i<N;i++)rs.push(playGame({askBar:74,pubPhase:'drive',...o}));
  const wr=100*rs.filter(r=>r.won).length/N; if(base==null)base=wr;
  console.log(pad(label,22)+pad(wr.toFixed(1),8)+pad((wr-base).toFixed(1),8)
    +pad(mean(rs.map(r=>r.burns)).toFixed(2),8)+pad(mean(rs.map(r=>r.heat)).toFixed(0),11)
    +(100*rs.filter(r=>r.filedOn!=null).length/N).toFixed(1));
}
