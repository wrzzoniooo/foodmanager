import { useMemo, useState } from 'react';
import { Plus, Search, ShoppingBag } from 'lucide-react';
import { useStore } from '../store';
import { useCatalog } from '../catalog';
import { CATEGORIES } from '../categories';
import { buildPromos } from '../insights';
import { daysUntil, expiryLabel, pluralPl } from '../dates';
import { AddProductSheet } from '../components/AddProductSheet';
import { Chips, ProductImage, QtyStepper, SearchField, useToast } from '../components/ui';
import type { CategoryId, Place, Product, StockItem } from '../types';

interface Entry {
  s: StockItem;
  p: Product;
}

const PLACE_LABEL: Record<Place, { title: string; added: string }> = {
  fridge: { title: 'Lodówka', added: 'do lodówki' },
  pantry: { title: 'Szafki', added: 'do szafek' },
};

function meta(p: Product): string {
  return [p.brand, p.size].filter(Boolean).join(' · ');
}

export function StockScreen({ place }: { place: Place }) {
  const { state, dispatch, productById } = useStore();
  const toast = useToast();
  const { promos } = useCatalog();
  const isFridge = place === 'fridge';

  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<'stock' | 'bags'>('stock');

  const promoByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of buildPromos(state.products, promos)) if (v.active && v.percent) map.set(v.product.id, v.percent);
    return map;
  }, [state.products, promos]);

  const toEntries = (items: StockItem[]): Entry[] =>
    items.flatMap((s) => {
      const p = productById(s.productId);
      return p ? [{ s, p }] : [];
    });

  const placeEntries = toEntries(state.stock.filter((s) => s.location === place));
  const bagEntries = toEntries(state.stock.filter((s) => s.location === 'bags'));

  const q = query.trim().toLowerCase();
  const visible = placeEntries.filter(
    (e) => (cat === 'all' || e.p.category === cat) && (!q || `${e.p.name} ${e.p.brand ?? ''}`.toLowerCase().includes(q)),
  );

  const groups = CATEGORIES.map((c) => ({
    category: c,
    entries: visible.filter((e) => e.p.category === c.id).sort((a, b) => a.p.name.localeCompare(b.p.name, 'pl')),
  })).filter((g) => g.entries.length > 0);

  const presentCategories = CATEGORIES.filter((c) => placeEntries.some((e) => e.p.category === c.id));
  const chipOptions: { id: CategoryId | 'all'; label: string }[] = [
    { id: 'all', label: 'Wszystko' },
    ...presentCategories.map((c) => ({ id: c.id, label: c.label.split(' i ')[0] })),
  ];

  const expiring = isFridge
    ? placeEntries.filter((e) => e.s.expires && daysUntil(e.s.expires) <= 2).sort((a, b) => (a.s.expires! < b.s.expires! ? -1 : 1))
    : [];

  const bagsCount = bagEntries.length;
  const bagsLabel = `${bagsCount} ${pluralPl(bagsCount, 'produkt', 'produkty', 'produktów')}`;

  const unpackAll = () => {
    dispatch({ type: 'unpackAll' });
    toast(`Rozpakowano ${bagsLabel}`);
  };

  const addExpiringToList = () => {
    for (const e of expiring) dispatch({ type: 'listAdd', productId: e.p.id });
    toast('Dodano do listy zakupów');
  };

  const renderStepper = (e: Entry) => (
    <QtyStepper qty={e.s.qty} name={e.p.name} onChange={(delta) => dispatch({ type: 'stockAdjust', stockId: e.s.id, delta })} />
  );

  const expiryTag = (e: Entry) =>
    e.s.expires && daysUntil(e.s.expires) <= 2 ? (
      <span className={daysUntil(e.s.expires) < 0 ? 'tag red' : 'tag amber'}>{expiryLabel(e.s.expires)}</span>
    ) : null;

  const promoTag = (e: Entry) =>
    promoByProduct.has(e.p.id) ? <span className="tag red">-{promoByProduct.get(e.p.id)}%</span> : null;

  return (
    <section className="screen" aria-label={PLACE_LABEL[place].title}>
      <header className="head">
        <h1>{PLACE_LABEL[place].title}</h1>
        <div className="head-actions">
          <button type="button" className="icon-btn" aria-label="Szukaj" onClick={() => setSearchOpen((o) => !o)}>
            <Search size={22} aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn" aria-label={`Dodaj produkt ${PLACE_LABEL[place].added}`} onClick={() => setAdding(true)}>
            <Plus size={24} aria-hidden="true" />
          </button>
        </div>
      </header>

      {!isFridge ? (
        <Chips
          options={[
            { id: 'stock' as const, label: 'Szafki' },
            { id: 'bags' as const, label: `Siatki · ${bagsCount}` },
          ]}
          value={view}
          onChange={setView}
        />
      ) : null}

      {searchOpen && view === 'stock' ? (
        <SearchField value={query} onChange={setQuery} placeholder="Szukaj w domu" autoFocus />
      ) : null}

      {view === 'bags' && !isFridge ? (
        <>
          {bagsCount === 0 ? (
            <div className="empty">
              <ShoppingBag size={32} aria-hidden="true" />
              <h2>Siatki są puste</h2>
              <p>Po zakończeniu zakupów odhaczone produkty z listy trafią tutaj.</p>
            </div>
          ) : (
            <>
              <button type="button" className="btn wide" onClick={() => { unpackAll(); setView('stock'); }}>
                Rozpakuj wszystko
              </button>
              <ul className="rows">
                {bagEntries.map((e) => (
                  <li key={e.s.id} className="card row">
                    <ProductImage product={e.p} />
                    <div className="grow">
                      <div className="name">{e.p.name}</div>
                      <div className="meta">{meta(e.p)} · {e.s.qty} szt.</div>
                    </div>
                    <div className="stack">
                      <button type="button" className="btn small ghost" onClick={() => dispatch({ type: 'unpack', stockId: e.s.id, place: 'fridge' })}>
                        Lodówka
                      </button>
                      <button type="button" className="btn small ghost" onClick={() => dispatch({ type: 'unpack', stockId: e.s.id, place: 'pantry' })}>
                        Szafka
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <>
          {bagsCount > 0 ? (
            <div className="card row bags-card">
              <div className="thumb" style={{ width: 44, height: 44, borderRadius: 14 }}>
                <ShoppingBag size={21} aria-hidden="true" />
              </div>
              <div className="grow">
                <div className="name">{bagsLabel} w siatkach</div>
                <div className="meta">Z ostatnich zakupów</div>
              </div>
              <button type="button" className="btn" onClick={unpackAll}>
                Rozpakuj
              </button>
            </div>
          ) : null}

          {expiring.length > 0 && cat === 'all' && !q ? (
            <div className="card hero">
              <ProductImage product={expiring[0].p} size={76} />
              <div className="grow">
                <div className="meta">Kończy się ważność</div>
                <div className="name big">
                  {expiring.length <= 2
                    ? expiring.map((e) => e.p.name).join(' i ')
                    : `${expiring[0].p.name}, ${expiring[1].p.name} i ${expiring.length - 2} ${pluralPl(expiring.length - 2, 'inny', 'inne', 'innych')}`}
                </div>
                <button type="button" className="btn small" onClick={addExpiringToList}>
                  Dodaj do listy
                </button>
              </div>
            </div>
          ) : null}

          {presentCategories.length > 1 ? <Chips options={chipOptions} value={cat} onChange={setCat} /> : null}

          {groups.length === 0 ? (
            <div className="empty">
              <h2>{q || cat !== 'all' ? 'Nic nie pasuje' : isFridge ? 'Lodówka jest pusta' : 'Szafki są puste'}</h2>
              <p>{q || cat !== 'all' ? 'Zmień wyszukiwanie lub kategorię.' : 'Dodaj pierwszy produkt przyciskiem plus.'}</p>
            </div>
          ) : (
            <div className="sections">
              {groups.map((g) => (
              <section className="section" key={g.category.id}>
                <h2 className="cat-label">{g.category.label}</h2>
                {isFridge ? (
                  <ul className="grid">
                    {g.entries.map((e) => (
                      <li key={e.s.id} className="card tile">
                        {promoByProduct.has(e.p.id) ? <span className="tile-badge">-{promoByProduct.get(e.p.id)}%</span> : null}
                        <ProductImage product={e.p} size={64} />
                        <div className="name">{e.p.name}</div>
                        <div className="meta">{meta(e.p)}</div>
                        {expiryTag(e)}
                        {renderStepper(e)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="rows">
                    {g.entries.map((e) => (
                      <li key={e.s.id} className="card row">
                        <ProductImage product={e.p} />
                        <div className="grow">
                          <div className="name">{e.p.name}</div>
                          <div className="meta">
                            {meta(e.p)} {promoTag(e)} {expiryTag(e)}
                          </div>
                        </div>
                        {renderStepper(e)}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              ))}
            </div>
          )}

          {isFridge ? (
            <footer className="footer-note">
              <p>Wersja demo z danymi przykładowymi.</p>
              <div className="footer-links">
                <button type="button" className="link" onClick={() => { dispatch({ type: 'clearAll' }); toast('Wyczyszczono dane demo'); }}>
                  Wyczyść dane demo
                </button>
                <button type="button" className="link" onClick={() => { dispatch({ type: 'reset' }); toast('Przywrócono dane przykładowe'); }}>
                  Przywróć dane przykładowe
                </button>
              </div>
            </footer>
          ) : null}
        </>
      )}

      {adding ? <AddProductSheet place={place} onClose={() => setAdding(false)} /> : null}
    </section>
  );
}
