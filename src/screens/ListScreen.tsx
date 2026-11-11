import { Fragment, useMemo, useState } from 'react';
import { Barcode, Check, Plus, ShoppingBasket, X } from 'lucide-react';
import { useStore } from '../store';
import { CATEGORIES } from '../categories';
import { buildSuggestions } from '../insights';
import { pluralPl } from '../dates';
import { AddProductSheet } from '../components/AddProductSheet';
import { CatalogSearch } from '../components/CatalogSearch';
import { ProductImage, QtyStepper, useToast } from '../components/ui';
import type { ListItem, Product } from '../types';

interface Entry {
  l: ListItem;
  p: Product;
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('pl') + text.slice(1);
}

export function ListScreen() {
  const { state, dispatch, productById } = useStore();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState<'menu' | 'scan' | null>(null);

  const suggestions = useMemo(() => buildSuggestions(state), [state]);
  const entries: Entry[] = state.list.flatMap((l) => {
    const p = productById(l.productId);
    return p ? [{ l, p }] : [];
  });
  const open = entries.filter((e) => !e.l.done).sort((a, b) => a.p.name.localeCompare(b.p.name, 'pl'));
  const done = entries.filter((e) => e.l.done);
  const groups = CATEGORIES.map((c) => ({ category: c, items: open.filter((e) => e.p.category === c.id) })).filter(
    (g) => g.items.length > 0,
  );

  const finish = () => {
    dispatch({ type: 'finishShopping' });
    toast(`${done.length} ${pluralPl(done.length, 'produkt trafił', 'produkty trafiły', 'produktów trafiło')} do siatek`);
  };

  /** Plus przy kartce: wpisana nazwa trafia na listę; przy pustym polu otwiera się pełne okno dodawania. */
  const addDraft = () => {
    const name = draft.trim();
    if (!name) {
      setSheet('menu');
      return;
    }
    const existing = state.products.find((p) => p.name.toLocaleLowerCase('pl') === name.toLocaleLowerCase('pl'));
    const product: Product = existing ?? {
      id: `own-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: capitalize(name),
      category: 'inne',
      defaultPlace: 'pantry',
    };
    if (!existing) dispatch({ type: 'productAdd', product });
    dispatch({ type: 'listAdd', productId: product.id });
    toast(`${product.name} na liście`);
    setDraft('');
  };

  const renderRow = (e: Entry) => (
    <li key={e.l.id} className={e.l.done ? 'pl-li is-done' : 'pl-li'}>
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
            <div className="section-head">
              <h2 className="cat-label">Może brakuje?</h2>
              {suggestions.length > 1 ? (
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    for (const s of suggestions) dispatch({ type: 'listAdd', productId: s.product.id });
                    toast('Dodano do listy zakupów');
                  }}
                >
                  Dodaj wszystkie
                </button>
              ) : null}
            </div>
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
          <h2 className="cat-label">Na kartce</h2>
          <div className="paper">
            <div className="paper-head">
              <h3>Do kupienia</h3>
              <span className="meta">
                {open.length} {pluralPl(open.length, 'pozycja', 'pozycje', 'pozycji')}
              </span>
            </div>

            {entries.length === 0 ? <p className="paper-empty">Kartka jest pusta. Dopisz pierwszy produkt poniżej.</p> : null}

            {entries.length > 0 ? (
              <ul className="pl-list">
                {groups.map((g) => (
                  <Fragment key={g.category.id}>
                    <li className="pl-cat">{g.category.label}</li>
                    {g.items.map(renderRow)}
                  </Fragment>
                ))}
                {done.length > 0 ? (
                  <li className="pl-basket">
                    <div className="pl-basket-head">
                      <ShoppingBasket size={18} aria-hidden="true" />
                      W koszyku
                      <span className="pl-basket-count">{done.length}</span>
                    </div>
                    <ul className="pl-list">{done.map(renderRow)}</ul>
                  </li>
                ) : null}
              </ul>
            ) : null}

            <form
              className="paper-add"
              onSubmit={(e) => {
                e.preventDefault();
                addDraft();
              }}
            >
              <input
                className="paper-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Dopisz produkt…"
                aria-label="Dopisz produkt"
                enterKeyHint="done"
                autoComplete="off"
              />
              <button type="button" className="round-btn" aria-label="Skanuj kod" onClick={() => setSheet('scan')}>
                <Barcode size={20} aria-hidden="true" />
              </button>
              <button type="submit" className="round-btn pri" aria-label={draft.trim() ? 'Dodaj do listy' : 'Więcej sposobów dodawania'}>
                <Plus size={20} aria-hidden="true" />
              </button>
            </form>
          </div>
        </section>
      </div>

      {done.length > 0 ? (
        <div className="sticky-action">
          <button type="button" className="btn wide" onClick={finish}>
            Zakończ zakupy ({done.length})
          </button>
        </div>
      ) : null}

      {sheet ? <AddProductSheet place="pantry" forList initialMode={sheet} onClose={() => setSheet(null)} /> : null}
    </section>
  );
}
