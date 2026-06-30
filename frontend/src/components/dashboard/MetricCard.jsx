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
}) {
  const qualityTag = QUALITY_LABELS[quality];

  return (
    <article
      className={`ndl-metric${featured ? ' ndl-metric--featured' : ''}`}
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
        {quality === 'pending' && !value ? (
          <span className="ndl-metric__pending">—</span>
        ) : (
          value ?? '—'
        )}
      </div>

      <p className="ndl-metric__label">{label}</p>
      <p className="ndl-metric__desc">{description}</p>

      {qualityTag && (
        <span className={`ndl-metric__tag ndl-metric__tag--${quality}`}>{qualityTag}</span>
      )}
    </article>
  );
}
