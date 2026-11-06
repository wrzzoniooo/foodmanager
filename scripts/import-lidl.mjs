// Importer ofert spożywczych Lidla -> public/data/lidl.json
// Uruchomienie: npm run import
//
// Zasady (celowo ostrożne):
//  - tylko publiczne strony lidl.pl dozwolone przez robots.txt (bez parametrów offset/search/sort),
//  - mało zapytań (kilka na uruchomienie) z przerwą i uczciwym User-Agentem,
//  - katalog narasta: produkty z poprzednich uruchomień zostają, promocje zawsze z bieżącej oferty,
//  - jeśli import nic nie znajdzie, istniejący plik NIE jest nadpisywany.
import https from 'node:https';
import zlib from 'node:zlib';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const OUT = fileURLToPath(new URL('../public/data/lidl.json', import.meta.url));
const UA = 'SpizarniaBot/0.2 (prywatna aplikacja domowa, kilka zapytan dziennie)';
const PAGES = [
  'https://www.lidl.pl/c/zywnosc-i-napoje/s10068374',
  'https://www.lidl.pl/h/owoce-i-warzywa/h10071012',
  'https://www.lidl.pl/h/mieso-i-drob/h10095752',
  'https://www.lidl.pl/h/ryby-i-owoce-morza/h10071050',
  'https://www.lidl.pl/h/sery-nabial-i-jaja/h10095761',
  'https://www.lidl.pl/h/piekarnia/h10096086',
  'https://www.lidl.pl/h/oleje-sosy-i-przyprawy/h10096110',
  'https://www.lidl.pl/c/promocje/s10076831',
];
const DELAY_MS = 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

/** GET przez moduł https: odpowiedzi Lidla mają nagłówki większe niż 16 KB (limit wbudowanego fetch). */
function get(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': UA, 'Accept-Language': 'pl-PL,pl;q=0.9', 'Accept-Encoding': 'gzip' }, maxHeaderSize: 128 * 1024, timeout: 30000 },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location && redirects > 0) {
          res.resume();
          resolve(get(new URL(res.headers.location, url).toString(), redirects - 1));
          return;
        }
        if (status !== 200) {
          res.resume();
          reject(new Error(`HTTP ${status}`));
          return;
        }
        const stream = res.headers['content-encoding'] === 'gzip' ? res.pipe(zlib.createGunzip()) : res;
        const chunks = [];
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        stream.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function fetchPage(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await get(url);
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(3000);
    }
  }
}

function extractProducts(html) {
  const out = [];
  for (const m of html.matchAll(/data-grid-data="([^"]*)"/g)) {
    try {
      out.push(JSON.parse(decodeEntities(m[1])));
    } catch {
      /* pomijamy uszkodzony wpis */
    }
  }
  return out;
}

const warsawDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' });
const toDate = (epochSec) => (typeof epochSec === 'number' ? warsawDate.format(new Date(epochSec * 1000)) : undefined);

function prettyBrand(raw) {
  if (!raw) return undefined;
  const b = raw.replace(/[®™]/g, '').trim();
  if (!b || !/[\p{L}\p{N}]/u.test(b)) return undefined; // Lidl bywa podaje "-" zamiast marki
  return b === b.toUpperCase() ? b.charAt(0) + b.slice(1).toLowerCase() : b;
}

/** Mapowanie ścieżki kategorii Lidla (wonCategoryPrimary) i nazwy na nasze kategorie. */
function mapCategory(path = '', title = '') {
  // np. "Światy potrzeb/Żywność i żywność w pobliżu/Owoce i warzywa/Owoce" -> ["Owoce i warzywa", "Owoce"]
  const segs = path.split('/').slice(2).map((s) => s.toLowerCase());
  const top = segs[0] || '';
  const sub = segs[1] || '';
  const t = title.toLowerCase();
  if (/mrożon/.test(top) || /mrożon/.test(sub)) return 'mrozonki';
  if (/owoce i warzywa/.test(top)) return /owoc/.test(sub) ? 'owoce' : 'warzywa';
  if (/piekarni/.test(top)) return 'pieczywo';
  if (/ser, nabiał|nabiał|nabial/.test(top)) return sub === 'ser' || /^ser/.test(sub) ? 'sery' : 'nabial';
  if (/mięso|ryby|owoce morza|wędlin/.test(top)) return 'mieso';
  if (/oleje|sosy|przypraw/.test(top)) return 'sosy';
  if (/napoje|woda|kawa|herbat/.test(top)) return 'napoje';
  if (/słodycz|przekąsk/.test(top)) return 'slodycze';
  if (/konserw|dania gotowe|zupy/.test(top)) return 'konserwy';
  if (/makaron|ryż|kasz|mąk|płatk|sypk|produkty suche/.test(top)) return 'sypkie';
  if (/chleb|bułk|rogal|bagiet/.test(t)) return 'pieczywo';
  return 'inne';
}

