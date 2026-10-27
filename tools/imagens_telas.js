// Screen titles, lists, labels, stage thumbnails and brush icons
const fs = require('fs');
const png = require('./png');
const inkbox = require('./inkbox');
const { jobs, out, base, GRAY, SEL, GOLD } = require('./imagens');
const size = (key) => { const { w, h } = png.decode(fs.readFileSync(base(key))); return [w, h]; };

// --- gold screen titles (text starts at x~21, y 1..18)
const titles = {
  'scene/config/graphics.pac#CONF_TITLE.GIM': 'Configurações',
  'scene/key/graphics.pac#CONF_TITLE.GIM': 'Configurações',
  'scene/lobby/resource.pac#NW_TITLE.GIM': 'Lobby Ad Hoc',
  'scene/install/graphics.pac#INSTALL_TITLE.GIM': 'Instalar Dados',
  'scene/characterselect/chara_select_main.pac#ARCADE_TITLE.GIM': 'Modo Arcade',
  'scene/characterselect/chara_select_main.pac#CPU_TITLE.GIM': 'Contra a CPU',
  'scene/characterselect/chara_select_main.pac#NETWORK_TITLE.GIM': 'Ad Hoc',
  'scene/characterselect/chara_select_main.pac#TRAINING_TITLE.GIM': 'Treinamento',
  'scene/storyselect/storyselectdata.pac#STORY_TITLE.GIM': 'Seleção de História',
  'scene/gallery/moviedata.pac#MOVIE_TITLE.GIM': 'Vídeos',
  'scene/gallery/mydatadata.pac#MYDATA_TITLE.GIM': 'Meus Dados',
  'scene/gallery/profiledata.pac#DIC_CHARA_TITLE.GIM': 'Personagens',
};
for (const [key, t] of Object.entries(titles)) {
  const [w, h] = size(key);
  const x = w <= 64 ? 0 : 18;
  jobs.push({ out: out(key), w, h, texts: [{ t, x, y: 0, w: w - x - 2, h: 21, size: 16, align: w <= 64 ? 'center' : 'left', ...GOLD }] });
}

// --- lobby rooms (same two-row style as the main menu buttons)
['Sala Pégaso', 'Sala Águia', 'Sala Leão Menor', 'Sala Dragão', 'Sala Lobo', 'Sala Órion'].forEach((t, i) => {
  jobs.push({ out: out(`scene/lobby/resource.pac#NW_LIST_0${i}.GIM`), w: 128, h: 32, texts: [
    { t, x: 4, y: 0, w: 124, h: 16, size: 12, ...GRAY },
    { t, x: 4, y: 16, w: 124, h: 16, size: 12, ...SEL },
  ] });
});

// --- setup labels on the character select screen (pink)
const PINK = { font: 'Arial', bold: true, fill: ['#ffe4f0', '#e090b8'], outline: '#3a0c1c', ow: 1.3 };
['Força da CPU', 'Tempo', 'Rounds'].forEach((t, i) => {
  jobs.push({ out: out(`scene/characterselect/chara_select_main.pac#SELECT_SET0${i}.GIM`), w: 64, h: 16, texts: [{ t, x: 0, y: 0, w: 64, h: 16, size: 12, ...PINK }] });
});

// --- "Combos" title of the gallery move list (white-blue)
jobs.push({ out: out('scene/gallery/profiledata.pac#DIC_SKILLLIST.GIM'), w: 128, h: 32, texts: [
  { t: 'Combos', x: 12, y: 2, w: 104, h: 26, size: 19, font: 'Arial', bold: true, fill: ['#ffffff', '#a8d4f0'], outline: '#14243c', ow: 1.8 }] });

// --- control type labels (white text on black boxes)
jobs.push({ out: out('scene/key/graphics.pac#CONF_OPERATION.GIM'), w: 64, h: 32, base: base('scene/key/graphics.pac#CONF_OPERATION.GIM'),
  fill: [[3, 1, 58, 13, '#0e0e14'], [3, 17, 58, 13, '#0e0e14']],
  texts: [
    { t: 'Direcional', x: 3, y: 0, w: 58, h: 15, size: 11, font: 'Arial', bold: true, fill: ['#ffffff'] },
    { t: 'Analógico', x: 3, y: 16, w: 58, h: 15, size: 11, font: 'Arial', bold: true, fill: ['#ffffff'] },
  ] });

// --- install message (two lines on a dark band)
jobs.push({ out: out('scene/install/graphics.pac#INSTALL_MESSAGE00.GIM'), w: 512, h: 64, base: base('scene/install/graphics.pac#INSTALL_MESSAGE00.GIM'),
  lerp: [[49, 8, 430, 56]],
  texts: [
    { t: 'Instalando os dados...', x: 40, y: 10, w: 400, h: 20, size: 13, font: 'Arial', bold: true, fill: ['#ffffff'], outline: '#000000a0', ow: 1 },
    { t: 'Não desligue o aparelho nem remova a mídia de gravação.', x: 20, y: 32, w: 440, h: 20, size: 13, font: 'Arial', bold: true, fill: ['#ffffff'], outline: '#000000a0', ow: 1 },
  ] });

