// Sprawdza dopasowanie pozycji z odczytanych paragonów do słownika: node scripts/match-test.mjs <plik.txt>...
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const u = (p) => pathToFileURL(new URL(p, import.meta.url).pathname.replace(/^\//, '')).href;
const { parseReceipt, matchLines } = await import(u('../.tmp-bundle.mjs'));
const dict = JSON.parse(readFileSync(new URL('../public/data/produkty.json', import.meta.url), 'utf8')).products;
const byId = new Map(dict.map((p) => [p.id, p]));
for (const f of process.argv.slice(2)) {
  console.log(`\n== ${f.split('/').pop()}`);
  const lines = parseReceipt(readFileSync(f, 'utf8'));
  for (const m of matchLines(lines, dict, {})) {
    const p = m.productId ? byId.get(m.productId) : null;
    console.log(`${m.status.padEnd(2)} ${String(m.line.qty).padStart(2)} x ${m.line.raw.padEnd(32)} -> ${p ? p.name : '—'}`);
  }
}
