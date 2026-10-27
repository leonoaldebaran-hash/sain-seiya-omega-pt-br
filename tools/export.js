// Exports every BTX string table into traducao/<group>.json for translation.
// Existing "pt" values are preserved, so it is safe to re-run.
//   node tools/export.js
const fs = require('fs');
const path = require('path');
const { parsePac, parseBtx } = require('./btx');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'original', 'install');
const OUT = path.join(ROOT, 'traducao');

function groupOf(key) {
  if (key.startsWith('event/script/')) return 'historia_' + key.split('/')[2].slice(0, 2);
  if (key.startsWith('btx/combolist')) return 'golpes';
  if (key.startsWith('btx/system')) return 'sistema';
  if (key.startsWith('scene/gallery')) return 'galeria';
  return 'menus';
}

const all = {};
const walk = (d) => {
  for (const f of fs.readdirSync(d).sort()) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    const rel = path.relative(SRC, p).replace(/\\/g, '/');
    const b = fs.readFileSync(p);
    if (b.toString('latin1', 0, 4) === 'BTX ') all[rel] = parseBtx(b);
    else if (f.endsWith('.pac')) {
      let subs;
      try { subs = parsePac(b); } catch { continue; }
      for (const s of subs)
        if (s.data.toString('latin1', 0, 4) === 'BTX ') all[rel + '#' + s.name] = parseBtx(s.data);
    }
  }
};
walk(SRC);

const groups = {};
for (const [key, entries] of Object.entries(all)) {
  if (!entries.some((e) => e.text)) continue;
  (groups[groupOf(key)] ??= {})[key] = entries;
}

for (const [g, files] of Object.entries(groups)) {
  const dst = path.join(OUT, g + '.json');
  const prev = fs.existsSync(dst) ? JSON.parse(fs.readFileSync(dst, 'utf8')) : {};
  const out = {};
  for (const [key, entries] of Object.entries(files)) {
    out[key] = entries.map((e) => {
      const old = prev[key]?.find((x) => x.id === e.id);
      return { id: e.id, jp: e.text, pt: old?.pt ?? '' };
    });
  }
  fs.writeFileSync(dst, JSON.stringify(out, null, 1));
  console.log(g, Object.keys(out).length, 'tabelas');
}
