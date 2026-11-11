import { useMemo, useRef, useState } from 'react';
import { Camera, Check, CircleHelp, ImagePlus, ShoppingBag, TriangleAlert } from 'lucide-react';
import { useStore } from '../store';
import { matchLines, mapKey, type MatchStatus } from '../receipt/match';
import { readReceipt } from '../receipt/ocr';
import { fingerprint, parseReceipt } from '../receipt/parse';
import { applyReceipt, planReceipt, type ReceiptItem } from '../receipt/reconcile';
import { CatalogSearch } from './CatalogSearch';
import { ProductImage, QtyStepper, Sheet, useToast } from './ui';
import type { Product } from '../types';

interface Line {
  id: number;
  raw: string;
  qty: number;
  productId?: string;
  status: MatchStatus;
  on: boolean;
}

type Step = 'pick' | 'reading' | 'review';

const STATUS_ICON = { ok: Check, wn: TriangleAlert, no: CircleHelp } as const;

function capitalize(text: string): string {
  const t = text.trim().toLocaleLowerCase('pl');
  return t.charAt(0).toLocaleUpperCase('pl') + t.slice(1);
}

/**
 * Paragon do siatek: zdjęcie lub zrzut paragonu, odczyt pozycji, przegląd i uzgodnienie z siatką.
 * Siatka dostaje dokładnie to, co kupiono (różnicę względem listy), bez dublowania.
 */
