import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Customer, type Order, type User } from '../lib/api';
import { useAuth, isManagerial } from '../lib/auth';
import { money, shortDate } from '../lib/format';
import { Empty, Screen, Skeleton } from '../components/Layout';
import { IconOrder, IconPlus, IconReturn } from '../components/Icons';

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || 'both';

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setOrders(null);
    Promise.all([
      api.orders({ type }),
      api.customers(),
      isManagerial(user) ? api.staff() : Promise.resolve([]),
    ])
      .then(([loadedOrders, loadedCustomers, loadedStaff]) => {
        setOrders(loadedOrders);
        setCustomers(loadedCustomers);
        setStaff(loadedStaff);
      })
      .catch((err) => setError(err.message));
  }, [type, user]);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name]));
    return (id: number) => map.get(id) || `Customer #${id}`;
  }, [customers]);

  const staffName = useMemo(() => {
    const map = new Map(staff.map((s) => [s.id, s.name]));
    return (id: number) => map.get(id) || '';
  }, [staff]);

  const setType = (next: string) => setParams(next === 'both' ? {} : { type: next });

  return (
    <Screen
      title="Orders & Returns"
      action={
        <button className="icon-btn" onClick={() => navigate('/orders/new?type=order')} aria-label="New order">
          <IconPlus />
        </button>
      }
    >
      <div className="toggle" style={{ marginBottom: 14 }}>
        {[
          { key: 'both', label: 'All' },
          { key: 'order', label: 'Orders' },
          { key: 'return', label: 'Returns' },
        ].map((option) => (
          <button
            key={option.key}
            className={type === option.key ? 'on' : ''}
            onClick={() => setType(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && <div className="alert error">{error}</div>}
      {!orders && !error && <Skeleton height={72} count={5} />}
      {orders && orders.length === 0 && <Empty text="No records for this filter yet." />}

      <div className="list">
        {orders?.map((order) => (
          <button key={order.id} className="row" onClick={() => navigate(`/orders/${order.id}`)}>
            <span className="avatar">
              {order.type === 'return' ? <IconReturn size={18} /> : <IconOrder size={18} />}
            </span>
            <span className="grow">
              <span className="title">{customerName(order.customerId)}</span>
              <span className="sub">
                {order.code} · {shortDate(order.date)} · {order.lines.length} item
                {order.lines.length === 1 ? '' : 's'}
                {isManagerial(user) && staffName(order.userId) ? ` · ${staffName(order.userId)}` : ''}
              </span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <span
                className="amount"
                style={{ color: order.type === 'return' ? 'var(--danger)' : undefined, display: 'block' }}
              >
                {order.type === 'return' ? '-' : ''}
                {money(order.total, user?.currency)}
              </span>
              {order.status === 'pending' && <span className="pill pending">pending</span>}
            </span>
          </button>
        ))}
      </div>

      <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate('/orders/new?type=order')}>
        <IconPlus size={18} /> New order
      </button>
      <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => navigate('/orders/new?type=return')}>
        <IconReturn size={18} /> New return
      </button>
    </Screen>
  );
}
