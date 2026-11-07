import { useCallback, useState } from 'react';
import type { Place } from './types';

export type Layout = 'cards' | 'rows' | 'grid';
export type Order = 'expiry' | 'category';

export interface ViewPrefs {
  layout: Layout;
  order: Order;
}

/** Ustawienia widoku trzymane tylko na tym telefonie, osobno dla Lodówki i Szafek. */
const KEY = 'spizarnia.view.v1';

const DEFAULTS: Record<Place, ViewPrefs> = {
  fridge: { layout: 'cards', order: 'expiry' },
  pantry: { layout: 'rows', order: 'category' },
};

const LAYOUTS: Layout[] = ['cards', 'rows', 'grid'];
const ORDERS: Order[] = ['expiry', 'category'];

function loadAll(): Partial<Record<Place, Partial<ViewPrefs>>> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<Place, Partial<ViewPrefs>>>) : {};
  } catch {
    return {};
  }
}

function load(place: Place): ViewPrefs {
  const saved = loadAll()[place] ?? {};
  const base = DEFAULTS[place];
  return {
    layout: LAYOUTS.includes(saved.layout as Layout) ? (saved.layout as Layout) : base.layout,
    order: ORDERS.includes(saved.order as Order) ? (saved.order as Order) : base.order,
  };
}

export function useViewPrefs(place: Place): [ViewPrefs, (patch: Partial<ViewPrefs>) => void] {
  const [prefs, setPrefs] = useState<ViewPrefs>(() => load(place));
  const update = useCallback(
    (patch: Partial<ViewPrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(KEY, JSON.stringify({ ...loadAll(), [place]: next }));
        } catch {
          /* brak dostępu do pamięci lokalnej: ustawienie działa do zamknięcia aplikacji */
        }
        return next;
      });
    },
    [place],
  );
  return [prefs, update];
}
