// Dopasowuje świeżo wygenerowany projekt Android (npx cap add android) do aplikacji Spiżarnia:
// uprawnienia aparatu i wibracji, ikona i kolor ekranu startowego, numer wersji.
// Uruchamiane przez .github/workflows/apk.yml; lokalnie: node scripts/android-prepare.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MAIN = `${ROOT}android/app/src/main`;
const RES = `${MAIN}/res`;
const VERSION = (process.env.APP_VERSION ?? '1.0.0').replace(/^v/, '');
const VERSION_CODE = process.env.APP_VERSION_CODE ?? '1';
const BRAND = '#B65A3C';
const CREAM = '#F6EDE3';

if (!existsSync(MAIN)) throw new Error('Brak projektu Android: najpierw uruchom npx cap add android');

// 1) Uprawnienia: aparat (skaner i zdjęcia produktów) i wibracja po odczycie kodu.
const manifestPath = `${MAIN}/AndroidManifest.xml`;
let manifest = await readFile(manifestPath, 'utf8');
if (!manifest.includes('android.permission.CAMERA')) {
  manifest = manifest.replace(
    '<uses-permission android:name="android.permission.INTERNET" />',
    `<uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />`,
  );
  await writeFile(manifestPath, manifest);
}

// 2) Kolor tła ikony i ekranu startowego, ekran startowy bez logo Capacitora.
await writeFile(
  `${RES}/values/ic_launcher_background.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BRAND}</color>\n</resources>\n`,
);
const stylesPath = `${RES}/values/styles.xml`;
let styles = await readFile(stylesPath, 'utf8');
styles = styles.replace(
  '<item name="android:background">@drawable/splash</item>',
  `<item name="windowSplashScreenBackground">@color/ic_launcher_background</item>`,
);
await writeFile(stylesPath, styles);

// 3) Ikony z tego samego rysunku co ikona PWA (talerz z kreskami, na cegłowym tle).
const plate = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${bg ? `<rect width="512" height="512" fill="${BRAND}"/>` : ''}
  <rect x="150" y="96" width="212" height="320" rx="36" fill="${CREAM}"/>
  <rect x="150" y="214" width="212" height="12" fill="${BRAND}"/>
  <rect x="318" y="140" width="14" height="50" rx="7" fill="${BRAND}"/>
  <rect x="318" y="248" width="14" height="80" rx="7" fill="${BRAND}"/>
</svg>`;

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const roundMask = (s) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}" fill="#fff"/></svg>`);

for (const [name, scale] of Object.entries(DENSITIES)) {
  const dir = `${RES}/mipmap-${name}`;
  await mkdir(dir, { recursive: true });
  const legacy = Math.round(48 * scale);
  const adaptive = Math.round(108 * scale);
  const full = await sharp(Buffer.from(plate(true)), { density: 300 }).resize(legacy, legacy).png().toBuffer();
  await writeFile(`${dir}/ic_launcher.png`, full);
  const round = await sharp(full).composite([{ input: roundMask(legacy), blend: 'dest-in' }]).png().toBuffer();
  await writeFile(`${dir}/ic_launcher_round.png`, round);
  await sharp(Buffer.from(plate(false)), { density: 300 }).resize(adaptive, adaptive).png().toFile(`${dir}/ic_launcher_foreground.png`);
}

// 4) Numer wersji.
const gradlePath = `${ROOT}android/app/build.gradle`;
let gradle = await readFile(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode \d+/, `versionCode ${VERSION_CODE}`).replace(/versionName "[^"]*"/, `versionName "${VERSION}"`);
await writeFile(gradlePath, gradle);

console.log(`Projekt Android gotowy: wersja ${VERSION} (${VERSION_CODE})`);
