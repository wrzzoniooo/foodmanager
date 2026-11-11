import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Plus, Search, Settings, ShoppingBag, ShoppingBasket, X, type LucideIcon } from 'lucide-react';
import { useStore } from '../store';
import { CATEGORIES } from '../categories';
import { preferredPlace } from '../habits';
import { buildSuggestions } from '../insights';
import { daysUntil, pluralPl } from '../dates';
import { AddProductSheet } from '../components/AddProductSheet';
import { ItemSheet } from '../components/ItemSheet';
import { PeekOverlay } from '../components/PeekOverlay';
import { SettingsSheet } from '../components/SettingsSheet';
import { BagView } from '../components/BagView';
import { StockList, type Entry } from '../components/StockItems';
import { ViewSheet } from '../components/ViewSheet';
import { IconChips, ProductImage, SearchField, Sheet, useToast } from '../components/ui';
import { useViewPrefs } from '../viewPrefs';
import type { CategoryId, Place, StockItem } from '../types';

/** "A i B" albo "A, B i 2 inne": krótkie wyliczenie do karty. */
function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(' i ');
  const rest = names.length - 2;
  return `${names[0]}, ${names[1]} i ${rest} ${pluralPl(rest, 'inny', 'inne', 'innych')}`;
}

const PLACE_LABEL: Record<Place, { title: string; added: string; genitive: string }> = {
  fridge: { title: 'Lodówka', added: 'do lodówki', genitive: 'Lodówki' },
  pantry: { title: 'Szafki', added: 'do szafek', genitive: 'Szafek' },
};

