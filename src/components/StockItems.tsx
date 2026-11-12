import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { daysUntil, expiryLabel } from '../dates';
import type { Layout } from '../viewPrefs';
import type { Product, StockItem } from '../types';
import { ProductImage, QtyStepper } from './ui';

export interface Entry {
  s: StockItem;
  p: Product;
}

export function meta(p: Product): string {
  return [p.brand, p.size].filter(Boolean).join(' · ');
}

type Tone = 'red' | 'amber' | 'green';

/** Kolor terminu: dziś i jutro czerwony, do 3 dni żółty, dalej zielony. */
function toneOf(days: number): Tone {
  return days <= 1 ? 'red' : days <= 3 ? 'amber' : 'green';
}

export function ExpiryBadge({ expires }: { expires?: string }) {
  if (!expires) return null;
  return <span className={`badge ${toneOf(daysUntil(expires))}`}>{expiryLabel(expires)}</span>;
}

/** Pasek świeżości: pełny przy 14 dniach i więcej, im bliżej terminu, tym krótszy. */
export function Freshness({ expires }: { expires?: string }) {
  if (!expires) return null;
  const days = daysUntil(expires);
  const pct = Math.max(8, Math.min(100, (days / 14) * 100));
  return (
    <span className="fresh" aria-hidden="true">
      <i className={toneOf(days)} style={{ width: `${pct}%` }} />
    </span>
  );
}

interface Props {
  layout: Layout;
  entries: Entry[];
  onOpen: (stockId: string) => void;
  /** Przytrzymanie produktu: szybki podgląd z akcjami. */
  onPeek: (stockId: string) => void;
  /** Przesunięcie wiersza palcem: w prawo "list" (na listę zakupów), w lewo "eaten" (zjedzone). */
  onSwipe: (entry: Entry, direction: 'list' | 'eaten') => void;
  onAdjust: (entry: Entry, delta: number) => void;
}

const HOLD_MS = 450;
const MOVE_TOLERANCE = 8;

/** Przycisk: krótkie dotknięcie robi onTap, przytrzymanie (bez ruchu palca) robi onLong. */
function PressButton({
  className,
  onTap,
  onLong,
  children,
}: {
  className: string;
  onTap: () => void;
  onLong: () => void;
  children: ReactNode;
}) {
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const [holding, setHolding] = useState(false);

  const cancel = () => {
    window.clearTimeout(timer.current);
    setHolding(false);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={holding ? `${className} holding` : className}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        setHolding(true);
        timer.current = window.setTimeout(() => {
          fired.current = true;
          setHolding(false);
          if (typeof navigator.vibrate === 'function') navigator.vibrate(20);
          onLong();
        }, HOLD_MS);
      }}
      onPointerMove={(e) => {
        if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_TOLERANCE) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (fired.current) {
          fired.current = false;
          return;
        }
        onTap();
      }}
    >
      {children}
    </button>
  );
}

const SWIPE_AT = 88;
const SWIPE_START = 10;

