// Buduje public/data/produkty.json ze źródła scripts/dictionary.txt (proste nazwy produktów z kategoriami i aliasami).
// Uruchom: node scripts/build-dictionary.mjs
import { readFile, writeFile } from 'node:fs/promises';

const SRC = new URL('./dictionary.txt', import.meta.url);
const OUT = new URL('../public/data/produkty.json', import.meta.url);
const FRIDGE = new Set(['nabial', 'sery', 'mieso', 'warzywa', 'mrozonki']);
const MAX_ALIASES = 14;

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const byName = new Map();
let category = null;
for (const raw of (await readFile(SRC, 'utf8')).split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const head = line.match(/^\[(\w+)\]$/);
  if (head) {
    category = head[1];
    continue;
  }
  if (!category) throw new Error(`Wpis przed nagłówkiem kategorii: ${line}`);
  const [left, right = ''] = line.split('=');
  const place = left.match(/@(pantry|fridge|freezer)\s*$/)?.[1];
  const name = left.replace(/@(pantry|fridge|freezer)\s*$/, '').trim();
  const aliases = right
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
  const key = slug(name);
  const prev = byName.get(key);
  if (prev) {
    // Ta sama nazwa w dwóch miejscach: zostaje pierwsza kategoria, aliasy się łączą.
    prev.aliases.push(...aliases);
    continue;
  }
  const defaultPlace = place === 'freezer' ? 'fridge' : (place ?? (FRIDGE.has(category) ? 'fridge' : 'pantry'));
  byName.set(key, { id: `sl-${key}`, name, category, defaultPlace, aliases, catalog: true });
}

const products = [...byName.values()].map((p) => ({
  ...p,
  aliases: [...new Set(p.aliases.map((a) => a.toLowerCase()).filter((a) => a !== p.name.toLowerCase()))].slice(0, MAX_ALIASES),
}));
await writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), source: 'scripts/dictionary.txt', products }));
const per = {};
for (const p of products) per[p.category] = (per[p.category] ?? 0) + 1;
console.log(`Zapisano ${products.length} nazw`, per);
