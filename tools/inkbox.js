// Bounding box of light "ink" pixels (text) inside a search area of a PNG
const fs = require('fs');
const png = require('./png');
function inkbox(file, [sx0, sy0, sx1, sy1], minLum = 480) {
  const { w, rgba } = png.decode(fs.readFileSync(file));
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = sy0; y <= sy1; y++)
    for (let x = sx0; x <= sx1; x++) {
      const o = (y * w + x) * 4;
      const r = rgba[o], g = rgba[o + 1], b = rgba[o + 2];
      if (rgba[o + 3] > 128 && r + g + b > minLum && Math.max(r, g, b) - Math.min(r, g, b) < 70) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}
module.exports = inkbox;
