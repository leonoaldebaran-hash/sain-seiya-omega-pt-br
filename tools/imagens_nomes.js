// Character name labels: story speaker names (ADV_NAME), gold names (MENU_NAME, several copies),
// battle HUD names, story select buttons and the "My Data" favourite cards
const fs = require('fs');
const png = require('./png');
const inkbox = require('./inkbox');
const { jobs, out, base } = require('./imagens');
const has = (key) => fs.existsSync(base(key));
const size = (key) => { const { w, h } = png.decode(fs.readFileSync(base(key))); return [w, h]; };

const NAME = {
  ATE: 'Atena', EDE: 'Éden', GEN: 'Genbu', HAT: 'Haruto', ION: 'Ionia', ITI: 'Ichi', JYU: 'Poseidon', KIK: 'Kiki',
  KOG: 'Kouga', MAN: 'Estranho', MIK: 'Mycenae', PAB: 'Pavlin', QUESTION: '???', RYO: 'Ryuho', SAO: 'Saori', SEY: 'Seiya',
  SHN: 'Shaina', SHU: 'Shun', SOI: 'Sonia', SOM: 'Souma', SOT: 'Sorento', YUN: 'Yuna', R: '???', RANDOM: '???',
};
const CHARS = ['EDE', 'EDEV2', 'GEN', 'HAT', 'HATV2', 'ION', 'ITI', 'JYU', 'KIK', 'KOG', 'KOGV2', 'MIK', 'PAB', 'RYO', 'RYOV2',
  'SEY', 'SHN', 'SHU', 'SOI', 'SOM', 'SOMV2', 'SOT', 'YUN', 'YUNV2'];
const nameOf = (c) => NAME[c.replace('V2', '')];

// --- story speaker names: cream text, dark navy outline, 16 px high
const ADV = { font: 'Arial Narrow', bold: true, fill: ['#fffbe8', '#f0d890'], outline: '#1c1438', ow: 1.4 };
for (const k of ['ATE', 'EDE', 'GEN', 'HAT', 'ION', 'ITI', 'JYU', 'KIK', 'KOG', 'MAN', 'MIK', 'PAB', 'QUESTION', 'RYO', 'SAO', 'SEY', 'SHN', 'SHU', 'SOI', 'SOM', 'SOT', 'YUN']) {
  const key = `common/globalobject.pac#ADV_NAME_${k}.GIM`;
  const [w] = size(key);
  jobs.push({ out: out(key), w, h: 16, texts: [{ t: NAME[k], x: 0, y: 0, w, h: 16, size: 13, ...ADV }] });
}

// --- gold italic names with dark shadow; "V2" = Triton Scale version (two lines)
const GOLDN = { font: 'Georgia', bold: true, italic: true, fill: ['#fff6c0', '#d8a020'], outline: '#5a3a00', ow: 0.8, shadow: '#000000c0', sdx: 1.5, sdy: 1.5 };
function goldName(key, c) {
  const [w, h] = size(key);
  const t = nameOf(c);
  if (/V2/.test(c) && h >= 64) {
    jobs.push({ out: out(key), w, h, texts: [
      { t, x: 8, y: 4, w: w - 16, h: h * 0.5, size: h * 0.36, align: 'center', ...GOLDN },
      { t: '(Escama de Tritão)', x: 4, y: h * 0.52, w: w - 8, h: h * 0.4, size: h * 0.24, align: 'center', ...GOLDN },
    ] });
  } else {
    jobs.push({ out: out(key), w, h, texts: [{ t, x: 2, y: 2, w: w - 4, h: h - 4, size: h * 0.55, ...GOLDN }] });
  }
}
for (const c of [...CHARS, 'RANDOM']) {
  const lc = c.toLowerCase();
  const variants = [
    c === 'RANDOM' ? 'common/menu/menu_name_random.pac#MENU_NAME_RANDOM.GIM' : `common/menu/menu_name_${lc}_01.pac#MENU_NAME_${c}_01.GIM`,
    `scene/characterselect/chara_select_main.pac#MENU_NAME_${c === 'RANDOM' ? 'RANDOM' : c + '_01'}.GIM`,
    `scene/gallery/profiledata.pac#MENU_NAME_${c}_00.GIM`,
    `scene/gallery/profiledata.pac#MENU_NAME_${c}_01.GIM`,
    `scene/gallery/mydatadata.pac#MENU_NAME_${c}_00.GIM`,
    `scene/gallery/mydatadata.pac#MENU_NAME_${c}_01.GIM`,
  ];
  for (const key of variants) if (has(key)) goldName(key, c);
}
// story select: big names, "???" and the word "Saga". In game the "Saga" image is drawn right
// after the name image and overlaps its right side, so the name keeps clear of the last 34 px.
for (const c of ['EDE', 'HAT', 'KOG', 'RYO', 'SEY', 'SOM', 'YUN', 'R']) {
  const key = `scene/storyselect/storyselectdata.pac#MENU_NAME_${c}_00.GIM`;
  const [w, h] = size(key);
  jobs.push({ out: out(key), w, h, texts: [{ t: NAME[c], x: 2, y: 2, w: w - 36, h: h - 4, size: h * 0.55, align: 'right', ...GOLDN }] });
}
jobs.push({ out: out('scene/storyselect/storyselectdata.pac#MENU_NAME_STORY.GIM'), w: 64, h: 64, texts: [{ t: 'Saga', x: 6, y: 14, w: 56, h: 40, size: 22, align: 'left', ...GOLDN }] });

