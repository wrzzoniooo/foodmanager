import type { AppState, ListItem, Product, PurchaseEvent, StockItem, UsageEvent } from '../types';

/**
 * Synchronizacja działa na "wierszach": każda rzecz w stanie (zapas, pozycja listy, zdarzenie, produkt...)
 * to wiersz z rodzajem i identyfikatorem. Telefon wysyła tylko to, co się zmieniło od ostatniej synchronizacji.
 */
export type Kind = 'product' | 'stock' | 'list' | 'event' | 'purchase' | 'habit' | 'dismissed';

export interface Row {
  kind: Kind;
  id: string;
  data: unknown;
  deleted: boolean;
  ts: number;
}

/** "rodzaj:id" -> skrót zawartości ostatnio zsynchronizowanego wiersza. */
export type Snapshot = Record<string, string>;

export interface Entity {
  kind: Kind;
  id: string;
  data: unknown;
}

/** JSON z posortowanymi kluczami i bez pól undefined, żeby ta sama treść zawsze dawała ten sam tekst (baza zmienia kolejność kluczy). */
export function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stable(obj[k])}`).join(',')}}`;
}

/** Dwa 32-bitowe skróty obok siebie: do wykrywania zmian, nie do bezpieczeństwa. */
export function hash(s: string): string {
  let a = 5381;
  let b = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = ((a << 5) + a + c) | 0;
    b = Math.imul(b ^ c, 16777619) | 0;
  }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}${s.length.toString(36)}`;
}

export const eventId = (e: UsageEvent) => `${e.ts}-${e.productId}-${e.delta}-${e.kind ?? ''}`;
export const purchaseId = (p: PurchaseEvent) => `${p.ts}-${p.productId}-${p.qty}`;

/** Produkty z katalogu są w aplikacji na każdym telefonie, więc ich nie wysyłamy. */
const synced = (p: Product) => !p.catalog && !p.id.startsWith('lidl-');

export function collect(state: AppState): Map<string, Entity> {
  const out = new Map<string, Entity>();
  const put = (kind: Kind, id: string, data: unknown) => out.set(`${kind}:${id}`, { kind, id, data });
  for (const p of state.products) if (synced(p)) put('product', p.id, p);
  for (const s of state.stock) put('stock', s.id, s);
  for (const l of state.list) put('list', l.id, l);
  for (const e of state.events) put('event', eventId(e), e);
  for (const p of state.purchases) put('purchase', purchaseId(p), p);
  for (const [id, h] of Object.entries(state.habits)) put('habit', id, h);
  for (const [id, ts] of Object.entries(state.dismissed)) put('dismissed', id, { ts });
  return out;
}

export interface Change {
  row: Row;
  /** Nowy skrót w migawce po udanym wysłaniu; null = wiersz usunięty. */
  hash: string | null;
}

/** Co trzeba wysłać: zmienione lub nowe rzeczy oraz znaczniki usunięcia dla tych, których już nie ma. */
export function diff(state: AppState, snap: Snapshot, now = Date.now()): Change[] {
  const cur = collect(state);
  const out: Change[] = [];
  for (const [key, e] of cur) {
    const h = hash(stable(e.data));
    if (snap[key] !== h) out.push({ row: { kind: e.kind, id: e.id, data: e.data, deleted: false, ts: now }, hash: h });
  }
  for (const key of Object.keys(snap)) {
    if (cur.has(key)) continue;
    const i = key.indexOf(':');
    out.push({ row: { kind: key.slice(0, i) as Kind, id: key.slice(i + 1), data: null, deleted: true, ts: now }, hash: null });
  }
  return out;
}

/** Czy wiersz z bazy jest już taki sam jak to, co mamy. */
export function isKnown(row: Row, snap: Snapshot): boolean {
  const key = `${row.kind}:${row.id}`;
  return row.deleted ? !(key in snap) : snap[key] === hash(stable(row.data));
}

function merge<T>(arr: T[], idOf: (x: T) => string, rows: Row[]): T[] {
  if (rows.length === 0) return arr;
  const incoming = new Map(rows.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const id = idOf(x);
    seen.add(id);
    const r = incoming.get(id);
    if (!r) out.push(x);
    else if (!r.deleted) out.push(r.data as T);
  }
  for (const r of rows) if (!seen.has(r.id) && !r.deleted) out.push(r.data as T);
  return out;
}

/** Nakłada zmiany z bazy na stan. */
export function applyRows(state: AppState, rows: Row[]): AppState {
  const of = (k: Kind) => rows.filter((r) => r.kind === k);
  const habits = { ...state.habits };
  for (const r of of('habit')) {
    if (r.deleted) delete habits[r.id];
    else habits[r.id] = r.data as { fridge: number; pantry: number };
  }
  const dismissed = { ...state.dismissed };
  for (const r of of('dismissed')) {
    if (r.deleted) delete dismissed[r.id];
    else dismissed[r.id] = (r.data as { ts: number }).ts;
  }
  return {
    ...state,
    products: merge<Product>(state.products, (p) => p.id, of('product')),
    stock: merge<StockItem>(state.stock, (s) => s.id, of('stock')),
    list: merge<ListItem>(state.list, (l) => l.id, of('list')),
    events: merge<UsageEvent>(state.events, eventId, of('event')),
    purchases: merge<PurchaseEvent>(state.purchases, purchaseId, of('purchase')),
    habits,
    dismissed,
  };
}
