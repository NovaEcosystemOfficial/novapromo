import { useContentModal } from '../../context/ContentModalContext.jsx';

export default function SuggestionsWidget({ suggestions = [] }) {
  const { openModal } = useContentModal();

  if (suggestions.length === 0) {
    return (
      <div className="dash-panel dash-suggestions">
        <div className="dash-panel-header">
          <span className="dash-panel-title">📢 Suggerimenti</span>
        </div>
        <div className="dash-empty-mini">Tutti i progetti sono aggiornati! 🎉</div>
      </div>
    );
  }

  return (
    <div className="dash-panel dash-suggestions">
      <div className="dash-panel-header">
        <span className="dash-panel-title">📢 Suggerimenti</span>
      </div>
      <div className="suggestions-list">
        {suggestions.map((s) => (
          <button
            key={s.project}
            type="button"
            className="suggestion-card"
            style={{ '--sug-color': s.projectColor }}
            onClick={() =>
              openModal({
                project: s.project,
                platform: s.platform,
                contentType: s.contentType,
              })
            }
          >
            <div className="suggestion-top">
              <span className="suggestion-project">{s.project}</span>
              <span className="suggestion-badge">Consigliato oggi</span>
            </div>
            <div className="suggestion-meta">{s.lastPostLabel}</div>
            <div className="suggestion-type">
              {s.contentTypeLabel}
              <span className="suggestion-sep">·</span>
              {s.platformLabel}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
