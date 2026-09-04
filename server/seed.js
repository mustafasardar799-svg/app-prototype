import { db, save, isEmpty } from './db.js';
import { hashPassword } from './auth.js';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export function seedIfEmpty() {
  if (!isEmpty()) return;
  const state = db();
  const password = hashPassword(process.env.DEMO_PASSWORD || 'demo1234');

  state.zones = [
    { id: 1, name: 'Erbil - Center' },
    { id: 2, name: 'Erbil - North' },
    { id: 3, name: 'Sulaymaniyah' },
    { id: 4, name: 'Duhok' },
  ];

  state.companies = [
    { id: 1, name: 'EliaVit Pharma' },
    { id: 2, name: 'NovaMed' },
    { id: 3, name: 'Zenith Labs' },
  ];

  state.products = [
    { id: 1, name: 'Amoxivit 500mg Caps', companyId: 1, price: 8.5, unit: 'Box (20)' },
    { id: 2, name: 'Amoxivit 250mg Syrup', companyId: 1, price: 5.25, unit: 'Bottle' },
    { id: 3, name: 'Vitamin D3 5000 IU', companyId: 1, price: 12.0, unit: 'Box (30)' },
    { id: 4, name: 'Ferrovit Iron + Folic', companyId: 1, price: 9.75, unit: 'Box (30)' },
    { id: 5, name: 'Paranova 500mg Tabs', companyId: 2, price: 3.4, unit: 'Box (24)' },
    { id: 6, name: 'Nova Cough Syrup', companyId: 2, price: 6.9, unit: 'Bottle' },
    { id: 7, name: 'Omeznith 20mg Caps', companyId: 3, price: 11.2, unit: 'Box (14)' },
    { id: 8, name: 'Zenith Calcium D', companyId: 3, price: 7.8, unit: 'Box (30)' },
  ];

  state.users = [
    {
      id: 1, username: 'manager', password, name: 'Dashty Salih',
      role: 'manager', title: 'General Sales Manager', phone: '7507777777',
      currency: 'IQD', supervisorId: null, zoneId: null,
    },
    {
      id: 2, username: 'leader', password, name: 'Rawa Ahmed',
      role: 'supervisor', title: 'Team Leader', phone: '7501111111',
      currency: 'IQD', supervisorId: 1, zoneId: 1,
    },
    {
      id: 3, username: 'rep', password, name: 'Aland Kareem',
      role: 'rep', title: 'Medical Representative', phone: '7502222222',
      currency: 'IQD', supervisorId: 2, zoneId: 1,
    },
    {
      id: 4, username: 'rep2', password, name: 'Sara Jamal',
      role: 'rep', title: 'Medical Representative', phone: '7503333333',
      currency: 'IQD', supervisorId: 2, zoneId: 2,
    },
    {
      id: 5, username: 'rep3', password, name: 'Hemin Omar',
      role: 'rep', title: 'Medical Representative', phone: '7504444444',
      currency: 'IQD', supervisorId: 1, zoneId: 3,
    },
  ];

  state.customers = [
    { id: 1, name: 'Zanko Pharmacy', type: 'pharmacy', zoneId: 1, ownerId: 3, phone: '7509000001', address: '100m St, Erbil' },
    { id: 2, name: 'Roj Pharmacy', type: 'pharmacy', zoneId: 1, ownerId: 3, phone: '7509000002', address: 'Bakhtiari, Erbil' },
    { id: 3, name: 'Dr. Shwan Clinic', type: 'doctor', zoneId: 1, ownerId: 3, phone: '7509000003', address: 'Italian Village' },
    { id: 4, name: 'Nishtiman Hospital', type: 'hospital', zoneId: 2, ownerId: 4, phone: '7509000004', address: 'Gulan St' },
    { id: 5, name: 'Awat Pharmacy', type: 'pharmacy', zoneId: 2, ownerId: 4, phone: '7509000005', address: 'Ainkawa' },
    { id: 6, name: 'Shar Medical Store', type: 'store', zoneId: 3, ownerId: 5, phone: '7509000006', address: 'Salim St, Sulaymaniyah' },
    { id: 7, name: 'Kurdistan Pharmacy', type: 'pharmacy', zoneId: 3, ownerId: 5, phone: '7509000007', address: 'Bakrajo' },
  ];

  const line = (productId, qty, bonus = 0, discount = 0) => {
    const product = state.products.find((p) => p.id === productId);
    return { productId, qty, bonus, price: product.price, discount };
  };
  const lineTotal = (l) => l.qty * l.price * (1 - l.discount / 100);
  const makeOrder = (id, userId, customerId, type, date, lines, status = 'confirmed') => ({
    id, code: `${type === 'return' ? 'RET' : 'ORD'}-${String(id).padStart(4, '0')}`,
    userId, customerId, type, date, lines,
    total: Number(lines.reduce((sum, l) => sum + lineTotal(l), 0).toFixed(2)),
    status, note: '',
  });

  state.orders = [
    makeOrder(1, 3, 1, 'order', daysAgo(1), [line(1, 10, 1), line(3, 6)]),
    makeOrder(2, 3, 2, 'order', daysAgo(2), [line(2, 12), line(5, 20, 2, 5)]),
    makeOrder(3, 3, 3, 'order', daysAgo(4), [line(4, 8), line(7, 5)]),
    makeOrder(4, 4, 4, 'order', daysAgo(1), [line(7, 15), line(8, 10, 1)]),
    makeOrder(5, 4, 5, 'order', daysAgo(3), [line(1, 25, 3, 10)]),
    makeOrder(6, 5, 6, 'order', daysAgo(2), [line(6, 18), line(5, 30)]),
    makeOrder(7, 5, 7, 'order', daysAgo(5), [line(3, 12), line(4, 14)]),
    makeOrder(8, 3, 1, 'return', daysAgo(3), [line(1, 2)]),
    makeOrder(9, 4, 5, 'return', daysAgo(6), [line(8, 3)]),
    makeOrder(10, 3, 2, 'order', daysAgo(0), [line(3, 9), line(8, 7)], 'pending'),
  ];

  state.expenses = [
    { id: 1, userId: 3, date: daysAgo(1), category: 'Fuel', amount: 25, note: 'Erbil center route' },
    { id: 2, userId: 3, date: daysAgo(3), category: 'Meal', amount: 12, note: 'Client lunch' },
    { id: 3, userId: 4, date: daysAgo(2), category: 'Fuel', amount: 30, note: '' },
    { id: 4, userId: 5, date: daysAgo(2), category: 'Hotel', amount: 60, note: 'Sulaymaniyah trip' },
  ];

  state.collections = [
    { id: 1, userId: 3, customerId: 1, date: daysAgo(1), amount: 150, invoiceNo: 'INV-2201', note: '' },
    { id: 2, userId: 3, customerId: 2, date: daysAgo(4), amount: 220, invoiceNo: 'INV-2188', note: 'Partial' },
    { id: 3, userId: 4, customerId: 4, date: daysAgo(2), amount: 480, invoiceNo: 'INV-2190', note: '' },
  ];

  state.visits = [
    { id: 1, userId: 3, customerId: 1, date: daysAgo(0), status: 'planned', note: 'Present new D3 pack' },
    { id: 2, userId: 3, customerId: 3, date: daysAgo(0), status: 'planned', note: '' },
    { id: 3, userId: 3, customerId: 2, date: daysAgo(1), status: 'done', note: 'Reordered syrup' },
    { id: 4, userId: 4, customerId: 5, date: daysAgo(0), status: 'planned', note: '' },
    { id: 5, userId: 5, customerId: 6, date: daysAgo(1), status: 'done', note: 'Stock check' },
  ];

  state.calls = [
    { id: 1, userId: 3, customerId: 1, date: daysAgo(1), type: 'follow-up', minutes: 6, note: 'Confirmed delivery' },
    { id: 2, userId: 4, customerId: 4, date: daysAgo(2), type: 'order', minutes: 11, note: '' },
  ];

  state.promotions = [
    { id: 1, title: 'Buy 10 + 1 free — Amoxivit 500mg', companyId: 1, from: daysAgo(10), to: daysAgo(-20), description: 'Applies to pharmacies only.' },
    { id: 2, title: '10% off Vitamin D3 cartons', companyId: 1, from: daysAgo(5), to: daysAgo(-10), description: 'Minimum 5 boxes per invoice.' },
    { id: 3, title: 'Omeznith launch bundle', companyId: 3, from: daysAgo(2), to: daysAgo(-25), description: 'Free display stand with 20 boxes.' },
  ];

  save();
}
