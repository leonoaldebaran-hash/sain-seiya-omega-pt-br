// Finds the white panel (near-white pixels) and the red title inside a notice screen
const fs = require('fs');
const png = require('./png');
for (const f of process.argv.slice(2)) {
  const { w, h, rgba } = png.decode(fs.readFileSync(f));
  const box = (pred) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (pred(rgba[o], rgba[o + 1], rgba[o + 2])) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    return [x0, y0, x1, y1];
  };
  console.log(f.replace(/.*#/, ''), 'painel', box((r, g, b) => r > 235 && g > 235 && b > 235),
    'vermelho', box((r, g, b) => r > 170 && g < 80 && b < 80), 'texto', box((r, g, b) => r < 90 && g < 90 && b < 90 && 1));
}
