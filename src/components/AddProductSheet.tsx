import { useRef, useState, type ReactNode } from 'react';
import { Barcode, Camera, ImagePlus, ChevronRight, Keyboard } from 'lucide-react';
import { useStore } from '../store';
import { CATEGORIES, defaultPlaceFor } from '../categories';
import { CatalogSearch } from './CatalogSearch';
import { Scanner } from './Scanner';
import { Chips, ProductImage, Sheet, useToast } from './ui';
import { fileToThumbnail, lookupBarcode, normalizeCode, type OffProduct } from '../off';
import type { CategoryId, Place, Product } from '../types';

type Mode = 'menu' | 'scan' | 'code' | 'found' | 'custom';

const PLACE_TEXT: Record<Place, { title: string; added: string; short: string }> = {
  fridge: { title: 'Dodaj do lodówki', added: 'do lodówki', short: 'lodówki' },
  pantry: { title: 'Dodaj do szafek', added: 'do szafek', short: 'szafek' },
};

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ id: c.id, label: c.label.split(' i ')[0].split(',')[0] }));
const PLACE_OPTIONS: { id: Place; label: string }[] = [
  { id: 'fridge', label: 'Lodówka' },
  { id: 'pantry', label: 'Szafki' },
];

function OptionCard({ icon, title, hint, onClick }: { icon: ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" className="card row option" onClick={onClick}>
      <div className="thumb" style={{ width: 44, height: 44, borderRadius: 14 }}>
        {icon}
      </div>
      <div className="grow">
        <div className="name">{title}</div>
        <div className="meta">{hint}</div>
      </div>
      <ChevronRight size={20} aria-hidden="true" className="chev" />
    </button>
  );
}

/**
 * Okno dodawania produktu. Domyślnie dodaje do lodówki lub szafek (place); z forList dodaje na listę zakupów
 * (bez pytania, gdzie produkt trzymasz).
 */
