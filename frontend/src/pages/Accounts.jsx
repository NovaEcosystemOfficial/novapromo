import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { openOAuthUrl } from '../lib/electron.js';
import { isDesktopApp } from '../lib/runtime.js';
import { isDemoMode } from '../lib/features.js';
import { getDemoIntegrationsStatus, DEMO_BACKEND_MESSAGE } from '../lib/demo.js';
import { markOAuthReturn } from '../lib/postAuthRedirect.js';
import { useAuth } from '../context/AuthContext.jsx';
import IntegrationStatusPanel from '../components/accounts/IntegrationStatusPanel.jsx';
import TikTokPausedBadge from '../components/TikTokPausedBadge.jsx';

const CONNECTION_LABELS = {
  connected: 'Collegato',
  disconnected: 'Non collegato',
};

export default function Accounts() {
  const { refreshUser } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [integrations, setIntegrations] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = async () => {
    try {
      const [accs, status] = await Promise.all([api.getAccounts(), api.getIntegrationsStatus()]);
      setAccounts(accs);
      setIntegrations(status);
      try {
        await refreshUser();
      } catch (err) {
        console.warn('[Accounts] refreshUser skipped:', err.message);
      }
    } catch (err) {
      if (isDemoMode()) {
        setAccounts([]);
        setIntegrations(getDemoIntegrationsStatus());
      } else {
        throw err;
      }
    }
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));

    const connected = searchParams.get('connected');
    const err = searchParams.get('error');

    if (connected === 'instagram') {
      setMessage('✅ Instagram collegato con successo.');
      load();
      setSearchParams({});
    }
    if (err) {
      setError(decodeURIComponent(err));
      setSearchParams({});
    }
  }, []);

  const connectInstagram = async () => {
    if (isDemoMode()) {
      setError(DEMO_BACKEND_MESSAGE);
      return;
    }
    setError('');
    setMessage('');
    setConnecting(true);
    try {
      const start = await api.startInstagramOAuth();
      markOAuthReturn('/accounts');
      if (isDesktopApp()) {
        await openOAuthUrl(start.url);
      } else {
        window.location.href = start.url;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectInstagram = async () => {
    if (!igAccount) return;
    setDisconnecting(true);
    setError('');
    try {
      await api.deleteAccount(igAccount.id);
      setMessage('Instagram scollegato.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const igAccount = accounts.find((a) => a.platform === 'instagram');
  const igIntegration = integrations.instagram || {};
  const isConnected = Boolean(igAccount);
  const profile = igAccount?.metadata || igIntegration.profile || {};
  const connectionStatus = isConnected ? 'connected' : (igIntegration.connectionStatus || 'disconnected');

  return (
    <>
      <div className="page-header">
        <h2>Account</h2>
        <p>Collega Instagram Business/Creator per pubblicare e programmare contenuti</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      {isDemoMode() && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          {DEMO_BACKEND_MESSAGE} Instagram risulta <strong>non collegato</strong> finché non deployi il backend API.
        </div>
      )}

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Instagram</h3>
          {isConnected ? (
            <span className="integration-mode-badge integration-mode-badge--real">✅ Instagram collegato</span>
          ) : (
            <span className="integration-mode-badge integration-mode-badge--mock">Non collegato</span>
          )}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          Redirect URI backend: <code>{igIntegration.redirectUri || '—'}</code>
        </p>

        {igIntegration.errors?.length > 0 && !isConnected && (
          <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
            <strong>Configurazione Meta incompleta</strong>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
              {igIntegration.errors.map((item) => (
                <li key={item.code}>{item.message}</li>
              ))}
            </ul>
          </div>
        )}

        {isConnected ? (
          <div className="account-connected" style={{ marginTop: '1rem' }}>
            <div className="account-connected-user">@{igAccount.username}</div>
            <div className="account-connected-meta" style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
              <div>
                <strong>Stato connessione:</strong> {CONNECTION_LABELS[connectionStatus] || connectionStatus}
              </div>
              <div>
                <strong>Username:</strong> @{igAccount.username}
              </div>
              <div>
                <strong>Instagram Business ID:</strong>{' '}
                {profile.instagramAccountId || igAccount.externalUserId || '—'}
              </div>
              {profile.pageName && (
                <div>
                  <strong>Pagina Facebook:</strong> {profile.pageName}
                </div>
              )}
            </div>
            <div className="actions" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={disconnectInstagram}
                disabled={disconnecting}
              >
                {disconnecting ? 'Scollegamento…' : 'Scollega'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>
              Stato connessione: <strong>{CONNECTION_LABELS.disconnected}</strong>
            </p>
            {igIntegration.testerSetup?.length > 0 && (
              <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
                <strong>Per collegare @novaecosystem</strong>
                <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                  {igIntegration.testerSetup.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem' }}>
                  Il login forza una nuova autenticazione Instagram (non via Facebook). Se vedi ancora il profilo personale, usa una finestra privata.
                </p>
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={connectInstagram}
              disabled={connecting || isDemoMode() || !igIntegration.canStartOAuth}
              title={isDemoMode() ? DEMO_BACKEND_MESSAGE : undefined}
            >
              {isDemoMode() ? 'OAuth disponibile con backend' : connecting ? 'Apertura login Meta…' : 'Collega Instagram'}
            </button>
          </div>
        )}
      </section>

      <IntegrationStatusPanel integrations={integrations} />

      <section className="card" style={{ marginTop: '1.5rem', opacity: 0.85 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>TikTok</h3>
          <TikTokPausedBadge />
        </div>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Login Kit e Content API sono disattivati.
        </p>
      </section>
    </>
  );
}
