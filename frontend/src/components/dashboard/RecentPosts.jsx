import StatusBadge from '../StatusBadge.jsx';
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, formatDateTime } from '../../utils/labels.js';

const PLATFORM_ICONS = {
  instagram: '📸',
  tiktok: '🎵',
  both: '✦',
};

function platformIconClass(platform) {
  if (platform === 'instagram') return 'instagram';
  if (platform === 'tiktok') return 'tiktok';
  return 'both';
}

export default function RecentPosts({ posts = [] }) {
  if (posts.length === 0) {
    return <div className="dash-empty-mini">Nessun contenuto ancora. Crea il primo!</div>;
  }

  return (
    <div className="dash-recent-list">
      {posts.map((post) => (
        <div key={post.id} className="dash-recent-item">
          <div className={`dash-recent-icon dash-recent-icon--${platformIconClass(post.platform)}`}>
            {PLATFORM_ICONS[post.platform] || '✦'}
          </div>
          <div className="dash-recent-body">
            <div className="dash-recent-title">{post.project}</div>
            <div className="dash-recent-meta">
              {PLATFORM_LABELS[post.platform]} · {CONTENT_TYPE_LABELS[post.contentType]}
            </div>
          </div>
          <div className="dash-recent-right">
            <StatusBadge status={post.status} />
            <span className="dash-recent-meta">
              {formatDateTime(post.scheduledAt || post.publishedAt || post.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
