import { useMemo, useState } from 'react';
import { Check, ListChecks, X } from 'lucide-react';
import { useStore } from '../store';
import { useCatalog } from '../catalog';
import { CATEGORIES } from '../categories';
import { buildPromos, buildSuggestions } from '../insights';
import { pluralPl } from '../dates';
import { CatalogSearch } from '../components/CatalogSearch';
import { ProductImage, QtyStepper, useToast } from '../components/ui';
import type { ListItem, Product } from '../types';

interface Entry {
  l: ListItem;
  p: Product;
}

export function ListScreen() {
  const { state, dispatch, productById } = useStore();
  const toast = useToast();
  const { promos } = useCatalog();
  const [query, setQuery] = useState('');

  const suggestions = useMemo(() => buildSuggestions(state), [state]);
  const promoByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of buildPromos(state.products, promos)) if (v.active && v.percent) map.set(v.product.id, v.percent);
    return map;
  }, [state.products, promos]);

  const entries: Entry[] = state.list.flatMap((l) => {
    const p = productById(l.productId);
    return p ? [{ l, p }] : [];
  });
  const order = (e: Entry) => CATEGORIES.findIndex((c) => c.id === e.p.category);
  const open = entries.filter((e) => !e.l.done).sort((a, b) => order(a) - order(b) || a.p.name.localeCompare(b.p.name, 'pl'));
  const done = entries.filter((e) => e.l.done);

  const finish = () => {
    dispatch({ type: 'finishShopping' });
    toast(`${done.length} ${pluralPl(done.length, 'produkt trafił', 'produkty trafiły', 'produktów trafiło')} do siatek`);
  };

  const renderRow = (e: Entry) => (
    <li key={e.l.id} className={e.l.done ? 'card row is-done' : 'card row'}>
      <button
        type="button"
        className={e.l.done ? 'check on' : 'check'}
        role="checkbox"
        aria-checked={e.l.done}
        aria-label={`Kupione: ${e.p.name}`}
        onClick={() => dispatch({ type: 'listToggle', listId: e.l.id })}
      >
        {e.l.done ? <Check size={16} aria-hidden="true" /> : null}
      </button>
      <ProductImage product={e.p} size={40} />
      <div className="grow">
        <div className="name">{e.p.name}</div>
        <div className="meta">
          {promoByProduct.has(e.p.id) ? <span className="tag red">-{promoByProduct.get(e.p.id)}% dziś</span> : null}{' '}
          {[e.p.brand, e.p.size].filter(Boolean).join(' · ')}
        </div>
      </div>
      {e.l.done ? null : (
        <QtyStepper qty={e.l.qty} name={e.p.name} onChange={(delta) => dispatch({ type: 'listAdjust', listId: e.l.id, delta })} />
      )}
    </li>
  );

  return (
    <section className="screen" aria-label="Lista zakupów">
      <header className="head">
        <h1>Lista zakupów</h1>
      </header>

      <CatalogSearch
        query={query}
        onQuery={setQuery}
        placeholder="Szukaj produktów Lidla"
        actionLabel="Dodaj"
        onPick={(p) => {
          dispatch({ type: 'listAdd', productId: p.id });
          toast(`${p.name} na liście`);
        }}
      />

      <div className="sections">
      {suggestions.length > 0 && !query.trim() ? (
        <section className="section">
          <h2 className="cat-label">Może brakuje?</h2>
          <ul className="rows">
            {suggestions.map(({ product, reason }) => (
              <li key={product.id} className="card row">
                <ProductImage product={product} />
                <div className="grow">
                  <div className="name">{product.name}</div>
                  <div className="meta">{reason}</div>
                </div>
                <button type="button" className="btn small ghost" onClick={() => dispatch({ type: 'listAdd', productId: product.id })}>
                  Dodaj
                </button>
                <button
                  type="button"
                  className="icon-btn small"
                  aria-label={`Nie sugeruj: ${product.name}`}
                  onClick={() => dispatch({ type: 'dismissSuggestion', productId: product.id })}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section">
        <h2 className="cat-label">Na liście · {entries.length}</h2>
        {entries.length === 0 ? (
          <div className="empty">
            <ListChecks size={32} aria-hidden="true" />
            <h2>Lista jest pusta</h2>
            <p>Wyszukaj produkt powyżej albo dodaj sugestię.</p>
          </div>
        ) : (
          <ul className="rows">
            {open.map(renderRow)}
            {done.map(renderRow)}
          </ul>
        )}
      </section>
      </div>

      {done.length > 0 ? (
        <div className="sticky-action">
          <button type="button" className="btn wide" onClick={finish}>
            Zakończ zakupy ({done.length})
          </button>
        </div>
      ) : null}
    </section>
  );
}
