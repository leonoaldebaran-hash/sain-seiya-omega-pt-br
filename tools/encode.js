// Converts Portuguese text to what the game's font can draw.
// The font only contains glyphs used by the original Japanese script, which includes the
// whole full-width Latin set (Ａ-Ｚ ａ-ｚ ０-９) but no accented letters and no
// half-width space. So: strip accents, map ASCII to full-width, wrap to the box width.
//   <...>   tags (colors <c#..>, <c>) are copied as-is and take no width
//   {...}   copied as-is in half-width (button letters like {P}, {K})
//   " | "   forced line break
const charset = require('./charset_set');

const PUNCT = { ' ': '　', '!': '！', '?': '？', ',': '，', '.': '．', ':': '：', ';': '；', '(': '（', ')': '）',
  '-': '－', '+': '＋', '=': '＝', '/': '／', '%': '％', '"': '”', "'": '’', '~': '～' };

function fw(ch) {
  ch = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (PUNCT[ch]) return PUNCT[ch];
  const c = ch.charCodeAt(0);
  if (c >= 0x21 && c <= 0x7e) return String.fromCharCode(c + 0xfee0);
  return ch;
}

// split into units: {t:'tag'|'raw'|'ch', s}
function units(text) {
  const out = [];
  const re = /<[^>]*>|\{[^}]*\}|\.\.\.|./gsu;
  for (const m of text.matchAll(re)) {
    const s = m[0];
    if (s[0] === '<' && s.length > 1) out.push({ t: 'tag', s, w: 0 });
    else if (s[0] === '{' && s.length > 1) out.push({ t: 'raw', s: s.slice(1, -1), w: s.length - 2 });
    else if (s === '...') out.push({ t: 'ch', s: '…', w: 1 });
    else out.push({ t: 'ch', s: fw(s), w: 1 });
  }
  return out;
}

function wrap(text, width) {
  const paras = text.split(/\s*\|\s*/);
  const lines = [];
  for (const p of paras) {
    const words = p.split(/ +/).filter(Boolean).map((w) => units(w));
    let cur = [], curW = 0;
    for (const w of words) {
      const ww = w.reduce((a, u) => a + u.w, 0);
      const add = cur.length ? 1 : 0;
      if (cur.length && curW + add + ww > width) { lines.push(cur); cur = []; curW = 0; }
      if (cur.length) { cur.push({ t: 'ch', s: '　', w: 1 }); curW++; }
      cur.push(...w); curW += ww;
    }
    lines.push(cur);
  }
  return lines;
}

function encode(text, width, maxLines) {
  const lines = wrap(text.trim(), width);
  const problems = [];
  const widths = lines.map((l) => l.reduce((a, u) => a + u.w, 0));
  if (lines.length > maxLines) problems.push(`${lines.length} linhas (máx ${maxLines})`);
  if (Math.max(...widths) > width) problems.push(`linha com ${Math.max(...widths)} (máx ${width})`);
  for (const l of lines) for (const u of l) if (u.t !== 'tag') for (const ch of u.s) if (!charset.has(ch)) problems.push(`sem glifo: ${ch}`);
  return { text: lines.map((l) => l.map((u) => u.s).join('')).join('\r\n'), problems };
}

module.exports = { encode };
