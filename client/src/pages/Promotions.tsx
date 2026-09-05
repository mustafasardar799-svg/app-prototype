import { useEffect, useState } from 'react';
import { api, type Company, type Promotion } from '../lib/api';
import { shortDate, today } from '../lib/format';
import { useT } from '../lib/i18n';
import { Empty, Screen, Skeleton } from '../components/Layout';

export default function Promotions() {
  const t = useT();
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.promotions(), api.companies()])
      .then(([loadedPromotions, loadedCompanies]) => {
        setPromotions(loadedPromotions);
        setCompanies(loadedCompanies);
      })
      .catch((err) => setError(err.message));
  }, []);

  const companyName = (id: number) => companies.find((c) => c.id === id)?.name || '—';
  const isLive = (promotion: Promotion) => promotion.from <= today() && promotion.to >= today();

  return (
    <Screen title={t('promotions')} back>
      {error && <div className="alert error">{error}</div>}
      {!promotions && !error && <Skeleton height={96} count={3} />}
      {promotions && promotions.length === 0 && <Empty text={t('noPromotions')} />}

      <div className="list">
        {promotions?.map((promotion) => (
          <div key={promotion.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <strong>{promotion.title}</strong>
              <span className={`pill ${isLive(promotion) ? 'done' : 'pending'}`}>
                {isLive(promotion) ? 'live' : 'ended'}
              </span>
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
              {companyName(promotion.companyId)} · {shortDate(promotion.from)} → {shortDate(promotion.to)}
            </div>
            {promotion.description && (
              <p style={{ margin: '10px 0 0', fontSize: 14 }}>{promotion.description}</p>
            )}
          </div>
        ))}
      </div>
    </Screen>
  );
}
