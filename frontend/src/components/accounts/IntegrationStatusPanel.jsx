import { formatDateTime } from '../../utils/labels.js';
import TikTokPausedBadge from '../TikTokPausedBadge.jsx';
import { isInstagramConnected, getInstagramConnectionLabel } from '../../lib/instagramStatus.js';

function platformConnected(key, integration) {
  if (key === 'instagram') return isInstagramConnected(integration);
  return integration.connectionStatus === 'connected';
}

function platformConnectionLabel(key, integration) {
  if (key === 'instagram') return getInstagramConnectionLabel(integration);
  if (integration.paused) return 'In pausa';
  return platformConnected(key, integration) ? 'Collegato' : 'Non collegato';
}
function StatusRow({ label, value, highlight }) {
  return (
    <div className="integration-status-row">
      <span className="integration-status-label">{label}</span>
      <span className={`integration-status-value${highlight ? ` integration-status-value--${highlight}` : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function IntegrationStatusPanel({ integrations = {} }) {
  const platforms = [
    { key: 'instagram', label: 'Instagram (Meta)' },
    { key: 'tiktok', label: 'TikTok' },
  ];

  return (
    <div className="card integration-status-panel">
      <h3 className="integration-status-title">Stato integrazioni</h3>
      <p className="integration-status-sub">
        Instagram attivo · TikTok in pausa
      </p>

      <div className="integration-status-grid">
        {platforms.map(({ key, label }) => {
          const s = integrations[key] || {};
          const connected = platformConnected(key, s);
          const statusLabel = platformConnectionLabel(key, s);
          return (
            <div key={key} className={`integration-status-card integration-status-card--${s.paused ? 'paused' : 'real'}`}>
              <div className="integration-status-card-head">
                <span className="integration-status-name">{label}</span>
                {s.paused ? (
                  <TikTokPausedBadge />
                ) : (
                  <span className="integration-mode-badge integration-mode-badge--real">
                    {statusLabel}
                  </span>
                )}
              </div>

              {s.credentialsError && (
                <div className="integration-cred-error">
                  ⚠ {s.credentialsError}
                </div>
              )}

              <div className="integration-status-rows">
                <StatusRow
                  label="Stato"
                  value={statusLabel}
                  highlight={connected ? 'ok' : 'warn'}
                />
                {key === 'instagram' && isInstagramConnected(s) && s.accountUsername && (
                  <StatusRow label="Account" value={`@${s.accountUsername}`} />
                )}
                {key === 'instagram' && isInstagramConnected(s) && s.instagramAccountId && (
                  <StatusRow label="Business ID" value={s.instagramAccountId} />
                )}                {s.redirectUri && key === 'instagram' && (
                  <StatusRow label="Redirect URI" value={s.redirectUri} />
                )}
                <StatusRow label="Ultimo controllo" value={s.lastApiCheck ? formatDateTime(s.lastApiCheck) : '—'} />
                <StatusRow label="Prossimo step" value={s.nextStep || '—'} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
