import type { AppState, ListItem, Product, PurchaseEvent, StockItem, UsageEvent } from '../types';
import { isoInDays } from '../dates';

/** Dane przykładowe do etapu 1 (bez backendu). Docelowo katalog i promocje importujemy automatycznie z Lidla. */

const OFF = 'https://images.openfoodfacts.org/images/products';

export const PRODUCTS: Product[] = [
  { id: 'mleko', name: 'Mleko spożywcze 3,2%', brand: 'Pilos', size: '1 l', category: 'nabial', defaultPlace: 'fridge', imageUrl: 'https://images.openfoodfacts.org/images/products/590/051/298/8016/front_pl.6.200.jpg' },
  { id: 'jajka', name: 'Jaja świeże', brand: 'Aktiw', size: '10 szt.', category: 'nabial', defaultPlace: 'fridge', imageUrl: 'https://images.openfoodfacts.org/images/products/000/002/032/5770/front_pl.4.200.jpg' },
  { id: 'jogurt', name: 'Jogurt naturalny 0% tłuszczu', brand: 'Pilos', size: '400 g', category: 'nabial', defaultPlace: 'fridge', imageUrl: 'https://images.openfoodfacts.org/images/products/000/002/085/8209/front_pl.4.200.jpg' },
  { id: 'smietana', name: 'Śmietanka UHT 12%', brand: 'Pilos', size: '500 ml', category: 'nabial', defaultPlace: 'fridge', imageUrl: 'https://images.openfoodfacts.org/images/products/590/012/002/3246/front_pl.3.200.jpg' },
  { id: 'maslo', name: 'Masło 83', brand: 'Pilos', size: '200 g', category: 'nabial', defaultPlace: 'fridge', imageUrl: 'https://images.openfoodfacts.org/images/products/590/547/700/4184/front_pl.4.200.jpg' },
  { id: 'gouda', name: 'Gouda', brand: 'Pilos', size: '150 g', category: 'sery', defaultPlace: 'fridge', imageUrl: 'https://images.openfoodfacts.org/images/products/000/002/098/3093/front_en.6.200.jpg' },
  { id: 'mozzarella', name: 'Mozzarella -Italian Style', brand: 'Milbona', size: '125 g (przed odsączeniem 200 g)', category: 'sery', defaultPlace: 'fridge', imageUrl: 'https://images.openfoodfacts.org/images/products/405/648/909/1752/front_de.23.200.jpg' },
  { id: 'szynka', name: 'Szynka wieprzowa, XXL', brand: 'Rzeźnik', category: 'mieso', defaultPlace: 'fridge', imageUrl: 'https://www.lidl.pl/assets/gcp8e92625ccfbc465a830e7d0352bde2a9.png' },
  { id: 'kurczak', name: 'Filet z indyka, XXL', brand: 'Rzeźnik', category: 'mieso', defaultPlace: 'fridge', imageUrl: 'https://www.lidl.pl/assets/gcp4d30427aa18a404487657b7ea89c069b.png' },
  { id: 'marchew', name: 'Surówka z marchewki', brand: 'Lidl', size: '300 g', category: 'warzywa', defaultPlace: 'fridge', imageUrl: 'https://images.openfoodfacts.org/images/products/433/561/900/6690/front_pl.3.200.jpg' },
  { id: 'pomidory', name: 'Pomidory malinowe', brand: 'Lidl', size: '500 g', category: 'warzywa', defaultPlace: 'fridge' },
  { id: 'ogorki', name: 'Ogórki kiszone', brand: 'Freshona', size: '820g', category: 'warzywa', defaultPlace: 'pantry', imageUrl: 'https://images.openfoodfacts.org/images/products/433/561/914/3043/front_pl.3.200.jpg' },
  { id: 'jablka', name: 'Polskie jabłka czerwone, luzem', brand: 'Ryneczek Lidla', category: 'owoce', defaultPlace: 'fridge', imageUrl: 'https://www.lidl.pl/assets/gcpea6fddcfa19c4f6bb4dc6645d8891426.png' },
  { id: 'banany', name: 'Banany, luzem', category: 'owoce', defaultPlace: 'pantry', imageUrl: 'https://www.lidl.pl/assets/gcpee9b5edda4384d6fba0ac93727dd6b8c.png' },
  { id: 'chleb', name: 'Chleb pszenno-żytni z nasionami słonecznika i sezamu oraz siemieniem lnianym.', brand: 'Tastino', size: '400 g', category: 'pieczywo', defaultPlace: 'pantry', imageUrl: 'https://images.openfoodfacts.org/images/products/405/648/911/9678/front_pl.7.200.jpg' },
  { id: 'bulki', name: 'Bułki pszenne', brand: 'Piekarnia Lidla', size: '6 szt.', category: 'pieczywo', defaultPlace: 'pantry' },
  { id: 'penne', name: 'Makaron penne', brand: 'Combino', size: '500 g', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'spaghetti', name: 'Spaghetti', brand: 'Combino', size: '1000 gram', category: 'sypkie', defaultPlace: 'pantry', imageUrl: 'https://images.openfoodfacts.org/images/products/000/002/006/3757/front_hr.67.200.jpg' },
  { id: 'ryz', name: 'Ryż basmati', brand: 'Vitasia', size: '1 kg', category: 'sypkie', defaultPlace: 'pantry' },
  { id: 'platki', name: 'Crownfield Płatki owsiane górskie', brand: 'Crownfield', size: '1kg', category: 'sypkie', defaultPlace: 'pantry', imageUrl: 'https://images.openfoodfacts.org/images/products/405/648/918/0968/front_pl.11.200.jpg' },
  { id: 'maka', name: 'Mąka pszenna typ 650', brand: 'Lidl', size: '1 kg', category: 'sypkie', defaultPlace: 'pantry', imageUrl: 'https://images.openfoodfacts.org/images/products/000/002/005/2652/front_pl.4.200.jpg' },
  { id: 'passata', name: 'Passata', brand: 'Italiamo', size: '700 gram', category: 'konserwy', defaultPlace: 'pantry', imageUrl: 'https://images.openfoodfacts.org/images/products/000/002/016/4041/front_en.133.200.jpg' },
  { id: 'tunczyk', name: 'Tuńczyk w oleju', brand: 'Nixe', size: '185 g', category: 'konserwy', defaultPlace: 'pantry' },
  { id: 'kawa', name: 'Kawa mielona', brand: 'Bellarom', size: '500 g', category: 'napoje', defaultPlace: 'pantry' },
  { id: 'herbata', name: 'Herbata czarna', brand: 'Lidl', size: '100 szt.', category: 'napoje', defaultPlace: 'pantry' },
  { id: 'woda', name: 'SAGUARO Naturalna woda źródlana', brand: 'Saguaro', size: '1,5 l', category: 'napoje', defaultPlace: 'pantry', imageUrl: 'https://images.openfoodfacts.org/images/products/000/002/005/5998/front_pl.14.200.jpg' },
  { id: 'pierogi', name: 'Pierogi ruskie', brand: 'Chef Select', size: '400g', category: 'mrozonki', defaultPlace: 'fridge', imageUrl: 'https://images.openfoodfacts.org/images/products/405/648/958/6159/front_pl.3.200.jpg' },
  { id: 'frytki', name: 'Frytki Długie Cienkie', brand: 'Harvest Basket', category: 'mrozonki', defaultPlace: 'fridge', imageUrl: 'https://images.openfoodfacts.org/images/products/405/648/992/3800/front_pl.5.200.jpg' },
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
