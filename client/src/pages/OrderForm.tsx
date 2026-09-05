import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, OfflineQueuedError, type Company, type Customer, type Product } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, today } from '../lib/format';
import { customerTypeKey, useT } from '../lib/i18n';
import { Screen, Skeleton } from '../components/Layout';
import { SignaturePad } from '../components/SignaturePad';
import { useToast } from '../components/Toast';
import { IconPen, IconPlus, IconTrash } from '../components/Icons';

interface Draft {
  productId: number;
  qty: number;
  bonus: number;
  price: number;
  discount: number;
}

export default function OrderForm() {
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const type = params.get('type') === 'return' ? 'return' : 'order';
  const bonusMode = params.get('bonus') === '1';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [lines, setLines] = useState<Draft[]>([]);
  const [picking, setPicking] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [signature, setSignature] = useState('');
  const [signedBy, setSignedBy] = useState('');

  useEffect(() => {
    Promise.all([api.customers(), api.products(), api.companies()])
      .then(([loadedCustomers, loadedProducts, loadedCompanies]) => {
        setCustomers(loadedCustomers);
        setProducts(loadedProducts);
        setCompanies(loadedCompanies);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const selectable = companyId
    ? products.filter((p) => p.companyId === Number(companyId))
    : products;

  const total = lines.reduce((sum, line) => sum + line.qty * line.price * (1 - line.discount / 100), 0);
  const bonusUnits = lines.reduce((sum, line) => sum + line.bonus, 0);

  function addLine(productId: number) {
    const product = productById.get(productId);
    if (!product) return;
    setLines((prev) =>
      prev.some((line) => line.productId === productId)
        ? prev.map((line) => (line.productId === productId ? { ...line, qty: line.qty + 1 } : line))
        : [...prev, { productId, qty: 1, bonus: bonusMode ? 1 : 0, price: product.price, discount: 0 }],
    );
    setPicking('');
  }

  const patchLine = (productId: number, patch: Partial<Draft>) =>
    setLines((prev) => prev.map((line) => (line.productId === productId ? { ...line, ...patch } : line)));

  const removeLine = (productId: number) =>
    setLines((prev) => prev.filter((line) => line.productId !== productId));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!customerId) return setError(t('chooseCustomerFirst'));
    if (lines.length === 0) return setError(t('addAtLeastOneProduct'));

    setSaving(true);
    try {
      const saved = await api.createOrder({
        customerId: Number(customerId), type, date, note, lines, signature, signedBy,
      });
      toast(type === 'return' ? t('returnSaved') : t('orderSaved'));
      navigate(`/orders/${saved.id}`, { replace: true });
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        // Queued on the phone — the rep can carry on to the next customer.
        toast(t('savedOnPhone', { label: t(err.labelKey as Parameters<typeof t>[0]) }), 'info');
        navigate('/orders', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : t('couldNotSave'));
      setSaving(false);
    }
  }

  const title = type === 'return'
    ? t('newReturnTitle')
    : bonusMode
      ? t('newBonusOrderTitle')
      : t('newOrderTitle');

  return (
    <Screen title={title} back>
      {loading ? (
        <Skeleton height={120} count={3} />
      ) : (
        <form onSubmit={submit}>
          {error && <div className="alert error">{error}</div>}

          <div className="card">
            <div className="field">
              <label htmlFor="customer">{t('customer')}</label>
              <select
                id="customer" className="control" value={customerId}
                onChange={(event) => setCustomerId(event.target.value)} required
              >
                <option value="">{t('selectCustomer')}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} · {t(customerTypeKey(customer.type))}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="date">{t('date')}</label>
                <input
                  id="date" type="date" className="control" value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="company">{t('company')}</label>
                <select
                  id="company" className="control" value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                >
                  <option value="">{t('all')}</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="section-title">{t('products')}</div>
          <div className="card">
            <div className="field" style={{ marginBottom: lines.length ? 12 : 0 }}>
              <label htmlFor="picker">{t('addProduct')}</label>
              <select
                id="picker" className="control" value={picking}
                onChange={(event) => event.target.value && addLine(Number(event.target.value))}
              >
                <option value="">{t('chooseProduct')}</option>
                {selectable.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {money(product.price, user?.currency)}
                  </option>
                ))}
              </select>
            </div>

            <div className="list" style={{ gap: 8 }}>
              {lines.map((line) => {
                const product = productById.get(line.productId);
                if (!product) return null;
                return (
                  <div key={line.productId} className="line-item" style={{ flexWrap: 'wrap' }}>
                    <div
                      style={{ flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <div className="grow">
                        <div className="name">{product.name}</div>
                        <div className="meta">
                          {product.unit} ·{' '}
                          {money(line.qty * line.price * (1 - line.discount / 100), user?.currency)}
                        </div>
                      </div>
                      <button
                        type="button" className="icon-btn" style={{ color: 'var(--danger)' }}
                        onClick={() => removeLine(line.productId)} aria-label={`Remove ${product.name}`}
                      >
                        <IconTrash size={18} />
                      </button>
                    </div>
                    <NumberBox
                      label={t('qty')} value={line.qty} min={1}
                      onChange={(value) => patchLine(line.productId, { qty: value })}
                    />
                    <NumberBox
                      label={t('bonusShort')} value={line.bonus} min={0}
                      onChange={(value) => patchLine(line.productId, { bonus: value })}
                    />
                    <NumberBox
                      label={t('price')} value={line.price} min={0} step={0.25}
                      onChange={(value) => patchLine(line.productId, { price: value })}
                    />
                    <NumberBox
                      label={t('discount')} value={line.discount} min={0} max={100}
                      onChange={(value) => patchLine(line.productId, { discount: value })}
                    />
                  </div>
                );
              })}
              {lines.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{t('noProductsAdded')}</p>}
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="note">{t('note')}</label>
            <textarea
              id="note" className="control" value={note}
              onChange={(event) => setNote(event.target.value)} placeholder={t('optional')}
            />
          </div>

          <div className="section-title">
            <span><IconPen size={13} /> {t('customerSignature')}</span>
            <span className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>{t('optional')}</span>
          </div>
          <div className="card">
            <SignaturePad onChange={setSignature} />
            {signature && (
              <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label htmlFor="signedBy">{t('signedBy')}</label>
                <input
                  id="signedBy" className="control" value={signedBy}
                  placeholder={t('nameOfSigner')}
                  onChange={(event) => setSignedBy(event.target.value)}
                />
              </div>
            )}
          </div>

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {lines.length} {lines.length === 1 ? t('line') : t('lines')}
                {bonusUnits > 0 ? ` · ${bonusUnits} ${bonusUnits === 1 ? t('bonusUnit') : t('bonusUnits')}` : ''}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{money(total, user?.currency)}</div>
            </div>
            <span className={`pill ${type === 'return' ? 'return' : ''}`}>{t(type === 'return' ? 'return' : 'order')}</span>
          </div>

          <button className="btn" style={{ marginTop: 14 }} disabled={saving}>
            <IconPlus size={18} />{' '}
            {saving ? t('saving') : type === 'return' ? t('saveReturn') : t('saveOrder')}
          </button>
        </form>
      )}
    </Screen>
  );
}

function NumberBox({
  label, value, onChange, min, max, step = 1,
}: {
  label: string; value: number; onChange: (value: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <label style={{ flex: '1 1 68px', minWidth: 68 }}>
      <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 3 }}>{label}</span>
      <input
        type="number" className="control" style={{ padding: '8px 10px', background: '#fff' }}
        value={value} min={min} max={max} step={step} inputMode="decimal"
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  );
}