export function StockScreen({ place }: { place: Place }) {
  const { state, dispatch, productById } = useStore();
  const toast = useToast();
  const isFridge = place === 'fridge';

  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [prefs, setPrefs] = useViewPrefs(place);
  const [viewOpen, setViewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [focusDate, setFocusDate] = useState(false);

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
  const chipOptions: { id: CategoryId | 'all'; label: string; Icon: LucideIcon }[] = [
    { id: 'all', label: 'Wszystko', Icon: LayoutGrid },
    ...presentCategories.map((c) => ({ id: c.id, label: c.label.split(' i ')[0].split(',')[0], Icon: c.Icon })),
  ];

  const expiring = isFridge
    ? placeEntries.filter((e) => e.s.expires && daysUntil(e.s.expires) <= 2).sort((a, b) => (a.s.expires! < b.s.expires! ? -1 : 1))
    : [];

  const lowStock = useMemo(() => buildSuggestions(state, 3), [state]);
  const addLowStockToList = () => {
    for (const s of lowStock) dispatch({ type: 'listAdd', productId: s.product.id });
    toast('Dodano do listy zakupów');
  };
  const snoozeLowStock = () => {
    for (const s of lowStock) dispatch({ type: 'dismissSuggestion', productId: s.product.id });
    toast('Przypomnimy za tydzień');
  };

  const bagsCount = bagEntries.length;
  useEffect(() => {
    if (bagsCount === 0) setBagOpen(false);
  }, [bagsCount]);
  const bagsLabel = `${bagsCount} ${pluralPl(bagsCount, 'produkt', 'produkty', 'produktów')}`;

  // Rozpakowanie według tego, gdzie zwykle chowacie dany produkt; w komunikacie widać, ile gdzie trafiło.
  const unpackAll = (overrides: Record<string, Place> = {}) => {
    const placeOf = (e: Entry): Place => overrides[e.s.id] ?? preferredPlace(state.habits, e.p);
    const toFridge = bagEntries.filter((e) => placeOf(e) === 'fridge').length;
    const toPantry = bagEntries.length - toFridge;
    const parts = [
      toFridge > 0 ? `${toFridge} do lodówki` : null,
      toPantry > 0 ? `${toPantry} do szafek` : null,
    ].filter(Boolean);
    // Poprawione miejsca zapamiętujemy (jako świadomy wybór), resztę rozpakowujemy wg nawyków bez uczenia.
    for (const [stockId, where] of Object.entries(overrides)) dispatch({ type: 'unpack', stockId, place: where });
    dispatch({ type: 'unpackAll' });
    toast(`Rozpakowano: ${parts.join(', ')}`);
  };

  const addExpiringToList = () => {
    for (const e of expiring) dispatch({ type: 'listAdd', productId: e.p.id });
    toast('Dodano do listy zakupów');
  };

  // Ostatnia sztuka: zamiast po cichu usunąć produkt, pytamy, czy zjedzony czy wyrzucony.
  const adjust = (e: Entry, delta: number) => {
    if (delta < 0 && e.s.qty <= 1) {
      setOpenId(e.s.id);
      return;
    }
    dispatch({ type: 'stockAdjust', stockId: e.s.id, delta });
  };

  const byExpiry = [...visible].sort((a, b) => {
    const ea = a.s.expires;
    const eb = b.s.expires;
    if (ea && eb && ea !== eb) return ea < eb ? -1 : 1;
    if (ea && !eb) return -1;
    if (!ea && eb) return 1;
    return a.p.name.localeCompare(b.p.name, 'pl');
  });

  const openEntry = openId ? placeEntries.find((e) => e.s.id === openId) : undefined;
  const peekEntry = peekId ? placeEntries.find((e) => e.s.id === peekId) : undefined;

  const removeEntry = (entry: Entry, reason: 'eaten' | 'trashed') => {
    const ts = Date.now();
    const item = entry.s;
    dispatch({ type: 'stockRemove', stockId: item.id, reason, ts });
    toast(`${entry.p.name}: ${reason === 'eaten' ? 'zjedzone' : 'wyrzucone'}`, {
      label: 'Cofnij',
      onClick: () => dispatch({ type: 'stockRestore', item, eventTs: ts }),
    });
    setOpenId(null);
    setPeekId(null);
  };
  const addEntryToList = (entry: Entry) => {
    dispatch({ type: 'listAdd', productId: entry.p.id });
    toast('Dodano do listy zakupów', {
      label: 'Cofnij',
      onClick: () => dispatch({ type: 'listUndoAdd', productId: entry.p.id }),
    });
    setOpenId(null);
    setPeekId(null);
  };
  const swipe = (entry: Entry, direction: 'list' | 'eaten') =>
    direction === 'eaten' ? removeEntry(entry, 'eaten') : addEntryToList(entry);
  const moveEntry = (entry: Entry) => {
    const target: Place = isFridge ? 'pantry' : 'fridge';
    dispatch({ type: 'stockMove', stockId: entry.s.id, place: target });
    toast(`${entry.p.name} przeniesione ${isFridge ? 'do szafek' : 'do lodówki'}`);
    setPeekId(null);
  };
  /** Z podglądu do pełnej karty produktu (opcjonalnie od razu z wyborem daty). */
  const openFromPeek = (entry: Entry, focusDate: boolean) => {
    setPeekId(null);
    setFocusDate(focusDate);
    setOpenId(entry.s.id);
  };

  return (
    <section className="screen" aria-label={PLACE_LABEL[place].title}>
      <header className="head">
        <h1>{PLACE_LABEL[place].title}</h1>
        <div className="head-actions">
          <button type="button" className="icon-btn" aria-label="Szukaj" onClick={() => setSearchOpen((o) => !o)}>
            <Search size={22} aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn" aria-label="Widok" onClick={() => setViewOpen(true)}>
            <LayoutGrid size={22} aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn" aria-label="Ustawienia" onClick={() => setSettingsOpen(true)}>
            <Settings size={22} aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn" aria-label={`Dodaj produkt ${PLACE_LABEL[place].added}`} onClick={() => setAdding(true)}>
            <Plus size={24} aria-hidden="true" />
          </button>
        </div>
      </header>

      {searchOpen ? (
        <SearchField value={query} onChange={setQuery} placeholder="Szukaj w domu" autoFocus />
      ) : null}

      {(
        <>
          {bagsCount > 0 ? (
            <div className="card row bags-card">
              <button type="button" className="card-hit bags-hit" onClick={() => setBagOpen(true)}>
                <span className="thumb" style={{ width: 44, height: 44, borderRadius: 14 }}>
                  <ShoppingBag size={21} aria-hidden="true" />
                </span>
                <span className="grow">
                  <span className="name">{bagsLabel} w siatkach</span>
                  <span className="meta">Z ostatnich zakupów</span>
                </span>
              </button>
              <button type="button" className="btn" onClick={() => unpackAll()}>
                Rozpakuj
              </button>
            </div>
          ) : null}

          {expiring.length > 0 && cat === 'all' && !q ? (
            <div className="card hero">
              <ProductImage product={expiring[0].p} size={76} />
              <div className="grow">
                <div className="meta">Kończy się ważność</div>
                <div className="name big">{joinNames(expiring.map((e) => e.p.name))}</div>
                <button type="button" className="btn small" onClick={addExpiringToList}>
                  Dodaj do listy
                </button>
              </div>
            </div>
          ) : null}

          {lowStock.length > 0 && cat === 'all' && !q ? (
            <div className="card hero">
              <div className="thumb warn" style={{ width: 76, height: 76, borderRadius: 23 }}>
                <ShoppingBasket size={36} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="grow">
                <div className="meta">Kończy się w domu</div>
                <div className="name big">{joinNames(lowStock.map((s) => s.product.name))}</div>
                <button type="button" className="btn small" onClick={addLowStockToList}>
                  Dodaj do listy
                </button>
              </div>
              <button type="button" className="icon-btn small" aria-label="Nie teraz" onClick={snoozeLowStock}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {presentCategories.length > 1 ? <IconChips options={chipOptions} value={cat} onChange={setCat} label="Kategorie" /> : null}

          {visible.length === 0 ? (
            <div className="empty">
              <h2>{q || cat !== 'all' ? 'Nic nie pasuje' : isFridge ? 'Lodówka jest pusta' : 'Szafki są puste'}</h2>
              <p>{q || cat !== 'all' ? 'Zmień wyszukiwanie lub kategorię.' : 'Dodaj pierwszy produkt przyciskiem plus.'}</p>
            </div>
          ) : prefs.order === 'expiry' ? (
            <StockList
              key={`${prefs.layout}-${prefs.order}`}
              layout={prefs.layout}
              entries={byExpiry}
              onOpen={(id) => {
                setFocusDate(false);
                setOpenId(id);
              }}
              onPeek={setPeekId}
              onSwipe={swipe}
              onAdjust={adjust}
            />
          ) : (
            <div className="sections">
              {groups.map((g) => (
                <section className="section" key={g.category.id}>
                  <h2 className="cat-label">{g.category.label}</h2>
                  <StockList
                    key={prefs.layout}
                    layout={prefs.layout}
                    entries={g.entries}
                    onOpen={(id) => {
                      setFocusDate(false);
                      setOpenId(id);
                    }}
                    onPeek={setPeekId}
              onSwipe={swipe}
                    onAdjust={adjust}
                  />
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

      {bagOpen && bagsCount > 0 ? (
        <Sheet title="Siatki" onClose={() => setBagOpen(false)}>
          <BagView
            entries={bagEntries}
            preferred={(entry) => preferredPlace(state.habits, entry.p)}
            onUnpackAll={(overrides) => {
              unpackAll(overrides);
              setBagOpen(false);
            }}
          />
        </Sheet>
      ) : null}
      {adding ? <AddProductSheet place={place} onClose={() => setAdding(false)} /> : null}
      {settingsOpen ? <SettingsSheet onClose={() => setSettingsOpen(false)} /> : null}
      {viewOpen ? (
        <ViewSheet prefs={prefs} onChange={setPrefs} onClose={() => setViewOpen(false)} />
      ) : null}
      {openEntry ? (
        <ItemSheet
          entry={openEntry}
          onClose={() => setOpenId(null)}
          onAdjust={(delta) => dispatch({ type: 'stockAdjust', stockId: openEntry.s.id, delta })}
          onExpiry={(expires) => dispatch({ type: 'stockExpiry', stockId: openEntry.s.id, expires })}
          onRemove={(reason) => removeEntry(openEntry, reason)}
          onAddToList={() => addEntryToList(openEntry)}
          focusDate={focusDate}
        />
      ) : null}
      {peekEntry ? (
        <PeekOverlay
          entry={peekEntry}
          place={place}
          onClose={() => setPeekId(null)}
          onEat={() => removeEntry(peekEntry, 'eaten')}
          onTrash={() => removeEntry(peekEntry, 'trashed')}
          onList={() => addEntryToList(peekEntry)}
          onMove={() => moveEntry(peekEntry)}
          onDate={() => openFromPeek(peekEntry, true)}
          onMore={() => openFromPeek(peekEntry, false)}
        />
      ) : null}
    </section>
  );
}
