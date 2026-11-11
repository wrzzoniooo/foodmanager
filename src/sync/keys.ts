/** Klucz gospodarstwa: 25 znaków (125 bitów) z alfabetu bez mylących liter, pokazywany w grupach po 5. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PREFIX = 'shelfie:';
export const KEY_LENGTH = 25;

export function newKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
  return Array.from(bytes, (b) => ALPHABET[b % 32]).join('');
}

export function formatKey(raw: string): string {
  return raw.match(/.{1,5}/g)?.join('-') ?? raw;
}

/** Tekst w kodzie QR. */
export function qrPayload(raw: string): string {
  return `${PREFIX}${raw}`;
}

/** Z zeskanowanego lub wpisanego tekstu robi klucz albo zwraca null, gdy to nie jest klucz. */
export function parseKey(input: string): string | null {
  let s = input.trim();
  s = s.replace(/^(shelfie|spizarnia):/i, '');
  s = s.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  if (s.length !== KEY_LENGTH) return null;
  return [...s].every((c) => ALPHABET.includes(c)) ? s : null;
}
