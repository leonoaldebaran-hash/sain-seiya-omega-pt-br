// Line-length statistics of the original Japanese text, per group
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'traducao');
for (const f of fs.readdirSync(dir)) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  let maxLine = 0, maxLines = 0, n = 0, hist = {};
  for (const es of Object.values(d))
    for (const e of es) {
      if (!e.jp) continue;
      n++;
      const lines = e.jp.split('\r\n');
      maxLines = Math.max(maxLines, lines.length);
      for (const l of lines) {
        const len = [...l.replace(/<[^>]*>/g, '')].length;
        maxLine = Math.max(maxLine, len);
        hist[len] = (hist[len] || 0) + 1;
      }
    }
  const top = Object.entries(hist).sort((a, b) => b[0] - a[0]).slice(0, 6).map(([k, v]) => k + 'x' + v).join(' ');
  console.log(f.padEnd(20), 'strings', n, 'maxLine', maxLine, 'maxLines', maxLines, '| longest:', top);
}
