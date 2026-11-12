/** Jedna pozycja odczytana z paragonu: tekst, jak go widać na papierze, i ilość sztuk. */
export interface ReceiptLine {
  raw: string;
  qty: number;
}

const SKIP =
  /^(suma|razem|do zap|gotowk|karta|reszta|ptu|piu|sprzed|nip|paragon|nr |kasa|kasjer|data|godz|sp\.? z o|lidl|www|ul |tel|rabat|zaplat|wplat|numer|dziekuj|zapraszam|potwierdz|bdo|opakowan|kaucja|punkty|moje lidl|sprzedaz|zwolniona|wartosc|stawka|brutto|netto|podatek|kwota|platnosc|taniej|z lidl|zaoszcz|wykorzystane|miejsce|szczegoly|ocen|aby zwr|adres|podgorne)/;

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

// Ceny na paragonach bywają bez drugiego miejsca po przecinku ("11.7"), więc wszędzie {1,2}.
const PRICE_END = /\s+(-?\d{1,4}[.,]\d{1,2})\s*[A-DĄ-Ż]?\s*$/i;
const QTY_LINE = /^\s*(\d{1,3})\s*[x×*]\s*\d{1,4}[.,]\d{1,2}\s+\d{1,4}[.,]\d{1,2}\s*[A-D]?\s*$/i;
const WEIGHT_LINE = /^\s*\d[.,]?\s?\d{0,3}\s*kg\s*[x×*]\s*\d{1,4}[.,]\d{1,2}\s+\d{1,4}[.,]\d{1,2}\s*[A-D]?\s*$/i;
const ONLY_PRICE = /^\s*-?\d{1,4}[.,]\d{1,2}\s*[A-D]?\s*$/;
const INLINE_QTY = /^(.*?)(?:\s+(\d{1,3})\s*[x×*]\s*\d{1,4}[.,]\d{2})\s*$/i;

/** Rzeczy, których nie trzeba nigdzie zapisywać: chemia, papier, naczynia, suplementy. */
const NON_FOOD =
  /papier|r[eę]cznik|myd[lł]|zmywak|patelni|suplement|p[lł]yn do|proszek|worki|folia|g[aą]bk|szczotk|bateri|[zż]arówk|toal|serwetk|chusteczk|szampon|dezodor|[sś]cierk|od[sś]wie[zż]acz|kapsu[lł]ki do|tabletki do|[sś]wiec|transparent|udra[zż]niacz|odplam|garnek|kubek|talerz/i;

export function isNonFood(name: string): boolean {
  return NON_FOOD.test(name);
}

/** Zniżka lub opis promocji pod pozycją (Lidl Plus kupon, Taniej za 2, Rabat grupowy); odporne na błędy OCR. */
const DISCOUNT = /^(l[il1]d[il1)]|lid\b|plus\b|taniej|rabat|kupon|v?w?oucher|voucher|promoc|upust)/;
/**
 * Linia "2 * 5.85 11.7 C" albo "1,224kg x 6.99 8.56 C": ilość i cena pod nazwą. "1 *" bywa zgubione przez OCR, więc jest
 * opcjonalne.
 */
const PAIR = /^\W{0,3}(?:(\d{1,3})\s*[x×*'’]\s*)?\d{1,4}\s?[.,]\s?\d{1,3}\s+\d{1,4}\s?[.,]\s?\d{1,3}\s*[A-D€(\]]?\s*$/i;
const WEIGHT = /kg\s*[x×*]\s*\d/i;
const DATE = /\b(20\d\d[-./]\d{2}[-./]\d{2}|\d{2}[-./]\d{2}[-./]20\d\d)\b/;
const TOTALS = /^(ptu|piu|ptv|suma|razem)\b/;

function cleanName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/[\s.,;:*'"-]+$/g, '')
    .trim();
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Z tekstu odczytanego z paragonu wybiera pozycje. Najpierw układ, w którym nazwa stoi sama w linii, a pod nią
 * "ilość * cena suma" (np. Lidl); jeśli go nie ma, układ "nazwa i cena w jednej linii".
 */
export function parseReceipt(text: string): ReceiptLine[] {
  const paired = parsePaired(text);
  return paired.length >= 2 ? paired : parseInline(text);
}

/**
 * Pozycją jest linia tuż nad linią z ilością i ceną. Nagłówek, zniżki, sumy i stopka nie mają takiej linii, więc same
 * odpadają. Towar na wagę (kg) liczy się jako 1. Powtórzone nazwy łączą się w jedną pozycję z sumą sztuk.
 */
function parsePaired(text: string): ReceiptLine[] {
  const lines = splitLines(text);
  let start = 0;
  const dateAt = lines.slice(0, 25).findIndex((l) => DATE.test(l));
  if (dateAt >= 0) start = dateAt + 1;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (TOTALS.test(normalize(lines[i]))) {
      end = i;
      break;
    }
  }
  const merged = new Map<string, ReceiptLine>();
  for (let i = start + 1; i < end; i++) {
    const line = lines[i];
    const isPair = PAIR.test(line) || (WEIGHT.test(line) && /\d{1,4}[.,]\d{1,2}\s*\S?\s*$/.test(line));
    if (!isPair) continue;
    const prev = lines[i - 1];
    if (!prev || PAIR.test(prev) || WEIGHT.test(prev) || ONLY_PRICE.test(prev)) continue;
    const name = cleanName(prev.replace(PRICE_END, ''));
    if (DISCOUNT.test(normalize(name)) || /ds*kgb/i.test(name)) continue;
    const letters = (name.match(/[a-ząćęłńóśźż]/gi) ?? []).length;
    if (letters < 3 || isNonFood(name)) continue;
    const m = line.match(PAIR);
    const qty = WEIGHT.test(line) ? 1 : Math.max(1, m?.[1] ? parseInt(m[1], 10) : 1);
    const key = normalize(name).replace(/ /g, '');
    const existing = merged.get(key);
    if (existing) existing.qty += qty;
    else merged.set(key, { raw: name, qty });
  }
  return [...merged.values()];
}

/** Układ zapasowy: nazwa i cena w jednej linii albo "2 x 1,89  3,78" w następnej. */
function parseInline(text: string): ReceiptLine[] {
  const lines = splitLines(text);
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
    if (letters < 3 || isNonFood(name) || DISCOUNT.test(normalize(name))) continue;
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
