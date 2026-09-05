import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  api, type Company, type Customer, type Product, type SalesReport, type TrendPoint,
  type User, type Zone,
} from '../lib/api';
import { useAuth, isManagerial } from '../lib/auth';
import { daysAgo, money, monthLabel, shortDate, today } from '../lib/format';
import { customerTypeKey, useT, useI18n } from '../lib/i18n';
import { Empty, Screen, Skeleton } from '../components/Layout';
import { ComparisonBars, RankedBars, TrendChart } from '../components/Charts';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { shareCsv, shareXlsx } from '../lib/export';
import { IconChart, IconSearch, IconShare, IconTable } from '../components/Icons';

const customerTypes = ['all', 'pharmacy', 'doctor', 'hospital', 'store'];

export default function Report() {
  const { user } = useAuth();
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
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
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [view, setView] = useState<'charts' | 'table'>('charts');
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      isManagerial(user) ? api.staff() : Promise.resolve([]),
      api.companies(), api.zones(), api.customers(), api.products(), api.trend(6),
    ])
      .then(([loadedStaff, loadedCompanies, loadedZones, loadedCustomers, loadedProducts, loadedTrend]) => {
        setStaff(loadedStaff);
        setCompanies(loadedCompanies);
        setZones(loadedZones);
        setCustomers(loadedCustomers);
        setProducts(loadedProducts);
        setTrend(loadedTrend);
      })
      .catch((err) => setError(err.message));
  }, [user]);

  const search = async (override?: Partial<typeof filters>) => {
    const query = { ...filters, ...override };
    setLoading(true);
    setError('');
    try {
      setReport(await api.salesReport(query));
    } catch {
      setError(t('couldNotLoadReport'));
    } finally {
      setLoading(false);
    }
  };

  // Show something useful on first open rather than an empty screen.
  useEffect(() => {
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key: keyof typeof filters) => (
    event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => setFilters((prev) => ({ ...prev, [key]: event.target.value }));

  /* ----------------------------- chart data ----------------------------- */

  const zoneName = useMemo(() => new Map(zones.map((z) => [z.id, z.name])), [zones]);
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  /** The report returns product rows or order rows; both feed the breakdowns. */
  const breakdowns = useMemo(() => {
    if (!report) return { products: [], zones: [], types: [] };

    const productRows =
      report.reportType === 'product'
        ? report.rows.map((row) => ({
            label: String(row.product),
            sub: String(row.company),
            value: Number(row.total),
          }))
        : [];

    // Zone and customer-type splits need the order rows, which carry a customer.
    const byZone = new Map<string, number>();
    const byType = new Map<string, number>();
    if (report.reportType === 'order') {
      for (const row of report.rows) {
        const customer = [...customerById.values()].find((c) => c.name === row.customer);
        const value = Number(row.total) * (row.type === 'return' ? -1 : 1);
        const zone = customer?.zoneId ? zoneName.get(customer.zoneId) || t('none') : t('none');
        const type = customer ? t(customerTypeKey(customer.type)) : t('none');
        byZone.set(zone, (byZone.get(zone) || 0) + value);
        byType.set(type, (byType.get(type) || 0) + value);
      }
    }

    return {
      products: productRows,
      zones: [...byZone].map(([label, value]) => ({ label, value })),
      types: [...byType].map(([label, value]) => ({ label, value })),
    };
  }, [report, customerById, zoneName, t]);

  /* ------------------------------- export ------------------------------- */

  /** The exact rows on screen, as a table the spreadsheet can total. */
  function exportRows() {
    if (!report) return { header: [], body: [] as (string | number)[][] };
    const header =
      report.reportType === 'product'
        ? [t('product'), t('company'), t('qty'), t('bonusShort'), t('returnedShort'), t('total')]
        : [t('code'), t('staff'), t('customer'), t('date'), t('type'), t('columnItems'), t('total')];
    const body = report.rows.map((row) =>
      report.reportType === 'product'
        ? [row.product, row.company, row.qty, row.bonus, row.returned, row.total]
        : [row.code, row.staff, row.customer, row.date, row.type, row.items, row.total],
    ) as (string | number)[][];
    return { header, body };
  }

  function summaryRows(): (string | number)[][] {
    if (!report) return [];
    const staffName =
      filters.userId === 'all'
        ? t('allStaff')
        : staff.find((s) => String(s.id) === filters.userId)?.name || filters.userId;
    return [
      [t('summary'), ''],
      [t('firstDate'), filters.from],
      [t('lastDate'), filters.to],
      [t('staff'), staffName],
      [t('orderType'), filters.orderType],
      [t('customerType'), filters.customerType],
      [t('reportType'), filters.reportType],
      ['', ''],
      [t('netSales'), report.summary.netTotal],
      [t('grossSales'), report.summary.salesTotal],
      [t('returns'), report.summary.returnsTotal],
      [t('orders'), report.summary.orders],
      [t('customers'), report.summary.customers],
    ];
  }

  const fileStem = `eliavit-${filters.reportType}-${filters.from}-${filters.to}`;

  async function doExport(kind: 'xlsx' | 'csv') {
    if (!report || report.rows.length === 0) {
      toast(t('noDataToExport'), 'error');
      return;
    }
    setExporting(true);
    try {
      const { header, body } = exportRows();
      if (kind === 'xlsx') {
        const result = await shareXlsx(`${fileStem}.xlsx`, [
          { name: t('sheetRows'), rows: [header, ...body] },
          { name: t('sheetSummary'), rows: summaryRows() },
        ]);
        if (result !== 'cancelled') {
          toast(result === 'shared' ? t('excelShared') : t('excelDownloaded'));
        }
      } else {
        const result = await shareCsv(`${fileStem}.csv`, [header, ...body, [], ...summaryRows()]);
        if (result !== 'cancelled') {
          toast(result === 'shared' ? t('csvShared') : t('csvDownloaded'));
        }
      }
    } catch {
      toast(t('couldNotSave'), 'error');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  }

  const [exportOpen, setExportOpen] = useState(false);
  const hasRows = !!report && report.rows.length > 0;

  return (
    <Screen
      title={t('salesReport')}
      back
      action={
        hasRows ? (
          <button className="icon-btn" onClick={() => setExportOpen(true)} aria-label={t('export')}>
            <IconShare />
          </button>
        ) : undefined
      }
    >
      {trend.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="section-title" style={{ margin: '0 0 6px' }}>{t('netSalesLastSixMonths')}</div>
          <TrendChart data={trend} currency={user?.currency} />
        </div>
      )}

      <div className="card">
        {isManagerial(user) && (
          <Select label={t('staff')} value={filters.userId} onChange={set('userId')}
            options={[{ value: 'all', label: t('allStaff') }, ...staff.map((s) => ({ value: String(s.id), label: s.name }))]}
          />
        )}

        <div className="field-row">
          <Select label={t('orderType')} value={filters.orderType} onChange={set('orderType')}
            options={[
              { value: 'both', label: t('both') },
              { value: 'order', label: t('order') },
              { value: 'return', label: t('return') },
            ]}
          />
          <Select label={t('customerType')} value={filters.customerType} onChange={set('customerType')}
            options={customerTypes.map((type) => ({
              value: type,
              label: type === 'all' ? t('all') : t(customerTypeKey(type)),
            }))}
          />
        </div>

        <Select label={t('companies')} value={filters.companyId} onChange={set('companyId')}
          options={[{ value: 'all', label: t('allCompanies') }, ...companies.map((c) => ({ value: String(c.id), label: c.name }))]}
        />
        <Select label={t('zone')} value={filters.zoneId} onChange={set('zoneId')}
          options={[{ value: 'all', label: t('allZones') }, ...zones.map((z) => ({ value: String(z.id), label: z.name }))]}
        />
        <Select label={t('customers')} value={filters.customerId} onChange={set('customerId')}
          options={[{ value: 'all', label: t('allCustomers') }, ...customers.map((c) => ({ value: String(c.id), label: c.name }))]}
        />

        <div className="field">
          <label>{t('reportType')}</label>
          <div className="toggle">
            <button
              type="button" className={filters.reportType === 'product' ? 'on' : ''}
              onClick={() => setFilters((prev) => ({ ...prev, reportType: 'product' }))}
            >
              {t('byProduct')}
            </button>
            <button
              type="button" className={filters.reportType === 'order' ? 'on' : ''}
              onClick={() => setFilters((prev) => ({ ...prev, reportType: 'order' }))}
            >
              {t('byOrder')}
            </button>
          </div>
        </div>

        <Select label={t('products')} value={filters.productId} onChange={set('productId')}
          options={[{ value: 'all', label: t('allProducts') }, ...products.map((p) => ({ value: String(p.id), label: p.name }))]}
        />

        <div className="field-row">
          <div className="field">
            <label htmlFor="from">{t('firstDate')}</label>
            <input id="from" type="date" className="control" value={filters.from} onChange={set('from')} />
          </div>
          <div className="field">
            <label htmlFor="to">{t('lastDate')}</label>
            <input id="to" type="date" className="control" value={filters.to} onChange={set('to')} />
          </div>
        </div>

        <button className="btn" onClick={() => search()} disabled={loading}>
          <IconSearch size={18} /> {loading ? t('searching') : t('search')}
        </button>
      </div>

      {error && <div className="alert error" style={{ marginTop: 14 }}>{error}</div>}
      {loading && <Skeleton height={80} count={3} />}

      {report && !loading && (
        <>
          <div className="section-title">{t('summary')}</div>
          <div className="kpis">
            <Kpi label={t('netSales')} value={money(report.summary.netTotal, user?.currency)} />
            <Kpi label={t('grossSales')} value={money(report.summary.salesTotal, user?.currency)} />
            <Kpi label={t('returns')} value={money(report.summary.returnsTotal, user?.currency)} />
            <Kpi label={t('ordersCustomers')} value={`${report.summary.orders} / ${report.summary.customers}`} />
          </div>

          {!hasRows ? (
            <Empty
              icon={<IconChart size={26} />}
              headline={t('nothingMatches')}
              text={t('nothingMatchesText')}
            />
          ) : (
            <>
              <div className="section-title" style={{ marginBottom: 8 }}>
                {report.reportType === 'product' ? t('productBreakdown') : t('orderBreakdown')}
              </div>
              <div className="toggle" style={{ marginBottom: 12 }}>
                <button className={view === 'charts' ? 'on' : ''} onClick={() => setView('charts')}>
                  <IconChart size={15} /> {t('charts')}
                </button>
                <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>
                  <IconTable size={15} /> {t('table')}
                </button>
              </div>

              {view === 'charts' ? (
                <>
                  <div className="card">
                    <div className="section-title" style={{ margin: '0 0 10px' }}>{t('ordersVsReturns')}</div>
                    <ComparisonBars
                      sales={report.summary.salesTotal}
                      returns={report.summary.returnsTotal}
                      currency={user?.currency}
                    />
                  </div>

                  {report.reportType === 'product' && breakdowns.products.length > 0 && (
                    <div className="card">
                      <div className="section-title" style={{ margin: '0 0 10px' }}>{t('topProducts')}</div>
                      <RankedBars data={breakdowns.products} currency={user?.currency} />
                    </div>
                  )}

                  {report.reportType === 'order' && breakdowns.zones.length > 0 && (
                    <div className="card">
                      <div className="section-title" style={{ margin: '0 0 10px' }}>{t('salesByZone')}</div>
                      <RankedBars data={breakdowns.zones} currency={user?.currency} />
                    </div>
                  )}

                  {report.reportType === 'order' && breakdowns.types.length > 0 && (
                    <div className="card">
                      <div className="section-title" style={{ margin: '0 0 10px' }}>{t('salesByCustomerType')}</div>
                      <RankedBars data={breakdowns.types} currency={user?.currency} />
                    </div>
                  )}
                </>
              ) : (
                <div className="card table-wrap">
                  {report.reportType === 'product' ? (
                    <table>
                      <thead>
                        <tr>
                          <th>{t('product')}</th>
                          <th className="num">{t('qty')}</th>
                          <th className="num">{t('bonusShort')}</th>
                          <th className="num">{t('returnedShort')}</th>
                          <th className="num">{t('total')}</th>
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
                          <th>{t('code')}</th>
                          <th>{t('customer')}</th>
                          <th>{t('date')}</th>
                          <th className="num">{t('total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.rows.map((row) => (
                          <tr key={row.id as number}>
                            <td>
                              <span className="ltr-text">{row.code}</span>
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

              <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setExportOpen(true)}>
                <IconShare size={18} /> {t('export')}
              </button>
            </>
          )}
        </>
      )}

      {exportOpen && (
        <Sheet title={t('exportTitle')} onClose={() => setExportOpen(false)}>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>{t('exportHint')}</p>
          <p className="muted" style={{ fontSize: 12.5 }}>
            {monthLabel(filters.from.slice(0, 7))} — {shortDate(filters.from)} → {shortDate(filters.to)}
            {' · '}
            {report ? report.rows.length : 0} {report?.rows.length === 1 ? t('line') : t('lines')}
          </p>
          <button className="btn" disabled={exporting} onClick={() => doExport('xlsx')}>
            {exporting ? t('working') : t('exportExcel')}
          </button>
          <button
            className="btn ghost"
            style={{ marginTop: 10 }}
            disabled={exporting}
            onClick={() => doExport('csv')}
          >
            {t('exportCsv')}
          </button>
          <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setExportOpen(false)}>
            {t('cancel')}
          </button>
          <p className="muted" style={{ fontSize: 11.5, marginBottom: 0 }} lang={locale}>
            {fileStem}
          </p>
        </Sheet>
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