/** Wiersz, który można przesunąć palcem: w prawo "na listę", w lewo "zjedzone". Pionowe przewijanie działa normalnie. */
function SwipeRow({
  cardClass,
  style,
  children,
  onRight,
  onLeft,
}: {
  cardClass: string;
  style: CSSProperties;
  children: ReactNode;
  onRight: () => void;
  onLeft: () => void;
}) {
  const fg = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const live = useRef(0);
  const swiped = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const [dx, setDx] = useState(0);
  const [mode, setMode] = useState<'idle' | 'drag' | 'settle' | 'leave'>('idle');
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const move = (x: number) => {
    live.current = x;
    setDx(x);
  };
  const end = () => {
    const s = start.current;
    start.current = null;
    if (!s?.active) return;
    swiped.current = true;
    const x = live.current;
    if (x <= -SWIPE_AT) {
      setMode('leave');
      setDx(-(fg.current?.offsetWidth ?? 360));
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      timer.current = window.setTimeout(onLeft, calm ? 0 : 240);
      return;
    }
    setMode('settle');
    setDx(0);
    if (x >= SWIPE_AT) onRight();
  };

  const direction = dx > 0 ? 'to-list' : dx < 0 ? 'to-eaten' : '';
  return (
    <li className={`swipe-li stagger${mode === 'leave' ? ' leaving' : ''}`} style={style}>
      <div className={`swipe-bg ${direction}`} aria-hidden="true">
        <span className="swipe-label start">
          <ShoppingCart size={18} /> Na listę
        </span>
        <span className="swipe-label end">
          Zjedzone <Check size={18} />
        </span>
      </div>
      <div
        ref={fg}
        className={`card ${cardClass} swipe-fg ${mode}`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          start.current = { x: e.clientX, y: e.clientY, active: false };
          swiped.current = false;
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const mx = e.clientX - s.x;
          const my = e.clientY - s.y;
          if (!s.active) {
            if (Math.abs(my) > SWIPE_START && Math.abs(my) > Math.abs(mx)) {
              start.current = null;
              return;
            }
            if (Math.abs(mx) <= SWIPE_START) return;
            s.active = true;
            fg.current?.setPointerCapture(e.pointerId);
            setMode('drag');
          }
          move(Math.max(-180, Math.min(180, mx)));
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onClickCapture={(e) => {
          if (swiped.current) {
            swiped.current = false;
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        {children}
      </div>
    </li>
  );
}

export function StockList({ layout, entries, onOpen, onPeek, onSwipe, onAdjust }: Props) {
  const listClass = layout === 'cards' ? 'pgrid2' : layout === 'rows' ? 'rows' : 'pgrid3';
  return (
    <ul className={listClass}>
      {entries.map((e, i) => {
        const style = { '--i': Math.min(i, 12) } as CSSProperties;
        const stepper = <QtyStepper qty={e.s.qty} name={e.p.name} onChange={(delta) => onAdjust(e, delta)} />;

        if (layout === 'cards') {
          return (
            <SwipeRow
              key={e.s.id}
              cardClass="pcard"
              style={style}
              onRight={() => onSwipe(e, 'list')}
              onLeft={() => onSwipe(e, 'eaten')}
            >
              <PressButton className="card-hit" onTap={() => onOpen(e.s.id)} onLong={() => onPeek(e.s.id)}>
                <span className="pcard-photo">
                  <ProductImage product={e.p} size={44} />
                  <ExpiryBadge expires={e.s.expires} />
                </span>
                <span className="name">{e.p.name}</span>
                <span className="meta">{meta(e.p)}</span>
                <Freshness expires={e.s.expires} />
              </PressButton>
              {stepper}
            </SwipeRow>
          );
        }

        if (layout === 'rows') {
          return (
            <SwipeRow key={e.s.id} cardClass="prow" style={style} onRight={() => onSwipe(e, 'list')} onLeft={() => onSwipe(e, 'eaten')}>
              <PressButton className="card-hit prow-hit" onTap={() => onOpen(e.s.id)} onLong={() => onPeek(e.s.id)}>
                <ProductImage product={e.p} size={44} />
                <span className="prow-text">
                  <span className="name">{e.p.name}</span>
                  <span className="meta">
                    {meta(e.p)}
                  </span>
                  {e.s.expires ? (
                    <span className="prow-fresh">
                      <ExpiryBadge expires={e.s.expires} />
                      <Freshness expires={e.s.expires} />
                    </span>
                  ) : null}
                </span>
              </PressButton>
              {stepper}
            </SwipeRow>
          );
        }

        return (
          <li key={e.s.id} className="pcell stagger" style={style}>
            <PressButton className="card-hit" onTap={() => onOpen(e.s.id)} onLong={() => onPeek(e.s.id)}>
              <span className="pcell-photo">
                <ProductImage product={e.p} fluid="square" />
                <ExpiryBadge expires={e.s.expires} />
                <span className="pcell-qty" aria-label={`Ilość: ${e.s.qty}`}>
                  {e.s.qty}
                </span>
              </span>
              <span className="pcell-name">{e.p.name}</span>
              {meta(e.p) ? <span className="pcell-meta">{meta(e.p)}</span> : null}
            </PressButton>
          </li>
        );
      })}
    </ul>
  );
}
