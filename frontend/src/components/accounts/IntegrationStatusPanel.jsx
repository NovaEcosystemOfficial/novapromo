import { formatDateTime } from '../../utils/labels.js';
import TikTokPausedBadge from '../TikTokPausedBadge.jsx';

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
          const connected = s.connectionStatus === 'connected';
          return (
            <div key={key} className={`integration-status-card integration-status-card--${s.paused ? 'paused' : 'real'}`}>
              <div className="integration-status-card-head">
                <span className="integration-status-name">{label}</span>
                {s.paused ? (
                  <TikTokPausedBadge />
                ) : (
                  <span className="integration-mode-badge integration-mode-badge--real">
                    {connected ? 'Collegato' : 'Non collegato'}
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
                  value={s.paused ? 'In pausa' : (connected ? 'Collegato' : 'Non collegato')}
                  highlight={connected ? 'ok' : 'warn'}
                />
                {s.redirectUri && key === 'instagram' && (
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