export function AddProductSheet({
  place,
  onClose,
  forList = false,
  initialMode = 'menu',
}: {
  place: Place;
  onClose: () => void;
  forList?: boolean;
  initialMode?: 'menu' | 'scan';
}) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [query, setQuery] = useState('');

  // wynik wyszukania po kodzie
  const [codeInput, setCodeInput] = useState('');
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [found, setFound] = useState<OffProduct | null>(null);

  // pola wspólne dla znalezionego i własnego produktu
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<CategoryId>('inne');
  const [where, setWhere] = useState<Place>(place);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [nameError, setNameError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const addToHome = (product: Product, targetPlace: Place, existed: boolean) => {
    dispatch({ type: 'productAdd', product });
    if (forList) {
      dispatch({ type: 'listAdd', productId: product.id });
      toast(`${product.name} na liście`);
      onClose();
      return;
    }
    dispatch({ type: 'stockAdd', productId: product.id, place: targetPlace });
    toast(existed ? `${product.name} już był w katalogu, dodano ${PLACE_TEXT[targetPlace].added}` : `${product.name} ${PLACE_TEXT[targetPlace].added}`);
    onClose();
  };

  const runLookup = async (raw: string) => {
    const code = normalizeCode(raw);
    if (!code) {
      setLookupMessage('Kod powinien mieć od 8 do 14 cyfr.');
      setMode('code');
      return;
    }
    setCodeInput(code);
    setLookupMessage(null);
    setLookupBusy(true);
    setMode('code');
    const result = await lookupBarcode(code);
    setLookupBusy(false);
    if (result.status === 'found') {
      setFound(result.product);
      setName(result.product.name);
      setCategory(result.product.category);
      setWhere(place);
      setNameError(null);
      setMode('found');
    } else if (result.status === 'not-found') {
      setLookupMessage('Nie ma tego kodu w Open Food Facts. Możesz dodać produkt ręcznie.');
    } else {
      setLookupMessage(result.message);
    }
  };

  const confirmFound = () => {
    if (!found) return;
    const finalName = name.trim();
    if (!finalName) {
      setNameError('Wpisz nazwę produktu');
      return;
    }
    const id = `off-${found.code}`;
    const existed = state.products.some((p) => p.id === id);
    const target = forList ? defaultPlaceFor(category) : where;
    addToHome(
      { id, name: finalName, brand: found.brand, size: found.size, category, defaultPlace: target, imageUrl: found.imageUrl, barcode: found.code },
      target,
      existed,
    );
  };

  const openCustom = () => {
    setName(query.trim());
    setBrand('');
    setCategory('inne');
    setWhere(place);
    setPhoto(undefined);
    setNameError(null);
    setPhotoError(null);
    setMode('custom');
  };

  const confirmCustom = () => {
    const finalName = name.trim();
    if (!finalName) {
      setNameError('Wpisz nazwę produktu');
      return;
    }
    const id = `own-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const target = forList ? defaultPlaceFor(category) : where;
    addToHome({ id, name: finalName, brand: brand.trim() || undefined, category, defaultPlace: target, imageUrl: photo }, target, false);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    try {
      setPhoto(await fileToThumbnail(file));
    } catch {
      setPhotoError('Nie udało się wczytać zdjęcia. Spróbuj innego.');
    }
  };

  if (mode === 'scan') {
    return <Scanner onDetect={(c) => void runLookup(c)} onManual={() => setMode('code')} onBack={() => setMode('menu')} onClose={onClose} />;
  }

  const back = mode === 'menu' ? undefined : () => setMode(mode === 'found' ? 'code' : 'menu');
  const title =
    mode === 'menu' ? (forList ? 'Dodaj do listy' : PLACE_TEXT[place].title) : mode === 'code' ? 'Wpisz kod' : mode === 'found' ? 'Znaleziony produkt' : 'Własny produkt';

  const previewProduct: Product = { id: 'preview', name: name || 'Produkt', category, defaultPlace: where, imageUrl: mode === 'found' ? found?.imageUrl : photo };

  return (
    <Sheet title={title} onClose={onClose} onBack={back}>
      <div className="sheet-body">
        {mode === 'menu' ? (
          <CatalogSearch
            query={query}
            onQuery={setQuery}
            placeholder="Szukaj w katalogu"
            actionLabel="Dodaj"
            showWhenEmpty
            resultsLabel="Z katalogu"
            onPick={(p) => {
              if (forList) {
                dispatch({ type: 'listAdd', productId: p.id });
                toast(`${p.name} na liście`);
                return;
              }
              dispatch({ type: 'stockAdd', productId: p.id, place });
              toast(`${p.name} ${PLACE_TEXT[place].added}`);
            }}
            between={
              <div className="stack">
                <OptionCard icon={<Barcode size={21} aria-hidden="true" />} title="Skanuj kod kreskowy" hint="Aparat odczyta kod z opakowania" onClick={() => setMode('scan')} />
                <OptionCard icon={<Keyboard size={21} aria-hidden="true" />} title="Wpisz kod z opakowania" hint="Cyfry pod kodem kreskowym" onClick={() => setMode('code')} />
                <OptionCard icon={<ImagePlus size={21} aria-hidden="true" />} title="Dodaj własny produkt" hint="Nazwa, kategoria i zdjęcie" onClick={openCustom} />
              </div>
            }
          />
        ) : null}

        {mode === 'code' ? (
          <form
            className="sheet-body"
            onSubmit={(e) => {
              e.preventDefault();
              void runLookup(codeInput);
            }}
          >
            <label className="section">
              <span className="lab">Kod kreskowy</span>
              <input
                className="input"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="np. 5902377000377"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  setLookupMessage(null);
                }}
              />
            </label>
            {lookupMessage ? (
              <p className="field-error" role="alert">
                {lookupMessage}
              </p>
            ) : null}
            <button type="submit" className="btn wide" disabled={lookupBusy}>
              {lookupBusy ? 'Szukam…' : 'Szukaj produktu'}
            </button>
            {lookupMessage && lookupMessage.startsWith('Nie ma') ? (
              <button type="button" className="btn ghost wide" onClick={openCustom}>
                Dodaj ręcznie
              </button>
            ) : null}
          </form>
        ) : null}

        {mode === 'found' && found ? (
          <div className="card sheet-body">
            <div className="row">
              <ProductImage product={previewProduct} size={96} />
              <div className="grow stack">
                {found.name ? (
                  <div className="name big">{found.name}</div>
                ) : (
                  <label className="section">
                    <span className="lab">Nazwa</span>
                    <input className="input" value={name} onChange={(e) => { setName(e.target.value); setNameError(null); }} placeholder="Wpisz nazwę" />
                  </label>
                )}
                <div className="meta">{[found.brand, found.size].filter(Boolean).join(' · ')}</div>
                <span className="tag green">Znaleziono w Open Food Facts</span>
              </div>
            </div>
            {nameError ? (
              <p className="field-error" role="alert">
                {nameError}
              </p>
            ) : null}
            <div className="section">
              <div className="lab">Kategoria</div>
              <Chips wrap label="Kategoria" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
            </div>
            {forList ? null : (
              <div className="section">
                <div className="lab">Gdzie trzymasz</div>
                <Chips wrap label="Gdzie trzymasz" options={PLACE_OPTIONS} value={where} onChange={setWhere} />
              </div>
            )}
            <button type="button" className="btn wide" onClick={confirmFound}>
              {forList ? 'Dodaj do listy' : `Dodaj do katalogu i ${PLACE_TEXT[where].short}`}
            </button>
          </div>
        ) : null}

        {mode === 'custom' ? (
          <>
            <div className="row">
              <ProductImage product={previewProduct} size={96} />
              <div className="grow stack">
                <button type="button" className="btn ghost" onClick={() => cameraInput.current?.click()}>
                  <Camera size={16} aria-hidden="true" />
                  Zrób zdjęcie
                </button>
                <button type="button" className="btn ghost" onClick={() => galleryInput.current?.click()}>
                  Wybierz z galerii
                </button>
              </div>
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
              <input ref={galleryInput} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
            </div>
            {photoError ? (
              <p className="field-error" role="alert">
                {photoError}
              </p>
            ) : null}
            <label className="section">
              <span className="lab">Nazwa</span>
              <input
                className="input"
                value={name}
                placeholder="np. Chleb od piekarza"
                aria-invalid={nameError ? true : undefined}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
              />
              {nameError ? (
                <span className="field-error" role="alert">
                  {nameError}
                </span>
              ) : null}
            </label>
            <label className="section">
              <span className="lab">Marka (opcjonalnie)</span>
              <input className="input" value={brand} placeholder="np. Piekarnia Kowalski" onChange={(e) => setBrand(e.target.value)} />
            </label>
            <div className="section">
              <div className="lab">Kategoria</div>
              <Chips wrap label="Kategoria" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
            </div>
            {forList ? null : (
              <div className="section">
                <div className="lab">Gdzie trzymasz</div>
                <Chips wrap label="Gdzie trzymasz" options={PLACE_OPTIONS} value={where} onChange={setWhere} />
              </div>
            )}
            <button type="button" className="btn wide" onClick={confirmCustom}>
              {forList ? 'Dodaj do listy' : 'Dodaj produkt'}
            </button>
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
