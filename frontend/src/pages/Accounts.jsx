import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { openOAuthUrl } from '../lib/electron.js';
import { isDemoMode } from '../lib/features.js';
import { getDemoIntegrationsStatus, DEMO_BACKEND_MESSAGE } from '../lib/demo.js';
import { markOAuthReturn } from '../lib/postAuthRedirect.js';
import { useAuth } from '../context/AuthContext.jsx';
import { isInstagramConnected, getInstagramConnectionLabel } from '../lib/instagramStatus.js';
import { isFacebookConnected, getFacebookConnectionLabel, getFacebookPublishingLabel, isFacebookPublishPending, isFacebookPublishReady, FACEBOOK_PUBLISH_PENDING_UI_MESSAGE } from '../lib/facebookStatus.js';
import IntegrationStatusPanel from '../components/accounts/IntegrationStatusPanel.jsx';
import AccountProfilePanel from '../components/accounts/AccountProfilePanel.jsx';
import TikTokPausedBadge from '../components/TikTokPausedBadge.jsx';

export default function Accounts() {
  const { refreshUser } = useAuth();
  const [integrations, setIntegrations] = useState({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback(async () => {
    try {
      const status = await api.getIntegrationsStatus();
      setIntegrations(status);
      try {
        await refreshUser();
      } catch (err) {
        console.warn('[Accounts] refreshUser skipped:', err.message);
      }
      return status;
    } catch (err) {
      if (isDemoMode()) {
        const demo = getDemoIntegrationsStatus();
        setIntegrations(demo);
        return demo;
      }
      throw err;
    }
  }, [refreshUser]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const errParam = searchParams.get('error');

    load()
      .then(() => {
        if (connected === 'instagram') {
          setMessage('✅ Instagram collegato con successo.');
        }
        if (connected === 'facebook') {
          setMessage('✅ Pagina Facebook collegata. La pubblicazione resta in attesa finché Meta non concede pages_manage_posts (Advanced Access).');
        }
        if (errParam) {
          setError(decodeURIComponent(errParam));
        }
        if (connected || errParam) {
          setSearchParams({}, { replace: true });
        }
      })
      .catch((err) => setError(err.message));
    // Run once on mount (OAuth return params are read from the initial URL).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ig = integrations.instagram || {};
  const fb = integrations.facebook || {};
  const profile = ig.profile || {};
  const fbProfile = fb.profile || {};
  const isConnected = isInstagramConnected(ig);
  const isFbConnected = isFacebookConnected(fb);
  const connectionLabel = getInstagramConnectionLabel(ig);
  const fbConnectionLabel = getFacebookConnectionLabel(fb);
  const fbPublishLabel = getFacebookPublishingLabel(fb);
  const fbPublishPending = isFacebookPublishPending(fb);
  const fbPublishReady = isFacebookPublishReady(fb);

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
      await openOAuthUrl(start.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectInstagram = async () => {
    if (!ig.accountId) return;
    setDisconnecting(true);
    setError('');
    try {
      await api.deleteAccount(ig.accountId);
      setMessage('Instagram scollegato.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const connectFacebook = async () => {
    if (isDemoMode()) {
      setError(DEMO_BACKEND_MESSAGE);
      return;
    }
    setError('');
    setMessage('');
    setConnecting(true);
    try {
      const start = await api.startFacebookOAuth();
      markOAuthReturn('/accounts');
      await openOAuthUrl(start.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectFacebook = async () => {
    if (!fb.accountId) return;
    setDisconnecting(true);
    setError('');
    try {
      await api.deleteAccount(fb.accountId);
      setMessage('Pagina Facebook scollegata.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Account</h2>
        <p>Collega Instagram Business/Creator e la tua Pagina Facebook per pubblicare e programmare contenuti</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      {isDemoMode() && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          {DEMO_BACKEND_MESSAGE} Instagram risulta <strong>non collegato</strong> finché non deployi il backend API.
        </div>
      )}

      <AccountProfilePanel />

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Instagram</h3>
          {isConnected ? (
            <span className="integration-mode-badge integration-mode-badge--real">✅ Instagram collegato</span>
          ) : (
            <span className="integration-mode-badge integration-mode-badge--mock">{connectionLabel}</span>
          )}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          Redirect URI backend: <code>{ig.redirectUri || '—'}</code>
        </p>

        {ig.errors?.length > 0 && !isConnected && (
          <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
            <strong>Configurazione Meta incompleta</strong>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
              {ig.errors.map((item) => (
                <li key={item.code}>{item.message}</li>
              ))}
            </ul>
          </div>
        )}

        {isConnected ? (
          <div className="account-connected" style={{ marginTop: '1rem' }}>
            <div className="account-connected-user">@{profile.username || ig.accountUsername}</div>
            <div className="account-connected-meta" style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
              <div>
                <strong>Stato connessione:</strong> {connectionLabel}
              </div>
              <div>
                <strong>Username:</strong> @{profile.username || ig.accountUsername}
              </div>
              <div>
                <strong>Instagram Business ID:</strong>{' '}
                {profile.instagramAccountId || ig.instagramAccountId || '—'}
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
              Stato connessione: <strong>{connectionLabel}</strong>
            </p>
            {ig.connectionStatus === 'token_expired' && (
              <div className="alert alert-warning" style={{ marginTop: '0.75rem' }}>
                Il token Instagram è scaduto. Ricollega l&apos;account per ripristinare la pubblicazione.
              </div>
            )}
            {ig.testerSetup?.length > 0 && (
              <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
                <strong>Per collegare @novaecosystem</strong>
                <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                  {ig.testerSetup.map((step) => (
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
              disabled={connecting || isDemoMode() || !ig.canStartOAuth}
              title={isDemoMode() ? DEMO_BACKEND_MESSAGE : undefined}
            >
              {isDemoMode() ? 'OAuth disponibile con backend' : connecting ? 'Apertura login Meta…' : 'Collega Instagram'}
            </button>
          </div>
        )}
      </section>

      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Facebook Page</h3>
          {isFbConnected ? (
            <span className="integration-mode-badge integration-mode-badge--real">✅ Facebook collegato</span>
          ) : (
            <span className="integration-mode-badge integration-mode-badge--mock">{fbConnectionLabel}</span>
          )}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          Redirect URI backend: <code>{fb.redirectUri || '—'}</code>
        </p>

        {fb.errors?.length > 0 && !isFbConnected && (
          <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>
            <strong>Configurazione Meta (Facebook) incompleta</strong>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
              {fb.errors.map((item) => (
                <li key={item.code}>{item.message}</li>
              ))}
            </ul>
          </div>
        )}

        {fb.facebookConfigIdConfigured === false && !isFbConnected && (
          <div className="alert alert-warning" style={{ marginTop: '0.75rem' }}>
            <strong>Manca META_FACEBOOK_CONFIG_ID</strong> — Nova_Promo usa Facebook Login for Business.
            Crea una Configurazione in Meta, copia il Configuration ID in Vercel e redeploy del backend.
          </div>
        )}

        {isFbConnected ? (
          <div className="account-connected" style={{ marginTop: '1rem' }}>
            <div className="account-connected-user">{fbProfile.pageName || fb.pageName || fb.accountUsername}</div>
            <div className="account-connected-meta" style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
              <div>
                <strong>Stato connessione:</strong> Collegato
              </div>
              <div>
                <strong>Pubblicazione:</strong>{' '}
                <span className={fbPublishPending ? 'integration-status-value--warn' : 'integration-status-value--ok'}>
                  {fbPublishLabel}
                </span>
              </div>
              <div>
                <strong>Pagina:</strong> {fbProfile.pageName || fb.pageName || '—'}
              </div>
              <div>
                <strong>Facebook Page ID:</strong> {fbProfile.facebookPageId || fb.facebookPageId || '—'}
              </div>
              {fb.grantedScopes?.length > 0 && (
                <div>
                  <strong>Permessi ricevuti:</strong>{' '}
                  <code style={{ fontSize: '0.85rem' }}>{fb.grantedScopes.join(', ')}</code>
                </div>
              )}
              {fb.missingPublishScopes?.length > 0 && (
                <div>
                  <strong>Permessi mancanti per pubblicare:</strong>{' '}
                  <code style={{ fontSize: '0.85rem' }}>{fb.missingPublishScopes.join(', ')}</code>
                </div>
              )}
            </div>

            {fbPublishPending && (
              <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                <strong>Pubblicazione in attesa permesso Meta</strong>
                <p style={{ margin: '0.5rem 0 0' }}>{FACEBOOK_PUBLISH_PENDING_UI_MESSAGE}</p>
                <ol style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                  <li>Meta Developers → App Nova_Promo → App Review → Permissions and Features</li>
                  <li>Richiedi <strong>Advanced Access</strong> per <code>pages_manage_posts</code> e <code>pages_read_engagement</code></li>
                  <li>Se la Configurazione Facebook Login for Business non mostra questi permessi, aggiungili all&apos;app e ripeti App Review</li>
                  <li>Dopo l&apos;approvazione, scollega e ricollega la Pagina da questa schermata</li>
                </ol>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem' }}>
                  Instagram resta completamente funzionante. NovaPromo non tenta la pubblicazione Facebook finché Meta non concede i permessi.
                </p>
              </div>
            )}

            {fbPublishReady && (
              <div className="alert alert-success" style={{ marginTop: '1rem' }}>
                Permessi di pubblicazione attivi — puoi pubblicare post sulla Pagina Facebook.
              </div>
            )}

            <div className="actions" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={disconnectFacebook}
                disabled={disconnecting}
              >
                {disconnecting ? 'Scollegamento…' : 'Scollega'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>
              Stato connessione: <strong>{fbConnectionLabel}</strong>
            </p>
            {fb.connectionStatus === 'token_expired' && (
              <div className="alert alert-warning" style={{ marginTop: '0.75rem' }}>
                Il token della Pagina Facebook è scaduto. Ricollega per ripristinare la pubblicazione.
              </div>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Usa l&apos;app Meta principale (META_APP_ID). Devi essere admin della Pagina da collegare.
            </p>
            {fb.setupChecklist?.length > 0 && (
              <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
                <strong>Configurazione Meta richiesta (Facebook Login)</strong>
                <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                  {fb.setupChecklist.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem' }}>
                  Se vedi &quot;connessione non sicura&quot; o &quot;dominio non incluso&quot;, completa i passaggi sopra nel pannello Meta Developers per l&apos;app <strong>Nova_Promo</strong>.
                </p>
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={connectFacebook}
              disabled={connecting || isDemoMode() || !fb.canStartOAuth}
              title={isDemoMode() ? DEMO_BACKEND_MESSAGE : undefined}
            >
              {isDemoMode() ? 'OAuth disponibile con backend' : connecting ? 'Apertura login Meta…' : 'Collega Pagina Facebook'}
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
