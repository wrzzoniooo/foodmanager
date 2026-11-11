import type { CategoryId } from './types';

/** Wynik wyszukania produktu po kodzie kreskowym w Open Food Facts. */
export interface OffProduct {
  code: string;
  name: string;
  brand?: string;
  size?: string;
  category: CategoryId;
  imageUrl?: string;
}

export type LookupResult =
  | { status: 'found'; product: OffProduct }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

/** Kod EAN/UPC to 8 do 14 cyfr. */
export function normalizeCode(input: string): string | null {
  const digits = input.replace(/\s+/g, '');
  return /^\d{8,14}$/.test(digits) ? digits : null;
}

/** Mapuje tagi kategorii Open Food Facts (np. "en:dairies") na nasze kategorie. */
export function offCategory(tags: string[] = []): CategoryId {
  const has = (re: RegExp) => tags.some((t) => re.test(t));
  if (has(/frozen/)) return 'mrozonki';
  if (has(/cheese/)) return 'sery';
  if (has(/beverages|waters|juices|coffees|teas|sodas/)) return 'napoje';
  if (has(/dairies|milk|yogurt|yoghurt|butter|cream|eggs/)) return 'nabial';
  if (has(/meats|sausages|hams|poultry|fishes|seafood|charcuterie/)) return 'mieso';
  if (has(/fruits/)) return 'owoce';
  if (has(/vegetables/)) return 'warzywa';
  if (has(/breads|bakery|pastries|viennoiseries/)) return 'pieczywo';
  if (has(/salty-snacks|chips|crisps|crackers|pretzels|breadsticks|peanuts|nuts|popcorn|appetizers/)) return 'slone';
  if (has(/snacks|sweet|chocolates|biscuits|candies|confectioneries|desserts/)) return 'slodycze';
  if (has(/sauces|oils|spices|condiments|dressings|vinegars/)) return 'sosy';
  if (has(/canned|meals|soups/)) return 'konserwy';
  if (has(/pastas|cereals|rices|flours|legumes|grains|noodles/)) return 'sypkie';
  return 'inne';
}

interface OffApiProduct {
  code?: string;
  product_name?: string;
  product_name_pl?: string;
  brands?: string;
  quantity?: string;
  categories_tags?: string[];
  image_front_small_url?: string;
  image_front_url?: string;
}

const FIELDS = 'code,product_name,product_name_pl,brands,quantity,categories_tags,image_front_small_url,image_front_url';

/** Pobiera produkt po kodzie kreskowym. Ten punkt API Open Food Facts ma otwarte CORS i działa z przeglądarki. */
export async function lookupBarcode(rawCode: string): Promise<LookupResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { status: 'error', message: 'Kod powinien mieć od 8 do 14 cyfr.' };

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`, {
      signal: controller.signal,
    });
    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) return { status: 'error', message: 'Open Food Facts jest chwilowo niedostępny. Spróbuj za chwilę.' };
    const json = (await res.json()) as { status?: number; product?: OffApiProduct };
    if (json.status !== 1 || !json.product) return { status: 'not-found' };
    const p = json.product;
    const brand = p.brands?.split(',')[0]?.trim();
    const rawName = (p.product_name_pl || p.product_name || '').trim();
    return {
      status: 'found',
      product: {
        code,
        name: rawName.charAt(0).toUpperCase() + rawName.slice(1),
        brand: brand || undefined,
        size: p.quantity?.trim() || undefined,
        category: offCategory(p.categories_tags),
        imageUrl: p.image_front_small_url || p.image_front_url || undefined,
      },
    };
  } catch (e) {
    const offline = !navigator.onLine;
    return {
      status: 'error',
      message: offline
        ? 'Brak połączenia z internetem. Połącz się z siecią i spróbuj ponownie.'
        : e instanceof DOMException && e.name === 'AbortError'
          ? 'Open Food Facts odpowiada zbyt wolno. Spróbuj za chwilę.'
          : 'Nie udało się połączyć z Open Food Facts.',
    };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Zmniejsza zdjęcie z aparatu do miniatury (JPEG jako data URL), żeby zmieściło się w pamięci telefonu. */
export async function fileToThumbnail(file: File, maxSide = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Brak obsługi canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.8);
}
