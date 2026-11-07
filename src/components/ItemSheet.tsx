import { useEffect, useRef } from 'react';
import { Check, ShoppingCart, Trash2 } from 'lucide-react';
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
  focusDate = false,
}: {
  focusDate?: boolean;
  entry: Entry;
  onClose: () => void;
  onAdjust: (delta: number) => void;
  onExpiry: (expires: string) => void;
  onRemove: (reason: 'eaten' | 'trashed') => void;
  onAddToList: () => void;
}) {
  const { s, p } = entry;
  const dateRef = useRef<HTMLInputElement>(null);
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
