import { useContentModal } from '../../context/ContentModalContext.jsx';
import { IconSpark } from '../icons/DashboardIcons.jsx';

export default function AiSuggestionsPanel({ suggestions = [] }) {
  const { openModal } = useContentModal();

  return (
    <section className="cc-panel">
      <header className="cc-panel__header">
        <div className="cc-panel__title-row">
          <IconSpark />
          <h2 className="cc-panel__title">Suggerimenti AI</h2>
        </div>
      </header>

      {suggestions.length === 0 ? (
        <div className="cc-empty cc-empty--inline">
          <p className="cc-empty__body">Tutti i progetti sono aggiornati. Ottimo ritmo editoriale.</p>
        </div>
      ) : (
        <ul className="cc-suggestions">
          {suggestions.map((s) => (
            <li key={s.project}>
              <button
                type="button"
                className="cc-suggestion"
                style={{ '--sug-color': s.projectColor }}
                onClick={() =>
                  openModal({
                    project: s.project,
                    platform: s.platform,
                    contentType: s.contentType,
                  })
                }
              >
                <div className="cc-suggestion__top">
                  <span className="cc-suggestion__project">{s.project}</span>
                  {s.recommendedToday && <span className="cc-suggestion__tag">Oggi</span>}
                </div>
                <p className="cc-suggestion__meta">{s.lastPostLabel}</p>
                <p className="cc-suggestion__type">
                  {s.contentTypeLabel} · {s.platformLabel}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
