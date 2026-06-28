import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import TikTokUserCard from '../components/TikTokUserCard.jsx';
import MediaPicker, { appendMediaToFormData } from '../components/MediaPicker.jsx';
import '../styles/tiktok-status.css';

const REVIEW_STEPS = [
  { n: 1, title: 'Login with TikTok', desc: 'Login Kit — user.info.basic, user.info.profile' },
  { n: 2, title: 'Account collegato', desc: 'Avatar, display name, open_id visibili' },
  { n: 3, title: 'Content API OAuth', desc: 'video.upload + video.publish' },
  { n: 4, title: 'Upload video', desc: 'File mp4/mov dal PC' },
  { n: 5, title: 'Direct Post', desc: 'Content Posting API — log passo passo' },
];

export default function ReviewDemo() {
  const { user, tiktok } = useAuth();
  const [setup, setSetup] = useState(null);
  const [reviewStatus, setReviewStatus] = useState(null);
  const [media, setMedia] = useState(null);
  const [caption, setCaption] = useState('NovaPromo review demo #novapromo');
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.getTikTokSetup(), api.getTikTokReviewStatus()])
      .then(([s, r]) => {
        setSetup(s);
        setReviewStatus(r);
      })
      .catch(() => {});
  }, []);

  const publish = async () => {
    setLoading(true);
    setSteps([]);
    try {
      const fd = new FormData();
      fd.append('caption', caption);
      fd.append('privacyLevel', 'SELF_ONLY');
      appendMediaToFormData(fd, media);
      const result = await api.tiktokDirectPost(fd);
      setSteps(result.steps || []);
    } catch (err) {
      setSteps([{ step: 'error', status: 'error', message: err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const stepDone = (n) => {
    if (n === 1 || n === 2) return Boolean(user);
    if (n === 3) return reviewStatus?.contentAccountConnected;
    if (n === 4) return Boolean(media);
    if (n === 5) return steps.some((s) => s.step === 'publish' && s.status === 'ok');
    return false;
  };

  return (
    <div className="review-demo-page">
      <div className="page-header">
        <h2>🎬 TikTok App Review — Demo Flow</h2>
        <p>Registra questo flusso per il video da inviare a TikTok Developers</p>
      </div>

      {setup && !setup.ready && (
        <div className="alert alert-error">
          {setup.credentialsMessage || `Credenziali mancanti: ${setup.missing?.join(', ')}`}
        </div>
      )}

      {setup?.requiredPortalRedirectUris && (
        <div className="card" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <strong>Redirect URI registrati su TikTok Portal:</strong>
          <ul>
            {setup.requiredPortalRedirectUris.map((u) => (
              <li key={u}><code>{u}</code></li>
            ))}
          </ul>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Attivi ora ({setup.environment}): login <code>{setup.activeRedirectUris?.login}</code> · API{' '}
            <code>{setup.activeRedirectUris?.contentApi}</code>
          </p>
        </div>
      )}

      {REVIEW_STEPS.map((s) => (
        <section key={s.n} className="card review-step" style={{ marginBottom: '1rem' }}>
          <span className="review-step-num">Step {s.n} {stepDone(s.n) ? '✓' : ''}</span>
          <h3 style={{ margin: '0.25rem 0' }}>{s.title}</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>{s.desc}</p>

          {s.n === 1 && (
            user ? (
              <p className="tiktok-status tiktok-status--ok">Login completato</p>
            ) : (
              <Link to="/auth/tiktok" className="btn btn-primary btn-tiktok-style">
                Login with TikTok
              </Link>
            )
          )}

          {s.n === 2 && <TikTokUserCard tiktok={tiktok} compact />}

          {s.n === 3 && (
            reviewStatus?.contentAccountConnected ? (
              <p className="tiktok-status tiktok-status--ok">
                Content API collegata — @{reviewStatus.contentAccount?.username}
              </p>
            ) : (
              <Link to="/accounts" className="btn btn-secondary">
                Collega Content Posting API →
              </Link>
            )
          )}

          {s.n === 4 && (
            <MediaPicker value={media} onChange={setMedia} label="Seleziona video demo" />
          )}

          {s.n === 5 && (
            <>
              <div className="form-group">
                <label>Caption</label>
                <input value={caption} onChange={(e) => setCaption(e.target.value)} />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={publish}
                disabled={loading || !media || !reviewStatus?.contentAccountConnected}
              >
                {loading ? 'Pubblicazione…' : 'Direct Post to TikTok'}
              </button>
              {steps.length > 0 && (
                <div className="review-log" style={{ marginTop: '1rem' }}>
                  {steps.map((e, i) => (
                    <div key={i} className={`review-log-entry ${e.status}`}>
                      [{e.step}] {e.message}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      ))}

      <Link to="/dashboard" className="btn btn-secondary">← Dashboard</Link>
    </div>
  );
}
