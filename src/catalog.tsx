import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from './store';
import type { Product, Promo } from './types';

/** Dane z importera (scripts/import-lidl.mjs): katalog produktów i bieżące promocje Lidla. */
interface LidlFile {
  generatedAt: string;
  products: Product[];
  promos: Promo[];
}

export type CatalogStatus = 'loading' | 'ready' | 'offline-cache' | 'unavailable';

interface CatalogValue {
  promos: Promo[];
  generatedAt: string | null;
  status: CatalogStatus;
}

const CACHE_KEY = 'spizarnia.lidl.v1';
const CatalogContext = createContext<CatalogValue>({ promos: [], generatedAt: null, status: 'loading' });

function isLidlFile(x: unknown): x is LidlFile {
  const f = x as LidlFile;
  return !!f && Array.isArray(f.products) && Array.isArray(f.promos) && typeof f.generatedAt === 'string';
}

function readCache(): LidlFile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isLidlFile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { dispatch } = useStore();
  const [data, setData] = useState<LidlFile | null>(() => readCache());
  const [status, setStatus] = useState<CatalogStatus>(() => (readCache() ? 'offline-cache' : 'loading'));

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/lidl.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: unknown) => {
        if (cancelled) return;
        if (!isLidlFile(json)) throw new Error('Nieprawidłowy format danych');
        setData(json);
        setStatus('ready');
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(json));
        } catch {
          /* brak miejsca lub dostępu: pomijamy */
        }
      })
      .catch(() => {
        if (!cancelled) setStatus((s) => (s === 'offline-cache' ? s : 'unavailable'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (data && data.products.length > 0) dispatch({ type: 'catalogMerge', products: data.products });
  }, [data, dispatch]);

  const value = useMemo<CatalogValue>(
    () => ({ promos: data ? data.promos : [], generatedAt: data ? data.generatedAt : null, status }),
    [data, status],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  return useContext(CatalogContext);
}