// --- story select buttons: gray (left) and blue (right) halves, "<Name>" replaces "<Name>編"
for (const c of ['EDE', 'HAT', 'KOG', 'RYO', 'SEY', 'SOM', 'YUN']) {
  const key = `scene/storyselect/storyselectdata.pac#STORY_BTTN_${c}.GIM`;
  const lerp = [], texts = [];
  // fixed boxes around the original "<name>編" text of each half (the gray text is too dim to detect)
  for (const [b, fill] of [[[63, 7, 108, 24], ['#d8d8d8', '#9a9a9a']], [[190, 7, 236, 24], ['#ffffff', '#e8f0ff']]]) {
    lerp.push(b);
    // only the name, left aligned: on the selected button a wing ornament covers the right end
    texts.push({ t: NAME[c], x: b[0] - 2, y: b[1] - 2, w: b[2] - b[0] + 4, h: b[3] - b[1] + 4, size: 12, align: 'left', font: 'Arial', bold: true, fill, outline: '#101018', ow: 1 });
  }
  jobs.push({ out: out(key), w: 256, h: 32, base: base(key), lerp, texts });
}

// --- battle HUD names: white with navy outline
const HUD = { font: 'Arial Narrow', bold: true, fill: ['#ffffff', '#d8e0f0'], outline: '#141c40', ow: 1.3 };
for (const c of CHARS) {
  const key = `scene/battle/battleui/${c.toLowerCase()}.pac#BATTLE_NAME_${c}.GIM`;
  if (!has(key)) continue;
  const [w, h] = size(key);
  jobs.push({ out: out(key), w, h, texts: [{ t: nameOf(c), x: 0, y: 0, w, h, size: h * 0.8, ...HUD }] });
}

// --- "My Data" cards: small plate with "favourite character" + name
for (const c of CHARS) {
  const key = `scene/gallery/mydatadata.pac#DIC_MYDATA_CHARA_${c}.GIM`;
  if (!has(key)) continue;
  const [w, h] = size(key);
  const top = inkbox(base(key), [110, 175, w - 1, 205], 450);
  const bot = inkbox(base(key), [110, 206, w - 1, 240], 450);
  if (!top || !bot) { console.error('placa não encontrada:', key); continue; }
  jobs.push({ out: out(key), w, h, base: base(key),
    lerp: [[top[0] - 1, top[1] - 1, top[2] + 1, top[3] + 1], [bot[0] - 1, bot[1] - 1, bot[2] + 1, bot[3] + 1]],
    texts: [
      { t: 'Personagem favorito', x: top[0] - 12, y: top[1] - 1, w: top[2] - top[0] + 14, h: top[3] - top[1] + 3, size: 9, align: 'right', font: 'Arial', bold: true, fill: ['#ffffff'] },
      { t: nameOf(c), x: bot[0] - 20, y: bot[1] - 2, w: bot[2] - bot[0] + 22, h: bot[3] - bot[1] + 4, size: 14, align: 'right', ...GOLDN },
    ] });
}