const FRIDGE = new Set(['nabial', 'sery', 'mieso', 'warzywa', 'mrozonki']);

function toProduct(o, today) {
  const kf = o.keyfacts || {};
  const title = (kf.title || o.title || o.fullTitle || '').trim();
  if (!title) return null;
  const category = mapCategory(kf.wonCategoryPrimary, title);
  return {
    id: `lidl-${o.productId}`,
    name: title,
    brand: prettyBrand(o.brand && o.brand.name),
    category,
    defaultPlace: FRIDGE.has(category) ? 'fridge' : 'pantry',
    imageUrl: o.image || undefined,
    url: o.canonicalUrl ? `https://www.lidl.pl${o.canonicalUrl}` : undefined,
    lastSeen: today,
  };
}

function toPromo(o, today) {
  const price = o.price && typeof o.price.price === 'number' ? o.price.price : undefined;
  if (price === undefined) return null;
  const old = o.price.discount && typeof o.price.discount.deletedPrice === 'number' ? o.price.discount.deletedPrice : undefined;
  const badge = o.stockAvailability && Array.isArray(o.stockAvailability.badgeInfoV2) ? o.stockAvailability.badgeInfoV2[0] : undefined;
  const from = toDate(o.storeStartDate) || toDate(badge && badge.validFrom) || today;
  const to = toDate(o.storeEndDate) || toDate(badge && badge.validUntil) || from;
  return { productId: `lidl-${o.productId}`, priceNow: price, priceOld: old && old > price ? old : undefined, from, to };
}

async function main() {
  const today = warsawDate.format(new Date());
  let previous = { products: [] };
  try {
    previous = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    /* pierwszy import */
  }

  const seen = new Map();
  const promos = new Map();
  let pagesOk = 0;
  for (const url of PAGES) {
    try {
      const html = await fetchPage(url);
      const items = extractProducts(html).filter((o) => o && o.category === 'Food' && o.productId);
      for (const o of items) {
        const product = toProduct(o, today);
        if (product) seen.set(product.id, product);
        const promo = toPromo(o, today);
        if (promo && promo.to >= today) promos.set(promo.productId, promo);
      }
      pagesOk++;
      console.log(`ok   ${url.replace('https://www.lidl.pl', '')}: ${items.length} produktów spożywczych`);
    } catch (e) {
      const cause = e.cause && (e.cause.code || e.cause.message);
      console.warn(`BŁĄD ${url}: ${e.message}${cause ? ` (${cause})` : ''}`);
    }
    await sleep(DELAY_MS);
  }

  if (pagesOk === 0 || seen.size === 0) {
    console.error('Import nie znalazł żadnych produktów: zostawiam istniejący plik bez zmian.');
    process.exit(1);
  }

  const merged = new Map((previous.products || []).map((p) => [p.id, p]));
  let added = 0;
  for (const [id, p] of seen) {
    if (!merged.has(id)) added++;
    merged.set(id, { ...merged.get(id), ...p });
  }

  const data = {
    generatedAt: new Date().toISOString(),
    source: 'lidl.pl (publiczne strony ofert spożywczych)',
    products: [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    promos: [...promos.values()].sort((a, b) => a.from.localeCompare(b.from)),
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data, null, 1) + '\n', 'utf8');
  console.log(`\nZapisano ${data.products.length} produktów (nowych: ${added}) i ${data.promos.length} promocji do public/data/lidl.json`);
}

main();
