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
  /** Produkt z katalogu wczytanego razem z aplikacją: każdy telefon go ma, więc nie synchronizujemy go. */
  catalog?: boolean;
  /** Inne nazwy tego samego produktu: synonimy, marki i skróty z paragonów (małe litery). */
  aliases?: string[];
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
  /** Skąd wiemy o zakupie: z listy ("Zakończ zakupy") albo z paragonu (dokładniejsze, zastępuje wpisy z listy). */
  source?: 'list' | 'receipt';
  /** Wyprawa po zakupy: wszystkie wpisy z jednego "Zakończ zakupy" lub jednego paragonu mają ten sam znacznik. */
  trip?: string;
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
  /** Odciski dodanych paragonów (odcisk -> czas), żeby ten sam paragon nie wszedł dwa razy. */
  receipts: Record<string, number>;
  /** Nauczone dopasowania: znormalizowany tekst z paragonu -> produkt. */
  receiptMap: Record<string, string>;
  /** productId -> czas odrzucenia sugestii */
  dismissed: Record<string, number>;
}
