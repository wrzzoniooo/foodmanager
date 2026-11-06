import type { AppState, Product, Promo } from './types';
import { daysUntil, formatPrice, pluralPl, weekdayGenitive } from './dates';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;
const DISMISS_DAYS = 7;

export interface Suggestion {
  product: Product;
  reason: string;
}

function usageRate(state: AppState, productId: string): { rate: number; count: number } {
  const since = Date.now() - WINDOW_DAYS * DAY_MS;
  const events = state.events.filter((e) => e.productId === productId && e.ts >= since && e.delta < 0);
  if (events.length === 0) return { rate: 0, count: 0 };
  const units = events.reduce((sum, e) => sum - e.delta, 0);
  const first = Math.min(...events.map((e) => e.ts));
  const windowDays = Math.min(WINDOW_DAYS, Math.max(7, (Date.now() - first) / DAY_MS));
  return { rate: units / windowDays, count: events.length };
}

export function stockQty(state: AppState, productId: string): number {
  return state.stock.filter((s) => s.productId === productId).reduce((sum, s) => sum + s.qty, 0);
}

/** Produkty, które często zużywacie. */
export function isFrequent(state: AppState, productId: string): boolean {
  return usageRate(state, productId).count >= 3;
}

/** Sugestie braków na bazie historii zużycia. Bez magii: przy każdej widać powód. */
export function buildSuggestions(state: AppState, limit = 5): Suggestion[] {
  const onList = new Set(state.list.map((l) => l.productId));
  const byId = new Map(state.products.map((p) => [p.id, p]));
  const out: { s: Suggestion; urgency: number }[] = [];

  for (const productId of new Set(state.events.map((e) => e.productId))) {
    const product = byId.get(productId);
    if (!product || onList.has(productId)) continue;
    const dismissedAt = state.dismissed[productId];
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * DAY_MS) continue;

    const { rate, count } = usageRate(state, productId);
    if (count < 3 || rate <= 0) continue;

    const qty = stockQty(state, productId);
    const every = Math.max(1, Math.round(1 / rate));
    if (qty === 0) {
      out.push({ s: { product, reason: `Skończyło się · zużywacie co ${every} ${pluralPl(every, 'dzień', 'dni', 'dni')}` }, urgency: 0 });
      continue;
    }
    const daysLeft = Math.max(1, Math.round(qty / rate));
    if (daysLeft <= 2) {
      out.push({
        s: { product, reason: `Zostało ${qty} · starczy na ~${daysLeft} ${pluralPl(daysLeft, 'dzień', 'dni', 'dni')}` },
        urgency: daysLeft,
      });
    }
  }
  return out.sort((a, b) => a.urgency - b.urgency).slice(0, limit).map((x) => x.s);
}

export interface PromoView {
  promo: Promo;
  product: Product;
  /** Procent obniżki; brak, gdy oferta nie podaje ceny przed obniżką */
  percent?: number;
  active: boolean;
  /** Etykieta ważności, np. "do soboty" albo "od poniedziałku" */
  validity: string;
  priceNowLabel: string;
  priceOldLabel?: string;
}

/** Bieżące i nadchodzące promocje dopasowane do produktów katalogu (daty z oferty Lidla). */
export function buildPromos(products: Product[], promos: Promo[]): PromoView[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const views: PromoView[] = [];
  for (const promo of promos) {
    const product = byId.get(promo.productId);
    if (!product) continue;
    const fromIn = daysUntil(promo.from);
    const toIn = daysUntil(promo.to);
    if (toIn < 0) continue;
    const active = fromIn <= 0;
    let validity: string;
    if (!active) validity = `od ${weekdayGenitive(fromIn)}`;
    else if (toIn === 0) validity = 'tylko dziś';
    else validity = `do ${weekdayGenitive(toIn)}`;
    views.push({
      promo,
      product,
      percent: promo.priceOld ? Math.round((1 - promo.priceNow / promo.priceOld) * 100) : undefined,
      active,
      validity,
      priceNowLabel: formatPrice(promo.priceNow),
      priceOldLabel: promo.priceOld ? formatPrice(promo.priceOld) : undefined,
    });
  }
  return views.sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));
}
