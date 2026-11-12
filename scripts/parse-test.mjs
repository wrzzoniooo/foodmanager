// Sprawdza parser na zapisanych odczytach OCR: node scripts/parse-test.mjs <plik.txt>...
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { parseReceipt } = await import(pathToFileURL(new URL('../src/receipt/parse.ts', import.meta.url).pathname.replace(/^\//, '')).href);
for (const f of process.argv.slice(2)) {
  console.log(`\n== ${f}`);
  for (const l of parseReceipt(readFileSync(f, 'utf8'))) console.log(`${l.qty} x ${l.raw}`);
}
