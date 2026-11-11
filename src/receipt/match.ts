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

interface Doc {
  id: string;
  name: string[];
  all: string[];
}

function toDoc(p: Product): Doc {
  const name = tokens(p.name);
  return { id: p.id, name, all: [...name, ...tokens(p.brand ?? ''), ...tokens(p.size ?? '')] };
}

/** Token z paragonu pasuje do tokenu produktu, gdy jest taki sam albo jest jego początkiem (skróty: NAT, MLEK). */
function same(t: string, p: string): boolean {
  if (t === p) return true;
  if (t.length >= 3 && p.startsWith(t)) return true;
  if (p.length >= 3 && t.startsWith(p)) return true;
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
  const docs = products.map(toDoc);
  const byId = new Set(products.map((p) => p.id));
  return lines.map((line) => {
    const known = learned[mapKey(line.raw)];
    if (known && byId.has(known)) return { line, productId: known, status: 'ok' };

    const rt = tokens(line.raw);
    let best: { id: string; s: number } | null = null;
    let second = 0;
    for (const d of docs) {
      const s = score(rt, d);
      if (!best || s > best.s) {
        if (best) second = Math.max(second, best.s);
        best = { id: d.id, s };
      } else if (s > second) second = s;
    }
    if (!best || best.s < MAYBE_AT) return { line, status: 'no' };
    const unsure = best.s < OK_AT || best.s - second < 0.04;
    return { line, productId: best.id, status: unsure ? 'wn' : 'ok' };
  });
}
