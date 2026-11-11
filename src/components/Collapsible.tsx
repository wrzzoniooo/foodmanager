import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** Stan rozwinięcia zapamiętany na tym telefonie (klucz w localStorage), z domyślną wartością. */
function useStoredOpen(key: string, initial: boolean): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : saved === '1';
    } catch {
      return initial;
    }
  });
  const set = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(key, next ? '1' : '0');
    } catch {
      /* brak dostępu do pamięci lokalnej: stan działa do zamknięcia aplikacji */
    }
  };
  return [open, set];
}

/**
 * Sekcja, którą można zwinąć, żeby nie zajmowała miejsca. W nagłówku widać liczbę pozycji, więc po zwinięciu nic
 * nie ginie z oczu. "action" (np. "Dodaj wszystkie") pokazuje się tylko przy rozwiniętej sekcji.
 */
export function Collapsible({
  id,
  title,
  count,
  defaultOpen = false,
  action,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useStoredOpen(`spizarnia.fold.${id}`, defaultOpen);
  return (
    <section className="fold">
      <div className="fold-head">
        <button type="button" className="fold-toggle" aria-expanded={open} aria-controls={`fold-${id}`} onClick={() => setOpen(!open)}>
          {title}
          {count !== undefined ? <span className="fold-count">{count}</span> : null}
          <ChevronDown size={18} aria-hidden="true" className={open ? 'fold-chev open' : 'fold-chev'} />
        </button>
        {open ? action : null}
      </div>
      <div id={`fold-${id}`} className={open ? 'fold-body open' : 'fold-body'} inert={!open}>
        <div className="fold-inner">{children}</div>
      </div>
    </section>
  );
}
