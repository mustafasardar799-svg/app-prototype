import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, isManagerial } from '../lib/auth';
import { useConnection } from '../lib/connection';
import { useTheme } from '../lib/theme';
import { initials } from '../lib/format';
import { locales, roleKey, useI18n, useT } from '../lib/i18n';
import {
  IconBack, IconCalendar, IconChart, IconHome, IconInbox, IconInfo, IconLogout, IconMenu,
  IconGlobe, IconMoney, IconMoon, IconPhone, IconSun, IconTag, IconTrash, IconTrophy,
  IconUser, IconUsers, IconWifiOff,
} from './Icons';

/** Shown under the app bar whenever work is parked on the phone. */
function ConnectionBar() {
  const { online, queue } = useConnection();
  const t = useT();
  if (online && queue.length === 0) return null;

  return (
    <div className="offline-bar" role="status">
      {online ? <IconInbox size={16} /> : <IconWifiOff size={16} />}
      <span>
        {online
          ? t('syncingRecords', { count: queue.length })
          : queue.length > 0
            ? t('offlineWaiting', { count: queue.length })
            : t('offlineSaved')}
      </span>
    </div>
  );
}

export function AppBar({ title, back, action }: { title: string; back?: boolean; action?: ReactNode }) {
  const navigate = useNavigate();
  const t = useT();
  const { dir } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="appbar">
        {back ? (
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t('goBack')}>
            {/* The back arrow follows the reading direction. */}
            <span style={{ display: 'inline-flex', transform: dir === 'rtl' ? 'scaleX(-1)' : undefined }}>
              <IconBack />
            </span>
          </button>
        ) : (
          <button className="icon-btn" onClick={() => setDrawerOpen(true)} aria-label={t('openMenu')}>
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
  const { locale, setLocale } = useI18n();
  const t = useT();
  const navigate = useNavigate();

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const items = [
    { label: t('profile'), icon: <IconUser />, path: '/profile' },
    { label: t('customers'), icon: <IconUsers />, path: '/customers' },
    { label: t('leaderboard'), icon: <IconTrophy />, path: '/leaderboard' },
    { label: t('moneyCollector'), icon: <IconMoney />, path: '/collections' },
    { label: t('visitPlan'), icon: <IconCalendar />, path: '/visits' },
    { label: t('calls'), icon: <IconPhone />, path: '/calls' },
    { label: t('promotions'), icon: <IconTag />, path: '/promotions' },
    ...(isManagerial(user) ? [{ label: t('teamActivity'), icon: <IconChart />, path: '/team' }] : []),
    { label: t('about'), icon: <IconInfo />, path: '/about' },
  ];

  const nextTheme = { system: 'light', light: 'dark', dark: 'system' } as const;
  const themeName = {
    system: t('appearanceSystem'),
    light: t('appearanceLight'),
    dark: t('appearanceDark'),
  };
  // Cycle through the languages so the switch is one tap from any screen.
  const nextLocale = locales[(locales.findIndex((entry) => entry.code === locale) + 1) % locales.length];

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className="avatar">{initials(user?.name || '')}</div>
          <div className="name">{user?.name}</div>
          <div className="role">{t(roleKey(user?.role || ''))}</div>
        </div>
        <div className="drawer-items">
          {items.map((item) => (
            <button key={item.label} className="drawer-item" onClick={() => go(item.path)}>
              <span className="grow">{item.label}</span>
              {item.icon}
            </button>
          ))}

          <button className="drawer-item" onClick={() => setLocale(nextLocale.code)}>
            <span className="grow">{t('language')}: {locales.find((e) => e.code === locale)?.label}</span>
            <IconGlobe />
          </button>

          <button className="drawer-item" onClick={() => setChoice(nextTheme[choice])}>
            <span className="grow">{t('appearanceLabel', { value: themeName[choice] })}</span>
            {resolved === 'dark' ? <IconMoon /> : <IconSun />}
          </button>

          <button className="drawer-item danger" onClick={() => go('/profile?delete=1')}>
            <span className="grow">{t('deleteAccount')}</span>
            <IconTrash />
          </button>
          <button
            className="drawer-item"
            onClick={() => {
              onClose();
              signOut();
            }}
          >
            <span className="grow">{t('logout')}</span>
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
  const t = useT();

  const tabs = [
    { to: '/', label: t('navHome'), icon: <IconHome size={21} /> },
    { to: '/orders', label: t('navOrders'), icon: <IconCalendar size={21} /> },
    { to: '/report', label: t('navReport'), icon: <IconChart size={21} /> },
    isManagerial(user)
      ? { to: '/team', label: t('navTeam'), icon: <IconUsers size={21} /> }
      : { to: '/leaderboard', label: t('navRanking'), icon: <IconTrophy size={21} /> },
    { to: '/profile', label: t('navProfile'), icon: <IconUser size={21} /> },
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
