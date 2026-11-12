import type { Product } from '../types';
import { normalize, type ReceiptLine } from './parse';

export type MatchStatus = 'ok' | 'wn' | 'no';

export interface Matched {
  line: ReceiptLine;
  productId?: string;
  status: MatchStatus;
}

const OK_AT = 0.75;
const MAYBE_AT = 0.5;

/** "400 g" i "400g" to ten sam znacznik. */
function tokens(s: string): string[] {
  const n = normalize(s).replace(/(\d)\s+(g|kg|ml|l|szt)\b/g, '$1$2');
  return n.split(' ').filter((t) => t.length >= 2 || /\d/.test(t));
}

/** Jedna "nazwa" produktu: jego nazwa główna albo jeden z aliasów (synonim, marka, skrót z paragonu). */
interface Doc {
  id: string;
  name: string[];
  all: string[];
  /** Słowa tego dokumentu bez słów z cudzych aliasów: do podpowiedzi przy wpisywaniu. */
  own: string[];
  alias: boolean;
}

function toDocs(p: Product): Doc[] {
  const name = tokens(p.name);
  const aliasDocs = (p.aliases ?? []).map(tokens).filter((t) => t.length > 0);
  // Dla precyzji nazwa główna zna też słowa ze swoich aliasów (marki, skróty): "Tarczyński Parówki" trafia w Parówki.
  const known = [...name, ...tokens(p.brand ?? ''), ...tokens(p.size ?? ''), ...aliasDocs.flat()];
  const docs: Doc[] = [{ id: p.id, name, all: known, own: [...name, ...tokens(p.brand ?? '')], alias: false }];
  for (const t of aliasDocs) docs.push({ id: p.id, name: t, all: t, own: t, alias: true });
  return docs;
}

/** Zgodność dla błędów OCR: jedna litera różnicy (podmieniona, brakująca albo dodatkowa). */
function oneOff(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length || i === b.length) return true;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}

/**
 * Token z paragonu (albo wpisany) pasuje do tokenu produktu, gdy jest taki sam, jest jego początkiem (skróty: wiej, mlek),
 * ma wspólny rdzeń (pomidor/pomidory/pomidorów) albo różni się jedną literą (OCR: leko/mleko, Piątrica/piątnica).
 */
function same(t: string, p: string): boolean {
  if (t === p) return true;
  if (t.length >= 3 && p.startsWith(t)) return true;
  if (p.length >= 5 && t.startsWith(p)) return true;
  const min = Math.min(t.length, p.length);
  if (min >= 5) {
    let c = 0;
    while (c < min && t[c] === p[c]) c++;
    if (c >= Math.max(4, min - 2)) return true;
  }
  if (t.length >= 4 && p.length >= 4 && !/\d/.test(t + p) && oneOff(t, p)) return true;
  return false;
}

const weight = (t: string) => Math.min(Math.max(t.length, 2), 6);

function score(rt: string[], doc: Doc): number {
  if (rt.length === 0) return 0;
  let hit = 0;
  let total = 0;
  for (const t of rt) {
    total += weight(t);
    if (doc.all.some((p) => same(t, p))) hit += weight(t);
  }
  const precision = hit / total;
  let nameHit = 0;
  let nameTotal = 0;
  for (const p of doc.name) {
    nameTotal += weight(p);
    if (rt.some((t) => same(t, p))) nameHit += weight(p);
  }
  const recall = nameTotal ? nameHit / nameTotal : 0;
  return 0.65 * precision + 0.35 * recall;
}

/** Klucz zapamiętanej poprawki: tekst z paragonu bez odstępów i znaków. */
export function mapKey(raw: string): string {
  return normalize(raw).replace(/ /g, '');
}

/** Dopasowuje pozycje z paragonu do produktów: najpierw to, czego aplikacja się już nauczyła, potem podobieństwo nazw. */
export function matchLines(lines: ReceiptLine[], products: Product[], learned: Record<string, string>): Matched[] {
  const docs = products.flatMap(toDocs);
  const byId = new Set(products.map((p) => p.id));
  return lines.map((line) => {
    const known = learned[mapKey(line.raw)];
    if (known && byId.has(known)) return { line, productId: known, status: 'ok' };

    const rt = tokens(line.raw);
    // Najlepszy wynik osobno dla każdego produktu (nazwa albo najlepszy alias).
    const perProduct = new Map<string, number>();
    for (const d of docs) {
      const s = score(rt, d) - (d.alias ? 0.005 : 0);
      if (s > (perProduct.get(d.id) ?? 0)) perProduct.set(d.id, s);
    }
    let best: { id: string; s: number } | null = null;
    let second = 0;
    for (const [id, s] of perProduct) {
      if (!best || s > best.s) {
        if (best) second = Math.max(second, best.s);
        best = { id, s };
      } else if (s > second) second = s;
    }
    if (!best || best.s < MAYBE_AT) return { line, status: 'no' };
    const unsure = best.s < OK_AT || best.s - second < 0.04;
    return { line, productId: best.id, status: unsure ? 'wn' : 'ok' };
  });
}

export interface Suggestion {
  product: Product;
  /** Dopasowano po nazwie głównej czy po aliasie (synonimie, marce). */
  via: 'name' | 'alias';
}

/**
 * Podpowiedzi przy wpisywaniu: produkty, w których każde wpisane słowo pasuje do początku słowa w nazwie albo aliasie.
 * Najpierw dokładna nazwa, potem nazwa główna, potem aliasy; krótsze nazwy przed dłuższymi.
 */
export function suggestProducts(query: string, products: Product[], limit = 6): Suggestion[] {
  const q = tokens(query);
  if (q.length === 0) return [];
  const found: { s: Suggestion; rank: number; len: number }[] = [];
  for (const p of products) {
    let bestRank = -1;
    let via: 'name' | 'alias' = 'name';
    for (const d of toDocs(p)) {
      const ok = q.every((t) => d.own.some((w) => w.startsWith(t) || (t.length >= 4 && same(t, w))));
      if (!ok) continue;
      const exact = d.name.length === q.length && q.every((t, i) => d.name[i] === t);
      const rank = (exact ? 3 : 1) + (d.alias ? 0 : 1);
      if (rank > bestRank) {
        bestRank = rank;
        via = d.alias ? 'alias' : 'name';
      }
    }
    if (bestRank >= 0) found.push({ s: { product: p, via }, rank: bestRank, len: p.name.length });
  }
  found.sort(
    (a, b) =>
      b.rank - a.rank ||
      Number(!!a.s.product.catalog) - Number(!!b.s.product.catalog) ||
      a.len - b.len ||
      a.s.product.name.localeCompare(b.s.product.name, 'pl'),
  );
  // Ta sama nazwa raz: produkt użytkownika ma pierwszeństwo przed pozycją słownika.
  const seen = new Set<string>();
  const unique = found.filter((f) => {
    const key = normalize(f.s.product.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.slice(0, limit).map((f) => f.s);
}
