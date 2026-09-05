import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type Customer, type Order, type Product } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, shortDate } from '../lib/format';
import { customerTypeKey, useT } from '../lib/i18n';
import { Screen, Skeleton } from '../components/Layout';
import { ConfirmSheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { IconPen, IconTrash } from '../components/Icons';

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    Promise.all([api.order(Number(id)), api.customers(), api.products()])
      .then(([loadedOrder, customers, loadedProducts]) => {
        setOrder(loadedOrder);
        setCustomer(customers.find((c) => c.id === loadedOrder.customerId) || null);
        setProducts(loadedProducts);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  async function destroy() {
    if (!order) return;
    try {
      await api.deleteOrder(order.id);
      toast(t('recordDeleted'));
      navigate('/orders', { replace: true });
    } catch (err) {
      setConfirming(false);
      toast(t('couldNotDelete'), 'error');
    }
  }

  return (
    <Screen
      title={order?.code || t('record')}
      back
      action={
        order && (
          <button className="icon-btn" onClick={() => setConfirming(true)} aria-label={t('deleteRecord')}>
            <IconTrash />
          </button>
        )
      }
    >
      {error && <div className="alert error">{error}</div>}
      {!order && !error && <Skeleton height={90} count={3} />}

      {order && (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{customer?.name || 'Customer'}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
                  {shortDate(order.date)} · {customer ? t(customerTypeKey(customer.type)) : '—'}
                </div>
              </div>
              <span className={`pill ${order.type === 'return' ? 'return' : ''}`}>{t(order.type === 'return' ? 'return' : 'order')}</span>
            </div>
            {customer?.address && (
              <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>{customer.address}</div>
            )}
          </div>

          <div className="section-title">{t('products')}</div>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('product')}</th>
                  <th className="num">{t('qty')}</th>
                  <th className="num">{t('bonusShort')}</th>
                  <th className="num">{t('price')}</th>
                  <th className="num">{t('discount')}</th>
                  <th className="num">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => {
                  const product = products.find((p) => p.id === line.productId);
                  return (
                    <tr key={line.productId}>
                      <td>{product?.name || `#${line.productId}`}</td>
                      <td className="num">{line.qty}</td>
                      <td className="num">{line.bonus || '—'}</td>
                      <td className="num">{line.price}</td>
                      <td className="num">{line.discount ? `${line.discount}%` : '—'}</td>
                      <td className="num">
                        {(line.qty * line.price * (1 - line.discount / 100)).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {order.note && (
            <>
              <div className="section-title">{t('note')}</div>
              <div className="card">{order.note}</div>
            </>
          )}

          {order.signature && (
            <>
              <div className="section-title">
                <span><IconPen size={13} /> {t('signature')}</span>
              </div>
              <div className="card">
                <img className="sig-preview" src={order.signature} alt={t('customerSignature')} />
                {order.signedBy && (
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{t('signedByName', { name: order.signedBy })}</div>
                )}
              </div>
            </>
          )}

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted">{t('total')}</span>
            <strong style={{ fontSize: 21 }}>{money(order.total, user?.currency)}</strong>
          </div>

          {confirming && (
            <ConfirmSheet
              title={t('deleteThisRecord')}
              message={t('deleteRecordText')}
              onConfirm={destroy}
              onCancel={() => setConfirming(false)}
            />
          )}
        </>
      )}
    </Screen>
  );
}
