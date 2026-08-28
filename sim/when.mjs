import { playGame } from './run.mjs';
const N = 600, mean=(a)=>a.reduce((s,x)=>s+x,0)/(a.length||1);
const pad=(s,n)=>String(s).padEnd(n);
console.log(pad('when public',26)+pad('won%',8)+pad('filed%',8)+pad('burns',8)+pad('stated',8)+'true');
for (const [label,o] of [
  ['never',                 { noPublic:true }],
  ['drive only, escalating',{ pubPhase:'drive' }],
  ['campaign only, small',  { pubPhase:'campaign', pubTier:'small' }],
  ['campaign only, medium', { pubPhase:'campaign', pubTier:'medium' }],
  ['campaign only, large',  { pubPhase:'campaign', pubTier:'large' }],
  ['always, escalating',    {}],
]) {
  const rs=[]; for(let i=0;i<N;i++) rs.push(playGame({askBar:74,...o}));
  console.log(pad(label,26)+pad((100*rs.filter(r=>r.won).length/N).toFixed(1),8)
    +pad((100*rs.filter(r=>r.filedOn!=null).length/N).toFixed(1),8)
    +pad(mean(rs.map(r=>r.burns)).toFixed(2),8)
    +pad(mean(rs.map(r=>r.statedMean)).toFixed(0),8)+mean(rs.map(r=>r.trueMean)).toFixed(0));
}
