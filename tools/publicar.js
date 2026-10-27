// Copies the publishable part of the project into repositorio/ (the GitHub clone):
// our tools + the Portuguese translations. Nothing extracted from the game goes there:
// no ISO/CPK data, no textures, and the Japanese "jp" field is stripped
// (node tools/export.js puts it back from the user's own ISO).
//   node tools/publicar.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const REPO = path.join(ROOT, 'repositorio');
const SKIP = new Set(['jobs.json', 'jobs_part.json', 'capa.json']);

fs.mkdirSync(path.join(REPO, 'tools'), { recursive: true });
fs.mkdirSync(path.join(REPO, 'traducao'), { recursive: true });
for (const f of fs.readdirSync(__dirname))
  if (!SKIP.has(f)) fs.copyFileSync(path.join(__dirname, f), path.join(REPO, 'tools', f));

let n = 0;
for (const f of fs.readdirSync(path.join(ROOT, 'traducao')).filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'traducao', f), 'utf8'));
  const out = {};
  for (const [key, es] of Object.entries(d)) {
    const kept = es.filter((e) => e.pt).map((e) => ({ id: e.id, pt: e.pt }));
    if (kept.length) { out[key] = kept; n += kept.length; }
  }
  fs.writeFileSync(path.join(REPO, 'traducao', f), JSON.stringify(out, null, 1) + '\n');
}
console.log('repositorio/ atualizado:', n, 'textos');
