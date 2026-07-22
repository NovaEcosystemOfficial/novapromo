import { NavLink } from 'react-router-dom';
import { IconNav, IconPlus } from '../icons/DashboardIcons.jsx';

const SIDE_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: 'dashboard' },
  { to: '/calendar', label: 'Agenda', icon: 'calendar' },
  { to: '/drafts', label: 'Bozze', icon: 'drafts' },
  { to: '/accounts', label: 'Account', icon: 'accounts' },
];

/**
 * iOS-style floating tab bar with elevated create action in the center.
 */
export default function MobileBottomNav({ onCreate }) {
  const left = SIDE_ITEMS.slice(0, 2);
  const right = SIDE_ITEMS.slice(2);

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigazione principale">
      <div className="mobile-bottom-nav__dock">
        {left.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `mobile-bottom-nav__item${isActive ? ' active' : ''}`}
          >
            <span className="mobile-bottom-nav__icon" aria-hidden>
              <IconNav name={item.icon} width={22} height={22} />
            </span>
            <span className="mobile-bottom-nav__label">{item.label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          className="mobile-bottom-nav__create"
          onClick={onCreate}
          aria-label="Nuovo contenuto"
        >
          <IconPlus width={24} height={24} strokeWidth={2.25} />
        </button>

        {right.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `mobile-bottom-nav__item${isActive ? ' active' : ''}`}
          >
            <span className="mobile-bottom-nav__icon" aria-hidden>
              <IconNav name={item.icon} width={22} height={22} />
            </span>
            <span className="mobile-bottom-nav__label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
