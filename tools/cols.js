// Column runs of "ink" (bright or saturated, opaque) pixels inside a band: helps locate icons/words
//   node cols.js <png> [y0] [y1]
const fs = require('fs');
const png = require('./png');
const [, , f, a, b] = process.argv;
const { w, h, rgba } = png.decode(fs.readFileSync(f));
const y0 = +(a || 0), y1 = +(b || h - 1);
const ink = (x) => {
  for (let y = y0; y <= y1; y++) {
    const o = (y * w + x) * 4;
    const r = rgba[o], g = rgba[o + 1], bl = rgba[o + 2], al = rgba[o + 3];
    if (al > 120 && (r + g + bl > 450 || Math.max(r, g, bl) - Math.min(r, g, bl) > 90)) return true;
  }
  return false;
};
const runs = [];
let s = -1;
for (let x = 0; x <= w; x++) {
  const on = x < w && ink(x);
  if (on && s < 0) s = x;
  if (!on && s >= 0) { runs.push([s, x - 1]); s = -1; }
}
// merge runs separated by <= 2 px (letters of one glyph)
const merged = [];
for (const r of runs) {
  const last = merged[merged.length - 1];
  if (last && r[0] - last[1] <= 2) last[1] = r[1]; else merged.push([...r]);
}
console.log(`${w}x${h}`, merged.map(([p, q]) => `${p}-${q}`).join(' '));
