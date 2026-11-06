const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(offset: number, from: Date = new Date()): Date {
  const d = startOfDay(from);
  d.setDate(d.getDate() + offset);
  return d;
}

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isoInDays(offset: number): string {
  return toISODate(addDays(offset));
}

/** Liczba dni od dziś do daty ISO (0 = dziś, ujemna = przeszłość). */
export function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - startOfDay(new Date()).getTime()) / DAY);
}

export function expiryLabel(iso: string): string {
  const n = daysUntil(iso);
  if (n < 0) return 'Przeterminowane';
  if (n === 0) return 'Dziś';
  if (n === 1) return 'Jutro';
  return `Za ${n} dni`;
}

const WEEKDAY_GENITIVE = ['niedzieli', 'poniedziałku', 'wtorku', 'środy', 'czwartku', 'piątku', 'soboty'];

export function weekdayGenitive(offset: number): string {
  return WEEKDAY_GENITIVE[addDays(offset).getDay()];
}

export function pluralPl(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  const last = abs % 10;
  const last2 = abs % 100;
  if (last >= 2 && last <= 4 && !(last2 >= 12 && last2 <= 14)) return few;
  return many;
}

export function formatPrice(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} zł`;
}
