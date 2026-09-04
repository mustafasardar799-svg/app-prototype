import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  api, type Company, type Customer, type Product, type SalesReport, type User, type Zone,
} from '../lib/api';
import { useAuth, isManagerial } from '../lib/auth';
import { daysAgo, money, shortDate, today } from '../lib/format';
import { Empty, Screen, Spinner } from '../components/Layout';
import { IconSearch } from '../components/Icons';

const customerTypes = ['all', 'pharmacy', 'doctor', 'hospital', 'store'];

export default function Report() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({
    // The team screen deep-links here with a staff member already chosen.
    userId: params.get('userId') || 'all',
    orderType: 'both',
    customerType: 'all',
    companyId: 'all',
    zoneId: 'all',
    customerId: 'all',
    reportType: 'product' as 'product' | 'order',
    productId: 'all',
    from: daysAgo(30),
    to: today(),
  });

  const [staff, setStaff] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      isManagerial(user) ? api.staff() : Promise.resolve([]),
      api.companies(), api.zones(), api.customers(), api.products(),
    ])
      .then(([loadedStaff, loadedCompanies, loadedZones, loadedCustomers, loadedProducts]) => {
        setStaff(loadedStaff);
        setCompanies(loadedCompanies);
        setZones(loadedZones);
        setCustomers(loadedCustomers);
        setProducts(loadedProducts);
      })
      .catch((err) => setError(err.message));
  }, [user]);

  const search = async (override?: Partial<typeof filters>) => {
    const query = { ...filters, ...override };
    setLoading(true);
    setError('');
    try {
      setReport(await api.salesReport(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the report');
    } finally {
      setLoading(false);
    }
  };

  // Show something useful on first open rather than an empty screen.
  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key: keyof typeof filters) => (
    event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => setFilters((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <Screen title="Sales Report" back>
      <div className="card">
        {isManagerial(user) && (
          <Select label="Staff" value={filters.userId} onChange={set('userId')}
            options={[{ value: 'all', label: 'All staff' }, ...staff.map((s) => ({ value: String(s.id), label: s.name }))]}
          />
        )}

        <div className="field-row">
          <Select label="Order Type" value={filters.orderType} onChange={set('orderType')}
            options={[
              { value: 'both', label: 'Both' },
              { value: 'order', label: 'Order' },
              { value: 'return', label: 'Return' },
            ]}
          />
          <Select label="Customer Type" value={filters.customerType} onChange={set('customerType')}
            options={customerTypes.map((type) => ({ value: type, label: type === 'all' ? 'All' : type }))}
          />
        </div>

        <Select label="Companies" value={filters.companyId} onChange={set('companyId')}
          options={[{ value: 'all', label: 'All companies' }, ...companies.map((c) => ({ value: String(c.id), label: c.name }))]}
        />
        <Select label="Zone" value={filters.zoneId} onChange={set('zoneId')}
          options={[{ value: 'all', label: 'All zones' }, ...zones.map((z) => ({ value: String(z.id), label: z.name }))]}
        />
        <Select label="Customers" value={filters.customerId} onChange={set('customerId')}
          options={[{ value: 'all', label: 'All customers' }, ...customers.map((c) => ({ value: String(c.id), label: c.name }))]}
        />

        <div className="field">
          <label>Report Type</label>
          <div className="toggle">
            <button
              type="button" className={filters.reportType === 'product' ? 'on' : ''}
              onClick={() => setFilters((prev) => ({ ...prev, reportType: 'product' }))}
            >
              Product
            </button>
            <button
              type="button" className={filters.reportType === 'order' ? 'on' : ''}
              onClick={() => setFilters((prev) => ({ ...prev, reportType: 'order' }))}
            >
              Order
            </button>
          </div>
        </div>

        <Select label="Products" value={filters.productId} onChange={set('productId')}
          options={[{ value: 'all', label: 'All products' }, ...products.map((p) => ({ value: String(p.id), label: p.name }))]}
        />

        <div className="field-row">
          <div className="field">
            <label htmlFor="from">First Date</label>
            <input id="from" type="date" className="control" value={filters.from} onChange={set('from')} />
          </div>
          <div className="field">
            <label htmlFor="to">Last Date</label>
            <input id="to" type="date" className="control" value={filters.to} onChange={set('to')} />
          </div>
        </div>

        <button className="btn" onClick={() => search()} disabled={loading}>
          <IconSearch size={18} /> {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <div className="alert error" style={{ marginTop: 14 }}>{error}</div>}
      {loading && <Spinner />}

      {report && !loading && (
        <>
          <div className="section-title">Summary</div>
          <div className="kpis">
            <Kpi label="Net sales" value={money(report.summary.netTotal, user?.currency)} />
            <Kpi label="Gross sales" value={money(report.summary.salesTotal, user?.currency)} />
            <Kpi label="Returns" value={money(report.summary.returnsTotal, user?.currency)} />
            <Kpi label="Orders / customers" value={`${report.summary.orders} / ${report.summary.customers}`} />
          </div>

          <div className="section-title">
            {report.reportType === 'product' ? 'By product' : 'By order'}
          </div>

          {report.rows.length === 0 ? (
            <Empty text="No sales match these filters." />
          ) : (
            <div className="card table-wrap">
              {report.reportType === 'product' ? (
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="num">Qty</th>
                      <th className="num">Bonus</th>
                      <th className="num">Ret.</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.productId as number}>
                        <td>
                          {row.product}
                          <div className="muted" style={{ fontSize: 11.5 }}>{row.company}</div>
                        </td>
                        <td className="num">{row.qty}</td>
                        <td className="num">{row.bonus || '—'}</td>
                        <td className="num">{row.returned || '—'}</td>
                        <td className="num">{Number(row.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.id as number}>
                        <td>
                          {row.code}
                          <div className="muted" style={{ fontSize: 11.5 }}>{row.staff}</div>
                        </td>
                        <td>{row.customer}</td>
                        <td>{shortDate(String(row.date))}</td>
                        <td className="num" style={{ color: row.type === 'return' ? 'var(--danger)' : undefined }}>
                          {row.type === 'return' ? '-' : ''}
                          {Number(row.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </Screen>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select className="control" value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
