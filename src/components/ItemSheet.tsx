import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ShoppingCart, Trash2 } from 'lucide-react';
import { fileToThumbnail } from '../off';
import { ExpiryBadge, Freshness, meta, type Entry } from './StockItems';
import { ProductImage, QtyStepper, Sheet } from './ui';

/** Karta produktu: ilość, termin ważności, zjedzone / wyrzucone, dodanie do listy. */
export function ItemSheet({
  entry,
  onClose,
  onAdjust,
  onExpiry,
  onRemove,
  onAddToList,
  onPhoto,
  focusDate = false,
}: {
  focusDate?: boolean;
  entry: Entry;
  onClose: () => void;
  onAdjust: (delta: number) => void;
  onExpiry: (expires: string) => void;
  onRemove: (reason: 'eaten' | 'trashed') => void;
  onAddToList: () => void;
  onPhoto: (photo?: string) => void;
}) {
  const { s, p } = entry;
  const dateRef = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState(false);
  const hasPhoto = Boolean(p.imageUrl?.startsWith('data:'));
  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoError(false);
    try {
      onPhoto(await fileToThumbnail(file, 192));
    } catch {
      setPhotoError(true);
    }
  };
  // "Termin" z podglądu: od razu pokazujemy wybór daty (przeglądarka zezwala, bo to ciąg dalszy dotknięcia).
  useEffect(() => {
    if (!focusDate) return;
    const input = dateRef.current;
    if (!input) return;
    input.focus();
    try {
      input.showPicker?.();
    } catch {
      /* przeglądarka nie pozwala otworzyć kalendarza: pole i tak jest zaznaczone */
    }
  }, [focusDate]);
  return (
    <Sheet title={p.name} onClose={onClose}>
      <div className="sheet-body">
        <div className="row">
          <ProductImage product={p} size={64} />
          <div className="grow">
            <div className="meta">{meta(p) || 'Bez opisu'}</div>
            <ExpiryBadge expires={s.expires} />
          </div>
        </div>
        <Freshness expires={s.expires} />
        <div className="field-row">
          <span className="lab">Ilość</span>
          <QtyStepper qty={s.qty} name={p.name} min={1} onChange={onAdjust} />
        </div>
        <div className="field-row">
          <span className="lab">Zdjęcie</span>
          <div className="photo-actions">
            <button type="button" className="btn small ghost" onClick={() => photoInput.current?.click()}>
              <Camera size={16} aria-hidden="true" /> {hasPhoto ? 'Zmień' : 'Dodaj'}
            </button>
            {hasPhoto ? (
              <button type="button" className="btn small ghost" onClick={() => onPhoto(undefined)}>
                <Trash2 size={16} aria-hidden="true" /> Usuń
              </button>
            ) : null}
            <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => void pickPhoto(e.target.files?.[0])} />
          </div>
        </div>
        {photoError ? <div className="meta">Nie udało się wczytać zdjęcia. Spróbuj innego.</div> : null}
        <label className="field-row">
          <span className="lab">Termin ważności</span>
          <input
            ref={dateRef}
            type="date"
            className="input date"
            value={s.expires ?? ''}
            onChange={(e) => onExpiry(e.target.value)}
          />
        </label>
        <div className="sheet-actions">
          <button type="button" className="btn" onClick={() => onRemove('eaten')}>
            <Check size={18} aria-hidden="true" /> Zjedzone
          </button>
          <button type="button" className="btn ghost" onClick={() => onRemove('trashed')}>
            <Trash2 size={18} aria-hidden="true" /> Wyrzucone
          </button>
          <button type="button" className="btn ghost span2" onClick={onAddToList}>
            <ShoppingCart size={18} aria-hidden="true" /> Dodaj do listy zakupów
          </button>
        </div>
      </div>
    </Sheet>
  );
}
