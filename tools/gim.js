// GIM (PSP texture) decode/encode + image overrides for the build.
//   node tools/gim.js dump <out dir>      decodes every GIM (standalone or inside .pac) to PNG
// Overrides: imagens/<file path>#<GIM NAME>.png (edited PNG, same size as the original)
const fs = require('fs');
const path = require('path');
const png = require('./png');
const { parsePac, buildPac } = require('./btx');

const BPP = { 0: 16, 1: 16, 2: 16, 3: 32, 4: 4, 5: 8 };

// Walks the block tree and returns the image (type 4) and palette (type 5) blocks
function blocks(buf) {
  if (buf.toString('latin1', 0, 4) !== 'MIG.') throw new Error('not GIM');
  const out = {};
  const walk = (start, end) => {
    let p = start;
    while (p < end) {
      const id = buf.readUInt16LE(p), size = buf.readUInt32LE(p + 4), child = buf.readUInt32LE(p + 8), data = buf.readUInt32LE(p + 12);
      if (id === 2 || id === 3) walk(p + child, p + size);
      else if ((id === 4 || id === 5) && !out[id]) out[id] = { at: p + data };
      if (!size) break;
      p += size;
    }
  };
  walk(16, buf.length);
  for (const b of Object.values(out)) {
    const d = b.at;
    Object.assign(b, {
      format: buf.readUInt16LE(d + 4), order: buf.readUInt16LE(d + 6),
      w: buf.readUInt16LE(d + 8), h: buf.readUInt16LE(d + 10),
      pixels: d + buf.readUInt32LE(d + 0x1c),
    });
    b.bpp = BPP[b.format];
    b.stride = Math.ceil((b.w * b.bpp) / 8 / 16) * 16;
    b.rows = Math.ceil(b.h / 8) * 8;
  }
  return out;
}

// PSP swizzle: 16-byte x 8-row tiles
function unswizzle(src, stride, rows) {
  const dst = Buffer.alloc(stride * rows);
  let s = 0;
  for (let by = 0; by < rows; by += 8)
    for (let bx = 0; bx < stride; bx += 16)
      for (let y = 0; y < 8; y++) { src.copy(dst, (by + y) * stride + bx, s, s + 16); s += 16; }
  return dst;
}
function swizzle(src, stride, rows) {
  const dst = Buffer.alloc(stride * rows);
  let d = 0;
  for (let by = 0; by < rows; by += 8)
    for (let bx = 0; bx < stride; bx += 16)
      for (let y = 0; y < 8; y++) { src.copy(dst, d, (by + y) * stride + bx, (by + y) * stride + bx + 16); d += 16; }
  return dst;
}

function color(buf, fmt, i) {
  if (fmt === 3) return [buf[i * 4], buf[i * 4 + 1], buf[i * 4 + 2], buf[i * 4 + 3]];
  const v = buf.readUInt16LE(i * 2);
  if (fmt === 0) return [(v & 31) * 255 / 31, ((v >> 5) & 63) * 255 / 63, ((v >> 11) & 31) * 255 / 31, 255].map(Math.round);
  if (fmt === 1) return [(v & 31) * 255 / 31, ((v >> 5) & 31) * 255 / 31, ((v >> 10) & 31) * 255 / 31, v >> 15 ? 255 : 0].map(Math.round);
  return [(v & 15) * 17, ((v >> 4) & 15) * 17, ((v >> 8) & 15) * 17, (v >> 12) * 17];
}
function putColor(buf, fmt, i, [r, g, b, a]) {
  if (fmt === 3) { buf[i * 4] = r; buf[i * 4 + 1] = g; buf[i * 4 + 2] = b; buf[i * 4 + 3] = a; return; }
  let v;
  if (fmt === 0) v = (r >> 3) | ((g >> 2) << 5) | ((b >> 3) << 11);
  else if (fmt === 1) v = (r >> 3) | ((g >> 3) << 5) | ((b >> 3) << 10) | (a >= 128 ? 0x8000 : 0);
  else v = (r >> 4) | ((g >> 4) << 4) | ((b >> 4) << 8) | ((a >> 4) << 12);
  buf.writeUInt16LE(v, i * 2);
}

function plainPixels(buf, img) {
  const raw = buf.subarray(img.pixels, img.pixels + img.stride * img.rows);
  return img.order === 1 ? unswizzle(raw, img.stride, img.rows) : Buffer.from(raw);
}

function decode(buf) {
  const { 4: img, 5: pal } = blocks(buf);
  const px = plainPixels(buf, img);
  let colors = null;
  if (img.format === 4 || img.format === 5) {
    const pb = plainPixels(buf, pal);
    colors = Array.from({ length: pal.w }, (_, i) => color(pb, pal.format, i));
  }
  const rgba = Buffer.alloc(img.w * img.h * 4);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      let c;
      if (img.format === 4) { const b = px[y * img.stride + (x >> 1)]; c = colors[x & 1 ? b >> 4 : b & 15]; }
      else if (img.format === 5) c = colors[px[y * img.stride + x]];
      else c = color(px.subarray(y * img.stride), img.format, x);
      rgba.set(c, (y * img.w + x) * 4);
    }
  return { w: img.w, h: img.h, rgba, format: img.format };
}

