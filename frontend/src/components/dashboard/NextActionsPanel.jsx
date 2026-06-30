import { Link } from 'react-router-dom';

export default function NextActionsPanel({ actions = [] }) {
  return (
    <section className="cc-panel">
      <header className="cc-panel__header">
        <h2 className="cc-panel__title">Prossime azioni</h2>
      </header>

      {actions.length === 0 ? (
        <div className="cc-empty">
          <p className="cc-empty__title">Sei in linea</p>
          <p className="cc-empty__body">Nessuna azione urgente. Continua con il piano editoriale.</p>
        </div>
      ) : (
        <ul className="cc-actions">
          {actions.map((action) => (
            <li key={action.id} className="cc-action">
              <div className="cc-action__copy">
                <p className="cc-action__title">{action.title}</p>
                <p className="cc-action__body">{action.body}</p>
              </div>
              {action.href ? (
                <Link to={action.href} className="cc-action__btn">
                  {action.cta}
                </Link>
              ) : (
                <button type="button" className="cc-action__btn" onClick={action.onClick}>
                  {action.cta}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
