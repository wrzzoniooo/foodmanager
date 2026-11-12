// Jednorazowo: produkty katalogu z kategorią "inne" dostają kategorię i miejsce na podstawie słów w nazwie.
// Uruchom: node scripts/classify-lidl.mjs
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../public/data/lidl.json', import.meta.url);
const FRIDGE = new Set(['nabial', 'sery', 'mieso', 'warzywa', 'mrozonki']);

// Kolejność ma znaczenie: pierwsza pasująca reguła wygrywa.
const RULES = [
  ['mrozonki', /mrożon|frozen|\blody\b|lód|frytki|nuggets|zapiekank|green peas|groszek zielony|zielona fasolka|bukiet warzyw|warzywa na patelnię|mieszanka (chińska|meksykańska|warzyw)|szwedzki|koldūnai|pierogi|kluski (śląskie|na parze)/i],
  ['sery', /\bser\b|\bsery\b|\bsera\b|serek|mozzarell|gouda|camembert|\bbrie\b|feta|parmezan|halloumi|fourme|cheddar|ricotta|mascarpone|twaróg|gorgonzola|edam/i],
  ['nabial', /mleko|jogurt|kefir|maślank|śmietan|masło|\bjaja\b|jajka|skyr|margaryn|deser mleczn|napój mleczn/i],
  ['mieso', /szynk|kiełbas|parówk|wędlin|plastry|lyoner|schab|kurczak|indyk|wieprz|wołow|drobiow|burger|hot dog|mięs|frühstücksfleisch|boczek|pasztet|dorsz|łosoś|makrel|\bryb|śledź|tuńczyk|krewet|karkówk|salami|polędwic|kabanos|filet|sashi|wegetariańskie/i],
  ['sery', /gruy[eè]re/i],
  ['mieso', /pstrąg|salmon|chicker|meatballs|croquet/i],
  ['sosy', /bulion|brühe|fix curry/i],
  ['slone', /prażynki/i],
  ['slodycze', /piernik|nugat|wafle|porzeczk/i],
  ['konserwy', /lunchbox|pizza|pinsa|naleśnik|mac & cheese|żurek|salad|surówk|cabbage|pasta|kotlet/i],
  ['warzywa', /szpinak|papryczk|kiszony|kimchi|zakwas|oliven/i],
  ['pieczywo', /chleb|bułk|bagiet|tost|rogal|drożdżówk|\bpita\b|tortilla/i],
  ['sypkie', /makaron|spaghetti|penne|fusilli|orzo|tortellini|\bkluski\b|kasz|\bryż|mąk|płatki|jagły|musli|granola|flakes|flakss|crunchy|cruchy|ringos|cinni|pillow|protein pillow|ziarno/i],
  ['slone', /chips|chrupki|paluszki|krakers|orzesz|orzech|popcorn|precel|nachos|migdały/i],
  ['slodycze', /czekolad|baton|protein bar|ciastk|cookies|wafel|cukier|żelki|kisiel|budyń|chałw|choco|keto|\bmalina z kwiatem/i],
  ['sosy', /ketchup|\bsos\b|pesto|majonez|musztard|\boleje?\b|oliw|ocet|przypraw|dressing|\bmalin(a|y) z kwiatem/i],
  ['konserwy', /konserw|\bfasol|kukurydz|\bzupa\b|danie|sałatka z (czerwonej|białej)|buraczki/i],
  ['warzywa', /sałat|włoszczyzn|pomidor|ogór|marchew|papryk|cebul|ziemniak|brokuł|kapust|buraki/i],
  ['owoce', /malin|truskaw|jabłk|banan|winogron|owoce|cytryn|pomarańcz|borówk|jagod/i],
];

const data = JSON.parse(await readFile(FILE, 'utf8'));
let changed = 0;
for (const p of data.products) {
  if (p.category !== 'inne') continue;
  const hit = RULES.find(([, re]) => re.test(p.name));
  if (!hit) continue;
  p.category = hit[0];
  p.defaultPlace = FRIDGE.has(hit[0]) ? 'fridge' : 'pantry';
  changed++;
}
await writeFile(FILE, JSON.stringify(data));
const left = data.products.filter((p) => p.category === 'inne');
console.log(`Zmieniono ${changed}, zostało w "inne": ${left.length} z ${data.products.length}`);
console.log(left.slice(0, 40).map((p) => p.name).join(' | '));
