import type { AppState, PurchaseEvent, StockItem } from '../types';

/** Pozycja gotowa do zapisania: produkt i ilość kupiona (po przeglądzie). */
export interface ReceiptItem {
  productId: string;
  qty: number;
}

const DAY = 24 * 60 * 60 * 1000;
/** Wyprawę z listy uznajemy za tę samą co paragon, jeśli "Zakończ zakupy" było najwyżej tyle dni temu. */
const TRIP_WINDOW_DAYS = 3;

export type Change = 'new' | 'same' | 'more' | 'less' | 'removed';

export interface Row {
  productId: string;
  /** Ile było zapisane z listy dla tej wyprawy (0 = nie było). */
  was: number;
  /** Ile jest po paragonie. */
  now: number;
  kind: Change;
}

export interface Plan {
  /** Znacznik wyprawy z listy, którą korygujemy, albo null, gdy paragon to nowe zakupy. */
  trip: string | null;
  rows: Row[];
  /** Produkty z wyprawy, których nie ma na paragonie. */
  missing: { productId: string; qty: number }[];
}

function sumBy(items: ReceiptItem[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of items) m.set(i.productId, (m.get(i.productId) ?? 0) + i.qty);
  return m;
}

/** Ostatnia wyprawa z "Zakończ zakupy", która nie została jeszcze skorygowana paragonem. */
export function findTrip(state: AppState, now: number): string | null {
  let best: string | null = null;
  for (const p of state.purchases) {
    if (!p.trip || (p.source ?? 'list') !== 'list') continue;
    const ts = Number(p.trip);
    if (!Number.isFinite(ts) || now - ts > TRIP_WINDOW_DAYS * DAY) continue;
    if (best === null || Number(p.trip) > Number(best)) best = p.trip;
  }
  return best;
}

/** Porównuje paragon z tym, co zapisała lista: co nowe, co się zmieniło, czego brakuje na paragonie. */
export function planReceipt(state: AppState, items: ReceiptItem[], now = Date.now()): Plan {
  const trip = findTrip(state, now);
  const was = new Map<string, number>();
  if (trip) {
    for (const p of state.purchases) {
      if (p.trip === trip && (p.source ?? 'list') === 'list') was.set(p.productId, (was.get(p.productId) ?? 0) + p.qty);
    }
  }
  const got = sumBy(items);
  const rows: Row[] = [...got].map(([productId, qty]) => {
    const w = was.get(productId) ?? 0;
    return { productId, was: w, now: qty, kind: w === 0 ? 'new' : qty === w ? 'same' : qty > w ? 'more' : 'less' };
  });
  const missing = [...was].filter(([id]) => !got.has(id)).map(([productId, qty]) => ({ productId, qty }));
  return { trip, rows, missing };
}

export interface Summary {
  changed: number;
  added: number;
  removed: number;
}

function adjustBag(stock: StockItem[], productId: string, delta: number, newId: () => string): StockItem[] {
  if (delta === 0) return stock;
  if (delta > 0) {
    const bag = stock.find((s) => s.productId === productId && s.location === 'bags');
    if (bag) return stock.map((s) => (s.id === bag.id ? { ...s, qty: s.qty + delta } : s));
    return [...stock, { id: newId(), productId, location: 'bags', qty: delta }];
  }
  let left = -delta;
  const out: StockItem[] = [];
  for (const s of stock) {
    if (s.productId === productId && s.location === 'bags' && left > 0) {
      const take = Math.min(left, s.qty);
      left -= take;
      if (s.qty - take > 0) out.push({ ...s, qty: s.qty - take });
    } else out.push(s);
  }
  return out;
}

/**
 * Nakłada paragon na stan: siatka dostaje dokładnie to, co kupiono (różnicę względem listy, bez dublowania),
 * historia zakupów zapisuje ilości z paragonu zamiast wpisów z listy, a kupione rzeczy znikają z listy.
 */
export function applyReceipt(
  state: AppState,
  items: ReceiptItem[],
  removeMissing: Record<string, boolean>,
  fingerprint: string,
  learned: Record<string, string>,
  newId: () => string,
  now = Date.now(),
): { state: AppState; summary: Summary } {
  const plan = planReceipt(state, items, now);
  let stock = state.stock;
  const summary: Summary = { changed: 0, added: 0, removed: 0 };
  const finalQty = new Map<string, number>();

  for (const r of plan.rows) {
    stock = adjustBag(stock, r.productId, r.now - r.was, newId);
    finalQty.set(r.productId, r.now);
    if (r.kind === 'new') summary.added += 1;
    else if (r.kind !== 'same') summary.changed += 1;
  }
  for (const m of plan.missing) {
    if (removeMissing[m.productId] ?? true) {
      stock = adjustBag(stock, m.productId, -m.qty, newId);
      summary.removed += 1;
    } else finalQty.set(m.productId, m.qty);
  }

  // Historia: wpisy z listy dla tej wyprawy zastępujemy wpisami z paragonu.
  const trip = plan.trip ?? String(now);
  const ts = plan.trip ? Number(plan.trip) : now;
  const purchases: PurchaseEvent[] = state.purchases.filter((p) => !(plan.trip && p.trip === plan.trip && (p.source ?? 'list') === 'list'));
  for (const [productId, qty] of finalQty) {
    if (qty > 0) purchases.push({ productId, ts, qty, source: 'receipt', trip });
  }

  // Lista: kupione pozycje (odhaczone i nie) znikają, bo są już w siatce.
  const bought = new Set(plan.rows.map((r) => r.productId));
  const list = state.list.filter((l) => !bought.has(l.productId));

  return {
    state: {
      ...state,
      stock,
      purchases,
      list,
      receipts: { ...state.receipts, [fingerprint]: now },
      receiptMap: { ...state.receiptMap, ...learned },
    },
    summary,
  };
}
