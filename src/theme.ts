import { useCallback, useEffect, useState } from 'react';

export type Theme = 'auto' | 'light' | 'dark';

/** Wybór motywu trzymany tylko na tym telefonie. "auto" = jak ustawienie telefonu lub przeglądarki. */
const KEY = 'spizarnia.theme.v1';
const THEMES: Theme[] = ['auto', 'light', 'dark'];
const BAR_COLOR = { light: '#F1E8D6', dark: '#1d2318' };

export function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    return THEMES.includes(saved as Theme) ? (saved as Theme) : 'auto';
  } catch {
    return 'auto';
  }
}

function resolved(theme: Theme): 'light' | 'dark' {
  if (theme !== 'auto') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Ustawia motyw na stronie i kolor paska przeglądarki. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[resolved(theme)]);
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(loadTheme);

  const update = useCallback((next: Theme) => {
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* brak dostępu do pamięci lokalnej: motyw działa do zamknięcia aplikacji */
    }
    applyTheme(next);
  }, []);

  // Przy motywie "auto" kolor paska podąża za zmianą ustawienia telefonu.
  useEffect(() => {
    if (theme !== 'auto') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('auto');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [theme]);

  return [theme, update];
}
