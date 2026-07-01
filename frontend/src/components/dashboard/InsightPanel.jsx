import { VIEW_COUNT_IS_ESTIMATE } from '../../utils/dashboardMetrics.js';

export default function InsightPanel({ series = [] }) {
  const hasData = series.some((d) => d.publications > 0 || d.scheduled > 0);
  const maxPub = Math.max(1, ...series.map((d) => d.publications));

  return (
    <section className="ndl-panel ndl-panel--wide">
      <header className="ndl-panel__head">
        <div>
          <h2 className="ndl-panel__title">Performance ultimi 7 giorni</h2>
          <p className="ndl-panel__sub">Pubblicazioni e attività in calendario</p>
        </div>
        {VIEW_COUNT_IS_ESTIMATE && (
          <span className="ndl-panel__hint">Insight Instagram in arrivo</span>
        )}
      </header>

      {!hasData ? (
        <div className="ndl-empty ndl-empty--chart">
          <p className="ndl-empty__title">Insight in arrivo</p>
          <p>Pubblica altri contenuti per vedere l&apos;andamento.</p>
        </div>
      ) : (
        <div className="ndl-chart">
          <div className="ndl-chart__bars">
            {series.map((day) => (
              <div key={day.date} className="ndl-chart__col">
                <div className="ndl-chart__bar-wrap">
                  <div
                    className="ndl-chart__bar ndl-chart__bar--pub"
                    style={{ height: `${(day.publications / maxPub) * 100}%` }}
                    title={`${day.publications} pubblicati`}
                  />
                  {day.scheduled > 0 && (
                    <div
                      className="ndl-chart__bar ndl-chart__bar--sched"
                      style={{ height: `${Math.min(40, day.scheduled * 12)}%` }}
                      title={`${day.scheduled} programmati`}
                    />
                  )}
                </div>
                <span className="ndl-chart__label">{day.label}</span>
                <span className="ndl-chart__count">{day.publications || '·'}</span>
              </div>
            ))}
          </div>
          <div className="ndl-chart__legend">
            <span><i className="ndl-chart__dot ndl-chart__dot--pub" /> Pubblicati</span>
            <span><i className="ndl-chart__dot ndl-chart__dot--sched" /> Programmati</span>
          </div>
        </div>
      )}
    </section>
  );
}
