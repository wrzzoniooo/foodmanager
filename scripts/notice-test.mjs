import { pathToFileURL } from 'node:url';
const { noticeVisible } = await import(pathToFileURL(new URL('../src/shoppingNotice.ts', import.meta.url).pathname.replace(/^\//, '')).href);
const t = (h, m) => new Date(2026, 10, 12, h, m);
const today = '2026-11-12';
const cases = [
  ['lista pusta, 16:00', { total: 0, done: 0 }, t(16, 0), null, false],
  ['3 pozycje, 10:00, nic zaznaczone', { total: 3, done: 0 }, t(10, 0), null, false],
  ['3 pozycje, 15:29', { total: 3, done: 0 }, t(15, 29), null, false],
  ['3 pozycje, 15:30', { total: 3, done: 0 }, t(15, 30), null, true],
  ['3 pozycje, 20:00', { total: 3, done: 0 }, t(20, 0), null, true],
  ['pierwszy zaznaczony, 10:00', { total: 3, done: 1 }, t(10, 0), null, true],
  ['po zakończeniu, 16:00, zostały 2', { total: 2, done: 0 }, t(16, 0), today, false],
  ['po zakończeniu, ale nowy zaznaczony', { total: 2, done: 1 }, t(16, 0), today, true],
  ['wczorajsze zakończenie, dziś 16:00', { total: 2, done: 0 }, t(16, 0), '2026-11-11', true],
];
let bad = 0;
for (const [name, st, now, fin, want] of cases) {
  const got = noticeVisible(st, now, fin);
  if (got !== want) bad++;
  console.log(got === want ? 'OK ' : 'BŁĄD', name, '->', got);
}
console.log(bad ? `${bad} błędów` : 'wszystko OK');
