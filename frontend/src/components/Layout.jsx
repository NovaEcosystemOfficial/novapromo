import { NavLink, Outlet } from 'react-router-dom';
import { useContentModal } from '../context/ContentModalContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { isTikTokEnabled } from '../lib/features.js';
import DemoModeBanner from './DemoModeBanner.jsx';
import { IconNav, IconPlus } from './icons/DashboardIcons.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/generator', label: 'Generatore', icon: 'generator', action: 'modal' },
  { to: '/calendar', label: 'Calendario', icon: 'calendar' },
  { to: '/drafts', label: 'Bozze', icon: 'drafts' },
  ...(isTikTokEnabled() ? [{ to: '/review-demo', label: 'Review demo', icon: 'generator' }] : []),
  { to: '/accounts', label: 'Account', icon: 'accounts' },
  { to: '/history', label: 'Storico', icon: 'history' },
];

export default function Layout() {
  const { openModal } = useContentModal();
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar sidebar--premium">
        <div className="sidebar-brand sidebar-brand--premium">
          <div className="sidebar-brand__mark" aria-hidden>N</div>
          <div>
            <h1>NovaPromo</h1>
            <p>AutoPublisher</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) =>
            item.action === 'modal' ? (
              <button
                key={item.to}
                type="button"
                className="nav-link nav-link--btn"
                onClick={() => openModal()}
              >
                <IconNav name={item.icon} />
                {item.label}
              </button>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <IconNav name={item.icon} />
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <button type="button" className="sidebar-cta sidebar-cta--premium" onClick={() => openModal()}>
          <IconPlus />
          Nuovo contenuto
        </button>

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

      <main className="main-content main-content--wide">
        <DemoModeBanner />
        <Outlet />
      </main>
    </div>
  );
}