// --- story map stage list (right aligned at x=116, one name per row)
const STAGE_ROWS = [[2, 21], [25, 45], [50, 69], [73, 94], [97, 118], [121, 141], [145, 165], [170, 189], [193, 213], [217, 237]];
const STAGE_LIST = ['Praça do Porto', 'Mansão Julian', 'Praia', 'Campo do Sul', 'Campo do Norte', 'Floresta Silenciosa',
  'Ruínas da Arena', 'Caverna Antiga', 'Templo de Poseidon', 'Templo Subterrâneo'];
const CALLI = { font: 'Georgia', bold: true, fill: ['#f4ffff', '#9ad8f0'], outline: '#0c1a2a', ow: 1.6 };
jobs.push({ out: out('scene/adv/adv.pac#MAP_STAGE_02.GIM'), w: 128, h: 256,
  texts: STAGE_LIST.map((t, i) => ({ t, x: 0, y: STAGE_ROWS[i][0], w: 117, h: STAGE_ROWS[i][1] - STAGE_ROWS[i][0] + 1, size: 14, align: 'right', ...CALLI })) });

// --- stage thumbnails: replace the name in the title band
const STAGES = { ARENA: 'Ruínas da Arena', BEACH: 'Praia', CAVE: 'Caverna Antiga', FOREST: 'Floresta Silenciosa', SHRINE: 'Templo Subterrâneo',
  PRAIRIE: 'Campo (Dia)', POSEIDON: 'Templo de Poseidon', SUNSET: 'Campo (Tarde)', TOWN: 'Praça do Porto', VILLA: 'Mansão Julian' };
for (const [n, t] of Object.entries(STAGES))
  for (const key of [`scene/characterselect/chara_select_main.pac#SELECT_STAGE_${n}.GIM`, `common/image/select_stage_${n.toLowerCase()}.pac#SELECT_STAGE_${n}.GIM`]) {
    const box = inkbox(base(key), [30, 34, 200, 66]);
    if (!box) { console.error('sem texto:', key); continue; }
    const [x0, y0, , y1] = box;
    jobs.push({ out: out(key), w: 256, h: 256, base: base(key),
      lerp: [[x0 - 1, y0 - 1, 196, y1 + 1]],
      texts: [{ t, x: x0 - 1, y: y0 - 2, w: 196 - x0, h: y1 - y0 + 4, size: 13, align: 'left', ...CALLI }] });
  }

// --- brush icons with hand-written names (white ink on a black brush)
const BRUSH = { edev2: ['Éden', 'Var.'], gen: ['Genbu'], hatv2: ['Haruto', 'Var.'], ion: ['Ionia'], iti: ['Ichi'], jyu: ['Poseidon'],
  kik: ['Kiki'], kogv2: ['Kouga', 'Var.'], mik: ['Mycenae'], pab: ['Pavlin'], ryov2: ['Ryuho', 'Var.'], soi: ['Sonia'],
  somv2: ['Souma', 'Var.'], sot: ['Sorento'], syu: ['Shun'], yunv2: ['Yuna', 'Var.'] };
const INK = { font: 'Segoe Print', bold: true, fill: ['#ffffff'] };
for (const [k, lines] of Object.entries(BRUSH)) {
  const key = `common/image/select_pic_${k}.pac#SELECT_PIC_${k.toUpperCase()}.GIM`;
  const [w, h] = size(key);
  const box = inkbox(base(key), [0, 0, w - 1, h - 1], 360);
  if (!box) { console.error('sem texto:', key); continue; }
  const [x0, y0, x1, y1] = box;
  const lh = (y1 - y0 + 3) / lines.length;
  jobs.push({ out: out(key), w, h, base: base(key), darken: [[Math.max(x0 - 2, 0), Math.max(y0 - 2, 0), Math.min(x1 + 2, w - 1), Math.min(y1 + 2, h - 1)]],
    texts: lines.map((t, i) => ({ t, x: x0 - 2, y: y0 - 1 + i * lh, w: Math.max(x1 - x0 + 4, 60), h: lh, size: 15, align: 'left', ...INK })) });
}
// the same brush placeholder also exists inside the character select pack
{
  const key = 'scene/characterselect/chara_select_main.pac#SELECT_PIC_SYU.GIM';
  const [w, h] = size(key);
  const box = inkbox(base(key), [0, 0, w - 1, h - 1], 360);
  if (box) {
    const [x0, y0, x1, y1] = box;
    jobs.push({ out: out(key), w, h, base: base(key), darken: [[Math.max(x0 - 2, 0), Math.max(y0 - 2, 0), Math.min(x1 + 2, w - 1), Math.min(y1 + 2, h - 1)]],
      texts: [{ t: 'Shun', x: x0 - 2, y: y0 - 1, w: Math.max(x1 - x0 + 4, 60), h: y1 - y0 + 3, size: 15, align: 'left', ...INK }] });
  }
}
