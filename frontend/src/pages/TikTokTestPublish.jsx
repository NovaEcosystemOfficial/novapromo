import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MediaPicker, { appendMediaToFormData } from '../components/MediaPicker.jsx';
import { api } from '../api/client.js';
import '../styles/tiktok-status.css';

const PRIVACY_OPTIONS = [
  { value: 'PUBLIC_TO_EVERYONE', label: 'Pubblico' },
  { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Amici reciproci' },
  { value: 'FOLLOWER_OF_CREATOR', label: 'Solo follower' },
  { value: 'SELF_ONLY', label: 'Solo io (privato)' },
];

export default function TikTokTestPublish() {
  const [media, setMedia] = useState(null);
  const [caption, setCaption] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState('PUBLIC_TO_EVERYONE');
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState('');
  const [reviewStatus, setReviewStatus] = useState(null);

  useEffect(() => {
    api.getTikTokReviewStatus().then(setReviewStatus).catch(() => {});
  }, []);

  const runDirectPost = async () => {
    setError('');
    setSteps([]);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('caption', caption);
      fd.append('privacyLevel', privacyLevel);
      appendMediaToFormData(fd, media);

      const result = await api.tiktokDirectPost(fd);
      setSteps(result.steps || []);
      if (!result.success) {
        setError(result.error || 'Pubblicazione non riuscita');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-demo-page">
      <div className="page-header">
        <h2>TikTok Test Publish</h2>
        <p>Demo Content Posting API per TikTok App Review — nessun mock</p>
      </div>

      {reviewStatus && !reviewStatus.credentialsReady && (
        <div className="alert alert-error">{reviewStatus.credentialsMessage}</div>
      )}

      {reviewStatus && !reviewStatus.contentAccountConnected && reviewStatus.credentialsReady && (
        <div className="alert alert-error">
          Collega prima TikTok Content API da{' '}
          <Link to="/accounts">Account</Link> (scope video.upload, video.publish)
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card form-grid">
        <MediaPicker value={media} onChange={setMedia} label="Video mp4/mov" />

        <div className="form-group">
          <label>Caption / titolo</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Test NovaPromo review demo" rows={3} />
        </div>

        <div className="form-group">
          <label>Privacy</label>
          <select value={privacyLevel} onChange={(e) => setPrivacyLevel(e.target.value)}>
            {PRIVACY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={runDirectPost} disabled={loading || !media}>
            {loading ? 'Pubblicazione…' : 'Direct Post to TikTok'}
          </button>
          <Link to="/review-demo" className="btn btn-secondary">← Review demo</Link>
        </div>
      </div>

      {steps.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Log operazione</h3>
          <div className="review-log">
            {steps.map((s, i) => (
              <div key={i} className={`review-log-entry ${s.status}`}>
                [{s.step}] {s.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Se TikTok restituisce errori di scope, l&apos;app potrebbe richiedere approvazione App Review per Direct Post.
      </p>
    </div>
  );
}
