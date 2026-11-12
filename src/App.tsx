import { useEffect, useMemo, useState } from 'react';
import { buildSuggestions } from './insights';
import { StoreProvider, useStore } from './store';
import { SyncProvider } from './sync/SyncProvider';
import { CatalogProvider } from './catalog';
import { BottomNav, ToastProvider, type Tab } from './components/ui';
import { StockScreen } from './screens/StockScreen';
import { ListScreen } from './screens/ListScreen';
import { onNoticeTap, syncShoppingNotice } from './shoppingNotice';
import { Splash } from './components/Splash';

function Shell() {
  const [tab, setTab] = useState<Tab>('fridge');
  const { state } = useStore();
  const hasSuggestions = useMemo(() => buildSuggestions(state).length > 0, [state]);
  const total = state.list.length;
  const done = state.list.filter((l) => l.done).length;

  // Powiadomienie na pasku telefonu na czas zakupów; co minutę sprawdzamy też godzinę (15:30).
  useEffect(() => {
    void syncShoppingNotice({ total, done });
    const timer = window.setInterval(() => void syncShoppingNotice({ total, done }), 60_000);
    return () => window.clearInterval(timer);
  }, [total, done]);
  useEffect(() => {
    let remove: () => void = () => undefined;
    void onNoticeTap(() => setTab('list')).then((r) => {
      remove = r;
    });
    return () => remove();
  }, []);

  return (
    <div className="app">
      <main>
        {tab === 'fridge' ? <StockScreen place="fridge" /> : null}
        {tab === 'pantry' ? <StockScreen place="pantry" /> : null}
        {tab === 'list' ? <ListScreen /> : null}
      </main>
      <BottomNav
        tab={tab}
        onChange={setTab}
        list={{ total, done, suggestions: hasSuggestions }}
      />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <SyncProvider>
      <CatalogProvider>
        <ToastProvider>
          <Splash />
          <Shell />
        </ToastProvider>
      </CatalogProvider>
      </SyncProvider>
    </StoreProvider>
  );
}
