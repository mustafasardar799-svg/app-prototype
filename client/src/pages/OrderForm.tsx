import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Company, type Customer, type Product } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, today } from '../lib/format';
import { Screen, Spinner } from '../components/Layout';
import { IconPlus, IconTrash } from '../components/Icons';

interface Draft {
  productId: number;
  qty: number;
  bonus: number;
  price: number;
  discount: number;
}

export default function OrderForm() {
  const { user } = useAuth();
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
    if (!customerId) return setError('Choose a customer first');
    if (lines.length === 0) return setError('Add at least one product');

    setSaving(true);
    try {
      const saved = await api.createOrder({ customerId: Number(customerId), type, date, note, lines });
      navigate(`/orders/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
      setSaving(false);
    }
  }

  const title = type === 'return' ? 'New Return' : bonusMode ? 'New Bonus Order' : 'New Order';

  return (
    <Screen title={title} back>
      {loading ? (
        <Spinner />
      ) : (
        <form onSubmit={submit}>
          {error && <div className="alert error">{error}</div>}

          <div className="card">
            <div className="field">
              <label htmlFor="customer">Customer</label>
              <select
                id="customer" className="control" value={customerId}
                onChange={(event) => setCustomerId(event.target.value)} required
              >
                <option value="">Select customer…</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} · {customer.type}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="date">Date</label>
                <input
                  id="date" type="date" className="control" value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="company">Company</label>
                <select
                  id="company" className="control" value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                >
                  <option value="">All</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="section-title">Products</div>
          <div className="card">
            <div className="field" style={{ marginBottom: lines.length ? 12 : 0 }}>
              <label htmlFor="picker">Add product</label>
              <select
                id="picker" className="control" value={picking}
                onChange={(event) => event.target.value && addLine(Number(event.target.value))}
              >
                <option value="">Choose a product…</option>
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
                      label="Qty" value={line.qty} min={1}
                      onChange={(value) => patchLine(line.productId, { qty: value })}
                    />
                    <NumberBox
                      label="Bonus" value={line.bonus} min={0}
                      onChange={(value) => patchLine(line.productId, { bonus: value })}
                    />
                    <NumberBox
                      label="Price" value={line.price} min={0} step={0.25}
                      onChange={(value) => patchLine(line.productId, { price: value })}
                    />
                    <NumberBox
                      label="Disc %" value={line.discount} min={0} max={100}
                      onChange={(value) => patchLine(line.productId, { discount: value })}
                    />
                  </div>
                );
              })}
              {lines.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 13 }}>No products added yet.</p>}
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="note">Note</label>
            <textarea
              id="note" className="control" value={note}
              onChange={(event) => setNote(event.target.value)} placeholder="Optional"
            />
          </div>

          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {lines.length} line{lines.length === 1 ? '' : 's'}
                {bonusUnits > 0 ? ` · ${bonusUnits} bonus unit${bonusUnits === 1 ? '' : 's'}` : ''}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{money(total, user?.currency)}</div>
            </div>
            <span className={`pill ${type === 'return' ? 'return' : ''}`}>{type}</span>
          </div>

          <button className="btn" style={{ marginTop: 14 }} disabled={saving}>
            <IconPlus size={18} /> {saving ? 'Saving…' : `Save ${type}`}
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
