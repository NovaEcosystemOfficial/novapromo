import { Link } from 'react-router-dom';
import TikTokPausedBadge from '../TikTokPausedBadge.jsx';

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', avatarClass: 'instagram', emoji: '📸' },
  { id: 'tiktok', name: 'TikTok', avatarClass: 'tiktok', emoji: '🎵', paused: true },
];

export default function AccountsWidget({ accounts = [], integrations = {} }) {
  const byPlatform = Object.fromEntries(accounts.map((a) => [a.platform, a]));

  return (
    <div className="dash-panel dash-panel--glass">
      <div className="dash-panel-header">
        <span className="dash-panel-title">Account collegati</span>
        <Link to="/accounts" className="dash-panel-link">Gestisci →</Link>
      </div>

      <div className="dash-account-list">
        {PLATFORMS.map((p) => {
          const acc = byPlatform[p.id];
          const integration = integrations[p.id] || {};

          if (p.paused || integration.paused) {
            return (
              <div key={p.id} className="dash-account-card dash-account-card--disconnected">
                <div className={`dash-account-avatar dash-account-avatar--${p.avatarClass}`} style={{ opacity: 0.5 }}>
                  {p.emoji}
                </div>
                <div className="dash-account-info">
                  <div className="dash-account-name">{p.name}</div>
                  <div className="dash-account-handle">Integrazione in pausa</div>
                </div>
                <TikTokPausedBadge />
              </div>
            );
          }

          if (acc) {
            return (
              <div key={p.id} className="dash-account-card">
                <div className={`dash-account-avatar dash-account-avatar--${p.avatarClass}`}>{p.emoji}</div>
                <div className="dash-account-info">
                  <div className="dash-account-name">{p.name}</div>
                  <div className="dash-account-handle">@{acc.username || acc.displayName}</div>
                </div>
                <div className="dash-account-status">
                  <span className="dash-account-status-dot dash-account-status-dot--live" />
                  Collegato
                </div>
              </div>
            );
          }

          return (
            <div key={p.id} className="dash-account-card dash-account-card--disconnected">
              <div className={`dash-account-avatar dash-account-avatar--${p.avatarClass}`} style={{ opacity: 0.5 }}>
                {p.emoji}
              </div>
              <div className="dash-account-info">
                <div className="dash-account-name">{p.name}</div>
                <div className="dash-account-handle">
                  {integration.credentialsError || 'Non collegato'}
                </div>
              </div>
              <div className="dash-account-status">
                <span className="dash-account-status-dot dash-account-status-dot--off" />
                Off
              </div>
            </div>
          );
        })}
      </div>

      <Link to="/accounts" className="dash-connect-btn">
        Collega Instagram
      </Link>
    </div>
  );
}
