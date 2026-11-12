import type { CategoryId, Place, Product } from './types';
import { suggestProducts } from './receipt/match';

const FRIDGE: CategoryId[] = ['nabial', 'sery', 'mieso', 'warzywa', 'mrozonki'];

/** Zapasowe reguły po słowach w nazwie, gdy produktu nie ma w słowniku. Pierwsza pasująca wygrywa. */
const RULES: [CategoryId, RegExp][] = [
  ['mrozonki', /mrożon|frozen|\blody\b|frytki|nuggets/i],
  ['sery', /\bser\b|\bsery\b|\bsera\b|serek|mozzarell|gouda|camembert|\bbrie\b|feta|parmezan|halloumi|cheddar|ricotta|mascarpone|twar[oó]g/i],
  ['nabial', /mleko|jogurt|kefir|ma[sś]lank|[sś]mietan|mas[lł]o|\bjaja\b|jajka|skyr|margaryn/i],
  ['mieso', /szynk|kie[lł]bas|par[oó]wk|w[eę]dlin|schab|kurczak|indyk|wieprz|wo[lł]ow|drobiow|burger|mi[eę]s|boczek|pasztet|dorsz|[lł]oso[sś]|makrel|\bryb|[sś]led[zź]|tu[nń]czyk|krewet|salami|kabanos|filet/i],
  ['pieczywo', /chleb|bu[lł]k|bagiet|tost|rogal|dro[zż]d[zż][oó]wk|tortill|\bpita\b|croissant/i],
  ['sypkie', /makaron|spaghetti|penne|kluski|kasz|\bry[zż]\b|m[aą]k[aiu]|p[lł]atki|musli|granola|cukier|s[oó]l\b/i],
  ['slone', /chips|chrupki|paluszki|krakers|orzesz|orzech|popcorn|precel|nachos/i],
  ['slodycze', /czekolad|baton|ciastk|cookies|wafel|wafle|cukierk|[zż]elki|kisiel|budy[nń]|ch[aą][lł]w|biszkopt|pier?nik/i],
  ['sosy', /ketchup|\bsos\b|pesto|majonez|musztard|\bole[ji]|oliw|ocet|przypraw|dressing|pieprz/i],
  ['konserwy', /konserw|puszk|zupa|danie|pierogi|dżem|miód|miod/i],
  ['napoje', /woda|sok\b|napój|napoj|cola|piwo|wino|kawa|herbata|lemoniad/i],
  ['warzywa', /sa[lł]at|w[lł]oszczyzn|pomidor|og[oó]r|marchew|papryk|cebul|ziemniak|brokuł|kapust|burak|czosnek|por\b|seler/i],
  ['owoce', /malin|truskaw|jab[lł]k|banan|winogron|owoc|cytryn|pomara[nń]cz|b[oó]r[oó]wk|jagod|gruszk|brzoskwin|[sś]liwk/i],
];

export function placeFor(category: CategoryId): Place {
  return FRIDGE.includes(category) ? 'fridge' : 'pantry';
}

/**
 * Kategoria dla wpisanej nazwy: najpierw słownik (np. "pomidor" -> Pomidory -> warzywa), potem słowa kluczowe.
 * Zwraca null, gdy nic nie pasuje (produkt zostaje w "Inne").
 */
export function guessCategory(name: string, dictionary: Product[]): { category: CategoryId; place: Place } | null {
  const hit = suggestProducts(name, dictionary, 1)[0];
  if (hit) return { category: hit.product.category, place: hit.product.defaultPlace };
  const rule = RULES.find(([, re]) => re.test(name));
  return rule ? { category: rule[0], place: placeFor(rule[0]) } : null;
}
