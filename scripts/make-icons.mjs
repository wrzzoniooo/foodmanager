// Generuje ikony PWA z public/icon.svg (uruchom: npm run icons)
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url));

// Ikona "maskable" jest przycinana przez maskę telefonu (bezpieczne jest środkowe 80%), więc lodówka w niej jest
// pomniejszona do 85%, żeby rogi nie były obcinane.
const maskable = Buffer.from(
  svg
    .toString('utf8')
    .replace(/<rect x="150"/, '<g transform="translate(256 256) scale(0.85) translate(-256 -256)"><rect x="150"')
    .replace(/<\/svg>/, '</g></svg>'),
);

for (const [name, size, source] of [
  ['pwa-192.png', 192, svg],
  ['pwa-512.png', 512, svg],
  ['maskable-512.png', 512, maskable],
  ['apple-touch-icon.png', 180, svg],
]) {
  const file = fileURLToPath(new URL(`../public/${name}`, import.meta.url));
  await sharp(source, { density: 300 }).resize(size, size).png().toFile(file);
  console.log('ok', name);
}
