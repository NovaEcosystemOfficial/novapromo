import { IconPlus } from '../icons/DashboardIcons.jsx';

export default function DashboardHeader({ greeting, firstName, onNewContent, statusBadges = [] }) {
  return (
    <header className="cc-header">
      <div className="cc-header__copy">
        <p className="cc-header__eyebrow">NovaPromo Command Center</p>
        <h1 className="cc-header__title">
          {greeting}, {firstName}
        </h1>
        <p className="cc-header__subtitle">
          Il tuo centro operativo per contenuti, pubblicazioni e crescita.
        </p>
        <div className="cc-header__badges">
          {statusBadges.map((badge) => (
            <span
              key={badge.id}
              className={`cc-status-badge cc-status-badge--${badge.tone}`}
              title={badge.title}
            >
              <span className="cc-status-badge__dot" />
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      <button type="button" className="cc-header__cta" onClick={onNewContent}>
        <IconPlus />
        Nuovo contenuto
      </button>
    </header>
  );
}
