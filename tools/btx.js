// BTX (UTF-16LE string table) and PAC container helpers
const fs = require('fs');

function parsePac(buf) {
  const count = buf.readUInt16LE(0);
  const files = [];
  for (let i = 0; i < count; i++) {
    const e = 8 + i * 0x28;
    let name = buf.toString('latin1', e, e + 32);
    name = name.slice(0, name.indexOf('\0'));
    const off = buf.readUInt32LE(e + 32), size = buf.readUInt32LE(e + 36);
    files.push({ name, off, size, data: buf.subarray(off, off + size) });
  }
  return files;
}

function parseBtx(buf) {
  if (buf.toString('latin1', 0, 4) !== 'BTX ') throw new Error('not BTX');
  const count = buf.readUInt32LE(0x14);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const e = 0x18 + i * 8;
    const id = buf.readUInt32LE(e);
    // string offset is relative to the start of this entry
    let p = e + buf.readUInt32LE(e + 4), q = p;
    while (q + 1 < buf.length && buf.readUInt16LE(q) !== 0) q += 2;
    entries.push({ id, text: buf.toString('utf16le', p, q) });
  }
  return entries;
}

function buildBtx(entries) {
  const count = entries.length;
  const head = 0x18 + count * 8;
  const pool = [];
  const seen = new Map();
  let cur = head;
  const offs = entries.map((e) => {
    if (seen.has(e.text)) return seen.get(e.text);
    const s = Buffer.from(e.text + '\0', 'utf16le');
    const at = cur;
    pool.push(s);
    cur += s.length;
    if (cur % 4) { pool.push(Buffer.alloc(4 - (cur % 4))); cur += 4 - (cur % 4); }
    seen.set(e.text, at);
    return at;
  });
  const h = Buffer.alloc(head);
  h.write('BTX ', 0, 'latin1');
  h.writeUInt32LE(1, 4); h.writeUInt32LE(0x10, 8);
  h.writeUInt32LE(1, 0x10); h.writeUInt32LE(count, 0x14);
  entries.forEach((e, i) => {
    const p = 0x18 + i * 8;
    h.writeUInt32LE(e.id, p);
    h.writeUInt32LE(offs[i] - p, p + 4);
  });
  // keep the size a multiple of 16 so files packed after it in a pac stay aligned
  if (cur % 16) pool.push(Buffer.alloc(16 - (cur % 16)));
  return Buffer.concat([h, ...pool]);
}

// Rebuilds a pac keeping its original header bytes (flags, entry names) and packing files back to back
function buildPac(orig, files) {
  const count = orig.readUInt16LE(0);
  const hdrLen = files[0].off; // original data start
  const h = Buffer.from(orig.subarray(0, hdrLen));
  let cur = hdrLen;
  files.forEach((f, i) => {
    const e = 8 + i * 0x28;
    h.writeUInt32LE(cur, e + 32);
    h.writeUInt32LE(f.data.length, e + 36);
    cur += f.data.length;
  });
  if (count !== files.length) throw new Error('pac count mismatch');
  h.writeUInt32LE(cur, 4);
  return Buffer.concat([h, ...files.map((f) => f.data)]);
}

module.exports = { parsePac, parseBtx, buildBtx, buildPac };

if (require.main === module) {
  // node btx.js <root dir> -> dumps every BTX (standalone or inside .pac) as JSON on stdout
  const path = require('path');
  const out = {};
  const walk = (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) { walk(p); continue; }
      const rel = path.relative(process.argv[2], p).replace(/\\/g, '/');
      const b = fs.readFileSync(p);
      if (b.toString('latin1', 0, 4) === 'BTX ') out[rel] = parseBtx(b);
      else if (f.endsWith('.pac')) {
        try {
          for (const sub of parsePac(b))
            if (sub.data.toString('latin1', 0, 4) === 'BTX ') out[rel + '#' + sub.name] = parseBtx(sub.data);
        } catch (e) { /* not a pac container */ }
      }
    }
  };
  walk(process.argv[2]);
  process.stdout.write(JSON.stringify(out, null, 1));
}
