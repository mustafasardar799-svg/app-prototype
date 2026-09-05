import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, isManagerial } from '../lib/auth';
import { useConnection } from '../lib/connection';
import { useTheme } from '../lib/theme';
import { initials, roleLabel } from '../lib/format';
import {
  IconBack, IconCalendar, IconChart, IconHome, IconInbox, IconInfo, IconLogout, IconMenu,
  IconMoney, IconMoon, IconPhone, IconSun, IconTag, IconTrash, IconTrophy, IconUser, IconUsers,
  IconWifiOff,
} from './Icons';

/** Shown under the app bar whenever work is parked on the phone. */
function ConnectionBar() {
  const { online, queue } = useConnection();
  if (online && queue.length === 0) return null;

  return (
    <div className="offline-bar" role="status">
      {online ? <IconInbox size={16} /> : <IconWifiOff size={16} />}
      <span>
        {online
          ? `Syncing ${queue.length} saved ${queue.length === 1 ? 'record' : 'records'}…`
          : queue.length > 0
            ? `Offline — ${queue.length} ${queue.length === 1 ? 'record' : 'records'} waiting to sync`
            : 'Offline — your work is saved on this phone'}
      </span>
    </div>
  );
}

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
        <div className="appbar-slot">{action}</div>
      </header>
      <ConnectionBar />
      {drawerOpen && <Drawer onClose={() => setDrawerOpen(false)} />}
    </>
  );
}

function Drawer({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useAuth();
  const { choice, setChoice, resolved } = useTheme();
  const navigate = useNavigate();

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const items = [
    { label: 'Profile', icon: <IconUser />, path: '/profile' },
    { label: 'Customers', icon: <IconUsers />, path: '/customers' },
    { label: 'Leaderboard', icon: <IconTrophy />, path: '/leaderboard' },
    { label: 'Money Collector', icon: <IconMoney />, path: '/collections' },
    { label: 'Visit Plan', icon: <IconCalendar />, path: '/visits' },
    { label: 'Calls', icon: <IconPhone />, path: '/calls' },
    { label: 'Promotions', icon: <IconTag />, path: '/promotions' },
    ...(isManagerial(user) ? [{ label: 'Team Activity', icon: <IconChart />, path: '/team' }] : []),
    { label: 'About', icon: <IconInfo />, path: '/about' },
  ];

  const nextTheme = { system: 'light', light: 'dark', dark: 'system' } as const;
  const themeLabel = { system: 'Appearance: System', light: 'Appearance: Light', dark: 'Appearance: Dark' };

  return createPortal(
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
            <button key={item.label} className="drawer-item" onClick={() => go(item.path)}>
              <span className="grow">{item.label}</span>
              {item.icon}
            </button>
          ))}

          <button className="drawer-item" onClick={() => setChoice(nextTheme[choice])}>
            <span className="grow">{themeLabel[choice]}</span>
            {resolved === 'dark' ? <IconMoon /> : <IconSun />}
          </button>

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
    </>,
    document.body,
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
      : { to: '/leaderboard', label: 'Ranking', icon: <IconTrophy size={21} /> },
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

/** Shaped placeholders while data loads — steadier than a spinner. */
export function Skeleton({ height = 64, count = 3 }: { height?: number; count?: number }) {
  return (
    <div className="list" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}

export function Empty({ text, headline, icon }: { text: string; headline?: string; icon?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      {headline && <div className="headline">{headline}</div>}
      <div>{text}</div>
    </div>
  );
}
