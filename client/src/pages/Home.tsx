import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Dashboard } from '../lib/api';
import { useAuth, isManagerial } from '../lib/auth';
import { money, monthLabel, shortDate } from '../lib/format';
import { Empty, Screen, Skeleton } from '../components/Layout';
import { Meter, TrendChart } from '../components/Charts';
import { InstallHint } from '../components/InstallHint';
import {
  IconArrow, IconBonus, IconCalendar, IconExpense, IconMoney, IconOrder, IconPhone,
  IconPin, IconReturn, IconTag, IconTrophy, IconUsers,
} from '../components/Icons';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  const currency = data?.currency || user?.currency || 'IQD';

  const actions = [
    { label: 'Order', icon: <IconOrder />, to: '/orders/new?type=order' },
    { label: 'Return', icon: <IconReturn />, to: '/orders/new?type=return' },
    { label: 'Expense', icon: <IconExpense />, to: '/expenses' },
    { label: 'Bonus', icon: <IconBonus />, to: '/orders/new?type=order&bonus=1' },
    { label: 'Visit Plan', icon: <IconCalendar />, to: '/visits' },
    { label: 'Promotion', icon: <IconTag />, to: '/promotions' },
    { label: 'M.C', icon: <IconMoney />, to: '/collections' },
    { label: 'Call', icon: <IconPhone />, to: '/calls' },
    isManagerial(user)
      ? { label: 'Team', icon: <IconUsers />, to: '/team' }
      : { label: 'Ranking', icon: <IconTrophy />, to: '/leaderboard' },
  ];

  return (
    <Screen title="EliaVit">
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
              <strong>Sales Report</strong>
            </div>
            <div className="hero-figure">
              {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(data.netTotal)}
              <span>{currency}</span>
            </div>
            <div className="hero-foot">
              <div style={{ flex: 1 }}>
                <Meter
                  label="Monthly target"
                  value={data.netTotal}
                  target={data.target}
                  currency={currency}
                  pace={data.pace}
                  onHero
                />
              </div>
              <button className="hero-go" onClick={() => navigate('/report')} aria-label="Open sales report">
                <IconArrow size={18} />
              </button>
            </div>
          </section>

          <div className="section-title">
            Last 6 months
            <button className="link" onClick={() => navigate('/report')}>Report</button>
          </div>
          <div className="card">
            <TrendChart data={data.trend} currency={currency} />
          </div>

          <div className="section-title">This month</div>
          <div className="stat-strip">
            <Stat label="Order" count={data.counts.orders} icon={<IconOrder size={19} />} onClick={() => navigate('/orders?type=order')} />
            <Stat label="Return" count={data.counts.returns} icon={<IconReturn size={19} />} onClick={() => navigate('/orders?type=return')} />
            <Stat label="Expense" count={data.counts.expenses} icon={<IconExpense size={19} />} onClick={() => navigate('/expenses')} />
            <Stat label="M.C" count={data.counts.collections} icon={<IconMoney size={19} />} onClick={() => navigate('/collections')} />
            <Stat label="Call" count={data.counts.calls} icon={<IconPhone size={19} />} onClick={() => navigate('/calls')} />
          </div>

          <div className="section-title">Quick actions</div>
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
              <div className="label">Collected</div>
              <div className="value">{money(data.collectedTotal, currency)}</div>
            </div>
            <div className="kpi">
              <div className="label">Expenses</div>
              <div className="value">{money(data.expenseTotal, currency)}</div>
            </div>
          </div>

          <div className="section-title">
            Today&apos;s visits
            <button className="link" onClick={() => navigate('/visits')}>See all</button>
          </div>
          {data.todayVisits.length === 0 ? (
            <div className="card">
              <Empty
                icon={<IconCalendar size={26} />}
                headline="Nothing planned today"
                text="Add a visit so your route is ready before you set off."
              />
              <button className="btn ghost" onClick={() => navigate('/visits')}>Plan a visit</button>
            </div>
          ) : (
            <div className="list">
              {data.todayVisits.slice(0, 3).map((visit) => (
                <button key={visit.id} className="row" onClick={() => navigate('/visits')}>
                  <span className="avatar"><IconPin size={18} /></span>
                  <span className="grow">
                    <span className="title">{visit.customer}</span>
                    <span className="sub">{visit.note || 'No objective set'}</span>
                  </span>
                  <span className={`pill ${visit.status === 'done' ? 'good' : ''}`}>
                    {visit.status === 'done' ? 'checked in' : 'planned'}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="section-title">
            Recent activity
            <button className="link" onClick={() => navigate('/orders')}>See all</button>
          </div>
          <div className="list">
            {data.recentOrders.length === 0 && (
              <Empty icon={<IconOrder size={26} />} headline="No records yet" text="Your first order will show up here." />
            )}
            {data.recentOrders.map((order) => (
              <button key={order.id} className="row" onClick={() => navigate(`/orders/${order.id}`)}>
                <span className="avatar">
                  {order.type === 'return' ? <IconReturn size={18} /> : <IconOrder size={18} />}
                </span>
                <span className="grow">
                  <span className="title">{order.customer}</span>
                  <span className="sub">
                    {order.code} · {shortDate(order.date)}
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
