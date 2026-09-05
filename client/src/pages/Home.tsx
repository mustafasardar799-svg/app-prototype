import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Dashboard } from '../lib/api';
import { useAuth, isManagerial } from '../lib/auth';
import { money, monthLabel, shortDate } from '../lib/format';
import { useT } from '../lib/i18n';
import { Empty, Screen, Skeleton } from '../components/Layout';
import { Meter, TrendChart } from '../components/Charts';
import { InstallHint } from '../components/InstallHint';
import {
  IconArrow, IconBonus, IconCalendar, IconExpense, IconMoney, IconOrder, IconPhone,
  IconPin, IconReturn, IconTag, IconTrophy, IconUsers,
} from '../components/Icons';

export default function Home() {
  const { user } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  const currency = data?.currency || user?.currency || 'IQD';

  const actions = [
    { label: t('order'), icon: <IconOrder />, to: '/orders/new?type=order' },
    { label: t('return'), icon: <IconReturn />, to: '/orders/new?type=return' },
    { label: t('expense'), icon: <IconExpense />, to: '/expenses' },
    { label: t('bonus'), icon: <IconBonus />, to: '/orders/new?type=order&bonus=1' },
    { label: t('visitPlan'), icon: <IconCalendar />, to: '/visits' },
    { label: t('promotion'), icon: <IconTag />, to: '/promotions' },
    { label: t('moneyCollectorShort'), icon: <IconMoney />, to: '/collections' },
    { label: t('call'), icon: <IconPhone />, to: '/calls' },
    isManagerial(user)
      ? { label: t('team'), icon: <IconUsers />, to: '/team' }
      : { label: t('ranking'), icon: <IconTrophy />, to: '/leaderboard' },
  ];

  return (
    <Screen title={t('appName')}>
      {error && <div className="alert error">{error}</div>}
      {!data && !error && (
        <>
          <div className="skeleton" style={{ height: 168, borderRadius: 22 }} />
          <div style={{ height: 18 }} />
          <Skeleton height={78} count={2} />
        </>
      )}

      {data && (
        <>
          <InstallHint />

          <section className="hero">
            <div className="hero-head">
              <span className="label">{monthLabel(data.month)}</span>
              <strong>{t('salesReport')}</strong>
            </div>
            <div className="hero-figure">
              {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(data.netTotal)}
              <span>{currency}</span>
            </div>
            <div className="hero-foot">
              <div style={{ flex: 1 }}>
                <Meter
                  label={t('monthlyTarget')}
                  value={data.netTotal}
                  target={data.target}
                  currency={currency}
                  pace={data.pace}
                  onHero
                />
              </div>
              <button className="hero-go" onClick={() => navigate('/report')} aria-label={t('openSalesReport')}>
                <IconArrow size={18} />
              </button>
            </div>
          </section>

          <div className="section-title">
            {t('lastSixMonths')}
            <button className="link" onClick={() => navigate('/report')}>{t('navReport')}</button>
          </div>
          <div className="card">
            <TrendChart data={data.trend} currency={currency} />
          </div>

          <div className="section-title">{t('thisMonth')}</div>
          <div className="stat-strip">
            <Stat label={t('order')} count={data.counts.orders} icon={<IconOrder size={19} />} onClick={() => navigate('/orders?type=order')} />
            <Stat label={t('return')} count={data.counts.returns} icon={<IconReturn size={19} />} onClick={() => navigate('/orders?type=return')} />
            <Stat label={t('expense')} count={data.counts.expenses} icon={<IconExpense size={19} />} onClick={() => navigate('/expenses')} />
            <Stat label={t('moneyCollectorShort')} count={data.counts.collections} icon={<IconMoney size={19} />} onClick={() => navigate('/collections')} />
            <Stat label={t('call')} count={data.counts.calls} icon={<IconPhone size={19} />} onClick={() => navigate('/calls')} />
          </div>

          <div className="section-title">{t('quickActions')}</div>
          <div className="grid">
            {actions.map((action) => (
              <button key={action.label} className="tile" onClick={() => navigate(action.to)}>
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>

          <div className="kpis" style={{ marginTop: 18 }}>
            <div className="kpi">
              <div className="label">{t('collected')}</div>
              <div className="value">{money(data.collectedTotal, currency)}</div>
            </div>
            <div className="kpi">
              <div className="label">{t('expenses')}</div>
              <div className="value">{money(data.expenseTotal, currency)}</div>
            </div>
          </div>

          <div className="section-title">
            {t('todaysVisits')}
            <button className="link" onClick={() => navigate('/visits')}>{t('seeAll')}</button>
          </div>
          {data.todayVisits.length === 0 ? (
            <div className="card">
              <Empty
                icon={<IconCalendar size={26} />}
                headline={t('nothingPlannedToday')}
                text={t('nothingPlannedTodayText')}
              />
              <button className="btn ghost" onClick={() => navigate('/visits')}>{t('planAVisit')}</button>
            </div>
          ) : (
            <div className="list">
              {data.todayVisits.slice(0, 3).map((visit) => (
                <button key={visit.id} className="row" onClick={() => navigate('/visits')}>
                  <span className="avatar"><IconPin size={18} /></span>
                  <span className="grow">
                    <span className="title">{visit.customer}</span>
                    <span className="sub">{visit.note || t('noObjectiveSet')}</span>
                  </span>
                  <span className={`pill ${visit.status === 'done' ? 'good' : ''}`}>
                    {visit.status === 'done' ? t('checkedIn') : t('planned')}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="section-title">
            {t('recentActivity')}
            <button className="link" onClick={() => navigate('/orders')}>{t('seeAll')}</button>
          </div>
          <div className="list">
            {data.recentOrders.length === 0 && (
              <Empty icon={<IconOrder size={26} />} headline={t('noRecordsYet')} text={t('noRecordsYetText')} />
            )}
            {data.recentOrders.map((order) => (
              <button key={order.id} className="row" onClick={() => navigate(`/orders/${order.id}`)}>
                <span className="avatar">
                  {order.type === 'return' ? <IconReturn size={18} /> : <IconOrder size={18} />}
                </span>
                <span className="grow">
                  <span className="title">{order.customer}</span>
                  <span className="sub">
                    <span className="ltr-text">{order.code}</span> · {shortDate(order.date)}
                    {isManagerial(user) ? ` · ${order.staff}` : ''}
                  </span>
                </span>
                <span className="amount" style={{ color: order.type === 'return' ? 'var(--danger)' : undefined }}>
                  {order.type === 'return' ? '-' : ''}
                  {money(order.total, currency)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}

function Stat({
  label, count, icon, onClick,
}: { label: string; count: number; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button className="stat" onClick={onClick}>
      <span className="top">
        {icon}
        <span className="badge">{count}</span>
      </span>
      <span className="label">{label}</span>
    </button>
  );
}
