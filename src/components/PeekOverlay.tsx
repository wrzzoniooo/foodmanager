import { useEffect, type ReactNode } from 'react';
import { ArrowLeftRight, Calendar, Check, Ellipsis, ShoppingCart, Trash2 } from 'lucide-react';
import type { Place } from '../types';
import { ExpiryBadge, Freshness, meta, type Entry } from './StockItems';
import { ProductImage } from './ui';

function Action({ icon, label, primary, onClick }: { icon: ReactNode; label: string; primary?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={primary ? 'peek-act pri' : 'peek-act'} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

/** Szybki podgląd po przytrzymaniu produktu: rozmyte tło, duże zdjęcie i akcje. */
export function PeekOverlay({
  entry,
  place,
  onClose,
  onEat,
  onTrash,
  onList,
  onMove,
  onDate,
  onMore,
}: {
  entry: Entry;
  place: Place;
  onClose: () => void;
  onEat: () => void;
  onTrash: () => void;
  onList: () => void;
  onMove: () => void;
  onDate: () => void;
  onMore: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { s, p } = entry;
  return (
    <div className="peek-backdrop" onClick={onClose}>
      <div className="peek" role="dialog" aria-modal="true" aria-label={p.name} onClick={(e) => e.stopPropagation()}>
        <div className="peek-photo">
          <ProductImage product={p} fluid={190} />
          <ExpiryBadge expires={s.expires} />
          <span className="peek-qty" aria-label={`Ilość: ${s.qty}`}>
            {s.qty}
          </span>
        </div>
        <div className="peek-text">
          <div className="peek-name">{p.name}</div>
          {meta(p) ? <div className="meta">{meta(p)}</div> : null}
          <Freshness expires={s.expires} />
        </div>
        <div className="peek-acts">
          <Action primary icon={<Check size={22} aria-hidden="true" />} label="Zjedzone" onClick={onEat} />
          <Action icon={<Trash2 size={22} aria-hidden="true" />} label="Wyrzucone" onClick={onTrash} />
          <Action icon={<ShoppingCart size={22} aria-hidden="true" />} label="Na listę" onClick={onList} />
          <Action
            icon={<ArrowLeftRight size={22} aria-hidden="true" />}
            label={place === 'fridge' ? 'Do szafki' : 'Do lodówki'}
            onClick={onMove}
          />
          <Action icon={<Calendar size={22} aria-hidden="true" />} label="Termin" onClick={onDate} />
          <Action icon={<Ellipsis size={22} aria-hidden="true" />} label="Więcej" onClick={onMore} />
        </div>
      </div>
    </div>
  );
}
