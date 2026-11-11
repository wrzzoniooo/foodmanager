import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import type { Row } from './rows';

export interface PulledRow extends Row {
  changed_at: string;
}

async function rpc<T>(name: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  // Dawne klucze anon to tokeny JWT i wymagają też nagłówka Authorization; nowe klucze publiczne tylko apikey.
  if (SUPABASE_ANON_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function pushRows(key: string, rows: Row[]): Promise<string> {
  return rpc<string>('sp_push', { p_key: key, p_rows: rows });
}

export function pullRows(key: string, since: string): Promise<PulledRow[]> {
  return rpc<PulledRow[]>('sp_pull', { p_key: key, p_since: since });
}
