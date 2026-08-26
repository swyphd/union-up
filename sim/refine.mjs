import { profile } from './ballot-curve.mjs';
const N = Number(process.argv[2] || 3000);
const pad = (s, n) => String(s).padEnd(n);
console.log(`n=${N} per cell\n`);
console.log(pad('curve', 16) + pad('careful', 9) + pad('sloppy', 8) + pad('careless', 10)
  + pad('spread', 9) + pad('margin', 8) + pad('close', 8) + 'blowout');
for (const pivot of [22, 20, 18])
  for (const span of [38, 35, 32]) {
    const p = profile({ useTrue: true, pivot, span }, N);
    console.log(pad(`${pivot}/${span}`, 16) + pad(p.careful.won.toFixed(1), 9)
      + pad(p.sloppy.won.toFixed(1), 8) + pad(p.careless.won.toFixed(1), 10)
      + pad((p.careful.won - p.careless.won).toFixed(1), 9)
      + pad(p.careful.medMargin, 8) + pad(p.careful.close.toFixed(0) + '%', 8)
      + p.careful.blowout.toFixed(0) + '%');
  }
