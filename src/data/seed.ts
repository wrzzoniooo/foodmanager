import type { AppState, ListItem, Product, PurchaseEvent, StockItem, UsageEvent } from '../types';
import { isoInDays } from '../dates';

/** Dane przykładowe do etapu 1 (bez backendu). Docelowo katalog i promocje importujemy automatycznie z Lidla. */

export const PRODUCTS: Product[] = [
  { id: 'mleko', name: 'Mleko spożywcze 3,2%', brand: 'Pilos', size: '1 l', category: 'nabial', defaultPlace: 'fridge' },
  { id: 'jajka', name: 'Jaja świeże', brand: 'Aktiw', size: '10 szt.', category: 'nabial', defaultPlace: 'fridge' },
  { id: 'jogurt', name: 'Jogurt naturalny 0% tłuszczu', brand: 'Pilos', size: '400 g', category: 'nabial', defaultPlace: 'fridge' },
  { id: 'smietana', name: 'Śmietanka UHT 12%', brand: 'Pilos', size: '500 ml', category: 'nabial', defaultPlace: 'fridge' },
  { id: 'maslo', name: 'Masło 83', brand: 'Pilos', size: '200 g', category: 'nabial', defaultPlace: 'fridge' },
  { id: 'gouda', name: 'Gouda', brand: 'Pilos', size: '150 g', category: 'sery', defaultPlace: 'fridge' },
  { id: 'mozzarella', name: 'Mozzarella -Italian Style', brand: 'Milbona', size: '125 g (przed odsączeniem 200 g)', category: 'sery', defaultPlace: 'fridge' },
  { id: 'szynka', name: 'Szynka wieprzowa, XXL', brand: 'Rzeźnik', category: 'mieso', defaultPlace: 'fridge' },
  { id: 'kurczak', name: 'Filet z indyka, XXL', brand: 'Rzeźnik', category: 'mieso', defaultPlace: 'fridge' },
  { id: 'marchew', name: 'Surówka z marchewki', brand: 'Lidl', size: '300 g', category: 'warzywa', defaultPlace: 'fridge' },
  { id: 'pomidory', name: 'Pomidory malinowe', brand: 'Lidl', size: '500 g', category: 'warzywa', defaultPlace: 'fridge' },
  { id: 'ogorki', name: 'Ogórki kiszone', brand: 'Freshona', size: '820g', category: 'warzywa', defaultPlace: 'pantry' },
  { id: 'jablka', name: 'Polskie jabłka czerwone, luzem', brand: 'Ryneczek Lidla', category: 'owoce', defaultPlace: 'fridge' },
  { id: 'banany', name: 'Banany, luzem', category: 'owoce', defaultPlace: 'pantry' },
  { id: 'chleb', name: 'Chleb pszenno-żytni z nasionami słonecznika i sezamu oraz siemieniem lnianym.', brand: 'Tastino', size: '400 g', category: 'pieczywo', defaultPlace: 'pantry' },
  { id: 'bulki', name: 'Bułki pszenne', brand: 'Piekarnia Lidla', size: '6 szt.', category: 'pieczywo', defaultPlace: 'pantry' },
  { id: 'penne', name: 'Makaron penne', brand: 'Combino', size: '500 g', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'spaghetti', name: 'Spaghetti', brand: 'Combino', size: '1000 gram', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'ryz', name: 'Ryż basmati', brand: 'Vitasia', size: '1 kg', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'platki', name: 'Crownfield Płatki owsiane górskie', brand: 'Crownfield', size: '1kg', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'maka', name: 'Mąka pszenna typ 650', brand: 'Lidl', size: '1 kg', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'passata', name: 'Passata', brand: 'Italiamo', size: '700 gram', category: 'konserwy', defaultPlace: 'pantry' },
  { id: 'tunczyk', name: 'Tuńczyk w oleju', brand: 'Nixe', size: '185 g', category: 'konserwy', defaultPlace: 'pantry' },
  { id: 'kawa', name: 'Kawa mielona', brand: 'Bellarom', size: '500 g', category: 'napoje', defaultPlace: 'pantry' },
  { id: 'herbata', name: 'Herbata czarna', brand: 'Lidl', size: '100 szt.', category: 'napoje', defaultPlace: 'pantry' },
  { id: 'woda', name: 'SAGUARO Naturalna woda źródlana', brand: 'Saguaro', size: '1,5 l', category: 'napoje', defaultPlace: 'pantry' },
  { id: 'pierogi', name: 'Pierogi ruskie', brand: 'Chef Select', size: '400g', category: 'mrozonki', defaultPlace: 'fridge' },
  { id: 'frytki', name: 'Frytki Długie Cienkie', brand: 'Harvest Basket', category: 'mrozonki', defaultPlace: 'fridge' },
  {
    id: 'czekolada',
    name: 'Czekolada gorzka 74%',
    brand: 'Carré fin',
    size: '100 g',
    category: 'slodycze',
    defaultPlace: 'pantry',
  },
  {
    id: 'migdaly',
    name: 'Migdały łuskane',
    brand: 'Alesto',
    size: '200 g',
    category: 'slodycze',
    defaultPlace: 'pantry',
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

/** Przykładowa historia zakupów (dni temu), żeby było widać, co aplikacja uzna za często kupowane. */
const buys = (productId: string, daysAgo: number[]): PurchaseEvent[] =>
  daysAgo.map((d) => ({ productId, ts: Date.now() - d * 24 * 60 * 60 * 1000, qty: 1 }));

const PURCHASES: PurchaseEvent[] = [
  ...buys('mleko', [28, 21, 14, 7]),
  ...buys('jajka', [30, 22, 14, 6]),
  ...buys('jogurt', [30, 24, 16, 9]),
  ...buys('maslo', [35, 25, 15]),
  ...buys('chleb', [10, 7, 4]),
];

export function createSeed(): AppState {
  return { products: PRODUCTS, stock: STOCK, list: LIST, events: EVENTS, purchases: PURCHASES, habits: {}, receipts: {}, receiptMap: {}, dismissed: {} };
}
