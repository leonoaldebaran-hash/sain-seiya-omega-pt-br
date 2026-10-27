// ISO9660 file replacer: node iso.js <in.iso> <out.iso> <isoPath>=<localFile> [...]
// Files that fit in their original sectors are overwritten in place; larger ones are
// appended at the end of the image and their directory records repointed.
const fs = require('fs');
const SECTOR = 2048;

function readSector(fd, lba, count = 1) {
  const b = Buffer.alloc(SECTOR * count);
  fs.readSync(fd, b, 0, b.length, lba * SECTOR);
  return b;
}

// Returns {recordPos (absolute byte offset of the directory record), lba, size}
function findRecord(fd, isoPath) {
  const pvd = readSector(fd, 16);
  if (pvd.toString('latin1', 1, 6) !== 'CD001') throw new Error('not ISO9660');
  let dirLba = pvd.readUInt32LE(156 + 2), dirSize = pvd.readUInt32LE(156 + 10);
  const parts = isoPath.replace(/\\/g, '/').split('/').filter(Boolean);
  for (let pi = 0; pi < parts.length; pi++) {
    const want = parts[pi].toUpperCase();
    const data = readSector(fd, dirLba, Math.ceil(dirSize / SECTOR));
    let p = 0, found = null;
    while (p < dirSize) {
      const len = data[p];
      if (len === 0) { p = (Math.floor(p / SECTOR) + 1) * SECTOR; continue; }
      const nameLen = data[p + 32];
      let name = data.toString('latin1', p + 33, p + 33 + nameLen).toUpperCase();
      name = name.replace(/;1$/, '');
      if (name === want) {
        found = { recordPos: dirLba * SECTOR + p, lba: data.readUInt32LE(p + 2), size: data.readUInt32LE(p + 10) };
        break;
      }
      p += len;
    }
    if (!found) throw new Error('not found: ' + isoPath);
    if (pi === parts.length - 1) return found;
    dirLba = found.lba; dirSize = found.size;
  }
}

function both32(v) {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(v, 0); b.writeUInt32BE(v, 4);
  return b;
}

const [, , inIso, outIso, ...reps] = process.argv;
if (inIso !== outIso) fs.copyFileSync(inIso, outIso);
const fd = fs.openSync(outIso, 'r+');
let endLba = Math.ceil(fs.fstatSync(fd).size / SECTOR);
for (const r of reps) {
  const [isoPath, local] = r.split('=');
  const rec = findRecord(fd, isoPath);
  const data = fs.readFileSync(local);
  const oldSectors = Math.ceil(rec.size / SECTOR);
  const newSectors = Math.ceil(data.length / SECTOR);
  let lba = rec.lba;
  if (newSectors > oldSectors) { lba = endLba; endLba += newSectors; }
  const padded = Buffer.alloc(newSectors * SECTOR);
  data.copy(padded);
  fs.writeSync(fd, padded, 0, padded.length, lba * SECTOR);
  fs.writeSync(fd, both32(lba), 0, 8, rec.recordPos + 2);
  fs.writeSync(fd, both32(data.length), 0, 8, rec.recordPos + 10);
  console.error(`${isoPath}: ${rec.size} -> ${data.length} bytes at LBA ${lba}${lba === rec.lba ? ' (in place)' : ' (appended)'}`);
}
// volume space size in the primary volume descriptor
fs.writeSync(fd, both32(endLba), 0, 8, 16 * SECTOR + 80);
fs.ftruncateSync(fd, endLba * SECTOR);
fs.closeSync(fd);
