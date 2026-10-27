// Button guide bars: [iconX0, iconX1, word] measured with tools/cols.js
const { jobs, out, base } = require('./imagens');

const STD = (a, b, c) => [[32, 42, a], [64, 74, b], [97, 107, c]]; // standard 128x16 bar
const G = {
  'scene/mainmenu/mainmenudata.pac#MENU_GUIDE_01.GIM': STD('Mover', 'OK', 'Voltar'),
  'scene/storyselect/storyselectdata.pac#MENU_GUIDE_00.GIM': STD('Mover', 'OK', 'Voltar'),
  'scene/characterselect/chara_select_main.pac#SELECT_GUIDE_01.GIM': STD('Mover', 'OK', 'Voltar'),
  'scene/characterselect/chara_select_main.pac#SELECT_GUIDE_03.GIM': STD('Mover', 'OK', 'Voltar'),
  'scene/lobby/resource.pac#MENU_GUIDE_00.GIM': STD('Mover', 'OK', 'Voltar'),
  'scene/gallery/moviedata.pac#DIC_GUIDE_05.GIM': STD('Mover', 'Assistir', 'Voltar'),
  'scene/gallery/profiledata.pac#DIC_GUIDE_05.GIM': STD('Mover', 'OK', 'Voltar'),
  'scene/gallery/profiledata.pac#DIC_GUIDE_07.GIM': STD('Mover', 'OK', 'Voltar'),
  'scene/characterselect/chara_select_main.pac#SELECT_GUIDE_00.GIM': [[79, 89, 'Mover'], [110, 122, 'OK'], [143, 155, 'Voltar'], [174, 197, 'Handicap']],
  'scene/characterselect/chara_select_main.pac#SELECT_GUIDE_02.GIM': [[109, 118, 'Mover'], [139, 150, 'Ajustar'], [192, 202, 'OK'], [225, 235, 'Voltar']],
  'scene/gallery/eventcgdata.pac#DIC_GUIDE_04.GIM': [[80, 90, 'Mover'], [112, 122, 'Zoom'], [145, 155, 'Voltar'], [175, 198, 'Página']],
  'scene/gallery/profiledata.pac#DIC_GUIDE_00.GIM': [[15, 25, 'Voltar'], [45, 55, 'Modelo 3D'], [116, 126, 'Lista'], [179, 202, 'Personagem']],
  'scene/gallery/profiledata.pac#DIC_GUIDE_03.GIM': [[55, 64, 'Mover'], [85, 96, 'Voltar'], [115, 127, 'Lista'], [179, 202, 'Personagem']],
  'scene/gallery/mydatadata.pac#DIC_GUIDE_06.GIM': [[33, 43, 'Voltar']],
  'scene/gallery/profiledata.pac#DIC_GUIDE_01.GIM': [[125, 135, 'Girar'], [156, 178, 'Zoom'], [222, 249, 'Câmera'], [291, 302, 'Voltar'], [320, 331, 'Armadura'], [378, 390, 'Cor'], [438, 461, 'Personagem']],
  'scene/config/graphics.pac#CONFU_GUIDE_00.GIM': [[238, 248, 'Item'], [287, 297, 'Ajustar'], [339, 351, 'OK'], [373, 385, 'Concluir'], [424, 449, 'Padrão']],
  'scene/key/graphics.pac#CONFU_GUIDE_01.GIM': [[16, 25, 'Item'], [64, 74, 'Ajustar'], [117, 129, 'Concluir'], [168, 193, 'Padrão']],
  'scene/install/graphics.pac#INSTALL_KEYHELP.GIM': [[13, 29, 'Cancelar']],
  'scene/adv/adv.pac#RST_GUIDE.GIM': [[13, 28, 'Próximo']],
  'scene/battle/battleui/battleui.pac#RST_GUIDE.GIM': [[13, 28, 'Próximo']],
};
// story guides: floating icon + text, no bar
const NOBAR = {
  'scene/adv/adv.pac#ADV_GUIDE_00.GIM': [[3, 12, 'Anterior']],
  'scene/adv/adv.pac#ADV_GUIDE_01.GIM': [[3, 10, 'Pular']],
  'scene/adv/adv.pac#ADV_GUIDE_02.GIM': [[3, 9, 'Voltar']],
  'scene/adv/adv.pac#ADV_GUIDE_03.GIM': [[3, 12, 'Próxima']],
  'scene/adv/adv.pac#ADV_GUIDE_04.GIM': [[3, 9, 'Ver']],
};
const png = require('./png');
const fs = require('fs');
for (const [set, nobar] of [[G, false], [NOBAR, true]])
  for (const [key, items] of Object.entries(set)) {
    const { w, h } = png.decode(fs.readFileSync(base(key)));
    jobs.push({ out: out(key), w, h, base: base(key), guide: { items, size: nobar ? 12 : h > 16 ? 13 : 10, nobar } });
  }
