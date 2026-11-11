// Jednorazowy import katalogu z Open Food Facts: polskie produkty pod markami Lidla.
// Uruchomienie: npm run import:off  (zapisuje public/data/lidl.json, dopisując produkty do istniejących).
// Zasady uprzejmości: uczciwy User-Agent, przerwy między zapytaniami, bez ponawiania w pętli.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../public/data/lidl.json', import.meta.url));
const UA = 'ShelfieBot/0.3 (prywatna aplikacja domowa; jednorazowy import katalogu)';
const DELAY_MS = 1500;
const PAGE_SIZE = 100;
const FIELDS = 'code,product_name,product_name_pl,brands,quantity,categories_tags,image_front_small_url';

// Marki własne Lidla (slugi tagów Open Food Facts). Nieznane slugi po prostu nic nie zwrócą.
const BRANDS = [
  'lidl', 'milbona', 'pilos', 'pikok', 'crownfield', 'vitasia', 'combino', 'alesto', 'carre-fin', 'freshona',
  'baresa', 'italiamo', 'kania', 'deluxe', 'bellarom', 'sondey', 'snack-day', 'eridanous', 'chef-select', 'freeway',
  'saguaro', 'favorina', 'choceur', 'nixe', 'oliviers-co', 'rio-d-oro', 'dulano', 'gut-bio', 'bio-organic', 'cucina',
  'trattoria-alfredo', 'tastino', 'harvest-basket', 'sole-mare', 'fin-carre', 'k-take-it-veggie', 'mcennedy',
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** To samo mapowanie kategorii co w src/off.ts. */
function category(tags = []) {
  const has = (re) => tags.some((t) => re.test(t));
  if (has(/frozen/)) return 'mrozonki';
  if (has(/cheese/)) return 'sery';
  if (has(/beverages|waters|juices|coffees|teas|sodas/)) return 'napoje';
  if (has(/dairies|milk|yogurt|yoghurt|butter|cream|eggs/)) return 'nabial';
  if (has(/meats|sausages|hams|poultry|fishes|seafood|charcuterie/)) return 'mieso';
  if (has(/fruits/)) return 'owoce';
  if (has(/vegetables/)) return 'warzywa';
  if (has(/breads|bakery|pastries|viennoiseries/)) return 'pieczywo';
  if (has(/salty-snacks|chips|crisps|crackers|pretzels|breadsticks|peanuts|nuts|popcorn|appetizers/)) return 'slone';
  if (has(/snacks|sweet|chocolates|biscuits|candies|confectioneries|desserts/)) return 'slodycze';
  if (has(/sauces|oils|spices|condiments|dressings|vinegars/)) return 'sosy';
  if (has(/canned|meals|soups/)) return 'konserwy';
  if (has(/pastas|cereals|rices|flours|legumes|grains|noodles/)) return 'sypkie';
  return 'inne';
}

const FRIDGE = new Set(['nabial', 'sery', 'mieso', 'warzywa']);

function pretty(brands) {
  const first = (brands ?? '').split(',')[0].trim();
  if (!/[a-zA-Z0-9ąćęłńóśźż]/.test(first)) return undefined;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function clean(name) {
  const t = (name ?? '').replace(/\s+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

/** Open Food Facts bywa chwilowo przeciążony (503): ponawiamy kilka razy z coraz dłuższą przerwą. */
async function getJson(url) {
  let last;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (res.ok) return await res.json();
      last = new Error(`HTTP ${res.status}`);
    } catch (e) {
      last = e;
    }
    await wait(DELAY_MS * attempt * 3);
  }
  throw last;
}

const existing = JSON.parse(await readFile(FILE, 'utf8'));
const byId = new Map(existing.products.map((p) => [p.id, p]));
const seenCodes = new Set(existing.products.map((p) => p.barcode).filter(Boolean));
const added = [];

for (const brand of BRANDS) {
  for (let page = 1; page <= 10; page++) {
    const url =
      'https://world.openfoodfacts.org/api/v2/search' +
      `?brands_tags=${encodeURIComponent(brand)}&countries_tags_en=poland&page_size=${PAGE_SIZE}&page=${page}&fields=${FIELDS}`;
    let data;
    try {
      data = await getJson(url);
    } catch (e) {
      console.log(`  ${brand} strona ${page}: ${e.message}, pomijam`);
      await wait(DELAY_MS * 3);
      break;
    }
    const items = data.products ?? [];
    for (const p of items) {
      const code = String(p.code ?? '').replace(/\D/g, '');
      const name = clean(p.product_name_pl || p.product_name);
      if (!code || code.length < 8 || !name || name.length < 3 || seenCodes.has(code)) continue;
      seenCodes.add(code);
      const cat = category(p.categories_tags);
      const product = {
        id: `off-${code}`,
        name,
        brand: pretty(p.brands),
        size: (p.quantity ?? '').trim() || undefined,
        category: cat,
        defaultPlace: FRIDGE.has(cat) ? 'fridge' : 'pantry',
        imageUrl: p.image_front_small_url || undefined,
        barcode: code,
        catalog: true,
      };
      if (!byId.has(product.id)) {
        byId.set(product.id, product);
        added.push(product);
      }
    }
    console.log(`${brand} strona ${page}: ${items.length} (razem nowych ${added.length})`);
    await wait(DELAY_MS);
    if (items.length < PAGE_SIZE) break;
  }
}

const products = [...existing.products.map((p) => ({ ...p, catalog: true })), ...added];
const out = { generatedAt: new Date().toISOString(), source: existing.source ?? 'lidl.pl + Open Food Facts', products, promos: [] };
await writeFile(FILE, JSON.stringify(out, null, 1));

const perCat = {};
for (const p of products) perCat[p.category] = (perCat[p.category] ?? 0) + 1;
console.log(`\nGotowe: ${products.length} produktów (nowych ${added.length}), ze zdjęciem ${products.filter((p) => p.imageUrl).length}`);
console.log(perCat);
