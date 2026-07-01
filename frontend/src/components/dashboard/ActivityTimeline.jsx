import { Link } from 'react-router-dom';
import StatusBadge from '../StatusBadge.jsx';
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, formatDateTime } from '../../utils/labels.js';

function buildTimelineItems(posts, logs) {
  const items = [];

  posts
    .filter((p) => p.status === 'published' && p.publishedAt)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 4)
    .forEach((post) => {
      items.push({
        id: `pub-${post.id}`,
        type: 'published',
        title: post.project,
        meta: `${PLATFORM_LABELS[post.platform]} · ${formatDateTime(post.publishedAt)}`,
        status: 'published',
      });
    });

  posts
    .filter((p) => p.status === 'draft')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3)
    .forEach((post) => {
      items.push({
        id: `draft-${post.id}`,
        type: 'draft',
        title: post.project,
        meta: `${CONTENT_TYPE_LABELS[post.contentType]} · bozza`,
        status: 'draft',
      });
    });

  logs
    .filter((l) => l.status === 'error')
    .slice(0, 3)
    .forEach((log) => {
      items.push({
        id: `err-${log.id}`,
        type: 'error',
        title: `${log.platform} · ${log.action}`,
        meta: log.message,
        status: 'error',
      });
    });

  return items.slice(0, 8);
}

export default function ActivityTimeline({ posts = [], logs = [] }) {
  const items = buildTimelineItems(posts, logs);

  return (
    <section className="ndl-panel">
      <header className="ndl-panel__head">
        <div>
          <h2 className="ndl-panel__title">Attività</h2>
          <p className="ndl-panel__sub">Timeline operativa</p>
        </div>
        <Link to="/history" className="ndl-panel__link">Storico</Link>
      </header>

      {items.length === 0 ? (
        <div className="ndl-empty">
          <p className="ndl-empty__title">Nessuna attività recente</p>
          <p>Le pubblicazioni e le bozze compariranno qui in ordine cronologico.</p>
        </div>
      ) : (
        <ol className="ndl-timeline">
          {items.map((item, index) => (
            <li key={item.id} className={`ndl-timeline__item ndl-timeline__item--${item.type}`}>
              <span className="ndl-timeline__dot" />
              {index < items.length - 1 && <span className="ndl-timeline__line" />}
              <div className="ndl-timeline__content">
                <div className="ndl-timeline__row">
                  <span className="ndl-timeline__title">{item.title}</span>
                  {item.status && item.status !== 'error' && (
                    <StatusBadge status={item.status} />
                  )}
                </div>
                <p className="ndl-timeline__meta">{item.meta}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
