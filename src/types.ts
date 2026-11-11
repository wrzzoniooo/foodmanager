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
  | 'slone'
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
  /** "trashed": wyrzucone, nie liczy się do zużycia (sugestie braków) */
  kind?: 'eaten' | 'trashed';
}

/** Zakup zapisany przy "Zakończ zakupy": z tego liczymy, co kupujecie najczęściej i jak często. */
export interface PurchaseEvent {
  productId: string;
  ts: number;
  qty: number;
}

/** Ile razy produkt trafił do lodówki i do szafek z wyboru użytkownika: z tego aplikacja wie, gdzie go zwykle chowacie. */
export type PlaceHabits = Record<string, { fridge: number; pantry: number }>;

export interface AppState {
  products: Product[];
  stock: StockItem[];
  list: ListItem[];
  events: UsageEvent[];
  purchases: PurchaseEvent[];
  habits: PlaceHabits;
  /** productId -> czas odrzucenia sugestii */
  dismissed: Record<string, number>;
}
