// Round-trip check: decode -> encode -> decode every overridden GIM and report the colour error
const fs = require('fs');
const path = require('path');
const { decode, encode } = require('./gim');
const { parsePac } = require('./btx');
const ROOT = path.join(__dirname, '..');
const dir = path.join(ROOT, 'imagens');
const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : f.endsWith('.png') && files.push(p); } };
walk(dir);
let worst = 0, n = 0;
const formats = {};
for (const p of files) {
  const rel = path.relative(dir, p).replace(/\\/g, '/').slice(0, -4);
  const [file, inner] = rel.split('#');
  const src = fs.readFileSync(path.join(ROOT, 'original', 'install', file));
  const orig = inner ? parsePac(src).find((s) => s.name === inner).data : src;
  const a = decode(orig);
  formats[a.format] = (formats[a.format] || 0) + 1;
  const b = decode(encode(orig, a.rgba));
  let err = 0;
  for (let i = 0; i < a.rgba.length; i++) err += Math.abs(a.rgba[i] - b.rgba[i]);
  err /= a.rgba.length;
  worst = Math.max(worst, err);
  if (err > 6) console.log('erro alto', err.toFixed(2), rel, 'formato', a.format);
  n++;
}
console.log('imagens', n, 'formatos', formats, 'pior erro médio', worst.toFixed(2));
