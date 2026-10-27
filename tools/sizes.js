// Prints "w h file" for PNGs given on the command line
const fs = require('fs');
const png = require('./png');
for (const f of process.argv.slice(2)) {
  const { w, h } = png.decode(fs.readFileSync(f));
  console.log(w, h, f.replace(/.*gims\//, ''));
}
