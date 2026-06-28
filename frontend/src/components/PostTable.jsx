import StatusBadge from '../components/StatusBadge.jsx';
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, formatDateTime } from '../utils/labels.js';

export default function PostTable({ posts, onPublish, onDelete, showActions = true }) {
  if (!posts.length) {
    return <div className="empty-state">Nessun contenuto trovato</div>;
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="table">
        <thead>
          <tr>
            <th>Progetto</th>
            <th>Piattaforma</th>
            <th>Tipo</th>
            <th>Stato</th>
            <th>Programmato</th>
            {showActions && <th>Azioni</th>}
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td>{post.project}</td>
              <td>{PLATFORM_LABELS[post.platform]}</td>
              <td>{CONTENT_TYPE_LABELS[post.contentType]}</td>
              <td><StatusBadge status={post.status} /></td>
              <td>{formatDateTime(post.scheduledAt)}</td>
              {showActions && (
                <td>
                  <div className="actions">
                    {post.status !== 'published' && (
                      <button className="btn btn-primary btn-sm" onClick={() => onPublish?.(post.id)}>
                        Pubblica
                      </button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete?.(post.id)}>
                      Elimina
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
