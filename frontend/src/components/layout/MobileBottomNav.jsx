import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/dashboard', label: 'Home', icon: '⌂' },
  { to: '/generator', label: 'Crea', icon: '✦' },
  { to: '/calendar', label: 'Calendario', icon: '📅' },
  { to: '/drafts', label: 'Bozze', icon: '📝' },
  { to: '/accounts', label: 'Account', icon: '🔗' },
];

export default function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navigazione principale">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `mobile-bottom-nav__item${isActive ? ' active' : ''}`}
        >
          <span className="mobile-bottom-nav__icon" aria-hidden>{item.icon}</span>
          <span className="mobile-bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
