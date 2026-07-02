import { Link } from 'react-router-dom';
import MetricCard from './MetricCard.jsx';
import { IconPlus } from '../icons/DashboardIcons.jsx';

export default function MobileDashboard({
  greeting,
  firstName,
  services,
  metricCards,
  extraCards = [],
  quickActions,
  onNewContent,
}) {
  const allCards = [...metricCards, ...extraCards];

  return (
    <div className="mobile-dashboard mobile-screen">
      <section className="mobile-dashboard__hero mobile-card">
        <p className="mobile-dashboard__eyebrow">Command Center</p>
        <h1 className="mobile-dashboard__title">
          {greeting}, {firstName}
        </h1>
        <p className="mobile-dashboard__subtitle">
          Centro operativo per contenuti, pubblicazioni e crescita del brand.
        </p>

        <div className="mobile-dashboard__services" role="list" aria-label="Stato servizi">
          {services.map((s) => (
            <span
              key={s.id}
              role="listitem"
              className={`mobile-dashboard__service mobile-dashboard__service--${s.tone}`}
            >
              {s.label}
            </span>
          ))}
        </div>

        <button type="button" className="mobile-dashboard__cta" onClick={onNewContent}>
          <IconPlus />
          Nuovo contenuto
        </button>
      </section>

      <section className="mobile-dashboard__metrics" aria-label="Metriche rapide">
        {allCards.map((card, index) => (
          <MetricCard key={card.id} {...card} delay={index * 40} />
        ))}
      </section>

      <section className="mobile-dashboard__actions" aria-label="Azioni rapide">
        <h2>Azioni rapide</h2>
        <div className="mobile-dashboard__action-grid">
          {quickActions.map((action) => (
            action.href ? (
              <Link key={action.id} to={action.href} className="mobile-dashboard__action mobile-card">
                <span className="mobile-dashboard__action-icon">{action.icon}</span>
                <span>{action.label}</span>
              </Link>
            ) : (
              <button
                key={action.id}
                type="button"
                className="mobile-dashboard__action mobile-card"
                onClick={action.onClick}
              >
                <span className="mobile-dashboard__action-icon">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            )
          ))}
        </div>
      </section>
    </div>
  );
}
