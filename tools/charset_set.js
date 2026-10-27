// Set of characters the game's font can draw (= every character in the original script)
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'traducao');
const set = new Set();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')))
  for (const es of Object.values(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))))
    for (const e of es) for (const c of e.jp.replace(/<[^>]*>/g, '')) set.add(c);
module.exports = set;
