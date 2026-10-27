// Builds the translated ISO.
//   node tools/build.js [--no-iso]
// 1. rebuilds every BTX that has at least one "pt" string (empty "pt" keeps the Japanese)
// 2. applies image overrides from imagens/ (see tools/gim.js)
// 3. patches install.cpk / archive.cpk and writes the PT-BR ISO next to the original
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parsePac, parseBtx, buildBtx, buildPac } = require('./btx');

const ROOT = path.join(__dirname, '..');
const ORIG = path.join(ROOT, 'original');
const BUILD = path.join(ROOT, 'build');
const ISO_IN = process.env.ISO_IN || 'F:/psp/3158 - Saint Seiya Omega - Ultimate Cosmo (Japan).iso';
const ISO_OUT = process.env.ISO_OUT || 'F:/psp/Saint Seiya Omega - Ultimate Cosmo (PT-BR).iso';

fs.rmSync(path.join(BUILD, 'install'), { recursive: true, force: true });
fs.rmSync(path.join(BUILD, 'archive'), { recursive: true, force: true });

// file path -> { inner name (or '' for standalone) -> Buffer }
const changes = {};
const put = (file, inner, data) => { (changes[file] ??= {})[inner] = data; };

// --- text
const { encode } = require('./encode');
const problems = [];
// Box limits come from the original table: widest line and most lines used by the Japanese.
// Story dialogue shares one box, so it uses the limits of the whole story.
// Measured/observed box sizes where the original text did not fill the box.
const LIMITS = {
  'btx/character_name/character_name_jp.btx': [8, 1],
  'scene/mainmenu/mainmenudata.pac#MAINMENU_JP.BTX': [40, 1],
  'scene/characterselect/chara_select_main.pac#SELECT_JP.BTX': [40, 1],
  'scene/storyselect/storyselectdata.pac#STORYSELECT_JP.BTX': [40, 1],
  'scene/key/graphics.pac#KEY_JP.BTX': [40, 1],
};
function limits(key, entries) {
  if (key.startsWith('event/script/')) return [28, 3];
  if (LIMITS[key]) return LIMITS[key];
  // combo list window: original lines fill up to 21; "Combo 7" is 3 chars longer than the Japanese
  if (key.startsWith('btx/combolist/') || /COMBOLIST_JP/.test(key)) return [24, 1];
  // gallery: each profile is its own table, so use the profile window size (21 x 6)
  if (/_PROFILE_JP/.test(key)) return [21, 6];
  if (/gallery\//.test(key)) return [12, 1];
  let w = 0, l = 1;
  for (const e of entries) {
    if (!e.jp) continue;
    const ls = e.jp.split('\r\n');
    l = Math.max(l, ls.length);
    for (const x of ls) w = Math.max(w, [...x.replace(/<[^>]*>/g, '')].length);
  }
  return [w, l];
}
let strings = 0;
for (const f of fs.readdirSync(path.join(ROOT, 'traducao'))) {
  if (!f.endsWith('.json')) continue;
  const tr = JSON.parse(fs.readFileSync(path.join(ROOT, 'traducao', f), 'utf8'));
  for (const [key, entries] of Object.entries(tr)) {
    if (!entries.some((e) => e.pt)) continue;
    const [file, inner = ''] = key.split('#');
    const orig = inner
      ? parsePac(fs.readFileSync(path.join(ORIG, 'install', file))).find((s) => s.name === inner).data
      : fs.readFileSync(path.join(ORIG, 'install', file));
    const map = new Map(entries.map((e) => [e.id, e]));
    const [width, maxLines] = limits(key, entries);
    const rebuilt = parseBtx(orig).map((e) => {
      const t = map.get(e.id);
      if (!t?.pt) return e;
      strings++;
      // per-string override of the box limits: "{w=NN,l=N}" prefix
      let pt = t.pt, w = width, l = maxLines;
      const m = pt.match(/^\{w=(\d+)(?:,l=(\d+))?\}/);
      if (m) { w = Number(m[1]); l = Number(m[2] || l); pt = pt.slice(m[0].length); }
      const r = encode(pt, w, l);
      if (r.problems.length) problems.push(`${f} ${key} #${e.id}: ${r.problems.join('; ')} :: ${t.pt}`);
      return { id: e.id, text: r.text };
    });
    put(file, inner, buildBtx(rebuilt));
  }
}
console.log('textos traduzidos:', strings);
fs.writeFileSync(path.join(BUILD, 'problemas.txt'), problems.join('\n'));
if (problems.length) console.log(`ATENÇÃO: ${problems.length} textos com problema (build/problemas.txt)`);
if (process.argv.includes('--check')) process.exit(0);

// --- images
const gim = require('./gim');
let images = 0;
for (const [file, inner, data] of gim.overrides(ROOT)) { put(file, inner, data); images++; }
console.log('imagens substituídas:', images);

// --- write changed files for both cpks
for (const cpk of ['install', 'archive']) {
  for (const [file, inners] of Object.entries(changes)) {
    const src = path.join(ORIG, cpk, file);
    if (!fs.existsSync(src)) continue;
    let data = fs.readFileSync(src);
    if (inners['']) data = inners[''];
    else {
      const subs = parsePac(data).map((s) => ({ ...s, data: inners[s.name] ?? s.data }));
      data = buildPac(data, subs);
    }
    const dst = path.join(BUILD, cpk, file);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, data);
  }
  execFileSync('node', [path.join(__dirname, 'cpk.js'), 'patch',
    path.join(ORIG, cpk + '.cpk'), path.join(BUILD, cpk + '.cpk'), path.join(BUILD, cpk)], { stdio: 'inherit' });
}

if (!process.argv.includes('--no-iso')) {
  execFileSync('node', [path.join(__dirname, 'iso.js'), ISO_IN, ISO_OUT,
    'PSP_GAME/USRDIR/install.cpk=' + path.join(BUILD, 'install.cpk'),
    'PSP_GAME/USRDIR/archive.cpk=' + path.join(BUILD, 'archive.cpk')], { stdio: 'inherit' });
  console.log('ISO gerada:', ISO_OUT);
}
