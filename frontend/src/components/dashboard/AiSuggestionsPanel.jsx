import { useContentModal } from '../../context/ContentModalContext.jsx';
import { IconSpark } from '../icons/DashboardIcons.jsx';

export default function AiSuggestionsPanel({ suggestions = [] }) {
  const { openModal } = useContentModal();

  return (
    <section className="ndl-panel">
      <header className="ndl-panel__head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <IconSpark />
            <h2 className="ndl-panel__title">Suggerimenti AI</h2>
          </div>
          <p className="ndl-panel__sub">Basati sul ritmo editoriale reale</p>
        </div>
      </header>

      {suggestions.length === 0 ? (
        <div className="ndl-empty ndl-empty--compact">
          <p>Tutti i progetti sono aggiornati. Ottimo ritmo editoriale.</p>
        </div>
      ) : (
        <ul className="ndl-suggestions">
          {suggestions.map((s) => (
            <li key={s.project}>
              <button
                type="button"
                className={`ndl-suggestion${s.priority >= 2 ? ' ndl-suggestion--priority' : ''}`}
                onClick={() =>
                  openModal({
                    project: s.project,
                    platform: s.platform,
                    contentType: s.contentType,
                  })
                }
              >
                <div className="ndl-suggestion__head">
                  <span className="ndl-suggestion__project">{s.project}</span>
                  {s.recommendedToday && <span className="ndl-suggestion__badge">Oggi</span>}
                </div>
                <p className="ndl-suggestion__reason">{s.reason}</p>
                <p className="ndl-suggestion__meta">
                  {s.lastPostLabel} · {s.contentTypeLabel} · {s.platformLabel}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
