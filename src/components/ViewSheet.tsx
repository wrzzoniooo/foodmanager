import type { Layout, Order, ViewPrefs } from '../viewPrefs';
import { Sheet } from './ui';

const LAYOUTS: { id: Layout; label: string; cells: number }[] = [
  { id: 'cards', label: 'Karty', cells: 4 },
  { id: 'rows', label: 'Wiersze', cells: 3 },
  { id: 'grid', label: 'Siatka', cells: 6 },
];

const ORDERS: { id: Order; label: string }[] = [
  { id: 'expiry', label: 'Wg terminu' },
  { id: 'category', label: 'Wg kategorii' },
];

export function ViewSheet({
  prefs,
  onChange,
  onClose,
}: {
  prefs: ViewPrefs;
  onChange: (patch: Partial<ViewPrefs>) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Widok" onClose={onClose}>
      <div className="sheet-body">
        <div className="sections">
          <section className="section">
            <div className="lab">Układ produktów</div>
            <div className="layout-opts" role="radiogroup" aria-label="Układ produktów">
              {LAYOUTS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.layout === o.id}
                  className={prefs.layout === o.id ? 'layout-opt on' : 'layout-opt'}
                  onClick={() => onChange({ layout: o.id })}
                >
                  <span className={`mini ${o.id}`} aria-hidden="true">
                    {Array.from({ length: o.cells }, (_, i) => (
                      <i key={i} />
                    ))}
                  </span>
                  {o.label}
                </button>
              ))}
            </div>
          </section>
          <section className="section">
            <div className="lab">Kolejność</div>
            <div className="seg" role="radiogroup" aria-label="Kolejność produktów">
              {ORDERS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={prefs.order === o.id}
                  className={prefs.order === o.id ? 'on' : undefined}
                  onClick={() => onChange({ order: o.id })}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>
        </div>
        <button type="button" className="btn wide" onClick={onClose}>
          Gotowe
        </button>
      </div>
    </Sheet>
  );
}
