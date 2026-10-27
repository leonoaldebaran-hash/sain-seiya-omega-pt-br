// Rebuilds the game font (FONT.FNT) with normal Latin letters, accented letters and space.
//   node tools/fonte.js glyphs   -> writes fonte/novos.txt (characters to render with glifos.ps1)
//   node tools/fonte.js build    -> reads fonte/glifos.json, writes fonte/FONT.FNT + fonte/metricas.json
// The table keeps its size (1215 slots), stays sorted by code and keeps cell == position, like the
// original; the room comes from kanji that no translated text uses anymore.
const fs = require('fs');
const path = require('path');
const { parse } = require('./fnt');
const { parsePac } = require('./btx');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'fonte');
const SRC = () => parsePac(fs.readFileSync(path.join(ROOT, 'original/install/common/globalobject.pac'))).find((s) => s.name === 'FONT.FNT').data;

// Latin set rendered fresh: printable ASCII + Portuguese accents + a few symbols
const ACCENTS = 'áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇªº°–—“”‘’';
const NEW = Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join('') + ACCENTS;

// characters still needed from the original font: whatever the texts use outside the Latin set
function stillUsed() {
  const used = new Set();
  for (const f of fs.readdirSync(path.join(ROOT, 'traducao')).filter((x) => x.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'traducao', f), 'utf8'));
    for (const [key, es] of Object.entries(d))
      for (const e of es) {
        // config entries 19/20 are font test strings that are never shown
        if (key.includes('CONFIG_JP') && (e.id === 19 || e.id === 20)) continue;
        const t = (e.pt || e.jp).replace(/<[^>]*>/g, '');
        for (const c of t) used.add(c);
      }
  }
  return used;
}

const cmd = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
if (cmd === 'glyphs') {
  fs.writeFileSync(path.join(OUT, 'novos.txt'), NEW, 'utf8');
  console.log('caracteres para desenhar:', [...NEW].length);
} else if (cmd === 'build') {
  const src = SRC();
  const { count, glyphs, pixels } = parse(src);
  const rendered = JSON.parse(fs.readFileSync(path.join(OUT, 'glifos.json'), 'utf8').replace(/^﻿/, ''));
  const newCodes = new Set(rendered.map((g) => g.c));
  const used = stillUsed();

  // original glyph bitmaps (cell top-left, w x h)
  const cellAlpha = (g) => {
    const page = pixels + g.page * 8192, cx = (g.index % 8) * 16, cy = Math.floor(g.index / 8) * 16;
    const [w, h] = g.fields;
    const a = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = (cy + y) * 128 + cx + x, b = src[page + (p >> 1)];
      a.push(p & 1 ? b >> 4 : b & 15);
    }
    return a;
  };
  let keep = glyphs.filter((g) => !newCodes.has(g.code));
  // free slots: drop kanji (and other CJK) that no text uses, highest codes first
  const isKanji = (c) => c >= 0x4e00 && c <= 0x9fff;
  const need = keep.length + rendered.length - count;
  const removable = keep.filter((g) => isKanji(g.code) && !used.has(String.fromCharCode(g.code))).sort((a, b) => b.code - a.code);
  if (removable.length < need) throw new Error(`faltam vagas: preciso de ${need}, tenho ${removable.length}`);
  const drop = new Set(removable.slice(0, need).map((g) => g.code));
  keep = keep.filter((g) => !drop.has(g.code));

  const all = [
    ...keep.map((g) => ({ code: g.code, fields: g.fields, a: cellAlpha(g) })),
    ...rendered.map((r) => ({
      code: r.c,
      fields: [r.w, r.h, r.left, r.top, r.w * 64 - 32, r.h * 64 - 32, Math.max(r.left, 0) * 64, r.top * 64 - 8, 0, 0, r.top * 64 - 8, r.adv, 0, 0, 0],
      a: r.a,
    })),
  ].sort((x, y) => x.code - y.code);
  if (all.length !== count) throw new Error('contagem errada ' + all.length);

  const out = Buffer.from(src); // same size and header
  out.fill(0, 0x10, src.length);
  out.writeUInt32LE(count, 0);
  all.forEach((g, i) => {
    const o = 0x10 + i * 0x40, page = Math.floor(i / 64), index = i % 64;
    out.writeUInt16LE(g.code, o); out[o + 2] = page; out[o + 3] = index;
    g.fields.forEach((v, k) => out.writeInt32LE(v, o + 4 + k * 4));
    const [w, h] = g.fields;
    const base = pixels + page * 8192, cx = (index % 8) * 16, cy = Math.floor(index / 8) * 16;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = g.a[y * w + x] & 15, p = (cy + y) * 128 + cx + x;
      out[base + (p >> 1)] |= p & 1 ? v << 4 : v;
    }
  });
  fs.writeFileSync(path.join(OUT, 'FONT.FNT'), out);
  // advances (px) for line wrapping in encode.js
  const adv = {};
  for (const g of all) adv[String.fromCharCode(g.code)] = g.fields[11] / 64;
  fs.writeFileSync(path.join(OUT, 'metricas.json'), JSON.stringify(adv));
  console.log(`fonte gerada: ${rendered.length} glifos novos, ${drop.size} kanji sem uso removidos`);
} else console.log('uso: node tools/fonte.js glyphs|build');
