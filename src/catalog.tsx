import { useEffect, type ReactNode } from 'react';
import { useStore } from './store';
import type { Product } from './types';

/**
 * Słownik prostych nazw produktów (bez producenta i gramatury) wczytywany z pliku w aplikacji (public/data/produkty.json, budowany ze scripts/dictionary.txt).
 * Wczytujemy go raz; braki dodajecie sami skanerem kodu albo jako własny produkt.
 */
interface DictFile {
  products: Product[];
}

const CACHE_KEY = 'spizarnia.dict.v1';

function isDictFile(x: unknown): x is DictFile {
  const f = x as DictFile;
  return !!f && Array.isArray(f.products);
}

function readCache(): Product[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isDictFile(parsed) ? parsed.products : [];
  } catch {
    return [];
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { dispatch } = useStore();

  useEffect(() => {
    // Najpierw to, co zapamiętane w telefonie (działa bez internetu), potem świeży plik z aplikacji.
    const cached = readCache();
    if (cached.length > 0) dispatch({ type: 'catalogMerge', products: cached });

    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/produkty.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: unknown) => {
        if (cancelled || !isDictFile(json) || json.products.length === 0) return;
        dispatch({ type: 'catalogMerge', products: json.products });
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ products: json.products }));
        } catch {
          /* brak miejsca lub dostępu: pomijamy */
        }
      })
      .catch(() => {
        /* bez sieci zostaje katalog z pamięci telefonu */
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return <>{children}</>;
}
