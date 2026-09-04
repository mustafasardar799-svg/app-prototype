export type Role = 'rep' | 'supervisor' | 'manager';

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  title: string;
  phone: string;
  currency: string;
  supervisorId: number | null;
  zoneId: number | null;
  avatar?: string;
}

export interface Zone { id: number; name: string }
export interface Company { id: number; name: string }
export interface Product { id: number; name: string; companyId: number; price: number; unit: string }
export interface Customer {
  id: number; name: string; type: string; zoneId: number | null;
  ownerId: number; phone: string; address: string;
}
export interface OrderLine { productId: number; qty: number; bonus: number; price: number; discount: number }
export interface Order {
  id: number; code: string; userId: number; customerId: number;
  type: 'order' | 'return'; date: string; lines: OrderLine[];
  total: number; status: string; note: string;
}
export interface Expense { id: number; userId: number; date: string; category: string; amount: number; note: string }
export interface Collection {
  id: number; userId: number; customerId: number; date: string;
  amount: number; invoiceNo: string; note: string;
}
export interface Visit { id: number; userId: number; customerId: number; date: string; status: string; note: string }
export interface Call {
  id: number; userId: number; customerId: number; date: string;
  type: string; minutes: number; note: string;
}
export interface Promotion {
  id: number; title: string; companyId: number; from: string; to: string; description: string;
}

export interface Dashboard {
  month: string; currency: string;
  salesTotal: number; returnsTotal: number; netTotal: number;
  collectedTotal: number; expenseTotal: number;
  counts: Record<'orders' | 'returns' | 'expenses' | 'collections' | 'calls' | 'customers', number>;
  todayVisits: (Visit & { customer: string })[];
  recentOrders: { id: number; code: string; date: string; type: string; total: number; customer: string; staff: string }[];
}

export interface SalesReport {
  reportType: 'product' | 'order';
  summary: {
    orders: number; returns: number; salesTotal: number;
    returnsTotal: number; netTotal: number; customers: number;
  };
  rows: Record<string, string | number>[];
}

export interface TeamMember extends User {
  zone: string; orders: number; returns: number;
  salesTotal: number; returnsTotal: number; netTotal: number;
  collected: number; expenses: number; visits: number; calls: number; lastActivity: string;
}

const TOKEN_KEY = 'eliavit.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    clearToken();
    // Let the shell fall back to the login screen rather than showing a broken page.
    if (!location.pathname.startsWith('/login')) location.assign('/login');
    throw new ApiError('Session expired, please sign in again', 401);
  }
  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error || 'Request failed', response.status);
  return payload as T;
}

const query = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

type Params = Record<string, string | number | undefined | null>;

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (body: { username: string; password: string; name: string; phone?: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request<User>('/me'),
  updateMe: (body: Partial<User>) => request<User>('/me', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: true }>('/me/password', { method: 'PUT', body: JSON.stringify(body) }),
  deleteMe: () => request<void>('/me', { method: 'DELETE' }),

  zones: () => request<Zone[]>('/zones'),
  companies: () => request<Company[]>('/companies'),
  products: (params: Params = {}) => request<Product[]>(`/products${query(params)}`),
  promotions: () => request<Promotion[]>('/promotions'),
  staff: () => request<User[]>('/staff'),

  customers: (params: Params = {}) => request<Customer[]>(`/customers${query(params)}`),
  createCustomer: (body: Partial<Customer>) =>
    request<Customer>('/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id: number, body: Partial<Customer>) =>
    request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCustomer: (id: number) => request<void>(`/customers/${id}`, { method: 'DELETE' }),

  orders: (params: Params = {}) => request<Order[]>(`/orders${query(params)}`),
  order: (id: number) => request<Order>(`/orders/${id}`),
  createOrder: (body: unknown) => request<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }),
  deleteOrder: (id: number) => request<void>(`/orders/${id}`, { method: 'DELETE' }),

  expenses: (params: Params = {}) => request<Expense[]>(`/expenses${query(params)}`),
  createExpense: (body: unknown) => request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(body) }),
  deleteExpense: (id: number) => request<void>(`/expenses/${id}`, { method: 'DELETE' }),

  collections: (params: Params = {}) => request<Collection[]>(`/collections${query(params)}`),
  createCollection: (body: unknown) =>
    request<Collection>('/collections', { method: 'POST', body: JSON.stringify(body) }),
  deleteCollection: (id: number) => request<void>(`/collections/${id}`, { method: 'DELETE' }),

  visits: (params: Params = {}) => request<Visit[]>(`/visits${query(params)}`),
  createVisit: (body: unknown) => request<Visit>('/visits', { method: 'POST', body: JSON.stringify(body) }),
  updateVisit: (id: number, body: unknown) =>
    request<Visit>(`/visits/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVisit: (id: number) => request<void>(`/visits/${id}`, { method: 'DELETE' }),

  calls: (params: Params = {}) => request<Call[]>(`/calls${query(params)}`),
  createCall: (body: unknown) => request<Call>('/calls', { method: 'POST', body: JSON.stringify(body) }),
  deleteCall: (id: number) => request<void>(`/calls/${id}`, { method: 'DELETE' }),

  dashboard: () => request<Dashboard>('/dashboard'),
  salesReport: (params: Params) => request<SalesReport>(`/sales${query(params)}`),
  team: (params: Params = {}) => request<{ from: string; to: string; members: TeamMember[] }>(`/team${query(params)}`),
};
