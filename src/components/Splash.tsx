import { useEffect, useState } from 'react';

/** Ekran startowy pokazywany raz po uruchomieniu aplikacji: logo i pod nim nazwa, na kolorze ikony aplikacji. */
let shown = false;

export function Splash() {
  const [phase, setPhase] = useState<'show' | 'hide' | 'gone'>(shown ? 'gone' : 'show');

  useEffect(() => {
    if (phase === 'gone') return;
    shown = true;
    const hide = window.setTimeout(() => setPhase('hide'), 1100);
    const gone = window.setTimeout(() => setPhase('gone'), 1550);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(gone);
    };
  }, [phase]);

  if (phase === 'gone') return null;
  return (
    <div className={phase === 'hide' ? 'splash hide' : 'splash'} aria-hidden="true">
      <svg className="splash-logo" viewBox="150 96 212 320" role="img">
        <rect x="150" y="96" width="212" height="320" rx="36" fill="var(--splash-ink)" />
        <rect x="150" y="214" width="212" height="12" fill="var(--splash-bg)" />
        <rect x="318" y="140" width="14" height="50" rx="7" fill="var(--splash-bg)" />
        <rect x="318" y="248" width="14" height="80" rx="7" fill="var(--splash-bg)" />
      </svg>
      <div className="splash-name">Shelfie</div>
    </div>
  );
}
