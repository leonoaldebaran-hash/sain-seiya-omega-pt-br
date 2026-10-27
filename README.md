# Saint Seiya Omega: Ultimate Cosmo — Tradução PT-BR

Tradução para português do Brasil do jogo de PSP **Saint Seiya Omega: Ultimate Cosmo**
(聖闘士星矢Ω アルティメットコスモ, Bandai Namco, 2012), lançado só em japonês.

O que está traduzido:

- **Todo o texto do jogo** (≈ 2.900 frases): história completa dos 7 personagens + Seiya,
  menus, mensagens do sistema, tutorial, listas de golpes e combos, galeria e perfis.
- **≈ 300 texturas com texto**: botões e títulos dos menus, barras de ajuda dos botões,
  nomes dos personagens (seleção, história, HUD da luta), nomes das fases, telas de aviso etc.

Não traduzido: vozes, vídeos (abertura/créditos) e o logotipo do jogo.

> **Este repositório não contém nenhum arquivo do jogo.** Aqui estão só as ferramentas e as
> traduções em português. Para gerar a ISO traduzida você precisa da sua própria cópia do jogo.

## Sobre a fonte (sem acentos)

A fonte do jogo só tem os caracteres usados no roteiro japonês original. Ela inclui o alfabeto
latino "largo" (Ａｂｃ…), mas não tem letras acentuadas nem o espaço comum. Por isso o build
converte o texto automaticamente: tira os acentos e usa letras largas. Nas **imagens** os acentos
aparecem normalmente.

## Requisitos

- Windows com [Node.js](https://nodejs.org) (testado no 25) e PowerShell (para desenhar as texturas)
- [7-Zip](https://www.7-zip.org) (para tirar os arquivos da ISO)
- A ISO japonesa do jogo (`Saint Seiya Omega - Ultimate Cosmo (Japan).iso`)

## Como gerar a ISO traduzida

```bash
# 1. extrair os pacotes da sua ISO
7z x "Saint Seiya Omega - Ultimate Cosmo (Japan).iso" PSP_GAME/USRDIR/install.cpk PSP_GAME/USRDIR/archive.cpk -oiso
mkdir original
cp iso/PSP_GAME/USRDIR/*.cpk original/
node tools/cpk.js extract original/install.cpk original/install
node tools/cpk.js extract original/archive.cpk original/archive

# 2. recuperar o texto japonês de referência (as traduções em traducao/ são mantidas)
node tools/export.js

# 3. texturas: decodificar as originais e desenhar as versões em português
node tools/gim.js dump gims
GIMS=gims node tools/imagens.js
powershell -File tools/render.ps1 tools/jobs.json

# 4. gerar a ISO
ISO_IN="Saint Seiya Omega - Ultimate Cosmo (Japan).iso" ISO_OUT="Saint Seiya Omega (PT-BR).iso" node tools/build.js
```

`node tools/build.js --check` só confere se todos os textos cabem nas caixas (relatório em
`build/problemas.txt`), sem gerar nada.

**Ao jogar, deixe a opção "Instalação de dados" desligada.** Com ela ligada, o jogo lê os dados
instalados no cartão, que estão em japonês.

## Como editar a tradução

As traduções ficam em `traducao/*.json` (um arquivo por parte do jogo; o campo `pt` é o texto).

```bash
node tools/tr.js progress                   # quanto falta em cada arquivo
node tools/tr.js show historia_50 0 50      # lista frases (original + tradução)
node tools/tr.js apply minhas_correcoes.txt # aplica um arquivo "grupo / n<TAB>texto"
```

Marcações aceitas no texto: ` | ` força uma quebra de linha, `{P}` copia letras de botão sem
conversão e `<c#RRGGBBAA>…<c>` muda a cor. O texto é quebrado em linhas sozinho, respeitando o
tamanho de cada caixa.

## Ferramentas

| Arquivo | Função |
|---|---|
| `tools/cpk.js` | extrai e remonta os pacotes CRI CPK (com descompressão CRILAYLA) |
| `tools/btx.js` | lê e grava as tabelas de texto BTX (UTF-16) e os contêineres `.pac` |
| `tools/encode.js` | converte o português para o que a fonte do jogo consegue desenhar |
| `tools/gim.js`, `tools/png.js` | decodificam e codificam as texturas GIM do PSP (com swizzle e paleta) |
| `tools/render.ps1` + `tools/imagens*.js` | desenham os textos das texturas em português |
| `tools/iso.js` | substitui arquivos dentro da ISO |
| `tools/build.js` | junta tudo e gera a ISO traduzida |
| `tools/verify.js` | confere textos e imagens dentro de uma ISO gerada |

## Créditos

Tradução e ferramentas: leonoaldebaran-hash, com a ajuda do Claude (Anthropic).
Saint Seiya © Masami Kurumada / Toei Animation. O jogo pertence à Bandai Namco Games.
Projeto de fãs, sem fins lucrativos.
