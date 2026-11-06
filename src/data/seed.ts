import type { AppState, ListItem, Product, StockItem, UsageEvent } from '../types';
import { isoInDays } from '../dates';

/** Dane przykładowe do etapu 1 (bez backendu). Docelowo katalog i promocje importujemy automatycznie z Lidla. */

const OFF = 'https://images.openfoodfacts.org/images/products';

export const PRODUCTS: Product[] = [
  { id: 'mleko', name: 'Mleko 2%', brand: 'Milbona', size: '1 l', category: 'nabial', defaultPlace: 'fridge' },
  { id: 'jajka', name: 'Jajka M', brand: 'Lidl', size: '10 szt.', category: 'nabial', defaultPlace: 'fridge' },
  { id: 'jogurt', name: 'Jogurt naturalny', brand: 'Milbona', size: '400 g', category: 'nabial', defaultPlace: 'fridge' },
  { id: 'smietana', name: 'Śmietana 18%', brand: 'Milbona', size: '330 ml', category: 'nabial', defaultPlace: 'fridge' },
  { id: 'maslo', name: 'Masło extra', brand: 'Milbona', size: '200 g', category: 'nabial', defaultPlace: 'fridge' },
  { id: 'gouda', name: 'Ser gouda', brand: 'Pilos', size: '150 g', category: 'sery', defaultPlace: 'fridge' },
  { id: 'mozzarella', name: 'Mozzarella', brand: 'Milbona', size: '125 g', category: 'sery', defaultPlace: 'fridge' },
  { id: 'szynka', name: 'Szynka konserwowa', brand: 'Pikok', size: '100 g', category: 'mieso', defaultPlace: 'fridge' },
  { id: 'kurczak', name: 'Filet z kurczaka', brand: 'Lidl', size: '500 g', category: 'mieso', defaultPlace: 'fridge' },
  { id: 'marchew', name: 'Marchew', brand: 'Lidl', size: '1 kg', category: 'warzywa', defaultPlace: 'fridge' },
  { id: 'pomidory', name: 'Pomidory malinowe', brand: 'Lidl', size: '500 g', category: 'warzywa', defaultPlace: 'fridge' },
  { id: 'ogorki', name: 'Ogórki kiszone', brand: 'Lidl', size: '670 g', category: 'warzywa', defaultPlace: 'pantry' },
  { id: 'jablka', name: 'Jabłka', brand: 'Lidl', size: '1 kg', category: 'owoce', defaultPlace: 'fridge' },
  { id: 'banany', name: 'Banany', brand: 'Lidl', size: '1 kg', category: 'owoce', defaultPlace: 'pantry' },
  { id: 'chleb', name: 'Chleb żytni', brand: 'Piekarnia Lidla', size: '500 g', category: 'pieczywo', defaultPlace: 'pantry' },
  { id: 'bulki', name: 'Bułki pszenne', brand: 'Piekarnia Lidla', size: '6 szt.', category: 'pieczywo', defaultPlace: 'pantry' },
  { id: 'penne', name: 'Makaron penne', brand: 'Combino', size: '500 g', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'spaghetti', name: 'Makaron spaghetti', brand: 'Combino', size: '500 g', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'ryz', name: 'Ryż basmati', brand: 'Vitasia', size: '1 kg', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'platki', name: 'Płatki owsiane', brand: 'Crownfield', size: '500 g', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'maka', name: 'Mąka pszenna', brand: 'Lidl', size: '1 kg', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'passata', name: 'Passata pomidorowa', brand: 'Baresa', size: '680 g', category: 'konserwy', defaultPlace: 'pantry' },
  { id: 'tunczyk', name: 'Tuńczyk w oleju', brand: 'Nixe', size: '185 g', category: 'konserwy', defaultPlace: 'pantry' },
  { id: 'kawa', name: 'Kawa mielona', brand: 'Bellarom', size: '500 g', category: 'napoje', defaultPlace: 'pantry' },
  { id: 'herbata', name: 'Herbata czarna', brand: 'Lidl', size: '100 szt.', category: 'napoje', defaultPlace: 'pantry' },
  { id: 'woda', name: 'Woda niegazowana', brand: 'Saguaro', size: '1,5 l', category: 'napoje', defaultPlace: 'pantry' },
  { id: 'pierogi', name: 'Pierogi ruskie', brand: 'Lidl', size: '500 g', category: 'mrozonki', defaultPlace: 'fridge' },
  { id: 'frytki', name: 'Frytki mrożone', brand: 'Lidl', size: '1 kg', category: 'mrozonki', defaultPlace: 'fridge' },
  {
    id: 'czekolada',
    name: 'Czekolada gorzka 74%',
    brand: 'Carré fin',
    size: '100 g',
    category: 'slodycze',
    defaultPlace: 'pantry',
    imageUrl: `${OFF}/000/002/002/2464/front_pl.314.200.jpg`,
  },
  {
    id: 'migdaly',
    name: 'Migdały łuskane',
    brand: 'Alesto',
    size: '200 g',
    category: 'slodycze',
    defaultPlace: 'pantry',
    imageUrl: `${OFF}/000/002/072/4696/front_pl.334.200.jpg`,
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function s(id: string, productId: string, location: StockItem['location'], qty: number, expiresIn?: number): StockItem {
  return { id, productId, location, qty, expires: expiresIn === undefined ? undefined : isoInDays(expiresIn) };
}

function ev(productId: string, daysAgo: number, delta = -1): UsageEvent {
  return { productId, ts: Date.now() - daysAgo * DAY_MS, delta };
}

function evs(productId: string, daysAgoList: number[]): UsageEvent[] {
  return daysAgoList.map((d) => ev(productId, d));
}

const STOCK: StockItem[] = [
  s('s1', 'jajka', 'fridge', 1, 2),
  s('s2', 'jogurt', 'fridge', 3, 1),
  s('s3', 'gouda', 'fridge', 1, 1),
  s('s4', 'mozzarella', 'fridge', 2, 6),
  s('s5', 'szynka', 'fridge', 1, 3),
  s('s6', 'kurczak', 'fridge', 1, 2),
  s('s7', 'marchew', 'fridge', 1, 10),
  s('s8', 'pomidory', 'fridge', 1, 4),
  s('s9', 'jablka', 'fridge', 1, 12),
  s('s10', 'pierogi', 'fridge', 1),
  s('p1', 'penne', 'pantry', 2),
  s('p2', 'ryz', 'pantry', 1),
  s('p3', 'passata', 'pantry', 2),
  s('p4', 'tunczyk', 'pantry', 3),
  s('p5', 'platki', 'pantry', 1),
  s('p6', 'herbata', 'pantry', 1),
  s('p7', 'czekolada', 'pantry', 2),
  s('p8', 'migdaly', 'pantry', 1),
  s('p9', 'maka', 'pantry', 1),
  s('b1', 'bulki', 'bags', 1, 3),
  s('b2', 'banany', 'bags', 1, 5),
  s('b3', 'kawa', 'bags', 1),
  s('b4', 'spaghetti', 'bags', 2),
  s('b5', 'smietana', 'bags', 1, 8),
];

const LIST: ListItem[] = [
  { id: 'l1', productId: 'maslo', qty: 1, done: false },
  { id: 'l2', productId: 'ogorki', qty: 1, done: false },
  { id: 'l3', productId: 'chleb', qty: 1, done: true },
];

const EVENTS: UsageEvent[] = [
  ...evs('mleko', [27, 22, 17, 12, 7, 2]),
  ...evs('jajka', [20, 18, 16, 14, 12, 10, 8, 6, 4, 2]),
  ...evs('jogurt', [24, 21, 18, 15, 12, 9, 6, 3]),
  ...evs('maslo', [26, 20, 14, 8, 3]),
  ...evs('gouda', [25, 15, 5]),
  ...evs('penne', [20, 6]),
];

export function createSeed(): AppState {
  return { products: PRODUCTS, stock: STOCK, list: LIST, events: EVENTS, dismissed: {} };
}
