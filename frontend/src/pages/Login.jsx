import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isTikTokEnabled, isDemoMode } from '../lib/features.js';
import { isDesktopApp } from '../lib/runtime.js';
import TikTokPausedBadge from '../components/TikTokPausedBadge.jsx';
import '../styles/auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, enterLocalApp } = useAuth();
  const demo = isDemoMode();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleEnter = async () => {
    if (demo) {
      await enterLocalApp();
      navigate('/dashboard', { replace: true });
      return;
    }

    try {
      await enterLocalApp();
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/dashboard', { replace: true });
    }
  };

  if (loading && !demo) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner auth-spinner--large" />
        <p>Avvio NovaPromo…</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-loading-screen">
        <p>Reindirizzamento alla dashboard…</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--glass">
        <div className="auth-brand">
          <h1>NovaPromo</h1>
          <p>AutoPublisher</p>
        </div>

        <h2>Benvenuto</h2>
        <p className="auth-sub">
          {isDesktopApp()
            ? 'App desktop — pubblica su Instagram'
            : 'Genera, programma e pubblica contenuti Instagram'}
        </p>

        {demo && (
          <div className="alert alert-info" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
            Modalità demo — interfaccia senza backend collegato.
          </div>
        )}

        {!isTikTokEnabled() && (
          <div style={{ marginBottom: '1rem' }}>
            <TikTokPausedBadge />
          </div>
        )}

        <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleEnter}>
          {isDesktopApp() ? 'Apri NovaPromo' : 'Entra nell\'app'}
        </button>

        {isTikTokEnabled() && (
          <Link to="/auth/tiktok" className="btn-tiktok" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>
            Login with TikTok
          </Link>
        )}

        <p className="auth-footnote" style={{ marginTop: '1rem' }}>
          Collega Instagram da Account dopo l&apos;accesso
        </p>
      </div>
    </div>
  );
}
