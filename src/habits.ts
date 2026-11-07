import type { PlaceHabits, Place, Product } from './types';

/** Gdzie produkt zwykle trafia: tam, gdzie częściej go chowaliście; przy remisie lub bez historii wg domyślnego miejsca z katalogu. */
export function preferredPlace(habits: PlaceHabits, product: Product): Place {
  const h = habits[product.id];
  if (!h || h.fridge === h.pantry) return product.defaultPlace;
  return h.fridge > h.pantry ? 'fridge' : 'pantry';
}

/** Zapisuje jeden wybór miejsca dla produktu. */
export function recordPlace(habits: PlaceHabits, productId: string, place: Place): PlaceHabits {
  const h = habits[productId] ?? { fridge: 0, pantry: 0 };
  return { ...habits, [productId]: { ...h, [place]: h[place] + 1 } };
}
