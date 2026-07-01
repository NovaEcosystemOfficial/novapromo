import { Link } from 'react-router-dom';

export default function NextActionsPanel({ actions = [] }) {
  return (
    <section className="ndl-panel">
      <header className="ndl-panel__head">
        <div>
          <h2 className="ndl-panel__title">Prossime azioni</h2>
          <p className="ndl-panel__sub">Priorità operative</p>
        </div>
      </header>

      {actions.length === 0 ? (
        <div className="ndl-empty ndl-empty--compact">
          <p className="ndl-empty__title">Sei in linea</p>
          <p>Nessuna azione urgente. Continua con il piano editoriale.</p>
        </div>
      ) : (
        <ul className="ndl-actions">
          {actions.map((action) => (
            <li key={action.id} className="ndl-action">
              <div>
                <p className="ndl-action__title">{action.title}</p>
                <p className="ndl-action__body">{action.body}</p>
              </div>
              {action.href ? (
                <Link to={action.href} className="ndl-action__btn">
                  {action.cta}
                </Link>
              ) : (
                <button type="button" className="ndl-action__btn" onClick={action.onClick}>
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
