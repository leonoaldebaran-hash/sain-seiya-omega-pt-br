// FONT.FNT (common/globalobject.pac): the game's bitmap font
//   header: u32 glyph count, 12 bytes padding
//   table : count x 64 bytes { u16 code (UTF-16), u8 page, u8 index, u32 w, u32 h, u32 ?, u32 advance, ...metrics }
//   pixels: count (+1 padding) x 128 bytes, one 16x16 cell per glyph, 4 bits per pixel
const fs = require('fs');
const png = require('./png');

function parse(buf) {
  const count = buf.readUInt32LE(0);
  const glyphs = [];
  for (let i = 0; i < count; i++) {
    const o = 0x10 + i * 0x40;
    glyphs.push({
      i, o, code: buf.readUInt16LE(o), page: buf[o + 2], index: buf[o + 3],
      fields: Array.from({ length: 15 }, (_, k) => buf.readInt32LE(o + 4 + k * 4)),
    });
  }
  return { count, glyphs, pixels: 0x10 + count * 0x40 };
}

// Pixels are 128x128 4bpp pages (8x8 cells of 16x16 = 64 glyphs), PSP-swizzled (16 bytes x 8 rows tiles).
const PAGE = 128, STRIDE = 64, PAGE_BYTES = PAGE * STRIDE;
function pageAlpha(buf, pixelsAt, page, swizzled = true) {
  const src = buf.subarray(pixelsAt + page * PAGE_BYTES, pixelsAt + (page + 1) * PAGE_BYTES);
  const lin = Buffer.alloc(PAGE_BYTES);
  if (swizzled) {
    let s = 0;
    for (let by = 0; by < PAGE; by += 8)
      for (let bx = 0; bx < STRIDE; bx += 16)
        for (let y = 0; y < 8; y++) { src.copy(lin, (by + y) * STRIDE + bx, s, s + 16); s += 16; }
  } else src.copy(lin);
  const a = new Uint8Array(PAGE * PAGE);
  for (let p = 0; p < a.length; p++) { const b = lin[p >> 1]; a[p] = (p & 1 ? b >> 4 : b & 15) * 17; }
  return a;
}
// glyph cell (16x16) from its page/index
function cell(buf, pixelsAt, page, index, swizzled = true) {
  const a = pageAlpha(buf, pixelsAt, page, swizzled);
  const cx = (index % 8) * 16, cy = Math.floor(index / 8) * 16;
  const out = new Uint8Array(256);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) out[y * 16 + x] = a[(cy + y) * PAGE + cx + x];
  return out;
}

module.exports = { parse, cell, pageAlpha, PAGE, STRIDE, PAGE_BYTES };

if (require.main === module) {
  // node fnt.js <FONT.FNT> <out.png> [firstPage] [pages] [linear]  -> pages side by side, 2x
  const [, , f, out, first = 0, n = 2, linear] = process.argv;
  const buf = fs.readFileSync(f);
  const { pixels } = parse(buf);
  const S = 2, W = n * (PAGE + 4) * S, H = PAGE * S;
  const img = Buffer.alloc(W * H * 4, 255);
  for (let k = 0; k < n; k++) {
    const a = pageAlpha(buf, pixels, +first + k, !linear);
    for (let y = 0; y < H; y++) for (let x = 0; x < PAGE * S; x++) {
      const v = a[Math.floor(y / S) * PAGE + Math.floor(x / S)];
      const o = (y * W + k * (PAGE + 4) * S + x) * 4;
      img[o] = img[o + 1] = img[o + 2] = 30 + v * 0.85; img[o + 3] = 255;
    }
  }
  fs.writeFileSync(out, png.encode(W, H, img));
}
