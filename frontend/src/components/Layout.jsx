import { NavLink, Outlet } from 'react-router-dom';
import { useContentModal } from '../context/ContentModalContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { isTikTokEnabled } from '../lib/features.js';
import TikTokPausedBadge from './TikTokPausedBadge.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/generator', label: 'Generatore', icon: '✨', action: 'modal' },
  { to: '/calendar', label: 'Calendario', icon: '📅' },
  { to: '/drafts', label: 'Bozze', icon: '📝' },
  ...(isTikTokEnabled() ? [{ to: '/review-demo', label: 'Review demo', icon: '🎬' }] : []),
  { to: '/accounts', label: 'Account', icon: '🔗' },
  { to: '/history', label: 'Storico', icon: '📜' },
];

export default function Layout() {
  const { openModal } = useContentModal();
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>NovaPromo</h1>
          <p>AutoPublisher</p>
          {!isTikTokEnabled() && (
            <div style={{ marginTop: '0.5rem' }}>
              <TikTokPausedBadge />
            </div>
          )}
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
                <span>{item.icon}</span>
                {item.label}
              </button>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>
        <button type="button" className="sidebar-cta" onClick={() => openModal()}>
          + Nuovo contenuto
        </button>

        {user && (
          <div className="user-chip">
            <div className="user-chip-avatar user-chip-avatar--placeholder">
              {(user.displayName || user.username || 'N')[0].toUpperCase()}
            </div>
            <div className="user-chip-info">
              <div className="user-chip-name">{user.displayName || user.username}</div>
              <div className="user-chip-handle">@{user.username}</div>
            </div>
            <button type="button" className="user-chip-logout" onClick={logout}>
              Esci
            </button>
          </div>
        )}
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
