import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { AppState, Place, Product, StockItem } from './types';
import { createSeed } from './data/seed';
import { preferredPlace, recordPlace } from './habits';
import { applyRows, type Row } from './sync/rows';

const STORAGE_KEY = 'spizarnia.v1';

type Action =
  | { type: 'stockAdjust'; stockId: string; delta: number }
  | { type: 'stockRemove'; stockId: string; reason: 'eaten' | 'trashed'; ts?: number }
  | { type: 'stockRestore'; item: StockItem; eventTs?: number }
  | { type: 'listUndoAdd'; productId: string }
  | { type: 'stockExpiry'; stockId: string; expires?: string }
  | { type: 'stockMove'; stockId: string; place: Place }
  | { type: 'stockAdd'; productId: string; place: Place }
  | { type: 'unpack'; stockId: string; place: Place }
  | { type: 'unpackAll' }
  | { type: 'listAdd'; productId: string; qty?: number }
  | { type: 'listAdjust'; listId: string; delta: number }
  | { type: 'listToggle'; listId: string }
  | { type: 'finishShopping' }
  | { type: 'dismissSuggestion'; productId: string }
  | { type: 'catalogMerge'; products: Product[] }
  | { type: 'productAdd'; product: Product }
  | { type: 'remoteApply'; rows: Row[] }
  | { type: 'syncReset' }
  | { type: 'clearAll' }
  | { type: 'reset' };

/** Produkty prawdziwe (nie z danych demo): z katalogu Lidla, Open Food Facts i własne. */
function isRealProduct(p: Product): boolean {
  return /^(lidl|off|own)-/.test(p.id);
}

