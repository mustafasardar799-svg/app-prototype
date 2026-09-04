import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth, isManagerial } from './lib/auth';
import { Spinner } from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Orders from './pages/Orders';
import OrderForm from './pages/OrderForm';
import OrderDetail from './pages/OrderDetail';
import Report from './pages/Report';
import Team from './pages/Team';
import Customers from './pages/Customers';
import Profile from './pages/Profile';
import Promotions from './pages/Promotions';
import About from './pages/About';
import { Calls, Collections, Expenses, Visits } from './pages/Records';

function Shell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="phone">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/orders/new" element={<OrderForm />} />
      <Route path="/orders/:id" element={<OrderDetail />} />
      <Route path="/report" element={<Report />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/expenses" element={<Expenses />} />
      <Route path="/collections" element={<Collections />} />
      <Route path="/visits" element={<Visits />} />
      <Route path="/calls" element={<Calls />} />
      <Route path="/promotions" element={<Promotions />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/about" element={<About />} />
      <Route path="/team" element={isManagerial(user) ? <Team /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
