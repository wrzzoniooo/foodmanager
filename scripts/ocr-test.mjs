// Test odczytu paragonów: ten sam przebieg co w aplikacji (skala szarości, kontrast, Tesseract pol, PSM single column).
import sharp from 'sharp';
import { createWorker, PSM } from 'tesseract.js';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const IMG = 'C:/Users/wrzzo/AppData/Local/Temp/claude/7be4b8b77034ae5d/1ab0c69c-eaa6-4ffa-bfd1-fb789b6ed588/images/';
const OUT = 'C:/Users/wrzzo/AppData/Local/Temp/claude/7be4b8b77034ae5d/1ab0c69c-eaa6-4ffa-bfd1-fb789b6ed588/scratchpad/';
const files = ['26.webp', '27.webp', '28.webp'];
const parserPath = process.argv[2] ?? 'E:/CLAUDE/Spizarnia/src/receipt/parse.ts';
const { parseReceipt } = await import(pathToFileURL(parserPath).href + '?t=' + Date.now());

const worker = await createWorker('pol', 1);
await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN, preserve_interword_spaces: '1' });
for (const f of files) {
  const meta = await sharp(IMG + f).metadata();
  const scale = Math.min(4, 1800 / meta.width);
  const png = await sharp(IMG + f)
    .resize(Math.round(meta.width * scale))
    .grayscale()
    .linear(1.35, -(0.35 * 128))
    .png()
    .toBuffer();
  const { data } = await worker.recognize(png);
  writeFileSync(OUT + f.replace('.webp', '.txt'), data.text);
  console.log(`\n===== ${f} (${meta.width}x${meta.height}) =====`);
  console.log(data.text);
  console.log('--- parseReceipt ---');
  for (const l of parseReceipt(data.text)) console.log(`${l.qty} x ${l.raw}`);
}
await worker.terminate();
