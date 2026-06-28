import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { openOAuthUrl } from '../lib/electron.js';
import { isDesktopApp } from '../lib/runtime.js';
import '../styles/auth.css';

export default function TikTokAuth() {
  const [error, setError] = useState(null);
  const [setup, setSetup] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      let configStatus;
      try {
        configStatus = await api.getTikTokSetup();
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message?.includes('fetch') || err.message?.includes('HTTP 5')
              ? 'Backend non raggiungibile. Esegui npm run dev e assicurati che la porta 3001 sia libera.'
              : err.message
          );
        }
        return;
      }

      if (!configStatus.ready) {
        if (!cancelled) setSetup(configStatus);
        return;
      }

      try {
        const { authorizeUrl } = await api.startTikTokLogin();
        if (!cancelled) {
          if (isDesktopApp()) {
            await openOAuthUrl(authorizeUrl);
          } else {
            window.location.href = authorizeUrl;
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Avvio OAuth TikTok fallito');
        }
      }
    }

    start();
    return () => { cancelled = true; };
  }, []);

  if (setup && !setup.ready) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--glass auth-card--error">
          <h2>Configurazione TikTok richiesta</h2>

          {setup.needsBackendRestart ? (
            <>
              <p className="auth-error-text">
                <strong>Le credenziali TikTok non sono state caricate dal server.</strong>
              </p>
              <p className="auth-sub">
                Verifica le variabili su Vercel (<code>TIKTOK_CLIENT_KEY</code>,{' '}
                <code>TIKTOK_CLIENT_SECRET</code>) e ridistribuisci il progetto.
              </p>
            </>
          ) : (
            <>
              <p className="auth-sub">Configura TikTok for Developers:</p>
              {setup.credentialsMessage && (
                <p className="auth-error-text">{setup.credentialsMessage}</p>
              )}
              <div className="auth-setup-box">
                <p><strong>Redirect URI Login Kit:</strong></p>
                <ul>
                  {setup.requiredPortalRedirectUris?.map((uri) => (
                    <li key={uri}><code>{uri}</code></li>
                  ))}
                </ul>
                {setup.missing?.length > 0 && (
                  <>
                    <p><strong>Variabili mancanti su Vercel:</strong></p>
                    <ul>
                      {setup.missing.map((v) => (
                        <li key={v}><code>{v}</code></li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </>
          )}

          <Link to="/login" className="btn btn-secondary">← Torna al login</Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--glass auth-card--error">
          <h2>Errore autenticazione</h2>
          <p className="auth-error-text">{error}</p>
          <p className="auth-sub">
            Se TikTok mostra errore <code>client_key</code>, di solito il redirect URI non è registrato nel portale.
            In <a href="https://developers.tiktok.com/" target="_blank" rel="noreferrer">TikTok for Developers</a> →
            la tua app → <strong>Login Kit</strong> → aggiungi esattamente:
          </p>
          <pre className="auth-setup-box" style={{ textAlign: 'left' }}>
            https://novaweb-nu.vercel.app/auth/callback
          </pre>
          <p className="auth-sub">
            Verifica anche che <strong>Login Kit</strong> sia abilitato, il client key corrisponda alle variabili Vercel,
            e che il tuo account TikTok sia tra gli utenti di test (sandbox).
          </p>
          <Link to="/login" className="btn btn-secondary">← Riprova</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--glass auth-card--loading">
        <div className="auth-spinner auth-spinner--large" />
        <h2>{isDesktopApp() ? 'Completa il login nel browser…' : 'Reindirizzamento a TikTok...'}</h2>
        <p className="auth-sub">
          {isDesktopApp()
            ? 'Torna all\'app dopo l\'autorizzazione TikTok'
            : 'Autorizzazione ufficiale Login Kit'}
        </p>
      </div>
    </div>
  );
}
