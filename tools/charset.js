// Reports which Latin characters exist in the original game text (= glyphs guaranteed to render)
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'traducao');
const set = new Set();
for (const f of fs.readdirSync(dir))
  for (const es of Object.values(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))))
    for (const e of es) for (const c of e.jp) set.add(c);
const have = (s) => [...s].map((c) => (set.has(c) ? c : '_')).join('');
console.log('FW upper', have('ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ'));
console.log('FW lower', have('ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ'));
console.log('FW digit', have('０１２３４５６７８９'));
console.log('FW punct', have('　！？，．、。：；（）「」『』－ー～…・＋＝／％”’＂＇'));
console.log('HW', have('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !?,.:;()-+/%\''));
console.log('total chars', set.size);
module.exports = set;
