import { VIEW_COUNT_IS_ESTIMATE } from '../../utils/dashboardMetrics.js';

export default function InsightPanel({ series = [] }) {
  const hasData = series.some((d) => d.publications > 0 || d.scheduled > 0);
  const maxPub = Math.max(1, ...series.map((d) => d.publications));

  return (
    <section className="cc-panel cc-panel--wide">
      <header className="cc-panel__header">
        <div>
          <h2 className="cc-panel__title">Performance ultimi 7 giorni</h2>
          <p className="cc-panel__subtitle">Pubblicazioni e attività in calendario</p>
        </div>
        {VIEW_COUNT_IS_ESTIMATE && (
          <span className="cc-panel__hint">Visualizzazioni: insight Instagram in arrivo</span>
        )}
      </header>

      {!hasData ? (
        <div className="cc-empty cc-empty--chart">
          <p className="cc-empty__title">Insight in arrivo</p>
          <p className="cc-empty__body">Pubblica altri contenuti per vedere l&apos;andamento.</p>
        </div>
      ) : (
        <div className="cc-chart">
          <div className="cc-chart__bars">
            {series.map((day) => (
              <div key={day.date} className="cc-chart__col">
                <div className="cc-chart__bar-wrap">
                  <div
                    className="cc-chart__bar cc-chart__bar--pub"
                    style={{ height: `${(day.publications / maxPub) * 100}%` }}
                    title={`${day.publications} pubblicati`}
                  />
                  {day.scheduled > 0 && (
                    <div
                      className="cc-chart__bar cc-chart__bar--sched"
                      style={{ height: `${Math.min(40, day.scheduled * 12)}%` }}
                      title={`${day.scheduled} programmati`}
                    />
                  )}
                </div>
                <span className="cc-chart__label">{day.label}</span>
                <span className="cc-chart__count">{day.publications || '·'}</span>
              </div>
            ))}
          </div>
          <div className="cc-chart__legend">
            <span><i className="cc-chart__dot cc-chart__dot--pub" /> Pubblicati</span>
            <span><i className="cc-chart__dot cc-chart__dot--sched" /> Programmati</span>
          </div>
        </div>
      )}
    </section>
  );
}
