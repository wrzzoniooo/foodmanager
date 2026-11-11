// Podgląd ikony aplikacji z maskami koła i zaokrąglonego kwadratu: node scripts/icon-preview.mjs <skala> <wyjście.png>
import sharp from 'sharp';

const scale = Number(process.argv[2] ?? 0.72);
const out = process.argv[3] ?? 'icon-preview.png';
const BRAND = '#B65A3C';
const CREAM = '#F6EDE3';

const plate = `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
  <rect x="150" y="96" width="212" height="320" rx="36" fill="${CREAM}"/>
  <rect x="150" y="214" width="212" height="12" fill="${BRAND}"/>
  <rect x="318" y="140" width="14" height="50" rx="7" fill="${BRAND}"/>
  <rect x="318" y="248" width="14" height="80" rx="7" fill="${BRAND}"/>
</g>`;
const icon = (mask) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><clipPath id="m">${mask}</clipPath></defs><g clip-path="url(#m)"><rect width="512" height="512" fill="${BRAND}"/>${plate}</g></svg>`;
// Adaptacyjna ikona Androida: widoczne jest tylko środkowe 66% warstwy (72 z 108 dp).
const circle = '<circle cx="256" cy="256" r="171"/>';
const squircle = '<rect x="85" y="85" width="342" height="342" rx="85"/>';

const size = 256;
const a = await sharp(Buffer.from(icon(circle)), { density: 200 }).resize(size, size).png().toBuffer();
const b = await sharp(Buffer.from(icon(squircle)), { density: 200 }).resize(size, size).png().toBuffer();
await sharp({ create: { width: size * 2 + 24, height: size + 16, channels: 4, background: '#ffffff' } })
  .composite([
    { input: a, left: 8, top: 8 },
    { input: b, left: size + 16, top: 8 },
  ])
  .png()
  .toFile(out);
console.log('ok', out);