let counter = 0;
function newId(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

function mergeInto(stock: StockItem[], item: StockItem): StockItem[] {
  const existing = stock.find((s) => s.productId === item.productId && s.location === item.location && s.id !== item.id);
  if (!existing) return [...stock.filter((s) => s.id !== item.id), item];
  const expires = [existing.expires, item.expires].filter(Boolean).sort()[0];
  return stock
    .filter((s) => s.id !== item.id)
    .map((s) => (s.id === existing.id ? { ...s, qty: s.qty + item.qty, expires } : s));
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'stockAdjust': {
      const item = state.stock.find((s) => s.id === action.stockId);
      if (!item) return state;
      const qty = item.qty + action.delta;
      const events =
        action.delta < 0 && item.location !== 'bags'
          ? [...state.events, { productId: item.productId, ts: Date.now(), delta: action.delta }]
          : state.events;
      const stock =
        qty <= 0
          ? state.stock.filter((s) => s.id !== item.id)
          : state.stock.map((s) => (s.id === item.id ? { ...s, qty } : s));
      return { ...state, stock, events };
    }
    case 'stockRemove': {
      const item = state.stock.find((s) => s.id === action.stockId);
      if (!item) return state;
      const events =
        item.location === 'bags'
          ? state.events
          : [...state.events, { productId: item.productId, ts: action.ts ?? Date.now(), delta: -item.qty, kind: action.reason }];
      return { ...state, stock: state.stock.filter((s) => s.id !== item.id), events };
    }
    case 'stockRestore': {
      // Cofnięcie "zjedzone" / "wyrzucone": produkt wraca na miejsce, a zapis zużycia znika.
      if (state.stock.some((s) => s.id === action.item.id)) return state;
      const events =
        action.eventTs === undefined
          ? state.events
          : state.events.filter((e) => !(e.ts === action.eventTs && e.productId === action.item.productId));
      return { ...state, stock: [...state.stock, action.item], events };
    }
    case 'listUndoAdd': {
      const item = state.list.find((l) => l.productId === action.productId);
      if (!item) return state;
      return {
        ...state,
        list: item.qty > 1 ? state.list.map((l) => (l.id === item.id ? { ...l, qty: l.qty - 1 } : l)) : state.list.filter((l) => l.id !== item.id),
      };
    }
    case 'stockMove': {
      const item = state.stock.find((s) => s.id === action.stockId);
      if (!item || item.location === 'bags' || item.location === action.place) return state;
      return {
        ...state,
        stock: mergeInto(state.stock, { ...item, location: action.place }),
        habits: recordPlace(state.habits, item.productId, action.place),
      };
    }
    case 'stockExpiry':
      return {
        ...state,
        stock: state.stock.map((s) => (s.id === action.stockId ? { ...s, expires: action.expires || undefined } : s)),
      };
    case 'stockAdd': {
      const existing = state.stock.find((s) => s.productId === action.productId && s.location === action.place);
      const habits = recordPlace(state.habits, action.productId, action.place);
      if (existing) {
        return { ...state, habits, stock: state.stock.map((s) => (s.id === existing.id ? { ...s, qty: s.qty + 1 } : s)) };
      }
      return {
        ...state,
        habits,
        stock: [...state.stock, { id: newId('s'), productId: action.productId, location: action.place, qty: 1 }],
      };
    }
    case 'unpack': {
      const item = state.stock.find((s) => s.id === action.stockId);
      if (!item || item.location !== 'bags') return state;
      return {
        ...state,
        stock: mergeInto(state.stock, { ...item, location: action.place }),
        habits: recordPlace(state.habits, item.productId, action.place),
      };
    }
    case 'unpackAll': {
      const byId = new Map(state.products.map((p) => [p.id, p]));
      let stock = state.stock;
      for (const item of state.stock.filter((s) => s.location === 'bags')) {
        const product = byId.get(item.productId);
        const place = product ? preferredPlace(state.habits, product) : 'pantry';
        stock = mergeInto(stock, { ...item, location: place });
      }
      return { ...state, stock };
    }
    case 'listAdd': {
      const qty = action.qty ?? 1;
      const existing = state.list.find((l) => l.productId === action.productId);
      if (existing) {
        return {
          ...state,
          list: state.list.map((l) => (l.id === existing.id ? { ...l, qty: l.done ? qty : l.qty + qty, done: false } : l)),
        };
      }
      return { ...state, list: [...state.list, { id: newId('l'), productId: action.productId, qty, done: false }] };
    }
    case 'listAdjust': {
      const list = state.list
        .map((l) => (l.id === action.listId ? { ...l, qty: l.qty + action.delta } : l))
        .filter((l) => l.qty > 0);
      return { ...state, list };
    }
    case 'listToggle':
      return { ...state, list: state.list.map((l) => (l.id === action.listId ? { ...l, done: !l.done } : l)) };
    case 'finishShopping': {
      let stock = state.stock;
      const now = Date.now();
      const purchases = [...state.purchases];
      for (const l of state.list.filter((x) => x.done)) {
        stock = mergeInto(stock, { id: newId('b'), productId: l.productId, location: 'bags', qty: l.qty });
        purchases.push({ productId: l.productId, ts: now, qty: l.qty });
      }
      return { ...state, stock, purchases, list: state.list.filter((l) => !l.done) };
    }
    case 'dismissSuggestion':
      return { ...state, dismissed: { ...state.dismissed, [action.productId]: Date.now() } };
    case 'catalogMerge': {
      const incoming = new Map(action.products.map((p) => [p.id, p]));
      const kept = state.products.map((p) => incoming.get(p.id) ?? p);
      const known = new Set(state.products.map((p) => p.id));
      const added = action.products.filter((p) => !known.has(p.id));
      if (added.length === 0 && kept.every((p, i) => p === state.products[i])) return state;
      return { ...state, products: [...kept, ...added] };
    }
    case 'productAdd':
      return state.products.some((p) => p.id === action.product.id)
        ? state
        : { ...state, products: [...state.products, action.product] };
    case 'remoteApply':
      return applyRows(state, action.rows);
    case 'syncReset':
      // Dołączenie do wspólnego gospodarstwa: dane z tego telefonu ustępują wspólnym, zostaje tylko katalog Lidla.
      return {
        products: state.products.filter((p) => p.catalog || p.id.startsWith('lidl-')),
        stock: [],
        list: [],
        events: [],
        purchases: [],
        habits: {},
        dismissed: {},
      };
    case 'clearAll': {
      // Czyści dane demo: zostają tylko produkty z katalogu Lidla.
      const products = state.products.filter(isRealProduct);
      return { products, stock: [], list: [], events: [], purchases: [], habits: {}, dismissed: {} };
    }
    case 'reset': {
      const seed = createSeed();
      return { ...seed, products: [...seed.products, ...state.products.filter(isRealProduct)] };
    }
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      if (
        Array.isArray(parsed.products) &&
        Array.isArray(parsed.stock) &&
        Array.isArray(parsed.list) &&
        Array.isArray(parsed.events)
      ) {
        return { dismissed: {}, purchases: [], habits: {}, ...parsed } as AppState;
      }
    }
  } catch {
    /* brak dostępu do pamięci lokalnej: startujemy z danymi przykładowymi */
  }
  return createSeed();
}

interface StoreValue {
  state: AppState;
  dispatch: (action: Action) => void;
  productById: (id: string) => Product | undefined;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignorujemy błąd zapisu */
    }
  }, [state]);

  const value = useMemo<StoreValue>(() => {
    const map = new Map(state.products.map((p) => [p.id, p]));
    return { state, dispatch, productById: (id) => map.get(id) };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore poza StoreProvider');
  return ctx;
}
