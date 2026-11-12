/**
 * Stałe powiadomienie na pasku telefonu na czas zakupów (tylko w aplikacji na Androida). Prowadzi do listy zakupów.
 * Pojawia się, gdy zaznaczono pierwszy produkt albo jest 15:30 lub później (i coś zostało do kupienia), a znika po
 * zakończeniu zakupów. Po zakończeniu zakupów godzina nie przywraca go już tego samego dnia.
 */
const NOTICE_ID = 4711;
const FROM_MINUTES = 15 * 60 + 30;
const FINISHED_KEY = 'spizarnia.shopping.finished';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function finishedDay(): string | null {
  try {
    return localStorage.getItem(FINISHED_KEY);
  } catch {
    return null;
  }
}

/** Wywołaj przy "Zakończ zakupy": do końca dnia samo 15:30 nie pokaże już powiadomienia. */
export function markShoppingFinished(): void {
  try {
    localStorage.setItem(FINISHED_KEY, dayKey(new Date()));
  } catch {
    /* brak dostępu do pamięci lokalnej: powiadomienie może wrócić po 15:30, nic poza tym */
  }
}

export interface NoticeState {
  /** Wszystkie pozycje na liście. */
  total: number;
  /** Zaznaczone jako kupione. */
  done: number;
}

/** Czy powiadomienie ma być teraz widoczne. */
export function noticeVisible({ total, done }: NoticeState, now: Date, finished: string | null): boolean {
  if (done > 0) return true;
  const afterTime = now.getHours() * 60 + now.getMinutes() >= FROM_MINUTES;
  return total - done > 0 && afterTime && finished !== dayKey(now);
}

function bodyFor({ total, done }: NoticeState): string {
  return done > 0 ? `Do kupienia: ${total - done}, w koszyku: ${done}` : `Do kupienia: ${total}`;
}

async function plugin() {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return null;
  return (await import('@capacitor/local-notifications')).LocalNotifications;
}

let lastKey = '';

/** Ustawia powiadomienie zgodnie ze stanem listy: pokazuje, zmienia treść, planuje na 15:30 albo usuwa. */
export async function syncShoppingNotice(state: NoticeState, now = new Date()): Promise<void> {
  try {
    const ln = await plugin();
    if (!ln) return;
    const finished = finishedDay();
    const visible = noticeVisible(state, now, finished);
    const plannedToday =
      !visible && state.total - state.done > 0 && finished !== dayKey(now) && now.getHours() * 60 + now.getMinutes() < FROM_MINUTES;
    const key = visible ? `show:${bodyFor(state)}` : plannedToday ? `plan:${dayKey(now)}:${bodyFor(state)}` : 'none';
    if (key === lastKey) return;
    lastKey = key;

    if (key === 'none') {
      await ln.cancel({ notifications: [{ id: NOTICE_ID }] });
      return;
    }
    let granted = (await ln.checkPermissions()).display === 'granted';
    if (!granted) granted = (await ln.requestPermissions()).display === 'granted';
    if (!granted) return;

    const at = visible
      ? new Date(Date.now() + 500)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30, 0);
    await ln.schedule({
      notifications: [
        {
          id: NOTICE_ID,
          title: 'Lista zakupów',
          body: bodyFor(state),
          ongoing: true,
          autoCancel: false,
          smallIcon: 'ic_stat_shelfie',
          iconColor: '#B65A3C',
          schedule: { at, allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* brak wtyczki albo zgody: aplikacja działa bez powiadomienia */
  }
}

/** Dotknięcie powiadomienia otwiera listę zakupów. */
export async function onNoticeTap(open: () => void): Promise<() => void> {
  try {
    const ln = await plugin();
    if (!ln) return () => undefined;
    const handle = await ln.addListener('localNotificationActionPerformed', () => open());
    return () => void handle.remove();
  } catch {
    return () => undefined;
  }
}
