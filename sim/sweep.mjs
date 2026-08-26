import { profile } from './ballot-curve.mjs';
const N = Number(process.argv[2] || 1200);
const pad = (s, n) => String(s).padEnd(n);
const row = (label, cfg) => {
  const p = profile(cfg, N);
  console.log(pad(label, 22)
    + pad(p.careful.won.toFixed(1), 9) + pad(p.sloppy.won.toFixed(1), 8) + pad(p.careless.won.toFixed(1), 10)
    + pad(p.careful.filed.toFixed(0) + '%', 8)
    + pad(p.careful.medMargin, 8) + pad(p.careful.close.toFixed(0) + '%', 8) + p.careful.blowout.toFixed(0) + '%');
};
console.log(`n=${N} per cell. close = decided by <=2 votes, blowout = >=8.\n`);
console.log(pad('curve', 22) + pad('careful', 9) + pad('sloppy', 8) + pad('careless', 10)
  + pad('filed', 8) + pad('margin', 8) + pad('close', 8) + 'blowout');
row('SHIPS TODAY (stated)', { useTrue: false, pivot: 32, span: 48 });
console.log('-'.repeat(74));
for (const pivot of [26, 22, 20, 18, 15])
  for (const span of [40, 35, 30])
    row(`commitment ${pivot}/${span}`, { useTrue: true, pivot, span });
