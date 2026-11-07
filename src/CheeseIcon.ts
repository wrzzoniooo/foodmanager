import { createLucideIcon } from 'lucide-react';

/**
 * Ikona sera z dziurami (w lucide nie ma takiej). Rysunek z zestawu Tabler Icons "cheese" (licencja MIT),
 * ta sama siatka 24 px i grubość linii 2 co pozostałe ikony kategorii.
 */
export const Cheese = createLucideIcon('Cheese', [
  ['path', { d: 'M4.519 20.008l16.481 -.008v-3.5a2 2 0 1 1 0 -4v-3.5h-16.722', key: 'base' }],
  [
    'path',
    {
      d: 'M21 9l-9.385 -4.992c-2.512 .12 -4.758 1.42 -6.327 3.425c-1.423 1.82 -2.288 4.221 -2.288 6.854c0 2.117 .56 4.085 1.519 5.721',
      key: 'wedge',
    },
  ],
  ['path', { d: 'M15 13v.01', key: 'h1' }],
  ['path', { d: 'M8 13v.01', key: 'h2' }],
  ['path', { d: 'M11 16v.01', key: 'h3' }],
]);
