import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { useAuth } from '../context/AuthContext.jsx';
import { isTikTokEnabled, isDemoMode } from '../lib/features.js';
import { isDesktopApp } from '../lib/runtime.js';
import { resolveAuthReturnPath } from '../lib/postAuthRedirect.js';
import { auth, hasClientConfig } from '../lib/firebase.js';
import TikTokPausedBadge from '../components/TikTokPausedBadge.jsx';
import '../styles/auth.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, enterLocalApp, syncFirebaseSession } = useAuth();
  const demo = isDemoMode();
  const useFirebaseAuth = hasClientConfig && auth && !demo;

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const goAfterAuth = useCallback(() => {
    navigate(resolveAuthReturnPath(location), { replace: true });
  }, [location, navigate]);

  useEffect(() => {
    if (!loading && user) {
      goAfterAuth();
    }
  }, [loading, user, goAfterAuth]);

  const handleFirebaseAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        const token = await cred.user.getIdToken(true);
        await syncFirebaseSession(token);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const token = await cred.user.getIdToken(true);
        await syncFirebaseSession(token);
      }
      goAfterAuth();
    } catch (err) {
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('Email già registrata — prova ad accedere.');
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Email o password non corretti.');
      } else if (code === 'auth/weak-password') {
        setError('Password troppo debole (minimo 6 caratteri).');
      } else {
        setError(err.message || 'Autenticazione fallita');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnter = async () => {
    if (demo) {
      await enterLocalApp();
      goAfterAuth();
      return;
    }

    try {
      await enterLocalApp();
      goAfterAuth();
    } catch (err) {
      setError(err.message || 'Impossibile avviare la sessione.');
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
        <p>Reindirizzamento…</p>
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

        <h2>{useFirebaseAuth ? (mode === 'login' ? 'Accedi' : 'Crea account') : 'Benvenuto'}</h2>
        <p className="auth-sub">
          {useFirebaseAuth
            ? 'Trial 7 giorni con Creative Studio PRO — poi piano Free o Premium'
            : isDesktopApp()
              ? 'App desktop — pubblica su Instagram e Facebook'
              : 'Genera, programma e pubblica su Instagram e Facebook Page'}
        </p>

        {demo && (
          <div className="alert alert-info" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
            Modalità demo — interfaccia senza backend collegato.
          </div>
        )}

        {!isTikTokEnabled() && !useFirebaseAuth && (
          <div style={{ marginBottom: '1rem' }}>
            <TikTokPausedBadge />
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {useFirebaseAuth ? (
          <>
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => setMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => setMode('register')}
              >
                Registrati
              </button>
            </div>

            <form className="auth-form" onSubmit={handleFirebaseAuth}>
              {mode === 'register' && (
                <label>
                  Nome
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Il tuo nome"
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? 'Attendere…' : mode === 'login' ? 'Accedi' : 'Crea account — Trial 7 giorni'}
              </button>
            </form>
          </>
        ) : (
          <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={handleEnter}>
            {isDesktopApp() ? 'Apri NovaPromo' : 'Entra nell\'app'}
          </button>
        )}

        {isTikTokEnabled() && (
          <Link to="/auth/tiktok" className="btn-tiktok" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>
            Login with TikTok
          </Link>
        )}

        <p className="auth-footnote" style={{ marginTop: '1rem' }}>
          Collega Instagram e Facebook da Account dopo l&apos;accesso
        </p>
      </div>
    </div>
  );
}
