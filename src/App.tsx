import { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { CatalogProvider } from './catalog';
import { BottomNav, ToastProvider, type Tab } from './components/ui';
import { StockScreen } from './screens/StockScreen';
import { ListScreen } from './screens/ListScreen';
import { PromoScreen } from './screens/PromoScreen';

function Shell() {
  const [tab, setTab] = useState<Tab>('fridge');
  const { state } = useStore();
  const openCount = state.list.filter((l) => !l.done).length;

  return (
    <div className="app">
      <main>
        {tab === 'fridge' ? <StockScreen place="fridge" /> : null}
        {tab === 'pantry' ? <StockScreen place="pantry" /> : null}
        {tab === 'list' ? <ListScreen /> : null}
        {tab === 'promo' ? <PromoScreen /> : null}
      </main>
      <BottomNav tab={tab} onChange={setTab} listCount={openCount} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <CatalogProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </CatalogProvider>
    </StoreProvider>
  );
}
