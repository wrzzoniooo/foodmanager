import { useRef, useState } from 'react';
import { Archive, Receipt, Refrigerator } from 'lucide-react';
import type { Place } from '../types';
import type { Entry } from './StockItems';
import { ProductImage } from './ui';

const LEAVE_MS = 800;

const GROUPS: { place: Place; title: string; Icon: typeof Refrigerator }[] = [
  { place: 'fridge', title: 'Do lodówki', Icon: Refrigerator },
  { place: 'pantry', title: 'Do szafek', Icon: Archive },
];

/**
 * Torba z zakupami: produkty leżą w dwóch grupach, według tego, gdzie zwykle trafiają.
 * Dotknięcie produktu przenosi go do drugiej grupy; poprawki uczą aplikację przy rozpakowaniu.
 */
export function BagView({
  entries,
  preferred,
  onUnpackAll,
  onReceipt,
}: {
  entries: Entry[];
  /** Gdzie aplikacja uważa, że produkt zwykle trafia. */
  preferred: (entry: Entry) => Place;
  /** Rozpakowanie wszystkiego; w overrides są tylko produkty, którym zmieniono miejsce. */
  onUnpackAll: (overrides: Record<string, Place>) => void;
  /** Dodanie paragonu: uzgodnienie siatek z tym, co faktycznie kupiono. */
  onReceipt: () => void;
}) {
  const [overrides, setOverrides] = useState<Record<string, Place>>({});
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const placeOf = (e: Entry): Place => overrides[e.s.id] ?? preferred(e);

  const toggle = (e: Entry) => {
    const next: Place = placeOf(e) === 'fridge' ? 'pantry' : 'fridge';
    setOverrides((prev) => {
      const copy = { ...prev };
      if (next === preferred(e)) delete copy[e.s.id];
      else copy[e.s.id] = next;
      return copy;
    });
  };

  const unpackAll = () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm) {
      onUnpackAll(overrides);
      return;
    }
    setLeaving(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setLeaving(false);
      onUnpackAll(overrides);
    }, LEAVE_MS);
  };

  let tileIndex = 0;
  return (
    <div className="bag-screen">
      <div className="bag-wrap">
        <div className="bag-handle" aria-hidden="true" />
        <div className="bag">
          {GROUPS.map(({ place, title, Icon }) => {
            const items = entries.filter((e) => placeOf(e) === place);
            if (items.length === 0) return null;
            return (
              <section key={place} className="bag-group">
                <h3 className="bag-gh">
                  <Icon size={18} aria-hidden="true" />
                  {title}
                  <span className="bag-gc">{items.length}</span>
                </h3>
                <ul className="bag-grid">
                  {items.map((e) => {
                    const i = tileIndex++;
                    return (
                      <li key={e.s.id}>
                        <button
                          type="button"
                          className={leaving ? 'bag-tile out' : 'bag-tile'}
                          style={{ transitionDelay: leaving ? `${i * 70}ms` : undefined }}
                          aria-label={`${e.p.name}: ${place === 'fridge' ? 'do lodówki' : 'do szafek'}. Dotknij, aby zmienić miejsce`}
                          onClick={() => toggle(e)}
                        >
                          <span className="bag-photo">
                            <ProductImage product={e.p} size={44} />
                            {e.s.qty > 1 ? <span className="bag-qty">{e.s.qty}</span> : null}
                          </span>
                          <span className="bag-name">{e.p.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      <div className="bag-actions">
        <button type="button" className="btn wide span2" onClick={onReceipt}>
          <Receipt size={18} aria-hidden="true" /> Dodaj paragon
        </button>
        <button type="button" className="btn ghost wide span2" disabled={leaving} onClick={unpackAll}>
          Rozpakuj wszystko
        </button>
      </div>
    </div>
  );
}
