import { MetricIcon } from '../icons/DashboardIcons.jsx';

const QUALITY_LABELS = {
  real: null,
  estimate: 'Stima',
  pending: 'In attesa',
};

export default function MetricCard({ label, value, description, quality = 'real', trend, icon, accent = 'violet', compact, delay = 0 }) {
  const displayValue = value ?? '—';
  const qualityTag = QUALITY_LABELS[quality];

  return (
    <article
      className={`cc-metric cc-metric--${accent}${compact ? ' cc-metric--compact' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="cc-metric__head">
        <span className="cc-metric__label">{label}</span>
        <div className="cc-metric__icon" aria-hidden>
          <MetricIcon name={icon} />
        </div>
      </div>

      <div className={`cc-metric__value${compact ? ' cc-metric__value--sm' : ''}`}>
        {quality === 'pending' && !value ? (
          <span className="cc-metric__pending">In attesa dati</span>
        ) : (
          displayValue
        )}
      </div>

      <p className="cc-metric__desc">{description}</p>

      <div className="cc-metric__footer">
        {trend && (
          <span className={`cc-metric__trend cc-metric__trend--${trend.direction}`}>
            {trend.label}
          </span>
        )}
        {qualityTag && (
          <span className={`cc-metric__quality cc-metric__quality--${quality}`}>{qualityTag}</span>
        )}
      </div>
    </article>
  );
}
