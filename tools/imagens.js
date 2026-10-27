// Describes every translated texture and writes tools/jobs.json for render.ps1.
//   node tools/imagens.js && powershell -File tools/render.ps1 tools/jobs.json
// Output PNGs go to imagens/<file>#<GIM>.png, picked up by the build.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const GIMS = process.env.GIMS; // folder from "node tools/gim.js dump"
const jobs = [];
const out = (key) => path.join(ROOT, 'imagens', key + '.png');
const base = (key) => path.join(GIMS, key + '.png');

// --- styles copied from the originals
const GRAY = { font: 'Arial', bold: true, fill: ['#c8c8c8', '#8a8a8a'], outline: '#2a2a2a', ow: 1.2 };
const SEL = { font: 'Arial', bold: true, fill: ['#ffffff', '#dfe8ff'], outline: '#1d3fb8', ow: 1.6, outline2: '#ffffff', ow2: 2.4 };
const GOLD = { font: 'Arial', bold: true, fill: ['#fff3b0', '#f0a030'], outline: '#3a1c00', ow: 1.5 };

// main menu mode buttons: 128x32, top row = not selected, bottom row = selected
const LIST = ['Modo História', 'Modo Arcade', 'Modo VS', 'Treinamento', 'Galeria', 'Configurações', 'Instalar Dados',
  'Contra a CPU', 'Lutar Ad Hoc', 'Treino Livre', 'Tutorial', 'Personagens', 'Ilustrações', 'Vídeos', 'Replays', 'Meus Dados'];
LIST.forEach((t, i) => {
  const key = `scene/mainmenu/mainmenudata.pac#MAIN_LIST_${String(i).padStart(2, '0')}.GIM`;
  jobs.push({ out: out(key), w: 128, h: 32, texts: [
    { t, x: 4, y: 0, w: 124, h: 16, size: 12, ...GRAY },
    { t, x: 4, y: 16, w: 124, h: 16, size: 12, ...SEL },
  ] });
});

const title = (key, w, t) => jobs.push({ out: out(key), w, h: 32, texts: [{ t, x: 18, y: 0, w: w - 22, h: 22, size: 16, align: 'left', ...GOLD }] });
title('scene/mainmenu/mainmenudata.pac#DIC_TITLE.GIM', 256, 'Galeria');
title('scene/mainmenu/mainmenudata.pac#MAIN_TITLE.GIM', 256, 'Menu Principal');
title('scene/mainmenu/mainmenudata.pac#TRAINING_TITLE.GIM', 256, 'Treinamento');
title('scene/mainmenu/mainmenudata.pac#VS_TITLE.GIM', 128, 'Modo VS');

module.exports = { jobs, out, base, GRAY, SEL, GOLD };

if (require.main === module) {
  for (const extra of fs.readdirSync(__dirname).filter((f) => /^imagens_.*\.js$/.test(f))) require('./' + extra);
  fs.writeFileSync(path.join(__dirname, 'jobs.json'), JSON.stringify(jobs, null, 1));
  console.log('jobs:', jobs.length);
}