export function ReceiptSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch, productById } = useStore();
  const toast = useToast();
  const [step, setStep] = useState<Step>('pick');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [removeMissing, setRemoveMissing] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setStep('reading');
    setProgress(0);
    try {
      const text = await readReceipt(file, setProgress);
      const parsed = parseReceipt(text);
      if (parsed.length === 0) {
        setError('Nie udało się odczytać pozycji. Zrób ostrzejsze zdjęcie całego paragonu.');
        setStep('pick');
        return;
      }
      const matched = matchLines(parsed, state.products, state.receiptMap);
      setLines(
        matched.map((m, i) => ({
          id: i,
          raw: m.line.raw,
          qty: m.line.qty,
          productId: m.productId,
          status: m.status,
          on: m.status !== 'no',
        })),
      );
      setRemoveMissing({});
      setStep('review');
    } catch {
      setError('Nie udało się odczytać paragonu. Sprawdź połączenie z internetem (pierwszy odczyt pobiera słownik) i spróbuj ponownie.');
      setStep('pick');
    }
  };

  const included: ReceiptItem[] = useMemo(
    () => lines.filter((l) => l.on && l.productId).map((l) => ({ productId: l.productId as string, qty: l.qty })),
    [lines],
  );
  const plan = useMemo(() => planReceipt(state, included), [state, included]);
  const print = useMemo(() => fingerprint(lines.map((l) => ({ raw: l.raw, qty: l.qty }))), [lines]);
  const duplicate = step === 'review' && print in state.receipts;

  const counts = {
    ok: lines.filter((l) => l.status === 'ok').length,
    wn: lines.filter((l) => l.status === 'wn').length,
    no: lines.filter((l) => l.status === 'no').length,
  };

  const confirm = () => {
    const learned: Record<string, string> = {};
    for (const l of lines) if (l.on && l.productId) learned[mapKey(l.raw)] = l.productId;
    const before = state;
    const result = applyReceipt(state, included, removeMissing, print, learned, () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);
    dispatch({ type: 'receiptApply', items: included, removeMissing, fingerprint: print, learned });
    const { changed, added, removed } = result.summary;
    toast(`Siatki zaktualizowane: ${added} nowych, ${changed} zmienionych, ${removed} usuniętych`, {
      label: 'Cofnij',
      onClick: () => dispatch({ type: 'replaceState', state: before }),
    });
    onClose();
  };

  const edit = (patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === editing ? { ...l, ...patch } : l)));
  const current = lines.find((l) => l.id === editing);

  const choose = (p: Product) => {
    edit({ productId: p.id, status: 'ok', on: true });
    setPicking(false);
    setQuery('');
  };
  const addOwn = () => {
    if (!current) return;
    const name = capitalize(current.raw);
    const existing = state.products.find((p) => p.name.toLocaleLowerCase('pl') === name.toLocaleLowerCase('pl'));
    const product: Product = existing ?? {
      id: `own-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name,
      category: 'inne',
      defaultPlace: 'pantry',
    };
    if (!existing) dispatch({ type: 'productAdd', product });
    choose(product);
  };

  if (picking && current) {
    return (
      <Sheet title="Wybierz produkt" onClose={onClose} onBack={() => setPicking(false)}>
        <div className="sheet-body">
          <CatalogSearch
            query={query}
            onQuery={setQuery}
            placeholder="Szukaj w katalogu"
            actionLabel="Wybierz"
            autoFocus
            onPick={choose}
            between={
              <button type="button" className="btn ghost wide" onClick={addOwn}>
                Dodaj „{capitalize(current.raw)}” jako własny produkt
              </button>
            }
          />
        </div>
      </Sheet>
    );
  }

  if (editing !== null && current) {
    const product = current.productId ? productById(current.productId) : undefined;
    return (
      <Sheet title="Pozycja z paragonu" onClose={onClose} onBack={() => setEditing(null)}>
        <div className="sheet-body">
          <div className="receipt-raw">{current.raw}</div>
          <div className="card row">
            {product ? <ProductImage product={product} size={44} /> : null}
            <div className="grow">
              <div className="name">{product ? product.name : 'Nie wybrano produktu'}</div>
              {product ? <div className="meta">{[product.brand, product.size].filter(Boolean).join(' · ')}</div> : null}
            </div>
          </div>
          <div className="field-row">
            <span className="lab">Ilość</span>
            <QtyStepper qty={current.qty} name={product?.name ?? current.raw} min={1} onChange={(d) => edit({ qty: Math.max(1, current.qty + d) })} />
          </div>
          <div className="sheet-actions">
            <button type="button" className="btn ghost" onClick={() => setPicking(true)}>
              {product ? 'Zmień produkt' : 'Wybierz produkt'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                edit({ on: false });
                setEditing(null);
              }}
            >
              Pomiń pozycję
            </button>
            <button type="button" className="btn span2" onClick={() => setEditing(null)}>
              Gotowe
            </button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Paragon" onClose={onClose}>
      <div className="sheet-body">
        {step === 'pick' ? (
          <>
            {error ? (
              <p className="field-error" role="alert">
                {error}
              </p>
            ) : null}
            <button type="button" className="btn wide" onClick={() => camera.current?.click()}>
              <Camera size={18} aria-hidden="true" /> Zrób zdjęcie paragonu
            </button>
            <button type="button" className="btn ghost wide" onClick={() => gallery.current?.click()}>
              <ImagePlus size={18} aria-hidden="true" /> Wybierz zdjęcie lub zrzut
            </button>
            <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
            <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          </>
        ) : null}

        {step === 'reading' ? (
          <div className="receipt-reading" role="status">
            <div className="name">Odczytuję paragon…</div>
            <div className="fresh" aria-hidden="true">
              <i className="green" style={{ width: `${Math.max(6, Math.round(progress * 100))}%` }} />
            </div>
          </div>
        ) : null}

        {step === 'review' ? (
          <>
            <div className="receipt-meter">
              <div className="receipt-meter-top">
                <span className="name">
                  Rozpoznano {counts.ok} z {lines.length}
                </span>
                <span className="meta">{counts.wn + counts.no} do sprawdzenia</span>
              </div>
              <div className="receipt-bar" aria-hidden="true">
                {counts.ok > 0 ? <i className="g" style={{ flex: counts.ok }} /> : null}
                {counts.wn > 0 ? <i className="a" style={{ flex: counts.wn }} /> : null}
                {counts.no > 0 ? <i className="n" style={{ flex: counts.no }} /> : null}
              </div>
            </div>

            <div className="paper receipt-list">
              <ul className="pl-list">
                {lines.map((l) => {
                  const product = l.productId ? productById(l.productId) : undefined;
                  const row = plan.rows.find((r) => r.productId === l.productId);
                  const Icon = STATUS_ICON[l.status];
                  let chip: string;
                  let chipClass = 'receipt-chip';
                  if (!product) {
                    chip = 'Dodaj';
                    chipClass += ' act';
                  } else if (l.status === 'wn') {
                    chip = 'Zmień';
                    chipClass += ' act';
                  } else if (row?.kind === 'new') {
                    chip = 'nowe';
                    chipClass += ' nw';
                  } else if (row && row.kind !== 'same') {
                    chip = `${row.was} → ${row.now}`;
                    chipClass += ' up';
                  } else chip = `${row?.now ?? l.qty} szt.`;
                  return (
                    <li key={l.id} className={l.on ? 'pl-li' : 'pl-li is-done'}>
                      <button
                        type="button"
                        className={l.on ? 'check on' : 'check'}
                        role="checkbox"
                        aria-checked={l.on}
                        aria-label={`Uwzględnij: ${product?.name ?? l.raw}`}
                        disabled={!product}
                        onClick={() => setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, on: !x.on } : x)))}
                      >
                        {l.on ? <Check size={16} aria-hidden="true" /> : null}
                      </button>
                      <button type="button" className="receipt-main" onClick={() => setEditing(l.id)}>
                        <span className="receipt-photo">
                          {product ? <ProductImage product={product} size={40} /> : <span className="thumb receipt-blank" />}
                          <span className={`receipt-st ${l.status}`}>
                            <Icon size={11} aria-hidden="true" />
                          </span>
                        </span>
                        <span className="receipt-text">
                          <span className="name">{product ? product.name : 'Nieznany produkt'}</span>
                          <span className="meta">{product ? [product.brand, product.size].filter(Boolean).join(' · ') : 'Dodaj jako własny'}</span>
                          <span className="receipt-raw">{l.raw}</span>
                        </span>
                        <span className={chipClass}>{chip}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {plan.missing.length > 0 ? (
              <section className="section">
                <div className="lab">
                  Nie ma na paragonie <span className="receipt-count">{plan.missing.length}</span>
                </div>
                <div className="paper receipt-list">
                  <ul className="pl-list">
                    {plan.missing.map((m) => {
                      const product = productById(m.productId);
                      const remove = removeMissing[m.productId] ?? true;
                      return (
                        <li key={m.productId} className="pl-li">
                          {product ? <ProductImage product={product} size={40} /> : null}
                          <div className="grow">
                            <div className="name">{product?.name ?? 'Produkt'}</div>
                            <div className="meta">W siatce {m.qty} szt.</div>
                          </div>
                          <div className="seg small" role="radiogroup" aria-label="Co zrobić">
                            <button type="button" role="radio" aria-checked={remove} className={remove ? 'on' : undefined} onClick={() => setRemoveMissing((r) => ({ ...r, [m.productId]: true }))}>
                              Usuń
                            </button>
                            <button type="button" role="radio" aria-checked={!remove} className={!remove ? 'on' : undefined} onClick={() => setRemoveMissing((r) => ({ ...r, [m.productId]: false }))}>
                              Zostaw
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            ) : null}

            {duplicate ? (
              <p className="field-error" role="alert">
                Ten paragon już dodano
              </p>
            ) : null}
            <button type="button" className="btn wide" disabled={included.length === 0 || duplicate} onClick={confirm}>
              <ShoppingBag size={18} aria-hidden="true" /> Zaktualizuj siatki
            </button>
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
