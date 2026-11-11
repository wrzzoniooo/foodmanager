import type { AppState, Product } from './types';
import { pluralPl } from './dates';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;
const DISMISS_DAYS = 7;

export interface Suggestion {
  product: Product;
  reason: string;
}

function usageRate(state: AppState, productId: string): { rate: number; count: number } {
  const since = Date.now() - WINDOW_DAYS * DAY_MS;
  const events = state.events.filter((e) => e.productId === productId && e.ts >= since && e.delta < 0 && e.kind !== 'trashed');
  if (events.length === 0) return { rate: 0, count: 0 };
  const units = events.reduce((sum, e) => sum - e.delta, 0);
  const first = Math.min(...events.map((e) => e.ts));
  const windowDays = Math.min(WINDOW_DAYS, Math.max(7, (Date.now() - first) / DAY_MS));
  return { rate: units / windowDays, count: events.length };
}

export function stockQty(state: AppState, productId: string): number {
  return state.stock.filter((s) => s.productId === productId).reduce((sum, s) => sum + s.qty, 0);
}

const PURCHASE_WINDOW_DAYS = 120;
/** Produkt uznajemy za często kupowany, gdy kupiono go w osobne dni co najmniej tyle razy. */
const FREQUENT_PURCHASES = 3;
/** Przy takim ułamku zwykłego odstępu między zakupami zaczynamy podejrzewać, że zapas się kończy. */
const OVERDUE_SHARE = 0.8;

/** Rytm zakupów: ile razy kupiono w osobne dni, jaki jest typowy odstęp (mediana) i ile dni minęło od ostatniego. */
function purchaseCadence(state: AppState, productId: string): { count: number; interval: number; sinceLast: number } {
  const since = Date.now() - PURCHASE_WINDOW_DAYS * DAY_MS;
  const days = [
    ...new Set(
      state.purchases.filter((p) => p.productId === productId && p.ts >= since).map((p) => Math.floor(p.ts / DAY_MS)),
    ),
  ].sort((a, b) => a - b);
  if (days.length === 0) return { count: 0, interval: 0, sinceLast: Infinity };
  const sinceLast = (Date.now() - days[days.length - 1] * DAY_MS) / DAY_MS;
  if (days.length < 2) return { count: days.length, interval: 0, sinceLast };
  const gaps = days.slice(1).map((d, i) => d - days[i]).sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const interval = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  return { count: days.length, interval: Math.max(1, Math.round(interval)), sinceLast };
}

const days = (n: number) => `${n} ${pluralPl(n, 'dzień', 'dni', 'dni')}`;

/**
 * Sugestie braków: produkty, które często kupujecie lub zużywacie, a które się skończyły albo kończą.
 * Bez magii: przy każdej widać powód.
 */
export function buildSuggestions(state: AppState, limit = 5): Suggestion[] {
  const onList = new Set(state.list.map((l) => l.productId));
  const byId = new Map(state.products.map((p) => [p.id, p]));
  const out: { s: Suggestion; urgency: number }[] = [];
  const candidates = new Set([...state.events.map((e) => e.productId), ...state.purchases.map((p) => p.productId)]);

  for (const productId of candidates) {
    const product = byId.get(productId);
    if (!product || onList.has(productId)) continue;
    const dismissedAt = state.dismissed[productId];
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * DAY_MS) continue;

    const usage = usageRate(state, productId);
    const cadence = purchaseCadence(state, productId);
    const usageKnown = usage.count >= 3 && usage.rate > 0;
    const boughtOften = cadence.count >= FREQUENT_PURCHASES && cadence.interval > 0;
    if (!usageKnown && !boughtOften) continue;

    const qty = stockQty(state, productId);
    const rhythm = usageKnown
      ? `zużywacie co ${days(Math.max(1, Math.round(1 / usage.rate)))}`
      : `kupujecie co ~${days(cadence.interval)}`;

    if (qty === 0) {
      out.push({ s: { product, reason: `Skończyło się · ${rhythm}` }, urgency: 0 });
      continue;
    }
    if (usageKnown) {
      const daysLeft = Math.max(1, Math.round(qty / usage.rate));
      if (daysLeft <= 2) {
        out.push({ s: { product, reason: `Zostało ${qty} · starczy na ~${days(daysLeft)}` }, urgency: daysLeft });
        continue;
      }
    }
    if (boughtOften && qty <= 1 && cadence.sinceLast >= OVERDUE_SHARE * cadence.interval) {
      out.push({ s: { product, reason: `Zostało ${qty} · zwykle kupujecie co ~${days(cadence.interval)}` }, urgency: 2 });
    }
  }
  return out.sort((a, b) => a.urgency - b.urgency).slice(0, limit).map((x) => x.s);
}
