// Converts Portuguese text to what the game's font can draw.
// With the rebuilt font (fonte/FONT.FNT, see tools/fonte.js) the text keeps its accents and uses
// normal proportional letters; lines are wrapped by pixel width using the font's advances.
// Without it (fonte/metricas.json missing) it falls back to the original font: full-width
// letters (Ａ-Ｚ ａ-ｚ ０-９), no accents, ideographic space.
//   <...>   tags (colors <c#..>, <c>) are copied as-is and take no width
//   {...}   copied as-is (button letters like {P}, {K})
//   " | "   forced line break
// Box limits arrive in full-width character units (15 px each in the game font).
const fs = require('fs');
const path = require('path');

const METRICS = path.join(__dirname, '..', 'fonte', 'metricas.json');
const latin = fs.existsSync(METRICS);
const ADV = latin ? JSON.parse(fs.readFileSync(METRICS, 'utf8')) : null;
const charset = latin ? new Set(Object.keys(ADV)) : require('./charset_set');
const UNIT = 15; // px of one full-width character

const PUNCT = { ' ': '　', '!': '！', '?': '？', ',': '，', '.': '．', ':': '：', ';': '；', '(': '（', ')': '）',
  '-': '－', '+': '＋', '=': '＝', '/': '／', '%': '％', '"': '”', "'": '’', '~': '～' };

function conv(ch) {
  if (latin) return ch;
  ch = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (PUNCT[ch]) return PUNCT[ch];
  const c = ch.charCodeAt(0);
  if (c >= 0x21 && c <= 0x7e) return String.fromCharCode(c + 0xfee0);
  return ch;
}
const width = (s) => (latin ? [...s].reduce((a, c) => a + (ADV[c] ?? UNIT), 0) : [...s].length * UNIT);
const SPACE = latin ? ' ' : '　';

// split into units: {t:'tag'|'raw'|'ch', s, w}
function units(text) {
  const out = [];
  const re = /<[^>]*>|\{[^}]*\}|\.\.\.|./gsu;
  for (const m of text.matchAll(re)) {
    const s = m[0];
    if (s[0] === '<' && s.length > 1) out.push({ t: 'tag', s, w: 0 });
    else if (s[0] === '{' && s.length > 1) { const r = s.slice(1, -1); out.push({ t: 'raw', s: r, w: width(r) }); }
    else if (s === '...') out.push({ t: 'ch', s: '…', w: width('…') });
    else { const c = conv(s); out.push({ t: 'ch', s: c, w: width(c) }); }
  }
  return out;
}

function wrap(text, maxW) {
  const paras = text.split(/\s*\|\s*/);
  const lines = [];
  const sp = width(SPACE);
  for (const p of paras) {
    const words = p.split(/ +/).filter(Boolean).map((w) => units(w));
    let cur = [], curW = 0;
    for (const w of words) {
      const ww = w.reduce((a, u) => a + u.w, 0);
      if (cur.length && curW + sp + ww > maxW) { lines.push(cur); cur = []; curW = 0; }
      if (cur.length) { cur.push({ t: 'ch', s: SPACE, w: sp }); curW += sp; }
      cur.push(...w); curW += ww;
    }
    lines.push(cur);
  }
  return lines;
}

function encode(text, widthUnits, maxLines) {
  const maxW = widthUnits * UNIT;
  const lines = wrap(text.trim(), maxW);
  const problems = [];
  const widths = lines.map((l) => l.reduce((a, u) => a + u.w, 0));
  if (lines.length > maxLines) problems.push(`${lines.length} linhas (máx ${maxLines})`);
  if (Math.max(...widths) > maxW) problems.push(`linha com ${Math.round(Math.max(...widths))}px (máx ${maxW}px)`);
  for (const l of lines) for (const u of l) if (u.t !== 'tag') for (const ch of u.s) if (!charset.has(ch)) problems.push(`sem glifo: ${ch}`);
  return { text: lines.map((l) => l.map((u) => u.s).join('')).join('\r\n'), problems };
}

module.exports = { encode, latin };
