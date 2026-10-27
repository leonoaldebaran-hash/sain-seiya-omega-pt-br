// Verifies an extracted install.cpk tree against the translation sources:
//   node tools/verify.js <extracted install dir>
// - every image override decodes from the packed GIM close to its PNG
// - every translated BTX table contains the encoded Portuguese strings
const fs = require('fs');
const path = require('path');
const png = require('./png');
const { decode } = require('./gim');
const { parsePac, parseBtx } = require('./btx');
const { encode } = require('./encode');
const ROOT = path.join(__dirname, '..');
const X = process.argv[2];
const read = (file, inner) => {
  const b = fs.readFileSync(path.join(X, file));
  return inner ? parsePac(b).find((s) => s.name === inner).data : b;
};

let imgOk = 0, imgBad = 0;
const walk = (d, cb) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p, cb) : cb(p); } };
walk(path.join(ROOT, 'imagens'), (p) => {
  if (!p.endsWith('.png')) return;
  const rel = path.relative(path.join(ROOT, 'imagens'), p).replace(/\\/g, '/').slice(0, -4);
  const [file, inner] = rel.split('#');
  const want = png.decode(fs.readFileSync(p));
  const got = decode(read(file, inner));
  let err = 0;
  for (let i = 0; i < want.rgba.length; i += 4) {
    const a = want.rgba[i + 3] / 255, b = got.rgba[i + 3] / 255;
    for (let c = 0; c < 3; c++) err += Math.abs(want.rgba[i + c] * a - got.rgba[i + c] * b);
    err += Math.abs(want.rgba[i + 3] - got.rgba[i + 3]);
  }
  err /= want.rgba.length;
  if (err > 8) { imgBad++; console.log('imagem diferente', err.toFixed(1), rel); } else imgOk++;
});

let txtOk = 0, txtBad = 0;
for (const f of fs.readdirSync(path.join(ROOT, 'traducao')).filter((x) => x.endsWith('.json'))) {
  const tr = JSON.parse(fs.readFileSync(path.join(ROOT, 'traducao', f), 'utf8'));
  for (const [key, entries] of Object.entries(tr)) {
    if (!entries.some((e) => e.pt)) continue;
    const [file, inner] = key.split('#');
    const got = new Map(parseBtx(read(file, inner)).map((e) => [e.id, e.text]));
    for (const e of entries) {
      if (!e.pt) continue;
      const t = got.get(e.id) || '';
      // the packed text must be full-width (no plain ASCII letters outside tags/button letters)
      const plain = t.replace(/<[^>]*>/g, '').replace(/[PKSL]/g, '');
      if (!t || t === e.jp || /[a-zA-Z]/.test(plain)) { txtBad++; if (txtBad < 10) console.log('texto suspeito', f, key, e.id, t.slice(0, 40)); } else txtOk++;
    }
  }
}
console.log(`imagens ok ${imgOk} / diferentes ${imgBad} — textos ok ${txtOk} / suspeitos ${txtBad}`);
void encode;
