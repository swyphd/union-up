// Before comparing rule sets, check they deliver comparable total juice — otherwise the
// experiment measures a buff, not a redesign. Sample the real pair distribution.
import * as C from './core.mjs';
import { RULESETS } from './rules.mjs';
const samples = [];
for (let g = 0; g < 60; g++) {
  const ws = C.makeAct1Workers(); const inf = C.generateInfluence(ws);
  for (const a of ws) for (const b of ws) {
    if (a.id === b.id) continue;
    const wt = C.infOn(inf, a.id, b.id);
    if (wt > 0) samples.push([a, b, wt]);
  }
}
console.log('pairs sampled:', samples.length);
for (const [name, r] of Object.entries(RULESETS)) {
  let convo = 0, pub = 0, pas = 0;
  for (const [a, b, wt] of samples) {
    convo += r.convoWeight(wt) * r.convoAff(a, b);
    pub += (wt / 100) * r.publicAff(a, b);
    pas += (wt / 100) * r.passiveAff(a, b);
  }
  const n = samples.length;
  console.log(`${name.padEnd(11)} convo ${(convo/n).toFixed(3)}  public ${(pub/n).toFixed(3)}  passive ${(pas/n).toFixed(3)}`);
}
