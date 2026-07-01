import { Link } from 'react-router-dom';
import { IconPlus, IconCalendar, IconDrafts } from '../icons/DashboardIcons.jsx';

export default function DashboardHeader({
  greeting,
  firstName,
  lastUpdated,
  onNewContent,
  services = [],
  quickActions = [],
}) {
  return (
    <header className="ndl-header">
      <div className="ndl-header__main">
        <div className="ndl-header__intro">
          <p className="ndl-header__eyebrow">
            Command Center <span className="ndl-header__rc">Release Candidate</span>
          </p>
          <h1 className="ndl-header__title">
            {greeting}, {firstName}
          </h1>
          <p className="ndl-header__subtitle">
            Centro operativo per contenuti, pubblicazioni e crescita del brand.
          </p>
        </div>

        <div className="ndl-header__meta">
          {lastUpdated && (
            <span className="ndl-header__updated">
              Aggiornato {lastUpdated}
            </span>
          )}
          <div className="ndl-header__services" role="list" aria-label="Stato servizi">
            {services.map((s) => (
              <span
                key={s.id}
                role="listitem"
                className={`ndl-service ndl-service--${s.tone}`}
                title={s.title}
              >
                <span className="ndl-service__dot" />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="ndl-header__actions">
        <button type="button" className="ndl-btn ndl-btn--primary" onClick={onNewContent}>
          <IconPlus />
          Nuovo contenuto
        </button>
        <div className="ndl-header__quick">
          {quickActions.map((action) =>
            action.href ? (
              <Link key={action.id} to={action.href} className="ndl-btn ndl-btn--ghost">
                {action.icon}
                {action.label}
              </Link>
            ) : (
              <button
                key={action.id}
                type="button"
                className="ndl-btn ndl-btn--ghost"
                onClick={action.onClick}
              >
                {action.icon}
                {action.label}
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
