import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Cloud, CloudOff, Copy, Keyboard, QrCode, ScanLine, Unlink } from 'lucide-react';
import { useSync } from '../sync/SyncProvider';
import { formatKey, parseKey, qrPayload } from '../sync/keys';
import { useTheme, type Theme } from '../theme';
import { QR_FORMATS, Scanner } from './Scanner';
import { Sheet, useToast } from './ui';

const THEME_OPTIONS: { id: Theme; label: string }[] = [
  { id: 'light', label: 'Jasny' },
  { id: 'dark', label: 'Ciemny' },
  { id: 'auto', label: 'Auto' },
];

type View = 'menu' | 'show' | 'scan' | 'manual' | 'confirm';

/** Kod QR z kluczem gospodarstwa (zawsze ciemny na białym, żeby skaner go odczytał w każdym motywie). */
function Qr({ text }: { text: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let cancelled = false;
    void QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#2f3a22', light: '#ffffff' } }).then(
      (s) => {
        if (!cancelled) setSvg(s);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [text]);
  return <div className="qr-box" role="img" aria-label="Kod QR połączenia" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function clock(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Ustawienia: motyw i połączenie telefonów (klucz w kodzie QR, bez kont). */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const sync = useSync();
  const toast = useToast();
  const [theme, setTheme] = useTheme();
  const [view, setView] = useState<View>('menu');
  const [pending, setPending] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState<string | null>(null);

  const askJoin = (raw: string) => {
    const key = parseKey(raw);
    if (!key) return false;
    setPending(key);
    setView('confirm');
    return true;
  };

  const copyKey = async () => {
    if (!sync.key) return;
    try {
      await navigator.clipboard.writeText(formatKey(sync.key));
      toast('Skopiowano klucz');
    } catch {
      toast('Nie udało się skopiować');
    }
  };

  if (view === 'scan') {
    return (
      <Scanner
        formats={QR_FORMATS}
        hint="Skieruj aparat na kod QR"
        manualLabel="Wpisz klucz ręcznie"
        onDetect={(code) => {
          if (!askJoin(code)) {
            toast('To nie jest kod połączenia');
            setView('menu');
          }
        }}
        onManual={() => setView('manual')}
        onBack={() => setView('menu')}
        onClose={onClose}
      />
    );
  }

  if (view === 'show' && sync.key) {
    return (
      <Sheet title="Kod połączenia" onClose={onClose} onBack={() => setView('menu')}>
        <div className="sheet-body">
          <Qr text={qrPayload(sync.key)} />
          <button type="button" className="key-line" onClick={() => void copyKey()}>
            <span>{formatKey(sync.key)}</span>
            <Copy size={18} aria-hidden="true" />
          </button>
          <button type="button" className="btn wide" onClick={() => setView('menu')}>
            Gotowe
          </button>
        </div>
      </Sheet>
    );
  }

  if (view === 'manual') {
    return (
      <Sheet title="Wpisz klucz" onClose={onClose} onBack={() => setView('menu')}>
        <form
          className="sheet-body"
          onSubmit={(e) => {
            e.preventDefault();
            if (!askJoin(typed)) setTypedError('To nie wygląda na klucz połączenia');
          }}
        >
          <label className="section">
            <span className="lab">Klucz</span>
            <input
              className="input mono"
              value={typed}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              aria-invalid={typedError ? true : undefined}
              onChange={(e) => {
                setTyped(e.target.value);
                setTypedError(null);
              }}
            />
            {typedError ? (
              <span className="field-error" role="alert">
                {typedError}
              </span>
            ) : null}
          </label>
          <button type="submit" className="btn wide">
            Dalej
          </button>
        </form>
      </Sheet>
    );
  }

  if (view === 'confirm' && pending) {
    return (
      <Sheet title="Dołączyć do połączenia?" onClose={onClose} onBack={() => setView('menu')}>
        <div className="sheet-body">
          <p className="confirm-text">Dane z tego telefonu zostaną zastąpione wspólnymi.</p>
          <div className="sheet-actions">
            <button type="button" className="btn ghost" onClick={() => setView('menu')}>
              Anuluj
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                void sync.join(pending);
                toast('Połączono z drugim telefonem');
                onClose();
              }}
            >
              Dołącz
            </button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Ustawienia" onClose={onClose}>
      <div className="sheet-body">
        <div className="sections">
          <section className="section">
            <div className="lab">Motyw</div>
            <div className="seg" role="radiogroup" aria-label="Motyw aplikacji">
              {THEME_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={theme === o.id}
                  className={theme === o.id ? 'on' : undefined}
                  onClick={() => setTheme(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          {sync.configured ? (
            <section className="section">
              <div className="lab">Połączenie</div>
              <div className="card row">
                <div className="thumb" style={{ width: 44, height: 44, borderRadius: 14 }}>
                  {sync.key ? <Cloud size={22} aria-hidden="true" /> : <CloudOff size={22} aria-hidden="true" />}
                </div>
                <div className="grow">
                  <div className="name">{sync.key ? 'Połączono' : 'Nie połączono'}</div>
                  <div className="meta">
                    {sync.key
                      ? sync.status === 'error'
                        ? 'Brak połączenia z siecią'
                        : sync.lastSync
                          ? `Ostatnia synchronizacja ${clock(sync.lastSync)}`
                          : 'Synchronizuję…'
                      : 'Tylko ten telefon'}
                  </div>
                </div>
              </div>
              <div className="sheet-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (!sync.key) sync.create();
                    setView('show');
                  }}
                >
                  <QrCode size={18} aria-hidden="true" /> Pokaż kod
                </button>
                <button type="button" className="btn ghost" onClick={() => setView('scan')}>
                  <ScanLine size={18} aria-hidden="true" /> Zeskanuj kod
                </button>
                {sync.key ? (
                  <button type="button" className="btn ghost span2" onClick={sync.leave}>
                    <Unlink size={18} aria-hidden="true" /> Rozłącz ten telefon
                  </button>
                ) : (
                  <button type="button" className="btn ghost span2" onClick={() => setView('manual')}>
                    <Keyboard size={18} aria-hidden="true" /> Wpisz klucz ręcznie
                  </button>
                )}
              </div>
            </section>
          ) : null}
        </div>
        <div className="meta version">
          <b>Shelfie {__APP_VERSION__}</b>
          <span>© 2026 wrzzoniooo</span>
        </div>
      </div>
    </Sheet>
  );
}
