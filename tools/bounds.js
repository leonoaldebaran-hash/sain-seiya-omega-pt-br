// Prints the bounding boxes of opaque pixel bands (alpha > 40), split by empty rows
const fs = require('fs');
const png = require('./png');
for (const f of process.argv.slice(2)) {
  const { w, h, rgba } = png.decode(fs.readFileSync(f));
  const rowHas = (y) => { for (let x = 0; x < w; x++) if (rgba[(y * w + x) * 4 + 3] > 40) return true; return false; };
  const bands = [];
  let y0 = -1;
  for (let y = 0; y <= h; y++) {
    const has = y < h && rowHas(y);
    if (has && y0 < 0) y0 = y;
    if (!has && y0 >= 0) {
      let x0 = w, x1 = -1;
      for (let yy = y0; yy < y; yy++) for (let x = 0; x < w; x++) if (rgba[(yy * w + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      bands.push(`[x${x0}-${x1} y${y0}-${y - 1}]`);
      y0 = -1;
    }
  }
  console.log(`${w}x${h}`, bands.join(' '), f.replace(/.*gims\//, ''));
}
