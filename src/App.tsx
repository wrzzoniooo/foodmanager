import { useMemo, useState } from 'react';
import { buildSuggestions } from './insights';
import { StoreProvider, useStore } from './store';
import { SyncProvider } from './sync/SyncProvider';
import { CatalogProvider } from './catalog';
import { BottomNav, ToastProvider, type Tab } from './components/ui';
import { StockScreen } from './screens/StockScreen';
import { ListScreen } from './screens/ListScreen';

function Shell() {
  const [tab, setTab] = useState<Tab>('fridge');
  const { state } = useStore();
  const hasSuggestions = useMemo(() => buildSuggestions(state).length > 0, [state]);

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
        list={{ total: state.list.length, done: state.list.filter((l) => l.done).length, suggestions: hasSuggestions }}
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
          <Shell />
        </ToastProvider>
      </CatalogProvider>
      </SyncProvider>
    </StoreProvider>
  );
}