// k-means palette for indexed formats, seeded with the original palette
function quantize(rgba, n, seed) {
  let pal = seed.slice(0, n).map((c) => c.slice());
  while (pal.length < n) pal.push([0, 0, 0, 0]);
  const count = rgba.length / 4;
  const idx = new Uint16Array(count);
  const nearest = (o) => {
    let best = 0, bd = Infinity;
    for (let k = 0; k < pal.length; k++) {
      const p = pal[k];
      const d = (p[0] - rgba[o]) ** 2 + (p[1] - rgba[o + 1]) ** 2 + (p[2] - rgba[o + 2]) ** 2 + 2 * (p[3] - rgba[o + 3]) ** 2;
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  };
  for (let it = 0; it < 8; it++) {
    const sum = pal.map(() => [0, 0, 0, 0, 0]);
    for (let i = 0; i < count; i++) {
      const k = (idx[i] = nearest(i * 4));
      for (let c = 0; c < 4; c++) sum[k][c] += rgba[i * 4 + c];
      sum[k][4]++;
    }
    pal = pal.map((p, k) => (sum[k][4] ? sum[k].slice(0, 4).map((v) => Math.round(v / sum[k][4])) : p));
  }
  for (let i = 0; i < count; i++) idx[i] = nearest(i * 4);
  return { pal, idx };
}

// Re-encodes `rgba` into a copy of the original GIM (same size, format and layout)
function encode(orig, rgba) {
  const buf = Buffer.from(orig);
  const { 4: img, 5: pal } = blocks(buf);
  const px = Buffer.alloc(img.stride * img.rows);
  if (img.format === 4 || img.format === 5) {
    const pb = plainPixels(buf, pal);
    const seed = Array.from({ length: pal.w }, (_, i) => color(pb, pal.format, i));
    // never use more colours than the palette block holds
    const { pal: colors, idx } = quantize(rgba, Math.min(img.format === 4 ? 16 : 256, pal.w), seed);
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++) {
        const k = idx[y * img.w + x];
        if (img.format === 4) px[y * img.stride + (x >> 1)] |= x & 1 ? k << 4 : k;
        else px[y * img.stride + x] = k;
      }
    const npb = Buffer.alloc(pal.stride * pal.rows);
    colors.forEach((c, i) => putColor(npb, pal.format, i, c));
    (pal.order === 1 ? swizzle(npb, pal.stride, pal.rows) : npb).copy(buf, pal.pixels);
  } else {
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++)
        putColor(px.subarray(y * img.stride), img.format, x, [...rgba.subarray((y * img.w + x) * 4, (y * img.w + x) * 4 + 4)]);
  }
  (img.order === 1 ? swizzle(px, img.stride, img.rows) : px).copy(buf, img.pixels);
  return buf;
}

// [file, inner, data] for every PNG under imagens/
function overrides(root) {
  const dir = path.join(root, 'imagens');
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) { walk(p); continue; }
      if (!f.endsWith('.png')) continue;
      const rel = path.relative(dir, p).replace(/\\/g, '/').slice(0, -4);
      const [file, inner = ''] = rel.split('#');
      const src = fs.readFileSync(path.join(root, 'original', 'install', file));
      const orig = inner ? parsePac(src).find((s) => s.name === inner).data : src;
      const { w, h, rgba } = png.decode(fs.readFileSync(p));
      const o = decode(orig);
      if (w !== o.w || h !== o.h) throw new Error(`tamanho diferente: ${rel}`);
      out.push([file, inner, encode(orig, rgba)]);
    }
  };
  walk(dir);
  return out;
}

module.exports = { decode, encode, overrides };

if (require.main === module && process.argv[2] === 'dump') {
  const root = path.join(__dirname, '..', 'original', 'install');
  const outDir = process.argv[3];
  let n = 0, fail = 0;
  const save = (rel, buf) => {
    try {
      const { w, h, rgba } = decode(buf);
      const dst = path.join(outDir, rel + '.png');
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, png.encode(w, h, rgba));
      n++;
    } catch (e) { fail++; console.error(rel, e.message); }
  };
  const walk = (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) { walk(p); continue; }
      const rel = path.relative(root, p).replace(/\\/g, '/');
      const b = fs.readFileSync(p);
      if (f.toLowerCase().endsWith('.gim')) save(rel, b);
      else if (f.endsWith('.pac')) {
        let subs; try { subs = parsePac(b); } catch { continue; }
        for (const s of subs) if (s.name.endsWith('.GIM')) save(rel + '#' + s.name, s.data);
      }
    }
  };
  walk(root);
  console.log('decodificadas', n, 'falhas', fail);
}
