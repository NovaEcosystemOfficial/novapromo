import { Link } from 'react-router-dom';

const QUALITY_LABELS = {
  real: null,
  estimate: 'Stima',
  pending: 'In attesa',
};

/**
 * Analytics section: Performance IA tips from collected data.
 */
export default function PerformanceAiPanel({ tips = [] }) {
  return (
    <section className="nda-panel nda-panel--ai" aria-label="Performance IA">
      <header className="nda-panel__header">
        <h2>Performance IA</h2>
        <p>Suggerimenti basati sui dati raccolti — nessuna statistica inventata.</p>
      </header>
      <ul className="nda-tips">
        {tips.map((tip) => (
          <li key={tip.id} className={`nda-tip nda-tip--${tip.quality || 'real'}`}>
            <span className="nda-tip__mark" aria-hidden>{tip.quality === 'pending' ? '○' : '✦'}</span>
            <span>{tip.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AnalyticsInsightsPanel({ insights }) {
  if (!insights) return null;
  const items = [
    { id: 'hour', label: 'Orario migliore', ...insights.bestHour },
    { id: 'day', label: 'Giorno migliore', ...insights.bestDay },
    { id: 'format', label: 'Formato migliore', ...insights.bestFormat },
    { id: 'style', label: 'Stile migliore', ...insights.bestStyle },
    { id: 'platform', label: 'Piattaforma migliore', ...insights.bestPlatform },
  ];

  return (
    <section className="nda-panel nda-panel--insights" aria-label="Insights">
      <header className="nda-panel__header">
        <h2>Insights</h2>
        <p>{insights.note}</p>
      </header>
      <div className="nda-insights-grid">
        {items.map((item) => (
          <article key={item.id} className={`nda-insight nda-insight--${item.quality}`}>
            <p className="nda-insight__label">{item.label}</p>
            <p className="nda-insight__value">{item.value}</p>
            <p className="nda-insight__detail">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AnalyticsGoalsPanel({ goals = [] }) {
  return (
    <section className="nda-panel nda-panel--goals" aria-label="Obiettivi">
      <header className="nda-panel__header">
        <h2>Obiettivi</h2>
        <p>Progressi del mese e risorse AI.</p>
      </header>
      <div className="nda-goals-grid">
        {goals.map((g) => (
          <article key={g.id} className={`nda-goal nda-goal--${g.quality}`}>
            <p className="nda-goal__label">{g.label}</p>
            <p className="nda-goal__value">{g.value}</p>
            {QUALITY_LABELS[g.quality] && (
              <span className={`nda-goal__tag nda-goal__tag--${g.quality}`}>
                {QUALITY_LABELS[g.quality]}
              </span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function TopPostAnalizzaButton({ href, label = 'Analizza' }) {
  if (!href) return null;
  return (
    <Link to={href} className="nda-analizza-btn">
      {label}
    </Link>
  );
}
