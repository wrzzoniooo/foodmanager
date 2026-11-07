import { useMemo, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../store';
import { CATEGORY_BY_ID } from '../categories';
import { ProductImage, SearchField } from './ui';
import type { Product } from '../types';

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function searchProducts(products: Product[], query: string, limit = 8): Product[] {
  const q = norm(query.trim());
  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  if (!q) return sorted.slice(0, limit);
  const words = q.split(/\s+/);
  return sorted
    .filter((p) => {
      const hay = norm(`${p.name} ${p.brand ?? ''} ${CATEGORY_BY_ID[p.category].label}`);
      return words.every((w) => hay.includes(w));
    })
    .slice(0, limit);
}

/** Wyszukiwarka katalogu z przyciskiem akcji przy każdym wyniku. */
export function CatalogSearch({
  query,
  onQuery,
  onPick,
  actionLabel,
  placeholder,
  autoFocus,
  showWhenEmpty = false,
  between,
  resultsLabel,
}: {
  query: string;
  onQuery: (q: string) => void;
  onPick: (p: Product) => void;
  actionLabel: string;
  placeholder: string;
  autoFocus?: boolean;
  showWhenEmpty?: boolean;
  /** Treść między polem wyszukiwania a wynikami (np. opcje dodawania). */
  between?: ReactNode;
  /** Nagłówek nad listą wyników. */
  resultsLabel?: string;
}) {
  const { state } = useStore();
  const results = useMemo(
    () => (query.trim() || showWhenEmpty ? searchProducts(state.products, query, showWhenEmpty ? 12 : 6) : []),
    [state.products, query, showWhenEmpty],
  );
  const hasQuery = query.trim().length > 0;

  return (
    <div className="catalog-search">
      <SearchField value={query} onChange={onQuery} placeholder={placeholder} autoFocus={autoFocus} />
      {between}
      {results.length > 0 ? (
        <section className="section">
          {resultsLabel ? <h2 className="cat-label">{resultsLabel}</h2> : null}
        <ul className="results">
          {results.map((p) => (
            <li key={p.id} className="row">
              <ProductImage product={p} size={40} />
              <div className="grow">
                <div className="name">{p.name}</div>
                <div className="meta">{[p.brand, p.size].filter(Boolean).join(' · ')}</div>
              </div>
              <button type="button" className="btn small" onClick={() => onPick(p)} aria-label={`${actionLabel}: ${p.name}`}>
                <Plus size={14} aria-hidden="true" />
                {actionLabel}
              </button>
            </li>
          ))}
        </ul>
        </section>
      ) : hasQuery ? (
        <p className="note">Nie ma takiego produktu w katalogu.</p>
      ) : null}
    </div>
  );
}
