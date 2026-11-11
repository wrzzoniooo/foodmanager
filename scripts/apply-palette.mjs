// Jednorazowy skrypt: wpisuje paletę Terakota (jasną i ciemną) do src/styles.css.
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../src/styles.css', import.meta.url);
let css = (await readFile(FILE, 'utf8')).split('\r\n').join('\n');

const light = {
  '--bg': '#f6ede3',
  '--card': '#fff9f2',
  '--sage': '#b65a3c',
  '--sage-dark': '#8a3f27',
  '--sage-light': '#f0d9cb',
  '--sage-chip': '#f0dfd1',
  '--nav-bg': '#ebd3c3',
  '--text': '#3a2a22',
  '--muted': '#7a6358',
  '--red': '#b3402a',
  '--amber-bg': '#f3ddaa',
  '--amber-text': '#6b4a0f',
  '--ink-sage': '#6b3a28',
  '--on-sage': '#fff',
  '--on-red': '#fff',
  '--nav-ink': '#7a4632',
  '--scrim': 'rgba(58, 42, 34, 0.45)',
  '--peek-scrim': 'rgba(246, 237, 227, 0.6)',
  '--peek-scrim-solid': 'rgba(246, 237, 227, 0.9)',
  '--badge-red-bg': '#f7d5c8',
  '--badge-red-ink': '#8a2f1a',
  '--badge-green-bg': '#dce6cf',
  '--badge-green-ink': '#3f5a23',
  '--track': '#ebd9ca',
  '--fresh-amber': '#c98a1a',
  '--ok': '#5f7f4a',
  '--select-bg': '#f5ddd0',
  '--mini': '#e7bfa9',
  '--paper': '#fffaf4',
  '--dash': '#e3cbb8',
  '--bag-body': '#d8a487',
  '--bag-dark': '#b97f5f',
  '--tile-line': 'color-mix(in srgb, var(--sage) 14%, transparent)',
};

const dark = {
  '--bg': '#261b17',
  '--card': '#33241f',
  '--sage': '#d2775a',
  '--sage-dark': '#eda58a',
  '--sage-light': '#4a3029',
  '--sage-chip': '#45302a',
  '--nav-bg': '#3c2a24',
  '--text': '#f1e4da',
  '--muted': '#b79f92',
  '--red': '#e3856a',
  '--amber-bg': '#5c4413',
  '--amber-text': '#f3d9a4',
  '--ink-sage': '#ebcbbc',
  '--on-sage': '#241612',
  '--on-red': '#2b1208',
  '--nav-ink': '#e3bfae',
  '--scrim': 'rgba(0, 0, 0, 0.6)',
  '--peek-scrim': 'rgba(38, 27, 23, 0.6)',
  '--peek-scrim-solid': 'rgba(38, 27, 23, 0.92)',
  '--badge-red-bg': '#5a2c1c',
  '--badge-red-ink': '#f3b9a3',
  '--badge-green-bg': '#34402b',
  '--badge-green-ink': '#b4d49a',
  '--track': '#4a352d',
  '--fresh-amber': '#d9a03a',
  '--ok': '#8fb47a',
  '--select-bg': '#4a2f27',
  '--mini': '#6a4338',
  '--paper': '#2e201b',
  '--dash': '#5a4036',
  '--bag-body': '#8a5a44',
  '--bag-dark': '#6e4533',
  '--tile-line': 'color-mix(in srgb, var(--sage) 10%, transparent)',
};

const decls = (o, pad) => Object.entries(o).map(([k, v]) => `${pad}${k}: ${v};`).join('\n');

// :root (jasny): podmień od --bg do --bag-dark włącznie
const rootStart = css.indexOf('  --bg:');
const rootEnd = css.indexOf('  --font-title');
css = css.slice(0, rootStart) + decls(light, '  ') + '\n' + css.slice(rootEnd);
css = css.replace(/  \/\* Wszystkie kolory[\s\S]*?\*\/\n/, '  /* Paleta Terakota (jasna). Ciemna wersja jest niżej: data-theme="dark" albo "auto" przy ciemnym telefonie. */\n');

// bloki ciemne: podmieniamy tylko te dwa bloki, reszta pliku zostaje
const darkBlock = `:root[data-theme='dark'] {
  color-scheme: dark;
${decls(dark, '  ')}
}`;
const autoBlock = `@media (prefers-color-scheme: dark) {
  :root[data-theme='auto'] {
    color-scheme: dark;
${decls(dark, '    ')}
  }
}`;
const reDark = /:root\[data-theme='dark'\] \{[\s\S]*?\n\}/;
const reAuto = /@media \(prefers-color-scheme: dark\) \{\n  :root\[data-theme='auto'\] \{[\s\S]*?\n  \}\n\}/;
if (!reDark.test(css) || !reAuto.test(css)) console.log('UWAGA: nie znaleziono bloków ciemnych');
css = css.replace(reDark, () => darkBlock).replace(reAuto, () => autoBlock);

// tło z kafelkami
css = css.replace(
  /html,\nbody \{\n  margin: 0;\n  background: var\(--bg\);/,
  `html,\nbody {\n  margin: 0;\n  background-color: var(--bg);\n  /* Tekstura Kafelki: cienkie linie jak kafelki kuchenne, tylko na tle ekranu. */\n  background-image: linear-gradient(var(--tile-line) 1px, transparent 1px), linear-gradient(90deg, var(--tile-line) 1px, transparent 1px);\n  background-size: 30px 30px;`,
);

// pasek świeżości: zielony zamiast koloru głównego
css = css.replace(/\.fresh i\.green \{\n  background: var\(--sage\);/, '.fresh i.green {\n  background: var(--ok);');

// skaner: ciemne, ciepłe tło
css = css.replace(/#1b2214/g, '#21160f').replace(/rgba\(27, 34, 20,/g, 'rgba(33, 22, 15,');

await writeFile(FILE, css);
console.log('ok');
