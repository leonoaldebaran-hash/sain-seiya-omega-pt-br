// Looks for the game's font character table inside the decrypted EBOOT
const fs = require('fs');
const b = fs.readFileSync(process.argv[2]);
const charset = require('./charset_set');
const want = [...charset].filter((c) => c.charCodeAt(0) > 0x7f);

// 1) runs of UTF-16LE values that belong to the game's charset
let best = [];
for (const align of [0, 1]) {
  let run = 0, start = 0;
  for (let i = align; i + 1 < b.length; i += 2) {
    const c = String.fromCharCode(b.readUInt16LE(i));
    if (charset.has(c) && c.charCodeAt(0) > 0x7f) { if (!run) start = i; run++; }
    else { if (run > 30) best.push([run, start, 'utf16le']); run = 0; }
  }
}
// 2) the same in UTF-16BE and Shift-JIS
const td = new TextDecoder('shift_jis');
{
  let run = 0, start = 0;
  for (let i = 0; i + 1 < b.length; i++) {
    const c1 = b[i];
    if ((c1 >= 0x81 && c1 <= 0x9f) || (c1 >= 0xe0 && c1 <= 0xef)) {
      const ch = td.decode(b.subarray(i, i + 2));
      if (charset.has(ch)) { if (!run) start = i; run++; i++; continue; }
    }
    if (run > 30) best.push([run, start, 'sjis']);
    run = 0;
  }
}
best.sort((x, y) => y[0] - x[0]);
console.log('caracteres do jogo (não-ASCII):', want.length);
for (const [run, start, enc] of best.slice(0, 12)) {
  const s = enc === 'sjis' ? td.decode(b.subarray(start, start + 40)) : b.toString('utf16le', start, start + 40);
  console.log(enc, 'offset 0x' + start.toString(16), 'tamanho', run, JSON.stringify(s));
}
