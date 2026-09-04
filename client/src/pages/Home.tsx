import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Dashboard } from '../lib/api';
import { useAuth, isManagerial } from '../lib/auth';
import { money, monthLabel, shortDate } from '../lib/format';
import { Screen, Spinner } from '../components/Layout';
import {
  IconArrow, IconBonus, IconCalendar, IconChart, IconExpense, IconMoney,
  IconOrder, IconPhone, IconReturn, IconTag, IconUsers,
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
      : { label: 'Customers', icon: <IconUsers />, to: '/customers' },
  ];

  return (
    <Screen title="EliaVit">
      {error && <div className="alert error">{error}</div>}
      {!data && !error && <Spinner />}

      {data && (
        <>
          <section className="hero">
            <div className="hero-head">
              <span className="muted">{monthLabel(data.month)}</span>
              <strong>Sales Report</strong>
            </div>
            <div className="hero-amount">
              <div className="value">
                {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(data.netTotal)}
                <span>{currency}</span>
              </div>
              <button className="hero-go" onClick={() => navigate('/report')} aria-label="Open sales report">
                <IconArrow size={18} />
              </button>
            </div>
          </section>

          <div className="section-title">This month</div>
          <div className="stat-strip">
            <StatCard label="Order" count={data.counts.orders} icon={<IconOrder size={20} />} onClick={() => navigate('/orders?type=order')} />
            <StatCard label="Return" count={data.counts.returns} icon={<IconReturn size={20} />} onClick={() => navigate('/orders?type=return')} />
            <StatCard label="Expense" count={data.counts.expenses} icon={<IconExpense size={20} />} onClick={() => navigate('/expenses')} />
            <StatCard label="M.C" count={data.counts.collections} icon={<IconMoney size={20} />} onClick={() => navigate('/collections')} />
            <StatCard label="Call" count={data.counts.calls} icon={<IconPhone size={20} />} onClick={() => navigate('/calls')} />
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

          {data.todayVisits.length > 0 && (
            <>
              <div className="section-title">
                Today&apos;s visits
                <a href="/visits" onClick={(e) => { e.preventDefault(); navigate('/visits'); }}>See all</a>
              </div>
              <div className="card">
                {data.todayVisits.slice(0, 3).map((visit, index) => (
                  <div key={visit.id} style={{ paddingTop: index ? 12 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <strong>{visit.customer}</strong>
                      <span className={`pill ${visit.status === 'done' ? 'done' : 'pending'}`}>{visit.status}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {visit.note || 'No objective set'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="section-title">
            Recent activity
            <a href="/orders" onClick={(e) => { e.preventDefault(); navigate('/orders'); }}>See all</a>
          </div>
          <div className="list">
            {data.recentOrders.length === 0 && <p className="empty">Nothing recorded yet.</p>}
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

          {isManagerial(user) && (
            <button className="btn ghost" style={{ marginTop: 16 }} onClick={() => navigate('/team')}>
              <IconChart size={18} /> Open team activity
            </button>
          )}
        </>
      )}
    </Screen>
  );
}

function StatCard({
  label, count, icon, onClick,
}: { label: string; count: number; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button className="stat" onClick={onClick} style={{ border: 0, cursor: 'pointer', textAlign: 'left' }}>
      <span className="top">
        <span style={{ color: 'var(--brand-dark)' }}>{icon}</span>
        <span className="badge">{count}</span>
      </span>
      <span className="label">{label}</span>
    </button>
  );
}
