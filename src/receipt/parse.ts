/** Jedna pozycja odczytana z paragonu: tekst, jak go widać na papierze, i ilość sztuk. */
export interface ReceiptLine {
  raw: string;
  qty: number;
}

const SKIP =
  /^(suma|razem|do zap|gotowk|karta|reszta|ptu|sprzed|nip|paragon|nr |kasa|kasjer|data|godz|sp\.? z o|lidl|www|ul |tel|rabat|zaplat|wplat|numer|dziekuj|zapraszam|potwierdz|bdo|opakowan|kaucja|punkty|moje lidl|sprzedaz|zwolniona|wartosc|stawka|brutto|netto|podatek)/;

/** Małe litery bez polskich znaków i bez znaków specjalnych: do porównań. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
}

const PRICE_END = /\s+(-?\d{1,4}[.,]\d{2})\s*[A-DĄ-Ż]?\s*$/i;
const QTY_LINE = /^\s*(\d{1,3})\s*[x×*]\s*\d{1,4}[.,]\d{2}\s+\d{1,4}[.,]\d{2}\s*[A-D]?\s*$/i;
const WEIGHT_LINE = /^\s*\d[.,]\d{1,3}\s*kg\s*[x×*]\s*\d{1,4}[.,]\d{2}\s+\d{1,4}[.,]\d{2}\s*[A-D]?\s*$/i;
const ONLY_PRICE = /^\s*-?\d{1,4}[.,]\d{2}\s*[A-D]?\s*$/;
const INLINE_QTY = /^(.*?)(?:\s+(\d{1,3})\s*[x×*]\s*\d{1,4}[.,]\d{2})\s*$/i;

/**
 * Z tekstu odczytanego z paragonu wybiera pozycje. Obsługuje typowy układ sklepowy: nazwa i cena w jednej linii
 * albo nazwa w jednej linii, a "2 x 1,89  3,78" w następnej.
 */
export function parseReceipt(text: string): ReceiptLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const out: ReceiptLine[] = [];
  let last: ReceiptLine | null = null;

  for (const line of lines) {
    const n = normalize(line);
    if (!n || SKIP.test(n)) {
      last = null;
      continue;
    }
    if (QTY_LINE.test(line)) {
      const m = line.match(QTY_LINE);
      if (last && m) last.qty = Math.max(1, parseInt(m[1], 10));
      continue;
    }
    if (WEIGHT_LINE.test(line) || ONLY_PRICE.test(line)) continue;

    let name = line;
    let hadPrice = false;
    if (PRICE_END.test(name)) {
      name = name.replace(PRICE_END, '').trim();
      hadPrice = true;
    }
    let qty = 1;
    const inline = name.match(INLINE_QTY);
    if (inline && inline[1]) {
      name = inline[1].trim();
      qty = Math.max(1, parseInt(inline[2], 10));
    }
    // Nazwa musi mieć kilka liter; linie bez ceny i bez liter to śmieci z OCR.
    const letters = (name.match(/[a-ząćęłńóśźż]/gi) ?? []).length;
    if (letters < 3) continue;
    if (!hadPrice && letters < 5) continue;
    const item: ReceiptLine = { raw: name, qty };
    out.push(item);
    last = item;
  }
  return out;
}

/** Odcisk paragonu: te same pozycje (nazwa i ilość) dają ten sam tekst, niezależnie od kolejności i drobnych błędów odstępów. */
export function fingerprint(lines: ReceiptLine[]): string {
  const key = lines
    .map((l) => `${normalize(l.raw).replace(/ /g, '')}*${l.qty}`)
    .sort()
    .join('|');
  let a = 5381;
  let b = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    a = ((a << 5) + a + c) | 0;
    b = Math.imul(b ^ c, 16777619) | 0;
  }
  return `${lines.length}-${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}
