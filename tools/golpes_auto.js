// Translates the combo lists (btx/combolist) by rule + move-name dictionary.
const fs = require('fs');
const path = require('path');
// node golpes_auto.js [grupo]  (padrão: golpes; a galeria também tem listas de combos)
const F = path.join(__dirname, '..', 'traducao', (process.argv[2] || 'golpes') + '.json');

const NAMES = [
  ['メテオアタック', 'Ataque Meteoro'],
  ['オリオン・プラズマ', 'Plasma de Órion'],
  ['オリオン・スフィア', 'Esfera de Órion'],
  ['ノワールインパクト', 'Impacto Noir'],
  ['<F:フォルゴーレ>・ルネッサンス', 'Renascer Folgore'],
  ['ノワールビッグバン', 'Big Bang Noir'],
  ['<水柱:みずばしら>', "Coluna d'Água"],
  ['クロス・ストリーム', 'Corrente Cruzada'],
  ['スピア・ヴォルテクス', 'Lança Vórtice'],
  ['ジャッジメント・ラッシュ', 'Fúria do Juízo'],
  ['<富士流風遁:ふじりゅうふうとん>の<術:じゅつ>　<真空斬:しんくうぎ>り', 'Corte do Vácuo'],
  ['<富士流土遁:ふじりゅうどとん>の<術:じゅつ>', 'Doton de Fuji'],
  ['<富士流空蝉:ふじりゅううつせみ>の<術:じゅつ>', 'Utsusemi de Fuji'],
  ['<火炎:かえん>の<舞乱:まいみだれ>れ<打:う>ち', 'Dança das Chamas'],
  ['<咆哮天狼崩:ほうこうてんろうくず>し', 'Uivo do Lobo'],
  ['<土遁双牙咆狼陣:どとんそうがほうろうじん>', 'Presas do Lobo'],
  ['リフレクション・ランゲージ', 'Palavra Refletida'],
  ['カプリコーンホーンスラスト', 'Investida Chifre'],
  ['ドミネーション・ランゲージ', 'Palavra Dominante'],
  ['ドミネーター・<C:コンビネーション>', 'Domínio Total'],
  ['パラライズ・レイン', 'Chuva Paralisante'],
  ['パラライズ・ベーゼ', 'Beijo Paralisante'],
  ['ヒドラス・ウェーブ', 'Onda de Hydra'],
  ['<　H・T・P　:ヒドラス　サウザンド　パラライズ>', 'Mil Paralisias'],
  ['ミラージュ', 'Miragem'],
  ['ゲイザー', 'Gêiser'],
  ['グランド・レイジ', 'Fúria da Terra'],
  ['インビジブル・トライデント', 'Tridente Oculto'],
  ['テンペスト・ノア', 'Tempestade Noé'],
  ['テレポート', 'Teletransporte'],
  ['クリスタルウォール', 'Parede de Cristal'],
  ['スターダストレボリューション', 'Revolução Estelar'],
  ['<S:スターライト>・エクスティンクション', 'Extinção Estelar'],
  ['ペガサス<閃光拳:せんこうけん>', 'Clarão de Pégaso'],
  ['ペガサス<光速拳:こうそくけん>', 'Pégaso Veloz'],
  ['ペガサス<流星拳:りゅうせいけん>', 'Meteoro de Pégaso'],
  ['<咆哮:ほうこう>', 'Rugido'],
  ['レグルスブラスト', 'Rajada Regulus'],
  ['ビーストフォール', 'Queda da Fera'],
  ['ライトニング・プラズマ', 'Plasma Relâmpago'],
  ['ビーコック・アイスバレット', 'Bala de Gelo'],
  ['ビーコック・トルネード', 'Tornado Pavão'],
  ['ビーコック・ブリザード', 'Nevasca do Pavão'],
  ['<推背靠:すいはいこう>', 'Golpe de Ombro'],
  ['<明鏡止水:めいきょうしすい>', 'Mente Serena'],
  ['<蘆山大瀑布:ろざんだいばくふ>', 'Cachoeira Rozan'],
  ['<蘆山竜鱗盾:ろざんりゅうりんじゅん>', 'Escudo do Dragão'],
  ['<蘆山昇龍覇:ろざんしょうりゅうは>', 'Cólera do Dragão'],
  ['メテオナックル', 'Punho Meteoro'],
  ['サジタリアスの<矢:や>', 'Flecha Sagitário'],
  ['ペガサス<彗星拳:すいせいけん>', 'Cometa de Pégaso'],
  ['<真:しん>ペガサス<流星拳:りゅうせいけん>', 'Meteoro Supremo'],
  ['スネーク・ランページ', 'Fúria da Serpente'],
  ['サンダー・クロー', 'Garra do Trovão'],
  ['ライトニング・ランページ', 'Fúria Relâmpago'],
  ['ローリングディフェンス', 'Defesa Rolante'],
  ['ネビュラチェーン', 'Corrente Nebulosa'],
  ['アンドロメダネビュラ', 'Andrômeda Nebula'],
  ['ネビュラストーム', 'Tormenta Nebulosa'],
  ['ソニックムーヴ', 'Movimento Sônico'],
  ['ホーネットスティンガー', 'Ferrão de Vespa'],
  ['トワイライト・マリオネット', 'Marionete Sombria'],
  ['ターンバックジダークネス', 'Retorno às Trevas'],
  ['フレイム・デスペラード', 'Chama Desesperada'],
  ['ライオネット・<B・F:バーニングファイヤー>', 'Fogo do Leãozinho'],
  ['ライオネット・ボンバー', 'Bomba Leãozinho'],
  ['<音波弾設置:おんぱだんせっち>', 'Mina Sônica'],
  ['デッドエンドプレリュード', 'Prelúdio Fatal'],
  ['デッドエンドシンフォニー', 'Sinfonia Fatal'],
  ['デッドエンドクライマックス', 'Clímax Fatal'],
  ['ディバイン・トルネード', 'Tornado Divino'],
  ['アクィラハリケーン', 'Furacão de Águia'],
  ['<　A・S・P　:アクィラ　スピニング　プレデーション>', 'Rapina Giratória'],
];

// button letters inside color tags stay half-width
const keys = (s) => s.replace(/>([PKSL])</g, '>{$1}<');
const digits = (s) => String.fromCharCode(...[...s].map((c) => c.charCodeAt(0) - 0xfee0));

const d = JSON.parse(fs.readFileSync(F, 'utf8'));
let n = 0;
const missing = new Set();
for (const [key, es] of Object.entries(d))
  for (const e of es) {
    if (!/combolist/i.test(key)) continue;
    const jp = e.jp;
    if (!jp) continue;
    let pt = null;
    if (jp === '～通常時～') pt = '~ Normal ~';
    else if (jp === '～<小宇宙:コスモ>バースト時～') pt = '~ Explosão de Cosmo ~';
    else if (/^コンボ[０-９]+　　/.test(jp)) {
      const m = jp.match(/^コンボ([０-９]+)　　(.*)$/);
      pt = 'Combo ' + digits(m[1]) + ' ' + keys(m[2]);
    } else {
      const hit = NAMES.find(([k]) => jp.startsWith(k + '　'));
      if (hit) {
        const cmd = jp.slice(hit[0].length + 1).replace(/^L＋/, '{L}+').replace('＋', '+');
        pt = hit[1] + ' ' + keys(cmd);
      } else missing.add(jp);
    }
    if (pt) { e.pt = pt; n++; }
  }
fs.writeFileSync(F, JSON.stringify(d, null, 1));
console.log('golpes traduzidos:', n, 'sem regra:', [...missing]);
