// node crop.js <in.png> <out.png> x y w h
const fs = require('fs');
const png = require('./png');
const [, , i, o, x, y, w, h] = process.argv.map((v, k) => (k > 3 ? +v : v));
const src = png.decode(fs.readFileSync(i));
const out = Buffer.alloc(w * h * 4);
for (let yy = 0; yy < h; yy++) src.rgba.copy(out, yy * w * 4, ((y + yy) * src.w + x) * 4, ((y + yy) * src.w + x + w) * 4);
fs.writeFileSync(o, png.encode(w, h, out));
