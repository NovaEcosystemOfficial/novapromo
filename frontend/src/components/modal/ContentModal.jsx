import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { PROJECTS, CONTENT_TYPES, TONES, TOPIC_EXAMPLES } from '../../constants/projects.js';
import { useContentModal } from '../../context/ContentModalContext.jsx';
import { isTikTokEnabled } from '../../lib/features.js';
import MediaPicker, { appendMediaToFormData } from '../MediaPicker.jsx';
import '../../styles/modal.css';

const ALL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'both', label: 'Entrambi', icon: '✦' },
];

function getPlatforms() {
  if (isTikTokEnabled()) return ALL_PLATFORMS;
  return ALL_PLATFORMS.filter((p) => p.id === 'instagram');
}

const STEPS = ['Progetto', 'Piattaforma', 'Tipo', 'Tono', 'Argomento'];

export default function ContentModal() {
  const { isOpen, prefill, closeModal } = useContentModal();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState('wizard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  const [form, setForm] = useState({
    project: '',
    platform: 'instagram',
    contentType: 'post',
    tone: 'professionale',
    topic: '',
  });

  const [generated, setGenerated] = useState(null);
  const [savedPostId, setSavedPostId] = useState(null);
  const [media, setMedia] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setPhase('wizard');
      setError('');
      setGenerated(null);
      setSavedPostId(null);
      setMedia(null);
      setShowSchedule(false);
      setScheduleAt('');
      setForm({
        project: prefill?.project || '',
        platform: prefill?.platform || 'instagram',
        contentType: prefill?.contentType || 'post',
        tone: 'professionale',
        topic: prefill?.topic || '',
      });
    }
  }, [isOpen, prefill]);

  if (!isOpen) return null;

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const availableTypes = CONTENT_TYPES.filter(
    (t) => t.platforms.includes(form.platform)
  );

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await api.generateContent(form);
      setGenerated(result);
      setPhase('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const platforms = getPlatforms();

  const savePostWithMedia = async (scheduledAt = null) => {
    if (savedPostId) {
      if (scheduledAt) return api.schedulePost(savedPostId, scheduledAt);
      return { id: savedPostId };
    }

    const needsMedia = form.platform === 'instagram' || form.platform === 'both';
    if (needsMedia && !media) {
      const payload = {
        ...form,
        ...generated,
        scheduledAt: scheduledAt || null,
      };
      const post = await api.createPost(payload);
      setSavedPostId(post.id);
      return post;
    }

    const fd = new FormData();
    Object.entries({ ...form, ...generated }).forEach(([k, v]) => {
      if (v != null && v !== '') fd.append(k, v);
    });
    if (scheduledAt) fd.append('scheduledAt', scheduledAt);
    appendMediaToFormData(fd, media);
    const post = await api.createDraft(fd);
    setSavedPostId(post.id);
    return post;
  };

  const handleDraft = async () => {
    setLoading(true);
    setError('');
    try {
      await savePostWithMedia();
      closeModal();
      navigate('/drafts');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleAt) {
      setShowSchedule(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const post = await savePostWithMedia(new Date(scheduleAt).toISOString());
      if (!savedPostId && post.id) await api.schedulePost(post.id, new Date(scheduleAt).toISOString());
      closeModal();
      navigate('/calendar');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    setError('');
    try {
      const needsMedia = form.platform === 'instagram' || form.platform === 'both';
      if (needsMedia && !media && !savedPostId) {
        setError('Instagram richiede un\'immagine o video. Aggiungi media prima di pubblicare.');
        setLoading(false);
        return;
      }

      let postId = savedPostId;
      if (!postId) {
        const post = await savePostWithMedia();
        postId = post.id;
      }
      await api.publishPost(postId);
      closeModal();
      navigate('/history');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return !!form.project;
    if (step === 4) return !!form.topic.trim();
    return true;
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{phase === 'result' ? '✨ Contenuto generato' : 'Nuovo contenuto'}</h2>
            {phase === 'wizard' && (
              <p className="modal-sub">Passo {step + 1} di {STEPS.length} — {STEPS[step]}</p>
            )}
          </div>
          <button type="button" className="modal-close" onClick={closeModal} aria-label="Chiudi">×</button>
        </div>

        {phase === 'wizard' && (
          <div className="modal-steps">
            {STEPS.map((s, i) => (
              <div key={s} className={`modal-step-dot${i <= step ? ' active' : ''}${i === step ? ' current' : ''}`} />
            ))}
          </div>
        )}

        {error && <div className="alert alert-error modal-alert">{error}</div>}

        <div className="modal-body">
          {phase === 'wizard' && step === 0 && (
            <div className="modal-grid">
              {PROJECTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`modal-chip${form.project === p.id ? ' selected' : ''}`}
                  style={{ '--chip-color': p.color, '--chip-rgb': p.colorRgb }}
                  onClick={() => update('project', p.id)}
                >
                  <span className="modal-chip-dot" />
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {phase === 'wizard' && step === 1 && (
            <div className="modal-grid modal-grid--3">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`modal-card-select${form.platform === p.id ? ' selected' : ''}`}
                  onClick={() => {
                    const types = CONTENT_TYPES.filter((t) => t.platforms.includes(p.id));
                    const nextType = types.find((t) => t.id === form.contentType)
                      ? form.contentType
                      : types[0]?.id || 'post';
                    setForm((f) => ({ ...f, platform: p.id, contentType: nextType }));
                  }}
                >
                  <span className="modal-card-icon">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}

          {phase === 'wizard' && step === 2 && (
            <div className="modal-grid">
              {availableTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`modal-chip modal-chip--type${form.contentType === t.id ? ' selected' : ''}`}
                  onClick={() => update('contentType', t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {phase === 'wizard' && step === 3 && (
            <div className="modal-grid">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`modal-chip${form.tone === t.id ? ' selected' : ''}`}
                  onClick={() => update('tone', t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {phase === 'wizard' && step === 4 && (
            <div className="modal-topic">
              <label>Argomento del contenuto</label>
              <input
                value={form.topic}
                onChange={(e) => update('topic', e.target.value)}
                placeholder="Es. NovaDocs 1.1, Cloud Sync, AI Locale..."
                autoFocus
              />
              <div className="modal-examples">
                {TOPIC_EXAMPLES.map((ex) => (
                  <button key={ex} type="button" className="modal-example-tag" onClick={() => update('topic', ex)}>
                    {ex}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-primary modal-generate-btn"
                onClick={handleGenerate}
                disabled={!form.topic.trim() || loading}
              >
                {loading ? 'Generazione...' : '✨ Genera'}
              </button>
            </div>
          )}

          {phase === 'result' && generated && (
            <div className="modal-result">
              <div className="modal-result-grid">
                <ResultField label="Caption" value={generated.caption} />
                <ResultField label="Hashtag" value={generated.hashtags} />
                <ResultField label="Idea Reel" value={generated.reelIdea} multiline />
                <ResultField label="CTA" value={generated.cta} />
                <ResultField label="Titolo sovrapposto" value={generated.overlayTitle} highlight />
              </div>

              {(form.platform === 'instagram' || form.platform === 'both') && (
                <MediaPicker value={media} onChange={setMedia} label="Media per Instagram (obbligatorio per pubblicare)" />
              )}

              {showSchedule && (
                <div className="modal-schedule">
                  <label>Data e ora pubblicazione</label>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                  />
                </div>
              )}

              <div className="modal-result-actions">
                <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={loading}>
                  Pubblica subito
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleSchedule} disabled={loading}>
                  Programma
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleDraft} disabled={loading}>
                  Salva bozza
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleGenerate} disabled={loading}>
                  Rigenera
                </button>
              </div>
            </div>
          )}
        </div>

        {phase === 'wizard' && step < 4 && (
          <div className="modal-footer">
            {step > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>
                Indietro
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
            >
              Avanti
            </button>
          </div>
        )}

        {phase === 'result' && (
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setPhase('wizard')}>
              ← Modifica
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultField({ label, value, multiline, highlight }) {
  return (
    <div className={`modal-result-field${highlight ? ' highlight' : ''}`}>
      <span className="modal-result-label">{label}</span>
      <div className={`modal-result-value${multiline ? ' multiline' : ''}`}>{value}</div>
    </div>
  );
}
