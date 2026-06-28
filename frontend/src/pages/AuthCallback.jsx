import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/auth.css';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { loginWithCustomToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('processing');

  useEffect(() => {
    const oauthError = searchParams.get('error');
    const success = searchParams.get('success');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      setPhase('error');
      return;
    }

    // Desktop: backend redirect con success=1
    if (success === '1') {
      async function completeDesktop() {
        try {
          const { customToken } = await api.getFirebaseToken();
          await loginWithCustomToken(customToken);
          navigate('/dashboard', { replace: true });
        } catch (err) {
          setError(err.message);
          setPhase('error');
        }
      }
      completeDesktop();
      return;
    }

    // Web: TikTok reindirizza qui con code + state
    if (code && state) {
      async function exchange() {
        try {
          setPhase('exchange');
          const result = await api.exchangeTikTokCode(code, state);
          await loginWithCustomToken(result.customToken);
          navigate('/dashboard', { replace: true });
        } catch (err) {
          setError(err.message || 'Scambio token fallito');
          setPhase('error');
        }
      }
      exchange();
      return;
    }

    setError('Parametri OAuth mancanti — riprova il login TikTok');
    setPhase('error');
  }, [searchParams, loginWithCustomToken, navigate]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--glass auth-card--error">
          <h2>Login TikTok fallito</h2>
          <p className="auth-error-text">{error}</p>
          <p className="auth-sub">
            Verifica che i redirect URI siano registrati su TikTok Developers e che{' '}
            <code>TIKTOK_CLIENT_KEY</code> / <code>TIKTOK_CLIENT_SECRET</code> siano configurati su Vercel
          </p>
          <Link to="/login" className="btn btn-secondary">← Riprova login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--glass auth-card--loading">
        <div className="auth-spinner auth-spinner--large" />
        <h2>{phase === 'exchange' ? 'Scambio token sicuro…' : 'Completamento accesso…'}</h2>
        <p className="auth-sub">
          Il client secret resta sul server — solo il backend scambia il code TikTok
        </p>
      </div>
    </div>
  );
}
