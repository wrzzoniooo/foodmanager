import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, Minus, Plus, Refrigerator, Archive, ListChecks, BadgePercent, X, Search, type LucideIcon } from 'lucide-react';
import { CATEGORY_BY_ID } from '../categories';
import type { Product } from '../types';

/* ---------- Zdjęcie produktu z awaryjną ikoną kategorii ---------- */

export function ProductImage({
  product,
  size = 44,
  fluid,
}: {
  product: Product;
  size?: number;
  /** Zdjęcie na całą szerokość rodzica: "square" (kwadrat) albo stała wysokość w px. */
  fluid?: 'square' | number;
}) {
  const [failed, setFailed] = useState(false);
  const { Icon } = CATEGORY_BY_ID[product.category];
  const showImage = product.imageUrl && !failed;
  const style = fluid
    ? { width: '100%', borderRadius: 16, ...(fluid === 'square' ? { aspectRatio: '1 / 1' } : { height: fluid }) }
    : { width: size, height: size, borderRadius: Math.round(size * 0.3) };
  return (
    <div className="thumb" style={style}>
      {showImage ? (
        <img src={product.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <Icon size={fluid ? 36 : Math.round(size * 0.48)} strokeWidth={1.75} aria-hidden="true" />
      )}
    </div>
  );
}

/* ---------- Stepper ilości ---------- */

export function QtyStepper({
  qty,
  onChange,
  name,
  min,
}: {
  qty: number;
  onChange: (delta: number) => void;
  name: string;
  /** Najmniejsza ilość, przy której przycisk minus przestaje działać. */
  min?: number;
}) {
  // Liczba lekko "podskakuje" przy zmianie ilości (nie przy pierwszym wyświetleniu).
  const prev = useRef(qty);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (prev.current !== qty) {
      prev.current = qty;
      setTick((t) => t + 1);
    }
  }, [qty]);
  return (
    <div className="qty">
      <button type="button" aria-label={`Zmniejsz ilość: ${name}`} disabled={min !== undefined && qty <= min} onClick={() => onChange(-1)}>
        <Minus size={16} aria-hidden="true" />
      </button>
      <span key={tick} className={tick ? 'qty-n bump' : 'qty-n'} aria-live="polite">
        {qty}
      </span>
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

/* ---------- Filtry z ikonami (małe kółka z podpisem) ---------- */

export function IconChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string; Icon: LucideIcon }[];
  value: T;
  onChange: (id: T) => void;
  label?: string;
}) {
  return (
    <div className="icon-chips" role="tablist" aria-label={label}>
      {options.map(({ id, label: text, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={id === value}
          className={id === value ? 'icon-chip on' : 'icon-chip'}
          onClick={() => onChange(id)}
        >
          <span className="icon-chip-dot">
            <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <span className="icon-chip-text">{text}</span>
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

/** Stan zakładki Lista: ile pozycji na liście, ile już w koszyku i czy są sugestie braków. */
export interface ListSignal {
  total: number;
  done: number;
  suggestions: boolean;
}

/** Jeden znacznik na zakładce Lista, bez plakietek: pierścień wokół ikony. Czerwony = postęp zakupów, żółty = same sugestie. */
function listRing(signal: ListSignal): { percent: number; color: string; text: string } | null {
  if (signal.total > 0) {
    const open = signal.total - signal.done;
    return {
      percent: Math.round((signal.done / signal.total) * 100),
      color: 'var(--red)',
      text: `${open} do kupienia, ${signal.done} w koszyku`,
    };
  }
  if (signal.suggestions) return { percent: 100, color: 'var(--fresh-amber)', text: 'Coś się kończy' };
  return null;
}

export function BottomNav({
  tab,
  onChange,
  list,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  list: ListSignal;
}) {
  const ring = listRing(list);
  return (
    <nav className="nav" aria-label="Główna nawigacja">
      {TABS.map(({ id, label, Icon }) => {
        const withRing = id === 'list' && ring;
        return (
          <button
            key={id}
            type="button"
            className={id === tab ? 'nav-btn on' : 'nav-btn'}
            aria-label={withRing ? `${label}: ${ring.text}` : label}
            aria-current={id === tab ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            {withRing ? (
              <span className="nav-ringwrap">
                <span
                  className="nav-ring"
                  style={{ '--p': ring.percent, '--rc': ring.color } as CSSProperties}
                  aria-hidden="true"
                />
                <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
              </span>
            ) : (
              <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* ---------- Toast ---------- */

export interface ToastAction {
  label: string;
  onClick: () => void;
}
type ShowToast = (message: string, action?: ToastAction) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; action?: ToastAction } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback<ShowToast>((message, action) => {
    setToast({ message, action });
    window.clearTimeout(timer.current);
    // Z przyciskiem "Cofnij" komunikat zostaje dłużej, żeby dało się zdążyć.
    timer.current = window.setTimeout(() => setToast(null), action ? 6000 : 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast ? (
          <div className={toast.action ? 'toast has-action' : 'toast'}>
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toast.action?.onClick();
                  window.clearTimeout(timer.current);
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
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
