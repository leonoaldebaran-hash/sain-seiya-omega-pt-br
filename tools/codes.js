// Lists control sequences / half-width runs found in the original text
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'traducao');
const tags = {}, hw = {};
for (const f of fs.readdirSync(dir))
  for (const es of Object.values(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))))
    for (const e of es) {
      for (const m of e.jp.matchAll(/<[^>]*>/g)) tags[m[0].replace(/:[^>]*/, ':…')] = (tags[m[0].replace(/:[^>]*/, ':…')] || 0) + 1;
      for (const m of e.jp.replace(/<[^>]*>/g, '').matchAll(/[\x21-\x7e]+/g)) hw[m[0]] = (hw[m[0]] || 0) + 1;
    }
console.log('tags', tags);
console.log('half-width runs', hw);
