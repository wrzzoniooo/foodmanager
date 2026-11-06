// Generuje ikony PWA z public/icon.svg (uruchom: npm run icons)
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url));

for (const [name, size] of [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  const file = fileURLToPath(new URL(`../public/${name}`, import.meta.url));
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(file);
  console.log('ok', name);
}
