import { useEffect, type ReactNode } from 'react';
import { useStore } from './store';
import type { Product } from './types';

/**
 * Katalog produktów Lidla wczytywany z pliku w aplikacji (public/data/lidl.json, z importera scripts/import-lidl.mjs).
 * Wczytujemy go raz; braki dodajecie sami skanerem kodu albo jako własny produkt.
 */
interface LidlFile {
  products: Product[];
}

const CACHE_KEY = 'spizarnia.lidl.v1';

function isLidlFile(x: unknown): x is LidlFile {
  const f = x as LidlFile;
  return !!f && Array.isArray(f.products);
}

function readCache(): Product[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isLidlFile(parsed) ? parsed.products : [];
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
    fetch(`${import.meta.env.BASE_URL}data/lidl.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: unknown) => {
        if (cancelled || !isLidlFile(json) || json.products.length === 0) return;
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
