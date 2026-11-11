import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import { pullRows, pushRows } from './api';
import { syncConfigured } from './config';
import { newKey } from './keys';
import { diff, hash, isKnown, stable, type Row, type Snapshot } from './rows';

const STORAGE_KEY = 'spizarnia.sync.v1';
const EPOCH = '1970-01-01T00:00:00.000Z';
const POLL_MS = 5000;
const DEBOUNCE_MS = 700;
const CHUNK = 200;
/** Pobieramy z zakładką wstecz, bo zapisy mogą dochodzić do bazy w innej kolejności niż ich znaczniki czasu. */
const OVERLAP_MS = 10000;

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface Saved {
  key: string | null;
  cursor: string;
  snap: Snapshot;
  lastSync: number | null;
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Saved>;
      if (typeof p.key === 'string' || p.key === null) {
        return { key: p.key ?? null, cursor: p.cursor ?? EPOCH, snap: p.snap ?? {}, lastSync: p.lastSync ?? null };
      }
    }
  } catch {
    /* uszkodzony zapis: zaczynamy bez połączenia */
  }
  return { key: null, cursor: EPOCH, snap: {}, lastSync: null };
}

interface SyncValue {
  configured: boolean;
  /** Klucz gospodarstwa albo null, gdy telefon nie jest połączony. */
  key: string | null;
  status: SyncStatus;
  lastSync: number | null;
  /** Tworzy klucz i zaczyna wysyłać dane z tego telefonu. */
  create: () => string;
  /** Dołącza do gospodarstwa: dane z tego telefonu ustępują wspólnym. */
  join: (key: string) => Promise<void>;
  /** Odłącza telefon; dane zostają w telefonie. */
  leave: () => void;
}

const SyncContext = createContext<SyncValue>({
  configured: false,
  key: null,
  status: 'idle',
  lastSync: null,
  create: () => '',
  join: async () => {},
  leave: () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const saved = useRef<Saved>(load());
  const stateRef = useRef(state);
  stateRef.current = state;

  const [key, setKey] = useState<string | null>(saved.current.key);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<number | null>(saved.current.lastSync);
  const busy = useRef(false);
  const again = useRef(false);
  /** Zaraz po dołączeniu najpierw pobieramy wspólne dane i niczego nie wysyłamy. */
  const pullFirst = useRef(false);

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.current));
    } catch {
      /* brak miejsca lub dostępu: synchronizacja działa do zamknięcia aplikacji */
    }
  };

  const pushPending = async (k: string) => {
    const changes = diff(stateRef.current, saved.current.snap);
    for (let i = 0; i < changes.length; i += CHUNK) {
      const part = changes.slice(i, i + CHUNK);
      await pushRows(
        k,
        part.map((c) => c.row),
      );
      for (const c of part) {
        const id = `${c.row.kind}:${c.row.id}`;
        if (c.hash === null) delete saved.current.snap[id];
        else saved.current.snap[id] = c.hash;
      }
      persist();
    }
  };

  const pullRemote = async (k: string) => {
    const since = saved.current.cursor === EPOCH ? EPOCH : new Date(Date.parse(saved.current.cursor) - OVERLAP_MS).toISOString();
    const rows = await pullRows(k, since);
    if (rows.length === 0) return;
    const fresh: Row[] = rows.filter((r) => !isKnown(r, saved.current.snap));
    if (fresh.length > 0) {
      // Migawkę uzupełniamy przed nałożeniem zmian, żeby nie odesłać ich z powrotem.
      for (const r of fresh) {
        const id = `${r.kind}:${r.id}`;
        if (r.deleted) delete saved.current.snap[id];
        else saved.current.snap[id] = hashOf(r);
      }
      dispatch({ type: 'remoteApply', rows: fresh });
    }
    const newest = rows.reduce((m, r) => (r.changed_at > m ? r.changed_at : m), saved.current.cursor);
    saved.current.cursor = newest;
    persist();
  };

  const run = useCallback(async () => {
    const k = saved.current.key;
    if (!k || !syncConfigured) return;
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    setStatus('syncing');
    try {
      if (!pullFirst.current) await pushPending(k);
      await pullRemote(k);
      pullFirst.current = false;
      saved.current.lastSync = Date.now();
      persist();
      setLastSync(saved.current.lastSync);
      setStatus('idle');
    } catch {
      setStatus('error');
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        void run();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zmiana w telefonie: po chwili wysyłamy.
  useEffect(() => {
    if (!key || !syncConfigured) return;
    const t = window.setTimeout(() => void run(), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [state, key, run]);

  // Zmiany z drugiego telefonu: pytamy co kilka sekund, gdy aplikacja jest na wierzchu, i po powrocie do niej.
  useEffect(() => {
    if (!key || !syncConfigured) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void run();
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('online', tick);
    tick();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('online', tick);
    };
  }, [key, run]);

  const create = useCallback(() => {
    const k = newKey();
    saved.current = { key: k, cursor: EPOCH, snap: {}, lastSync: null };
    pullFirst.current = false;
    persist();
    setKey(k);
    return k;
  }, []);

  const join = useCallback(async (k: string) => {
    dispatch({ type: 'syncReset' });
    saved.current = { key: k, cursor: EPOCH, snap: {}, lastSync: null };
    pullFirst.current = true;
    persist();
    setKey(k);
    // Chwila na to, żeby wyczyszczony stan trafił do pamięci, zanim zaczniemy pobieranie.
    await new Promise((r) => window.setTimeout(r, 0));
    await run();
  }, [dispatch, run]);

  const leave = useCallback(() => {
    saved.current = { key: null, cursor: EPOCH, snap: {}, lastSync: null };
    persist();
    setKey(null);
    setStatus('idle');
    setLastSync(null);
  }, []);

  const value = useMemo<SyncValue>(
    () => ({ configured: syncConfigured, key, status, lastSync, create, join, leave }),
    [key, status, lastSync, create, join, leave],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncValue {
  return useContext(SyncContext);
}

function hashOf(r: Row): string {
  return hash(stable(r.data));
}
