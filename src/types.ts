export type CategoryId =
  | 'pieczywo'
  | 'nabial'
  | 'sery'
  | 'mieso'
  | 'warzywa'
  | 'owoce'
  | 'sypkie'
  | 'konserwy'
  | 'sosy'
  | 'napoje'
  | 'mrozonki'
  | 'slodycze'
  | 'inne';

export type Place = 'fridge' | 'pantry';
export type Location = Place | 'bags';

export interface Product {
  id: string;
  name: string;
  brand?: string;
  size?: string;
  category: CategoryId;
  defaultPlace: Place;
  imageUrl?: string;
  /** Strona produktu u źródła (np. Lidl) */
  url?: string;
  /** Kod kreskowy (EAN), gdy produkt pochodzi z Open Food Facts */
  barcode?: string;
}

export interface StockItem {
  id: string;
  productId: string;
  location: Location;
  qty: number;
  /** Data ważności, ISO (RRRR-MM-DD) */
  expires?: string;
}

export interface ListItem {
  id: string;
  productId: string;
  qty: number;
  done: boolean;
}

/** Zdarzenie zużycia: delta < 0 oznacza zużycie sztuk. */
export interface UsageEvent {
  productId: string;
  ts: number;
  delta: number;
}

/** Promocja z oferty Lidla. Daty ISO (RRRR-MM-DD), włącznie. */
export interface Promo {
  productId: string;
  priceNow: number;
  priceOld?: number;
  from: string;
  to: string;
}

export interface AppState {
  products: Product[];
  stock: StockItem[];
  list: ListItem[];
  events: UsageEvent[];
  /** productId -> czas odrzucenia sugestii */
  dismissed: Record<string, number>;
}
