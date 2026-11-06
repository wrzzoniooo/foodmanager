import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Minus, Plus, Refrigerator, Archive, ListChecks, BadgePercent, X, Search } from 'lucide-react';
import { CATEGORY_BY_ID } from '../categories';
import type { Product } from '../types';

/* ---------- Zdjęcie produktu z awaryjną ikoną kategorii ---------- */

export function ProductImage({ product, size = 44 }: { product: Product; size?: number }) {
  const [failed, setFailed] = useState(false);
  const { Icon } = CATEGORY_BY_ID[product.category];
  const showImage = product.imageUrl && !failed;
  return (
    <div className="thumb" style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}>
      {showImage ? (
        <img src={product.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <Icon size={Math.round(size * 0.48)} strokeWidth={1.75} aria-hidden="true" />
      )}
    </div>
  );
}

/* ---------- Stepper ilości ---------- */

export function QtyStepper({
  qty,
  onChange,
  name,
}: {
  qty: number;
  onChange: (delta: number) => void;
  name: string;
}) {
  return (
    <div className="qty">
      <button type="button" aria-label={`Zmniejsz ilość: ${name}`} onClick={() => onChange(-1)}>
        <Minus size={16} aria-hidden="true" />
      </button>
      <span aria-live="polite">{qty}</span>
      <button type="button" aria-label={`Zwiększ ilość: ${name}`} onClick={() => onChange(1)}>
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ---------- Chipy ---------- */

export function Chips<T extends string>({
  options,
  value,
  onChange,
  wrap = false,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  /** Zawijaj w kilka wierszy zamiast przewijać w bok (formularze). */
  wrap?: boolean;
  /** Etykieta dla czytników ekranu, gdy chipy działają jak wybór jednej opcji. */
  label?: string;
}) {
  return (
    <div className={wrap ? 'chips wrap' : 'chips'} role={wrap ? 'radiogroup' : 'tablist'} aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role={wrap ? 'radio' : 'tab'}
          aria-checked={wrap ? o.id === value : undefined}
          aria-selected={wrap ? undefined : o.id === value}
          className={o.id === value ? 'chip on' : 'chip'}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Dolna nawigacja ---------- */

export type Tab = 'fridge' | 'pantry' | 'list' | 'promo';

const TABS: { id: Tab; label: string; Icon: typeof Refrigerator }[] = [
  { id: 'fridge', label: 'Lodówka', Icon: Refrigerator },
  { id: 'pantry', label: 'Szafki', Icon: Archive },
  { id: 'list', label: 'Lista', Icon: ListChecks },
  { id: 'promo', label: 'Promocje', Icon: BadgePercent },
];

export function BottomNav({ tab, onChange, listCount }: { tab: Tab; onChange: (t: Tab) => void; listCount: number }) {
  return (
    <nav className="nav" aria-label="Główna nawigacja">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={id === tab ? 'nav-btn on' : 'nav-btn'}
          aria-label={label}
          aria-current={id === tab ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
          {id === 'list' && listCount > 0 ? <span className="nav-count">{listCount}</span> : null}
        </button>
      ))}
    </nav>
  );
}

/* ---------- Toast ---------- */

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMessage(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {message ? <div className="toast">{message}</div> : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ---------- Arkusz dolny (modal) ---------- */

export function Sheet({
  title,
  onClose,
  onBack,
  children,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          {onBack ? (
            <button type="button" className="icon-btn" aria-label="Wstecz" onClick={onBack}>
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          ) : null}
          <h2 className="sheet-title">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Zamknij" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Pole wyszukiwania ---------- */

export function SearchField({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="search">
      <Search size={18} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
      />
    </label>
  );
}
