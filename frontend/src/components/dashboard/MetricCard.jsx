import { Link } from 'react-router-dom';
import { MetricIcon } from '../icons/DashboardIcons.jsx';

const QUALITY_LABELS = {
  real: null,
  estimate: 'Stima',
  pending: 'In attesa',
};

export default function MetricCard({
  label,
  value,
  description,
  quality = 'real',
  trend,
  icon,
  featured = false,
  delay = 0,
  secondary = null,
  actionLabel = null,
  actionHref = null,
}) {
  const qualityTag = QUALITY_LABELS[quality];
  const showPending = quality === 'pending' && !value;

  return (
    <article
      className={`ndl-metric${featured ? ' ndl-metric--featured' : ''}${showPending ? ' ndl-metric--pending' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="ndl-metric__top">
        <div className="ndl-metric__icon" aria-hidden>
          <MetricIcon name={icon} />
        </div>
        {trend && (
          <span className={`ndl-metric__trend ndl-metric__trend--${trend.direction}`}>
            {trend.label}
          </span>
        )}
      </div>

      <div className="ndl-metric__value">
        {showPending ? (
          <span className="ndl-metric__pending">In attesa dati</span>
        ) : (
          value ?? '—'
        )}
      </div>

      {secondary && <p className="ndl-metric__secondary">{secondary}</p>}

      <p className="ndl-metric__label">{label}</p>
      <p className="ndl-metric__desc">{description}</p>

      <div className="ndl-metric__footer">
        {qualityTag && (
          <span className={`ndl-metric__tag ndl-metric__tag--${quality}`}>{qualityTag}</span>
        )}
        {actionHref && actionLabel && (
          <Link to={actionHref} className="ndl-metric__action">
            {actionLabel}
          </Link>
        )}
      </div>
    </article>
  );
}
