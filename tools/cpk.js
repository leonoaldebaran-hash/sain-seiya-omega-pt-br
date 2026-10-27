// CRI CPK tools
//   node cpk.js extract <file.cpk> <outdir> [--list]
//   node cpk.js patch <in.cpk> <out.cpk> <replacement root dir>
// patch: every file under <root> whose relative path matches a TOC entry is appended
// (uncompressed) before the ETOC and its TOC row is repointed; header offsets are updated.
const fs = require('fs');
const path = require('path');

// Parses an @UTF table. `abs` is the absolute file offset of buf[0] so that
// each row can report where its per-row fields live (used for in-place patching).
function readUTF(buf, abs = 0) {
  if (buf.toString('latin1', 0, 4) !== '@UTF') throw new Error('not @UTF');
  const base = 8;
  const rowsOff = buf.readUInt32BE(8) & 0xffff;
  const strOff = buf.readUInt32BE(12);
  const dataOff = buf.readUInt32BE(16);
  const numCols = buf.readUInt16BE(24);
  const rowLen = buf.readUInt16BE(26);
  const numRows = buf.readUInt32BE(28);
  const str = (o) => {
    let s = base + strOff + o, e = s;
    while (buf[e] !== 0) e++;
    return buf.toString('latin1', s, e);
  };
  function readVal(type, q) {
    switch (type) {
      case 0: case 1: return [buf[q], q + 1];
      case 2: case 3: return [buf.readUInt16BE(q), q + 2];
      case 4: case 5: return [buf.readUInt32BE(q), q + 4];
      case 6: case 7: return [Number(buf.readBigUInt64BE(q)), q + 8];
      case 8: return [buf.readFloatBE(q), q + 4];
      case 0xa: return [str(buf.readUInt32BE(q)), q + 4];
      case 0xb: {
        const o = buf.readUInt32BE(q), sz = buf.readUInt32BE(q + 4);
        return [buf.subarray(base + dataOff + o, base + dataOff + o + sz), q + 8];
      }
      default: throw new Error('type ' + type);
    }
  }
  let p = 32;
  const cols = [];
  for (let i = 0; i < numCols; i++) {
    const flags = buf[p++];
    const name = str(buf.readUInt32BE(p)); p += 4;
    const col = { name, storage: flags & 0xf0, type: flags & 0x0f };
    if (col.storage === 0x30) [col.const, p] = readVal(col.type, p);
    cols.push(col);
  }
  const rows = [];
  for (let r = 0; r < numRows; r++) {
    let q = base + rowsOff + r * rowLen;
    const row = { _pos: {}, _type: {} };
    for (const c of cols) {
      if (c.storage === 0x10) row[c.name] = null;
      else if (c.storage === 0x30) row[c.name] = c.const;
      else if (c.storage === 0x50) {
        row._pos[c.name] = abs + q; row._type[c.name] = c.type;
        [row[c.name], q] = readVal(c.type, q);
      }
    }
    rows.push(row);
  }
  return rows;
}

function tableAt(file, off) {
  const len = Number(file.readBigUInt64LE(off + 8));
  const b = file.subarray(off + 16, off + 16 + len);
  if (b.toString('latin1', 0, 4) !== '@UTF') throw new Error('encrypted @UTF not supported');
  return readUTF(b, off + 16);
}

function writeField(file, row, name, value) {
  const pos = row._pos[name];
  if (pos === undefined) throw new Error('field not per-row: ' + name);
  switch (row._type[name]) {
    case 4: case 5: file.writeUInt32BE(value, pos); break;
    case 6: case 7: file.writeBigUInt64BE(BigInt(value), pos); break;
    default: throw new Error('unsupported type for ' + name);
  }
}

