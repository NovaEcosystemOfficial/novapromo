import { Link } from 'react-router-dom';
import StatusBadge from '../StatusBadge.jsx';
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, formatDateTime } from '../../utils/labels.js';

export default function ActivityFeed({ posts = [], logs = [] }) {
  const published = posts
    .filter((p) => p.status === 'published' && p.publishedAt)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 4);
  const drafts = posts
    .filter((p) => p.status === 'draft')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
  const errors = logs.filter((l) => l.status === 'error').slice(0, 3);
  const hasAny = published.length || drafts.length || errors.length;

  if (!hasAny) {
    return (
      <section className="cc-panel">
        <header className="cc-panel__header">
          <h2 className="cc-panel__title">Attività recenti</h2>
          <Link to="/history" className="cc-panel__link">Storico</Link>
        </header>
        <div className="cc-empty">
          <p className="cc-empty__title">Nessuna attività ancora</p>
          <p className="cc-empty__body">Le pubblicazioni, bozze ed errori API compariranno qui.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="cc-panel">
      <header className="cc-panel__header">
        <h2 className="cc-panel__title">Attività recenti</h2>
        <Link to="/history" className="cc-panel__link">Storico completo →</Link>
      </header>

      {published.length > 0 && (
        <div className="cc-activity-block">
          <h3 className="cc-activity-block__label">Ultimi pubblicati</h3>
          <ul className="cc-activity-list">
            {published.map((post) => (
              <li key={post.id} className="cc-activity-item">
                <div className="cc-activity-item__main">
                  <span className="cc-activity-item__title">{post.project}</span>
                  <span className="cc-activity-item__meta">
                    {PLATFORM_LABELS[post.platform]} · {formatDateTime(post.publishedAt)}
                  </span>
                </div>
                <StatusBadge status="published" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="cc-activity-block">
          <h3 className="cc-activity-block__label">Bozze recenti</h3>
          <ul className="cc-activity-list">
            {drafts.map((post) => (
              <li key={post.id} className="cc-activity-item">
                <div className="cc-activity-item__main">
                  <span className="cc-activity-item__title">{post.project}</span>
                  <span className="cc-activity-item__meta">
                    {CONTENT_TYPE_LABELS[post.contentType]} · {formatDateTime(post.createdAt)}
                  </span>
                </div>
                <StatusBadge status="draft" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {errors.length > 0 && (
        <div className="cc-activity-block">
          <h3 className="cc-activity-block__label cc-activity-block__label--error">Errori API recenti</h3>
          <ul className="cc-activity-list">
            {errors.map((log) => (
              <li key={log.id} className="cc-activity-item cc-activity-item--error">
                <div className="cc-activity-item__main">
                  <span className="cc-activity-item__title">{log.platform} · {log.action}</span>
                  <span className="cc-activity-item__meta">{log.message}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
