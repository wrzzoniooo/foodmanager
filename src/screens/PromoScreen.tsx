import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useStore } from '../store';
import { useCatalog } from '../catalog';
import { buildPromos, isFrequent, stockQty } from '../insights';
import { ProductImage, Chips, useToast } from '../components/ui';

type Tab = 'today' | 'upcoming' | 'mine';

const GAZETKI_URL = 'https://www.lidl.pl/c/nasze-gazetki/s10008614';

function formatStamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')} o ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function PromoScreen() {
  const { state, dispatch } = useStore();
  const { promos, generatedAt, status } = useCatalog();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('today');

  const views = useMemo(() => buildPromos(state.products, promos), [state.products, promos]);
  const onList = new Set(state.list.map((l) => l.productId));

  const mine = (productId: string) => onList.has(productId) || isFrequent(state, productId);
  const shown = views.filter((v) => (tab === 'today' ? v.active : tab === 'upcoming' ? !v.active : mine(v.product.id)));

  const emptyText =
    status === 'unavailable'
      ? 'Nie udało się wczytać ofert. Spróbuj ponownie, gdy będziesz online.'
      : tab === 'mine'
        ? 'Gdy produkt z Twojej listy lub z często kupowanych będzie w promocji, pojawi się tutaj.'
        : 'Nie ma teraz tutaj żadnych ofert. Sprawdź oryginalne gazetki poniżej.';

  return (
    <section className="screen" aria-label="Promocje">
      <header className="head">
        <h1>Promocje Lidl</h1>
      </header>

      <Chips
        options={[
          { id: 'today' as const, label: 'Dziś' },
          { id: 'upcoming' as const, label: 'Wkrótce' },
          { id: 'mine' as const, label: 'Z mojej listy' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {shown.length === 0 ? (
        <div className="empty">
          <h2>Brak promocji</h2>
          <p>{emptyText}</p>
        </div>
      ) : (
        <ul className="grid">
          {shown.map((v) => {
            const isOnList = onList.has(v.product.id);
            const tags: string[] = [];
            if (isOnList) tags.push('Masz na liście');
            else if (isFrequent(state, v.product.id)) tags.push(stockQty(state, v.product.id) === 0 ? 'Brakuje w domu' : 'Często kupujecie');
            return (
              <li key={v.promo.productId} className="card tile">
                {v.percent ? <span className="tile-badge">-{v.percent}%</span> : null}
                <ProductImage product={v.product} size={72} />
                <div className="name">{v.product.name}</div>
                <div className="meta">{[v.product.brand, v.validity].filter(Boolean).join(' · ')}</div>
                <div className="price-line">
                  {v.priceOldLabel ? <span className="price-old">{v.priceOldLabel}</span> : null}
                  <span className="price-now">{v.priceNowLabel}</span>
                </div>
                {tags.map((t) => (
                  <span key={t} className="tag green">
                    {t}
                  </span>
                ))}
                <button
                  type="button"
                  className={isOnList ? 'btn small ghost' : 'btn small'}
                  onClick={() => {
                    dispatch({ type: 'listAdd', productId: v.product.id });
                    toast(`${v.product.name} na liście`);
                  }}
                  disabled={isOnList}
                >
                  {isOnList ? 'Na liście' : 'Dodaj do listy'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <a className="card row link-card" href={GAZETKI_URL} target="_blank" rel="noopener noreferrer">
        <div className="grow">
          <div className="name">Oryginalne gazetki Lidla</div>
          <div className="meta">Otwiera się w przeglądarce</div>
        </div>
        <ExternalLink size={20} aria-hidden="true" />
      </a>

      {generatedAt ? (
        <p className="note">
          Oferty spożywcze ze strony Lidla, stan na {formatStamp(generatedAt)}
          {status === 'offline-cache' ? ' (zapisane w telefonie)' : ''}. Pokazujemy tylko część oferty, ceny są orientacyjne.
        </p>
      ) : null}
    </section>
  );
}