function crilayla(input) {
  if (input.toString('latin1', 0, 8) !== 'CRILAYLA') return input;
  const usize = input.readUInt32LE(8);
  const hoff = input.readUInt32LE(12);
  const result = Buffer.alloc(usize + 0x100);
  input.copy(result, 0, hoff + 0x10, hoff + 0x10 + 0x100);
  let inOff = input.length - 0x100 - 1;
  const outEnd = 0x100 + usize - 1;
  let pool = 0, left = 0, done = 0;
  const bits = (n) => {
    let out = 0, got = 0;
    while (got < n) {
      if (left === 0) { pool = input[inOff--]; left = 8; }
      const take = Math.min(left, n - got);
      out = (out << take) | ((pool >> (left - take)) & ((1 << take) - 1));
      left -= take; got += take;
    }
    return out;
  };
  const vle = [2, 3, 5, 8];
  while (done < usize) {
    if (bits(1)) {
      let ref = outEnd - done + bits(13) + 3;
      let len = 3, lvl;
      for (lvl = 0; lvl < 4; lvl++) {
        const v = bits(vle[lvl]); len += v;
        if (v !== (1 << vle[lvl]) - 1) break;
      }
      if (lvl === 4) { let v; do { v = bits(8); len += v; } while (v === 255); }
      for (let i = 0; i < len; i++) { result[outEnd - done] = result[ref--]; done++; }
    } else {
      result[outEnd - done] = bits(8); done++;
    }
  }
  return result;
}

function open(file) {
  const hdr = tableAt(file, 0)[0];
  if (!hdr.TocOffset) throw new Error('CPK without TOC not supported');
  const toc = tableAt(file, hdr.TocOffset);
  const add = hdr.ContentOffset < hdr.TocOffset ? hdr.ContentOffset : hdr.TocOffset;
  const entries = toc.map((r) => ({
    row: r, name: (r.DirName ? r.DirName + '/' : '') + r.FileName,
    off: r.FileOffset + add, size: r.FileSize, usize: r.ExtractSize, id: r.ID,
  }));
  return { hdr, entries, add };
}

function extract(cpkPath, outDir, list) {
  const file = fs.readFileSync(cpkPath);
  const { entries } = open(file);
  for (const e of entries) {
    if (list) { console.log(`${e.id}\t${e.off}\t${e.size}\t${e.usize}\t${e.name}`); continue; }
    const dst = path.join(outDir, e.name);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, crilayla(file.subarray(e.off, e.off + e.size)));
  }
  console.error(entries.length + ' entries');
}

function patch(inPath, outPath, root) {
  const orig = fs.readFileSync(inPath);
  const { hdr, entries, add } = open(orig);
  const align = hdr.Align || 2048;
  const pad = (n) => (n % align ? n + align - (n % align) : n);
  const etocOff = hdr.EtocOffset;
  const tail = orig.subarray(etocOff); // ETOC and anything after it
  const head = Buffer.from(orig.subarray(0, etocOff));
  const chunks = [head];
  let cursor = etocOff;
  let n = 0;
  for (const e of entries) {
    const src = path.join(root, e.name);
    if (!fs.existsSync(src)) continue;
    const data = fs.readFileSync(src);
    writeField(head, e.row, 'FileOffset', cursor - add);
    writeField(head, e.row, 'FileSize', data.length);
    writeField(head, e.row, 'ExtractSize', data.length);
    const padded = Buffer.alloc(pad(data.length));
    data.copy(padded);
    chunks.push(padded);
    cursor += padded.length;
    n++;
  }
  const hrow = tableAt(head, 0)[0];
  writeField(head, hrow, 'EtocOffset', cursor);
  if (hrow._pos.ContentSize !== undefined) writeField(head, hrow, 'ContentSize', cursor - hdr.ContentOffset);
  chunks.push(tail);
  fs.writeFileSync(outPath, Buffer.concat(chunks));
  console.error(`patched ${n} files -> ${outPath}`);
}

module.exports = { readUTF, crilayla, open };

if (require.main === module) {
  const [, , cmd, a, b, c] = process.argv;
  if (cmd === 'extract') extract(a, b, c === '--list');
  else if (cmd === 'patch') patch(a, b, c);
  else console.error('usage: extract <cpk> <outdir> [--list] | patch <in> <out> <root>');
}
