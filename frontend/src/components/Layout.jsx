import { useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useContentModal } from '../context/ContentModalContext.jsx';
import { isTikTokEnabled } from '../lib/features.js';
import DemoModeBanner from './DemoModeBanner.jsx';
import { IconNav, IconPlus } from './icons/DashboardIcons.jsx';
import { useBilling } from '../context/BillingContext.jsx';
import { useViewport } from '../hooks/useViewport.js';
import MobileBottomNav from './layout/MobileBottomNav.jsx';
import PwaInstalledBadge from './pwa/PwaInstalledBadge.jsx';
import SchedulePublisherTick from './SchedulePublisherTick.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/brand-intelligence', label: 'Brand Intelligence', icon: 'brand' },
  { to: '/generator', label: 'Generatore', icon: 'generator' },
  { to: '/calendar', label: 'Calendario', icon: 'calendar' },
  { to: '/drafts', label: 'Bozze', icon: 'drafts' },
  ...(isTikTokEnabled() ? [{ to: '/review-demo', label: 'Review demo', icon: 'generator' }] : []),
  { to: '/premium', label: 'Premium', icon: 'premium' },
  { to: '/accounts', label: 'Account', icon: 'accounts' },
  { to: '/history', label: 'Storico', icon: 'history' },
];

const MOBILE_TITLES = {
  '/dashboard': 'Home',
  '/generator': 'Crea',
  '/calendar': 'Agenda',
  '/drafts': 'Bozze',
  '/accounts': 'Account',
  '/premium': 'Premium',
  '/history': 'Storico',
  '/brand-intelligence': 'Brand',
  '/review-demo': 'Review',
};

function resolveMobileTitle(pathname) {
  const exact = MOBILE_TITLES[pathname];
  if (exact) return exact;
  const hit = Object.keys(MOBILE_TITLES).find((key) => pathname.startsWith(key));
  return hit ? MOBILE_TITLES[hit] : 'NovaPromo';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { billing } = useBilling();
  const { openModal } = useContentModal();
  const { isMobile, isStandalone } = useViewport();
  const location = useLocation();

  const mobileTitle = useMemo(
    () => resolveMobileTitle(location.pathname),
    [location.pathname]
  );
  const isHome = location.pathname === '/dashboard' || location.pathname === '/';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('standalone-mode', isStandalone);
    root.classList.toggle('mobile-viewport', isMobile);
    return () => {
      root.classList.remove('standalone-mode', 'mobile-viewport');
    };
  }, [isStandalone, isMobile]);

  const shellClass = [
    'app-shell',
    'app-layout',
    isMobile ? 'app-shell--mobile' : 'app-shell--desktop',
    isStandalone ? 'standalone-mode' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={shellClass}>
      <SchedulePublisherTick />
      <aside className="desktop-sidebar sidebar sidebar--premium" aria-label="Navigazione desktop">
        <div className="sidebar-brand sidebar-brand--premium">
          <div className="sidebar-brand__mark" aria-hidden>N</div>
          <div>
            <h1>NovaPromo</h1>
            <p>AutoPublisher</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <IconNav name={item.icon} />
              {item.label}
              {item.to === '/premium' && billing?.isPremium && (
                <span className="sidebar-premium-badge">Pro</span>
              )}
            </NavLink>
          ))}
        </nav>

        <NavLink to="/generator" className="sidebar-cta sidebar-cta--premium">
          <IconPlus />
          Nuovo contenuto
        </NavLink>

        {user && (
          <div className="user-chip user-chip--premium">
            <div className="user-chip-avatar user-chip-avatar--placeholder">
              {(user.displayName || user.username || 'N')[0].toUpperCase()}
            </div>
            <div className="user-chip-info">
              <div className="user-chip-name">{user.displayName || user.username}</div>
              <div className="user-chip-handle">@{user.username}</div>
            </div>
            <button type="button" className="user-chip-logout" onClick={logout} title="Esci">
              Esci
            </button>
          </div>
        )}
      </aside>

      <main className="main-content main-content--wide mobile-screen">
        {isMobile && (
          <header className={`mobile-topbar${isHome ? ' mobile-topbar--home' : ''}`}>
            <div className="mobile-topbar__row">
              <div className="mobile-topbar__brand">
                <span className="mobile-topbar__mark" aria-hidden>N</span>
                <span className="mobile-topbar__product">NovaPromo</span>
              </div>
              <PwaInstalledBadge />
            </div>
            <h1 className="mobile-topbar__title">{mobileTitle}</h1>
          </header>
        )}

        {!isMobile && <PwaInstalledBadge />}

        <div className="mobile-screen__content page-transition" key={location.pathname}>
          <DemoModeBanner />
          <Outlet />
        </div>
      </main>

      {isMobile && <MobileBottomNav onCreate={() => openModal()} />}
    </div>
  );
}
