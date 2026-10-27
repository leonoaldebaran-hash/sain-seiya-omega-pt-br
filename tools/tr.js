// Translation helper
//   node tools/tr.js show <group> [from] [count] [--all]   list strings (default: untranslated only)
//   node tools/tr.js apply <patch.txt>                    apply a patch
// Patch format: first line = group name (e.g. historia_50), then "<n>\t<texto>" per line.
// <n> is the running index printed by "show". Use " | " for a forced line break.
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'traducao');

function load(group) {
  const f = path.join(DIR, group + '.json');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const flat = [];
  for (const [key, es] of Object.entries(d)) for (const e of es) flat.push({ key, e });
  return { f, d, flat };
}

const [, , cmd, a, b, c, ...rest] = process.argv;
if (cmd === 'show') {
  const { flat } = load(a);
  const all = [b, c, ...rest].includes('--all');
  const from = Number(b) || 0, count = Number(c) || 100000;
  let lastKey = '';
  let shown = 0;
  for (let i = from; i < flat.length && shown < count; i++) {
    const { key, e } = flat[i];
    if (!e.jp || (!all && e.pt)) continue;
    if ([b, c, ...rest].includes('--no-combos') && /^コンボ[０-９]+　/.test(e.jp)) continue;
    if (key !== lastKey) { console.log('## ' + key); lastKey = key; }
    console.log(i + '\t' + e.jp.replace(/\r\n/g, ' / ') + (e.pt ? '\t=> ' + e.pt : ''));
    shown++;
  }
} else if (cmd === 'apply') {
  const lines = fs.readFileSync(a, 'utf8').split(/\r?\n/);
  const group = lines.shift().trim();
  const { f, d, flat } = load(group);
  let n = 0;
  for (const l of lines) {
    if (!l.trim()) continue;
    const t = l.indexOf('\t');
    const i = Number(l.slice(0, t));
    if (!flat[i] || t < 0) throw new Error('bad line: ' + l);
    flat[i].e.pt = l.slice(t + 1).trim();
    n++;
  }
  fs.writeFileSync(f, JSON.stringify(d, null, 1));
  console.log(group + ': ' + n + ' aplicadas');
} else if (cmd === 'progress') {
  for (const g of fs.readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
    const { flat } = load(g.slice(0, -5));
    const tot = flat.filter((x) => x.e.jp).length, done = flat.filter((x) => x.e.jp && x.e.pt).length;
    console.log(g.padEnd(20), done + '/' + tot);
  }
}
