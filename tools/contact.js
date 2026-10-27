// Contact sheet: node contact.js <out.png> <cellW> <cellH> <cols> <png...>
// Prints "index file" so cells (row-major, starting at 0) can be matched to files.
const fs = require('fs');
const png = require('./png');
const [, , out, cw, ch, cols, ...files] = process.argv;
const W = +cw, H = +ch, C = +cols;
const rows = Math.ceil(files.length / C);
const sheet = Buffer.alloc(W * C * H * rows * 4);
// checkerboard so transparent pixels are visible
for (let i = 0; i < sheet.length / 4; i++) {
  const x = i % (W * C), y = Math.floor(i / (W * C));
  const v = ((x >> 3) + (y >> 3)) & 1 ? 90 : 60;
  sheet[i * 4] = sheet[i * 4 + 1] = sheet[i * 4 + 2] = v; sheet[i * 4 + 3] = 255;
}
files.forEach((f, n) => {
  const { w, h, rgba } = png.decode(fs.readFileSync(f));
  const s = Math.min(process.env.ZOOM ? 8 : 1, (W - 2) / w, (H - 2) / h);
  const ox = (n % C) * W, oy = Math.floor(n / C) * H;
  for (let y = 0; y < Math.floor(h * s); y++)
    for (let x = 0; x < Math.floor(w * s); x++) {
      const si = (Math.floor(y / s) * w + Math.floor(x / s)) * 4, di = ((oy + y) * W * C + ox + x) * 4;
      const a = rgba[si + 3] / 255;
      for (let c = 0; c < 3; c++) sheet[di + c] = Math.round(rgba[si + c] * a + sheet[di + c] * (1 - a));
    }
  // red border line under each cell
  for (let x = 0; x < W; x++) { const di = ((oy + H - 1) * W * C + ox + x) * 4; sheet[di] = 200; sheet[di + 1] = sheet[di + 2] = 0; }
  console.log(n + ' ' + f.replace(/.*gims\//, ''));
});
fs.writeFileSync(out, png.encode(W * C, H * rows, sheet));
