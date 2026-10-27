// Startup notices, title copyright line and the hold/tap button icons
const { jobs, out, base } = require('./imagens');

const BODY = { font: 'Arial', bold: true, fill: ['#3c3c3c'], size: 12.5, align: 'left' };
const RED = { font: 'Arial', bold: true, fill: ['#d03018'], align: 'center' };
function notice(key, lines) {
  const texts = [{ t: 'Atenção', x: 52, y: 38, w: 376, h: 26, size: 17, ...RED }];
  const top = 84, step = Math.min(19, 160 / lines.length);
  lines.forEach((l, i) => {
    const [t, red] = Array.isArray(l) ? l : [l, false];
    texts.push({ t, x: 60, y: top + i * step, w: 362, h: step, ...BODY, ...(red ? { fill: ['#d03018'] } : {}) });
  });
  // erase the interior row by row between the panel's inner edges, keeping its shading
  jobs.push({ out: out(key), w: 480, h: 272, base: base(key), lerp: [[50, 20, 430, 250]], texts });
}
notice('scene/logo/data.pac#LOGO_AUTOSAVE.GIM', [
  'Este jogo possui salvamento automático.',
  'Durante o salvamento, a luz de acesso',
  'do Memory Stick™ fica piscando.',
  'Nesse momento, não remova a mídia de',
  'gravação nem desligue o aparelho.',
]);
notice('scene/logo/data.pac#LOGO_COPY.GIM', [
  'Distribuir este jogo pela internet sem a',
  'autorização dos detentores dos direitos',
  ['é crime e viola a lei de direitos autorais.', true],
  'Desde janeiro de 2010, também é ilegal',
  'baixar cópias sabendo que foram',
  'distribuídas ilegalmente, mesmo que',
  'para uso pessoal.',
  'Agradecemos a sua compreensão.',
]);

// title screen copyright line (two lines, white with dark outline)
const COPY = { font: 'Arial', bold: true, fill: ['#ffffff'], outline: '#20203a', ow: 1.2, align: 'left' };
jobs.push({ out: out('scene/title/titledata.pac#TITLE_COPY.GIM'), w: 256, h: 32, texts: [
  { t: '©Masami Kurumada / Toei Animation · TV Asahi · Dentsu', x: 6, y: 0, w: 248, h: 12, size: 10, ...COPY },
  { t: '©2012 NBGI', x: 6, y: 12, w: 248, h: 12, size: 10, ...COPY },
] });

// button icon sheet: 長 (hold) / 短 (tap) glyphs -> "Seg" / "Toq"
for (const key of ['common/systemwindow.pac#KEYHELP_BUTTON.GIM', 'scene/key/graphics.pac#KEYHELP_BUTTON.GIM']) {
  const t = (s, x, y, fill) => ({ t: s, x, y, w: 11, h: 11, size: 9, font: 'Arial Narrow', bold: true, fill: [fill] });
  jobs.push({ out: out(key), w: 256, h: 32, base: base(key), clear: [[73, 0, 21, 11], [73, 12, 21, 11]], texts: [
    t('Seg', 73, 0, '#d0d0d0'), t('Toq', 84, 0, '#d0d0d0'), t('Seg', 73, 12, '#e8502a'), t('Toq', 84, 12, '#e8502a'),
  ] });
}
