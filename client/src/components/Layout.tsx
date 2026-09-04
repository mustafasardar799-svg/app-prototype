import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, isManagerial } from '../lib/auth';
import { initials, roleLabel } from '../lib/format';
import {
  IconBack, IconCalendar, IconChart, IconHome, IconInfo, IconLogout, IconMenu,
  IconMoney, IconTag, IconTrash, IconUser, IconUsers,
} from './Icons';

/** Top bar: a drawer button on tab roots, a back arrow everywhere else. */
export function AppBar({ title, back, action }: { title: string; back?: boolean; action?: ReactNode }) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="appbar">
        {back ? (
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <IconBack />
          </button>
        ) : (
          <button className="icon-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <IconMenu />
          </button>
        )}
        <h1>{title}</h1>
        <div style={{ minWidth: 36, display: 'flex', justifyContent: 'flex-end' }}>{action}</div>
      </header>
      {drawerOpen && <Drawer onClose={() => setDrawerOpen(false)} />}
    </>
  );
}

function Drawer({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const items = [
    { label: 'Profile', icon: <IconUser />, onClick: () => go('/profile') },
    { label: 'Customers', icon: <IconUsers />, onClick: () => go('/customers') },
    { label: 'Money Collector', icon: <IconMoney />, onClick: () => go('/collections') },
    { label: 'Promotions', icon: <IconTag />, onClick: () => go('/promotions') },
    ...(isManagerial(user) ? [{ label: 'Team Activity', icon: <IconChart />, onClick: () => go('/team') }] : []),
    { label: 'Visit Plan', icon: <IconCalendar />, onClick: () => go('/visits') },
    { label: 'About', icon: <IconInfo />, onClick: () => go('/about') },
  ];

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className="avatar">{initials(user?.name || '')}</div>
          <div className="name">{user?.name}</div>
          <div className="role">{roleLabel(user?.role || '')}</div>
        </div>
        <div className="drawer-items">
          {items.map((item) => (
            <button key={item.label} className="drawer-item" onClick={item.onClick}>
              <span className="grow">{item.label}</span>
              {item.icon}
            </button>
          ))}
          <button className="drawer-item danger" onClick={() => go('/profile?delete=1')}>
            <span className="grow">Delete Account</span>
            <IconTrash />
          </button>
          <button
            className="drawer-item"
            onClick={() => {
              onClose();
              signOut();
            }}
          >
            <span className="grow">Logout</span>
            <IconLogout />
          </button>
        </div>
      </aside>
    </>
  );
}

export function TabBar() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const tabs = [
    { to: '/', label: 'Home', icon: <IconHome size={21} /> },
    { to: '/orders', label: 'Orders', icon: <IconCalendar size={21} /> },
    { to: '/report', label: 'Report', icon: <IconChart size={21} /> },
    isManagerial(user)
      ? { to: '/team', label: 'Team', icon: <IconUsers size={21} /> }
      : { to: '/customers', label: 'Customers', icon: <IconUsers size={21} /> },
    { to: '/profile', label: 'Profile', icon: <IconUser size={21} /> },
  ];

  return (
    <nav className="tabbar">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={tab.to === '/' ? (pathname === '/' ? 'active' : '') : undefined}
          end={tab.to === '/'}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Screen({
  title, back, action, children,
}: { title: string; back?: boolean; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="phone">
      <AppBar title={title} back={back} action={action} />
      <main className="page">{children}</main>
      <TabBar />
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" role="status" aria-label="Loading" />;
}

export function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}
