import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../utils/labels.js';
import '../styles/tiktok-status.css';

const STATUS_CLASS = {
  connected: 'tiktok-status--ok',
  expiring_soon: 'tiktok-status--warn',
  refreshing: 'tiktok-status--warn',
  expired: 'tiktok-status--error',
  disconnected: 'tiktok-status--muted',
  error: 'tiktok-status--error',
};

export default function TikTokUserCard({ tiktok, compact = false }) {
  const { user, logout } = useAuth();

  if (!user && !tiktok) {
    return (
      <div className={`tiktok-user-card${compact ? ' compact' : ''}`}>
        <div className="tiktok-user-card-header">
          <span className="tiktok-user-card-icon">🎵</span>
          <div>
            <h3>TikTok Login Kit</h3>
            <p className="tiktok-status tiktok-status--muted">Non collegato</p>
          </div>
        </div>
        <Link to="/login" className="btn btn-primary btn-sm">Login with TikTok</Link>
      </div>
    );
  }

  const status = tiktok?.tokenStatus || 'connected';
  const statusLabel = tiktok?.tokenStatusLabel || 'Collegato';

  return (
    <div className={`tiktok-user-card${compact ? ' compact' : ''}`}>
      <div className="tiktok-user-card-header">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="tiktok-user-avatar" />
        ) : (
          <div className="tiktok-user-avatar tiktok-user-avatar--placeholder">
            {(user?.displayName || '?')[0]}
          </div>
        )}
        <div className="tiktok-user-card-meta">
          <h3>{user?.displayName || 'Utente TikTok'}</h3>
          <p className="tiktok-user-handle">@{user?.username || '—'}</p>
          <p className={`tiktok-status ${STATUS_CLASS[status] || ''}`}>{statusLabel}</p>
        </div>
      </div>

      {!compact && (
        <dl className="tiktok-user-details">
          <div>
            <dt>open_id</dt>
            <dd><code>{user?.openId || tiktok?.openId || '—'}</code></dd>
          </div>
          <div>
            <dt>Token scade</dt>
            <dd>{formatDateTime(tiktok?.accessTokenExpiresAt) || '—'}</dd>
          </div>
          <div>
            <dt>Scope Login Kit</dt>
            <dd>{(tiktok?.scopes || []).join(', ') || 'user.info.basic, user.info.profile'}</dd>
          </div>
        </dl>
      )}

      <div className="tiktok-user-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={logout}>
          Disconnetti TikTok
        </button>
      </div>
    </div>
  );
}
